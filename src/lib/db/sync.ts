/**
 * Database Sync Module
 *
 * Syncs data from Supabase (cloud) to local SQLite database.
 * For MVP: Simple full sync. Later: incremental delta sync.
 */

import { supabase } from '$lib/config/supabase';
import { getDB } from './local';

/**
 * Sync all user data from Supabase to local database
 * MVP Version: Full sync (replace all local data)
 */
export async function syncFromSupabase(userId: string): Promise<void> {
	console.log('[Sync] Starting full sync for user:', userId);

	try {
		const db = await getDB();

		// Sync mounts
		await syncMounts(userId, db);

		// Sync files
		await syncFiles(userId, db);

		// Sync locations
		await syncLocations(userId, db);

		// Sync tags
		await syncTags(userId, db);

		// Sync file_tags
		await syncFileTags(userId, db);

		// Sync source
		await syncSource(userId, db);

		// Sync posts
		await syncPosts(userId, db);

		// Update sync timestamp
		await updateSyncTimestamp('full_sync', db);

		console.log('[Sync] Full sync completed successfully');
	} catch (error) {
		console.error('[Sync] Sync failed:', error);
		throw error;
	}
}

/**
 * Sync mounts table
 */
async function syncMounts(userId: string, db: any): Promise<void> {
	console.log('[Sync] Syncing mounts...');

	const { data, error } = await supabase
		.from('mounts')
		.select('*')
		.eq('user_id', userId);

	if (error) throw error;

	if (!data || data.length === 0) {
		console.log('[Sync] No mounts found in Supabase');
		return;
	}

	// Clear existing mounts for this user
	await db.run('DELETE FROM mounts WHERE user_id = ?', [userId]);

	// Insert new data
	for (const mount of data) {
		await db.run(
			`INSERT INTO mounts (
				mount_id, user_id, platform, mount_label, device_id, device_path,
				storage_type, encryption_enabled, encryption_type, encryption_key_hash,
				create_date, is_active
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				mount.mount_id,
				mount.user_id,
				mount.platform,
				mount.mount_label,
				mount.device_id,
				mount.device_path,
				mount.storage_type,
				mount.encryption_enabled ? 1 : 0,
				mount.encryption_type,
				mount.encryption_key_hash,
				mount.create_date,
				mount.is_active ? 1 : 0
			]
		);
	}

	console.log(`[Sync] Synced ${data.length} mounts`);
}

/**
 * Sync files table
 */
async function syncFiles(userId: string, db: any): Promise<void> {
	console.log('[Sync] Syncing files...');

	const { data, error } = await supabase
		.from('files')
		.select('*')
		.eq('user_id', userId);

	if (error) throw error;

	if (!data || data.length === 0) {
		console.log('[Sync] No files found in Supabase');
		return;
	}

	// Clear existing files for this user
	await db.run('DELETE FROM files WHERE user_id = ?', [userId]);

	// Insert new data
	for (const file of data) {
		await db.run(
			`INSERT INTO files (
				user_id, file_id, hash, phash, phash_algorithm, type, mime_type,
				local_size, format, width, height, duration,
				video_codec, video_bitrate, video_framerate, video_color_space, video_bit_depth,
				audio_codec, audio_bitrate, audio_sample_rate, audio_channels,
				user_description, create_date, modified_date, user_edited_date
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				file.user_id, file.file_id, file.hash, file.phash, file.phash_algorithm,
				file.type, file.mime_type, file.local_size, file.format,
				file.width, file.height, file.duration,
				file.video_codec, file.video_bitrate, file.video_framerate,
				file.video_color_space, file.video_bit_depth,
				file.audio_codec, file.audio_bitrate, file.audio_sample_rate, file.audio_channels,
				file.user_description, file.create_date, file.modified_date, file.user_edited_date
			]
		);
	}

	console.log(`[Sync] Synced ${data.length} files`);
}

/**
 * Sync locations table
 */
async function syncLocations(userId: string, db: any): Promise<void> {
	console.log('[Sync] Syncing locations...');

	const { data, error } = await supabase
		.from('locations')
		.select('*')
		.eq('user_id', userId);

	if (error) throw error;

	if (!data || data.length === 0) {
		console.log('[Sync] No locations found');
		return;
	}

	// Clear existing
	await db.run('DELETE FROM locations WHERE user_id = ?', [userId]);

	// Insert
	for (const loc of data) {
		await db.run(
			`INSERT INTO locations (
				location_id, user_id, file_id, mount_id, file_path,
				has_thumb, thumb_width, thumb_height, has_preview, has_sprite,
				sync_date, local_modified
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				loc.location_id, loc.user_id, loc.file_id, loc.mount_id, loc.file_path,
				loc.has_thumb ? 1 : 0, loc.thumb_width, loc.thumb_height,
				loc.has_preview ? 1 : 0, loc.has_sprite ? 1 : 0,
				loc.sync_date, loc.local_modified
			]
		);
	}

	console.log(`[Sync] Synced ${data.length} locations`);
}

/**
 * Sync tags table
 */
async function syncTags(userId: string, db: any): Promise<void> {
	console.log('[Sync] Syncing tags...');

	const { data, error } = await supabase
		.from('tags')
		.select('*')
		.eq('user_id', userId);

	if (error) throw error;

	if (!data || data.length === 0) {
		console.log('[Sync] No tags found');
		return;
	}

	await db.run('DELETE FROM tags WHERE user_id = ?', [userId]);

	for (const tag of data) {
		await db.run(
			`INSERT INTO tags (
				tag_id, user_id, namespace, tag_name, remote_tag_id, usage_count,
				create_date, modified_date
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				tag.tag_id, tag.user_id, tag.namespace, tag.tag_name,
				tag.remote_tag_id, tag.usage_count, tag.create_date, tag.modified_date
			]
		);
	}

	console.log(`[Sync] Synced ${data.length} tags`);
}

/**
 * Sync file_tags table
 */
async function syncFileTags(userId: string, db: any): Promise<void> {
	console.log('[Sync] Syncing file_tags...');

	const { data, error } = await supabase
		.from('file_tags')
		.select('*')
		.eq('user_id', userId);

	if (error) throw error;

	if (!data || data.length === 0) {
		console.log('[Sync] No file_tags found');
		return;
	}

	await db.run('DELETE FROM file_tags WHERE user_id = ?', [userId]);

	for (const ft of data) {
		await db.run(
			`INSERT INTO file_tags (user_id, file_id, tag_id, create_date, modified_date)
			 VALUES (?, ?, ?, ?, ?)`,
			[ft.user_id, ft.file_id, ft.tag_id, ft.create_date, ft.modified_date]
		);
	}

	console.log(`[Sync] Synced ${data.length} file_tags`);
}

/**
 * Sync source table
 */
async function syncSource(userId: string, db: any): Promise<void> {
	console.log('[Sync] Syncing source...');

	const { data, error } = await supabase
		.from('source')
		.select('*')
		.eq('user_id', userId);

	if (error) throw error;

	if (!data || data.length === 0) {
		console.log('[Sync] No source data found');
		return;
	}

	await db.run('DELETE FROM source WHERE user_id = ?', [userId]);

	for (const src of data) {
		await db.run(
			`INSERT INTO source (
				user_id, file_id, url, content_type, remote_size,
				is_file, url_source, iframe, embed, modified_date
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				src.user_id, src.file_id, src.url, src.content_type, src.remote_size,
				src.is_file ? 1 : 0, src.url_source, src.iframe ? 1 : 0,
				src.embed, src.modified_date
			]
		);
	}

	console.log(`[Sync] Synced ${data.length} source records`);
}

/**
 * Sync posts table
 */
async function syncPosts(userId: string, db: any): Promise<void> {
	console.log('[Sync] Syncing posts...');

	const { data, error } = await supabase
		.from('posts')
		.select('*')
		.eq('user_id', userId);

	if (error) throw error;

	if (!data || data.length === 0) {
		console.log('[Sync] No posts found');
		return;
	}

	await db.run('DELETE FROM posts WHERE user_id = ?', [userId]);

	for (const post of data) {
		await db.run(
			`INSERT INTO posts (
				post_id, user_id, file_id, url, domain, post_date,
				post_text, post_user, title, create_date, modified_date
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				post.post_id, post.user_id, post.file_id, post.url, post.domain,
				post.post_date, post.post_text, post.post_user, post.title,
				post.create_date, post.modified_date
			]
		);
	}

	console.log(`[Sync] Synced ${data.length} posts`);
}

/**
 * Update sync timestamp
 */
async function updateSyncTimestamp(tableName: string, db: any): Promise<void> {
	const timestamp = new Date().toISOString();
	await db.run(
		`INSERT OR REPLACE INTO sync_metadata (table_name, last_sync_timestamp)
		 VALUES (?, ?)`,
		[tableName, timestamp]
	);
}

/**
 * Check if sync is needed (has user data in Supabase?)
 */
export async function shouldSync(userId: string): Promise<boolean> {
	try {
		const { count } = await supabase
			.from('mounts')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', userId);

		return (count ?? 0) > 0;
	} catch (error) {
		console.error('[Sync] Error checking if sync needed:', error);
		return false;
	}
}
