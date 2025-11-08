<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { initSystemBars, cleanupSystemBars } from '$lib/stores/systemBars';
	import SystemBarsOverlay from '$lib/components/SystemBarsOverlay.svelte';

	let { children } = $props();

	onMount(async () => {
		if (!browser) return;

		// Initialize system bars detection and CSS variables
		await initSystemBars();

		// Handle Android back button
		if ((window as any).Capacitor?.isNativePlatform?.()) {
			const { App } = await import('@capacitor/app');
			App.addListener('backButton', ({ canGoBack }) => {
				const currentPath = window.location.pathname;

				if (currentPath === '/' || currentPath === '/app') {
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
