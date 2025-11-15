<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X } from 'lucide-svelte';

	let {
		open = $bindable(false),
		title = '',
		children,
		onclose
	}: {
		open?: boolean;
		title?: string;
		children?: any;
		onclose?: () => void;
	} = $props();

	let keyboardHeight = $state(0);
	let backdropElement: HTMLDivElement;

	function close() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close();
		}
	}

	// Detect keyboard height using Visual Viewport API
	function updateKeyboardHeight() {
		if (typeof window !== 'undefined' && window.visualViewport) {
			const viewport = window.visualViewport;
			const windowHeight = window.innerHeight;
			const viewportHeight = viewport.height;

			// Keyboard height is the difference
			keyboardHeight = Math.max(0, windowHeight - viewportHeight);
		}
	}

	onMount(() => {
		if (typeof window !== 'undefined' && window.visualViewport) {
			window.visualViewport.addEventListener('resize', updateKeyboardHeight);
			window.visualViewport.addEventListener('scroll', updateKeyboardHeight);
			updateKeyboardHeight();
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined' && window.visualViewport) {
			window.visualViewport.removeEventListener('resize', updateKeyboardHeight);
			window.visualViewport.removeEventListener('scroll', updateKeyboardHeight);
		}
	});
</script>

{#if open}
	<div
		bind:this={backdropElement}
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		tabindex="-1"
		style="--keyboard-height: {keyboardHeight}px"
	>
		<div class="modal-content">
			<div class="modal-header">
				<h2>{title}</h2>
				<button class="close-btn" onclick={close}>
					<X size={24} />
				</button>
			</div>
			<div class="modal-body">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		z-index: var(--z-modal);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.2s ease;
		/* Adjust padding when keyboard is visible */
		padding-bottom: calc(20px + var(--keyboard-height, 0px));
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-content {
		background: var(--bg-secondary);
		border-radius: var(--border-radius);
		max-width: 500px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		/* Adjust max-height when keyboard is visible */
		max-height: calc(80vh - var(--keyboard-height, 0px));
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.modal-header {
		padding: 20px;
		border-bottom: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--bg-tertiary);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 20px;
		color: var(--text-primary);
	}

	.close-btn {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-subdued);
		transition: var(--ui-transition);
	}

	.close-btn:hover {
		background: var(--bg-quaternary);
		color: var(--text-primary);
	}

	.modal-body {
		padding: 20px;
		overflow-y: auto;
		color: var(--text-primary);
	}
</style>
