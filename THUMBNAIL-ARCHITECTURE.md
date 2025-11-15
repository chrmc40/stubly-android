# Thumbnail Architecture

## Overview

Stubly uses a clean, normalized database schema where file metadata is deduplicated in a META table, while actual file locations are tracked in a FILES table. Thumbnails, previews, and sprites are stored per-file-location with their paths saved directly in the database.

## Database Schema

### Key Tables

**META** - Deduplicated file content metadata (keyed by SHA-256 hash):
```sql
CREATE TABLE meta (
  meta_hash text PRIMARY KEY,     -- SHA-256 checksum
  type text NOT NULL,             -- image | video | audio
  mime_type text,
  width integer,
  height integer,
  duration real,
  video_codec text,
  audio_codec text,
  -- ... other metadata fields
);
```

**FILES** - Actual file locations (one record per file on mount):
```sql
CREATE TABLE files (
  file_id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  meta_hash text REFERENCES meta(meta_hash),  -- NULL for URL type
  mount_id integer NOT NULL,
  file_path text NOT NULL,
  type text NOT NULL,                     -- image | video | audio | url

  -- Thumbnail fields
  has_thumb boolean DEFAULT false,
  thumb_path text,                        -- S3 key or filesystem path
  thumb_width integer,
  thumb_height integer,

  -- Preview fields
  has_preview boolean DEFAULT false,
  preview_path text,                      -- S3 key or filesystem path

  -- Sprite fields
  has_sprite boolean DEFAULT false,
  sprite_path text,                       -- S3 key or filesystem path

  UNIQUE (user_id, mount_id, file_path)
);
```

**SOURCE** - URL metadata for URL-type files:
```sql
CREATE TABLE source (
  user_id uuid NOT NULL,
  file_id bigint NOT NULL REFERENCES files(file_id),
  url text NOT NULL,
  content_type text,
  remote_size bigint,
  is_file boolean DEFAULT true,           -- Direct file URL vs webpage
  url_source text,
  PRIMARY KEY (user_id, file_id, url)
);
```

## How It Works

### 1. Regular Files (image, video, audio)

**Upload Flow:**
1. User uploads `cat.jpg` → Calculate SHA-256 hash
2. Check if META record exists for that hash
3. **If new content**: Insert into META with dimensions, codecs, etc.
4. **If duplicate content**: Reuse existing META record
5. Insert into FILES with `meta_hash` pointing to META
6. VPS worker generates thumbnail
7. VPS uploads thumbnail to appropriate path
8. VPS updates FILES: `has_thumb=true`, `thumb_path='abc123_thumb.webp'`

**Storage:**
- File data: Backblaze B2 FILES bucket (private, presigned URLs)
- Metadata: META table (shared across all users with same file)
- Location: FILES table (per-user, per-mount)
- Thumbnail: Backblaze B2 THUMBS bucket (public, direct URLs)

**Example:**
```
User A uploads cat.jpg (hash=abc123) to Android mount
User B uploads same cat.jpg to Windows mount
User C uploads different-cat.jpg (hash=def456) to Android mount

META table:
  abc123 → width=1920, height=1080, type=image
  def456 → width=1024, height=768, type=image

FILES table:
  file_id=1, user=A, meta_hash=abc123, mount=1, path=/cats/cat.jpg, thumb_path=abc123_thumb.webp
  file_id=2, user=B, meta_hash=abc123, mount=2, path=/pictures/cat.jpg, thumb_path=abc123_thumb.webp
  file_id=3, user=C, meta_hash=def456, mount=3, path=/cats/different-cat.jpg, thumb_path=def456_thumb.webp

THUMBS bucket:
  abc123_thumb.webp (generated once, used by files 1 and 2)
  def456_thumb.webp (generated for file 3)
```

### 2. URL Files (web-scraped content)

**Upload Flow:**
1. User adds URL `https://example.com/cat.jpg`
2. Insert into FILES with `type='url'`, `meta_hash=NULL`
3. Insert into SOURCE with `url=https://example.com/cat.jpg`, `is_file=true`
4. VPS worker downloads URL, generates thumbnail
5. VPS determines thumbnail path based on `is_file`:
   - `is_file=true` (direct file): Global path `url_abc123_thumb.webp`
   - `is_file=false` (webpage): User-scoped path `user_789/url_abc123_thumb.webp`
6. VPS uploads thumbnail, updates FILES with path

**Scoping Rules:**

| `is_file` | Description | Thumbnail Path | Rationale |
|-----------|-------------|----------------|-----------|
| `true` | Direct file URL | `url_{hash}_thumb.webp` | Same URL = same file, safe to deduplicate |
| `false` | Webpage URL | `{user_id}/url_{hash}_thumb.webp` | Custom scrapers may generate different thumbnails |

**Example:**
```
User A adds https://example.com/photo.jpg (is_file=true)
User B adds https://example.com/photo.jpg (is_file=true)
User C adds https://twitter.com/user/post/123 (is_file=false)

FILES table:
  file_id=10, user=A, meta_hash=NULL, type=url, thumb_path=url_abc123_thumb.webp
  file_id=11, user=B, meta_hash=NULL, type=url, thumb_path=url_abc123_thumb.webp
  file_id=12, user=C, meta_hash=NULL, type=url, thumb_path=user_C/url_def456_thumb.webp

SOURCE table:
  file_id=10, url=https://example.com/photo.jpg, is_file=true
  file_id=11, url=https://example.com/photo.jpg, is_file=true
  file_id=12, url=https://twitter.com/user/post/123, is_file=false

THUMBS bucket:
  url_abc123_thumb.webp (shared by files 10 and 11)
  user_C/url_def456_thumb.webp (user-scoped for file 12)
```

### 3. Frontend Rendering

When displaying a folder view:

```typescript
// Query FILES table
const files = await supabase
  .from('files')
  .select('*, meta(*)')
  .eq('mount_id', mountId)
  .eq('folder_path', '/cats');

// For each file with a thumbnail
for (const file of files) {
  if (file.thumb_path) {
    const thumbUrl = getPublicUrlFromPath('THUMBS', file.thumb_path);
    // thumbUrl = "https://f004.backblazeb2.com/file/stubly-thumbs/abc123_thumb.webp"
  }
}
```

## Benefits of This Architecture

1. **Proper separation of concerns:**
   - META = what the file contains (deduplicated by content hash)
   - FILES = where the file is located (per-user, per-mount)
   - SOURCE = where URL files came from

2. **Efficient deduplication:**
   - Users uploading the same image share META record
   - Metadata extracted once, reused across all copies
   - Thumbnails can be shared for direct file URLs

3. **No business logic in frontend:**
   - Frontend just reads `thumb_path` and constructs URL
   - No conditionals, no joins to SOURCE table needed
   - Simple, fast queries

4. **Flexible scoping:**
   - Regular files: Always globally deduplicated
   - URL files (direct): Globally deduplicated
   - URL files (webpage): User-scoped for safety

5. **Easy to query:**
   - Get file + metadata: `SELECT * FROM files JOIN meta ON files.meta_hash = meta.meta_hash`
   - Get all files in folder: `SELECT * FROM files WHERE mount_id = ? AND file_path LIKE '/folder/%'`
   - Check for duplicates: `SELECT * FROM files WHERE meta_hash = ?`

## VPS Worker Implementation

```typescript
// Pseudo-code for thumbnail worker
async function generateThumbnail(fileId: number) {
  const file = await db.files.findById(fileId);

  let thumbPath: string;

  if (file.type === 'url') {
    const source = await db.source.findByFileId(fileId);
    const urlHash = sha256(source.url);

    // Determine scoping based on is_file flag
    if (source.is_file) {
      thumbPath = `url_${urlHash}_thumb.webp`;
    } else {
      thumbPath = `${file.user_id}/url_${urlHash}_thumb.webp`;
    }
  } else {
    // Regular files use content hash
    thumbPath = `${file.meta_hash}_thumb.webp`;
  }

  // Generate and upload thumbnail
  const thumbBuffer = await generateThumbnailImage(file);
  await uploadToB2('THUMBS', thumbPath, thumbBuffer);

  // Update database
  await db.files.update(fileId, {
    has_thumb: true,
    thumb_path: thumbPath,
    thumb_width: 200,
    thumb_height: 150
  });
}
```

## Migration Path

If scoping rules change in the future:

1. **Add scraper validation** → Mark certain URL scrapers as "safe"
2. **Identify user-scoped thumbnails** that can be moved to global
3. **Run migration script** to move files in B2 and update `thumb_path`
4. **Update VPS worker logic** to use new rules going forward

The denormalized storage of paths makes this straightforward - just update the `thumb_path` column values.

## API Functions

### Server-Side (VPS Worker)

```typescript
import { uploadToStorage } from '$lib/config/storage';
import { supabase } from '$lib/config/supabase';

// Upload thumbnail
await uploadToStorage('THUMBS', thumbPath, buffer, 'image/webp');

// Update database
await supabase
  .from('files')
  .update({
    has_thumb: true,
    thumb_path: thumbPath,
    thumb_width: 200,
    thumb_height: 150
  })
  .eq('file_id', fileId);
```

### Client-Side (Frontend)

```typescript
import { getPublicUrlFromPath } from '$lib/config/storage';

// Get thumbnail URL from path stored in database
const thumbUrl = getPublicUrlFromPath('THUMBS', file.thumb_path);
// Returns: "https://f004.backblazeb2.com/file/stubly-thumbs/abc123_thumb.webp"
```

## Status

✅ Database schema refactored (database.md, supabase-COMPLETE.sql)
✅ TypeScript types updated (src/lib/types/database.ts)
✅ Storage helper functions ready (src/lib/config/storage.ts)
✅ Architecture documentation complete
⏳ VPS worker implementation (next step)
