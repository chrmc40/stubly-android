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
- **Security**: User authentication + ownership check via FILES table
- **Deduplication**: NONE - each user gets their own copy (quota enforcement)
- **Storage Structure**: `/user_id/path/to/file.mp4` (user's original filename preserved)
- **URL Format**: Generated via `/api/presign` endpoint
- **Example**: `stubly-files/550e8400-e29b-41d4-a716-446655440000/vacation/beach.mp4`

### stubly-thumbs (Public)
- **Purpose**: Small thumbnail images for grid/list views (WebP format)
- **Access**: Direct HTTP (no auth required)
- **Deduplication**: YES - globally deduplicated by hash (saves storage)
- **Storage Structure**: `/{meta_hash}_thumb.webp` (root level, hash-based)
- **URL Format**: `https://f004.backblazeb2.com/file/stubly-thumbs/{meta_hash}_thumb.webp`
- **Note**: If 100 users have the same video, only 1 thumbnail exists

### stubly-previews (Public)
- **Purpose**: Preview videos for faster loading (MP4 format, lower quality/resolution)
- **Access**: Direct HTTP (no auth required)
- **Deduplication**: YES - globally deduplicated by hash (saves storage)
- **Storage Structure**: `/{meta_hash}_preview.mp4` (root level, hash-based)
- **URL Format**: `https://f004.backblazeb2.com/file/stubly-previews/{meta_hash}_preview.mp4`
- **Note**: If 100 users have the same video, only 1 preview exists

### stubly-sprites (Public)
- **Purpose**: Video sprite sheets for scrubbing/seeking (WebP image + JSON metadata)
- **Access**: Direct HTTP (no auth required)
- **Deduplication**: YES - globally deduplicated by hash (saves storage)
- **Storage Structure**: `/{meta_hash}_sprite.webp` and `/{meta_hash}_sprite.json` (root level)
- **URL Format**:
  - Image: `https://f004.backblazeb2.com/file/stubly-sprites/{meta_hash}_sprite.webp`
  - Metadata: `https://f004.backblazeb2.com/file/stubly-sprites/{meta_hash}_sprite.json`
- **Note**: If 100 users have the same video, only 1 sprite sheet exists

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
- **Selective deduplication**:
  - Original files NOT deduplicated → each user counts against their quota
  - Thumbnails/previews/sprites deduplicated → massive storage savings
  - Example: 1000 users with same video = 1000 originals + 1 thumb/preview/sprite set

## API Usage

### Uploading Files

```typescript
// Upload original file to FILES bucket (per-user path)
const userId = 'user-uuid-here';
const userPath = 'vacation/beach.mp4'; // User's chosen filename/path
await uploadToStorage('FILES', `${userId}/${userPath}`, buffer, mimeType);

// Upload thumbnail to THUMBS bucket (hash-based, deduplicated)
await uploadToStorage('THUMBS', `${metaHash}_thumb.webp`, thumbBuffer, 'image/webp');

// Upload preview to PREVIEWS bucket (hash-based, deduplicated)
await uploadToStorage('PREVIEWS', `${metaHash}_preview.mp4`, previewBuffer, 'video/mp4');

// Upload sprite sheet to SPRITES bucket (hash-based, deduplicated)
await uploadToStorage('SPRITES', `${metaHash}_sprite.webp`, spriteBuffer, 'image/webp');
await uploadToStorage('SPRITES', `${metaHash}_sprite.json`, spriteMetadata, 'application/json');
```

### Accessing Files

```typescript
// Get public URL for thumbnail (instant, no API call)
const thumbUrl = `https://f004.backblazeb2.com/file/stubly-thumbs/${file.thumb_path}`;
// Returns: https://f004.backblazeb2.com/file/stubly-thumbs/abc123_thumb.webp

// Get public URL for preview (instant, no API call)
const previewUrl = `https://f004.backblazeb2.com/file/stubly-previews/${file.preview_path}`;
// Returns: https://f004.backblazeb2.com/file/stubly-previews/abc123_preview.mp4

// Get public URLs for sprite sheet (instant, no API call)
const spriteUrl = `https://f004.backblazeb2.com/file/stubly-sprites/${file.sprite_path}`;
const spriteJsonUrl = `https://f004.backblazeb2.com/file/stubly-sprites/${file.sprite_json_path}`;
// Returns: https://f004.backblazeb2.com/file/stubly-sprites/abc123_sprite.webp
//          https://f004.backblazeb2.com/file/stubly-sprites/abc123_sprite.json

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
-- Each user gets their own cloud mount pointing to their B2 folder
user_id = '550e8400-e29b-41d4-a716-446655440000'
device_path = 'b2://stubly-files/550e8400-e29b-41d4-a716-446655440000/'
platform = 'Backblaze'
storage_type = 'cloud'

-- Or for local storage on Android
user_id = '550e8400-e29b-41d4-a716-446655440000'
device_path = '/storage/emulated/0/Stubly/'
platform = 'Android'
storage_type = 'local'
```

### META Table
```sql
-- Deduplicated file content metadata
meta_hash = SHA-256 hash (primary key)
type = 'image', 'video', 'audio'
mime_type = 'image/jpeg', 'video/mp4', etc.
width, height, duration, codecs, etc.

-- B2 derivative existence flags (global)
b2_thumb_exists = boolean (thumbnail exists in stubly-thumbs bucket)
b2_thumb_width = integer (for layout calculations)
b2_thumb_height = integer (for layout calculations)
b2_preview_exists = boolean (preview exists in stubly-previews bucket)
b2_sprite_exists = boolean (sprite image exists in stubly-sprites bucket)
b2_sprite_json_exists = boolean (sprite JSON exists in stubly-sprites bucket)
```

### FILES Table
```sql
-- Tracks which users have which files (user ownership + locations)
file_id = bigserial (primary key)
user_id = '550e8400-e29b-41d4-a716-446655440000'
mount_id = 5 (references user's Backblaze mount)
file_path = 'vacation/beach.mp4' (user's chosen path/filename)
meta_hash = 'abc123def456' (references META table for content metadata)
local_size = 15728640 (original file size in bytes - counts toward quota)
has_thumb = true
thumb_path = 'abc123def456_thumb.webp' (globally deduplicated in stubly-thumbs)
thumb_width = 320
thumb_height = 180
has_preview = true
preview_path = 'abc123def456_preview.mp4' (globally deduplicated in stubly-previews)
has_sprite = true
sprite_path = 'abc123def456_sprite.webp' (globally deduplicated in stubly-sprites)
sprite_json_path = 'abc123def456_sprite.json'

-- Actual B2 locations:
-- Original: stubly-files/550e8400-e29b-41d4-a716-446655440000/vacation/beach.mp4
-- Thumb: stubly-thumbs/abc123def456_thumb.webp
-- Preview: stubly-previews/abc123def456_preview.mp4
-- Sprite: stubly-sprites/abc123def456_sprite.webp + abc123def456_sprite.json
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
