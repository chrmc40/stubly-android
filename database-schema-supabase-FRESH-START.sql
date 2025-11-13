-- ============================================================================
-- STUBLY SUPABASE SCHEMA - FRESH START
-- ============================================================================
-- This DROPS all existing tables and recreates from scratch
-- Run this in Supabase Dashboard → SQL Editor
-- WARNING: This will delete all existing user profile data!

-- ============================================================================
-- STEP 1: DROP EVERYTHING
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_tiers ON public.subscription_tiers;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.check_storage_quota(UUID);
DROP FUNCTION IF EXISTS public.check_file_quota(UUID);
DROP FUNCTION IF EXISTS public.is_subscription_active(UUID);
DROP FUNCTION IF EXISTS public.record_dmca_strike(UUID);

-- Drop tables (CASCADE removes all dependencies)
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.subscription_tiers CASCADE;

-- ============================================================================
-- STEP 2: CREATE SUBSCRIPTION_TIERS
-- ============================================================================

CREATE TABLE public.subscription_tiers (
  tier_id SERIAL PRIMARY KEY,
  tier_name TEXT UNIQUE NOT NULL,
  google_play_product_id TEXT UNIQUE,
  storage_quota_bytes BIGINT NOT NULL,
  file_count_quota INTEGER NOT NULL,
  price_monthly INTEGER,  -- cents
  price_yearly INTEGER,   -- cents
  is_active BOOLEAN DEFAULT true,
  create_date TIMESTAMPTZ DEFAULT NOW(),
  modified_date TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tiers BEFORE enabling RLS
INSERT INTO public.subscription_tiers
  (tier_name, google_play_product_id, storage_quota_bytes, file_count_quota, price_monthly, price_yearly)
VALUES
  ('free', NULL, 1073741824, 100, NULL, NULL),  -- 1GB, 100 files
  ('basic', 'basic_monthly', 10737418240, 1000, 299, 2990),  -- 10GB, 1k files, $2.99/mo
  ('premium', 'premium_monthly', 107374182400, 10000, 999, 9990),  -- 100GB, 10k files, $9.99/mo
  ('enterprise', 'enterprise_monthly', 1099511627776, 100000, 4999, 49990);  -- 1TB, 100k files

-- Now enable RLS and create policies
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tiers"
  ON public.subscription_tiers
  FOR SELECT
  USING (is_active = true);

-- Create indexes
CREATE INDEX idx_tiers_active ON public.subscription_tiers(is_active);
CREATE INDEX idx_tiers_product_id ON public.subscription_tiers(google_play_product_id);

-- ============================================================================
-- STEP 3: CREATE PROFILES TABLE
-- ============================================================================

CREATE TABLE public.profiles (
  -- Auth fields
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  android_id TEXT,
  is_anonymous BOOLEAN DEFAULT false,

  -- Subscription fields
  tier_id INTEGER REFERENCES public.subscription_tiers(tier_id) DEFAULT 1,
  google_play_token TEXT,
  google_play_order_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,

  -- Storage tracking
  storage_used_bytes BIGINT DEFAULT 0,
  file_count_used INTEGER DEFAULT 0,

  -- DMCA / Moderation
  dmca_strike_count INTEGER DEFAULT 0,
  dmca_strike_date TIMESTAMPTZ,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),

  -- Privacy/Security
  encryption_enabled BOOLEAN DEFAULT false,

  -- Timestamps
  create_date TIMESTAMPTZ DEFAULT NOW(),
  modified_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Public can lookup email by username"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Indexes
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_android_id ON public.profiles(android_id);
CREATE INDEX idx_profiles_tier ON public.profiles(tier_id);
CREATE INDEX idx_profiles_status ON public.profiles(account_status);
CREATE INDEX idx_profiles_subscription_end ON public.profiles(subscription_end_date);

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

-- Update modified_date trigger
CREATE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tiers
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_tier_id INTEGER;
BEGIN
  SELECT tier_id INTO free_tier_id
  FROM public.subscription_tiers
  WHERE tier_name = 'free'
  LIMIT 1;

  INSERT INTO public.profiles (
    id,
    username,
    email,
    android_id,
    is_anonymous,
    tier_id,
    account_status,
    encryption_enabled
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.email,
    NEW.raw_user_meta_data->>'android_id',
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false),
    COALESCE(free_tier_id, 1),
    'active',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 5: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Check storage quota
CREATE FUNCTION public.check_storage_quota(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage BIGINT;
  max_storage BIGINT;
BEGIN
  SELECT p.storage_used_bytes, st.storage_quota_bytes
  INTO current_usage, max_storage
  FROM public.profiles p
  JOIN public.subscription_tiers st ON p.tier_id = st.tier_id
  WHERE p.id = user_id;

  RETURN current_usage < max_storage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check file count quota
CREATE FUNCTION public.check_file_quota(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT p.file_count_used, st.file_count_quota
  INTO current_count, max_count
  FROM public.profiles p
  JOIN public.subscription_tiers st ON p.tier_id = st.tier_id
  WHERE p.id = user_id;

  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if subscription is active
CREATE FUNCTION public.is_subscription_active(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_end TIMESTAMPTZ;
  tier_name TEXT;
BEGIN
  SELECT p.subscription_end_date, st.tier_name
  INTO sub_end, tier_name
  FROM public.profiles p
  JOIN public.subscription_tiers st ON p.tier_id = st.tier_id
  WHERE p.id = user_id;

  IF tier_name = 'free' THEN
    RETURN true;
  END IF;

  RETURN sub_end IS NOT NULL AND sub_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record DMCA strike
CREATE FUNCTION public.record_dmca_strike(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    dmca_strike_count = dmca_strike_count + 1,
    dmca_strike_date = NOW(),
    account_status = CASE
      WHEN dmca_strike_count + 1 >= 3 THEN 'suspended'
      ELSE account_status
    END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: BACKFILL EXISTING USERS (if any)
-- ============================================================================

-- Create profiles for any existing auth.users who don't have a profile yet
DO $$
DECLARE
  free_tier_id INTEGER;
  user_record RECORD;
BEGIN
  -- Get free tier ID
  SELECT tier_id INTO free_tier_id
  FROM public.subscription_tiers
  WHERE tier_name = 'free'
  LIMIT 1;

  -- Loop through existing users without profiles
  FOR user_record IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.profiles (
      id,
      username,
      email,
      android_id,
      is_anonymous,
      tier_id,
      account_status,
      encryption_enabled
    )
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'username', 'user_' || substr(user_record.id::text, 1, 8)),
      user_record.email,
      user_record.raw_user_meta_data->>'android_id',
      COALESCE((user_record.raw_user_meta_data->>'is_anonymous')::boolean, false),
      free_tier_id,
      'active',
      false
    );
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ Schema created successfully' as status;

SELECT 'Tables:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'subscription_tiers')
ORDER BY table_name;

SELECT 'Subscription tiers:' as info;
SELECT
  tier_name,
  ROUND(storage_quota_bytes / 1073741824.0, 1) as storage_gb,
  file_count_quota,
  COALESCE(price_monthly / 100.0, 0) as price_usd
FROM public.subscription_tiers
ORDER BY tier_id;

SELECT 'Existing users with profiles:' as info;
SELECT COUNT(*) as user_count FROM public.profiles;

SELECT 'RLS Policies:' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
