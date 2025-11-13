/**
 * Modal Store (Svelte 5 Runes)
 *
 * Global modal state management using modern Svelte 5 runes.
 * Provides type-safe API for opening and closing modals.
 */

import type { ModalKey, ModalProps, ModalState } from './modalRegistry';
import { modals } from './modalRegistry';

/**
 * Global modal state using Svelte 5 $state rune
 */
let modalState = $state<ModalState | null>(null);
let lastModalKey: ModalKey | null = null;

/**
 * Opens a modal by key with the given props
 * Dynamically loads the component if not already loaded
 */
export async function openModal<K extends ModalKey>(
	name: K,
	props?: ModalProps<K>
): Promise<void> {
	const loader = modals[name];
	if (!loader) {
		console.error(`[modalStore] No modal registered for key: ${name}`);
		return;
	}

	try {
		// Load the component
		const component = await loader();

		// If the same modal key is already mounted, avoid re-setting
		if (lastModalKey !== name) {
			modalState = {
				component,
				props: { ...(props || {}), __modalKey: name } as any
			};
			lastModalKey = name;
			console.log(`[modalStore] Opened modal: ${String(name)}`);
		} else {
			console.log(`[modalStore] Modal ${String(name)} already open`);
		}
	} catch (err) {
		console.error(`[modalStore] Error loading modal component: ${String(err)}`);
	}
}

/**
 * Closes the currently open modal
 */
export function closeModal(): void {
	if (!modalState && !lastModalKey) {
		console.log('[modalStore] No modal to close');
		return;
	}

	console.log(`[modalStore] Closing modal: ${String(lastModalKey)}`);
	modalState = null;
	lastModalKey = null;
}

/**
 * Updates props of the currently open modal
 */
export function updateModalProps<K extends ModalKey>(props: Partial<ModalProps<K>>): void {
	if (!modalState) {
		console.warn('[modalStore] No modal open to update props');
		return;
	}

	modalState = {
		...modalState,
		props: { ...modalState.props, ...props }
	};
	console.log('[modalStore] Updated modal props');
}

/**
 * Gets the current modal state (reactive)
 */
export function getModalState() {
	return modalState;
}

/**
 * Convenience helper - opens a modal and returns a Promise
 * that resolves when the modal calls the injected `onComplete` prop
 *
 * Usage:
 *   const result = await showModal('CreateFolder', { path: ['foo'] });
 *   if (result.success) { ... }
 */
export async function showModal<K extends ModalKey>(
	name: K,
	props?: ModalProps<K>
): Promise<any> {
	return new Promise(async (resolve) => {
		await openModal(name, {
			...props,
			onComplete: (result?: any) => {
				console.log(`[modalStore] onComplete callback received`, result);
				// Close modal on completion or cancellation
				if (result?.status === 'completed' || result?.status === 'cancelled') {
					closeModal();
				}
				resolve(result);
			}
		} as any);
	});
}

/**
 * Export a reactive modal store object
 * This maintains compatibility with existing patterns while using runes
 */
export const modalStore = {
	get current() {
		return modalState;
	},
	open: openModal,
	close: closeModal,
	updateProps: updateModalProps
};
