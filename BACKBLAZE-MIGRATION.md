# Migration from Wasabi to Backblaze B2

## Summary

Successfully migrated from Wasabi to Backblaze B2 for object storage.

## Backblaze B2 Details

**Bucket Information:**
- Name: `stubly-storage`
- Bucket ID: `1174e8ca2dd08d5996af0c13`
- Type: Private
- Region: `us-west-004`
- Endpoint: `https://s3.us-west-004.backblazeb2.com`
- Encryption: Disabled

**Application Key:**
- Key ID: `004148ad0d96fc30000000001`
- Key Name: `stubly`

## Files Changed

### 1. New Files Created
- `src/lib/config/storage.ts` - S3 client configuration for Backblaze B2
- `migrate-to-backblaze.sql` - Database migration script
- `.env.example` - Updated environment variable template
- `BACKBLAZE-MIGRATION.md` - This file

### 2. Modified Files
- `src/routes/api/upload/+server.ts` - Updated to use new storage module
  - Changed imports from `wasabi.ts` to `storage.ts`
  - Renamed `uploadToWasabi()` → `uploadToStorage()`
  - Renamed `isWasabiConfigured()` → `isStorageConfigured()`
  - Updated platform from `'Wasabi'` → `'Backblaze'`
  - Updated device_path from `'wasabi://...'` → `'b2://...'`
  - Updated all log messages to reference "storage" instead of "Wasabi"

- `supabase/functions/create-storage-mount/index.ts` - Updated edge function
  - Changed platform from `'Wasabi'` → `'Backblaze'`
  - Updated environment variable names from `WASABI_*` to `BACKBLAZE_*`
  - Updated all references and error messages
  - Renamed directory from `create-wasabi-mount` to `create-storage-mount`

### 3. Deprecated Files
- `src/lib/config/wasabi.ts` - No longer used (can be deleted)

## Environment Variables

Update your `.env` file with these Backblaze B2 credentials:

```env
# Remove old Wasabi variables:
# WASABI_ACCESS_KEY_ID=...
# WASABI_SECRET_ACCESS_KEY=...
# WASABI_BUCKET=...
# WASABI_REGION=...
# WASABI_ENDPOINT=...

# Add new Backblaze B2 variables:
BACKBLAZE_KEY_ID=004148ad0d96fc30000000001
BACKBLAZE_APPLICATION_KEY=<your-application-key-here>
BACKBLAZE_BUCKET=stubly-storage
BACKBLAZE_REGION=us-west-004
BACKBLAZE_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

## Database Migration

Run the migration script in Supabase SQL Editor:

```bash
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of migrate-to-backblaze.sql
# 3. Execute the script
```

This will:
1. Update the `mounts` table platform constraint to include 'Backblaze'
2. Verify changes

**Optional:** Uncomment the UPDATE statement in the migration to migrate existing Wasabi mounts to Backblaze.

## Edge Function Deployment

Deploy the updated edge function to Supabase:

```bash
# Deploy the renamed edge function
supabase functions deploy create-storage-mount

# Set environment variables in Supabase Dashboard → Edge Functions → create-storage-mount → Settings
BACKBLAZE_KEY_ID=004148ad0d96fc30000000001
BACKBLAZE_APPLICATION_KEY=<your-application-key-here>
BACKBLAZE_BUCKET=stubly-storage
BACKBLAZE_REGION=us-west-004
BACKBLAZE_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

**Note:** After deployment, the old `create-wasabi-mount` function can be deleted from the Supabase dashboard.

## Testing

After migration, test the upload functionality:

1. Start dev server: `npm run dev`
2. Upload a test file
3. Check logs for `[Storage]` messages (should see Backblaze references)
4. Verify file appears in Backblaze B2 bucket
5. Check database MOUNTS table shows `platform = 'Backblaze'`
6. Test edge function by calling `/create-storage-mount` endpoint

## Benefits of Backblaze B2 vs Wasabi

✅ **Unlimited egress** - No "reasonable rate" policy
✅ **No delete fees** - No 90-day minimum storage duration
✅ **No small file penalty** - Files <4KB not charged as 4KB
✅ **Cheaper** - $6/TB vs $6.99/TB
✅ **Faster for small files** - Better performance for thumbnails/metadata
✅ **No minimum storage** - Only pay for actual usage (Wasabi has 1TB minimum)

## Rollback Plan

If you need to rollback to Wasabi:

1. Restore `.env` with Wasabi credentials
2. Revert `src/routes/api/upload/+server.ts` to use `wasabi.ts`
3. Run: `ALTER TABLE public.mounts DROP CONSTRAINT mounts_platform_check; ALTER TABLE public.mounts ADD CONSTRAINT mounts_platform_check CHECK (platform IN ('Android', 'Windows', 'Wasabi'));`

## Cost Comparison

**Wasabi (Previous):**
- Storage: $6.99/TB/month
- Egress: "Reasonable rate" (1x storage/month)
- Delete penalty: 90-day minimum
- Minimum: 1TB charge even if using less

**Backblaze B2 (Current):**
- Storage: $6/TB/month
- Egress: Unlimited (free)
- Delete penalty: None
- Minimum: None (pay for actual usage)

**Savings:** ~$1/TB/month + unlimited egress + no hidden fees
