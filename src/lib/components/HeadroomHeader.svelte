<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { children } = $props();

	let headerElement = $state<HTMLElement | null>(null);
	let headerHeight = $state(0);
	let scrollY = $state(0);
	let lastScrollY = $state(0);
	let isHeaderFrosted = $state(false);
	let headerTranslateY = $state(0);
	let savedHeaderTranslateY = 0;

	/**
	 * Recalculate header position when orientation changes
	 * Preserves the "hidden percentage" so state is maintained
	 */
	function handleConfigurationChange() {
		if (!headerElement) return;

		// Calculate hidden percentage from SAVED state (not current, which might be corrupted by scroll events)
		const oldHeight = headerHeight;
		const hiddenPercentage = oldHeight > 0 ? Math.abs(savedHeaderTranslateY) / oldHeight : 0;

		// Measure new height (layout has already updated by the time this event fires)
		const newHeight = headerElement.offsetHeight;
		headerHeight = newHeight;

		// Apply the same hidden percentage to the new height
		headerTranslateY = -(hiddenPercentage * newHeight);
		savedHeaderTranslateY = headerTranslateY;

		// Update scroll tracking after updating state
		const currentScrollY = window.scrollY;
		lastScrollY = currentScrollY;
		scrollY = currentScrollY;

		// Dispatch updated state with orientation flag
		window.dispatchEvent(
			new CustomEvent('headroomChange', {
				detail: {
					translateY: headerTranslateY,
					fullyVisible: headerTranslateY === 0,
					fullyHidden: Math.abs(headerTranslateY - (-headerHeight)) < 1,
					scrollY: currentScrollY,
					isOrientationChange: true
				}
			})
		);
	}

	/**
	 * Headroom scroll handler - hides header on scroll down, reveals on scroll up
	 */
	function handleScroll() {
		if (typeof window === 'undefined') return;

		const currentScrollY = window.scrollY;
		const scrollDelta = currentScrollY - lastScrollY;

		scrollY = currentScrollY;

		// Save state BEFORE processing scroll (like BottomNav does)
		savedHeaderTranslateY = headerTranslateY;

		// Apply frosted effect when scrolled past 10px
		isHeaderFrosted = currentScrollY >= 10;

		// Header positioning: always elastic/sticky behavior
		// Apply scroll delta to current position
		let newHeaderTranslateY = headerTranslateY - scrollDelta;

		// Constrain based on scroll position
		if (currentScrollY <= headerHeight) {
			// Near top: header can be anywhere from 0 (visible) to -currentScrollY (scrolled with page)
			newHeaderTranslateY = Math.max(-currentScrollY, Math.min(0, newHeaderTranslateY));
		} else {
			// Past headerHeight: header can be anywhere from 0 (visible) to -headerHeight (fully hidden)
			newHeaderTranslateY = Math.max(-headerHeight, Math.min(0, newHeaderTranslateY));
		}

		headerTranslateY = newHeaderTranslateY;
		lastScrollY = currentScrollY;

		// Dispatch event with header state for other components
		window.dispatchEvent(
			new CustomEvent('headroomChange', {
				detail: {
					translateY: headerTranslateY,
					fullyVisible: headerTranslateY === 0,
					fullyHidden: headerTranslateY === -headerHeight,
					scrollY: currentScrollY
				}
			})
		);
	}

	onMount(() => {
		if (headerElement) {
			headerHeight = headerElement.offsetHeight;
		}
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleScroll, { passive: true });
			window.addEventListener('configurationChanged', handleConfigurationChange);
			handleScroll(); // Initial call
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('configurationChanged', handleConfigurationChange);
		}
	});
</script>

<!-- Status bar spacer (fixed black bar at top) -->
<div class="status-bar-spacer"></div>

<!-- In-flow spacers to push content down -->
<div class="status-bar-push"></div>
<div class="header-spacer" style="height: {headerHeight}px;"></div>

<!-- Header with headroom behavior -->
<header
	class="headroom-header"
	class:header-frosted={isHeaderFrosted}
	bind:this={headerElement}
	style="--header-translate-y: {headerTranslateY}px"
>
	{@render children?.()}
</header>

<style>
	.status-bar-spacer {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--status-bar-height, 0px);
		background-color: #000;
		z-index: 100;
	}

	.status-bar-push {
		height: var(--status-bar-height, 0px);
	}

	/* Hide status bar elements on web (desktop) */
	@media (hover: hover) and (pointer: fine) {
		.status-bar-spacer,
		.status-bar-push {
			display: none;
		}
	}

	.headroom-header {
		position: fixed;
		top: var(--status-bar-height, 0);
		left: var(--nav-bar-left, 0);
		right: var(--nav-bar-right, 0);
		z-index: 50;
		transform: translateY(var(--header-translate-y, 0));
		transition: transform 0.1s linear;
	}

	.header-frosted {
		backdrop-filter: blur(20px) saturate(180%);
	}

	.header-frosted :global(.top-bar) {
		background-color: rgba(22, 23, 24, 0.8) !important;
	}

	.header-frosted :global(.middle-bar) {
		background-color: rgba(26, 27, 28, 0.8);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
