<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authState } from '$lib/stores/authState';
	import { initAuth, needsUsernamePick } from '$lib/auth/auth';
	import { browser } from '$app/environment';

	onMount(async () => {
		if (!browser) return;

		// Initialize auth first
		await initAuth();

		// Get current auth state
		let currentAuthState;
		const unsubscribe = authState.subscribe(state => {
			currentAuthState = state;
		});

		// Check where to redirect
		if (!currentAuthState.isAuthenticated) {
			// Not authenticated - go to setup
			goto('/setup', { replaceState: true });
		} else if (currentAuthState.mode === 'online') {
			// Online user - check if needs username
			const needsPick = await needsUsernamePick();
			if (needsPick) {
				goto('/pick-username', { replaceState: true });
			} else {
				goto('/app', { replaceState: true });
			}
		} else {
			// Offline user - go to app
			goto('/app', { replaceState: true });
		}

		unsubscribe();
	});
</script>

<div class="loading">
	<div class="spinner"></div>
</div>

<style>
	.loading {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		min-height: 100dvh;
		padding-top: max(20px, 15vh); /* Bias to top third */
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
