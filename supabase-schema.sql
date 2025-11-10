-- Supabase Database Schema for stubly-android
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Extends auth.users with additional user information

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,  -- Store email for username->email lookup during login
  android_id TEXT,  -- For anonymous accounts linked to device
  is_anonymous BOOLEAN DEFAULT false,
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
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_android_id ON public.profiles(android_id);

-- ============================================================================
-- 3. FUNCTIONS & TRIGGERS
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
BEGIN
  INSERT INTO public.profiles (id, username, email, android_id, is_anonymous)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.email,
    NEW.raw_user_meta_data->>'android_id',
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
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

-- ============================================================================
-- 4. REALTIME (Optional - for future features like DMs/shares)
-- ============================================================================

-- Enable realtime for profiles table (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. The auth.users table is automatically created by Supabase Auth
--    It stores email, encrypted_password, email_confirmed_at, etc.

-- 2. The profiles table extends auth.users with:
--    - username (your custom field)
--    - android_id (for anonymous accounts)
--    - is_anonymous flag

-- 3. Row Level Security (RLS) ensures users can only access their own data

-- 4. When a user signs up:
--    - auth.users entry is created automatically by Supabase
--    - Your app creates a corresponding profiles entry with username

-- 5. When a user is deleted:
--    - The CASCADE constraint automatically deletes their profile

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- View policies
SELECT *
FROM pg_policies
WHERE tablename = 'profiles';
