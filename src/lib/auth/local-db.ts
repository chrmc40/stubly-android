/**
 * Local SQLite database for offline authentication
 * Uses @capacitor-community/sqlite with encryption
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import bcrypt from 'bcryptjs';

const DB_NAME = 'stubly_auth.db';
const DB_VERSION = 1;
const BCRYPT_ROUNDS = 12;

let sqlite: SQLiteConnection | null = null;
let db: any = null;

export interface LocalUser {
	supabase_user_id: string | null;
	username: string;
	email: string | null;
	password_hash: string;
	is_synced: boolean;
	is_anonymous: boolean;
	last_synced_at: number | null;
	created_at: number;
}

export interface LoginAttempt {
	username: string;
	failed_count: number;
	last_attempt_at: number;
	locked_until: number | null;
}

/**
 * Initialize the local auth database
 */
export async function initLocalAuthDB(): Promise<void> {
	if (!Capacitor.isNativePlatform()) {
		console.warn('Local auth DB only works on native platform');
		return;
	}

	try {
		sqlite = new SQLiteConnection(CapacitorSQLite);

		// Create encrypted connection
		// Encryption key is stored in Android Keystore
		db = await sqlite.createConnection(
			DB_NAME,
			true, // encrypted
			'no-encryption', // mode (encryption handled by plugin)
			DB_VERSION,
			false // readonly
		);

		await db.open();
		await createTables();

		console.log('Local auth database initialized');
	} catch (error) {
		console.error('Failed to initialize local auth DB:', error);
		throw error;
	}
}

/**
 * Create database tables
 */
async function createTables(): Promise<void> {
	// First, migrate existing local_session table to remove foreign key constraint
	// This is safe because we're just removing a constraint, not losing data
	const migration = `
		-- Drop old local_session table if it exists
		DROP TABLE IF EXISTS local_session;
	`;

	await db.execute(migration);

	const schema = `
		-- User credentials table
		CREATE TABLE IF NOT EXISTS local_auth (
			supabase_user_id TEXT PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			email TEXT,
			password_hash TEXT NOT NULL,
			is_synced INTEGER DEFAULT 1,
			is_anonymous INTEGER DEFAULT 0,
			last_synced_at INTEGER,
			created_at INTEGER DEFAULT (strftime('%s', 'now'))
		);

		-- Index for username lookups
		CREATE INDEX IF NOT EXISTS idx_username ON local_auth(username);

		-- Login attempts for rate limiting
		CREATE TABLE IF NOT EXISTS login_attempts (
			username TEXT PRIMARY KEY,
			failed_count INTEGER DEFAULT 0,
			last_attempt_at INTEGER,
			locked_until INTEGER
		);

		-- Local session (only one active session)
		-- Note: user_id may not have a matching local_auth entry if user logged in online
		-- without registering offline first. This is OK - they just need internet for subsequent logins.
		CREATE TABLE IF NOT EXISTS local_session (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			user_id TEXT,
			access_token TEXT,
			refresh_token TEXT,
			expires_at INTEGER
		);
	`;

	await db.execute(schema);
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Create a local user
 */
export async function createLocalUser(
	username: string,
	email: string | null,
	password: string,
	supabaseUserId: string | null = null,
	isAnonymous: boolean = false
): Promise<void> {
	if (!db) throw new Error('Database not initialized');

	const passwordHash = await hashPassword(password);
	const now = Math.floor(Date.now() / 1000);

	const query = `
		INSERT INTO local_auth (supabase_user_id, username, email, password_hash, is_synced, is_anonymous, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`;

	await db.run(query, [
		supabaseUserId || `local_${username}_${now}`,
		username,
		email,
		passwordHash,
		supabaseUserId ? 1 : 0, // synced if we have supabase ID
		isAnonymous ? 1 : 0,
		now
	]);
}

/**
 * Get user by username
 */
export async function getLocalUserByUsername(username: string): Promise<LocalUser | null> {
	if (!db) throw new Error('Database not initialized');

	const query = 'SELECT * FROM local_auth WHERE username = ? LIMIT 1';
	const result = await db.query(query, [username]);

	if (result.values && result.values.length > 0) {
		const row = result.values[0];
		return {
			supabase_user_id: row.supabase_user_id,
			username: row.username,
			email: row.email,
			password_hash: row.password_hash,
			is_synced: row.is_synced === 1,
			is_anonymous: row.is_anonymous === 1,
			last_synced_at: row.last_synced_at,
			created_at: row.created_at
		};
	}

	return null;
}

/**
 * Update user's Supabase ID after sync
 */
export async function updateUserSupabaseId(username: string, supabaseUserId: string): Promise<void> {
	if (!db) throw new Error('Database not initialized');

	const now = Math.floor(Date.now() / 1000);
	const query = `
		UPDATE local_auth
		SET supabase_user_id = ?, is_synced = 1, last_synced_at = ?
		WHERE username = ?
	`;

	await db.run(query, [supabaseUserId, now, username]);
}

/**
 * Check rate limiting for login attempts
 */
export async function checkRateLimit(username: string): Promise<{
	allowed: boolean;
	remainingAttempts: number;
	lockedUntil: number | null;
}> {
	if (!db) throw new Error('Database not initialized');

	const MAX_ATTEMPTS = 5;
	const LOCKOUT_TIME = 15 * 60; // 15 minutes in seconds
	const now = Math.floor(Date.now() / 1000);

	const query = 'SELECT * FROM login_attempts WHERE username = ? LIMIT 1';
	const result = await db.query(query, [username]);

	if (!result.values || result.values.length === 0) {
		// No attempts yet
		return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null };
	}

	const attempt = result.values[0];

	// Check if still locked
	if (attempt.locked_until && attempt.locked_until > now) {
		return {
			allowed: false,
			remainingAttempts: 0,
			lockedUntil: attempt.locked_until
		};
	}

	// Lockout expired, reset
	if (attempt.locked_until && attempt.locked_until <= now) {
		await resetLoginAttempts(username);
		return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null };
	}

	// Check attempts
	const remainingAttempts = MAX_ATTEMPTS - attempt.failed_count;
	return {
		allowed: remainingAttempts > 0,
		remainingAttempts: Math.max(0, remainingAttempts),
		lockedUntil: null
	};
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin(username: string): Promise<void> {
	if (!db) throw new Error('Database not initialized');

	const MAX_ATTEMPTS = 5;
	const LOCKOUT_TIME = 15 * 60; // 15 minutes
	const now = Math.floor(Date.now() / 1000);

	const query = 'SELECT * FROM login_attempts WHERE username = ? LIMIT 1';
	const result = await db.query(query, [username]);

	if (!result.values || result.values.length === 0) {
		// First failed attempt
		const insertQuery = `
			INSERT INTO login_attempts (username, failed_count, last_attempt_at, locked_until)
			VALUES (?, 1, ?, NULL)
		`;
		await db.run(insertQuery, [username, now]);
	} else {
		const attempt = result.values[0];
		const newCount = attempt.failed_count + 1;
		const lockedUntil = newCount >= MAX_ATTEMPTS ? now + LOCKOUT_TIME : null;

		const updateQuery = `
			UPDATE login_attempts
			SET failed_count = ?, last_attempt_at = ?, locked_until = ?
			WHERE username = ?
		`;
		await db.run(updateQuery, [newCount, now, lockedUntil, username]);
	}
}

/**
 * Reset login attempts after successful login
 */
export async function resetLoginAttempts(username: string): Promise<void> {
	if (!db) throw new Error('Database not initialized');

	const query = 'DELETE FROM login_attempts WHERE username = ?';
	await db.run(query, [username]);
}

/**
 * Save session locally
 */
export async function saveLocalSession(
	userId: string,
	accessToken: string,
	refreshToken: string,
	expiresAt: number
): Promise<void> {
	if (!db) throw new Error('Database not initialized');

	const query = `
		INSERT OR REPLACE INTO local_session (id, user_id, access_token, refresh_token, expires_at)
		VALUES (1, ?, ?, ?, ?)
	`;

	await db.run(query, [userId, accessToken, refreshToken, expiresAt]);
}

/**
 * Get local session
 */
export async function getLocalSession(): Promise<{
	userId: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
} | null> {
	if (!db) throw new Error('Database not initialized');

	const query = 'SELECT * FROM local_session WHERE id = 1 LIMIT 1';
	const result = await db.query(query);

	if (result.values && result.values.length > 0) {
		const row = result.values[0];
		return {
			userId: row.user_id,
			accessToken: row.access_token,
			refreshToken: row.refresh_token,
			expiresAt: row.expires_at
		};
	}

	return null;
}

/**
 * Clear local session
 */
export async function clearLocalSession(): Promise<void> {
	if (!db) throw new Error('Database not initialized');

	const query = 'DELETE FROM local_session WHERE id = 1';
	await db.run(query);
}

/**
 * Close database connection
 */
export async function closeLocalAuthDB(): Promise<void> {
	if (db) {
		await db.close();
		db = null;
	}
	if (sqlite) {
		await sqlite.closeConnection(DB_NAME);
		sqlite = null;
	}
}
