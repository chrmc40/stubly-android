-- Supabase Database Schema for stubly-android v2
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- This version includes subscription tiers, storage tracking, and DMCA management

-- ============================================================================
-- STEP 1: CREATE SUBSCRIPTION_TIERS TABLE FIRST
-- ============================================================================

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
-- STEP 2: DROP OLD PROFILES TABLE AND TRIGGERS
-- ============================================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;

-- Drop old functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Drop old table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- STEP 3: CREATE NEW PROFILES TABLE
-- ============================================================================

CREATE TABLE public.profiles (
  -- Auth fields
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  android_id TEXT,
  is_anonymous BOOLEAN DEFAULT false,

  -- Subscription fields
  tier_id INTEGER REFERENCES public.subscription_tiers(tier_id) DEFAULT 1,  -- Default to free tier
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: CREATE POLICIES
-- ============================================================================

-- Policies: Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policies: Public can lookup email by username (for login)
CREATE POLICY "Public can lookup email by username"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policies: Users can update their own profile
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
-- STEP 5: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_android_id ON public.profiles(android_id);
CREATE INDEX idx_profiles_tier_id ON public.profiles(tier_id);
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX idx_profiles_subscription_end ON public.profiles(subscription_end_date);
CREATE INDEX idx_tiers_name ON public.subscription_tiers(tier_name);

-- ============================================================================
-- STEP 6: CREATE FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create profile on user signup
CREATE FUNCTION public.handle_new_user()
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
    COALESCE(free_tier_id, 1),
    'active',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile after user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user has exceeded storage quota
CREATE FUNCTION public.check_storage_quota(user_id UUID)
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
CREATE FUNCTION public.check_file_quota(user_id UUID)
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

-- Function to check if subscription is active
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

  -- Free tier is always "active"
  IF tier_name = 'free' THEN
    RETURN true;
  END IF;

  -- Paid tiers need valid end date
  RETURN sub_end IS NOT NULL AND sub_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'subscription_tiers');

-- Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'subscription_tiers');

-- View subscription tiers
SELECT * FROM public.subscription_tiers ORDER BY tier_id;
