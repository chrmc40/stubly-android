-- ============================================================================
-- STUBLY LOCAL DATABASE SCHEMA (SQLite)
-- ============================================================================
-- This runs on device (Android/Windows/etc)
-- Handles: Files, Tags, Locations, Mounts, Posts, Settings
-- Storage: Encrypted SQLite with SQLCipher

-- ============================================================================
-- 1. FILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS files (
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  encrypted INTEGER DEFAULT 0,  -- 0=false, 1=true
  hash TEXT,
  phash TEXT,
  phash_algorithm TEXT CHECK (phash_algorithm IN ('dhash', 'phash', 'whash', NULL)),
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
  create_date INTEGER NOT NULL,  -- Unix timestamp
  modified_date INTEGER NOT NULL,
  user_edited_date INTEGER,
  PRIMARY KEY (user_id, file_id)
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_type ON files(user_id, type);
CREATE INDEX idx_files_created ON files(user_id, create_date DESC);
CREATE INDEX idx_files_size ON files(user_id, local_size DESC);
CREATE INDEX idx_files_hash ON files(hash);
CREATE INDEX idx_files_phash ON files(phash) WHERE phash IS NOT NULL;

-- ============================================================================
-- 2. SOURCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS source (
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  url TEXT NOT NULL,
  content_type TEXT,
  remote_size INTEGER,
  is_file INTEGER DEFAULT 1,  -- 0=webpage, 1=direct file
  url_source TEXT,
  iframe INTEGER DEFAULT 0,
  embed TEXT,  -- Base64 encoded
  modified_date INTEGER NOT NULL,
  PRIMARY KEY (user_id, file_id, url),
  FOREIGN KEY (user_id, file_id) REFERENCES files(user_id, file_id) ON DELETE CASCADE
);

CREATE INDEX idx_source_file_id ON source(file_id);
CREATE INDEX idx_source_url ON source(url);
CREATE INDEX idx_source_domain ON source(user_id, url_source);

-- ============================================================================
-- 3. MOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS mounts (
  mount_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('Android', 'Windows', 'Wasabi')),
  mount_label TEXT NOT NULL,
  device_id TEXT,
  device_path TEXT NOT NULL,
  create_date INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_mounts_user_id ON mounts(user_id);
CREATE INDEX idx_mounts_platform ON mounts(user_id, platform);
CREATE INDEX idx_mounts_active ON mounts(user_id, is_active);

-- ============================================================================
-- 4. LOCATIONS TABLE
-- ============================================================================

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
  sync_date INTEGER,
  local_modified INTEGER,
  FOREIGN KEY (user_id, file_id) REFERENCES files(user_id, file_id) ON DELETE CASCADE,
  FOREIGN KEY (mount_id) REFERENCES mounts(mount_id) ON DELETE CASCADE,
  UNIQUE (user_id, file_id, mount_id)
);

CREATE INDEX idx_locations_file_id ON locations(file_id);
CREATE INDEX idx_locations_mount_id ON locations(mount_id);
CREATE INDEX idx_locations_user_file_mount ON locations(user_id, file_id, mount_id);
CREATE INDEX idx_locations_path ON locations(user_id, mount_id, file_path);

-- ============================================================================
-- 5. FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS folders (
  folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  mount_id INTEGER NOT NULL,
  folder_path TEXT NOT NULL,
  parent_folder_id INTEGER,
  item_count INTEGER DEFAULT 0,
  last_modified INTEGER,
  create_date INTEGER NOT NULL,
  FOREIGN KEY (mount_id) REFERENCES mounts(mount_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_folder_id) REFERENCES folders(folder_id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_mount ON folders(mount_id, folder_path);
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);
CREATE INDEX idx_folders_user ON folders(user_id);

-- ============================================================================
-- 6. MOUNT_PAIRS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS mount_pairs (
  pair_id INTEGER PRIMARY KEY AUTOINCREMENT,
  mount_a_id INTEGER NOT NULL,
  mount_b_id INTEGER NOT NULL,
  create_date INTEGER NOT NULL,
  FOREIGN KEY (mount_a_id) REFERENCES mounts(mount_id) ON DELETE CASCADE,
  FOREIGN KEY (mount_b_id) REFERENCES mounts(mount_id) ON DELETE CASCADE,
  CHECK (mount_a_id < mount_b_id),
  UNIQUE (mount_a_id, mount_b_id)
);

CREATE INDEX idx_mount_pairs_a ON mount_pairs(mount_a_id);
CREATE INDEX idx_mount_pairs_b ON mount_pairs(mount_b_id);

-- ============================================================================
-- 7. TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  namespace TEXT,
  tag_name TEXT COLLATE NOCASE NOT NULL,
  remote_tag_id INTEGER,
  usage_count INTEGER DEFAULT 0,
  create_date INTEGER NOT NULL,
  modified_date INTEGER NOT NULL,
  UNIQUE (user_id, namespace, tag_name)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(user_id, namespace, tag_name);
CREATE INDEX idx_tags_usage ON tags(user_id, usage_count DESC);
CREATE INDEX idx_tags_remote ON tags(remote_tag_id) WHERE remote_tag_id IS NOT NULL;

-- ============================================================================
-- 8. FILE_TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_tags (
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  create_date INTEGER NOT NULL,
  modified_date INTEGER NOT NULL,
  PRIMARY KEY (user_id, file_id, tag_id),
  FOREIGN KEY (user_id, file_id) REFERENCES files(user_id, file_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

CREATE INDEX idx_file_tags_file ON file_tags(file_id);
CREATE INDEX idx_file_tags_tag ON file_tags(tag_id);
CREATE INDEX idx_file_tags_user ON file_tags(user_id);

-- ============================================================================
-- 9. POSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS posts (
  post_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT,
  post_date INTEGER,
  post_text TEXT,
  post_user TEXT,
  title TEXT,
  create_date INTEGER NOT NULL,
  modified_date INTEGER NOT NULL,
  FOREIGN KEY (user_id, file_id) REFERENCES files(user_id, file_id) ON DELETE CASCADE,
  UNIQUE (user_id, file_id, url)
);

CREATE INDEX idx_posts_file_id ON posts(file_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_domain ON posts(user_id, domain);
CREATE INDEX idx_posts_post_user ON posts(user_id, post_user);
CREATE INDEX idx_posts_post_date ON posts(user_id, post_date DESC);
CREATE INDEX idx_posts_url ON posts(url);

-- ============================================================================
-- 10. DELETIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deletions (
  deletion_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  mount_id INTEGER NOT NULL,
  deleted_date INTEGER NOT NULL,
  synced_to_pairs INTEGER DEFAULT 0,
  FOREIGN KEY (mount_id) REFERENCES mounts(mount_id) ON DELETE CASCADE
);

CREATE INDEX idx_deletions_user_id ON deletions(user_id);
CREATE INDEX idx_deletions_file_id ON deletions(file_id);
CREATE INDEX idx_deletions_mount_id ON deletions(mount_id);
CREATE INDEX idx_deletions_synced ON deletions(synced_to_pairs);
CREATE INDEX idx_deletions_date ON deletions(deleted_date DESC);

-- ============================================================================
-- 11. SHARED_LIBRARIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_libraries (
  share_id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id TEXT NOT NULL,
  guest_user_id TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('mount', 'folder')),
  mount_id INTEGER,
  folder_path TEXT,
  permission_view INTEGER DEFAULT 1,
  permission_download INTEGER DEFAULT 0,
  permission_comment INTEGER DEFAULT 0,
  share_label TEXT,
  created_date INTEGER NOT NULL,
  revoked_date INTEGER,
  last_accessed_date INTEGER,
  FOREIGN KEY (mount_id) REFERENCES mounts(mount_id) ON DELETE CASCADE
);

CREATE INDEX idx_shared_owner ON shared_libraries(owner_user_id);
CREATE INDEX idx_shared_guest ON shared_libraries(guest_user_id);
CREATE INDEX idx_shared_active ON shared_libraries(guest_user_id, revoked_date) WHERE revoked_date IS NULL;
CREATE INDEX idx_shared_mount ON shared_libraries(mount_id);

-- ============================================================================
-- 12. USER_SETTINGS_CRAWL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings_crawl (
  user_id TEXT PRIMARY KEY,
  show_subfolders INTEGER DEFAULT 0,
  thumbs_enabled INTEGER DEFAULT 1,
  always_bookmark_images INTEGER DEFAULT 1,
  always_bookmark_videos INTEGER DEFAULT 1,
  create_date INTEGER NOT NULL,
  update_date INTEGER NOT NULL
);

-- ============================================================================
-- 13. USER_SETTINGS_FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings_folders (
  user_id TEXT PRIMARY KEY,
  justified_row_height INTEGER DEFAULT 170,
  justified_row_height_mobile INTEGER DEFAULT 120,
  list_icon_size INTEGER DEFAULT 52,
  list_icon_size_mobile INTEGER DEFAULT 40,
  thumbnail_size INTEGER DEFAULT 200,
  thumbnail_size_mobile INTEGER DEFAULT 150,
  show_filenames INTEGER DEFAULT 0,
  override_layout_mode TEXT,
  override_sort_order TEXT,
  override_grouped TEXT,
  create_date INTEGER NOT NULL,
  update_date INTEGER NOT NULL
);

-- ============================================================================
-- 14. USER_SETTINGS_SEARCH TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings_search (
  user_id TEXT PRIMARY KEY,
  layout_mode TEXT DEFAULT 'grid' CHECK (layout_mode IN ('list', 'grid', 'justified')),
  sort_order TEXT DEFAULT 'newest' CHECK (sort_order IN ('a-z', 'z-a', 'newest', 'oldest', 'biggest', 'smallest')),
  grouped TEXT DEFAULT 'false',
  create_date INTEGER NOT NULL,
  update_date INTEGER NOT NULL
);

-- ============================================================================
-- 15. FULL-TEXT SEARCH TABLES (FTS5)
-- ============================================================================

-- Files FTS
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  file_id UNINDEXED,
  user_id UNINDEXED,
  tags,
  tag_namespaces,
  user_description,
  tokenize='porter ascii'
);

-- Posts FTS
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  post_id UNINDEXED,
  user_id UNINDEXED,
  post_text,
  title,
  post_user,
  domain,
  tokenize='porter ascii'
);

-- ============================================================================
-- 16. TRIGGERS FOR FTS SYNC
-- ============================================================================

-- Update files_fts when file description changes
CREATE TRIGGER IF NOT EXISTS files_fts_insert AFTER INSERT ON files
BEGIN
  INSERT INTO files_fts(file_id, user_id, user_description)
  VALUES (NEW.file_id, NEW.user_id, NEW.user_description);
END;

CREATE TRIGGER IF NOT EXISTS files_fts_update AFTER UPDATE ON files
BEGIN
  UPDATE files_fts
  SET user_description = NEW.user_description
  WHERE file_id = NEW.file_id AND user_id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS files_fts_delete AFTER DELETE ON files
BEGIN
  DELETE FROM files_fts WHERE file_id = OLD.file_id AND user_id = OLD.user_id;
END;

-- Update posts_fts when post changes
CREATE TRIGGER IF NOT EXISTS posts_fts_insert AFTER INSERT ON posts
BEGIN
  INSERT INTO posts_fts(post_id, user_id, post_text, title, post_user, domain)
  VALUES (NEW.post_id, NEW.user_id, NEW.post_text, NEW.title, NEW.post_user, NEW.domain);
END;

CREATE TRIGGER IF NOT EXISTS posts_fts_update AFTER UPDATE ON posts
BEGIN
  UPDATE posts_fts
  SET post_text = NEW.post_text,
      title = NEW.title,
      post_user = NEW.post_user,
      domain = NEW.domain
  WHERE post_id = NEW.post_id;
END;

CREATE TRIGGER IF NOT EXISTS posts_fts_delete AFTER DELETE ON posts
BEGIN
  DELETE FROM posts_fts WHERE post_id = OLD.post_id;
END;

-- Update tag usage count when file_tags changes
CREATE TRIGGER IF NOT EXISTS file_tags_insert AFTER INSERT ON file_tags
BEGIN
  UPDATE tags
  SET usage_count = usage_count + 1
  WHERE tag_id = NEW.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS file_tags_delete AFTER DELETE ON file_tags
BEGIN
  UPDATE tags
  SET usage_count = usage_count - 1
  WHERE tag_id = OLD.tag_id;
END;

-- ============================================================================
-- 17. HELPER VIEWS
-- ============================================================================

-- View: Files with location count
CREATE VIEW IF NOT EXISTS v_files_with_locations AS
SELECT
  f.*,
  COUNT(l.location_id) as location_count
FROM files f
LEFT JOIN locations l ON f.user_id = l.user_id AND f.file_id = l.file_id
GROUP BY f.user_id, f.file_id;

-- View: Tags with full namespace
CREATE VIEW IF NOT EXISTS v_tags_formatted AS
SELECT
  tag_id,
  user_id,
  CASE
    WHEN namespace IS NULL THEN tag_name
    ELSE namespace || ':' || tag_name
  END as full_tag_name,
  namespace,
  tag_name,
  usage_count,
  remote_tag_id
FROM tags;

-- View: Active shared libraries
CREATE VIEW IF NOT EXISTS v_active_shares AS
SELECT
  s.*,
  m.mount_label,
  m.platform
FROM shared_libraries s
LEFT JOIN mounts m ON s.mount_id = m.mount_id
WHERE s.revoked_date IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Schema created successfully' as status;

SELECT
  'Table: ' || name || ' (' || (
    SELECT COUNT(*) FROM pragma_table_info(name)
  ) || ' columns)' as info
FROM sqlite_master
WHERE type = 'table'
AND name NOT LIKE 'sqlite_%'
AND name NOT LIKE '%_fts%'
ORDER BY name;
