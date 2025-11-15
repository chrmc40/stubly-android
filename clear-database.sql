-- Clear All Data from Stubly Database
-- This deletes all records but preserves table structure and constraints
-- Run this in Supabase SQL Editor

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- Delete all data in reverse dependency order
-- (child tables first, then parent tables)

-- 1. Delete LOCATIONS (references FILES, MOUNTS, FOLDERS)
DELETE FROM public.locations;

-- 2. Delete FOLDERS (references MOUNTS, self-referential)
DELETE FROM public.folders;

-- 3. Delete FILES (no dependencies)
DELETE FROM public.files;

-- 4. Delete MOUNTS (references PROFILES)
DELETE FROM public.mounts;

-- 5. Reset PROFILES storage counters (don't delete user accounts)
UPDATE public.profiles
SET
  storage_used_bytes = 0,
  file_count_used = 0,
  modified_date = now();

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify deletion
SELECT 'FILES' as table_name, COUNT(*) as record_count FROM public.files
UNION ALL
SELECT 'LOCATIONS', COUNT(*) FROM public.locations
UNION ALL
SELECT 'MOUNTS', COUNT(*) FROM public.mounts
UNION ALL
SELECT 'FOLDERS', COUNT(*) FROM public.folders
UNION ALL
SELECT 'PROFILES', COUNT(*) FROM public.profiles
ORDER BY table_name;

-- Show reset profile stats
SELECT
  id,
  email,
  storage_used_bytes,
  file_count_used
FROM public.profiles
ORDER BY email;
