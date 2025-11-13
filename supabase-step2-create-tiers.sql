-- STEP 2: Run this second - Create subscription_tiers table and insert data

CREATE TABLE public.subscription_tiers (
  tier_id SERIAL PRIMARY KEY,
  tier_name TEXT UNIQUE NOT NULL,
  google_play_product_id TEXT UNIQUE,
  storage_quota_bytes BIGINT NOT NULL,
  file_count_quota INTEGER NOT NULL,
  price_monthly INTEGER,
  price_yearly INTEGER,
  is_active BOOLEAN DEFAULT true,
  create_date TIMESTAMPTZ DEFAULT NOW(),
  modified_date TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.subscription_tiers
  (tier_name, google_play_product_id, storage_quota_bytes, file_count_quota, price_monthly, price_yearly)
VALUES
  ('free', NULL, 1073741824, 100, NULL, NULL),
  ('basic', 'basic_monthly', 10737418240, 1000, 299, 2990),
  ('premium', 'premium_monthly', 107374182400, 10000, 999, 9990),
  ('enterprise', 'enterprise_monthly', 1099511627776, 100000, 4999, 49990);

CREATE INDEX idx_tiers_active ON public.subscription_tiers(is_active);
CREATE INDEX idx_tiers_product_id ON public.subscription_tiers(google_play_product_id);

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tiers"
  ON public.subscription_tiers FOR SELECT
  USING (is_active = true);

SELECT * FROM public.subscription_tiers;
