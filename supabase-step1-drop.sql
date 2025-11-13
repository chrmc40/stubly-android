-- STEP 1: Run this first - Drop everything

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_tiers ON public.subscription_tiers;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.check_storage_quota(UUID);
DROP FUNCTION IF EXISTS public.check_file_quota(UUID);
DROP FUNCTION IF EXISTS public.is_subscription_active(UUID);
DROP FUNCTION IF EXISTS public.record_dmca_strike(UUID);

DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.subscription_tiers CASCADE;
