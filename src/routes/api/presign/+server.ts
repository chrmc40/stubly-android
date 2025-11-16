import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPresignedUrl } from '$lib/config/storage';

/**
 * Presign API Endpoint
 * Generates presigned URLs for private file access (FILES bucket only)
 *
 * Request body:
 * {
 *   fileIds: string[], // Array of file IDs (UUIDs)
 *   expiresIn?: number  // Optional expiration time in seconds (default: 3600 = 1 hour)
 * }
 *
 * Response:
 * {
 *   urls: {
 *     [fileId]: string  // Presigned URL for each file
 *   }
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		console.log('[Presign API] Request received');

		// Check authentication
		const authHeader = request.headers.get('Authorization');
		let session = null;
		let supabase = locals.supabase;

		if (authHeader?.startsWith('Bearer ')) {
			const token = authHeader.substring(7);
			console.log('[Presign API] Using Authorization header token');

			const { createClient } = await import('@supabase/supabase-js');
			const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = await import('$env/static/public');

			supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			});

			const { data: { user }, error: userError } = await supabase.auth.getUser(token);

			if (userError || !user) {
				console.error('[Presign API] Invalid token:', userError);
				return json({ error: 'Unauthorized' }, { status: 401 });
			}

			session = { user };
			console.log('[Presign API] Token validated for user:', user.id);
		} else {
			session = await locals.getSession();
		}

		const userId = session?.user?.id;

		if (!userId) {
			console.log('[Presign API] No authenticated user');
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Parse request body
		const body = await request.json();
		const { fileIds, expiresIn = 3600 } = body;

		if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
			console.log('[Presign API] Invalid fileIds');
			return json({ error: 'fileIds array required' }, { status: 400 });
		}

		if (fileIds.length > 10) {
			console.log('[Presign API] Too many fileIds requested:', fileIds.length);
			return json({ error: 'Maximum 10 files per request' }, { status: 400 });
		}

		console.log('[Presign API] Generating URLs for', fileIds.length, 'files');

		// Check user has access to all requested files via FILES table
		const { data: files, error: filesError } = await supabase
			.from('files')
			.select('file_id, file_extension, user_id')
			.eq('user_id', userId)
			.in('file_id', fileIds);

		if (filesError) {
			console.error('[Presign API] Error checking file ownership:', filesError);
			return json({ error: 'Database error' }, { status: 500 });
		}

		if (!files || files.length !== fileIds.length) {
			console.log('[Presign API] User does not have access to all requested files');
			return json({ error: 'Access denied to one or more files' }, { status: 403 });
		}

		// Generate presigned URLs
		const urls: Record<string, string> = {};

		for (const file of files) {
			const fileId = file.file_id;
			const extension = file.file_extension || 'bin';

			try {
				// B2 path: stubly-files/USER_ID/FILE_ID.extension
				const url = await getPresignedUrl(fileId, extension, expiresIn);
				urls[fileId] = url;
			} catch (error) {
				console.error('[Presign API] Failed to generate URL for', fileId, error);
				return json({
					error: 'Failed to generate presigned URL',
					fileId
				}, { status: 500 });
			}
		}

		console.log('[Presign API] ✅ Generated', Object.keys(urls).length, 'presigned URLs');

		return json({ urls });

	} catch (error) {
		console.error('[Presign API] Unexpected error:', error);
		return json({
			error: 'Internal server error',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
};
