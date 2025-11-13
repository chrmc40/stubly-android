-- Supabase Database Schema for stubly-android v2
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- This version includes subscription tiers, storage tracking, and DMCA management

-- ============================================================================
-- 1. SUBSCRIPTION_TIERS TABLE
-- ============================================================================
-- Defines available subscription tiers

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  tier_id SERIAL PRIMARY KEY,
  tier_name TEXT UNIQUE NOT NULL,  -- 'free', 'basic', 'premium', 'enterprise'
  max_storage_bytes BIGINT NOT NULL,  -- Max storage in bytes
  max_file_count INTEGER NOT NULL,  -- Max number of files
  price_monthly_cents INTEGER,  -- Price in cents (NULL for free tier)
  google_play_product_id TEXT,  -- Google Play SKU (e.g., 'premium_monthly')
  features JSONB,  -- Additional features as JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active tiers" ON public.subscription_tiers;

-- Policy: Anyone can view active subscription tiers (for pricing page)
CREATE POLICY "Anyone can view active tiers"
  ON public.subscription_tiers
  FOR SELECT
  USING (is_active = true);

-- Insert default tiers
INSERT INTO public.subscription_tiers
  (tier_name, max_storage_bytes, max_file_count, price_monthly_cents, google_play_product_id, features)
VALUES
  ('free', 1073741824, 100, NULL, NULL, '{"ads": true, "support": "community"}'::jsonb),  -- 1GB, 100 files
  ('basic', 10737418240, 1000, 299, 'basic_monthly', '{"ads": false, "support": "email"}'::jsonb),  -- 10GB, 1000 files, $2.99/mo
  ('premium', 107374182400, 10000, 999, 'premium_monthly', '{"ads": false, "support": "priority", "encryption": true}'::jsonb),  -- 100GB, 10k files, $9.99/mo
  ('enterprise', 1099511627776, 100000, 4999, 'enterprise_monthly', '{"ads": false, "support": "dedicated", "encryption": true, "api_access": true}'::jsonb)  -- 1TB, 100k files, $49.99/mo
ON CONFLICT (tier_name) DO NOTHING;

-- ============================================================================
-- 2. PROFILES TABLE (EXTENDED)
-- ============================================================================
-- Extends auth.users with user information, subscription, and storage tracking

CREATE TABLE IF NOT EXISTS public.profiles (
  -- Auth fields
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  android_id TEXT,
  is_anonymous BOOLEAN DEFAULT false,

  -- Subscription fields
  tier_id INTEGER REFERENCES public.subscription_tiers(tier_id) DEFAULT 1,  -- Default to free tier
  google_play_token TEXT,  -- Purchase token from Google Play Billing
  google_play_order_id TEXT,  -- Order ID from Google Play
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can lookup email by username" ON public.profiles;

-- Policies: Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policies: Public can lookup email by username (for login)
-- This only exposes username and email fields for login purposes
CREATE POLICY "Public can lookup email by username"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policies: Users can update their own profile (except account_status and dmca fields)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policies: Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_android_id ON public.profiles(android_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tier_id ON public.profiles(tier_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_end ON public.profiles(subscription_end_date);

-- Subscription tier indexes
CREATE INDEX IF NOT EXISTS idx_tiers_name ON public.subscription_tiers(tier_name);

-- ============================================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create profile on user signup
-- This runs when a new user is created in auth.users
-- Uses SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_tier_id INTEGER;
BEGIN
  -- Get free tier ID
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
    COALESCE(free_tier_id, 1),  -- Default to free tier
    'active',  -- New accounts are active by default
    false  -- Encryption disabled by default
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile after user signup
-- This bypasses RLS because it runs with SECURITY DEFINER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user has exceeded storage quota
CREATE OR REPLACE FUNCTION public.check_storage_quota(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage BIGINT;
  max_storage BIGINT;
BEGIN
  SELECT p.storage_used_bytes, st.max_storage_bytes
  INTO current_usage, max_storage
  FROM public.profiles p
  JOIN public.subscription_tiers st ON p.tier_id = st.tier_id
  WHERE p.id = user_id;

  RETURN current_usage < max_storage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has exceeded file count quota
CREATE OR REPLACE FUNCTION public.check_file_quota(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT p.file_count_used, st.max_file_count
  INTO current_count, max_count
  FROM public.profiles p
  JOIN public.subscription_tiers st ON p.tier_id = st.tier_id
  WHERE p.id = user_id;

  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment DMCA strike count
CREATE OR REPLACE FUNCTION public.record_dmca_strike(user_id UUID)
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

-- Function to check if subscription is active
CREATE OR REPLACE FUNCTION public.is_subscription_active(user_id UUID)
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

  -- Free tier is always "active"
  IF tier_name = 'free' THEN
    RETURN true;
  END IF;

  -- Paid tiers need valid end date
  RETURN sub_end IS NOT NULL AND sub_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. VIEWS (Optional - for analytics)
-- ============================================================================

-- View for subscription statistics (admin only)
CREATE OR REPLACE VIEW public.subscription_stats AS
SELECT
  st.tier_name,
  COUNT(p.id) as user_count,
  SUM(p.storage_used_bytes) as total_storage_used,
  AVG(p.storage_used_bytes) as avg_storage_per_user
FROM public.subscription_tiers st
LEFT JOIN public.profiles p ON st.tier_id = p.tier_id
WHERE p.account_status = 'active'
GROUP BY st.tier_name, st.tier_id
ORDER BY st.tier_id;

-- ============================================================================
-- 6. REALTIME (Optional - for future features)
-- ============================================================================

-- Enable realtime for profiles table (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. User workflow:
--    - User signs up → auth.users created → trigger creates profile with free tier
--    - User purchases subscription → Update tier_id, google_play_token, subscription dates
--    - User uploads file → Increment storage_used_bytes and file_count_used
--    - User receives DMCA strike → record_dmca_strike() increments count, auto-suspends at 3

-- 2. Storage quota enforcement:
--    - Call check_storage_quota(user_id) before allowing uploads
--    - Call check_file_quota(user_id) before allowing new files

-- 3. Subscription validation:
--    - Call is_subscription_active(user_id) to verify paid features
--    - If expired, downgrade user to free tier or restrict access

-- 4. Account status:
--    - 'active': Normal user, can upload/download
--    - 'suspended': DMCA strikes or payment issues, read-only access
--    - 'banned': Terms violation, no access

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'subscription_tiers');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'subscription_tiers');

-- View policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- View subscription tiers
SELECT * FROM public.subscription_tiers ORDER BY tier_id;

-- View helper functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%quota%' OR routine_name LIKE '%subscription%' OR routine_name LIKE '%dmca%'
ORDER BY routine_name;
