[SUBSCRIPTION_TIERS]
tier_id - PK serial
tier_name - text UNIQUE NOT NULL
google_play_product_id - text UNIQUE
storage_quota_bytes - bigint NOT NULL
file_count_quota - integer NOT NULL
price_monthly - integer (cents, NULL for free)
price_yearly - integer (cents, NULL for free)
is_active - boolean DEFAULT true
create_date - timestamptz DEFAULT now()
modified_date - timestamptz DEFAULT now()

[PROFILES]
id - PK uuid REFERENCES auth.users(id) ON DELETE CASCADE
username - text UNIQUE NOT NULL
email - text UNIQUE NOT NULL
android_id - text
is_anonymous - boolean DEFAULT false
tier_id - integer REFERENCES subscription_tiers(tier_id) DEFAULT 1
google_play_token - text
google_play_order_id - text
subscription_start_date - timestamptz
subscription_end_date - timestamptz
storage_used_bytes - bigint DEFAULT 0
file_count_used - integer DEFAULT 0
dmca_strike_count - integer DEFAULT 0
dmca_strike_date - timestamptz
account_status - text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned'))
create_date - timestamptz DEFAULT now()
modified_date - timestamptz DEFAULT now()

[META]
meta_hash - PK (Unified content identifier: SHA2 of file contents mixed with SHA2 of url's, thumb deduplication across files vs .url files pointing to files)
phash - text (perceptual hash for images/video)
phash_algorithm - text CHECK (phash_algorithm IN ('dhash', 'phash', 'whash'))
type - text NOT NULL CHECK (type IN ('image', 'video', 'audio'))
mime_type - text
format - text
width - integer
height - integer
duration - real
video_codec - text
video_bitrate - bigint
video_framerate - real
video_color_space - text
video_bit_depth - integer
audio_codec - text
audio_bitrate - bigint
audio_sample_rate - integer
audio_channels - integer
b2_thumb_exists - boolean DEFAULT false (global B2 thumbnail exists in stubly-thumbs bucket)
b2_thumb_width - integer (thumbnail width for layout calculations)
b2_thumb_height - integer (thumbnail height for layout calculations)
b2_preview_exists - boolean DEFAULT false (global B2 preview exists in stubly-previews bucket)
b2_sprite_exists - boolean DEFAULT false (global B2 sprite image exists in stubly-sprites bucket)
b2_sprite_json_exists - boolean DEFAULT false (global B2 sprite JSON exists in stubly-sprites bucket)
create_date - timestamptz NOT NULL DEFAULT now()
modified_date - timestamptz NOT NULL DEFAULT now()

[MOUNTS]
mount_id - PK serial
user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
platform - text NOT NULL CHECK (platform IN ('Android', 'Windows', 'Backblaze'))
mount_label - text NOT NULL
device_id - text
device_path - text NOT NULL
storage_type - text NOT NULL CHECK (storage_type IN ('cloud', 'cloud_local', 'local')) DEFAULT 'cloud'
encryption_enabled - boolean DEFAULT false
encryption_type - text CHECK (encryption_type IN ('aes256', 'chacha20'))
encryption_key_hash - text
create_date - timestamptz NOT NULL DEFAULT now()
is_active - boolean DEFAULT true

[FILES]
file_id - PK bigserial
user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
meta_hash - text REFERENCES meta(meta_hash) ON DELETE SET NULL
mount_id - integer NOT NULL REFERENCES mounts(mount_id) ON DELETE CASCADE
file_path - text NOT NULL
type - text NOT NULL CHECK (type IN ('image', 'video', 'audio', 'url'))
local_size - bigint
user_description - text
has_thumb - boolean DEFAULT false
thumb_path - text
thumb_width - integer
thumb_height - integer
has_preview - boolean DEFAULT false
preview_path - text
has_sprite - boolean DEFAULT false
sprite_path - text
sprite_json_path - text
sync_date - timestamptz
local_modified - timestamptz
create_date - timestamptz NOT NULL DEFAULT now()
modified_date - timestamptz NOT NULL DEFAULT now()
user_edited_date - timestamptz
search_vector - tsvector (Full-text search: file_path + user_description + aggregated tags)
UNIQUE (user_id, mount_id, file_path)

[SOURCE]
user_id - PK uuid REFERENCES auth.users(id) ON DELETE CASCADE
file_id - PK bigint REFERENCES files(file_id) ON DELETE CASCADE
url - PK text
content_type - text
remote_size - bigint
is_file - boolean DEFAULT true
url_source - text
iframe - boolean DEFAULT false
embed - text
modified_date - timestamptz NOT NULL DEFAULT now()

[FOLDERS]
folder_id - PK serial
user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
mount_id - integer NOT NULL REFERENCES mounts(mount_id) ON DELETE CASCADE
folder_path - text NOT NULL
parent_folder_id - integer REFERENCES folders(folder_id) ON DELETE CASCADE
item_count - integer DEFAULT 0
last_modified - timestamptz
create_date - timestamptz NOT NULL DEFAULT now()

[MOUNT_PAIRS]
pair_id - PK serial
mount_a_id - integer NOT NULL REFERENCES mounts(mount_id) ON DELETE CASCADE
mount_b_id - integer NOT NULL REFERENCES mounts(mount_id) ON DELETE CASCADE
create_date - timestamptz NOT NULL DEFAULT now()
CHECK (mount_a_id < mount_b_id)
UNIQUE (mount_a_id, mount_b_id)

[TAGS]
tag_id - PK serial
user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
namespace - text
tag_name - text NOT NULL
remote_tag_id - integer
usage_count - integer DEFAULT 0
create_date - timestamptz NOT NULL DEFAULT now()
modified_date - timestamptz NOT NULL DEFAULT now()
UNIQUE (user_id, namespace, tag_name)

[FILE_TAGS]
user_id - PK uuid REFERENCES auth.users(id) ON DELETE CASCADE
file_id - PK bigint REFERENCES files(file_id) ON DELETE CASCADE
tag_id - PK integer REFERENCES tags(tag_id) ON DELETE CASCADE
create_date - timestamptz NOT NULL DEFAULT now()
modified_date - timestamptz NOT NULL DEFAULT now()

[POSTS]
post_id - PK serial
user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
file_id - bigint NOT NULL REFERENCES files(file_id) ON DELETE CASCADE
url - text NOT NULL
domain - text
post_date - timestamptz
post_text - text
post_user - text
title - text
create_date - timestamptz NOT NULL DEFAULT now()
modified_date - timestamptz NOT NULL DEFAULT now()
search_vector - tsvector (Full-text search: title + post_text + post_user + domain)
UNIQUE (user_id, file_id, url)

[DELETIONS]
deletion_id - PK serial
user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
file_id - bigint NOT NULL
deleted_date - timestamptz NOT NULL DEFAULT now()
synced_to_pairs - boolean DEFAULT false

[SHARED_LIBRARIES]
share_id - PK serial
owner_user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
guest_user_id - uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
share_type - text NOT NULL CHECK (share_type IN ('mount', 'folder'))
mount_id - integer REFERENCES mounts(mount_id) ON DELETE CASCADE
folder_path - text
permission_view - boolean DEFAULT true
permission_download - boolean DEFAULT false
permission_comment - boolean DEFAULT false
share_label - text
created_date - timestamptz NOT NULL DEFAULT now()
revoked_date - timestamptz
last_accessed_date - timestamptz

[USER_SETTINGS_CRAWL]
user_id - PK uuid REFERENCES auth.users(id) ON DELETE CASCADE
show_subfolders - boolean DEFAULT false
thumbs_enabled - boolean DEFAULT true
always_bookmark_images - boolean DEFAULT true
always_bookmark_videos - boolean DEFAULT true
create_date - timestamptz NOT NULL DEFAULT now()
update_date - timestamptz NOT NULL DEFAULT now()

[USER_SETTINGS_FOLDERS]
user_id - PK uuid REFERENCES auth.users(id) ON DELETE CASCADE
justified_row_height - integer DEFAULT 170
justified_row_height_mobile - integer DEFAULT 120
list_icon_size - integer DEFAULT 52
list_icon_size_mobile - integer DEFAULT 40
thumbnail_size - integer DEFAULT 200
thumbnail_size_mobile - integer DEFAULT 150
show_filenames - boolean DEFAULT false
override_layout_mode - text
override_sort_order - text
override_grouped - text
create_date - timestamptz NOT NULL DEFAULT now()
update_date - timestamptz NOT NULL DEFAULT now()

[USER_SETTINGS_SEARCH]
user_id - PK uuid REFERENCES auth.users(id) ON DELETE CASCADE
layout_mode - text DEFAULT 'grid' CHECK (layout_mode IN ('list', 'grid', 'justified'))
sort_order - text DEFAULT 'newest' CHECK (sort_order IN ('a-z', 'z-a', 'newest', 'oldest', 'biggest', 'smallest'))
grouped - text DEFAULT 'false'
create_date - timestamptz NOT NULL DEFAULT now()
update_date - timestamptz NOT NULL DEFAULT now()

== INDEXES ==

SUBSCRIPTION_TIERS
CREATE INDEX idx_tiers_active ON subscription_tiers(is_active);
CREATE INDEX idx_tiers_product_id ON subscription_tiers(google_play_product_id);

PROFILES
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_android_id ON profiles(android_id);
CREATE INDEX idx_profiles_tier ON profiles(tier_id);
CREATE INDEX idx_profiles_status ON profiles(account_status);
CREATE INDEX idx_profiles_subscription_end ON profiles(subscription_end_date);

META
CREATE INDEX idx_meta_type ON meta(type);
CREATE INDEX idx_meta_mime ON meta(mime_type);
CREATE INDEX idx_meta_phash ON meta(phash) WHERE phash IS NOT NULL;

MOUNTS
CREATE INDEX idx_mounts_user_id ON mounts(user_id);
CREATE INDEX idx_mounts_platform ON mounts(user_id, platform);
CREATE INDEX idx_mounts_active ON mounts(user_id, is_active);
CREATE INDEX idx_mounts_encryption ON mounts(user_id, encryption_enabled);

FILES
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_mount ON files(mount_id, file_path);
CREATE INDEX idx_files_user_mount_path ON files(user_id, mount_id, file_path);
CREATE INDEX idx_files_meta_hash ON files(meta_hash) WHERE meta_hash IS NOT NULL;
CREATE INDEX idx_files_type ON files(user_id, type);
CREATE INDEX idx_files_created ON files(user_id, create_date DESC);
CREATE INDEX idx_files_size ON files(user_id, local_size DESC);
CREATE INDEX idx_files_search ON files USING gin(search_vector);

SOURCE
CREATE INDEX idx_source_file_id ON source(file_id);
CREATE INDEX idx_source_url ON source(url);
CREATE INDEX idx_source_domain ON source(user_id, url_source);

FOLDERS
CREATE INDEX idx_folders_mount ON folders(mount_id, folder_path);
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);
CREATE INDEX idx_folders_user ON folders(user_id);

MOUNT_PAIRS
CREATE INDEX idx_mount_pairs_a ON mount_pairs(mount_a_id);
CREATE INDEX idx_mount_pairs_b ON mount_pairs(mount_b_id);

TAGS
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(user_id, namespace, tag_name);
CREATE INDEX idx_tags_usage ON tags(user_id, usage_count DESC);
CREATE INDEX idx_tags_remote ON tags(remote_tag_id) WHERE remote_tag_id IS NOT NULL;

FILE_TAGS
CREATE INDEX idx_file_tags_file ON file_tags(file_id);
CREATE INDEX idx_file_tags_tag ON file_tags(tag_id);
CREATE INDEX idx_file_tags_user ON file_tags(user_id);

POSTS
CREATE INDEX idx_posts_file_id ON posts(file_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_domain ON posts(user_id, domain);
CREATE INDEX idx_posts_post_user ON posts(user_id, post_user);
CREATE INDEX idx_posts_post_date ON posts(user_id, post_date DESC);
CREATE INDEX idx_posts_url ON posts(url);
CREATE INDEX idx_posts_search ON posts USING gin(search_vector);

DELETIONS
CREATE INDEX idx_deletions_user_id ON deletions(user_id);
CREATE INDEX idx_deletions_file_id ON deletions(file_id);
CREATE INDEX idx_deletions_synced ON deletions(synced_to_pairs);
CREATE INDEX idx_deletions_date ON deletions(deleted_date DESC);

SHARED_LIBRARIES
CREATE INDEX idx_shared_owner ON shared_libraries(owner_user_id);
CREATE INDEX idx_shared_guest ON shared_libraries(guest_user_id);
CREATE INDEX idx_shared_active ON shared_libraries(guest_user_id, revoked_date) WHERE revoked_date IS NULL;
CREATE INDEX idx_shared_mount ON shared_libraries(mount_id);
