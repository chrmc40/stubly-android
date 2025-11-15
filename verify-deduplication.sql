-- Verify Deduplication Working Correctly
-- This query checks if files uploaded multiple times are properly deduplicated

-- Check how many LOCATIONS records exist per file_id
-- Files uploaded multiple times should show location_count > 1
SELECT
  f.file_id,
  f.mime_type,
  f.local_size,
  COUNT(l.location_id) as location_count,
  array_agg(l.location_id ORDER BY l.location_id) as location_ids,
  array_agg(l.sync_date ORDER BY l.location_id) as sync_dates
FROM public.files f
LEFT JOIN public.locations l ON f.file_id = l.file_id
GROUP BY f.file_id, f.mime_type, f.local_size
ORDER BY location_count DESC, f.file_id;

-- Expected results based on dev.log:
-- 72cc819208a2f56ec23548bbd0af463a29cf6b66a9c6461586793af3028cf246 - 2 locations (avatar.png uploaded twice)
-- 506038c4f1af9a0fa466d02ea9da3696b8b17f129c6a5cfb480c11813632c554 - 2 locations (wp12371347.png uploaded twice)
-- 738ceeae99a4fc010ac6110f4a78bb165ac8428e831ceff2732c28dcb35da169 - 1 location (wp15751834.jpg)
-- 1f83482e61bfef1bc47c09d610161309ab1ac930183e68c5adefda632ae3a036 - 1 location (uwp4885223.jpeg)

-- Verify LOCATIONS table uniqueness constraint
-- This ensures same user can't upload same file to same mount multiple times
SELECT
  user_id,
  file_id,
  mount_id,
  COUNT(*) as duplicate_count
FROM public.locations
GROUP BY user_id, file_id, mount_id
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates allowed by unique constraint)
