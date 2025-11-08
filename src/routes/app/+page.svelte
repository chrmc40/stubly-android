<script>
	import HeadroomHeader from '$lib/components/layout/HeadroomHeader.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import { systemBarsData } from '$lib/stores/systemBars';

	let drawerOpen = $state(false);

	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}

	function closeDrawer() {
		drawerOpen = false;
	}
</script>

<div class="app-container">
	<!-- Drawer overlay -->
	{#if drawerOpen}
		<div
			class="drawer-overlay"
			role="button"
			tabindex="0"
			onclick={closeDrawer}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' ? closeDrawer() : null)}
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
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
					/>
				</svg>
				<span>Latest</span>
			</a>
			<a href="/demo">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path
						d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
					/>
				</svg>
				<span>Folders</span>
			</a>
			<a href="/app">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="currentColor"
					viewBox="0 0 640 640"
				>
					<path
						d="M541.4 162.6C549 155 561.7 156.9 565.5 166.9C572.3 184.6 576 203.9 576 224C576 312.4 504.4 384 416 384C398.5 384 381.6 381.2 365.8 376L178.9 562.9C150.8 591 105.2 591 77.1 562.9C49 534.8 49 489.2 77.1 461.1L264 274.2C258.8 258.4 256 241.6 256 224C256 135.6 327.6 64 416 64C436.1 64 455.4 67.7 473.1 74.5C483.1 78.3 484.9 91 477.4 98.6L388.7 187.3C385.7 190.3 384 194.4 384 198.6L384 240C384 248.8 391.2 256 400 256L441.4 256C445.6 256 449.7 254.3 452.7 251.3L541.4 162.6z"
					/>
				</svg>
				<span>Scraper</span>
			</a>
			<a href="/app">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15.583 8.445h.01M10.86 19.71l-6.573-6.63a.993.993 0 0 1 0-1.4l7.329-7.394A.98.98 0 0 1 12.31 4l5.734.007A1.968 1.968 0 0 1 20 5.983v5.5a.992.992 0 0 1-.316.727l-7.44 7.5a.974.974 0 0 1-1.384.001Z"
					/>
				</svg>
				<span>Tags</span>
			</a>
			<a href="/app">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 13V4M7 14H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2m-1-5-4 5-4-5m9 8h.01"
					/>
				</svg>
				<span>Downloads</span>
			</a>
			<a href="/app">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="7" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<span>Search</span>
			</a>
		</nav>
	</div>

	<!-- Headroom Header with auto-hide behavior -->
	<HeadroomHeader>
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
	</HeadroomHeader>

	<!-- Page content -->
	<main class="page-content">
		<div class="gallery">
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #fddb92 0%, #d1fdff 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #c471f5 0%, #fa71cd 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #96fbc4 0%, #f9f586 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #fa8bff 0%, #2bd2ff 90%, #2bff88 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #00d2ff 0%, #3a47d5 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #08aeea 0%, #2af598 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #ff5858 0%, #f09819 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #3b41c5 0%, #a981bb 49%, #ffc8a9 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #a6c0fe 0%, #f68084 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #fccb90 0%, #d57eeb 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);"
			></div>
			<div
				class="gallery-item"
				style="background: linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%);"
			></div>
		</div>
	</main>

	<!-- Bottom Navigation with auto-hide behavior -->
	<BottomNav>
		<button class="nav-item active">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path
					d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
				/>
			</svg>
			<span>Storage</span>
		</button>
		<button class="nav-item">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
			<span>Search</span>
		</button>
		<button class="nav-item">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path
					d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
				/>
			</svg>
			<span>Latest</span>
		</button>
		<button class="nav-item">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 13V4M7 14H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2m-1-5-4 5-4-5m9 8h.01"
				/>
			</svg>
			<span>Downloads</span>
		</button>
	</BottomNav>

	<!-- Debug Overlay (hidden by default, uncomment to debug) -->
	<!-- <div class="debug-overlay">
		<div>Orientation: {$systemBarsData.orientation}°</div>
		<div>Status Bar: {$systemBarsData.statusBar}px</div>
		<div>Nav Bottom: {$systemBarsData.navigationBar}px</div>
		<div>Nav Left: {$systemBarsData.navBarLeft}px</div>
		<div>Nav Right: {$systemBarsData.navBarRight}px</div>
		<div>Nav Side: {$systemBarsData.navBarSide}</div>
		<div>Notch: {$systemBarsData.notch ? 'True' : 'False'}</div>
		<div>Notch Left: {$systemBarsData.notchLeft}px</div>
		<div>Notch Right: {$systemBarsData.notchRight}px</div>
	</div> -->
</div>

<style>
	.app-container {
		min-height: 100%;
	}

	/* Header styles */
	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 60px;
		background-color: #161718;
		transition:
			backdrop-filter 0.3s ease,
			background-color 0.3s ease;
	}

	.middle-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 44px;
		padding-left: 20px;
		background-color: #1a1b1c;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		transition:
			backdrop-filter 0.3s ease,
			background-color 0.3s ease;
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

	h1 {
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

	/* Drawer styles */
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
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
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

	/* Gallery */
	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 12px;
		padding: 16px;
	}

	.gallery-item {
		aspect-ratio: 1;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.gallery-item:active {
		transform: scale(0.95);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	/* Bottom Nav Item Styles */
	:global(.nav-item) {
		all: unset;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		cursor: pointer;
		color: #b0b0b0;
		flex: 1;
		padding: 4px 0;
		transition: color 0.2s ease;
	}

	:global(.nav-item:hover) {
		color: #fff;
	}

	:global(.nav-item.active) {
		color: #c89cff;
	}

	:global(.nav-item svg) {
		width: 24px;
		height: 24px;
	}

	:global(.nav-item span) {
		font-size: 11px;
		font-weight: 500;
	}
</style>
