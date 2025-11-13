<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authState } from '$lib/stores/authState';
	import { supabase } from '$lib/config/supabase';

	let username = $state('');
	let error = $state('');
	let isLoading = $state(false);
	let currentAuthState = $state({ isAuthenticated: false, user: null });

	onMount(() => {
		const unsubscribe = authState.subscribe(state => {
			currentAuthState = state;
		});

		// If not authenticated, redirect to setup
		if (!currentAuthState.isAuthenticated || !currentAuthState.user) {
			goto('/setup');
		}

		return unsubscribe;
	});

	async function handleSubmit() {
		if (!username.trim()) {
			error = 'Please enter a username';
			return;
		}

		// Validate username format
		if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
			error = 'Username must be 3-20 characters (letters, numbers, _, -)';
			return;
		}

		isLoading = true;
		error = '';

		try {
			// Check if username is already taken
			const { data: existing, error: checkError } = await supabase
				.from('profiles')
				.select('username')
				.eq('username', username)
				.limit(1);

			if (checkError) throw checkError;

			if (existing && existing.length > 0) {
				error = 'Username is already taken';
				isLoading = false;
				return;
			}

			// Update profile with chosen username
			const { error: updateError } = await supabase
				.from('profiles')
				.update({ username: username })
				.eq('id', currentAuthState.user!.id);

			if (updateError) throw updateError;

			// Success - redirect to app
			goto('/app');
		} catch (err: any) {
			console.error('[PickUsername] Error:', err);
			error = err.message || 'Failed to set username. Please try again.';
			isLoading = false;
		}
	}
</script>

<div class="container">
	<div class="card">
		<h1>Pick a Username</h1>
		<p class="subtitle">Choose a unique username for your account</p>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<div class="input-group">
				<label for="username">Username</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					placeholder="your_username"
					disabled={isLoading}
					autocomplete="off"
					autocapitalize="off"
				/>
			</div>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			<button type="submit" disabled={isLoading}>
				{isLoading ? 'Setting username...' : 'Continue'}
			</button>
		</form>
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
		border-radius: 16px;
		padding: 40px;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	h1 {
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 600;
		color: #1a1a1a;
		text-align: center;
	}

	.subtitle {
		margin: 0 0 32px 0;
		font-size: 14px;
		color: #666;
		text-align: center;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	label {
		font-size: 14px;
		font-weight: 500;
		color: #333;
	}

	input {
		padding: 12px 16px;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		font-size: 16px;
		color: #1a1a1a;
		background: white;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #667eea;
	}

	input:disabled {
		background: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	.error {
		padding: 12px;
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		color: #c33;
		font-size: 14px;
		text-align: center;
	}

	button {
		padding: 14px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	button:hover:not(:disabled) {
		opacity: 0.9;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
