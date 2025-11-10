/**
 * Global authentication state store
 * Manages user session and auth status across the app
 */

import { writable, derived } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';

export type AuthMode = 'online' | 'offline' | 'pending';

export interface AuthState {
	user: User | null;
	session: Session | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	mode: AuthMode; // online = connected to Supabase, offline = local only
	localUsername: string | null; // For offline mode
	isAnonymous: boolean; // If user skipped registration
}

const initialState: AuthState = {
	user: null,
	session: null,
	isAuthenticated: false,
	isLoading: true,
	mode: 'pending',
	localUsername: null,
	isAnonymous: false
};

function createAuthState() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		/**
		 * Set online authentication state (Supabase)
		 */
		setOnlineAuth(user: User, session: Session, isAnonymous: boolean = false) {
			console.log('[AuthState] Setting ONLINE auth:', {
				userId: user.id,
				email: user.email,
				isAnonymous
			});
			update((state) => ({
				...state,
				user,
				session,
				isAuthenticated: true,
				isLoading: false,
				mode: 'online',
				localUsername: null,
				isAnonymous
			}));
			console.log('[AuthState] Online auth state SET');
		},

		/**
		 * Set offline authentication state (local only)
		 */
		setOfflineAuth(username: string, isAnonymous: boolean = false) {
			console.log('[AuthState] Setting OFFLINE auth:', {
				username,
				isAnonymous
			});
			update((state) => ({
				...state,
				user: null,
				session: null,
				isAuthenticated: true,
				isLoading: false,
				mode: 'offline',
				localUsername: username,
				isAnonymous
			}));
			console.log('[AuthState] Offline auth state SET');
		},

		/**
		 * Set loading state
		 */
		setLoading(isLoading: boolean) {
			update((state) => ({
				...state,
				isLoading
			}));
		},

		/**
		 * Update session (for token refresh)
		 */
		updateSession(session: Session) {
			update((state) => ({
				...state,
				session,
				user: session.user
			}));
		},

		/**
		 * Logout / clear auth state
		 */
		logout() {
			set(initialState);
		},

		/**
		 * Reset to initial state
		 */
		reset() {
			set({ ...initialState, isLoading: false });
		}
	};
}

export const authState = createAuthState();

// Derived stores for convenience
export const isAuthenticated = derived(authState, ($auth) => $auth.isAuthenticated);
export const isOnline = derived(authState, ($auth) => $auth.mode === 'online');
export const isOffline = derived(authState, ($auth) => $auth.mode === 'offline');
export const currentUser = derived(authState, ($auth) => $auth.user);
export const currentUsername = derived(
	authState,
	($auth) => $auth.user?.email || $auth.localUsername || null
);
