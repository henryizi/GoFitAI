# RLS Policy Troubleshooting Guide

## Overview

This guide helps diagnose and fix Row Level Security (RLS) policy issues that might be blocking profile queries in your GoFitAI app.

## What is RLS?

Row Level Security (RLS) is a PostgreSQL feature that restricts access to rows in a table based on policies. In Supabase, RLS policies use `auth.uid()` to check if a user has permission to access specific rows.

## Current RLS Policies for Profiles Table

The `profiles` table has three RLS policies:

### 1. SELECT Policy
```sql
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);
```
- **Purpose**: Users can only view their own profile
- **Check**: `auth.uid()` must equal the profile's `id` column
- **Result if blocked**: Query returns empty result (no error, just no rows)

### 2. INSERT Policy
```sql
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
```
- **Purpose**: Users can only insert profiles with their own user ID
- **Check**: The `id` being inserted must match `auth.uid()`

### 3. UPDATE Policy
```sql
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);
```
- **Purpose**: Users can only update their own profile
- **Check**: `auth.uid()` must equal the profile's `id` column

## Common Issues and Solutions

### Issue 1: Query Timeout

**Symptoms:**
- Queries timeout after 2-5 seconds
- No error message, just timeout
- Profile queries return empty

**Possible Causes:**
1. **RLS blocking query** - Query is blocked but timeout occurs before error
2. **Network connectivity issue** - Slow or unstable connection
3. **Session not authenticated** - `auth.uid()` returns NULL
4. **auth.uid() mismatch** - `auth.uid()` doesn't match profile `id`

**Diagnosis:**
Check the app logs for:
```
→ Session verified: { authUid: "...", queryUserId: "...", match: "✅ YES" or "❌ NO" }
```

**Solution:**
1. Verify session is authenticated before querying
2. Check that `auth.uid()` matches `user.id`
3. Run the verification script: `scripts/database/verify-and-fix-rls-policies.sql`

### Issue 2: auth.uid() Returns NULL

**Symptoms:**
- All queries are blocked
- No profile data accessible
- App redirects to onboarding even for existing users

**Possible Causes:**
1. Session not properly authenticated
2. Session expired and not refreshed
3. Token storage issue

**Diagnosis:**
Check session status:
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session?.user?.id); // Should not be null
```

**Solution:**
1. Verify session is persisted in AsyncStorage
2. Check that `autoRefreshToken` is enabled in Supabase client config
3. Ensure user is logged in before querying profiles

### Issue 3: auth.uid() Mismatch After Account Linking

**Symptoms:**
- Profile exists but query returns empty
- Linked account (Google + Apple) not finding profile
- Error logs show ID mismatch

**Possible Causes:**
1. Account linking changed user ID
2. Profile created with different user ID
3. Session sync delay after linking

**Diagnosis:**
Check logs for:
```
⚠️ [RLS WARNING] auth.uid() mismatch detected!
→ But auth.uid() = [ID_A]
→ Query userId = [ID_B]
```

**Solution:**
1. The app already has retry logic for linked accounts (15s timeout)
2. Wait for session to sync after account linking
3. If profile exists with old ID, migrate it to new ID:
   ```sql
   UPDATE profiles SET id = '[new_user_id]' WHERE id = '[old_user_id]';
   ```

### Issue 4: RLS Policies Missing or Misconfigured

**Symptoms:**
- All queries fail with permission errors
- Error code: `PGRST301` or `42501`
- Cannot access any profiles

**Diagnosis:**
Run in Supabase SQL Editor:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
```

**Solution:**
Run the verification script: `scripts/database/verify-and-fix-rls-policies.sql`

## Diagnostic Steps

### Step 1: Check RLS Status

Run in Supabase SQL Editor:
```sql
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
```

Expected: `rls_enabled = true`

### Step 2: Verify Policies Exist

Run in Supabase SQL Editor:
```sql
SELECT policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd;
```

Expected: 3 policies (SELECT, INSERT, UPDATE)

### Step 3: Check Session in App

Add logging to verify session:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const authUid = session?.user?.id;
console.log('auth.uid():', authUid);
console.log('user.id:', user.id);
console.log('Match:', authUid === user.id ? '✅' : '❌');
```

### Step 4: Test Query Directly

Try querying with service key (bypasses RLS):
```typescript
const { data, error } = await supabaseAdmin
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle();
```

If this works but regular query doesn't, it's an RLS issue.

## Verification Script

Run `scripts/database/verify-and-fix-rls-policies.sql` in Supabase SQL Editor to:
1. Check RLS status
2. List existing policies
3. Recreate policies if needed
4. Verify everything is correct

## App-Level Improvements

The app now includes:

1. **Session Verification**: Checks session before querying
2. **auth.uid() Matching**: Verifies `auth.uid()` matches `user.id`
3. **Enhanced Error Logging**: Detailed RLS error detection
4. **Timeout Handling**: Better timeout messages mentioning RLS
5. **Retry Logic**: Automatic retries for linked accounts

## Quick Fix Checklist

- [ ] Verify RLS is enabled: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`
- [ ] Check policies exist: Run verification script
- [ ] Verify session is authenticated: Check app logs
- [ ] Confirm auth.uid() matches user.id: Check app logs
- [ ] Test query with service key: Should work (bypasses RLS)
- [ ] Check network connectivity: Ensure stable connection
- [ ] Review Supabase configuration: Verify URL and keys are correct

## Still Having Issues?

1. Check app logs for detailed error messages
2. Run the diagnostic script: `node scripts/check-rls-policies.js`
3. Verify RLS policies in Supabase Dashboard
4. Test with a known user ID to isolate the issue
5. Check Supabase service status and logs

## Related Files

- `scripts/database/verify-and-fix-rls-policies.sql` - Verification and fix script
- `scripts/check-rls-policies.js` - Node.js diagnostic script
- `docs/RLS_POLICY_ANALYSIS.md` - Detailed RLS analysis
- `app/index.tsx` - App routing with RLS checks
- `src/hooks/useAuth.tsx` - Auth hook with RLS diagnostics


