import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToStorage, isStorageConfigured } from '$lib/config/storage';

/**
 * Upload API Endpoint
 * Handles file uploads with SHA-256 hashing, metadata tracking, and Backblaze B2 storage
 *
 * Architecture:
 * - B2 Storage: stubly-files/USER_ID/FILE_ID.extension (per-user, per-file isolation)
 * - META table: Global metadata by SHA-256 hash for derivative tracking
 * - FILES table: UUID-based file_id, mount_id, and virtual file_path
 * - Derivatives (thumbs/previews/sprites): Globally deduplicated by meta_id
 *
 * Flow:
 * 1. Compute SHA-256 hash (meta_id) of file content
 * 2. Check/create META record (global metadata)
 * 3. Upload to B2: stubly-files/USER_ID/FILE_ID.ext (UUID-based path)
 * 4. Get/create user's Backblaze mount
 * 5. Create FILES record with UUID file_id and virtual file_path for UI display
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		console.log('[Upload API] Upload request received');

		// Try to get session from Authorization header first (for client-side uploads)
		const authHeader = request.headers.get('Authorization');
		let session = null;
		let supabase = locals.supabase;

		if (authHeader?.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			console.log('[Upload API] Using Authorization header token');

			// Create a Supabase client with the bearer token for RLS to work
			const { createClient } = await import('@supabase/supabase-js');
			const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = await import('$env/static/public');

			supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			});

			// Verify token is valid
			const { data: { user }, error: userError } = await supabase.auth.getUser(token);

			if (userError || !user) {
				console.error('[Upload API] Invalid token:', userError);
				return json({ error: 'Unauthorized' }, { status: 401 });
			}

			session = { user };
			console.log('[Upload API] Token validated for user:', user.id);
		} else {
			// Fall back to cookie-based session
			session = await locals.getSession();
			console.log('[Upload API] Cookie session data:', {
				hasSession: !!session,
				userId: session?.user?.id,
				email: session?.user?.email
			});
		}

		const userId = session?.user?.id;

		if (!userId) {
			console.log('[Upload API] No authenticated user');
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('[Upload API] User authenticated:', userId);

		// Parse form data
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const pathString = formData.get('path') as string;

		if (!file) {
			console.log('[Upload API] No file provided');
			return json({ error: 'No file provided' }, { status: 400 });
		}

		const path: string[] = pathString ? JSON.parse(pathString) : [];
		console.log('[Upload API] File:', file.name, 'Size:', file.size, 'Path:', path);

		// Check storage quota
		const { data: hasStorageQuota, error: storageQuotaError } = await supabase.rpc('check_storage_quota', {
			user_id: userId
		});

		if (storageQuotaError) {
			console.error('[Upload API] Error checking storage quota:', storageQuotaError);
			return json({ error: 'Failed to check storage quota' }, { status: 500 });
		}

		if (!hasStorageQuota) {
			console.log('[Upload API] User has exceeded storage quota');
			return json({ error: 'Storage quota exceeded' }, { status: 403 });
		}

		// Check file count quota
		const { data: hasFileQuota, error: fileQuotaError } = await supabase.rpc('check_file_quota', {
			user_id: userId
		});

		if (fileQuotaError) {
			console.error('[Upload API] Error checking file quota:', fileQuotaError);
			return json({ error: 'Failed to check file quota' }, { status: 500 });
		}

		if (!hasFileQuota) {
			console.log('[Upload API] User has exceeded file count quota');
			return json({ error: 'File count quota exceeded' }, { status: 403 });
		}

		// Read file as ArrayBuffer
		const fileBuffer = await file.arrayBuffer();

		// Compute SHA-256 hash
		const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

		console.log('[Upload API] Content hash:', contentHash);

		// Extract file metadata
		const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
		const mimeType = file.type || 'application/octet-stream';
		const fileType = getFileType(mimeType);
		const metaId = contentHash;

		console.log('[Upload API] File type:', fileType, 'MIME:', mimeType);

		// Check if META record exists (global metadata)
		const { data: existingMeta, error: metaCheckError } = await supabase
			.from('meta')
			.select('meta_id, type, mime_type, format')
			.eq('meta_id', metaId)
			.maybeSingle();

		if (metaCheckError) {
			console.error('[Upload API] Error checking META table:', metaCheckError);
			return json({ error: 'Database error' }, { status: 500 });
		}

		let b2Uploaded = false;

		// Create META record if it doesn't exist (global metadata for deduplication)
		if (!existingMeta && fileType !== 'url') {
			console.log('[Upload API] New content - creating META record...');

			const now = new Date().toISOString();
			const { error: metaError } = await supabase
				.from('meta')
				.insert({
					meta_id: metaId,
					phash: null, // TODO: Generate perceptual hash for images/videos
					phash_algorithm: null,
					type: fileType,
					mime_type: mimeType,
					format: fileExtension,
					width: null, // TODO: Extract from image/video metadata
					height: null,
					duration: null,
					video_codec: null,
					video_bitrate: null,
					video_framerate: null,
					video_color_space: null,
					video_bit_depth: null,
					audio_codec: null,
					audio_bitrate: null,
					audio_sample_rate: null,
					audio_channels: null,
					b2_thumb_exists: false,
					b2_thumb_width: null,
					b2_thumb_height: null,
					b2_preview_exists: false,
					b2_sprite_exists: false,
					b2_sprite_json_exists: false,
					create_date: now,
					modified_date: now
				});

			if (metaError) {
				console.error('[Upload API] Error creating META record:', metaError);
				return json({ error: 'Failed to create metadata record' }, { status: 500 });
			}

			console.log('[Upload API] Created META record:', metaId);
		} else if (existingMeta) {
			console.log('[Upload API] META record exists (content hash matches existing file):', metaId);
		}

		// NOTE: We will upload to B2 AFTER creating the FILES record to get the UUID file_id
		// This ensures B2 path uses file_id instead of meta_id

		// Get or create user's Backblaze B2 mount
		const { data: storageMount, error: mountError } = await supabase
			.from('mounts')
			.select('mount_id')
			.eq('user_id', userId)
			.eq('platform', 'Backblaze')
			.eq('storage_type', 'cloud')
			.maybeSingle();

		if (mountError) {
			console.error('[Upload API] Error checking for storage mount:', mountError);
			return json({ error: 'Database error' }, { status: 500 });
		}

		let mountId: number;

		if (storageMount) {
			mountId = storageMount.mount_id;
			console.log('[Upload API] Using existing storage mount:', mountId);
		} else {
			// Create Backblaze B2 mount for user (this should already be done by mount setup, but fallback just in case)
			const now = new Date().toISOString();
			const { data: newMount, error: createMountError } = await supabase
				.from('mounts')
				.insert({
					user_id: userId,
					platform: 'Backblaze',
					mount_label: 'Cloud Storage',
					device_id: null,
					device_path: `b2://stubly-files/${userId}/`,
					storage_type: 'cloud',
					encryption_enabled: false,
					encryption_type: null,
					encryption_key_hash: null,
					create_date: now,
					is_active: true
				})
				.select('mount_id')
				.single();

			if (createMountError || !newMount) {
				console.error('[Upload API] Error creating storage mount:', createMountError);
				return json({ error: 'Failed to create mount' }, { status: 500 });
			}

			mountId = newMount.mount_id;
			console.log('[Upload API] Created new storage mount:', mountId);
		}

		// Build virtual file path for UI display (e.g., "vacation/beach.mp4")
		const virtualPath = path.length > 0 ? `${path.join('/')}/${file.name}` : file.name;

		// Check if FILES record already exists for this user+mount+path
		const { data: existingFile } = await supabase
			.from('files')
			.select('file_id')
			.eq('user_id', userId)
			.eq('mount_id', mountId)
			.eq('file_path', virtualPath)
			.maybeSingle();

		let newFileId: string;

		if (existingFile) {
			// File already exists at this path - update meta_id and size
			console.log('[Upload API] Updating existing FILES record:', existingFile.file_id);

			const { error: updateError } = await supabase
				.from('files')
				.update({
					meta_id: fileType !== 'url' ? metaId : null,
					type: fileType,
					local_size: file.size,
					file_extension: fileExtension,
					modified_date: new Date().toISOString()
				})
				.eq('file_id', existingFile.file_id);

			if (updateError) {
				console.error('[Upload API] Error updating FILES record:', updateError);
				return json({ error: 'Failed to update file record' }, { status: 500 });
			}

			newFileId = existingFile.file_id;
		} else {
			// Create new FILES record
			const now = new Date().toISOString();
			const { data: insertedFile, error: filesError } = await supabase
				.from('files')
				.insert({
					user_id: userId,
					meta_id: fileType !== 'url' ? metaId : null,
					mount_id: mountId,
					file_path: virtualPath,
					file_extension: fileExtension,
					type: fileType,
					local_size: file.size,
					user_description: null,
					has_thumb: false,
					thumb_path: null,
					thumb_width: null,
					thumb_height: null,
					has_preview: false,
					preview_path: null,
					has_sprite: false,
					sprite_path: null,
					sprite_json_path: null,
					b2_synced: false,
					b2_sync_date: null,
					sync_date: now,
					local_modified: null, // Cloud storage doesn't have local timestamps
					user_edited_date: null
				})
				.select('file_id')
				.single();

			if (filesError || !insertedFile) {
				console.error('[Upload API] Error creating FILES record:', filesError);
				return json({ error: 'Failed to create file record' }, { status: 500 });
			}

			newFileId = insertedFile.file_id;
			console.log('[Upload API] Created FILES record:', newFileId);

			// Only increment storage usage for NEW files
			const { error: updateStorageError } = await supabase.rpc('increment_storage_usage', {
				p_user_id: userId,
				p_bytes: file.size
			});

			if (updateStorageError) {
				console.warn('[Upload API] Failed to update storage usage:', updateStorageError);
				// Don't fail the upload for this
			}
		}

		// Upload to B2 using the UUID file_id
		if (fileType !== 'url') {
			if (!isStorageConfigured()) {
				console.error('[Upload API] Storage is not configured!');
				return json({ error: 'Storage backend not configured' }, { status: 500 });
			}

			// Upload to B2 with UUID-based path: stubly-files/USER_ID/FILE_ID.ext
			const storageKey = `${userId}/${newFileId}.${fileExtension}`;

			try {
				await uploadToStorage('FILES', storageKey, fileBuffer, mimeType);
				b2Uploaded = true;
				console.log('[Upload API] ✅ File uploaded to B2:', storageKey);

				// Mark as synced to B2
				const { error: syncError } = await supabase
					.from('files')
					.update({
						b2_synced: true,
						b2_sync_date: new Date().toISOString()
					})
					.eq('file_id', newFileId);

				if (syncError) {
					console.warn('[Upload API] Failed to update B2 sync status:', syncError);
				}
			} catch (storageError) {
				console.error('[Upload API] Failed to upload to B2:', storageError);
				// Log full error details for debugging
				if (storageError instanceof Error) {
					console.error('[Upload API] B2 error details:', {
						message: storageError.message,
						stack: storageError.stack,
						name: storageError.name
					});
				}
				return json({
					error: 'Failed to upload file to storage',
					details: storageError instanceof Error ? storageError.message : String(storageError)
				}, { status: 500 });
			}
		} else {
			console.log('[Upload API] URL file - no B2 upload needed');
		}

		console.log('[Upload API] ✅ Upload complete - file_id:', newFileId);

		return json({
			success: true,
			file_id: newFileId,
			meta_id: metaId,
			b2_uploaded: b2Uploaded,
			size: file.size,
			mime_type: mimeType,
			type: fileType,
			virtual_path: virtualPath
		});

	} catch (error) {
		console.error('[Upload API] Unexpected error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Upload failed' },
			{ status: 500 }
		);
	}
};

/**
 * Determine file type from MIME type
 */
function getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'url' {
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType.startsWith('audio/')) return 'audio';
	return 'url'; // Default fallback
}
