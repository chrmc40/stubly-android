<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { initSystemBars, cleanupSystemBars } from '$lib/stores/systemBars';
	import { initializeApp } from '$lib/utils/startup';
	import { appState } from '$lib/stores/appState';
	import { initAuth } from '$lib/auth/auth';
	import { authState } from '$lib/stores/authState';
	import SystemBarsOverlay from '$lib/components/layout/SystemBarsOverlay.svelte';
	import ModalManager from '$lib/modals/ModalManager.svelte';

	let { children } = $props();

	onMount(async () => {
		if (!browser) return;

		// Handle OAuth deep link callback on Android
		if ((window as any).Capacitor?.isNativePlatform?.()) {
			const { App } = await import('@capacitor/app');
			App.addListener('appUrlOpen', async (event) => {
				console.log('[Layout] Deep link received:', event.url);

				// Extract authorization code from URL
				const url = new URL(event.url);
				const code = url.searchParams.get('code');

				if (code) {
					console.log('[Layout] Exchanging OAuth code for session');
					const { supabase } = await import('$lib/config/supabase');

					// Exchange the code for a session using PKCE
					const { data, error } = await supabase.auth.exchangeCodeForSession(code);

					if (error) {
						console.error('[Layout] Failed to exchange code:', error);
					} else {
						console.log('[Layout] Session established, reinitializing auth');
						await initAuth();
						// Redirect to root to trigger proper routing
						goto('/');
					}
				}
			});
		}

		// Initialize authentication
		await initAuth();

		// Get auth state directly from store after init
		let authStateValue;
		const unsubscribe = authState.subscribe(state => {
			authStateValue = state;
		});

		// Initialize app (platform detection, storage config, etc.)
		const isConfigured = await initializeApp();

		// Initialize system bars detection and CSS variables
		await initSystemBars();

		// Auth guard: Check authentication status
		const currentPath = window.location.pathname;

		console.log('[Layout] Auth check:', {
			isAuthenticated: authStateValue.isAuthenticated,
			currentPath,
			mode: authStateValue.mode
		});

		// If not authenticated and not on setup/demo pages, redirect to setup
		if (!authStateValue.isAuthenticated &&
		    currentPath !== '/setup' &&
		    currentPath !== '/demo' &&
		    currentPath !== '/pick-username' &&
		    currentPath !== '/mount-setup' &&
		    currentPath !== '/') {
			console.log('[Layout] Not authenticated, redirecting to /setup');
			goto('/setup');
			unsubscribe();
			return;
		}

		// If authenticated, check if user needs to pick username (OAuth with auto-generated username)
		if (authStateValue.isAuthenticated &&
		    authStateValue.mode === 'online' &&
		    currentPath !== '/pick-username' &&
		    currentPath !== '/mount-setup') {
			const { needsUsernamePick } = await import('$lib/auth/auth');
			const needsPick = await needsUsernamePick();

			if (needsPick) {
				console.log('[Layout] User needs to pick username, redirecting to /pick-username');
				goto('/pick-username');
				unsubscribe();
				return;
			}
		}

		// If authenticated and username picked, check if user has mount configured
		if (authStateValue.isAuthenticated &&
		    authStateValue.mode === 'online' &&
		    currentPath !== '/mount-setup' &&
		    currentPath !== '/pick-username' &&
		    currentPath !== '/setup') {
			// Initialize local DB if on native platform
			if ((window as any).Capacitor?.isNativePlatform?.()) {
				const { initLocalDB, hasMountConfigured } = await import('$lib/db/local');
				const { shouldSync, syncFromSupabase } = await import('$lib/db/sync');

				try {
					// Initialize local database
					await initLocalDB();
					console.log('[Layout] Local DB initialized');

					// Check if user has data in Supabase to sync
					const hasDataToSync = await shouldSync(authStateValue.user!.id);

					if (hasDataToSync) {
						console.log('[Layout] Syncing data from Supabase...');
						await syncFromSupabase(authStateValue.user!.id);
						console.log('[Layout] Sync completed');
					} else {
						console.log('[Layout] No data to sync (first-time user)');
					}

					// Check if user has mount configured
					const hasMount = await hasMountConfigured();

					if (!hasMount) {
						console.log('[Layout] No mount configured, redirecting to /mount-setup');
						goto('/mount-setup');
						unsubscribe();
						return;
					}
				} catch (error) {
					console.error('[Layout] Error initializing DB/sync:', error);
				}
			}
		}

		// If authenticated and on setup page, redirect to app
		if (authStateValue.isAuthenticated && currentPath === '/setup') {
			console.log('[Layout] Already authenticated, redirecting to /storage');
			goto('/storage');
			unsubscribe();
			return;
		}

		// Storage configuration routing (legacy - may not be needed with auth)
		if (!isConfigured && currentPath !== '/setup' && !authStateValue.isAuthenticated) {
			goto('/setup');
		} else if (isConfigured && currentPath === '/setup' && authStateValue.isAuthenticated) {
			// Already configured but on setup page - redirect to storage
			goto('/storage');
		}

		unsubscribe();

		// Handle Android back button
		if ((window as any).Capacitor?.isNativePlatform?.()) {
			const { App } = await import('@capacitor/app');
			App.addListener('backButton', ({ canGoBack }) => {
				const currentPath = window.location.pathname;

				if (currentPath === '/' || currentPath === '/app') {
					App.exitApp();
				} else if (currentPath === '/setup') {
					// On setup page - exit app instead of going back
					App.exitApp();
				} else {
					goto('/app');
				}
			});

			// Handle app state changes
			App.addListener('appStateChange', async ({ isActive }) => {
				if (!isActive) {
					// App going to background - logout for security
					console.log('[Layout] App going to background, logging out for security...');
					const { logout } = await import('$lib/auth/auth');
					await logout();
				} else {
					// App becoming active again - reinitialize system bars
					console.log('[Layout] App resuming, reinitializing system bars...');
					await initSystemBars();
				}
			});

			// Handle app pause (alternative event)
			App.addListener('pause', async () => {
				console.log('[Layout] App paused, logging out for security...');
				const { logout } = await import('$lib/auth/auth');
				await logout();
			});

			// Handle app resume (alternative event)
			App.addListener('resume', async () => {
				console.log('[Layout] App resumed, reinitializing system bars...');
				await initSystemBars();
			});
		}
	});

	onDestroy(() => {
		if (browser) {
			cleanupSystemBars();
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Main app content area -->
<div class="app-content-area">
	{@render children?.()}
</div>

<!-- Global modal manager -->
<ModalManager />

<!-- Android system bar frosted glass overlays -->
<SystemBarsOverlay />

<style>
	.app-content-area {
		padding-left: var(--nav-bar-left, 0px);
		padding-right: var(--nav-bar-right, 0px);
		min-height: 100dvh;
		/* Add bottom padding for mobile bottom nav (56px nav + Android nav bar inset) */
		padding-bottom: calc(56px + var(--nav-bar-bottom, 0px));
	}

	/* Remove bottom padding on desktop (no bottom nav) */
	@media (hover: hover) and (pointer: fine) {
		.app-content-area {
			padding-bottom: 0;
		}
	}
</style>
