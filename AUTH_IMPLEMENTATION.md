# Auth System Implementation Summary

## What's Been Built

### ✅ Core Auth Features

1. **Hybrid Authentication** - Works online and offline
   - Online: Supabase Auth with cloud sync
   - Offline: Local SQLite with encrypted storage
   - Automatic fallback when offline

2. **User Registration**
   - Email/password signup
   - Username selection
   - Password strength validation (8+ chars, uppercase, lowercase, numbers)
   - Stores in both Supabase (online) and local DB (offline)

3. **User Login**
   - Login with username or email
   - Works offline if previously logged in online
   - Rate limiting: 5 attempts, then 15-min lockout
   - Bcrypt password hashing (12 rounds)

4. **Anonymous Accounts**
   - "Skip" button creates local-only account
   - Linked to Android device ID
   - Can be upgraded to full account later
   - Syncs to Supabase when online

5. **Security Features**
   - SQLite database encryption (SQLCipher)
   - Bcrypt password hashing
   - Rate limiting on failed logins
   - Row Level Security (RLS) in Supabase
   - Session management with JWT tokens

## File Structure

```
src/lib/
├── auth/
│   ├── auth.ts           # Main auth logic (register, login, logout)
│   └── local-db.ts       # SQLite operations (encrypted storage)
├── config/
│   └── supabase.ts       # Supabase client configuration
└── stores/
    ├── authState.ts      # Global auth state management
    └── appState.ts       # Existing app state (storage, etc.)

src/lib/components/
└── auth/
    └── AuthScreen.svelte # Login/register UI (already wired up)

Database:
├── supabase-schema.sql   # SQL to run in Supabase dashboard
└── SUPABASE_SETUP.md     # Step-by-step setup instructions
```

## How It Works

### Registration Flow

**Online (with internet):**
```
User enters credentials
    ↓
Create account in Supabase (auth.users)
    ↓
Create profile in Supabase (profiles table)
    ↓
Cache credentials locally (encrypted SQLite)
    ↓
Login successful → Navigate to app
```

**Offline (no internet):**
```
User enters credentials
    ↓
Store in local SQLite (encrypted)
    ↓
Mark as "pending sync"
    ↓
When internet returns → Sync to Supabase
    ↓
User can access app immediately (offline mode)
```

### Login Flow

**Online (with internet):**
```
User enters username/password
    ↓
Verify with Supabase
    ↓
Success → Cache locally
    ↓
Navigate to app
```

**Offline (no internet):**
```
User enters username/password
    ↓
Check local SQLite database
    ↓
Verify password hash (bcrypt)
    ↓
Check rate limiting
    ↓
Success → Navigate to app (offline mode)
```

### Skip (Anonymous) Flow

**Online:**
```
User clicks "Skip"
    ↓
Generate random credentials
    ↓
Get Android device ID
    ↓
Create anonymous account in Supabase
    ↓
Link to device ID
    ↓
Navigate to app
```

**Offline:**
```
User clicks "Skip"
    ↓
Generate random credentials
    ↓
Store locally as anonymous
    ↓
Will sync to Supabase when online
    ↓
Navigate to app
```

## What You Need to Do

### 1. Create Supabase Project

Follow instructions in `SUPABASE_SETUP.md`:
1. Create project at supabase.com
2. Run `supabase-schema.sql` in SQL Editor
3. Get your API keys
4. Create `.env` file with:
   ```
   PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

### 2. Test the Auth Flow

**On Desktop (Dev):**
```bash
npm run dev
```
- Visit http://localhost:5173/setup
- Try registering with email/password
- Check Supabase dashboard → Authentication → Users
- Should see new user

**On Android:**
```bash
npm run build
npx cap sync
npx cap open android
```
- Build and run in Android Studio
- Test offline mode by enabling airplane mode
- Test "Skip" button

### 3. Known Limitations (To Fix Later)

1. **OAuth (Google/Discord)** - UI buttons exist but not implemented yet
2. **Email verification** - Currently disabled (can enable in Supabase settings)
3. **Password reset** - Not implemented (would require email flow)
4. **Folder setup** - Auth works, but still redirects to `/app` instead of folder selection
5. **Web support** - Currently optimized for Android; web will work but no SQLite

## Testing Checklist

### Online Mode Tests
- [ ] Register new account
- [ ] Login with email
- [ ] Login with username
- [ ] Check Supabase dashboard shows user
- [ ] Check profile table has username

### Offline Mode Tests
- [ ] Register online, then go offline
- [ ] Login while offline
- [ ] Should work with cached credentials
- [ ] Enable airplane mode, try to login
- [ ] Should show "offline mode" message

### Rate Limiting Tests
- [ ] Try 5 wrong passwords
- [ ] Should get locked out for 15 minutes
- [ ] Error message should show remaining attempts

### Anonymous Account Tests
- [ ] Click "Skip" while online
- [ ] Should create anonymous account
- [ ] Check Supabase shows anonymous user
- [ ] Click "Skip" while offline
- [ ] Should create local account

## Next Steps

1. **Set up Supabase** (see SUPABASE_SETUP.md)
2. **Test registration** in dev mode
3. **Test on Android** device
4. **Add folder selection** after auth
5. **Implement OAuth** if needed
6. **Add password reset** flow
7. **Sync pending accounts** when app comes online

## Debugging

### Check if Supabase is configured:
```javascript
import { isSupabaseConfigured } from '$lib/config/supabase';
console.log('Supabase configured:', isSupabaseConfigured());
```

### Check auth state:
```javascript
import { authState } from '$lib/stores/authState';
authState.subscribe(state => console.log('Auth state:', state));
```

### Check local database:
- Only works on Android (native platform)
- Logs will show "Local auth database initialized"
- If you see errors, check Capacitor SQLite plugin is installed

### Common Issues

**"navigator is not defined":**
- Fixed (we use `browser` from `$app/environment`)

**"Database not initialized":**
- Only happens on web (expected)
- On Android, check console for SQLite errors

**"Failed to create profile":**
- Check Supabase RLS policies are set up
- Make sure `supabase-schema.sql` was run

**"No session returned":**
- Check `.env` file exists and has correct keys
- Verify Supabase URL doesn't have trailing slash

## Dependencies Installed

```json
{
  "@supabase/supabase-js": "^2.80.0",
  "@capacitor-community/sqlite": "latest",
  "@capacitor/device": "latest",
  "bcryptjs": "latest"
}
```

All set! Just need your Supabase credentials to test it live.
