<script lang="ts">
	import { getModalState, closeModal } from './modalStore.svelte';

	// Get reactive modal state
	let modalState = $derived(getModalState());

	// Track component changes for logging
	let lastComponent: any = $state(null);

	$effect(() => {
		const comp = modalState?.component;
		if (comp !== lastComponent) {
			if (comp) {
				const label = modalState?.props?.__modalKey
					? String(modalState.props.__modalKey)
					: '<SvelteComponent>';
				console.log(`[ModalManager] Mounting modal: ${label}`);
			} else {
				console.log('[ModalManager] Modal unmounted');
			}
			lastComponent = comp;
		}
	});
</script>

{#if modalState?.component}
	{#key modalState}
		<svelte:component
			this={modalState.component}
			{...modalState.props}
			onclose={closeModal}
		/>
	{/key}
{/if}
