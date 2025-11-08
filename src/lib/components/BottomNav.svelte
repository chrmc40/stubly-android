<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { children } = $props();

	let bottomNavTranslateY = $state(0);
	let lastScrollY = $state(0);
	let headerFullyVisible = $state(false);
	let savedBottomNavState = 0;

	/**
	 * Listen to headroom header changes to sync bottom nav behavior
	 */
	function handleHeadroomChange(e: CustomEvent) {
		const { translateY, scrollY, isOrientationChange } = e.detail;
		headerFullyVisible = translateY === 0;

		// If this is an orientation change, restore saved state and return
		if (isOrientationChange) {
			bottomNavTranslateY = savedBottomNavState;
			lastScrollY = scrollY;

			// Dispatch current visibility state
			const isHidden = bottomNavTranslateY > 28;
			window.dispatchEvent(
				new CustomEvent('bottomNavVisibilityChange', { detail: { hidden: isHidden } })
			);
			return;
		}

		// Save state before processing scroll
		savedBottomNavState = bottomNavTranslateY;

		const currentScrollY = scrollY;
		const scrollDelta = currentScrollY - lastScrollY;

		// Bottom nav behavior
		if (currentScrollY > 100) {
			if (headerFullyVisible) {
				// Snap bottom nav to fully visible when header is fully shown
				bottomNavTranslateY = 0;
			} else {
				// Accumulate scroll delta for bottom nav (56px is nav height without Android nav bar)
				bottomNavTranslateY = Math.max(0, Math.min(56, bottomNavTranslateY + scrollDelta));
			}

			// Dispatch event for overlay component
			const isHidden = bottomNavTranslateY > 28; // Consider hidden if more than halfway
			window.dispatchEvent(
				new CustomEvent('bottomNavVisibilityChange', { detail: { hidden: isHidden } })
			);
		} else if (currentScrollY <= 1) {
			bottomNavTranslateY = 0;
			window.dispatchEvent(
				new CustomEvent('bottomNavVisibilityChange', { detail: { hidden: false } })
			);
		}

		lastScrollY = currentScrollY;
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('headroomChange', handleHeadroomChange as EventListener);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('headroomChange', handleHeadroomChange as EventListener);
		}
	});
</script>

<nav
	class="bottom-nav"
	class:snap-visible={bottomNavTranslateY === 0 && headerFullyVisible}
	style="--bottom-nav-translate-y: {bottomNavTranslateY}px; --bottom-nav-opacity: {1 -
		bottomNavTranslateY / 56};"
>
	{@render children?.()}
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: var(--nav-bar-left, 0);
		right: var(--nav-bar-right, 0);
		height: calc(56px + var(--nav-bar-bottom, 0px));
		background-color: transparent;
		display: flex;
		justify-content: space-around;
		align-items: flex-start;
		padding-top: 8px;
		padding-bottom: var(--nav-bar-bottom, 0px);
		z-index: 10000;
		transform: translateY(var(--bottom-nav-translate-y, 0));
		opacity: var(--bottom-nav-opacity, 1);
		transition: transform 0.1s linear, opacity 0.1s linear;
	}

	.bottom-nav.snap-visible {
		transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Hide bottom nav on desktop */
	@media (hover: hover) and (pointer: fine) {
		.bottom-nav {
			display: none;
		}
	}
</style>
