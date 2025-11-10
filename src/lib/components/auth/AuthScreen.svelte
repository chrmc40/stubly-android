<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { register, login, createAnonymousAccount } from '$lib/auth/auth';

	let mode: 'login' | 'register' = $state('login');
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let successMessage = $state('');
	let isOnline = $state(browser ? navigator.onLine : true);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	// Password strength
	let passwordStrength = $derived(calculatePasswordStrength(password));

	function calculatePasswordStrength(pwd: string): {
		score: number;
		label: string;
		color: string;
	} {
		if (!pwd) return { score: 0, label: '', color: '' };

		let score = 0;
		if (pwd.length >= 8) score++;
		if (pwd.length >= 12) score++;
		if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
		if (/[0-9]/.test(pwd)) score++;
		if (/[^A-Za-z0-9]/.test(pwd)) score++;

		if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
		if (score <= 3) return { score, label: 'Fair', color: '#f59e0b' };
		if (score <= 4) return { score, label: 'Good', color: '#10b981' };
		return { score, label: 'Strong', color: '#059669' };
	}

	function isPasswordValid(): boolean {
		return (
			password.length >= 8 &&
			/[a-z]/.test(password) &&
			/[A-Z]/.test(password) &&
			/[0-9]/.test(password)
		);
	}

	async function handleSubmit() {
		error = '';
		successMessage = '';

		if (mode === 'register') {
			// Validation
			if (!username.trim()) {
				error = 'Username is required';
				return;
			}
			if (!email.trim() || !email.includes('@')) {
				error = 'Valid email is required';
				return;
			}
			if (!isPasswordValid()) {
				error = 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
				return;
			}
			if (password !== confirmPassword) {
				error = 'Passwords do not match';
				return;
			}

			// Register user
			isLoading = true;
			try {
				const result = await register(username, email, password);

				if (result.success) {
					// Check if email confirmation is required
					if (result.error) {
						// Success but needs email confirmation
						successMessage = result.error;
						mode = 'login'; // Switch to login mode
						// Clear registration fields
						password = '';
						confirmPassword = '';
					} else if (result.mode === 'offline') {
						// Offline registration - account will sync later
						console.log('Account created offline - will sync when online');
						goto('/app');
					} else {
						// Online registration with immediate session
						goto('/app');
					}
				} else {
					error = result.error || 'Registration failed';
				}
			} catch (err: any) {
				error = err.message || 'An unexpected error occurred';
			} finally {
				isLoading = false;
			}
		} else {
			// Login validation
			if (!username.trim()) {
				error = 'Username or email is required';
				return;
			}
			if (!password.trim()) {
				error = 'Password is required';
				return;
			}

			// Login
			console.log('[AuthScreen] Starting login process...');
			isLoading = true;
			try {
				console.log('[AuthScreen] Calling login() with username:', username);
				const result = await login(username, password);
				console.log('[AuthScreen] Login result:', result);

				if (result.success) {
					console.log('[AuthScreen] Login SUCCESS, mode:', result.mode);
					// Show offline mode indicator if needed
					if (result.mode === 'offline') {
						console.log('[AuthScreen] Logged in offline - limited features available');
					}
					// Navigate to app
					console.log('[AuthScreen] Navigating to /app...');
					await goto('/app');
					console.log('[AuthScreen] Navigation complete');
				} else {
					console.log('[AuthScreen] Login FAILED, error:', result.error);
					error = result.error || 'Login failed';
				}
			} catch (err: any) {
				console.error('[AuthScreen] Login EXCEPTION:', err);
				error = err.message || 'An unexpected error occurred';
			} finally {
				console.log('[AuthScreen] Setting isLoading = false');
				isLoading = false;
			}
		}
	}

	function handleOAuthGoogle() {
		console.log('OAuth Google');
		// TODO: Implement
	}

	function handleOAuthDiscord() {
		console.log('OAuth Discord');
		// TODO: Implement
	}

	async function handleSkip() {
		isLoading = true;
		error = '';

		try {
			const result = await createAnonymousAccount();

			if (result.success) {
				console.log('Anonymous account created:', result.mode);
				// Navigate to app
				goto('/app');
			} else {
				error = result.error || 'Failed to create local account';
			}
		} catch (err: any) {
			error = err.message || 'An unexpected error occurred';
		} finally {
			isLoading = false;
		}
	}

	function toggleMode() {
		mode = mode === 'login' ? 'register' : 'login';
		error = '';
		successMessage = '';
		password = '';
		confirmPassword = '';
	}

	// Listen for online/offline
	function updateOnlineStatus() {
		isOnline = navigator.onLine;
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('online', updateOnlineStatus);
			window.addEventListener('offline', updateOnlineStatus);

			return () => {
				window.removeEventListener('online', updateOnlineStatus);
				window.removeEventListener('offline', updateOnlineStatus);
			};
		}
	});
</script>

<div class="auth-screen">
	<div class="auth-container">
		<!-- Header -->
		<div class="header">
			<h1>stubly</h1>
			<p class="subtitle">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
		</div>

		<!-- Offline Banner -->
		{#if !isOnline}
			<div class="offline-banner">
				⚠️ No internet connection - Offline mode only
			</div>
		{/if}

		<!-- Success Message -->
		{#if successMessage}
			<div class="success-banner">
				✓ {successMessage}
			</div>
		{/if}

		<!-- Error Message -->
		{#if error}
			<div class="error-banner">
				{error}
			</div>
		{/if}

		<!-- Auth Form -->
		<form onsubmit={(e) => (e.preventDefault(), handleSubmit())}>
			<!-- Username / Email -->
			<div class="input-group">
				<label for="username">{mode === 'register' ? 'Username' : 'Username or Email'}</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					placeholder={mode === 'register' ? 'Enter username' : 'Username or email'}
					disabled={isLoading}
					autocomplete="username"
				/>
			</div>

			<!-- Email (Register only) -->
			{#if mode === 'register'}
				<div class="input-group">
					<label for="email">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="your@email.com"
						disabled={isLoading}
						autocomplete="email"
					/>
				</div>
			{/if}

			<!-- Password -->
			<div class="input-group">
				<label for="password">Password</label>
				<div class="password-input-wrapper">
					<input
						id="password"
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="Enter password"
						disabled={isLoading}
						autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					/>
					<button
						type="button"
						class="toggle-password"
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
								<line x1="1" y1="1" x2="23" y2="23"></line>
							</svg>
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
								<circle cx="12" cy="12" r="3"></circle>
							</svg>
						{/if}
					</button>
				</div>
				{#if mode === 'register' && password}
					<div class="password-strength">
						<div class="strength-bar">
							<div
								class="strength-fill"
								style="width: {(passwordStrength.score / 5) * 100}%; background: {passwordStrength.color}"
							></div>
						</div>
						<span style="color: {passwordStrength.color}">{passwordStrength.label}</span>
					</div>
				{/if}
			</div>

			<!-- Confirm Password (Register only) -->
			{#if mode === 'register'}
				<div class="input-group">
					<label for="confirm-password">Confirm Password</label>
					<div class="password-input-wrapper">
						<input
							id="confirm-password"
							type={showConfirmPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Confirm password"
							disabled={isLoading}
							autocomplete="new-password"
						/>
						<button
							type="button"
							class="toggle-password"
							onclick={() => (showConfirmPassword = !showConfirmPassword)}
							aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
						>
							{#if showConfirmPassword}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
									<line x1="1" y1="1" x2="23" y2="23"></line>
								</svg>
							{:else}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
							{/if}
						</button>
					</div>
				</div>
			{/if}

			<!-- Submit Button -->
			<button type="submit" class="btn-primary" disabled={isLoading}>
				{#if isLoading}
					{mode === 'login' ? 'Logging in...' : 'Creating account...'}
				{:else}
					{mode === 'login' ? 'Login' : 'Create Account'}
				{/if}
			</button>
		</form>

		<!-- Divider -->
		<div class="divider">
			<span>or continue with</span>
		</div>

		<!-- OAuth Buttons -->
		<div class="oauth-buttons">
			<button class="btn-oauth" onclick={handleOAuthGoogle} disabled={isLoading || !isOnline}>
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
					<path
						d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
						fill="#4285F4"
					/>
					<path
						d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
						fill="#34A853"
					/>
					<path
						d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
						fill="#FBBC05"
					/>
					<path
						d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
						fill="#EA4335"
					/>
				</svg>
				Google
			</button>
			<button class="btn-oauth" onclick={handleOAuthDiscord} disabled={isLoading || !isOnline}>
				<svg width="18" height="18" viewBox="0 0 71 55" fill="#5865F2">
					<path
						d="M60.105 4.898A58.55 58.55 0 0045.653.415a.22.22 0 00-.233.11 40.784 40.784 0 00-1.8 3.697c-5.456-.817-10.886-.817-16.23 0-.485-1.164-1.201-2.587-1.828-3.697a.228.228 0 00-.233-.11 58.386 58.386 0 00-14.451 4.483.207.207 0 00-.095.082C1.578 18.73-.944 32.144.293 45.39a.244.244 0 00.093.167c6.073 4.46 11.955 7.167 17.729 8.962a.23.23 0 00.249-.082 42.08 42.08 0 003.627-5.9.225.225 0 00-.123-.312 38.772 38.772 0 01-5.539-2.64.228.228 0 01-.022-.378c.372-.279.744-.569 1.1-.862a.22.22 0 01.23-.03c11.619 5.304 24.198 5.304 35.68 0a.219.219 0 01.233.027c.356.293.728.586 1.103.865a.228.228 0 01-.02.378 36.384 36.384 0 01-5.54 2.637.227.227 0 00-.121.315 47.249 47.249 0 003.624 5.897.225.225 0 00.249.084c5.801-1.794 11.684-4.502 17.757-8.961a.228.228 0 00.092-.164c1.48-15.315-2.48-28.618-10.497-40.412a.18.18 0 00-.093-.084zm-36.38 32.427c-3.497 0-6.38-3.211-6.38-7.156 0-3.944 2.827-7.156 6.38-7.156 3.583 0 6.438 3.24 6.382 7.156 0 3.945-2.827 7.156-6.381 7.156zm23.593 0c-3.498 0-6.38-3.211-6.38-7.156 0-3.944 2.826-7.156 6.38-7.156 3.582 0 6.437 3.24 6.38 7.156 0 3.945-2.798 7.156-6.38 7.156z"
					/>
				</svg>
				Discord
			</button>
		</div>

		<!-- Toggle Login/Register -->
		<div class="toggle-mode">
			{#if mode === 'login'}
				<p>Don't have an account? <button onclick={toggleMode}>Sign up</button></p>
			{:else}
				<p>Already have an account? <button onclick={toggleMode}>Log in</button></p>
			{/if}
		</div>

		<!-- Skip Button -->
		<div class="skip-section">
			<button class="btn-skip" onclick={handleSkip} disabled={isLoading}>
				Skip - Use Locally Only
			</button>
			<p class="skip-note">
				You can create a full account later at any time!
			</p>
		</div>
	</div>
</div>

<style>
	.auth-screen {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 2rem 1rem;
		padding-top: calc(2rem + var(--system-bar-top, 0px));
		padding-bottom: calc(2rem + var(--system-bar-bottom, 0px));
		overflow-y: auto;
	}

	.auth-container {
		width: 100%;
		max-width: 420px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-radius: 20px;
		padding: 2.5rem 2rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #64748b;
		font-size: 1rem;
		margin: 0;
	}

	.offline-banner {
		background: #fef3c7;
		border: 1px solid #fbbf24;
		color: #92400e;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		text-align: center;
	}

	.success-banner {
		background: #d1fae5;
		border: 1px solid #10b981;
		color: #065f46;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
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

	.input-group {
		margin-bottom: 1.25rem;
	}

	.input-group label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #334155;
		margin-bottom: 0.5rem;
	}

	.input-group input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s;
		background: white;
		color: #1e293b;
	}

	.input-group input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.input-group input:disabled {
		background: #f1f5f9;
		cursor: not-allowed;
	}

	.password-input-wrapper {
		position: relative;
	}

	.password-input-wrapper input {
		padding-right: 3rem;
	}

	.toggle-password {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: #64748b;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}

	.toggle-password:hover {
		color: #334155;
	}

	.password-strength {
		margin-top: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.strength-bar {
		flex: 1;
		height: 4px;
		background: #e2e8f0;
		border-radius: 2px;
		overflow: hidden;
	}

	.strength-fill {
		height: 100%;
		transition: all 0.3s;
	}

	.password-strength span {
		font-size: 0.75rem;
		font-weight: 600;
		min-width: 50px;
		text-align: right;
	}

	.btn-primary {
		width: 100%;
		padding: 0.875rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		margin-top: 0.5rem;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.divider {
		display: flex;
		align-items: center;
		text-align: center;
		margin: 1.5rem 0;
		color: #94a3b8;
		font-size: 0.875rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-bottom: 1px solid #e2e8f0;
	}

	.divider span {
		padding: 0 1rem;
	}

	.oauth-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.btn-oauth {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		color: #334155;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-oauth:hover:not(:disabled) {
		border-color: #cbd5e1;
		background: #f8fafc;
	}

	.btn-oauth:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-mode {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.toggle-mode p {
		color: #64748b;
		font-size: 0.875rem;
		margin: 0;
	}

	.toggle-mode button {
		background: none;
		border: none;
		color: #667eea;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
	}

	.skip-section {
		border-top: 1px solid #e2e8f0;
		padding-top: 1.5rem;
		text-align: center;
	}

	.btn-skip {
		width: 100%;
		padding: 0.75rem;
		background: transparent;
		border: 2px dashed #cbd5e1;
		border-radius: 8px;
		color: #64748b;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-skip:hover:not(:disabled) {
		border-color: #94a3b8;
		color: #475569;
		background: #f8fafc;
	}

	.btn-skip:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.skip-note {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: 0.5rem 0 0 0;
	}
</style>
