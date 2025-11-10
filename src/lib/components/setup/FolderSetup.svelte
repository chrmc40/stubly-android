<!--
  Welcome/Setup Screen

  First-time user onboarding with two options:
  1. Quick Start - Use /downloads folder (simple, no permissions)
  2. Custom Location - Pick folder via SAF (advanced)
-->
<script lang="ts">
	import { requestStorageSetup } from '$lib/utils/startup';
	import { setMountPath as setMountPathInStore } from '$lib/stores/appState';
	import { setMountPath as setMountPathInStorage } from '$lib/api/storage';
	import { goto } from '$app/navigation';

	let isSettingUp = $state(false);
	let errorMessage = $state('');

	/**
	 * Quick start - use /downloads folder
	 */
	async function handleQuickStart() {
		isSettingUp = true;
		errorMessage = '';

		try {
			// Use /downloads as default mount path
			const downloadsPath = '/storage/emulated/0/Download';

			// Store in both API (localStorage/SharedPreferences) and app state
			await setMountPathInStorage(downloadsPath);
			setMountPathInStore(downloadsPath);

			// Redirect to main app
			await goto('/app');
		} catch (err) {
			console.error('Quick start failed:', err);
			errorMessage = 'Failed to set up downloads folder. Please try custom location.';
			isSettingUp = false;
		}
	}

	/**
	 * Custom location - open SAF folder picker
	 */
	async function handleCustomLocation() {
		isSettingUp = true;
		errorMessage = '';

		try {
			const success = await requestStorageSetup();

			if (success) {
				// Redirect to main app
				await goto('/app');
			} else {
				errorMessage = 'Folder selection was cancelled. Please try again.';
				isSettingUp = false;
			}
		} catch (err) {
			console.error('Custom location setup failed:', err);
			errorMessage =
				err instanceof Error ? err.message : 'Failed to set up custom location. Please try again.';
			isSettingUp = false;
		}
	}
</script>

<!-- Status bar overlay for Android -->
<div class="status-bar-overlay"></div>

<div class="welcome-container">
	<div class="welcome-content">
		<!-- Welcome Message -->
		<h1>Welcome to Stubly.io</h1>
		<p class="subtitle">Your NAS downloader and content manager</p>

		<!-- Setup Instructions -->
		<div class="instructions">
			<p>To get started, choose where you'd like to store your downloaded content:</p>
		</div>

		<!-- Setup Options -->
		<div class="setup-options">
			<!-- Quick Start -->
			<button class="option-card primary" onclick={handleQuickStart} disabled={isSettingUp}>
				<div class="option-icon">📁</div>
				<h3>Quick Start</h3>
				<p>Use your Downloads folder</p>
				<span class="option-badge">Recommended</span>
			</button>

			<!-- Custom Location -->
			<button class="option-card" onclick={handleCustomLocation} disabled={isSettingUp}>
				<div class="option-icon">📂</div>
				<h3>Custom Location</h3>
				<p>Pick a specific folder</p>
				<span class="option-badge">Advanced</span>
			</button>
		</div>

		<!-- Error Message -->
		{#if errorMessage}
			<div class="error-message">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<span>{errorMessage}</span>
			</div>
		{/if}

		<!-- Loading State -->
		{#if isSettingUp}
			<div class="loading-message">Setting up storage...</div>
		{/if}
	</div>
</div>

<style>
	.status-bar-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--status-bar-height, 0px);
		backdrop-filter: blur(20px) saturate(180%);
		background-color: rgba(0, 0, 0, 0.75);
		z-index: 10000;
		pointer-events: none;
	}

	.welcome-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		padding-top: calc(2rem + var(--status-bar-height, 0px));
		padding-left: calc(2rem + var(--nav-bar-left, 0px));
		padding-right: calc(2rem + var(--nav-bar-right, 0px));
		padding-bottom: calc(2rem + var(--nav-bar-bottom, 0px));
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		overflow-y: auto;
	}

	.welcome-content {
		max-width: 500px;
		width: 100%;
		text-align: center;
		color: white;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
	}

	.subtitle {
		font-size: 1.125rem;
		opacity: 0.9;
		margin: 0 0 2rem;
	}

	.instructions {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		backdrop-filter: blur(10px);
	}

	.instructions p {
		margin: 0;
		font-size: 1rem;
		line-height: 1.6;
	}

	.setup-options {
		display: grid;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.option-card {
		background: white;
		border: none;
		border-radius: 16px;
		padding: 2rem;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
		overflow: hidden;
		text-align: center;
	}

	.option-card:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	.option-card:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.option-card.primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.option-card.primary h3,
	.option-card.primary p {
		color: white;
	}

	.option-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.option-card h3 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.option-card p {
		margin: 0 0 1rem;
		color: #666;
		font-size: 1rem;
	}

	.option-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.option-card.primary .option-badge {
		background: rgba(255, 255, 255, 0.3);
		color: white;
	}

	.option-card:not(.primary) .option-badge {
		background: rgba(102, 126, 234, 0.1);
		color: #667eea;
	}

	.error-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: rgba(220, 38, 38, 0.2);
		border: 1px solid rgba(220, 38, 38, 0.3);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		color: white;
	}

	.error-message svg {
		flex-shrink: 0;
	}

	.loading-message {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		backdrop-filter: blur(10px);
	}

	@media (max-width: 640px) {
		.welcome-container {
			padding: 1rem;
		}

		h1 {
			font-size: 2rem;
		}

		.option-card {
			padding: 1.5rem;
		}
	}
</style>
