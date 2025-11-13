-- ============================================================================
-- STUBLY FULL SUPABASE SCHEMA
-- ============================================================================
-- All tables in PostgreSQL (Supabase cloud)
-- Run in Supabase Dashboard → SQL Editor

-- Drop existing (if any)
drop table if exists public.files_fts cascade;
drop table if exists public.posts_fts cascade;
drop table if exists public.file_tags cascade;
drop table if exists public.posts cascade;
drop table if exists public.source cascade;
drop table if exists public.locations cascade;
drop table if exists public.folders cascade;
drop table if exists public.mount_pairs cascade;
drop table if exists public.mounts cascade;
drop table if exists public.tags cascade;
drop table if exists public.deletions cascade;
drop table if exists public.shared_libraries cascade;
drop table if exists public.user_settings_crawl cascade;
drop table if exists public.user_settings_folders cascade;
drop table if exists public.user_settings_search cascade;
drop table if exists public.files cascade;

-- ============================================================================
-- FILES TABLE
-- ============================================================================

create table public.files (
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id text not null,
  encrypted boolean default false,
  hash text,
  phash text,
  phash_algorithm text check (phash_algorithm in ('dhash', 'phash', 'whash')),
  type text not null check (type in ('image', 'video', 'audio', 'url')),
  mime_type text,
  local_size bigint,
  format text,
  width integer,
  height integer,
  duration real,
  video_codec text,
  video_bitrate bigint,
  video_framerate real,
  video_color_space text,
  video_bit_depth integer,
  audio_codec text,
  audio_bitrate bigint,
  audio_sample_rate integer,
  audio_channels integer,
  user_description text,
  create_date timestamptz not null default now(),
  modified_date timestamptz not null default now(),
  user_edited_date timestamptz,
  primary key (user_id, file_id)
);

create index idx_files_user_id on public.files(user_id);
create index idx_files_type on public.files(user_id, type);
create index idx_files_created on public.files(user_id, create_date desc);
create index idx_files_size on public.files(user_id, local_size desc);
create index idx_files_hash on public.files(hash);
create index idx_files_phash on public.files(phash) where phash is not null;

-- ============================================================================
-- SOURCE TABLE
-- ============================================================================

create table public.source (
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id text not null,
  url text not null,
  content_type text,
  remote_size bigint,
  is_file boolean default true,
  url_source text,
  iframe boolean default false,
  embed text,
  modified_date timestamptz not null default now(),
  primary key (user_id, file_id, url),
  foreign key (user_id, file_id) references public.files(user_id, file_id) on delete cascade
);

create index idx_source_file_id on public.source(file_id);
create index idx_source_url on public.source(url);
create index idx_source_domain on public.source(user_id, url_source);

-- ============================================================================
-- MOUNTS TABLE
-- ============================================================================

create table public.mounts (
  mount_id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('Android', 'Windows', 'Wasabi')),
  mount_label text not null,
  device_id text,
  device_path text not null,
  create_date timestamptz not null default now(),
  is_active boolean default true
);

create index idx_mounts_user_id on public.mounts(user_id);
create index idx_mounts_platform on public.mounts(user_id, platform);
create index idx_mounts_active on public.mounts(user_id, is_active);

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================

create table public.locations (
  location_id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id text not null,
  mount_id integer not null references public.mounts(mount_id) on delete cascade,
  file_path text not null,
  has_thumb boolean default false,
  thumb_width integer,
  thumb_height integer,
  has_preview boolean default false,
  has_sprite boolean default false,
  sync_date timestamptz,
  local_modified timestamptz,
  unique (user_id, file_id, mount_id),
  foreign key (user_id, file_id) references public.files(user_id, file_id) on delete cascade
);

create index idx_locations_file_id on public.locations(file_id);
create index idx_locations_mount_id on public.locations(mount_id);
create index idx_locations_user_file_mount on public.locations(user_id, file_id, mount_id);
create index idx_locations_path on public.locations(user_id, mount_id, file_path);

-- ============================================================================
-- FOLDERS TABLE
-- ============================================================================

create table public.folders (
  folder_id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mount_id integer not null references public.mounts(mount_id) on delete cascade,
  folder_path text not null,
  parent_folder_id integer references public.folders(folder_id) on delete cascade,
  item_count integer default 0,
  last_modified timestamptz,
  create_date timestamptz not null default now()
);

create index idx_folders_mount on public.folders(mount_id, folder_path);
create index idx_folders_parent on public.folders(parent_folder_id);
create index idx_folders_user on public.folders(user_id);

-- ============================================================================
-- MOUNT_PAIRS TABLE
-- ============================================================================

create table public.mount_pairs (
  pair_id serial primary key,
  mount_a_id integer not null references public.mounts(mount_id) on delete cascade,
  mount_b_id integer not null references public.mounts(mount_id) on delete cascade,
  create_date timestamptz not null default now(),
  check (mount_a_id < mount_b_id),
  unique (mount_a_id, mount_b_id)
);

create index idx_mount_pairs_a on public.mount_pairs(mount_a_id);
create index idx_mount_pairs_b on public.mount_pairs(mount_b_id);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

create table public.tags (
  tag_id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text,
  tag_name text not null,
  remote_tag_id integer,
  usage_count integer default 0,
  create_date timestamptz not null default now(),
  modified_date timestamptz not null default now(),
  unique (user_id, namespace, tag_name)
);

create index idx_tags_user_id on public.tags(user_id);
create index idx_tags_name on public.tags(user_id, namespace, tag_name);
create index idx_tags_usage on public.tags(user_id, usage_count desc);
create index idx_tags_remote on public.tags(remote_tag_id) where remote_tag_id is not null;

-- ============================================================================
-- FILE_TAGS TABLE
-- ============================================================================

create table public.file_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id text not null,
  tag_id integer not null references public.tags(tag_id) on delete cascade,
  create_date timestamptz not null default now(),
  modified_date timestamptz not null default now(),
  primary key (user_id, file_id, tag_id),
  foreign key (user_id, file_id) references public.files(user_id, file_id) on delete cascade
);

create index idx_file_tags_file on public.file_tags(file_id);
create index idx_file_tags_tag on public.file_tags(tag_id);
create index idx_file_tags_user on public.file_tags(user_id);

-- ============================================================================
-- POSTS TABLE
-- ============================================================================

create table public.posts (
  post_id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id text not null,
  url text not null,
  domain text,
  post_date timestamptz,
  post_text text,
  post_user text,
  title text,
  create_date timestamptz not null default now(),
  modified_date timestamptz not null default now(),
  unique (user_id, file_id, url),
  foreign key (user_id, file_id) references public.files(user_id, file_id) on delete cascade
);

create index idx_posts_file_id on public.posts(file_id);
create index idx_posts_user_id on public.posts(user_id);
create index idx_posts_domain on public.posts(user_id, domain);
create index idx_posts_post_user on public.posts(user_id, post_user);
create index idx_posts_post_date on public.posts(user_id, post_date desc);
create index idx_posts_url on public.posts(url);

-- ============================================================================
-- DELETIONS TABLE
-- ============================================================================

create table public.deletions (
  deletion_id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id text not null,
  mount_id integer not null references public.mounts(mount_id) on delete cascade,
  deleted_date timestamptz not null default now(),
  synced_to_pairs boolean default false
);

create index idx_deletions_user_id on public.deletions(user_id);
create index idx_deletions_file_id on public.deletions(file_id);
create index idx_deletions_mount_id on public.deletions(mount_id);
create index idx_deletions_synced on public.deletions(synced_to_pairs);
create index idx_deletions_date on public.deletions(deleted_date desc);

-- ============================================================================
-- SHARED_LIBRARIES TABLE
-- ============================================================================

create table public.shared_libraries (
  share_id serial primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  guest_user_id uuid not null references auth.users(id) on delete cascade,
  share_type text not null check (share_type in ('mount', 'folder')),
  mount_id integer references public.mounts(mount_id) on delete cascade,
  folder_path text,
  permission_view boolean default true,
  permission_download boolean default false,
  permission_comment boolean default false,
  share_label text,
  created_date timestamptz not null default now(),
  revoked_date timestamptz,
  last_accessed_date timestamptz
);

create index idx_shared_owner on public.shared_libraries(owner_user_id);
create index idx_shared_guest on public.shared_libraries(guest_user_id);
create index idx_shared_active on public.shared_libraries(guest_user_id, revoked_date) where revoked_date is null;
create index idx_shared_mount on public.shared_libraries(mount_id);

-- ============================================================================
-- USER SETTINGS TABLES
-- ============================================================================

create table public.user_settings_crawl (
  user_id uuid primary key references auth.users(id) on delete cascade,
  show_subfolders boolean default false,
  thumbs_enabled boolean default true,
  always_bookmark_images boolean default true,
  always_bookmark_videos boolean default true,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now()
);

create table public.user_settings_folders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  justified_row_height integer default 170,
  justified_row_height_mobile integer default 120,
  list_icon_size integer default 52,
  list_icon_size_mobile integer default 40,
  thumbnail_size integer default 200,
  thumbnail_size_mobile integer default 150,
  show_filenames boolean default false,
  override_layout_mode text,
  override_sort_order text,
  override_grouped text,
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now()
);

create table public.user_settings_search (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout_mode text default 'grid' check (layout_mode in ('list', 'grid', 'justified')),
  sort_order text default 'newest' check (sort_order in ('a-z', 'z-a', 'newest', 'oldest', 'biggest', 'smallest')),
  grouped text default 'false',
  create_date timestamptz not null default now(),
  update_date timestamptz not null default now()
);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

alter table public.files enable row level security;
alter table public.source enable row level security;
alter table public.mounts enable row level security;
alter table public.locations enable row level security;
alter table public.folders enable row level security;
alter table public.mount_pairs enable row level security;
alter table public.tags enable row level security;
alter table public.file_tags enable row level security;
alter table public.posts enable row level security;
alter table public.deletions enable row level security;
alter table public.shared_libraries enable row level security;
alter table public.user_settings_crawl enable row level security;
alter table public.user_settings_folders enable row level security;
alter table public.user_settings_search enable row level security;

-- ============================================================================
-- RLS POLICIES (users can only access their own data)
-- ============================================================================

create policy "users_own_files" on public.files for all using (auth.uid() = user_id);
create policy "users_own_source" on public.source for all using (auth.uid() = user_id);
create policy "users_own_mounts" on public.mounts for all using (auth.uid() = user_id);
create policy "users_own_locations" on public.locations for all using (auth.uid() = user_id);
create policy "users_own_folders" on public.folders for all using (auth.uid() = user_id);
create policy "users_own_tags" on public.tags for all using (auth.uid() = user_id);
create policy "users_own_file_tags" on public.file_tags for all using (auth.uid() = user_id);
create policy "users_own_posts" on public.posts for all using (auth.uid() = user_id);
create policy "users_own_deletions" on public.deletions for all using (auth.uid() = user_id);
create policy "users_own_settings_crawl" on public.user_settings_crawl for all using (auth.uid() = user_id);
create policy "users_own_settings_folders" on public.user_settings_folders for all using (auth.uid() = user_id);
create policy "users_own_settings_search" on public.user_settings_search for all using (auth.uid() = user_id);

-- Mount pairs: user owns either mount
create policy "users_own_mount_pairs" on public.mount_pairs for all using (
  exists (select 1 from public.mounts where mount_id = mount_a_id and user_id = auth.uid())
  or exists (select 1 from public.mounts where mount_id = mount_b_id and user_id = auth.uid())
);

-- Shared libraries: user is owner or guest
create policy "users_shared_libraries" on public.shared_libraries for all using (
  auth.uid() = owner_user_id or auth.uid() = guest_user_id
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Tag usage count triggers
create or replace function public.increment_tag_usage() returns trigger as $$
begin
  update public.tags set usage_count = usage_count + 1 where tag_id = new.tag_id;
  return new;
end;
$$ language plpgsql;

create or replace function public.decrement_tag_usage() returns trigger as $$
begin
  update public.tags set usage_count = usage_count - 1 where tag_id = old.tag_id;
  return old;
end;
$$ language plpgsql;

create trigger file_tags_insert after insert on public.file_tags
  for each row execute function public.increment_tag_usage();

create trigger file_tags_delete after delete on public.file_tags
  for each row execute function public.decrement_tag_usage();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

select 'DONE - All tables created' as status;
select table_name from information_schema.tables
where table_schema = 'public'
and table_name in ('files', 'source', 'mounts', 'locations', 'folders', 'tags', 'posts')
order by table_name;
