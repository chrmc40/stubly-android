-- Fix for existing users created before the trigger was added
-- This will create profiles for any auth.users that don't have a profile yet

INSERT INTO public.profiles (id, username, android_id, is_anonymous)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', 'user_' || substr(u.id::text, 1, 8)),
  u.raw_user_meta_data->>'android_id',
  COALESCE((u.raw_user_meta_data->>'is_anonymous')::boolean, false)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Verify the profiles were created
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  p.username,
  p.is_anonymous,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
