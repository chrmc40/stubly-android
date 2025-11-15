-- Migration: Switch from Wasabi to Backblaze B2
-- Run this in Supabase SQL Editor after updating environment variables

-- 1. Update platform constraint to include Backblaze
ALTER TABLE public.mounts
DROP CONSTRAINT IF EXISTS mounts_platform_check;

ALTER TABLE public.mounts
ADD CONSTRAINT mounts_platform_check
CHECK (platform IN ('Android', 'Windows', 'Wasabi', 'Backblaze'));

-- 2. Optional: Migrate existing Wasabi mounts to Backblaze
-- Only run this if you want to update existing mounts
-- WARNING: This will change the platform for all existing Wasabi mounts

-- UPDATE public.mounts
-- SET platform = 'Backblaze',
--     device_path = REPLACE(device_path, 'wasabi://', 'b2://'),
--     modified_date = now()
-- WHERE platform = 'Wasabi';

-- 3. Verify the changes
SELECT
  mount_id,
  user_id,
  platform,
  mount_label,
  device_path,
  storage_type,
  is_active
FROM public.mounts
ORDER BY create_date DESC;
