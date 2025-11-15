# Storage Quota Bug

## Status: ✅ FIXED

The upload API now correctly checks if a LOCATIONS record exists before incrementing storage quota.

## Problem

The upload API was incorrectly incrementing storage quota when re-uploading the same file to the same mount.

## Current Behavior

From [src/routes/api/upload/+server.ts:297-307](src/routes/api/upload/+server.ts#L297-L307):

```typescript
// Update user's storage usage (only charge user for their own copy)
// In global dedup, each user still pays for storage quota even though physical file is shared
const { error: updateStorageError } = await supabase.rpc('increment_storage_usage', {
  p_user_id: userId,
  p_bytes: file.size
});
```

This is called **every time** an upload happens, even when the LOCATIONS table upsert updates an existing record.

## Root Cause

The LOCATIONS table has a unique constraint on `(user_id, file_id, mount_id)`. When the same user uploads the same file to the same mount, the upsert at [line 272-288](src/routes/api/upload/+server.ts#L272-L288) updates the existing record:

```typescript
const { error: locationError } = await supabase
  .from('locations')
  .upsert({
    user_id: userId,
    file_id: fileId,
    mount_id: mountId,
    file_path: filePath,
    // ... other fields
  }, {
    onConflict: 'user_id,file_id,mount_id'
  });
```

The API doesn't check whether this was an INSERT or UPDATE, so it always calls `increment_storage_usage`.

## Expected Behavior

Storage quota should only increment when creating a **new** LOCATIONS record, not when updating an existing one.

## Test Case

From [dev.log](dev.log):
- Line 60: First avatar.png upload → Creates LOCATIONS record → Should increment quota
- Line 69: Second avatar.png upload → Updates LOCATIONS record → Should NOT increment quota

## Impact on Database State

Based on the test uploads in [dev.log](dev.log):

### Current (Buggy) State:
```
storage_used_bytes = 1004 + 1004 + 715881 + 14190032 + 14190032 + 835207 = 30,932,160 bytes
file_count_used = 6
```

### Expected (Correct) State:
```
storage_used_bytes = 1004 + 715881 + 14190032 + 835207 = 15,742,124 bytes
file_count_used = 4
```

**Over-charged by:** ~15 MB (double-counted avatar.png and wp12371347.png)

## Solution Applied

✅ Fixed in [src/routes/api/upload/+server.ts:269-322](src/routes/api/upload/+server.ts#L269-L322)

The upload API now checks if a LOCATIONS record exists before incrementing storage:

```typescript
// Check if LOCATIONS record already exists for this user+file+mount
const { data: existingLocation } = await supabase
  .from('locations')
  .select('location_id')
  .eq('user_id', userId)
  .eq('file_id', fileId)
  .eq('mount_id', mountId)
  .maybeSingle();

// Create or update LOCATIONS record
const filePath = path.length > 0 ? `/${path.join('/')}/${file.name}` : `/${file.name}`;

const { error: locationError } = await supabase
  .from('locations')
  .upsert({
    user_id: userId,
    file_id: fileId,
    mount_id: mountId,
    file_path: filePath,
    has_thumb: false,
    thumb_width: null,
    thumb_height: null,
    has_preview: false,
    has_sprite: false,
    sync_date: new Date().toISOString(),
    local_modified: null
  }, {
    onConflict: 'user_id,file_id,mount_id'
  });

if (locationError) {
  console.error('[Upload API] Error creating LOCATIONS record:', locationError);
  return json({ error: 'Failed to create location record' }, { status: 500 });
}

if (existingLocation) {
  console.log('[Upload API] Updated existing LOCATIONS record for user:', userId);
} else {
  console.log('[Upload API] Created new LOCATIONS record for user:', userId);
}

// Only increment storage usage if this is a NEW location record
// Re-uploading the same file to the same mount should not increase quota
if (!existingLocation) {
  const { error: updateStorageError } = await supabase.rpc('increment_storage_usage', {
    p_user_id: userId,
    p_bytes: file.size
  });

  if (updateStorageError) {
    console.warn('[Upload API] Failed to update storage usage:', updateStorageError);
    // Don't fail the upload for this
  }
}
```

## Fixing Existing Data

To fix the over-charged quotas in the existing database, run [fix-storage-quota.sql](fix-storage-quota.sql) in Supabase SQL Editor.

This will recalculate `storage_used_bytes` and `file_count_used` for all users based on their actual LOCATIONS records.
