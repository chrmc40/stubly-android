import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
	BACKBLAZE_KEY_ID,
	BACKBLAZE_APPLICATION_KEY,
	BACKBLAZE_BUCKET_FILES,
	BACKBLAZE_BUCKET_THUMBS,
	BACKBLAZE_BUCKET_PREVIEWS,
	BACKBLAZE_BUCKET_SPRITES,
	BACKBLAZE_REGION,
	BACKBLAZE_ENDPOINT
} from '$env/static/private';

/**
 * Backblaze B2 S3-compatible storage client
 */
export const storageClient = new S3Client({
	credentials: {
		accessKeyId: BACKBLAZE_KEY_ID,
		secretAccessKey: BACKBLAZE_APPLICATION_KEY
	},
	region: BACKBLAZE_REGION,
	endpoint: BACKBLAZE_ENDPOINT
});

/**
 * Bucket configuration
 */
export const BUCKETS = {
	FILES: BACKBLAZE_BUCKET_FILES,
	THUMBS: BACKBLAZE_BUCKET_THUMBS,
	PREVIEWS: BACKBLAZE_BUCKET_PREVIEWS,
	SPRITES: BACKBLAZE_BUCKET_SPRITES
} as const;

export type BucketType = keyof typeof BUCKETS;

/**
 * Upload a file to specified Backblaze B2 bucket
 * @param bucket - Bucket type (FILES, THUMBS, PREVIEWS, SPRITES)
 * @param key - Object key (e.g., "abc123.jpg")
 * @param buffer - File data as ArrayBuffer or Buffer
 * @param contentType - MIME type of the file
 */
export async function uploadToStorage(
	bucket: BucketType,
	key: string,
	buffer: ArrayBuffer | Buffer,
	contentType: string
): Promise<void> {
	const bucketName = BUCKETS[bucket];
	console.log(`[Storage] Uploading ${key} to bucket ${bucketName}...`);

	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: key,
		Body: buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer,
		ContentType: contentType,
		Metadata: {
			uploadedAt: new Date().toISOString()
		}
	});

	try {
		await storageClient.send(command);
		console.log(`[Storage] ✅ Successfully uploaded ${key} to ${bucketName}`);
	} catch (error) {
		console.error(`[Storage] ❌ Failed to upload ${key} to ${bucketName}:`, error);
		throw error;
	}
}

/**
 * Generate presigned URL for private file access
 * @param userId - User ID (for per-user B2 folder path)
 * @param metaId - SHA-256 content hash
 * @param extension - File extension (e.g., "jpg", "mp4")
 * @param expiresIn - URL validity in seconds (default: 1 hour)
 * @returns Presigned URL valid for specified duration
 */
export async function getPresignedUrl(
	userId: string,
	metaId: string,
	extension: string,
	expiresIn: number = 3600
): Promise<string> {
	// B2 path format: stubly-files/USER_ID/META_ID.extension
	const key = `${userId}/${metaId}.${extension}`;

	console.log(`[Storage] Generating presigned URL for ${key} (expires in ${expiresIn}s)`);

	const command = new GetObjectCommand({
		Bucket: BUCKETS.FILES,
		Key: key
	});

	try {
		const url = await getSignedUrl(storageClient, command, { expiresIn });
		console.log(`[Storage] ✅ Generated presigned URL for ${key}`);
		return url;
	} catch (error) {
		console.error(`[Storage] ❌ Failed to generate presigned URL for ${key}:`, error);
		throw error;
	}
}

/**
 * Get public URL for thumbnails, previews, or sprites
 * Uses Backblaze B2 native URL format (cheaper egress than S3)
 * @param bucket - Bucket type (THUMBS, PREVIEWS, or SPRITES)
 * @param fileId - SHA-256 hash of the file
 * @param extension - File extension
 * @returns Public URL
 */
export function getPublicUrl(bucket: Exclude<BucketType, 'FILES'>, fileId: string, extension: string): string {
	const bucketName = BUCKETS[bucket];
	const key = `${fileId}.${extension}`;

	// B2 native URL format: https://f004.backblazeb2.com/file/bucket-name/filename
	return `https://f004.backblazeb2.com/file/${bucketName}/${key}`;
}

/**
 * Get public URL from a storage path (for thumbnails, previews, sprites)
 * The path can be either a simple filename or a user-scoped path
 * @param bucket - Bucket type (THUMBS, PREVIEWS, or SPRITES)
 * @param path - Storage path from LOCATIONS table (e.g., "abc123_thumb.webp" or "user_id/abc123_thumb.webp")
 * @returns Public URL
 */
export function getPublicUrlFromPath(bucket: Exclude<BucketType, 'FILES'>, path: string): string {
	const bucketName = BUCKETS[bucket];

	// B2 native URL format: https://f004.backblazeb2.com/file/bucket-name/path
	return `https://f004.backblazeb2.com/file/${bucketName}/${path}`;
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
	const isConfigured = !!(
		BACKBLAZE_KEY_ID &&
		BACKBLAZE_APPLICATION_KEY &&
		BACKBLAZE_BUCKET_FILES &&
		BACKBLAZE_BUCKET_THUMBS &&
		BACKBLAZE_BUCKET_PREVIEWS &&
		BACKBLAZE_BUCKET_SPRITES &&
		BACKBLAZE_REGION &&
		BACKBLAZE_ENDPOINT
	);

	console.log('[Storage] Configuration check:', {
		hasKeyId: !!BACKBLAZE_KEY_ID,
		hasAppKey: !!BACKBLAZE_APPLICATION_KEY,
		bucketFiles: BACKBLAZE_BUCKET_FILES || 'NOT SET',
		bucketThumbs: BACKBLAZE_BUCKET_THUMBS || 'NOT SET',
		bucketPreviews: BACKBLAZE_BUCKET_PREVIEWS || 'NOT SET',
		bucketSprites: BACKBLAZE_BUCKET_SPRITES || 'NOT SET',
		region: BACKBLAZE_REGION || 'NOT SET',
		endpoint: BACKBLAZE_ENDPOINT || 'NOT SET',
		isConfigured
	});

	return isConfigured;
}
