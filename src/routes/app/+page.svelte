<script>
	import { onMount, onDestroy } from 'svelte';

	let drawerOpen = $state(false);

	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}

	function closeDrawer() {
		drawerOpen = false;
	}

	let headerElement = $state(null);
	let headerHeight = $state(0);
	let scrollY = $state(0);
	let lastScrollY = $state(0);
	let isHeaderFixed = $state(false);
	let wasHeaderFixed = $state(false);
	let isHeaderFrosted = $state(false);
	let isHeaderHidden = $state(true); // Start hidden so when it becomes fixed, it's already hidden
	let skipTransition = $state(false);

	function handleScroll() {
		if (typeof window === 'undefined') return;

		const currentScrollY = window.scrollY;
		const scrollingDown = currentScrollY > lastScrollY;
		const scrollingUp = currentScrollY < lastScrollY;

		scrollY = currentScrollY;

		// Apply frosted effect when scrolled past 10px
		isHeaderFrosted = currentScrollY >= 10;

		// Track if header just became fixed
		const justBecameFixed = !wasHeaderFixed && currentScrollY >= headerHeight * 2;

		// Switch to fixed when crossing 2x threshold
		if (currentScrollY >= headerHeight * 2) {
			// IMPORTANT: Set hidden BEFORE switching to fixed to prevent flash
			if (justBecameFixed && scrollingDown) {
				isHeaderHidden = true;
			}

			isHeaderFixed = true;

			// Disable transition when first becoming fixed to prevent flash
			if (justBecameFixed) {
				skipTransition = true;
				// Re-enable transition after TWO frames (ensures DOM update + paint)
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						skipTransition = false;
					});
				});
			}
		}
		// Snap back to relative only when at the very top
		else if (currentScrollY <= 1) {
			isHeaderFixed = false;
			isHeaderHidden = false; // Always visible when not fixed
		}

		// Auto-hide/show logic (only when fixed and not just became fixed)
		if (isHeaderFixed && !justBecameFixed) {
			// Scrolling down: hide
			if (scrollingDown && currentScrollY > 100) {
				isHeaderHidden = true;
			}
			// Scrolling up: show
			else if (scrollingUp) {
				isHeaderHidden = false;
			}
		} else if (!isHeaderFixed) {
			// When not fixed, always visible
			isHeaderHidden = false;
		}

		wasHeaderFixed = isHeaderFixed;
		lastScrollY = currentScrollY;
	}

	onMount(() => {
		if (headerElement) {
			headerHeight = headerElement.offsetHeight;
		}
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleScroll, { passive: true });
			handleScroll();
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('scroll', handleScroll);
		}
	});
</script>

<div class="app-container">
	<!-- Drawer overlay -->
	{#if drawerOpen}
		<div
			class="drawer-overlay"
			role="button"
			tabindex="0"
			onclick={closeDrawer}
			onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? closeDrawer() : null}
		></div>
	{/if}

	<!-- Drawer -->
	<div class="drawer" class:open={drawerOpen}>
		<div class="drawer-header">
			<h2>Admin</h2>
			<button class="close-button" onclick={closeDrawer}>✕</button>
		</div>
		<nav class="drawer-nav">
			<a href="/app">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
				</svg>
				<span>Latest</span>
			</a>
			<a href="/demo">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
					<path d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
				</svg>
				<span>Folders</span>
			</a>
			<a href="/app">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 640 640">
					<path d="M541.4 162.6C549 155 561.7 156.9 565.5 166.9C572.3 184.6 576 203.9 576 224C576 312.4 504.4 384 416 384C398.5 384 381.6 381.2 365.8 376L178.9 562.9C150.8 591 105.2 591 77.1 562.9C49 534.8 49 489.2 77.1 461.1L264 274.2C258.8 258.4 256 241.6 256 224C256 135.6 327.6 64 416 64C436.1 64 455.4 67.7 473.1 74.5C483.1 78.3 484.9 91 477.4 98.6L388.7 187.3C385.7 190.3 384 194.4 384 198.6L384 240C384 248.8 391.2 256 400 256L441.4 256C445.6 256 449.7 254.3 452.7 251.3L541.4 162.6z"/>
				</svg>
				<span>Scraper</span>
			</a>
			<a href="/app">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
					<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.583 8.445h.01M10.86 19.71l-6.573-6.63a.993.993 0 0 1 0-1.4l7.329-7.394A.98.98 0 0 1 12.31 4l5.734.007A1.968 1.968 0 0 1 20 5.983v5.5a.992.992 0 0 1-.316.727l-7.44 7.5a.974.974 0 0 1-1.384.001Z" />
				</svg>
				<span>Tags</span>
			</a>
			<a href="/app">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 13V4M7 14H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2m-1-5-4 5-4-5m9 8h.01"/>
				</svg>
				<span>Downloads</span>
			</a>
			<a href="/app">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="7" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<span>Search</span>
			</a>
		</nav>
	</div>

	<!-- Fixed status bar overlay -->
	<div class="status-bar-spacer"></div>

	<!-- In-flow spacer to push content down -->
	<div class="status-bar-push"></div>

	<!-- Spacer to reserve header space when it becomes fixed -->
	{#if isHeaderFixed}
		<div class="header-spacer" style="height: {headerHeight}px;"></div>
	{/if}

	<header class="header" class:header-fixed={isHeaderFixed} class:header-frosted={isHeaderFrosted} class:header-hidden={isHeaderHidden} class:skip-transition={skipTransition} bind:this={headerElement}>
		<div class="top-bar">
			<button class="menu-button" onclick={toggleDrawer}>☰</button>
			<h1>ScrapeNAS</h1>
			<div class="status-icons">
				<button class="user-avatar">
					<span class="avatar-circle">A</span>
				</button>
			</div>
		</div>
		<div class="middle-bar">
			<nav class="breadcrumb">
				<a href="/app">Folders</a>
				<span class="separator">›</span>
				<a href="/app">Wallpapers</a>
				<span class="separator">›</span>
				<span class="current">Japan</span>
			</nav>
			<button class="more-menu" aria-label="More options">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
					<circle cx="12" cy="5" r="2"></circle>
					<circle cx="12" cy="12.5" r="2"></circle>
					<circle cx="12" cy="20" r="2"></circle>
				</svg>
			</button>
		</div>
	</header>

	<main class="page-content">


		<section class="card cyan">
		<h3>Cyan Dreams</h3>
		<p>Bright cyan section with contrasting dark text. Perfect for testing visibility.</p>
		<div class="stats">
			<div class="stat">
				<div class="number">1.2K</div>
				<div class="label">Followers</div>
			</div>
			<div class="stat">
				<div class="number">847</div>
				<div class="label">Following</div>
			</div>
			<div class="stat">
				<div class="number">93</div>
				<div class="label">Posts</div>
			</div>
		</div>
		</section>

		<section class="card orange">
			<h3>Orange Energy</h3>
			<p>Hot orange section bringing the heat. Keep scrolling to see more colors!</p>
			<div class="progress-bar">
				<div class="progress" style="width: 65%"></div>
			</div>
		</section>

		<section class="card green">
			<h3>Green Zone</h3>
			<p>Calming green area for your eyes. Notice how the nav buttons look against different backgrounds.</p>
			<ul>
				<li>Item One</li>
				<li>Item Two</li>
				<li>Item Three</li>
				<li>Item Four</li>
			</ul>
		</section>

		<section class="card pink">
			<h3>Pink Paradise</h3>
			<p>Soft pink vibes. Perfect for testing how system UI elements blend with content.</p>
			<button>Another Button</button>
		</section>

		<section class="card blue">
			<h3>Deep Blue</h3>
			<p>Dark blue ocean of content. Almost at the bottom now!</p>
			<div class="chip-container">
				<span class="chip">Design</span>
				<span class="chip">Mobile</span>
				<span class="chip">Android</span>
				<span class="chip">UI/UX</span>
			</div>
		</section>

		
		<section class="card cyan">
		<h3>Cyan Dreams</h3>
		<p>Bright cyan section with contrasting dark text. Perfect for testing visibility.</p>
		<div class="stats">
			<div class="stat">
				<div class="number">1.2K</div>
				<div class="label">Followers</div>
			</div>
			<div class="stat">
				<div class="number">847</div>
				<div class="label">Following</div>
			</div>
			<div class="stat">
				<div class="number">93</div>
				<div class="label">Posts</div>
			</div>
		</div>
		</section>

		<section class="card orange">
			<h3>Orange Energy</h3>
			<p>Hot orange section bringing the heat. Keep scrolling to see more colors!</p>
			<div class="progress-bar">
				<div class="progress" style="width: 65%"></div>
			</div>
		</section>

		<section class="card green">
			<h3>Green Zone</h3>
			<p>Calming green area for your eyes. Notice how the nav buttons look against different backgrounds.</p>
			<ul>
				<li>Item One</li>
				<li>Item Two</li>
				<li>Item Three</li>
				<li>Item Four</li>
			</ul>
		</section>

		<section class="card pink">
			<h3>Pink Paradise</h3>
			<p>Soft pink vibes. Perfect for testing how system UI elements blend with content.</p>
			<button>Another Button</button>
		</section>

		<section class="card blue">
			<h3>Deep Blue</h3>
			<p>Dark blue ocean of content. Almost at the bottom now!</p>
			<div class="chip-container">
				<span class="chip">Design</span>
				<span class="chip">Mobile</span>
				<span class="chip">Android</span>
				<span class="chip">UI/UX</span>
			</div>
		</section>
		


		<!-- <section class="hero">
			<h2>Scroll to test overlays</h2>
			<p>Watch how content flows behind Android system bars</p>
		</section>

		<section class="card purple">
			<h3>Purple Section</h3>
			<p>This is a vibrant purple card with some dummy content to make it taller and more scrollable.</p>
			<a href="/demo">
				<button>🎨 View Component Demo</button>
			</a>
		</section>

		<section class="card cyan">
		<h3>Cyan Dreams</h3>
		<p>Bright cyan section with contrasting dark text. Perfect for testing visibility.</p>
		<div class="stats">
			<div class="stat">
				<div class="number">1.2K</div>
				<div class="label">Followers</div>
			</div>
			<div class="stat">
				<div class="number">847</div>
				<div class="label">Following</div>
			</div>
			<div class="stat">
				<div class="number">93</div>
				<div class="label">Posts</div>
			</div>
		</div>
		</section>

		<section class="card orange">
			<h3>Orange Energy</h3>
			<p>Hot orange section bringing the heat. Keep scrolling to see more colors!</p>
			<div class="progress-bar">
				<div class="progress" style="width: 65%"></div>
			</div>
		</section>

		<section class="card green">
			<h3>Green Zone</h3>
			<p>Calming green area for your eyes. Notice how the nav buttons look against different backgrounds.</p>
			<ul>
				<li>Item One</li>
				<li>Item Two</li>
				<li>Item Three</li>
				<li>Item Four</li>
			</ul>
		</section>

		<section class="card pink">
			<h3>Pink Paradise</h3>
			<p>Soft pink vibes. Perfect for testing how system UI elements blend with content.</p>
			<button>Another Button</button>
		</section>

		<section class="card blue">
			<h3>Deep Blue</h3>
			<p>Dark blue ocean of content. Almost at the bottom now!</p>
			<div class="chip-container">
				<span class="chip">Design</span>
				<span class="chip">Mobile</span>
				<span class="chip">Android</span>
				<span class="chip">UI/UX</span>
			</div>
		</section>

		<footer class="footer">
			<p>Bottom of the page - test nav bar overlay here</p>
			<button class="footer-btn">Tap Me</button>
		</footer> -->
	</main>
</div>

<style>
	.app-container {
		min-height: 100%;
	}

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

	.header {
		position: relative; /* Default: in normal flow */
	}

	.header:not(.header-fixed) {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.header-fixed {
		position: fixed;
		top: var(--status-bar-height, 0);
		left: 0;
		right: 0;
		z-index: 50;
		transform: translateY(-100%);
	}

	.header-fixed:not(.skip-transition) {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.header-fixed:not(.header-hidden) {
		transform: translateY(0);
	}

	.header-hidden {
		transform: translateY(-100%);
	}

	.header-frosted .top-bar {
		backdrop-filter: blur(20px) saturate(180%);
		background-color: rgba(22, 23, 24, 0.8) !important;
	}

	.header-frosted .middle-bar {
		backdrop-filter: blur(20px) saturate(180%);
		background-color: rgba(26, 27, 28, 0.8);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 60px;
		background-color: #161718;
		transition: backdrop-filter 0.3s ease, background-color 0.3s ease;
	}

	.middle-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 44px;
		padding-left: 20px;
		background-color: #1a1b1c;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		transition: backdrop-filter 0.3s ease, background-color 0.3s ease;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #d4d4d4;
	}

	.breadcrumb a {
		color: #d4d4d4;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.breadcrumb a:hover {
		color: white;
	}

	.breadcrumb .separator {
		color: #d4d4d4;
		user-select: none;
	}

	.breadcrumb .current {
		color: #c89cff;
		font-weight: 500;
	}

	.more-menu {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		width: 50px;
		cursor: pointer;
		color: #888;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.more-menu svg {
		width: 20px;
		height: 20px;
	}

	.menu-button {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 60px;
		height: 60px;
		font-size: 24px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		color: #cfa9ff;
	}

	.user-avatar {
		all: unset;
		height: 60px;
		min-width: 70px; /* 60px visual + 10px right padding absorbed from top-bar */
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.avatar-circle {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background-color: #279d17;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 500;
		font-size: 14px;
	}

	.header h1 {
		margin: 0;
		font-size: 20px;
		padding-right: 10px; /* Visual alignment fix - text doesn't optically center well in CSS */
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.status-icons {
		display: flex;
		gap: 10px;
	}

	.hero {
		background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
		padding: 60px 20px;
		text-align: center;
	}

	.hero h2 {
		margin: 0 0 10px 0;
		font-size: 32px;
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero p {
		margin: 0;
		color: #888;
	}

	.card {
		margin: 20px;
		padding: 30px;
		border-radius: 20px;
		min-height: 200px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.card h3 {
		margin: 0 0 15px 0;
		font-size: 24px;
	}

	.card p {
		margin: 0 0 20px 0;
		line-height: 1.6;
		opacity: 0.9;
	}

	.card.purple {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.card.cyan {
		background: linear-gradient(135deg, #06beb6 0%, #48b1bf 100%);
		color: #0a0a0a;
	}

	.card.cyan h3,
	.card.cyan p {
		color: #0a0a0a;
	}

	.card.orange {
		background: linear-gradient(135deg, #f77062 0%, #fe5196 100%);
	}

	.card.green {
		background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
		color: #0a0a0a;
	}

	.card.green h3,
	.card.green p,
	.card.green ul {
		color: #0a0a0a;
	}

	.card.pink {
		background: linear-gradient(135deg, #fc466b 0%, #3f5efb 100%);
	}

	.card.blue {
		background: linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%);
	}

	button,
	.footer-btn {
		background: rgba(255, 255, 255, 0.2);
		border: 2px solid rgba(255, 255, 255, 0.3);
		padding: 12px 24px;
		border-radius: 10px;
		color: white;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		backdrop-filter: blur(10px);
	}

	.stats {
		display: flex;
		justify-content: space-around;
		margin-top: 20px;
	}

	.stat {
		text-align: center;
	}

	.number {
		font-size: 28px;
		font-weight: bold;
		color: #0a0a0a;
	}

	.label {
		font-size: 14px;
		opacity: 0.7;
		color: #0a0a0a;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		overflow: hidden;
		margin-top: 20px;
	}

	.progress {
		height: 100%;
		background: white;
		transition: width 0.3s ease;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 20px 0 0 0;
	}

	li {
		padding: 12px;
		background: rgba(0, 0, 0, 0.1);
		margin-bottom: 8px;
		border-radius: 8px;
	}

	.chip-container {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 20px;
	}

	.chip {
		padding: 8px 16px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		font-size: 14px;
		backdrop-filter: blur(10px);
	}

	.footer {
		background: linear-gradient(135deg, #232526 0%, #414345 100%);
		padding: 40px 20px;
		text-align: center;
	}

	.footer p {
		margin: 0 0 20px 0;
		color: #888;
	}

	/* Drawer overlay */
	.drawer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 10000;
		backdrop-filter: blur(2px);
	}

	/* Drawer */
	.drawer {
		position: fixed;
		top: 0;
		left: -280px;
		bottom: 0;
		width: 280px;
		background-color: #1a1a1a;
		z-index: 10001;
		transition: left 0.3s ease;
		box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
		padding-top: var(--status-bar-height, 0);
	}

	.drawer.open {
		left: 0;
	}

	.drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		border-bottom: 1px solid #333;
	}

	.drawer-header h2 {
		margin: 0;
		font-size: 24px;
		color: white;
	}

	.close-button {
		all: unset;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		cursor: pointer;
		color: #888;
		border-radius: 4px;
	}

	.close-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.drawer-nav {
		display: flex;
		flex-direction: column;
		padding: 10px 0;
	}

	.drawer-nav a {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 20px;
		color: #ccc;
		text-decoration: none;
		font-size: 16px;
		transition: background-color 0.2s ease, color 0.2s ease;
	}

	.drawer-nav a svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.drawer-nav a:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: white;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.menu-button {
			width: 50px;
		}

		.user-avatar {
			min-width: 65px; /* 60px visual + 5px right padding absorbed from top-bar on mobile */
		}
	}
</style>
