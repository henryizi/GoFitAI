-- Clean Up Duplicate RLS Policies
-- Run this script in Supabase Dashboard SQL Editor
-- This will remove all duplicate policies and keep only one set

-- Step 1: View current policies (for reference)
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Self-select" ON public.profiles;
DROP POLICY IF EXISTS "Self-insert" ON public.profiles;
DROP POLICY IF EXISTS "Self-update" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create clean policies (one set only)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Step 5: Verify final state (should show exactly 3 policies)
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd;

-- Expected result: Exactly 3 policies:
-- 1. SELECT policy with USING (auth.uid() = id)
-- 2. INSERT policy with WITH CHECK (auth.uid() = id)
-- 3. UPDATE policy with USING (auth.uid() = id)


