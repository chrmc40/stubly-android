<script lang="ts">
	/**
	 * Create Folder Modal
	 *
	 * Allows user to create a new folder in the current path.
	 * Ported from sn5 and adapted for Svelte 5 + stubly-android.
	 */

	import { tick } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Props {
		path: string[];
		onComplete?: (result?: any) => void;
		__modalKey?: string;
	}

	let { path, onComplete }: Props = $props();

	let open = $state(true);
	let folderName = $state('');
	let errorMessage = $state('');
	let inputElement: HTMLInputElement;

	// Auto-focus input when modal opens
	$effect(() => {
		if (open && inputElement) {
			tick().then(() => inputElement?.focus());
		}
	});

	function handleClose() {
		open = false;
		onComplete?.({ status: 'cancelled' });
	}

	async function handleCreate() {
		errorMessage = '';
		const name = folderName.trim();

		if (!name) {
			errorMessage = 'Please enter a folder name.';
			return;
		}

		try {
			// TODO: Replace with actual API call for creating folder
			// For now, simulate success
			const res = await fetch('/api/folders/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path, name })
			});

			if (!res.ok) {
				const payload = await res.json();
				errorMessage = payload.error || 'Failed to create folder.';
				return;
			}

			// Success
			open = false;
			onComplete?.({
				status: 'completed',
				data: { folderName: name }
			});
		} catch (err) {
			console.error('Error creating folder:', err);
			errorMessage = 'Network error: please try again.';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleCreate();
		}
	}
</script>

<Modal bind:open title="Create Folder" onclose={handleClose}>
	<div class="modal-body">
		<input
			bind:this={inputElement}
			bind:value={folderName}
			type="text"
			placeholder="Folder name"
			class="input"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
			onkeydown={handleKeydown}
		/>

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}
	</div>

	<div class="modal-actions">
		<button onclick={handleClose} class="btn-secondary">Cancel</button>
		<button onclick={handleCreate} class="btn-primary">Create</button>
	</div>
</Modal>

<style>
	.modal-body {
		margin-bottom: 1rem;
	}

	.input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 14px;
		outline: none;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.input:focus {
		border-color: #c89cff;
	}

	.input::placeholder {
		color: var(--text-subdued);
	}

	.error-message {
		margin: 0.5rem 0 0 0;
		color: #ff7070;
		font-size: 0.875rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #c89cff;
		color: #000;
	}

	.btn-primary:hover {
		background: #d4b0ff;
	}

	.btn-secondary {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn-secondary:hover {
		background: var(--bg-quaternary);
	}
</style>
