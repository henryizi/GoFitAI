# RLS Policy Analysis for Profiles Table

## Current RLS Policies

The `profiles` table has the following Row Level Security policies:

### SELECT Policy
```sql
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
```
- **Purpose**: Users can only view their own profile
- **Check**: `auth.uid()` must equal the profile's `id` column
- **Impact**: If `auth.uid()` doesn't match the profile `id`, the query returns no rows (not an error, just empty)

### INSERT Policy
```sql
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```
- **Purpose**: Users can only insert profiles with their own user ID
- **Check**: The `id` being inserted must match `auth.uid()`

### UPDATE Policy
```sql
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
```
- **Purpose**: Users can only update their own profile
- **Check**: `auth.uid()` must equal the profile's `id` column

## Potential Issues with Linked Accounts

### Issue 1: User ID Mismatch After Account Linking
When accounts are linked (e.g., Google + Apple), Supabase should preserve the primary account's user ID. However, there can be edge cases:

**Scenario**: 
- User creates account with Apple → profile created with user ID `A`
- User links Google account → Supabase links accounts but might temporarily have sync issues
- `auth.uid()` might return `A` but the session might report user ID `B` during the sync period

**Solution**: The code already handles this with retries and longer timeouts (15s for linked accounts).

### Issue 2: Profile Created Before Account Linking
If a profile was created with user ID `A`, but after linking accounts, `auth.uid()` returns `B`, the RLS policy will block access.

**Solution**: Supabase should preserve the primary account's ID, but if this happens, the profile needs to be migrated to the new user ID.

### Issue 3: auth.uid() Returns NULL
If the session isn't properly authenticated, `auth.uid()` returns `NULL`, and all RLS policies will block access.

**Solution**: Ensure session is properly established before querying profiles.

## Enhanced Logging

The code now includes enhanced logging to diagnose RLS issues:

1. **RLS Check Logging**: Compares `auth.uid()` with the `userId` being queried
2. **Mismatch Warnings**: Warns if IDs don't match (potential RLS block)
3. **Error Context**: Adds RLS context to error messages

## How to Verify RLS Policies

### Option 1: Supabase Dashboard
1. Go to Authentication > Policies
2. Select `profiles` table
3. Verify all 3 policies exist and are enabled

### Option 2: SQL Query
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles';
```

### Option 3: Run Diagnostic Script
```bash
node scripts/check-rls-policies.js
```

## Testing RLS Behavior

To test if RLS is working correctly:

1. **As authenticated user**: Should be able to read own profile
2. **As different user**: Should NOT be able to read another user's profile
3. **Without session**: Should NOT be able to read any profile

## Recommendations

1. ✅ **Keep current retry logic** for linked accounts (15s timeout, exponential backoff)
2. ✅ **Monitor logs** for `[RLS Warning]` messages to catch ID mismatches
3. ✅ **Verify policies** are correctly set up in Supabase Dashboard
4. ⚠️ **If profile missing**: Check if user needs onboarding (expected for new users)
5. ⚠️ **If RLS blocking**: Verify `auth.uid()` matches profile `id` in logs

## Files Modified

- `src/hooks/useAuth.tsx`: Added RLS diagnostic logging
- `scripts/check-rls-policies.js`: Created diagnostic script


