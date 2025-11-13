/**
 * Local SQLite Database Types
 * Matches schema in database-schema-local.sql
 */

export type FileType = 'image' | 'video' | 'audio' | 'url';
export type PhashAlgorithm = 'dhash' | 'phash' | 'whash' | null;
export type Platform = 'Android' | 'Windows' | 'Wasabi';
export type ShareType = 'mount' | 'folder';
export type LayoutMode = 'list' | 'grid' | 'justified';
export type SortOrder = 'a-z' | 'z-a' | 'newest' | 'oldest' | 'biggest' | 'smallest';

// ============================================================================
// FILES TABLE
// ============================================================================

export interface FileRecord {
	user_id: string;
	file_id: string;
	encrypted: boolean;
	hash: string | null;
	phash: string | null;
	phash_algorithm: PhashAlgorithm;
	type: FileType;
	mime_type: string | null;
	local_size: number | null;
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
	user_description: string | null;
	create_date: number;
	modified_date: number;
	user_edited_date: number | null;
}

// ============================================================================
// SOURCE TABLE
// ============================================================================

export interface SourceRecord {
	user_id: string;
	file_id: string;
	url: string;
	content_type: string | null;
	remote_size: number | null;
	is_file: boolean;
	url_source: string | null;
	iframe: boolean;
	embed: string | null;
	modified_date: number;
}

// ============================================================================
// MOUNTS TABLE
// ============================================================================

export interface MountRecord {
	mount_id: number;
	user_id: string;
	platform: Platform;
	mount_label: string;
	device_id: string | null;
	device_path: string;
	create_date: number;
	is_active: boolean;
}

// ============================================================================
// LOCATIONS TABLE
// ============================================================================

export interface LocationRecord {
	location_id: number;
	user_id: string;
	file_id: string;
	mount_id: number;
	file_path: string;
	has_thumb: boolean;
	thumb_width: number | null;
	thumb_height: number | null;
	has_preview: boolean;
	has_sprite: boolean;
	sync_date: number | null;
	local_modified: number | null;
}

// ============================================================================
// FOLDERS TABLE
// ============================================================================

export interface FolderRecord {
	folder_id: number;
	user_id: string;
	mount_id: number;
	folder_path: string;
	parent_folder_id: number | null;
	item_count: number;
	last_modified: number | null;
	create_date: number;
}

// ============================================================================
// MOUNT_PAIRS TABLE
// ============================================================================

export interface MountPairRecord {
	pair_id: number;
	mount_a_id: number;
	mount_b_id: number;
	create_date: number;
}

// ============================================================================
// TAGS TABLE
// ============================================================================

export interface TagRecord {
	tag_id: number;
	user_id: string;
	namespace: string | null;
	tag_name: string;
	remote_tag_id: number | null;
	usage_count: number;
	create_date: number;
	modified_date: number;
}

// ============================================================================
// FILE_TAGS TABLE
// ============================================================================

export interface FileTagRecord {
	user_id: string;
	file_id: string;
	tag_id: number;
	create_date: number;
	modified_date: number;
}

// ============================================================================
// POSTS TABLE
// ============================================================================

export interface PostRecord {
	post_id: number;
	user_id: string;
	file_id: string;
	url: string;
	domain: string | null;
	post_date: number | null;
	post_text: string | null;
	post_user: string | null;
	title: string | null;
	create_date: number;
	modified_date: number;
}

// ============================================================================
// DELETIONS TABLE
// ============================================================================

export interface DeletionRecord {
	deletion_id: number;
	user_id: string;
	file_id: string;
	mount_id: number;
	deleted_date: number;
	synced_to_pairs: boolean;
}

// ============================================================================
// SHARED_LIBRARIES TABLE
// ============================================================================

export interface SharedLibraryRecord {
	share_id: number;
	owner_user_id: string;
	guest_user_id: string;
	share_type: ShareType;
	mount_id: number | null;
	folder_path: string | null;
	permission_view: boolean;
	permission_download: boolean;
	permission_comment: boolean;
	share_label: string | null;
	created_date: number;
	revoked_date: number | null;
	last_accessed_date: number | null;
}

// ============================================================================
// USER_SETTINGS_CRAWL TABLE
// ============================================================================

export interface UserSettingsCrawl {
	user_id: string;
	show_subfolders: boolean;
	thumbs_enabled: boolean;
	always_bookmark_images: boolean;
	always_bookmark_videos: boolean;
	create_date: number;
	update_date: number;
}

// ============================================================================
// USER_SETTINGS_FOLDERS TABLE
// ============================================================================

export interface UserSettingsFolders {
	user_id: string;
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
	create_date: number;
	update_date: number;
}

// ============================================================================
// USER_SETTINGS_SEARCH TABLE
// ============================================================================

export interface UserSettingsSearch {
	user_id: string;
	layout_mode: LayoutMode;
	sort_order: SortOrder;
	grouped: string;
	create_date: number;
	update_date: number;
}

// ============================================================================
// FTS SEARCH RESULTS
// ============================================================================

export interface FilesFtsResult {
	file_id: string;
	user_id: string;
	rank: number;
	snippet: string;
}

export interface PostsFtsResult {
	post_id: number;
	user_id: string;
	rank: number;
	snippet: string;
}

// ============================================================================
// VIEWS
// ============================================================================

export interface FileWithLocations extends FileRecord {
	location_count: number;
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
// HELPER TYPES FOR QUERIES
// ============================================================================

export interface FileWithDetails extends FileRecord {
	locations: LocationRecord[];
	tags: TagFormatted[];
	sources: SourceRecord[];
	posts: PostRecord[];
}

export interface FolderWithFiles extends FolderRecord {
	files: FileRecord[];
	subfolders: FolderRecord[];
}

export interface MountWithStats extends MountRecord {
	file_count: number;
	total_size: number;
	paired_mounts: MountRecord[];
}

// ============================================================================
// INSERT TYPES (Omit auto-increment fields)
// ============================================================================

export type FileInsert = Omit<FileRecord, never>; // All fields required
export type SourceInsert = Omit<SourceRecord, never>;
export type MountInsert = Omit<MountRecord, 'mount_id'>;
export type LocationInsert = Omit<LocationRecord, 'location_id'>;
export type FolderInsert = Omit<FolderRecord, 'folder_id'>;
export type MountPairInsert = Omit<MountPairRecord, 'pair_id'>;
export type TagInsert = Omit<TagRecord, 'tag_id'>;
export type FileTagInsert = Omit<FileTagRecord, never>;
export type PostInsert = Omit<PostRecord, 'post_id'>;
export type DeletionInsert = Omit<DeletionRecord, 'deletion_id'>;
export type SharedLibraryInsert = Omit<SharedLibraryRecord, 'share_id'>;

// ============================================================================
// UPDATE TYPES (All fields optional)
// ============================================================================

export type FileUpdate = Partial<FileRecord>;
export type SourceUpdate = Partial<SourceRecord>;
export type MountUpdate = Partial<MountRecord>;
export type LocationUpdate = Partial<LocationRecord>;
export type FolderUpdate = Partial<FolderRecord>;
export type TagUpdate = Partial<TagRecord>;
export type PostUpdate = Partial<PostRecord>;
export type SharedLibraryUpdate = Partial<SharedLibraryRecord>;
