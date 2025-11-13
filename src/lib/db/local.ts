/**
 * Local SQLite Database
 *
 * Mirrors the Supabase schema for offline-first architecture.
 * All user operations query local DB, sync happens in background.
 */

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'stubly.db';
const DB_VERSION = 1;

let sqliteConnection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

/**
 * Initialize the local SQLite database
 */
export async function initLocalDB(): Promise<void> {
	if (!Capacitor.isNativePlatform()) {
		console.log('[LocalDB] Skipping init - not on native platform');
		return;
	}

	// If already initialized, just return
	if (db) {
		console.log('[LocalDB] Database already initialized');
		return;
	}

	try {
		console.log('[LocalDB] Initializing SQLite connection...');

		// Create connection if not exists
		if (!sqliteConnection) {
			sqliteConnection = new SQLiteConnection(CapacitorSQLite);
		}

		// Check if database exists
		const dbExists = await sqliteConnection.isDatabase(DB_NAME);

		if (!dbExists.result) {
			console.log('[LocalDB] Database does not exist, creating...');
			await createDatabase();
		} else {
			console.log('[LocalDB] Database exists, opening...');
			try {
				db = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
				await db.open();
			} catch (connError: any) {
				// If connection already exists, retrieve it
				if (connError.message && connError.message.includes('Connection') && connError.message.includes('already exists')) {
					console.log('[LocalDB] Connection already exists, retrieving...');
					db = await sqliteConnection.retrieveConnection(DB_NAME, false);
					// Check if it's open, if not open it
					const isDBOpen = await db.isDBOpen();
					if (!isDBOpen.result) {
						await db.open();
					}
				} else {
					throw connError;
				}
			}
		}

		console.log('[LocalDB] Database initialized successfully');
	} catch (error) {
		console.error('[LocalDB] Failed to initialize database:', error);
		throw error;
	}
}

/**
 * Create the database with schema
 */
async function createDatabase(): Promise<void> {
	if (!sqliteConnection) throw new Error('SQLite connection not initialized');

	// Create database connection
	db = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
	await db.open();

	// Create tables matching Supabase schema
	const schema = `
		-- Mounts table
		CREATE TABLE IF NOT EXISTS mounts (
			mount_id INTEGER PRIMARY KEY,
			user_id TEXT NOT NULL,
			platform TEXT NOT NULL CHECK (platform IN ('Android', 'Windows', 'Wasabi')),
			mount_label TEXT NOT NULL,
			device_id TEXT,
			device_path TEXT NOT NULL,
			storage_type TEXT NOT NULL CHECK (storage_type IN ('cloud', 'cloud_local', 'local')) DEFAULT 'cloud',
			encryption_enabled INTEGER DEFAULT 0,
			encryption_type TEXT CHECK (encryption_type IN ('aes256', 'chacha20')),
			encryption_key_hash TEXT,
			create_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			is_active INTEGER DEFAULT 1
		);

		CREATE INDEX IF NOT EXISTS idx_mounts_user_id ON mounts(user_id);
		CREATE INDEX IF NOT EXISTS idx_mounts_active ON mounts(user_id, is_active);

		-- Files table
		CREATE TABLE IF NOT EXISTS files (
			user_id TEXT NOT NULL,
			file_id TEXT NOT NULL,
			hash TEXT,
			phash TEXT,
			phash_algorithm TEXT CHECK (phash_algorithm IN ('dhash', 'phash', 'whash')),
			type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'url')),
			mime_type TEXT,
			local_size INTEGER,
			format TEXT,
			width INTEGER,
			height INTEGER,
			duration REAL,
			video_codec TEXT,
			video_bitrate INTEGER,
			video_framerate REAL,
			video_color_space TEXT,
			video_bit_depth INTEGER,
			audio_codec TEXT,
			audio_bitrate INTEGER,
			audio_sample_rate INTEGER,
			audio_channels INTEGER,
			user_description TEXT,
			create_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			modified_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			user_edited_date TEXT,
			PRIMARY KEY (user_id, file_id)
		);

		CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
		CREATE INDEX IF NOT EXISTS idx_files_type ON files(user_id, type);
		CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);

		-- Locations table
		CREATE TABLE IF NOT EXISTS locations (
			location_id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			file_id TEXT NOT NULL,
			mount_id INTEGER NOT NULL,
			file_path TEXT NOT NULL,
			has_thumb INTEGER DEFAULT 0,
			thumb_width INTEGER,
			thumb_height INTEGER,
			has_preview INTEGER DEFAULT 0,
			has_sprite INTEGER DEFAULT 0,
			sync_date TEXT,
			local_modified TEXT,
			UNIQUE (user_id, file_id, mount_id),
			FOREIGN KEY (mount_id) REFERENCES mounts(mount_id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_locations_file_id ON locations(file_id);
		CREATE INDEX IF NOT EXISTS idx_locations_mount_id ON locations(mount_id);

		-- Tags table
		CREATE TABLE IF NOT EXISTS tags (
			tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			namespace TEXT,
			tag_name TEXT NOT NULL,
			remote_tag_id INTEGER,
			usage_count INTEGER DEFAULT 0,
			create_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			modified_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (user_id, namespace, tag_name)
		);

		CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
		CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(user_id, namespace, tag_name);

		-- File Tags junction table
		CREATE TABLE IF NOT EXISTS file_tags (
			user_id TEXT NOT NULL,
			file_id TEXT NOT NULL,
			tag_id INTEGER NOT NULL,
			create_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			modified_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (user_id, file_id, tag_id),
			FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
		CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);

		-- Source table
		CREATE TABLE IF NOT EXISTS source (
			user_id TEXT NOT NULL,
			file_id TEXT NOT NULL,
			url TEXT NOT NULL,
			content_type TEXT,
			remote_size INTEGER,
			is_file INTEGER DEFAULT 1,
			url_source TEXT,
			iframe INTEGER DEFAULT 0,
			embed TEXT,
			modified_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (user_id, file_id, url)
		);

		CREATE INDEX IF NOT EXISTS idx_source_url ON source(url);

		-- Posts table
		CREATE TABLE IF NOT EXISTS posts (
			post_id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			file_id TEXT NOT NULL,
			url TEXT NOT NULL,
			domain TEXT,
			post_date TEXT,
			post_text TEXT,
			post_user TEXT,
			title TEXT,
			create_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			modified_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (user_id, file_id, url)
		);

		CREATE INDEX IF NOT EXISTS idx_posts_file_id ON posts(file_id);
		CREATE INDEX IF NOT EXISTS idx_posts_domain ON posts(user_id, domain);

		-- Sync metadata table (tracks last sync time)
		CREATE TABLE IF NOT EXISTS sync_metadata (
			table_name TEXT PRIMARY KEY,
			last_sync_timestamp TEXT NOT NULL
		);
	`;

	await db.execute(schema);
	console.log('[LocalDB] Database schema created successfully');
}

/**
 * Get the database connection
 */
export async function getDB(): Promise<SQLiteDBConnection> {
	if (!db) {
		throw new Error('Database not initialized. Call initLocalDB() first.');
	}
	return db;
}

/**
 * Close the database connection
 */
export async function closeDB(): Promise<void> {
	if (db) {
		await db.close();
		db = null;
	}
	if (sqliteConnection) {
		await sqliteConnection.closeConnection(DB_NAME, false);
	}
	console.log('[LocalDB] Database closed');
}

/**
 * Check if user has any active mounts
 */
export async function hasMountConfigured(): Promise<boolean> {
	try {
		const database = await getDB();
		const result = await database.query('SELECT mount_id FROM mounts WHERE is_active = 1 LIMIT 1');
		return (result.values?.length ?? 0) > 0;
	} catch (error) {
		console.error('[LocalDB] Error checking mounts:', error);
		return false;
	}
}

/**
 * Get all active mounts for current user
 */
export async function getActiveMounts(): Promise<any[]> {
	try {
		const database = await getDB();
		const result = await database.query('SELECT * FROM mounts WHERE is_active = 1 ORDER BY create_date ASC');
		return result.values ?? [];
	} catch (error) {
		console.error('[LocalDB] Error getting mounts:', error);
		return [];
	}
}
