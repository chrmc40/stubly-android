<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { SystemBars } from '$lib/plugins/system-bars';

	let { children } = $props();
	let isBottomNavHidden = $state(false);

	onMount(async () => {
		// Listen for bottom nav visibility changes
		window.addEventListener('bottomNavVisibilityChange', ((e: CustomEvent) => {
			isBottomNavHidden = e.detail.hidden;
		}) as EventListener);

		return () => {
			window.removeEventListener('bottomNavVisibilityChange', ((e: CustomEvent) => {
				isBottomNavHidden = e.detail.hidden;
			}) as EventListener);
		};
	});

	async function updateSystemBarVars() {
		if ((window as any).Capacitor?.isNativePlatform?.()) {
			try {
				const data = await SystemBars.getHeights();
				// Convert from physical pixels to CSS pixels using device pixel ratio
				const dpr = window.devicePixelRatio || 1;
				const statusBarHeight = data.statusBar / dpr;
				const navBarBottom = data.navigationBar / dpr;
				const navBarLeft = data.navBarLeft / dpr;
				const navBarRight = data.navBarRight / dpr;

				document.documentElement.style.setProperty('--status-bar-height', `${statusBarHeight}px`);
				document.documentElement.style.setProperty('--nav-bar-bottom', `${navBarBottom}px`);

				// Set side-specific variables based on which side the nav bar is on
				if (data.navBarSide === 'left') {
					document.documentElement.style.setProperty('--nav-bar-left', `${navBarLeft}px`);
					document.documentElement.style.setProperty('--nav-bar-right', '0px');
				} else if (data.navBarSide === 'right') {
					document.documentElement.style.setProperty('--nav-bar-left', '0px');
					document.documentElement.style.setProperty('--nav-bar-right', `${navBarRight}px`);
				} else {
					// Bottom - no side padding
					document.documentElement.style.setProperty('--nav-bar-left', '0px');
					document.documentElement.style.setProperty('--nav-bar-right', '0px');
				}

				console.log('System bars updated:', {
					statusBar: statusBarHeight,
					navBottom: navBarBottom,
					navLeft: navBarLeft,
					navRight: navBarRight,
					side: data.navBarSide
				});
			} catch (error) {
				console.error('Failed to get system bar heights:', error);
			}
		}
	}

	let configListener;

	onMount(async () => {
		// Get system bar heights and inject as CSS variables
		await updateSystemBarVars();

		// Listen for configuration changes
		if ((window as any).Capacitor?.isNativePlatform?.()) {
			configListener = await SystemBars.addListener('configurationChanged', async () => {
				console.log('Configuration changed - updating system bar CSS vars');
				await updateSystemBarVars();
			});
		}
	});

	onMount(async () => {
		if ((window as any).Capacitor?.isNativePlatform?.()) {

			// Handle Android back button
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
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Main app content area -->
<div class="app-content-area">
	{@render children?.()}
</div>

<!-- Android navigation bar overlays (frosted glass) -->
<div class="mobile-nav-bar" class:nav-icons-hidden={isBottomNavHidden}></div>
<div class="mobile-nav-bar-left"></div>
<div class="mobile-nav-bar-right"></div>

<style>
	.app-content-area {
		padding-bottom: calc(56px + var(--nav-bar-bottom, 0px));
		padding-left: var(--nav-bar-left, 0px);
		padding-right: var(--nav-bar-right, 0px);
		min-height: 100dvh;
	}

	.mobile-nav-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: calc(56px + var(--nav-bar-bottom, 0px));
		backdrop-filter: blur(20px) saturate(180%);
		background-color: rgba(0, 0, 0, 0.75);
		z-index: 9999;
		pointer-events: none;
		transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.mobile-nav-bar.nav-icons-hidden {
		height: var(--nav-bar-bottom, 0px);
	}

	.mobile-nav-bar-left {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: var(--nav-bar-left, 0px);
		backdrop-filter: blur(20px) saturate(180%);
		background-color: rgba(0, 0, 0, 0.75);
		z-index: 9999;
		pointer-events: none;
	}

	.mobile-nav-bar-right {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: var(--nav-bar-right, 0px);
		backdrop-filter: blur(20px) saturate(180%);
		background-color: rgba(0, 0, 0, 0.75);
		z-index: 9999;
		pointer-events: none;
	}

	/* Hide on web */
	@media (hover: hover) and (pointer: fine) {
		.mobile-nav-bar,
		.mobile-nav-bar-left,
		.mobile-nav-bar-right {
			display: none;
		}
	}
</style>
