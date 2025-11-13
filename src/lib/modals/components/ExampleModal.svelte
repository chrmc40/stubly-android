<script lang="ts">
	/**
	 * Example Modal
	 *
	 * This is an example of how to create a modal component for the registry system.
	 * Copy this pattern when creating new modals.
	 */

	import Modal from '$lib/components/ui/Modal.svelte';

	// Props from the modal store
	interface Props {
		title?: string;
		message?: string;
		onComplete?: (result?: any) => void;
		__modalKey?: string;
	}

	let {
		title = 'Example Modal',
		message = 'This is an example modal',
		onComplete
	}: Props = $props();

	let open = $state(true);
	let inputValue = $state('');

	// Handle modal close
	function handleClose() {
		open = false;
		// Call onComplete with cancelled status
		onComplete?.({ status: 'cancelled' });
	}

	// Handle modal submit
	function handleSubmit() {
		open = false;
		// Call onComplete with completed status and result data
		onComplete?.({
			status: 'completed',
			data: { value: inputValue }
		});
	}
</script>

<Modal bind:open {title}>
	<div class="modal-body">
		<p>{message}</p>
		<input
			type="text"
			bind:value={inputValue}
			placeholder="Enter something..."
			class="input"
		/>
	</div>
	<div class="modal-actions">
		<button onclick={handleClose} class="btn-secondary">Cancel</button>
		<button onclick={handleSubmit} class="btn-primary">OK</button>
	</div>
</Modal>

<style>
	.modal-body {
		margin-bottom: 1rem;
	}

	.modal-body p {
		margin: 0 0 1rem 0;
		color: var(--text-primary);
	}

	.input {
		width: 100%;
		padding: 0.5rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 14px;
		outline: none;
		transition: border-color 0.2s;
	}

	.input:focus {
		border-color: #c89cff;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
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
