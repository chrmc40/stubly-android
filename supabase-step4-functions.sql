-- STEP 4: Run this fourth - Create all functions and triggers

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tiers
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_tier_id INTEGER;
BEGIN
  SELECT tier_id INTO free_tier_id FROM public.subscription_tiers WHERE tier_name = 'free' LIMIT 1;
  INSERT INTO public.profiles (
    id, username, email, android_id, is_anonymous, tier_id, account_status, encryption_enabled
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.check_storage_quota(user_id UUID)
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

CREATE OR REPLACE FUNCTION public.check_file_quota(user_id UUID)
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
  IF tier_name = 'free' THEN RETURN true; END IF;
  RETURN sub_end IS NOT NULL AND sub_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_dmca_strike(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET
    dmca_strike_count = dmca_strike_count + 1,
    dmca_strike_date = NOW(),
    account_status = CASE WHEN dmca_strike_count + 1 >= 3 THEN 'suspended' ELSE account_status END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'All functions and triggers created' as status;
