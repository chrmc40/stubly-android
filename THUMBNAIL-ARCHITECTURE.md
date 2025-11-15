# Thumbnail Architecture

## Overview

Stubly uses a flexible thumbnail storage system that works across different mount types (Backblaze B2, Android storage, Windows filesystem) and handles both regular files and URL-type files with different scoping rules.

## Database Schema

### LOCATIONS Table

The `LOCATIONS` table tracks where files exist and stores paths to their thumbnails, previews, and sprites:

```sql
CREATE TABLE locations (
  location_id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  file_id text NOT NULL,
  mount_id integer NOT NULL,
  file_path text NOT NULL,

  -- Thumbnail fields
  has_thumb boolean DEFAULT false,
  thumb_path text,              -- NEW: S3 key or filesystem path
  thumb_width integer,
  thumb_height integer,

  -- Preview fields
  has_preview boolean DEFAULT false,
  preview_path text,            -- NEW: S3 key or filesystem path

  -- Sprite fields
  has_sprite boolean DEFAULT false,
  sprite_path text,             -- NEW: S3 key or filesystem path

  sync_date timestamptz,
  local_modified timestamptz,
  UNIQUE (user_id, file_id, mount_id)
);
```

## How It Works

### 1. Thumbnail Generation Flow

1. **User uploads file** → `LOCATIONS` record created with:
   - `has_thumb = false`
   - `thumb_path = NULL`

2. **VPS thumbnail worker runs** → Downloads file, generates thumbnail

3. **Worker determines storage path** based on:
   - **Mount type** (Backblaze vs local filesystem)
   - **File type** (regular file vs URL type)
   - **Scoping rules** (global vs user-scoped)

4. **Worker uploads thumbnail** to appropriate location

5. **Worker updates database**:
   - `has_thumb = true`
   - `thumb_path = 'url_abc123_thumb.webp'` (or `'user_456/url_abc123_thumb.webp'`)
   - `thumb_width = 200`
   - `thumb_height = 150`

### 2. Frontend Rendering

When displaying a gallery:

```typescript
// Query LOCATIONS table
const locations = await supabase
  .from('locations')
  .select('file_id, has_thumb, thumb_path, thumb_width, thumb_height')
  .eq('mount_id', mountId)
  .eq('folder_path', '/cats');

// For each location with a thumbnail
for (const location of locations) {
  if (location.thumb_path) {
    const thumbUrl = getPublicUrlFromPath('THUMBS', location.thumb_path);
    // thumbUrl = "https://f004.backblazeb2.com/file/stubly-thumbs/url_abc123_thumb.webp"
  }
}
```

## Scoping Rules

### Regular Files (type = 'image', 'video', 'audio')

**Always globally deduplicated** because file_id = SHA-256 hash of content:

- Thumbnail path: `{file_id}_thumb.webp`
- Example: `a1b2c3d4_thumb.webp`

### URL-Type Files (type = 'url')

**Scoping depends on `SOURCE.is_file` flag:**

| `is_file` | Description | Thumbnail Path | Example |
|-----------|-------------|----------------|---------|
| `true` | Direct file URL (e.g., `https://example.com/cat.jpg`) | Global: `url_{hash}_thumb.webp` | `url_abc123_thumb.webp` |
| `false` | Webpage URL (e.g., `https://twitter.com/user/post/123`) | User-scoped: `{user_id}/url_{hash}_thumb.webp` | `user-456/url_abc123_thumb.webp` |

**Rationale:**
- Direct file URLs are safe to globally deduplicate (same URL = same file)
- Webpage URLs may generate different thumbnails per user (custom scraper logic)

## Benefits

1. **No business logic in frontend** - Just reads `thumb_path` and constructs URL
2. **No runtime path computation** - Paths are pre-computed and stored
3. **Works for all mount types** - Same pattern for S3 and filesystem
4. **Worker owns scoping decision** - Centralized logic, easy to update
5. **Simple queries** - No joins to SOURCE table needed

## Migration Path

If scoping rules change in the future (e.g., all VPS-generated thumbnails become globally safe), you can:

1. Write a migration script to move user-scoped thumbnails to global paths
2. Update VPS worker logic to use new paths
3. Update `thumb_path` in database for affected records

The denormalized storage of paths makes this straightforward - just update the column values.

## API Functions

### For VPS Worker (Server-Side)

```typescript
// Upload thumbnail to appropriate path
await uploadToStorage('THUMBS', thumbPath, buffer, 'image/webp');

// Update database
await supabase
  .from('locations')
  .update({
    has_thumb: true,
    thumb_path: thumbPath,
    thumb_width: 200,
    thumb_height: 150
  })
  .eq('location_id', locationId);
```

### For Frontend (Client-Side)

```typescript
import { getPublicUrlFromPath } from '$lib/config/storage';

// Get thumbnail URL from path stored in database
const thumbUrl = getPublicUrlFromPath('THUMBS', location.thumb_path);
// Returns: "https://f004.backblazeb2.com/file/stubly-thumbs/url_abc123_thumb.webp"
```

## Example Paths

### Regular Image File

```
FILES.file_id = "a1b2c3d4e5f6..." (SHA-256 hash)
FILES.type = "image"

LOCATIONS.thumb_path = "a1b2c3d4e5f6_thumb.webp"

Thumbnail URL:
https://f004.backblazeb2.com/file/stubly-thumbs/a1b2c3d4e5f6_thumb.webp
```

### URL File (Direct File Link)

```
FILES.file_id = "url_abc123..." (hash of URL)
FILES.type = "url"
SOURCE.is_file = true
SOURCE.url = "https://example.com/cat.jpg"

LOCATIONS.thumb_path = "url_abc123_thumb.webp"

Thumbnail URL:
https://f004.backblazeb2.com/file/stubly-thumbs/url_abc123_thumb.webp
```

### URL File (Webpage)

```
FILES.file_id = "url_def456..." (hash of URL)
FILES.type = "url"
SOURCE.is_file = false
SOURCE.url = "https://twitter.com/user/status/123"

LOCATIONS.thumb_path = "user-789/url_def456_thumb.webp"

Thumbnail URL:
https://f004.backblazeb2.com/file/stubly-thumbs/user-789/url_def456_thumb.webp
```

## Status

✅ Database schema updated (database.md)
✅ SQL migration ready (supabase-COMPLETE.sql)
✅ Storage helper functions added (storage.ts)
⏳ VPS worker implementation (next step)
