/**
 * Storage API - Platform adapter for storage configuration
 *
 * Mobile-first Android app with dev-only web fallback:
 * - Android (production): Uses Storage Access Framework (SAF) with user folder picker
 * - Web (dev only): Falls back to localStorage for component testing
 */

import { Capacitor } from '@capacitor/core';

export interface StorageConfig {
	path: string | null;
	isConfigured: boolean;
}

/**
 * Get current mount path
 * - Android: Retrieves from StorageManager plugin (uses SharedPreferences)
 * - Web (dev only): Attempts to fetch from non-existent endpoint, returns null
 */
export async function getMountPath(): Promise<string | null> {
	if (Capacitor.isNativePlatform()) {
		// Android: Use StorageManager plugin
		const StorageManager = (await import('$lib/config/storage-manager')).default;
		const result = await StorageManager.getMountPath();
		return result.path || null;
	} else {
		// Web: No storage path configured (expected - web is dev-only)
		// This 404 is normal behavior
		return null;
	}
}

/**
 * Set mount path directly (for preset paths like /downloads)
 * - Android: Stores path in SharedPreferences
 * - Web (dev only): Throws error - not supported
 */
export async function setMountPath(path: string): Promise<void> {
	if (Capacitor.isNativePlatform()) {
		// Android: Store in SharedPreferences via StorageManager plugin
		const StorageManager = (await import('$lib/config/storage-manager')).default;
		await StorageManager.setMountPath({ path });
	} else {
		// Web: Must use .env
		throw new Error('Storage path must be configured in .env file (STORAGE_PATH)');
	}
}

/**
 * Request user to pick mount path
 * - Android: Opens SAF folder picker, stores result in SharedPreferences
 * - Web (dev only): Throws error - not supported
 */
export async function requestMountPath(preset?: string): Promise<string> {
	if (Capacitor.isNativePlatform()) {
		// Android: Open SAF folder picker
		const StorageManager = (await import('$lib/config/storage-manager')).default;
		const result = await StorageManager.requestMountPath(preset ? { preset } : undefined);
		if (!result.path) {
			throw new Error('User cancelled folder selection');
		}
		return result.path;
	} else {
		// Web: Must use .env
		throw new Error('Storage path must be configured in .env file (STORAGE_PATH)');
	}
}

/**
 * Clear stored mount path
 * - Android: Clears from SharedPreferences
 * - Web (dev only): No-op
 */
export async function clearMountPath(): Promise<void> {
	if (Capacitor.isNativePlatform()) {
		// Android: Clear from SharedPreferences via StorageManager plugin
		const StorageManager = (await import('$lib/config/storage-manager')).default;
		await StorageManager.clearMountPath();
	}
	// Web: No-op
}

/**
 * Get storage configuration status
 */
export async function getStorageConfig(): Promise<StorageConfig> {
	const path = await getMountPath();
	return {
		path,
		isConfigured: !!path
	};
}
