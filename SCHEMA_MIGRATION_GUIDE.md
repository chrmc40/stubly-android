# Database Schema Migration Guide

## Overview

This guide helps you migrate from the basic auth schema to the full subscription/storage schema.

## What's Changed

### New Table: `subscription_tiers`
- Defines pricing tiers (free, basic, premium, enterprise)
- Includes storage limits, file limits, and features
- Pre-populated with 4 default tiers

### Extended Table: `profiles`
Added fields for:
- **Subscription tracking**: tier_id, google_play_token, subscription dates
- **Storage tracking**: storage_used_bytes, file_count_used
- **Moderation**: dmca_strike_count, account_status
- **Privacy**: encryption_enabled

### New Helper Functions
- `check_storage_quota(user_id)` - Check if user can upload more files
- `check_file_quota(user_id)` - Check if user has hit file count limit
- `is_subscription_active(user_id)` - Verify subscription is valid
- `record_dmca_strike(user_id)` - Increment DMCA strikes, auto-suspend at 3

---

## Migration Steps

### Option A: Fresh Start (Recommended for Development)

If you **don't have production users yet**, start fresh:

1. **Backup existing data** (if any):
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM public.profiles;
   ```
   Save the output just in case.

2. **Drop existing tables**:
   ```sql
   DROP TABLE IF EXISTS public.profiles CASCADE;
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
   DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
   ```

3. **Run the new schema**:
   - Open Supabase Dashboard → SQL Editor
   - Paste contents of `supabase-schema-v2.sql`
   - Click "Run"
   - Verify all tables/functions created successfully

4. **Test**:
   ```sql
   -- Should show 4 tiers
   SELECT * FROM subscription_tiers;

   -- Register a new test user in your app
   -- Then check if profile was created with free tier:
   SELECT username, tier_id, storage_used_bytes, account_status
   FROM profiles
   LIMIT 5;
   ```

---

### Option B: In-Place Migration (For Production)

If you **have existing users**, migrate in place:

1. **Create new tables first**:
   ```sql
   -- Create subscription_tiers table and populate defaults
   -- (Copy from supabase-schema-v2.sql lines 8-38)
   ```

2. **Add new columns to existing profiles table**:
   ```sql
   -- Subscription fields
   ALTER TABLE public.profiles
   ADD COLUMN IF NOT EXISTS tier_id INTEGER REFERENCES public.subscription_tiers(tier_id) DEFAULT 1,
   ADD COLUMN IF NOT EXISTS google_play_token TEXT,
   ADD COLUMN IF NOT EXISTS google_play_order_id TEXT,
   ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
   ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,

   -- Storage tracking
   ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
   ADD COLUMN IF NOT EXISTS file_count_used INTEGER DEFAULT 0,

   -- DMCA / Moderation
   ADD COLUMN IF NOT EXISTS dmca_strike_count INTEGER DEFAULT 0,
   ADD COLUMN IF NOT EXISTS dmca_strike_date TIMESTAMPTZ,
   ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active',

   -- Privacy/Security
   ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT false;

   -- Add constraint for account_status
   ALTER TABLE public.profiles
   ADD CONSTRAINT profiles_account_status_check
   CHECK (account_status IN ('active', 'suspended', 'banned'));
   ```

3. **Backfill existing users with free tier**:
   ```sql
   UPDATE public.profiles
   SET
     tier_id = (SELECT tier_id FROM subscription_tiers WHERE tier_name = 'free' LIMIT 1),
     account_status = 'active',
     storage_used_bytes = 0,
     file_count_used = 0,
     dmca_strike_count = 0,
     encryption_enabled = false
   WHERE tier_id IS NULL;
   ```

4. **Create new indexes**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_profiles_tier_id ON public.profiles(tier_id);
   CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
   CREATE INDEX IF NOT EXISTS idx_profiles_subscription_end ON public.profiles(subscription_end_date);
   ```

5. **Replace trigger function** with new version:
   ```sql
   -- Copy handle_new_user() from supabase-schema-v2.sql lines 146-175
   ```

6. **Create helper functions**:
   ```sql
   -- Copy all helper functions from supabase-schema-v2.sql lines 177-244
   ```

---

## Update TypeScript Types

Replace the types in `src/lib/config/supabase.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      subscription_tiers: {
        Row: {
          tier_id: number;
          tier_name: string;
          max_storage_bytes: number;
          max_file_count: number;
          price_monthly_cents: number | null;
          google_play_product_id: string | null;
          features: Record<string, any> | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscription_tiers']['Row'], 'tier_id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subscription_tiers']['Insert']>;
      };
      profiles: {
        Row: {
          // Auth fields
          id: string;
          username: string;
          email: string;
          android_id: string | null;
          is_anonymous: boolean;

          // Subscription fields
          tier_id: number;
          google_play_token: string | null;
          google_play_order_id: string | null;
          subscription_start_date: string | null;
          subscription_end_date: string | null;

          // Storage tracking
          storage_used_bytes: number;
          file_count_used: number;

          // DMCA / Moderation
          dmca_strike_count: number;
          dmca_strike_date: string | null;
          account_status: 'active' | 'suspended' | 'banned';

          // Privacy/Security
          encryption_enabled: boolean;

          // Timestamps
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
    };
    Functions: {
      check_storage_quota: {
        Args: { user_id: string };
        Returns: boolean;
      };
      check_file_quota: {
        Args: { user_id: string };
        Returns: boolean;
      };
      is_subscription_active: {
        Args: { user_id: string };
        Returns: boolean;
      };
      record_dmca_strike: {
        Args: { user_id: string };
        Returns: void;
      };
    };
  };
}
```

---

## Using the New Schema in Your App

### 1. Check Storage Quota Before Upload

```typescript
import { supabase } from '$lib/config/supabase';

async function canUploadFile(userId: string, fileSize: number): Promise<boolean> {
  // Check if user has space
  const { data, error } = await supabase.rpc('check_storage_quota', {
    user_id: userId
  });

  if (error || !data) return false;

  // Also check file count
  const { data: fileQuotaOk } = await supabase.rpc('check_file_quota', {
    user_id: userId
  });

  return fileQuotaOk ?? false;
}
```

### 2. Update Storage Usage After Upload

```typescript
async function recordFileUpload(userId: string, fileSize: number) {
  const { error } = await supabase
    .from('profiles')
    .update({
      storage_used_bytes: supabase.raw(`storage_used_bytes + ${fileSize}`),
      file_count_used: supabase.raw('file_count_used + 1')
    })
    .eq('id', userId);

  if (error) console.error('Failed to update storage:', error);
}
```

### 3. Verify Subscription Status

```typescript
async function checkPremiumAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_subscription_active', {
    user_id: userId
  });

  return data ?? false;
}
```

### 4. Handle Google Play Purchase

```typescript
async function processPurchase(
  userId: string,
  tierName: string,
  purchaseToken: string,
  orderId: string
) {
  // Get tier ID
  const { data: tier } = await supabase
    .from('subscription_tiers')
    .select('tier_id')
    .eq('tier_name', tierName)
    .single();

  if (!tier) throw new Error('Invalid tier');

  // Update user subscription
  const { error } = await supabase
    .from('profiles')
    .update({
      tier_id: tier.tier_id,
      google_play_token: purchaseToken,
      google_play_order_id: orderId,
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })
    .eq('id', userId);

  if (error) throw error;
}
```

### 5. Display User Quota in UI

```typescript
import { supabase } from '$lib/config/supabase';
import { authState } from '$lib/stores/authState';

async function getUserQuota() {
  const userId = $authState.user?.id;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      storage_used_bytes,
      file_count_used,
      subscription_tiers (
        max_storage_bytes,
        max_file_count,
        tier_name
      )
    `)
    .eq('id', userId)
    .single();

  return {
    storageUsed: profile.storage_used_bytes,
    storageMax: profile.subscription_tiers.max_storage_bytes,
    filesUsed: profile.file_count_used,
    filesMax: profile.subscription_tiers.max_file_count,
    tierName: profile.subscription_tiers.tier_name
  };
}
```

---

## Testing Checklist

After migration:

- [ ] New user signup creates profile with free tier
- [ ] Subscription tiers table has 4 rows
- [ ] `check_storage_quota()` returns true for new users
- [ ] `check_file_quota()` returns true for new users
- [ ] `is_subscription_active()` returns true for free tier users
- [ ] Existing users have tier_id set correctly
- [ ] All helper functions work without errors

---

## Rollback Plan

If something goes wrong:

```sql
-- Restore from backup (if you saved it)
-- OR drop new columns:
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS tier_id,
DROP COLUMN IF EXISTS google_play_token,
DROP COLUMN IF EXISTS google_play_order_id,
DROP COLUMN IF EXISTS subscription_start_date,
DROP COLUMN IF EXISTS subscription_end_date,
DROP COLUMN IF EXISTS storage_used_bytes,
DROP COLUMN IF EXISTS file_count_used,
DROP COLUMN IF EXISTS dmca_strike_count,
DROP COLUMN IF EXISTS dmca_strike_date,
DROP COLUMN IF EXISTS account_status,
DROP COLUMN IF EXISTS encryption_enabled;

-- Drop subscription_tiers table
DROP TABLE IF EXISTS public.subscription_tiers CASCADE;
```

Then re-run `supabase-schema.sql` (the original).

---

## Next Steps

1. Run the migration in Supabase Dashboard
2. Update TypeScript types in `src/lib/config/supabase.ts`
3. Test new user signup
4. Implement file upload with quota checks
5. Add subscription purchase flow
6. Build admin panel to view `subscription_stats` view
