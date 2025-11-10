# Email Confirmation Setup for Supabase Auth

## How It Works

The auth system now properly supports email confirmation. Here's the flow:

1. **User signs up** with username, email, and password
2. **Database trigger automatically creates profile** using the username from metadata
3. **If email confirmation is enabled:**
   - User sees: "Please check your email to confirm your account before logging in"
   - User clicks confirmation link in email
   - User can then login with email/password
4. **If email confirmation is disabled:**
   - User is immediately logged in after registration
   - No email verification required

## Database Trigger (Already in Schema)

The `supabase-schema.sql` now includes a trigger that automatically creates the profile when a user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, android_id, is_anonymous)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'android_id',
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This runs with `SECURITY DEFINER` which bypasses RLS policies, so the profile is created even when the user doesn't have a session yet (before email confirmation).

## Setup Steps

1. Go to your Supabase dashboard: https://supabase.com/dashboard

2. Select your project: `dtisxzuwslectshzcneo`

3. Navigate to: **SQL Editor**

4. Run the updated `supabase-schema.sql` (specifically the trigger section)

5. Navigate to: **Authentication** → **Providers** → **Email**

6. **Choose one option:**

   ### Option A: Keep Email Confirmation (Recommended for Production)
   - Keep "Confirm email" **ENABLED** (toggled ON)
   - Users will receive confirmation emails
   - Provides account recovery via email
   - Prevents typos in email addresses

   ### Option B: Disable Email Confirmation (Easier for Development)
   - Toggle "Confirm email" **OFF**
   - Users can register and login immediately
   - No email verification needed
   - Good for testing, but less secure

7. Click **Save**

## Testing

### With Email Confirmation Enabled:
1. Register a new account
2. You should see: "Please check your email to confirm your account before logging in"
3. Check email inbox for confirmation link
4. Click confirmation link
5. Return to app and login with email/password

### With Email Confirmation Disabled:
1. Register a new account
2. You should be immediately logged in and redirected to `/app`
3. No email verification needed

## Anonymous Accounts

Anonymous accounts (created via "Skip" button) always skip email confirmation, since they use generated email addresses like `local_12345@local.stubly.app`.
