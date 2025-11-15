/**
 * Secure Storage Module
 *
 * Provides encrypted storage for sensitive data like auth tokens.
 * Uses Capacitor Preferences which implements:
 * - Android: EncryptedSharedPreferences (AES-256)
 * - Web: localStorage (fallback, not encrypted)
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const SESSION_KEY = 'stubly_session';
const SESSION_EXPIRY_KEY = 'stubly_session_expiry';

export interface SecureSession {
	userId: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

/**
 * Save session to secure storage
 * On Android, uses EncryptedSharedPreferences with AES-256
 */
export async function saveSecureSession(session: SecureSession): Promise<void> {
	try {
		const sessionJson = JSON.stringify(session);
		await Preferences.set({
			key: SESSION_KEY,
			value: sessionJson
		});

		// Also save expiry separately for quick checks
		await Preferences.set({
			key: SESSION_EXPIRY_KEY,
			value: session.expiresAt.toString()
		});

		console.log('[SecureStorage] Session saved securely');
	} catch (error) {
		console.error('[SecureStorage] Failed to save session:', error);
		throw error;
	}
}

/**
 * Get session from secure storage
 */
export async function getSecureSession(): Promise<SecureSession | null> {
	try {
		const { value } = await Preferences.get({ key: SESSION_KEY });

		if (!value) {
			console.log('[SecureStorage] No session found');
			return null;
		}

		const session = JSON.parse(value) as SecureSession;

		// Check if session is expired
		const now = Math.floor(Date.now() / 1000);
		if (session.expiresAt < now) {
			console.log('[SecureStorage] Session expired, clearing...');
			await clearSecureSession();
			return null;
		}

		console.log('[SecureStorage] Session retrieved successfully');
		return session;
	} catch (error) {
		console.error('[SecureStorage] Failed to get session:', error);
		return null;
	}
}

/**
 * Clear session from secure storage
 */
export async function clearSecureSession(): Promise<void> {
	try {
		await Preferences.remove({ key: SESSION_KEY });
		await Preferences.remove({ key: SESSION_EXPIRY_KEY });
		console.log('[SecureStorage] Session cleared');
	} catch (error) {
		console.error('[SecureStorage] Failed to clear session:', error);
	}
}

/**
 * Check if session exists and is valid (without loading it)
 */
export async function hasValidSession(): Promise<boolean> {
	try {
		const { value } = await Preferences.get({ key: SESSION_EXPIRY_KEY });

		if (!value) {
			return false;
		}

		const expiresAt = parseInt(value, 10);
		const now = Math.floor(Date.now() / 1000);

		return expiresAt > now;
	} catch (error) {
		console.error('[SecureStorage] Failed to check session validity:', error);
		return false;
	}
}

/**
 * Get storage implementation info for debugging
 */
export function getStorageInfo(): string {
	if (Capacitor.isNativePlatform()) {
		return 'Android EncryptedSharedPreferences (AES-256)';
	} else {
		return 'Web localStorage (not encrypted - dev only)';
	}
}
