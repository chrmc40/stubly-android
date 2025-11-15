/**
 * Database Types for Stubly
 * Matches schema in database.md and supabase-COMPLETE.sql
 */

export type FileType = 'image' | 'video' | 'audio' | 'url';
export type PhashAlgorithm = 'dhash' | 'phash' | 'whash' | null;
export type Platform = 'Android' | 'Windows' | 'Backblaze';
export type ShareType = 'mount' | 'folder';
export type LayoutMode = 'list' | 'grid' | 'justified';
export type SortOrder = 'a-z' | 'z-a' | 'newest' | 'oldest' | 'biggest' | 'smallest';
export type AccountStatus = 'active' | 'suspended' | 'banned';
export type StorageType = 'cloud' | 'cloud_local' | 'local';
export type EncryptionType = 'aes256' | 'chacha20';

// ============================================================================
// META TABLE (deduplicated file content metadata)
// ============================================================================

export interface MetaRecord {
	meta_hash: string; // PK - SHA-256 checksum
	phash: string | null;
	phash_algorithm: PhashAlgorithm;
	type: 'image' | 'video' | 'audio';
	mime_type: string | null;
	format: string | null;
	width: number | null;
	height: number | null;
	duration: number | null;
	video_codec: string | null;
	video_bitrate: number | null;
	video_framerate: number | null;
	video_color_space: string | null;
	video_bit_depth: number | null;
	audio_codec: string | null;
	audio_bitrate: number | null;
	audio_sample_rate: number | null;
	audio_channels: number | null;
	create_date: string; // timestamptz
	modified_date: string; // timestamptz
}

// ============================================================================
// FILES TABLE (actual file locations - one record per file on mount)
// ============================================================================

export interface FileRecord {
	file_id: number; // PK auto increment (bigserial)
	user_id: string; // UUID
	meta_hash: string | null; // FK to META (sha256 of file content or URL)
	mount_id: number; // FK to MOUNTS
	file_path: string; // relative path within mount
	type: FileType;
	local_size: number | null;
	user_description: string | null;
	has_thumb: boolean;
	thumb_path: string | null;
	thumb_width: number | null;
	thumb_height: number | null;
	has_preview: boolean;
	preview_path: string | null;
	has_sprite: boolean;
	sprite_path: string | null;
	sync_date: string | null; // timestamptz
	local_modified: string | null; // timestamptz
	create_date: string; // timestamptz
	modified_date: string; // timestamptz
	user_edited_date: string | null; // timestamptz
}

// ============================================================================
// SOURCE TABLE
// ============================================================================

export interface SourceRecord {
	user_id: string; // PK
	file_id: number; // PK - FK to FILES
	url: string; // PK
	content_type: string | null;
	remote_size: number | null;
	is_file: boolean;
	url_source: string | null;
	iframe: boolean;
	embed: string | null;
	modified_date: string; // timestamptz
}

// ============================================================================
// MOUNTS TABLE
// ============================================================================

export interface MountRecord {
	mount_id: number; // PK auto increment
	user_id: string; // UUID
	platform: Platform;
	mount_label: string;
	device_id: string | null;
	device_path: string;
	storage_type: StorageType;
	encryption_enabled: boolean;
	encryption_type: EncryptionType | null;
	encryption_key_hash: string | null;
	create_date: string; // timestamptz
	is_active: boolean;
}

// ============================================================================
// FOLDERS TABLE
// ============================================================================

export interface FolderRecord {
	folder_id: number; // PK auto increment
	user_id: string; // UUID
	mount_id: number; // FK to MOUNTS
	folder_path: string;
	parent_folder_id: number | null;
	item_count: number;
	last_modified: string | null; // timestamptz
	create_date: string; // timestamptz
}

// ============================================================================
// MOUNT_PAIRS TABLE
// ============================================================================

export interface MountPairRecord {
	pair_id: number; // PK auto increment
	mount_a_id: number; // FK to MOUNTS
	mount_b_id: number; // FK to MOUNTS
	create_date: string; // timestamptz
}

// ============================================================================
// TAGS TABLE
// ============================================================================

export interface TagRecord {
	tag_id: number; // PK auto increment
	user_id: string; // UUID
	namespace: string | null;
	tag_name: string;
	remote_tag_id: number | null;
	usage_count: number;
	create_date: string; // timestamptz
	modified_date: string; // timestamptz
}

// ============================================================================
// FILE_TAGS TABLE
// ============================================================================

export interface FileTagRecord {
	user_id: string; // PK - UUID
	file_id: number; // PK - FK to FILES
	tag_id: number; // PK - FK to TAGS
	create_date: string; // timestamptz
	modified_date: string; // timestamptz
}

// ============================================================================
// POSTS TABLE
// ============================================================================

export interface PostRecord {
	post_id: number; // PK auto increment
	user_id: string; // UUID
	file_id: number; // FK to FILES
	url: string;
	domain: string | null;
	post_date: string | null; // timestamptz
	post_text: string | null;
	post_user: string | null;
	title: string | null;
	create_date: string; // timestamptz
	modified_date: string; // timestamptz
}

// ============================================================================
// DELETIONS TABLE
// ============================================================================

export interface DeletionRecord {
	deletion_id: number; // PK auto increment
	user_id: string; // UUID
	file_id: number;
	deleted_date: string; // timestamptz
	synced_to_pairs: boolean;
}

// ============================================================================
// SHARED_LIBRARIES TABLE
// ============================================================================

export interface SharedLibraryRecord {
	share_id: number; // PK auto increment
	owner_user_id: string; // UUID
	guest_user_id: string; // UUID
	share_type: ShareType;
	mount_id: number | null; // FK to MOUNTS
	folder_path: string | null;
	permission_view: boolean;
	permission_download: boolean;
	permission_comment: boolean;
	share_label: string | null;
	created_date: string; // timestamptz
	revoked_date: string | null; // timestamptz
	last_accessed_date: string | null; // timestamptz
}

// ============================================================================
// PROFILES TABLE
// ============================================================================

export interface ProfileRecord {
	id: string; // PK - UUID from auth.users
	username: string;
	email: string;
	android_id: string | null;
	is_anonymous: boolean;
	tier_id: number; // FK to SUBSCRIPTION_TIERS
	google_play_token: string | null;
	google_play_order_id: string | null;
	subscription_start_date: string | null; // timestamptz
	subscription_end_date: string | null; // timestamptz
	storage_used_bytes: number;
	file_count_used: number;
	dmca_strike_count: number;
	dmca_strike_date: string | null; // timestamptz
	account_status: AccountStatus;
	create_date: string; // timestamptz
	modified_date: string; // timestamptz
}

// ============================================================================
// SUBSCRIPTION_TIERS TABLE
// ============================================================================

export interface SubscriptionTierRecord {
	tier_id: number; // PK auto increment
	tier_name: string;
	google_play_product_id: string | null;
	storage_quota_bytes: number;
	file_count_quota: number;
	price_monthly: number | null; // cents
	price_yearly: number | null; // cents
	is_active: boolean;
	create_date: string; // timestamptz
	modified_date: string; // timestamptz
}

// ============================================================================
// USER_SETTINGS_CRAWL TABLE
// ============================================================================

export interface UserSettingsCrawl {
	user_id: string; // PK - UUID
	show_subfolders: boolean;
	thumbs_enabled: boolean;
	always_bookmark_images: boolean;
	always_bookmark_videos: boolean;
	create_date: string; // timestamptz
	update_date: string; // timestamptz
}

// ============================================================================
// USER_SETTINGS_FOLDERS TABLE
// ============================================================================

export interface UserSettingsFolders {
	user_id: string; // PK - UUID
	justified_row_height: number;
	justified_row_height_mobile: number;
	list_icon_size: number;
	list_icon_size_mobile: number;
	thumbnail_size: number;
	thumbnail_size_mobile: number;
	show_filenames: boolean;
	override_layout_mode: string | null;
	override_sort_order: string | null;
	override_grouped: string | null;
	create_date: string; // timestamptz
	update_date: string; // timestamptz
}

// ============================================================================
// USER_SETTINGS_SEARCH TABLE
// ============================================================================

export interface UserSettingsSearch {
	user_id: string; // PK - UUID
	layout_mode: LayoutMode;
	sort_order: SortOrder;
	grouped: string;
	create_date: string; // timestamptz
	update_date: string; // timestamptz
}

// ============================================================================
// HELPER TYPES FOR QUERIES
// ============================================================================

export interface FileWithMeta extends FileRecord {
	meta: MetaRecord | null;
}

export interface FileWithDetails extends FileRecord {
	meta: MetaRecord | null;
	mount: MountRecord;
	sources: SourceRecord[];
	tags: TagRecord[];
	posts: PostRecord[];
}

export interface FolderWithFiles extends FolderRecord {
	files: FileWithMeta[];
	subfolders: FolderRecord[];
}

export interface MountWithStats extends MountRecord {
	file_count: number;
	total_size: number;
	paired_mounts: MountRecord[];
}

export interface TagFormatted {
	tag_id: number;
	user_id: string;
	full_tag_name: string;
	namespace: string | null;
	tag_name: string;
	usage_count: number;
	remote_tag_id: number | null;
}

export interface ActiveShare extends SharedLibraryRecord {
	mount_label: string | null;
	platform: Platform | null;
}

// ============================================================================
// INSERT TYPES (Omit auto-increment fields)
// ============================================================================

export type MetaInsert = Omit<MetaRecord, 'create_date' | 'modified_date'>;
export type FileInsert = Omit<FileRecord, 'file_id' | 'create_date' | 'modified_date'>;
export type SourceInsert = Omit<SourceRecord, 'modified_date'>;
export type MountInsert = Omit<MountRecord, 'mount_id' | 'create_date'>;
export type FolderInsert = Omit<FolderRecord, 'folder_id' | 'create_date'>;
export type MountPairInsert = Omit<MountPairRecord, 'pair_id' | 'create_date'>;
export type TagInsert = Omit<TagRecord, 'tag_id' | 'create_date' | 'modified_date'>;
export type FileTagInsert = Omit<FileTagRecord, 'create_date' | 'modified_date'>;
export type PostInsert = Omit<PostRecord, 'post_id' | 'create_date' | 'modified_date'>;
export type DeletionInsert = Omit<DeletionRecord, 'deletion_id' | 'deleted_date'>;
export type SharedLibraryInsert = Omit<SharedLibraryRecord, 'share_id' | 'created_date'>;

// ============================================================================
// UPDATE TYPES (All fields optional)
// ============================================================================

export type MetaUpdate = Partial<MetaRecord>;
export type FileUpdate = Partial<FileRecord>;
export type SourceUpdate = Partial<SourceRecord>;
export type MountUpdate = Partial<MountRecord>;
export type FolderUpdate = Partial<FolderRecord>;
export type TagUpdate = Partial<TagRecord>;
export type PostUpdate = Partial<PostRecord>;
export type SharedLibraryUpdate = Partial<SharedLibraryRecord>;
