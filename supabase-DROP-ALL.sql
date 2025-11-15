-- ============================================================================
-- DROP ALL TABLES, FUNCTIONS, AND TRIGGERS
-- ============================================================================
-- DANGER: This will delete ALL data in your database
-- Run this BEFORE deploying supabase-COMPLETE.sql to start fresh

-- Drop triggers first
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists set_updated_at_profiles on public.profiles;
drop trigger if exists set_updated_at_tiers on public.subscription_tiers;
drop trigger if exists file_tags_insert on public.file_tags;
drop trigger if exists file_tags_delete on public.file_tags;

-- Drop functions
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_updated_at() cascade;
drop function if exists public.check_storage_quota(uuid);
drop function if exists public.check_file_quota(uuid);
drop function if exists public.is_subscription_active(uuid);
drop function if exists public.record_dmca_strike(uuid);
drop function if exists public.increment_storage_usage(uuid, bigint);
drop function if exists public.decrement_storage_usage(uuid, bigint);
drop function if exists public.increment_tag_usage() cascade;
drop function if exists public.decrement_tag_usage() cascade;

-- Drop tables in reverse dependency order (CASCADE will handle any remaining dependencies)
drop table if exists public.user_settings_search cascade;
drop table if exists public.user_settings_folders cascade;
drop table if exists public.user_settings_crawl cascade;
drop table if exists public.shared_libraries cascade;
drop table if exists public.deletions cascade;
drop table if exists public.posts cascade;
drop table if exists public.file_tags cascade;
drop table if exists public.tags cascade;
drop table if exists public.mount_pairs cascade;
drop table if exists public.folders cascade;
drop table if exists public.locations cascade;
drop table if exists public.mounts cascade;
drop table if exists public.source cascade;
drop table if exists public.files cascade;
drop table if exists public.profiles cascade;
drop table if exists public.subscription_tiers cascade;

select 'All tables, functions, and triggers dropped successfully' as status;
