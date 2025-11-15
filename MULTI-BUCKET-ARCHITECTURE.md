# Multi-Bucket Architecture

## Overview

Stubly uses a 4-bucket architecture on Backblaze B2 to optimize performance, security, and cost:

1. **stubly-files** (Private) - Original files with presigned URL access
2. **stubly-thumbs** (Public) - Thumbnail images
3. **stubly-previews** (Public) - Preview/medium-sized images
4. **stubly-sprites** (Public) - Video sprite sheets

## Bucket Configuration

### stubly-files (Private)
- **Purpose**: Store original uploaded files
- **Access**: Presigned URLs only (1 hour expiration)
- **Security**: User authentication + ownership check via LOCATIONS table
- **Deduplication**: Global (same file hash = same file)
- **URL Format**: Generated via `/api/presign` endpoint

### stubly-thumbs (Public)
- **Purpose**: Small thumbnail images for grid/list views
- **Access**: Direct HTTP (no auth required)
- **Deduplication**: Global
- **URL Format**: `https://f004.backblazeb2.com/file/stubly-thumbs/HASH.jpg`

### stubly-previews (Public)
- **Purpose**: Medium-sized preview images
- **Access**: Direct HTTP (no auth required)
- **Deduplication**: Global
- **URL Format**: `https://f004.backblazeb2.com/file/stubly-previews/HASH.jpg`

### stubly-sprites (Public)
- **Purpose**: Video sprite sheets for scrubbing/seeking
- **Access**: Direct HTTP (no auth required)
- **Deduplication**: Global
- **URL Format**: `https://f004.backblazeb2.com/file/stubly-sprites/HASH.jpg`

## Why This Architecture?

### Performance
- **Public buckets** (thumbs/previews/sprites): 0ms overhead, instant rendering
  - No API calls needed to display 200 thumbnails
  - Browser can directly request and cache files
  - Optimal for gallery/grid views

- **Private bucket** (files): ~50ms overhead per batch of presigned URLs
  - Only needed for 1-3 files at a time (current + prefetch)
  - Acceptable latency for file viewing

### Security
- **Original files protected**: Users can't share permanent links to large files
- **Presigned URLs expire**: 1 hour validity prevents long-term sharing
- **Ownership verification**: API checks LOCATIONS table before generating URLs
- **Public files are low-risk**: Thumbnails/previews are small, sharing them doesn't impact bandwidth significantly

### Cost Optimization
- **Backblaze B2 native URLs** for public buckets (cheaper egress than S3 API)
- **Unlimited egress** on all buckets (Backblaze benefit)
- **Deduplication** across all buckets reduces storage costs

## API Usage

### Uploading Files

```typescript
// Upload original file to FILES bucket
await uploadToStorage('FILES', `${hash}.${ext}`, buffer, mimeType);

// Upload thumbnail to THUMBS bucket
await uploadToStorage('THUMBS', `${hash}.jpg`, thumbBuffer, 'image/jpeg');

// Upload preview to PREVIEWS bucket
await uploadToStorage('PREVIEWS', `${hash}.jpg`, previewBuffer, 'image/jpeg');

// Upload sprite to SPRITES bucket
await uploadToStorage('SPRITES', `${hash}.jpg`, spriteBuffer, 'image/jpeg');
```

### Accessing Files

```typescript
// Get public URL for thumbnail (instant, no API call)
const thumbUrl = getPublicUrl('THUMBS', fileId, 'jpg');
// Returns: https://f004.backblazeb2.com/file/stubly-thumbs/abc123.jpg

// Get presigned URL for original file (requires API call)
const response = await fetch('/api/presign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileIds: [fileId1, fileId2, fileId3], // Current + prefetch
    expiresIn: 3600 // 1 hour
  })
});

const { urls } = await response.json();
// urls = { fileId1: 'https://...', fileId2: '...', fileId3: '...' }
```

## Environment Variables

```env
# Backblaze B2 Credentials
BACKBLAZE_KEY_ID=004148ad0d96fc30000000002
BACKBLAZE_APPLICATION_KEY=your-key-here
BACKBLAZE_REGION=us-west-004
BACKBLAZE_ENDPOINT=https://s3.us-west-004.backblazeb2.com

# Backblaze B2 Buckets
BACKBLAZE_BUCKET_FILES=stubly-files      # Private
BACKBLAZE_BUCKET_THUMBS=stubly-thumbs    # Public
BACKBLAZE_BUCKET_PREVIEWS=stubly-previews # Public
BACKBLAZE_BUCKET_SPRITES=stubly-sprites   # Public
```

## Database Schema

### MOUNTS Table
```sql
-- Cloud storage mount points to FILES bucket
device_path = 'b2://stubly-files/'
platform = 'Backblaze'
storage_type = 'cloud'
```

### FILES Table
```sql
-- All files deduplicated by SHA-256 hash
file_id = SHA-256 hash (primary key)
local_size = original file size
mime_type = 'image/jpeg', 'video/mp4', etc.
```

### LOCATIONS Table
```sql
-- Tracks which users have which files
user_id, file_id, mount_id (unique constraint)
has_thumb = boolean
has_preview = boolean
has_sprite = boolean
```

## Security Considerations

### What This Prevents
✅ Users sharing permanent links to large files
✅ Unauthorized access to original files
✅ Bandwidth abuse from file sharing

### What This Allows
⚠️ Thumbnails/previews can be shared (low impact - small files)
⚠️ Presigned URLs valid for 1 hour (temporary sharing window)
⚠️ Anyone with presigned URL can access during validity period

### Trade-offs
This architecture balances:
- **Performance**: Public thumbnails = instant rendering
- **Security**: Private originals = controlled access
- **Cost**: Public egress for small files, controlled access for large files
- **User Experience**: No lag on gallery views, acceptable delay on file views

## Migration Notes

This architecture replaces the single-bucket approach. Benefits over single bucket:

1. **Before**: All files in one private bucket → presigned URLs for everything
   - Slow: 200 thumbnails = 200 API calls or 1 slow batch call
   - Complex: Cache management for all file types

2. **After**: Files segregated by type and access pattern
   - Fast: Thumbnails render instantly (0 API calls)
   - Simple: Only generate URLs for files user is actively viewing
   - Secure: Original files still protected

## Future Enhancements

Potential improvements:
- **CDN**: Put Cloudflare in front of public buckets for even faster global access
- **Lazy thumbnail generation**: Generate thumbs on first access, cache in THUMBS bucket
- **Expiring presigned URLs cache**: Server-side cache to reduce presigning overhead
- **File access analytics**: Track which files users view for usage insights
