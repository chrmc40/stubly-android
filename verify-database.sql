-- Verify Upload System Database State
-- Run these queries in Supabase SQL Editor to verify everything is working

-- 1. Check FILES table - should show the 3 uploaded files
SELECT
  file_id,
  user_id,
  hash,
  type,
  mime_type,
  local_size,
  format,
  create_date
FROM public.files
ORDER BY create_date DESC;

-- 2. Check LOCATIONS table - should show all user file associations
SELECT
  l.location_id,
  l.user_id,
  l.file_id,
  l.mount_id,
  l.file_path,
  l.sync_date,
  f.hash,
  f.mime_type,
  f.local_size
FROM public.locations l
JOIN public.files f ON l.file_id = f.file_id
ORDER BY l.sync_date DESC;

-- 3. Check MOUNTS table - should show Wasabi mount
SELECT
  mount_id,
  user_id,
  platform,
  mount_label,
  device_path,
  storage_type,
  is_active,
  create_date
FROM public.mounts
ORDER BY mount_id;

-- 4. Check PROFILES storage usage - should show updated quotas
SELECT
  id,
  username,
  email,
  storage_used_bytes,
  file_count_used,
  tier_id
FROM public.profiles;

-- 5. Verify deduplication - check if any files have multiple locations
SELECT
  f.file_id,
  f.hash,
  f.mime_type,
  f.local_size,
  COUNT(l.location_id) as location_count,
  array_agg(l.user_id) as users_with_file
FROM public.files f
JOIN public.locations l ON f.file_id = l.file_id
GROUP BY f.file_id, f.hash, f.mime_type, f.local_size
ORDER BY location_count DESC;

-- 6. Check folder structure (if any files were uploaded to folders)
SELECT
  folder_id,
  user_id,
  mount_id,
  folder_path,
  parent_folder_id,
  item_count,
  last_modified,
  create_date
FROM public.folders
ORDER BY create_date DESC;

-- 7. Verify RLS is working - this should only show files for the logged-in user
SELECT
  f.file_id,
  f.hash,
  f.mime_type,
  l.location_id,
  l.user_id
FROM public.files f
LEFT JOIN public.locations l ON f.file_id = l.file_id
WHERE l.user_id = auth.uid() OR f.user_id = auth.uid();

-- 8. Check total storage per mount
SELECT
  m.mount_id,
  m.mount_label,
  m.storage_type,
  COUNT(l.location_id) as file_count,
  SUM(f.local_size) as total_bytes
FROM public.mounts m
LEFT JOIN public.locations l ON m.mount_id = l.mount_id
LEFT JOIN public.files f ON l.file_id = f.file_id
GROUP BY m.mount_id, m.mount_label, m.storage_type
ORDER BY m.mount_id;

-- 9. Verify the specific files from dev.log
-- Expected hashes from the logs:
-- 72cc819208a2f56ec23548bbd0af463a29cf6b66a9c6461586793af3028cf246 (avatar.png, 1004 bytes, uploaded 2x)
-- 738ceeae99a4fc010ac6110f4a78bb165ac8428e831ceff2732c28dcb35da169 (wp15751834.jpg, 715881 bytes)
-- 506038c4f1af9a0fa466d02ea9da3696b8b17f129c6a5cfb480c11813632c554 (wp12371347.png, 14190032 bytes, uploaded 2x)
-- 1f83482e61bfef1bc47c09d610161309ab1ac930183e68c5adefda632ae3a036 (uwp4885223.jpeg, 835207 bytes)

SELECT
  file_id,
  local_size,
  mime_type,
  (SELECT COUNT(*) FROM public.locations WHERE file_id = f.file_id) as times_uploaded
FROM public.files f
WHERE file_id IN (
  '72cc819208a2f56ec23548bbd0af463a29cf6b66a9c6461586793af3028cf246',
  '738ceeae99a4fc010ac6110f4a78bb165ac8428e831ceff2732c28dcb35da169',
  '506038c4f1af9a0fa466d02ea9da3696b8b17f129c6a5cfb480c11813632c554',
  '1f83482e61bfef1bc47c09d610161309ab1ac930183e68c5adefda632ae3a036'
);
