/**
 * Main authentication module
 * Handles registration, login, and session management
 * Supports both online (Supabase) and offline (local SQLite) modes
 */

import { supabase, isSupabaseConfigured } from '$lib/config/supabase';
import { authState } from '$lib/stores/authState';
import { Capacitor } from '@capacitor/core';
import { browser } from '$app/environment';
import {
	initLocalAuthDB,
	createLocalUser,
	getLocalUserByUsername,
	verifyPassword,
	checkRateLimit,
	recordFailedLogin,
	resetLoginAttempts,
	updateUserSupabaseId
} from './local-db';
import {
	saveSecureSession,
	getSecureSession,
	clearSecureSession,
	getStorageInfo
} from './secure-storage';

export interface AuthResult {
	success: boolean;
	error?: string;
	mode?: 'online' | 'offline';
	needsSync?: boolean; // For offline registrations
}

let dbInitialized = false;

/**
 * Initialize the auth system
 */
export async function initAuth(): Promise<void> {
	if (!browser) return;

	console.log('[Auth] Initializing auth system...');
	console.log('[Auth] Using secure storage:', getStorageInfo());

	// Initialize local database on native platform
	if (Capacitor.isNativePlatform() && !dbInitialized) {
		try {
			console.log('[Auth] Initializing local database...');
			await initLocalAuthDB();
			dbInitialized = true;
			console.log('[Auth] Local database initialized');
		} catch (error) {
			console.error('[Auth] Failed to init local auth DB:', error);
		}
	}

	// Check for secure session first (NEW - encrypted storage)
	const secureSession = await getSecureSession();
	if (secureSession) {
		console.log('[Auth] Secure session found, restoring...');

		// For online mode, restore Supabase session
		if (isSupabaseConfigured()) {
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (session) {
				console.log('[Auth] Supabase session found for user:', session.user.email);
				authState.setOnlineAuth(session.user, session);
				console.log('[Auth] Init complete - authenticated online (secure)');
				return;
			}
		}

		// For offline mode, restore from local DB
		if (Capacitor.isNativePlatform() && dbInitialized) {
			const user = await getLocalUserByUsername(secureSession.userId);
			if (user) {
				console.log('[Auth] Restoring offline session for user:', user.username);
				authState.setOfflineAuth(user.username, user.is_anonymous);
				console.log('[Auth] Init complete - authenticated offline (secure)');
				return;
			}
		}

		// Session found in secure storage but invalid - clear it
		console.log('[Auth] Secure session invalid, clearing...');
		await clearSecureSession();
	}

	// No session found
	console.log('[Auth] Init complete - no session found, user not authenticated');
	authState.setLoading(false);
}

/**
 * Register a new user
 */
export async function register(
	username: string,
	email: string,
	password: string
): Promise<AuthResult> {
	const isOnline = browser && navigator.onLine && isSupabaseConfigured();

	console.log('[Auth] Registration attempt:', {
		browser,
		navigatorOnline: browser ? navigator.onLine : 'N/A',
		supabaseConfigured: isSupabaseConfigured(),
		isOnline,
		isNative: Capacitor.isNativePlatform(),
		dbInitialized
	});

	// Try online registration first
	if (isOnline) {
		try {
			console.log('[Auth] Attempting Supabase registration for:', email);

			// Create Supabase auth user with username in metadata
			// The database trigger will automatically create the profile
			const {
				data: { user, session },
				error: authError
			} = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username: username,
						is_anonymous: false
					},
					emailRedirectTo: undefined
				}
			});

			console.log('[Auth] Supabase signUp result:', { user, session, authError });

			if (authError) throw authError;
			if (!user) throw new Error('No user returned from Supabase');

			// Cache locally for offline access
			if (Capacitor.isNativePlatform() && dbInitialized) {
				await createLocalUser(username, email, password, user.id, false);
			}

			// Login immediately (email confirmation disabled)
			if (session) {
				authState.setOnlineAuth(session.user, session, false);
				return { success: true, mode: 'online' };
			} else {
				throw new Error('No session returned after signup');
			}
		} catch (error: any) {
			console.error('Online registration failed:', error);

			// Fall through to offline mode
			if (!Capacitor.isNativePlatform() || !dbInitialized) {
				return {
					success: false,
					error: error.message || 'Registration failed. Please check your connection.'
				};
			}
		}
	}

	// Offline registration (or online failed)
	if (Capacitor.isNativePlatform() && dbInitialized) {
		try {
			// Check if username already exists
			const existing = await getLocalUserByUsername(username);
			if (existing) {
				return { success: false, error: 'Username already exists' };
			}

			// Create local user
			await createLocalUser(username, email, password, null, false);

			// Set offline auth state
			authState.setOfflineAuth(username, false);

			return {
				success: true,
				mode: 'offline',
				needsSync: true
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to create local account'
			};
		}
	}

	return {
		success: false,
		error: 'Registration failed. No connection and local storage unavailable.'
	};
}

/**
 * Login with username/email and password
 */
export async function login(usernameOrEmail: string, password: string): Promise<AuthResult> {
	console.log('[Auth] Login attempt started:', {
		usernameOrEmail,
		browser,
		navigatorOnline: browser ? navigator.onLine : 'N/A',
		supabaseConfigured: isSupabaseConfigured(),
		isNative: Capacitor.isNativePlatform(),
		dbInitialized
	});

	const isOnline = browser && navigator.onLine && isSupabaseConfigured();
	console.log('[Auth] Login mode:', isOnline ? 'ONLINE' : 'OFFLINE');

	// Try online login first
	if (isOnline) {
		try {
			let loginEmail = usernameOrEmail;

			// Check if input is username (not email format)
			if (!usernameOrEmail.includes('@')) {
				console.log('[Auth] Input is username, looking up email...');
				// Look up email from username in profiles table
				const { data: profiles, error: lookupError } = await supabase
					.from('profiles')
					.select('email')
					.eq('username', usernameOrEmail)
					.limit(1)
					.single();

				console.log('[Auth] Username lookup result:', { profiles, lookupError });

				if (lookupError || !profiles) {
					console.error('[Auth] Username lookup failed:', lookupError);
					throw new Error('Invalid username or password');
				}

				loginEmail = profiles.email;
				console.log('[Auth] Found email for username:', loginEmail);
			} else {
				console.log('[Auth] Input is email, using directly');
			}

			// Supabase uses email for login
			console.log('[Auth] Attempting Supabase signInWithPassword...');
			const { data, error } = await supabase.auth.signInWithPassword({
				email: loginEmail,
				password
			});

			console.log('[Auth] Supabase signInWithPassword result:', {
				user: data?.user ? { id: data.user.id, email: data.user.email } : null,
				session: data?.session ? 'Session received' : 'No session',
				error
			});

			if (error) throw error;
			if (!data.session) throw new Error('No session returned');

			// Save session to secure storage (encrypted)
			console.log('[Auth] Saving session to secure storage...');
			await saveSecureSession({
				userId: data.user.id,
				accessToken: data.session.access_token,
				refreshToken: data.session.refresh_token,
				expiresAt: Math.floor(Date.now() / 1000) + (data.session.expires_in || 3600)
			});

			// Cache user info locally
			if (Capacitor.isNativePlatform() && dbInitialized) {
				console.log('[Auth] Caching user info locally...');
				await cacheUserLocally(usernameOrEmail, data.user.id);
				console.log('[Auth] Local cache saved');
			}

			console.log('[Auth] Setting online auth state...');
			authState.setOnlineAuth(data.user, data.session, false);
			console.log('[Auth] Online login SUCCESS');

			return { success: true, mode: 'online' };
		} catch (error: any) {
			console.error('[Auth] Online login FAILED:', error);
			console.error('[Auth] Error details:', {
				message: error.message,
				stack: error.stack,
				code: error.code,
				status: error.status
			});

			// Fall through to offline mode
			if (!Capacitor.isNativePlatform() || !dbInitialized) {
				console.log('[Auth] Cannot fall back to offline - not native or DB not initialized');
				return {
					success: false,
					error: error.message || 'Login failed. Please check your credentials.'
				};
			}
			console.log('[Auth] Falling back to offline login...');
		}
	}

	// Offline login (or online failed)
	if (Capacitor.isNativePlatform() && dbInitialized) {
		console.log('[Auth] Attempting offline login...');
		try {
			// Check rate limiting
			console.log('[Auth] Checking rate limit...');
			const rateLimit = await checkRateLimit(usernameOrEmail);
			console.log('[Auth] Rate limit check:', rateLimit);
			if (!rateLimit.allowed) {
				const minutes = Math.ceil((rateLimit.lockedUntil! - Math.floor(Date.now() / 1000)) / 60);
				console.log('[Auth] Account locked for', minutes, 'minutes');
				return {
					success: false,
					error: `Too many failed attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
				};
			}

			// Get user
			console.log('[Auth] Looking up local user...');
			const user = await getLocalUserByUsername(usernameOrEmail);
			console.log('[Auth] Local user lookup result:', user ? 'User found' : 'User not found');
			if (!user) {
				await recordFailedLogin(usernameOrEmail);
				console.log('[Auth] Offline login FAILED - user not found');
				return { success: false, error: 'Invalid username or password' };
			}

			// Verify password
			console.log('[Auth] Verifying password...');
			const valid = await verifyPassword(password, user.password_hash);
			console.log('[Auth] Password verification:', valid ? 'VALID' : 'INVALID');
			if (!valid) {
				await recordFailedLogin(usernameOrEmail);
				const remaining = rateLimit.remainingAttempts - 1;
				console.log('[Auth] Offline login FAILED - invalid password. Remaining attempts:', remaining);
				if (remaining > 0) {
					return {
						success: false,
						error: `Invalid username or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
					};
				} else {
					return {
						success: false,
						error: 'Too many failed attempts. Account locked for 15 minutes.'
					};
				}
			}

			// Success - reset attempts
			await resetLoginAttempts(usernameOrEmail);

			// Save session to secure storage (offline mode)
			console.log('[Auth] Saving offline session to secure storage...');
			await saveSecureSession({
				userId: user.username,
				accessToken: '', // No tokens in offline mode
				refreshToken: '',
				expiresAt: Math.floor(Date.now() / 1000) + (7 * 24 * 3600) // 7 days
			});

			// Set offline auth state
			console.log('[Auth] Setting offline auth state...');
			authState.setOfflineAuth(user.username, user.is_anonymous);
			console.log('[Auth] Offline login SUCCESS');

			return { success: true, mode: 'offline' };
		} catch (error: any) {
			console.error('[Auth] Offline login EXCEPTION:', error);
			console.error('[Auth] Error details:', {
				message: error.message,
				stack: error.stack
			});
			return {
				success: false,
				error: error.message || 'Login failed'
			};
		}
	}

	console.log('[Auth] Login FAILED - no valid login path available');
	return {
		success: false,
		error: 'Login failed. No connection and local storage unavailable.'
	};
}

/**
 * Create anonymous/local-only account (Skip button)
 */
export async function createAnonymousAccount(): Promise<AuthResult> {
	const isOnline = browser && navigator.onLine && isSupabaseConfigured();
	const androidId = await getAndroidId();
	const username = `local_${androidId}_${Date.now()}`;
	const password = generateRandomPassword();

	// Try to create anonymous account in Supabase
	if (isOnline && androidId) {
		try {
			// Create with random email
			const email = `${username}@local.stubly.app`;

			const {
				data: { user, session },
				error: authError
			} = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username: username,
						is_anonymous: true,
						android_id: androidId
					},
					// Anonymous accounts don't need email confirmation
					emailRedirectTo: undefined
				}
			});

			if (authError) throw authError;
			if (!user) throw new Error('Failed to create anonymous account');

			// Cache locally
			if (Capacitor.isNativePlatform() && dbInitialized) {
				await createLocalUser(username, email, password, user.id, true);
			}

			if (session) {
				authState.setOnlineAuth(session.user, session, true);
			}

			return { success: true, mode: 'online' };
		} catch (error) {
			console.error('Failed to create online anonymous account:', error);
			// Fall through to offline
		}
	}

	// Create local-only anonymous account
	if (Capacitor.isNativePlatform() && dbInitialized) {
		try {
			await createLocalUser(username, null, password, null, true);
			authState.setOfflineAuth(username, true);

			return {
				success: true,
				mode: 'offline',
				needsSync: androidId ? true : false
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message || 'Failed to create local account'
			};
		}
	}

	return {
		success: false,
		error: 'Failed to create anonymous account'
	};
}

/**
 * Login with OAuth provider (Google, Discord, etc.)
 */
export async function loginWithOAuth(provider: 'google' | 'discord'): Promise<AuthResult> {
	if (!browser) {
		return { success: false, error: 'OAuth only available in browser' };
	}

	if (!isSupabaseConfigured()) {
		return { success: false, error: 'Supabase not configured' };
	}

	if (!navigator.onLine) {
		return { success: false, error: 'OAuth requires internet connection' };
	}

	try {
		console.log('[Auth] Starting OAuth login with', provider);

		// Use custom URL scheme on native mobile, web URL on browser
		const isNative = (window as any).Capacitor?.isNativePlatform?.();
		const redirectTo = isNative ? 'com.stubly.app://callback' : window.location.origin;

		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: provider,
			options: {
				redirectTo,
				skipBrowserRedirect: false
			}
		});

		if (error) throw error;

		console.log('[Auth] OAuth redirect initiated');

		// User will be redirected to provider, then back to our app at "/"
		// The root page will check auth and username before redirecting
		return { success: true, mode: 'online' };
	} catch (error: any) {
		console.error('[Auth] OAuth login failed:', error);
		return {
			success: false,
			error: error.message || `Failed to login with ${provider}`
		};
	}
}

/**
 * Check if user needs to pick a username (OAuth users with auto-generated usernames)
 */
export async function needsUsernamePick(): Promise<boolean> {
	if (!browser || !isSupabaseConfigured()) return false;

	try {
		const { data: { session } } = await supabase.auth.getSession();
		if (!session?.user) {
			console.log('[Auth] needsUsernamePick: No session');
			return false;
		}

		console.log('[Auth] Checking username for user:', session.user.id);

		// Get profile
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('username')
			.eq('id', session.user.id)
			.maybeSingle();

		console.log('[Auth] Profile query result:', { profile, error });

		if (error) {
			console.error('[Auth] Error fetching profile:', error);
			return false;
		}

		if (!profile) {
			console.log('[Auth] No profile found - might need to create one');
			return false;
		}

		// Check if username is auto-generated (starts with 'user_')
		const needsPick = profile.username.startsWith('user_');
		console.log('[Auth] Username check:', { username: profile.username, needsPick });
		return needsPick;
	} catch (error) {
		console.error('[Auth] Exception checking username:', error);
		return false;
	}
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
	console.log('[Auth] Logging out...');

	// Logout from Supabase
	if (isSupabaseConfigured()) {
		await supabase.auth.signOut();
	}

	// Clear secure session (encrypted storage)
	await clearSecureSession();

	// Clear auth state
	authState.logout();

	console.log('[Auth] Logout complete');
}

/**
 * Helper: Cache user locally after online login
 */
async function cacheUserLocally(email: string, supabaseUserId: string): Promise<void> {
	try {
		const existing = await getLocalUserByUsername(email);
		if (!existing) {
			// We don't have the password in plaintext, so we can't cache it properly
			// This is fine - they'll need internet to login first time
			console.log('User not cached locally, will need online login');
		} else {
			// Update Supabase ID
			await updateUserSupabaseId(email, supabaseUserId);
		}
	} catch (error) {
		console.error('Failed to cache user locally:', error);
	}
}

/**
 * Helper: Get Android device ID
 */
async function getAndroidId(): Promise<string | null> {
	if (!Capacitor.isNativePlatform()) return null;

	try {
		const { Device } = await import('@capacitor/device');
		const info = await Device.getId();
		return info.identifier;
	} catch (error) {
		console.error('Failed to get Android ID:', error);
		return null;
	}
}

/**
 * Helper: Generate random password for anonymous accounts
 */
function generateRandomPassword(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
	let password = '';
	for (let i = 0; i < 16; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return password;
}
