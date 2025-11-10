# Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose organization and settings:
   - **Project name**: stubly-android (or whatever you want)
   - **Database password**: (generate strong password - save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" (takes ~2 minutes)

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL editor
5. Click "Run" (bottom right)
6. You should see: "Success. No rows returned"

## Step 3: Get Your API Keys

1. Go to **Settings** → **API** (left sidebar)
2. Find these two values:

   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOi...` (long string)

3. Copy both values

## Step 4: Configure Your App

Create a `.env` file in the project root:

```bash
# stubly-android/.env

PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Replace with your actual values from Step 3.

## Step 5: Verify Setup

### Test in Supabase Dashboard

1. Go to **Table Editor** → **profiles**
2. You should see an empty table with columns:
   - id
   - username
   - android_id
   - is_anonymous
   - created_at
   - updated_at

### Test in Your App

1. Build and run the app
2. Try to register a new account
3. Check Supabase dashboard:
   - **Authentication** → **Users**: Should see new user
   - **Table Editor** → **profiles**: Should see profile entry

## Step 6: Optional - Configure Auth Settings

Go to **Authentication** → **Settings**:

### Email Settings
- **Enable Email Confirmations**: Up to you (disable for testing)
- **Secure Email Change**: Recommended to enable

### Session Settings
- **JWT Expiry**: 3600 seconds (1 hour) - default is fine
- **Refresh Token Expiry**: 2592000 seconds (30 days) - or increase for longer offline use

### Security
- **Site URL**: `http://localhost` (for dev) or your production URL
- **Redirect URLs**: Add `http://localhost` for dev

## Troubleshooting

### "Failed to create profile"
- Check if RLS policies were created correctly
- Run this query in SQL Editor:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'profiles';
  ```
- Should see 3 policies (SELECT, UPDATE, INSERT)

### "Unable to connect to Supabase"
- Verify `.env` file exists and has correct values
- Check PUBLIC_SUPABASE_URL doesn't have trailing slash
- Make sure you're using the **anon** key, not the **service_role** key

### "User already registered"
- Go to **Authentication** → **Users**
- Delete test users
- Or use **SQL Editor** to reset:
  ```sql
  DELETE FROM auth.users WHERE email = 'test@example.com';
  ```

## Next Steps

Once setup is complete, you can:

1. Test registration (online mode)
2. Test login (online mode)
3. Test offline mode (turn off internet, try to login)
4. Test "Skip" button (creates anonymous account)

## Supabase Resources

- [Supabase Docs](https://supabase.com/docs)
- [Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
