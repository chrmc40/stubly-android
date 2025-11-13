<script lang="ts">
	import HeadroomHeader from '$lib/components/layout/HeadroomHeader.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import { Paperclip } from 'lucide-svelte';

	let drawerOpen = $state(false);
	let downloadBarActive = $state(false);
	let downloadInputElement: HTMLInputElement;

	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}

	function closeDrawer() {
		drawerOpen = false;
	}

	function toggleDownloadBar() {
		downloadBarActive = !downloadBarActive;

		// Auto-focus input when download bar becomes active
		if (downloadBarActive && downloadInputElement) {
			setTimeout(() => {
				downloadInputElement.focus();
			}, 100);
		}
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
			<h2>Menu</h2>
			<button class="close-button" onclick={closeDrawer}>✕</button>
		</div>
		<nav class="drawer-nav">
			<a href="/storage">
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
			<a href="/storage">
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
			<a href="/storage">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
		</nav>
	</div>

	<!-- Headroom Header with auto-hide behavior -->
	<HeadroomHeader>
		<div class="top-bar">
			<button class="menu-button" onclick={toggleDrawer}>☰</button>
			<h1>Stubly</h1>
			<div class="status-icons">
				<button class="user-avatar">
					<span class="avatar-circle">A</span>
				</button>
			</div>
		</div>
		<div class="middle-bar">
			<nav class="breadcrumb">
				<a href="/storage">Folders</a>
			</nav>
		</div>
		<div class="download-bar" class:active={downloadBarActive}>
			<div class="download-input">
				<input
					bind:this={downloadInputElement}
					type="url"
					placeholder="Enter URL to save"
					spellcheck="false"
				/>
			</div>
			<button class="download-submit-btn" title="Submit download">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
				</svg>
			</button>
		</div>
		<div class="bottom-bar">
			<div class="left-buttons">
				<button class="download-button" aria-label="Download" onclick={toggleDownloadBar}>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5v14M19 12l-7 7-7-7"/>
					</svg>
				</button>
				<button class="paperclip-button" aria-label="Attach">
					<Paperclip size={20} strokeWidth={2} />
				</button>
			</div>
			<div class="right-buttons">
				<button class="folder-button" aria-label="New folder">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
						<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z"/>
					</svg>
				</button>
				<button class="more-menu" aria-label="More options">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
						<circle cx="12" cy="5" r="2"></circle>
						<circle cx="12" cy="12.5" r="2"></circle>
						<circle cx="12" cy="20" r="2"></circle>
					</svg>
				</button>
			</div>
		</div>
	</HeadroomHeader>

	<!-- Page content -->
	<main class="page-content">
		<div class="gallery">
			<!-- Empty state - no folders yet -->
			<div class="empty-message">
				<div class="empty-icon">📂</div>
				<p>No folders yet</p>
			</div>
		</div>
	</main>

	<!-- Bottom Navigation -->
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
		padding-left:20px;
		margin-top:-0px;
		background-color: #161718;
		/* border-top: 1px solid rgba(255, 255, 255, 0.05); */
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		transition:
			backdrop-filter 0.3s ease,
			background-color 0.3s ease;
	}

	.download-bar {
		position: relative;
		height: 0;
		transition: height 0.3s ease;
		overflow: hidden;
		display: flex;
		align-items: center;
		background-color: #161718;
		padding: 0 4px 0 15px;
		box-sizing: border-box;
	}

	.download-bar.active {
		height: 50px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.download-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		height: 100%;
		display: flex;
		align-items: center;
	}

	.download-input input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font-size: 14px;
		color: #d4d4d4;
		height: 100%;
		transition: opacity 0.2s ease;
	}

	.download-input input::placeholder {
		/* color: rgb(60, 145, 28); */
		color: rgb(229, 138, 195);
	}

	.download-submit-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		color: #888;
		padding: 0 12px;
		height: 100%;
		width: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.download-submit-btn:hover {
		color: #fff;
	}

	.download-submit-btn svg {
		width: 24px;
		height: 24px;
		fill: currentColor;
	}

	.bottom-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 44px;
		padding: 0 8px;
	}

	.left-buttons,
	.right-buttons {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.download-button,
	.paperclip-button,
	.folder-button {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 36px;
		width: 36px;
		cursor: pointer;
		color: #888;
		border-radius: 4px;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 0.2s ease, color 0.2s ease;
	}

	.download-button:hover,
	.paperclip-button:hover,
	.folder-button:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.download-button svg,
	.paperclip-button svg,
	.folder-button svg {
		width: 26px;
		height: 26px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #d4d4d4;
	}

	.breadcrumb a {
		color: #c89cff;
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s ease;
	}

	.breadcrumb a:hover {
		color: white;
	}

	.more-menu {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 36px;
		width: 36px;
		cursor: pointer;
		color: #888;
		border-radius: 4px;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 0.2s ease, color 0.2s ease;
	}

	.more-menu:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: #fff;
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
		color: #a0a0a0;
	}

	.user-avatar {
		all: unset;
		height: 60px;
		min-width: 70px;
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
		padding-right: 10px;
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
		min-height: 400px;
	}

	.empty-message {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: #666;
	}

	.empty-icon {
		font-size: 5rem;
		margin-bottom: 1.5rem;
		opacity: 0.5;
	}

	.empty-message p {
		font-size: 1.125rem;
		margin: 0;
		color: #999;
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
