<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/config/supabase';
	import { authState } from '$lib/stores/authState';

	let isSettingUp = $state(false);
	let error = $state('');
	let currentAuthState = $state({ isAuthenticated: false, user: null });

	// Subscribe to auth state
	$effect(() => {
		const unsubscribe = authState.subscribe(state => {
			currentAuthState = state;
		});
		return unsubscribe;
	});

	async function handleSetupCloudFolder() {
		if (!currentAuthState.user) {
			error = 'You must be logged in to set up cloud storage';
			return;
		}

		isSettingUp = true;
		error = '';

		try {
			// Call Supabase Edge Function to create Backblaze B2 mount
			const { data, error: funcError } = await supabase.functions.invoke('create-storage-mount', {
				method: 'POST'
			});

			if (funcError) throw funcError;

			if (!data.success) {
				throw new Error(data.error || 'Failed to create cloud storage');
			}

			console.log('[MountSetup] Cloud mount created:', data.mount_id);

			// Initialize local SQLite database (if on native platform)
			if ((window as any).Capacitor?.isNativePlatform?.()) {
				const { initLocalDB } = await import('$lib/db/local');
				const { syncFromSupabase } = await import('$lib/db/sync');

				console.log('[MountSetup] Initializing local database...');
				await initLocalDB();

				console.log('[MountSetup] Syncing data from Supabase...');
				await syncFromSupabase(currentAuthState.user.id);

				console.log('[MountSetup] Database setup complete');
			}

			// Redirect to storage page
			await goto('/storage');
		} catch (err: any) {
			console.error('[MountSetup] Error:', err);
			error = err.message || 'Failed to set up cloud storage. Please try again.';
			isSettingUp = false;
		}
	}
</script>

<div class="container">
	<div class="card">
		<h1>Select Storage Option</h1>
		<p class="subtitle">Choose how you want to store your media files</p>

		{#if error}
			<div class="error-banner">
				{error}
			</div>
		{/if}

		<button
			class="btn-cloud"
			onclick={handleSetupCloudFolder}
			disabled={isSettingUp}
		>
			<div class="btn-icon">☁️</div>
			<div class="btn-content">
				<div class="btn-title">Cloud Storage</div>
				<div class="btn-desc">Secure cloud storage with automatic sync</div>
			</div>
		</button>

		{#if isSettingUp}
			<div class="loading-message">
				<div class="spinner"></div>
				<span>Setting up your cloud storage...</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		padding: 20px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.card {
		background: white;
		border-radius: 20px;
		padding: 40px;
		max-width: 500px;
		width: 100%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
		text-align: center;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		text-align: center;
		color: #666;
		font-size: 1rem;
		margin: 0 0 2rem 0;
	}

	.error-banner {
		background: #fee2e2;
		border: 1px solid #ef4444;
		color: #991b1b;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.btn-cloud {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1.5rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.btn-cloud:hover:not(:disabled) {
		border-color: #667eea;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
		transform: translateY(-2px);
	}

	.btn-cloud:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.btn-icon {
		font-size: 3rem;
		flex-shrink: 0;
	}

	.btn-content {
		flex: 1;
	}

	.btn-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 0.25rem;
	}

	.btn-desc {
		font-size: 0.875rem;
		color: #666;
	}

	.loading-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
		color: #666;
		font-size: 0.875rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 3px solid rgba(102, 126, 234, 0.3);
		border-top-color: #667eea;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 640px) {
		.card {
			padding: 2rem 1.5rem;
		}

		h1 {
			font-size: 1.75rem;
		}

		.cloud-icon {
			font-size: 3rem;
		}
	}
</style>
