-- Detailed LOCATIONS verification
-- Check all LOCATIONS records created during testing

SELECT
  l.location_id,
  l.user_id,
  l.file_id,
  l.mount_id,
  l.file_path,
  l.sync_date,
  f.local_size,
  f.mime_type
FROM public.locations l
JOIN public.files f ON l.file_id = f.file_id
ORDER BY l.location_id;

-- Count uploads per file (should show how many LOCATIONS each file has)
SELECT
  f.file_id,
  f.mime_type,
  f.local_size,
  COUNT(l.location_id) as location_count
FROM public.files f
LEFT JOIN public.locations l ON f.file_id = l.file_id
GROUP BY f.file_id, f.mime_type, f.local_size
ORDER BY f.file_id;
