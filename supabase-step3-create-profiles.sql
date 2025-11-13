-- STEP 3: Run this third - Create profiles table

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  android_id TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  tier_id INTEGER REFERENCES public.subscription_tiers(tier_id) DEFAULT 1,
  google_play_token TEXT,
  google_play_order_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  storage_used_bytes BIGINT DEFAULT 0,
  file_count_used INTEGER DEFAULT 0,
  dmca_strike_count INTEGER DEFAULT 0,
  dmca_strike_date TIMESTAMPTZ,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
  encryption_enabled BOOLEAN DEFAULT false,
  create_date TIMESTAMPTZ DEFAULT NOW(),
  modified_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_android_id ON public.profiles(android_id);
CREATE INDEX idx_profiles_tier ON public.profiles(tier_id);
CREATE INDEX idx_profiles_status ON public.profiles(account_status);
CREATE INDEX idx_profiles_subscription_end ON public.profiles(subscription_end_date);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Public can lookup email by username"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

SELECT 'profiles table created' as status;
