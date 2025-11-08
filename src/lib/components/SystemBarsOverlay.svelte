<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let isBottomNavHidden = $state(false);

	function handleBottomNavVisibilityChange(e: CustomEvent) {
		isBottomNavHidden = e.detail.hidden;
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener(
				'bottomNavVisibilityChange',
				handleBottomNavVisibilityChange as EventListener
			);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener(
				'bottomNavVisibilityChange',
				handleBottomNavVisibilityChange as EventListener
			);
		}
	});
</script>

<!-- Android navigation bar overlays (frosted glass) -->
<div class="mobile-nav-bar" class:nav-icons-hidden={isBottomNavHidden}></div>
<div class="mobile-nav-bar-left"></div>
<div class="mobile-nav-bar-right"></div>

<style>
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
