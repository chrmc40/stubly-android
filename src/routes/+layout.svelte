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

	let { children } = $props();

	onMount(async () => {
		if (!browser) return;

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
		    currentPath !== '/') {
			console.log('[Layout] Not authenticated, redirecting to /setup');
			goto('/setup');
			unsubscribe();
			return;
		}

		// If authenticated and on setup page, redirect to app
		if (authStateValue.isAuthenticated && currentPath === '/setup') {
			console.log('[Layout] Already authenticated, redirecting to /app');
			goto('/app');
			unsubscribe();
			return;
		}

		// Storage configuration routing (legacy - may not be needed with auth)
		if (!isConfigured && currentPath !== '/setup' && !authStateValue.isAuthenticated) {
			goto('/setup');
		} else if (isConfigured && currentPath === '/setup' && authStateValue.isAuthenticated) {
			// Already configured but on setup page - redirect to app
			goto('/app');
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

<!-- Android system bar frosted glass overlays -->
<SystemBarsOverlay />

<style>
	.app-content-area {
		padding-bottom: calc(56px + var(--nav-bar-bottom, 0px));
		padding-left: var(--nav-bar-left, 0px);
		padding-right: var(--nav-bar-right, 0px);
		min-height: 100dvh;
	}
</style>
