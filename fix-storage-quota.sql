-- Fix Storage Quota Bug
-- This script recalculates storage_used_bytes and file_count_used for all users
-- based on the actual LOCATIONS records in the database.
--
-- Run this after deploying the upload API fix to correct the over-charged quotas.

-- Recalculate storage usage for all users
DO $$
DECLARE
  user_record RECORD;
  total_bytes BIGINT;
  total_files INTEGER;
BEGIN
  -- Loop through each user
  FOR user_record IN
    SELECT DISTINCT user_id FROM public.locations
  LOOP
    -- Calculate total storage from LOCATIONS (sum of file sizes)
    SELECT
      COALESCE(SUM(f.local_size), 0),
      COUNT(DISTINCT l.location_id)
    INTO total_bytes, total_files
    FROM public.locations l
    JOIN public.files f ON l.file_id = f.file_id
    WHERE l.user_id = user_record.user_id;

    -- Update the user's profile
    UPDATE public.profiles
    SET
      storage_used_bytes = total_bytes,
      file_count_used = total_files,
      modified_date = now()
    WHERE id = user_record.user_id;

    RAISE NOTICE 'Updated user %: % bytes, % files',
      user_record.user_id, total_bytes, total_files;
  END LOOP;

  -- Reset any users with no locations to 0
  UPDATE public.profiles
  SET
    storage_used_bytes = 0,
    file_count_used = 0,
    modified_date = now()
  WHERE id NOT IN (SELECT DISTINCT user_id FROM public.locations);

  RAISE NOTICE 'Storage quota recalculation complete';
END $$;

-- Verify the results
SELECT
  p.id,
  p.username,
  p.storage_used_bytes,
  p.file_count_used,
  COUNT(l.location_id) as actual_location_count,
  SUM(f.local_size) as actual_storage_bytes
FROM public.profiles p
LEFT JOIN public.locations l ON p.id = l.user_id
LEFT JOIN public.files f ON l.file_id = f.file_id
GROUP BY p.id, p.username, p.storage_used_bytes, p.file_count_used
ORDER BY p.username;
