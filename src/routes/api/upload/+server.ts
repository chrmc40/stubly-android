import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToStorage, isStorageConfigured } from '$lib/config/storage';

/**
 * Upload API Endpoint
 * Handles file uploads with SHA-256 hashing, deduplication, and Backblaze B2 storage
 *
 * Cloud-only mode:
 * 1. Compute SHA-256 hash of file content
 * 2. Check if file already exists (deduplication)
 * 3. Upload to Backblaze B2 if new file
 * 4. Create FILES record (or reuse existing)
 * 5. Create LOCATIONS record for this user
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

		// file_id is the content hash
		const fileId = contentHash;

		// Check if file already exists globally (deduplication)
		const { data: existingFile, error: checkError } = await supabase
			.from('files')
			.select('file_id, hash, type, mime_type, local_size, format')
			.eq('file_id', fileId)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			// PGRST116 = no rows returned (file doesn't exist)
			console.error('[Upload API] Error checking for existing file:', checkError);
			return json({ error: 'Database error' }, { status: 500 });
		}

		let storageUploaded = false;

		if (existingFile) {
			console.log('[Upload API] File already exists in system (deduplication):', existingFile.file_id);
		} else {
			// File doesn't exist - need to upload to storage and create FILES record
			console.log('[Upload API] New file - uploading to storage...');

			// Upload to Backblaze B2 storage
			if (!isStorageConfigured()) {
				console.error('[Upload API] Storage is not configured!');
				return json({ error: 'Storage backend not configured' }, { status: 500 });
			}

			const storageKey = `${contentHash}.${fileExtension}`;

			try {
				await uploadToStorage('FILES', storageKey, fileBuffer, mimeType);
				storageUploaded = true;
				console.log('[Upload API] ✅ File uploaded to storage:', storageKey);
			} catch (storageError) {
				console.error('[Upload API] Failed to upload to storage:', storageError);
				// Log full error details for debugging
				if (storageError instanceof Error) {
					console.error('[Upload API] Storage error details:', {
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

			// Create FILES record
			const now = new Date().toISOString();
			const { error: filesError } = await supabase
				.from('files')
				.insert({
					file_id: fileId,
					user_id: userId,
					hash: contentHash,
					phash: null, // TODO: Generate perceptual hash for images/videos
					phash_algorithm: null,
					type: fileType,
					mime_type: mimeType,
					local_size: file.size,
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
					user_description: null,
					create_date: now,
					modified_date: now,
					user_edited_date: null
				});

			if (filesError) {
				console.error('[Upload API] Error creating FILES record:', filesError);
				return json({ error: 'Failed to create file record' }, { status: 500 });
			}

			console.log('[Upload API] Created FILES record:', fileId);
		}

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
			// Create Backblaze B2 mount for user
			const now = new Date().toISOString();
			const { data: newMount, error: createMountError } = await supabase
				.from('mounts')
				.insert({
					user_id: userId,
					platform: 'Backblaze',
					mount_label: 'Cloud Storage',
					device_id: null,
					device_path: 'b2://stubly-files/',
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

		// Check if LOCATIONS record already exists for this user+file+mount
		const { data: existingLocation } = await supabase
			.from('locations')
			.select('location_id')
			.eq('user_id', userId)
			.eq('file_id', fileId)
			.eq('mount_id', mountId)
			.maybeSingle();

		// Create or update LOCATIONS record
		const filePath = path.length > 0 ? `/${path.join('/')}/${file.name}` : `/${file.name}`;

		const { error: locationError } = await supabase
			.from('locations')
			.upsert({
				user_id: userId,
				file_id: fileId,
				mount_id: mountId,
				file_path: filePath,
				has_thumb: false, // TODO: Generate thumbnails
				thumb_width: null,
				thumb_height: null,
				has_preview: false,
				has_sprite: false,
				sync_date: new Date().toISOString(),
				local_modified: null // Cloud storage doesn't have local timestamps
			}, {
				onConflict: 'user_id,file_id,mount_id'
			});

		if (locationError) {
			console.error('[Upload API] Error creating LOCATIONS record:', locationError);
			return json({ error: 'Failed to create location record' }, { status: 500 });
		}

		if (existingLocation) {
			console.log('[Upload API] Updated existing LOCATIONS record for user:', userId);
		} else {
			console.log('[Upload API] Created new LOCATIONS record for user:', userId);
		}

		// Only increment storage usage if this is a NEW location record
		// Re-uploading the same file to the same mount should not increase quota
		if (!existingLocation) {
			const { error: updateStorageError } = await supabase.rpc('increment_storage_usage', {
				p_user_id: userId,
				p_bytes: file.size
			});

			if (updateStorageError) {
				console.warn('[Upload API] Failed to update storage usage:', updateStorageError);
				// Don't fail the upload for this
			}
		}

		console.log('[Upload API] ✅ Upload complete:', fileId);

		return json({
			success: true,
			file_id: fileId,
			hash: contentHash,
			deduplicated: !storageUploaded,
			size: file.size,
			mime_type: mimeType,
			type: fileType
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
