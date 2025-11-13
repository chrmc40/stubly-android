-- ============================================================================
-- DROP ALL TABLES, FUNCTIONS, AND TRIGGERS
-- ============================================================================
-- DANGER: This will delete ALL data in your database
-- Run this BEFORE deploying supabase-COMPLETE.sql to start fresh

do $$
begin
  -- Drop tables in reverse dependency order
  execute 'drop table if exists public.user_settings_search cascade';
  execute 'drop table if exists public.user_settings_folders cascade';
  execute 'drop table if exists public.user_settings_crawl cascade';
  execute 'drop table if exists public.shared_libraries cascade';
  execute 'drop table if exists public.deletions cascade';
  execute 'drop table if exists public.posts cascade';
  execute 'drop table if exists public.file_tags cascade';
  execute 'drop table if exists public.tags cascade';
  execute 'drop table if exists public.mount_pairs cascade';
  execute 'drop table if exists public.folders cascade';
  execute 'drop table if exists public.locations cascade';
  execute 'drop table if exists public.mounts cascade';
  execute 'drop table if exists public.source cascade';
  execute 'drop table if exists public.files cascade';
  execute 'drop table if exists public.profiles cascade';
  execute 'drop table if exists public.subscription_tiers cascade';

  -- Drop triggers
  execute 'drop trigger if exists on_auth_user_created on auth.users';
  execute 'drop trigger if exists set_updated_at_profiles on public.profiles';
  execute 'drop trigger if exists set_updated_at_tiers on public.subscription_tiers';
  execute 'drop trigger if exists file_tags_insert on public.file_tags';
  execute 'drop trigger if exists file_tags_delete on public.file_tags';

  -- Drop functions
  execute 'drop function if exists public.handle_new_user() cascade';
  execute 'drop function if exists public.handle_updated_at() cascade';
  execute 'drop function if exists public.check_storage_quota(uuid)';
  execute 'drop function if exists public.check_file_quota(uuid)';
  execute 'drop function if exists public.is_subscription_active(uuid)';
  execute 'drop function if exists public.record_dmca_strike(uuid)';
  execute 'drop function if exists public.increment_tag_usage() cascade';
  execute 'drop function if exists public.decrement_tag_usage() cascade';
exception when others then
  null;
end $$;

select 'All tables, functions, and triggers dropped successfully' as status;
