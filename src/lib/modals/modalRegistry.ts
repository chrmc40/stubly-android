/**
 * Modal Registry
 *
 * Central registry for all modals in the application.
 * Each modal is lazily loaded when opened for better performance.
 */

import type { ComponentType, SvelteComponent } from 'svelte';

/**
 * Registry of all available modals
 * Add new modals here with their dynamic import
 */
export const modals = {
	// Folder modals
	CreateFolder: async () => (await import('./components/folders/CreateFolderModal.svelte')).default,
	// Upload modals
	Upload: async () => (await import('./components/uploads/UploadModal.svelte')).default,
	// TODO: Port remaining modals from sn5:
	// - Delete, BulkDelete, PropertiesFolder, Rename, CreateText
	// - UploadProgress
	// - DownloadFile, Downloads
	// - Properties, UrlEditor, DocumentEditor, Tags, etc.
} as const;

/**
 * Type-safe modal keys
 */
export type ModalKey = keyof typeof modals;

/**
 * Props for each modal
 * Define specific props per modal for type safety
 */
export interface ModalPropsMap {
	CreateFolder: { path: string[] };
	Upload: { path: string[]; autoOpenFileInput?: boolean };
}

/**
 * Generic modal props type
 */
export type ModalProps<K extends ModalKey = ModalKey> = K extends keyof ModalPropsMap
	? ModalPropsMap[K]
	: Record<string, unknown>;

/**
 * Modal state structure
 */
export interface ModalState<K extends ModalKey = ModalKey> {
	component: ComponentType<SvelteComponent> | null;
	props: ModalProps<K> & {
		__modalKey?: K;
		onComplete?: (result?: any) => void;
	};
}
