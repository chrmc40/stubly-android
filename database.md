[FILES]
user_id - PK (user UUID from auth.users)
file_id - PK (file SHA2 checksum or URL identifier)
hash - SHA2 checksum of only files (NULL for url type)
phash - Perceptual hash for images/video (NULL for audio/url)
phash_algorithm - 'dhash' | 'phash' | 'whash' | NULL (track which algo used)
type - image, video, audio, url (this is how I mix url's as direct files)
mime_type - image/jpeg, video/mp4, etc
local_size - Size of local file in bytes (for URL type, this is the .url stub file size)
format - jpeg, mp4, flac, etc
width - n pixels
height - n pixels
duration - floating point (industry standard)
video_codec - h264, vp9, etc
video_bitrate - bitrate in bps
video_framerate - video framerate fps
video_color_space - Video color space (yuv420p, etc)
video_bit_depth - Video bit depth
audio_codec - Audio codec (aac, opus, etc)
audio_bitrate - Audio bitrate in bps
audio_sample_rate - Audio sample rate (Hz)
audio_channels - Number of audio channels
user_description - User-provided description (concat description on merge)
create_date - datetime utc
modified_date - datetime utc
user_edited_date - datetime utc
    
[SOURCE]
user_id - PK (user UUID from auth.users)
file_id - PK (FK to FILES table)
url - PK (source URL where file was found or scraped)
content_type - MIME type from HTTP response (image/jpeg, video/mp4, etc)
remote_size - Size of remote resource in bytes (NULL if unknown or webpage)
is_file - true if direct file link, false if webpage
url_source - Parent webpage this URL was scraped from (NULL if manually added)
iframe - true if webpage can be embedded in iframe
embed - Base64 encoded embed data for webpage preview
modified_date - datetime utc
    
[LOCATIONS]
location_id - PK auto increment
user_id - User UUID from auth.users - UNIQUE (user_id, file_id, mount_id)
file_id - FK to FILES table
mount_id - FK to MOUNTS table
file_path - /somefolder/filename.ext (relative path)
has_thumb - true | false
thumb_path - S3 key or filesystem path to thumbnail (NULL if no thumb)
thumb_width - n pixels
thumb_height - n pixels
has_preview - true | false
preview_path - S3 key or filesystem path to preview (NULL if no preview)
has_sprite - true | false
sprite_path - S3 key or filesystem path to sprite (NULL if no sprite)
sync_date - Last time this location was synced with its paired mount
local_modified - Last modified timestamp from filesystem (NULL for cloud storage)
    
[FOLDERS]
folder_id - PK auto increment
user_id - User UUID from auth.users
mount_id - FK to MOUNTS
folder_path - Virtual folder path ("/vacation/2024/summer")
parent_folder_id - FK to FOLDERS.folder_id (NULL for root)
item_count - Number of items (files + subfolders)
last_modified - Most recent change in this folder
create_date - When folder was created
    
[MOUNTS]
mount_id - PK auto increment
user_id - User UUID from auth.users
platform - Storage platform type ('Android' | 'Windows' | 'Backblaze')
mount_label - Human-readable identifier shown to user
device_id - Hardware identifier (ANDROID_ID, hostname, or NULL for Backblaze)
device_path - Base path for this mount (SAF URI, folder path, or S3 prefix)
storage_type - 'cloud' | 'cloud_local' | 'local' (default 'cloud')
encryption_enabled - true | false (default false)
encryption_type - 'aes256' | 'chacha20' | NULL
encryption_key_hash - Hash of encryption key (NULL if encryption_enabled=false)
create_date - Timestamp when mount was created
is_active - Whether this mount is currently active for syncing
    
[MOUNT_PAIRS]
pair_id - PK auto increment
mount_a_id - FK to MOUNTS.mount_id - CHECK (mount_a_id < mount_b_id) prevents self-pairing and duplicates
mount_b_id - FK to MOUNTS.mount_id
create_date - When sync relationship was established

[TAGS]
tag_id - PK auto increment
user_id - User UUID from auth.users
namespace - 'character' | 'series' | 'artist' | 'meta' | etc (NULL for flat tags)
tag_name - Tag label text - UNIQUE(user_id, namespace, tag_name) case-insensitive
remote_tag_id - FK to remote tag database (NULL if not linked to remote)
usage_count - Number of files using this tag (maintained by trigger and count filtered by user_id)
create_date - When tag was created
modified_date - datetime utc
    
[FILE_TAGS]
user_id - PK (user UUID from auth.users)
file_id - PK (FK to FILES)
tag_id - PK (FK to TAGS)
create_date - When tag was applied to file
modified_date - datetime utc

[POSTS]
post_id - PK auto increment
user_id - User UUID from auth.users - UNIQUE (user_id, file_id, url)
file_id - FK to FILES table
url - Thread/post URL where this was found
domain - Source domain (e.g., "4chan.org", "reddit.com")
post_date - When post was originally created
post_text - Post content/comment text
post_user - Username/ID who posted
title - Thread/post title
create_date - When this record was added to database
modified_date - datetime utc
    
[PROFILES] (renamed from USERS)
id - PK (user UUID from auth.users)
username - User's chosen username - UNIQUE
email - User's email - UNIQUE
android_id - Android device ID (NULL for non-Android users)
is_anonymous - true if anonymous account, false if OAuth
tier_id - FK to SUBSCRIPTION_TIERS table (default 1 = free tier)
google_play_token - Purchase token from Google Play Billing
google_play_order_id - Order ID from Google Play
subscription_start_date - When subscription started
subscription_end_date - When subscription expires (for validation)
storage_used_bytes - Current storage usage in bytes (default 0)
file_count_used - Current number of files (default 0)
dmca_strike_count - Number of DMCA strikes received (default 0)
dmca_strike_date - Date of most recent DMCA strike
account_status - 'active' | 'suspended' | 'banned' (default 'active')
create_date - When profile was created
modified_date - Last time profile was updated
    
[SUBSCRIPTION_TIERS]
tier_id - PK auto increment
tier_name - Tier name - UNIQUE (e.g., "free", "basic", "premium", "enterprise")
google_play_product_id - Google Play product SKU - UNIQUE (NULL for free tier)
storage_quota_bytes - Maximum storage allowed in bytes
file_count_quota - Maximum number of files allowed
price_monthly - Monthly price in cents (NULL for free)
price_yearly - Yearly price in cents (NULL for free)
is_active - Whether this tier is currently available for new subscriptions (default true)
create_date - When tier was created
modified_date - Last time tier was updated

[DELETIONS]
deletion_id - PK auto increment
user_id - User UUID from auth.users
file_id - FK to FILES table (file that was deleted)
mount_id - FK to MOUNTS.mount_id (which mount the file was deleted from)
deleted_date - When deletion occurred
synced_to_pairs - true | false (Whether deletion has synced to all paired mounts, default false)
    
[USER_SETTINGS_CRAWL]
user_id - PK (user UUID from auth.users)
show_subfolders - true | false (default false)
thumbs_enabled - true | false (default true)
always_bookmark_images - true | false (default true)
always_bookmark_videos - true | false (default true)
create_date - datetime
update_date - datetime

[USER_SETTINGS_FOLDERS]
user_id - PK (user UUID from auth.users)
justified_row_height - Row height for justified layout (desktop) - default 170
justified_row_height_mobile - Row height for justified layout (mobile) - default 120
list_icon_size - Icon size in list view (desktop) - default 52
list_icon_size_mobile - Icon size in list view (mobile) - default 40
thumbnail_size - Thumbnail size for grid view (desktop) - default 200
thumbnail_size_mobile - Thumbnail size for grid view (mobile) - default 150
show_filenames - Show filenames under thumbnails - default false
override_layout_mode - Force specific layout (grid/list/justified) - NULL = use per-folder
override_sort_order - Force specific sort order - NULL = use per-folder
override_grouped - Force grouping mode - NULL = use per-folder
create_date - datetime
update_date - datetime

[USER_SETTINGS_SEARCH]
user_id - PK (user UUID from auth.users)
layout_mode - Search results layout: 'list' | 'grid' | 'justified' (default 'grid')
sort_order - Sort order: 'a-z' | 'z-a' | 'newest' | 'oldest' | 'biggest' | 'smallest' (default 'newest')
grouped - Group results: 'false' | 'newest' | 'oldest' | 'byType' | 'bySize' (default 'false')
create_date - datetime
update_date - datetime
    
[SHARED_LIBRARIES]
share_id - PK auto increment
owner_user_id - User UUID who owns the files being shared
guest_user_id - User UUID who is being granted access
share_type - 'mount' | 'folder'
mount_id - FK to MOUNTS.mount_id (NULL if share_type='folder')
folder_path - Specific folder path (NULL if sharing entire mount)
permission_view - true | false (can view/stream files, default true)
permission_download - true | false (can cache files to their local mount, default false)
permission_comment - true | false (can add comments/descriptions, default false)
share_label - Human-readable name ("My Vacation Photos", "Family Archive", etc)
created_date - When share was created
revoked_date - NULL if active, timestamp if owner revoked access
last_accessed_date - Last time guest viewed this shared library
    
[FILES_FTS] (Virtual FTS5 table with tokenize='porter ascii')
file_id - UNINDEXED
user_id - UNINDEXED
tags - Space-separated tag names (no namespace)
tag_namespaces - Space-separated namespaces ("character series artist")
user_description - From FILES.user_description

[POSTS_FTS] (Virtual FTS5 table with tokenize='porter ascii')
post_id - UNINDEXED (post record id)
user_id - UNINDEXED (filter per user)
post_text - From POSTS.post_text
title - From POSTS.title
post_user - From POSTS.post_user
domain - From POSTS.domain
    
== INDEXES ==

FILES Table
CREATE INDEX idx_files_user_id ON FILES(user_id);
CREATE INDEX idx_files_type ON FILES(user_id, type);
CREATE INDEX idx_files_created ON FILES(user_id, create_date DESC);
CREATE INDEX idx_files_size ON FILES(user_id, local_size DESC);
CREATE INDEX idx_files_hash ON FILES(hash);
CREATE INDEX idx_files_phash ON FILES(phash) WHERE phash IS NOT NULL;	
    
SOURCE Table
CREATE INDEX idx_source_file_id ON SOURCE(file_id);
CREATE INDEX idx_source_url ON SOURCE(url);
CREATE INDEX idx_source_domain ON SOURCE(user_id, url_source);

LOCATIONS Table
CREATE INDEX idx_locations_file_id ON LOCATIONS(file_id);
CREATE INDEX idx_locations_mount_id ON LOCATIONS(mount_id);
CREATE INDEX idx_locations_user_file_mount ON LOCATIONS(user_id, file_id, mount_id);
CREATE INDEX idx_locations_path ON LOCATIONS(user_id, mount_id, file_path);

FOLDERS Table
CREATE INDEX idx_folders_mount ON FOLDERS(mount_id, folder_path);
CREATE INDEX idx_folders_parent ON FOLDERS(parent_folder_id);
CREATE INDEX idx_folders_user ON FOLDERS(user_id);

MOUNTS Table
CREATE INDEX idx_mounts_user_id ON MOUNTS(user_id);
CREATE INDEX idx_mounts_platform ON MOUNTS(user_id, platform);
CREATE INDEX idx_mounts_active ON MOUNTS(user_id, is_active);
CREATE INDEX idx_mounts_encryption ON MOUNTS(user_id, encryption_enabled);

MOUNT_PAIRS Table
CREATE INDEX idx_mount_pairs_a ON MOUNT_PAIRS(mount_a_id);
CREATE INDEX idx_mount_pairs_b ON MOUNT_PAIRS(mount_b_id);

TAGS Table
CREATE INDEX idx_tags_user_id ON TAGS(user_id);
CREATE INDEX idx_tags_name ON TAGS(user_id, namespace, tag_name);
CREATE INDEX idx_tags_usage ON TAGS(user_id, usage_count DESC);
CREATE INDEX idx_tags_remote ON TAGS(remote_tag_id) WHERE remote_tag_id IS NOT NULL;

FILE_TAGS Table
CREATE INDEX idx_file_tags_file ON FILE_TAGS(file_id);
CREATE INDEX idx_file_tags_tag ON FILE_TAGS(tag_id);
CREATE INDEX idx_file_tags_user ON FILE_TAGS(user_id);

POSTS Table
CREATE INDEX idx_posts_file_id ON POSTS(file_id);
CREATE INDEX idx_posts_user_id ON POSTS(user_id);
CREATE INDEX idx_posts_domain ON POSTS(user_id, domain);
CREATE INDEX idx_posts_post_user ON POSTS(user_id, post_user);
CREATE INDEX idx_posts_post_date ON POSTS(user_id, post_date DESC);
CREATE INDEX idx_posts_url ON POSTS(url);

PROFILES Table
CREATE INDEX idx_profiles_username ON PROFILES(username);
CREATE INDEX idx_profiles_email ON PROFILES(email);
CREATE INDEX idx_profiles_android_id ON PROFILES(android_id);
CREATE INDEX idx_profiles_tier ON PROFILES(tier_id);
CREATE INDEX idx_profiles_status ON PROFILES(account_status);
CREATE INDEX idx_profiles_subscription_end ON PROFILES(subscription_end_date);

SUBSCRIPTION_TIERS Table
CREATE INDEX idx_tiers_active ON SUBSCRIPTION_TIERS(is_active);
CREATE INDEX idx_tiers_product_id ON SUBSCRIPTION_TIERS(google_play_product_id);

DELETIONS Table
CREATE INDEX idx_deletions_user_id ON DELETIONS(user_id);
CREATE INDEX idx_deletions_file_id ON DELETIONS(file_id);
CREATE INDEX idx_deletions_mount_id ON DELETIONS(mount_id);
CREATE INDEX idx_deletions_synced ON DELETIONS(synced_to_pairs);
CREATE INDEX idx_deletions_date ON DELETIONS(deleted_date DESC);

SHARED_LIBRARIES Table
CREATE INDEX idx_shared_owner ON SHARED_LIBRARIES(owner_user_id);
CREATE INDEX idx_shared_guest ON SHARED_LIBRARIES(guest_user_id);
CREATE INDEX idx_shared_active ON SHARED_LIBRARIES(guest_user_id, revoked_date) WHERE revoked_date IS NULL;
CREATE INDEX idx_shared_mount ON SHARED_LIBRARIES(mount_id);

Settings Tables
 -- These are small tables with PK lookups only, no additional indexes needed
 -- USER_SETTINGS_CRAWL
 -- USER_SETTINGS_FOLDERS
 -- USER_SETTINGS_SEARCH	
