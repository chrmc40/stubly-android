# Subscription & Storage Usage Examples

Quick reference for common operations with the new schema.

---

## 1. Get User's Current Tier and Quota

```typescript
import { supabase } from '$lib/config/supabase';

async function getUserTierInfo(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      username,
      storage_used_bytes,
      file_count_used,
      account_status,
      subscription_end_date,
      subscription_tiers (
        tier_name,
        max_storage_bytes,
        max_file_count,
        price_monthly_cents,
        features
      )
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    username: data.username,
    tier: data.subscription_tiers.tier_name,
    storage: {
      used: data.storage_used_bytes,
      max: data.subscription_tiers.max_storage_bytes,
      percentUsed: (data.storage_used_bytes / data.subscription_tiers.max_storage_bytes) * 100
    },
    files: {
      used: data.file_count_used,
      max: data.subscription_tiers.max_file_count,
      percentUsed: (data.file_count_used / data.subscription_tiers.max_file_count) * 100
    },
    features: data.subscription_tiers.features,
    accountStatus: data.account_status,
    subscriptionExpires: data.subscription_end_date
  };
}
```

**Usage:**
```typescript
const info = await getUserTierInfo($authState.user.id);
console.log(`Tier: ${info.tier}`);
console.log(`Storage: ${info.storage.percentUsed.toFixed(1)}% used`);
console.log(`Files: ${info.files.used} / ${info.files.max}`);
```

---

## 2. Check If User Can Upload a File

```typescript
async function canUploadFile(userId: string, fileSizeBytes: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Check storage quota
  const { data: hasStorageSpace } = await supabase.rpc('check_storage_quota', {
    user_id: userId
  });

  if (!hasStorageSpace) {
    return { allowed: false, reason: 'Storage quota exceeded' };
  }

  // Check file count quota
  const { data: hasFileSlots } = await supabase.rpc('check_file_quota', {
    user_id: userId
  });

  if (!hasFileSlots) {
    return { allowed: false, reason: 'File count limit reached' };
  }

  // Check account status
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_status')
    .eq('id', userId)
    .single();

  if (profile?.account_status !== 'active') {
    return { allowed: false, reason: 'Account suspended or banned' };
  }

  // Double-check actual numbers (belt and suspenders)
  const { data: userInfo } = await supabase
    .from('profiles')
    .select(`
      storage_used_bytes,
      subscription_tiers (max_storage_bytes)
    `)
    .eq('id', userId)
    .single();

  if (!userInfo) {
    return { allowed: false, reason: 'User not found' };
  }

  const wouldExceed =
    userInfo.storage_used_bytes + fileSizeBytes > userInfo.subscription_tiers.max_storage_bytes;

  if (wouldExceed) {
    return { allowed: false, reason: 'File too large for remaining storage' };
  }

  return { allowed: true };
}
```

**Usage:**
```typescript
const fileSize = 1024 * 1024 * 50; // 50MB
const check = await canUploadFile($authState.user.id, fileSize);

if (!check.allowed) {
  alert(`Cannot upload: ${check.reason}`);
} else {
  // Proceed with upload
}
```

---

## 3. Record File Upload

```typescript
async function recordFileUpload(userId: string, fileSizeBytes: number) {
  const { error } = await supabase
    .from('profiles')
    .update({
      storage_used_bytes: supabase.raw(`storage_used_bytes + ${fileSizeBytes}`),
      file_count_used: supabase.raw('file_count_used + 1')
    })
    .eq('id', userId);

  if (error) throw error;
}
```

**Usage:**
```typescript
// After successful file upload
await recordFileUpload($authState.user.id, uploadedFile.size);
```

---

## 4. Record File Deletion

```typescript
async function recordFileDeletion(userId: string, fileSizeBytes: number) {
  const { error } = await supabase
    .from('profiles')
    .update({
      storage_used_bytes: supabase.raw(`GREATEST(0, storage_used_bytes - ${fileSizeBytes})`),
      file_count_used: supabase.raw('GREATEST(0, file_count_used - 1)')
    })
    .eq('id', userId);

  if (error) throw error;
}
```

**Note:** `GREATEST(0, ...)` prevents negative values.

---

## 5. Get Available Subscription Tiers

```typescript
async function getAvailableTiers() {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('is_active', true)
    .order('tier_id');

  if (error) throw error;

  return data.map(tier => ({
    id: tier.tier_id,
    name: tier.tier_name,
    priceMonthly: tier.price_monthly_cents ? tier.price_monthly_cents / 100 : 0,
    storage: tier.max_storage_bytes,
    storageGB: (tier.max_storage_bytes / (1024 ** 3)).toFixed(1),
    maxFiles: tier.max_file_count,
    productId: tier.google_play_product_id,
    features: tier.features
  }));
}
```

**Usage:**
```typescript
const tiers = await getAvailableTiers();

// Display in pricing page
{#each tiers as tier}
  <div class="pricing-card">
    <h3>{tier.name}</h3>
    <p>${tier.priceMonthly}/month</p>
    <ul>
      <li>{tier.storageGB} GB storage</li>
      <li>Up to {tier.maxFiles} files</li>
      {#if tier.features?.encryption}
        <li>End-to-end encryption</li>
      {/if}
      {#if !tier.features?.ads}
        <li>Ad-free</li>
      {/if}
    </ul>
  </div>
{/each}
```

---

## 6. Process Google Play Purchase

```typescript
async function processGooglePlayPurchase(
  userId: string,
  tierName: 'basic' | 'premium' | 'enterprise',
  purchaseToken: string,
  orderId: string
) {
  // Get tier ID
  const { data: tier } = await supabase
    .from('subscription_tiers')
    .select('tier_id')
    .eq('tier_name', tierName)
    .single();

  if (!tier) throw new Error('Invalid subscription tier');

  // Calculate subscription end date (30 days from now)
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Update user's subscription
  const { error } = await supabase
    .from('profiles')
    .update({
      tier_id: tier.tier_id,
      google_play_token: purchaseToken,
      google_play_order_id: orderId,
      subscription_start_date: now.toISOString(),
      subscription_end_date: endDate.toISOString()
    })
    .eq('id', userId);

  if (error) throw error;

  return { success: true, expiresAt: endDate };
}
```

**Usage in Capacitor app:**
```typescript
import { InAppPurchase2 } from '@awesome-cordova-plugins/in-app-purchase-2';

// After successful Google Play purchase
const purchase = InAppPurchase2.get('premium_monthly');
await processGooglePlayPurchase(
  $authState.user.id,
  'premium',
  purchase.transaction.purchaseToken,
  purchase.transaction.orderId
);
```

---

## 7. Check Subscription Expiration (Cron Job)

```typescript
// Run this daily to downgrade expired subscriptions

async function downgradeExpiredSubscriptions() {
  const { data: expiredUsers } = await supabase
    .from('profiles')
    .select('id, username, subscription_end_date')
    .lt('subscription_end_date', new Date().toISOString())
    .neq('tier_id', 1); // Not already free tier

  if (!expiredUsers) return;

  // Get free tier ID
  const { data: freeTier } = await supabase
    .from('subscription_tiers')
    .select('tier_id')
    .eq('tier_name', 'free')
    .single();

  // Downgrade each user
  for (const user of expiredUsers) {
    await supabase
      .from('profiles')
      .update({
        tier_id: freeTier.tier_id,
        google_play_token: null,
        google_play_order_id: null
      })
      .eq('id', user.id);

    console.log(`Downgraded user ${user.username} to free tier`);
  }
}
```

---

## 8. Handle DMCA Strike

```typescript
async function issueDMCAStrike(userId: string, reason: string) {
  // Record the strike (auto-suspends at 3 strikes)
  const { error } = await supabase.rpc('record_dmca_strike', {
    user_id: userId
  });

  if (error) throw error;

  // Get updated strike count
  const { data: profile } = await supabase
    .from('profiles')
    .select('dmca_strike_count, account_status')
    .eq('id', userId)
    .single();

  // TODO: Send email notification to user
  // TODO: Log to admin panel

  return {
    strikeCount: profile.dmca_strike_count,
    suspended: profile.account_status === 'suspended'
  };
}
```

---

## 9. Enable/Disable Encryption

```typescript
async function toggleEncryption(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ encryption_enabled: enabled })
    .eq('id', userId);

  if (error) throw error;

  // TODO: Re-encrypt or decrypt user files based on setting
}
```

**Check if encryption is available:**
```typescript
async function canEnableEncryption(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select(`
      subscription_tiers (
        features
      )
    `)
    .eq('id', userId)
    .single();

  return data?.subscription_tiers?.features?.encryption === true;
}
```

---

## 10. Display Quota Warning

```typescript
async function shouldShowQuotaWarning(userId: string): Promise<{
  show: boolean;
  type: 'storage' | 'files' | null;
  percentUsed: number;
}> {
  const info = await getUserTierInfo(userId);

  // Warn at 80% storage usage
  if (info.storage.percentUsed >= 80) {
    return {
      show: true,
      type: 'storage',
      percentUsed: info.storage.percentUsed
    };
  }

  // Warn at 90% file count usage
  if (info.files.percentUsed >= 90) {
    return {
      show: true,
      type: 'files',
      percentUsed: info.files.percentUsed
    };
  }

  return { show: false, type: null, percentUsed: 0 };
}
```

**Usage in UI:**
```svelte
<script>
  onMount(async () => {
    const warning = await shouldShowQuotaWarning($authState.user.id);

    if (warning.show) {
      if (warning.type === 'storage') {
        showNotification(`Warning: ${warning.percentUsed.toFixed(0)}% of storage used`);
      } else {
        showNotification(`Warning: ${warning.percentUsed.toFixed(0)}% of file limit used`);
      }
    }
  });
</script>
```

---

## 11. Format Storage Size (Helper)

```typescript
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
```

**Usage:**
```typescript
const used = formatBytes(profile.storage_used_bytes); // "45.2 MB"
const max = formatBytes(tier.max_storage_bytes); // "10 GB"
console.log(`Storage: ${used} / ${max}`);
```

---

## 12. Subscription Status Badge

```svelte
<script lang="ts">
  import { supabase } from '$lib/config/supabase';

  let tierInfo = $state(null);

  onMount(async () => {
    tierInfo = await getUserTierInfo($authState.user.id);
  });
</script>

{#if tierInfo}
  <div class="tier-badge tier-{tierInfo.tier}">
    {tierInfo.tier.toUpperCase()}
  </div>

  {#if tierInfo.tier !== 'free' && tierInfo.subscriptionExpires}
    <p class="expiry-date">
      Renews {new Date(tierInfo.subscriptionExpires).toLocaleDateString()}
    </p>
  {/if}
{/if}

<style>
  .tier-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .tier-free { background: #e5e7eb; color: #374151; }
  .tier-basic { background: #dbeafe; color: #1e40af; }
  .tier-premium { background: #fef3c7; color: #92400e; }
  .tier-enterprise { background: #e9d5ff; color: #6b21a8; }
</style>
```

---

That's it! You now have all the tools to manage subscriptions, storage quotas, and DMCA moderation in your app.
