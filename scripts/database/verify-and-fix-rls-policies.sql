-- Verify and Fix RLS Policies for Profiles Table
-- Run this script in your Supabase Dashboard SQL Editor
-- This will verify existing policies and create missing ones

-- ============================================================================
-- STEP 1: Check if RLS is enabled
-- ============================================================================
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- ============================================================================
-- STEP 2: Check existing policies
-- ============================================================================
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: Enable RLS if not already enabled
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Drop ALL existing policies (to remove duplicates and recreate cleanly)
-- ============================================================================
-- Drop old policies (if they exist)
DROP POLICY IF EXISTS "Self-select" ON public.profiles;
DROP POLICY IF EXISTS "Self-insert" ON public.profiles;
DROP POLICY IF EXISTS "Self-update" ON public.profiles;

-- Drop newer policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop any other policies that might exist (catch-all)
-- Note: This will remove ALL policies. We'll recreate the correct ones below.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Create SELECT policy (users can view their own profile)
-- ============================================================================
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- ============================================================================
-- STEP 6: Create INSERT policy (users can insert their own profile)
-- ============================================================================
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- STEP 7: Create UPDATE policy (users can update their own profile)
-- ============================================================================
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================================================
-- STEP 8: Verify policies were created successfully
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Users can view their own profile'
    WHEN cmd = 'INSERT' THEN '✅ Users can insert their own profile'
    WHEN cmd = 'UPDATE' THEN '✅ Users can update their own profile'
    ELSE cmd::text
  END as policy_description,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd;

-- ============================================================================
-- STEP 9: Test query (requires authentication - run this from your app)
-- ============================================================================
-- This query will only work if you're authenticated and auth.uid() matches the profile id
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- ============================================================================
-- TROUBLESHOOTING NOTES
-- ============================================================================
-- 
-- If queries are timing out or being blocked:
-- 
-- 1. Check that auth.uid() matches the profile id:
--    - In your app, log: session.user.id
--    - Compare with: profile.id from database
--    - They must match for RLS to allow access
--
-- 2. For linked accounts (Google + Apple):
--    - Supabase should preserve the primary account's user ID
--    - There might be a brief sync period where auth.uid() doesn't match
--    - The app has retry logic to handle this
--
-- 3. If auth.uid() returns NULL:
--    - Session is not properly authenticated
--    - Check that the user is logged in
--    - Verify session is persisted and refreshed
--
-- 4. Common error codes:
--    - PGRST301: RLS policy violation
--    - 42501: PostgreSQL permission denied
--    - Timeout: Query blocked by RLS before error can be returned
--
-- ============================================================================

