-- Fix activity_level data and schema constraint
-- Step 1: First check what values currently exist
SELECT activity_level, COUNT(*) as count 
FROM public.profiles 
WHERE activity_level IS NOT NULL 
GROUP BY activity_level;

-- Step 2: Update existing data to match the new constraint
-- Map old values to new values:
-- 'moderate' -> 'moderately_active'
-- 'very-active' -> 'very_active'
-- 'sedentary' stays the same

UPDATE public.profiles 
SET activity_level = 'moderately_active' 
WHERE activity_level = 'moderate';

UPDATE public.profiles 
SET activity_level = 'very_active' 
WHERE activity_level = 'very-active';

-- Step 3: Now drop the old constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_activity_level_check;

-- Step 4: Add the new constraint that matches TypeScript types
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_activity_level_check 
CHECK (activity_level IN ('sedentary', 'moderately_active', 'very_active'));

-- Step 5: Update the comment
COMMENT ON COLUMN public.profiles.activity_level IS 'User''s activity level: sedentary, moderately_active, or very_active';

-- Step 6: Verify the fix worked
SELECT activity_level, COUNT(*) as count 
FROM public.profiles 
WHERE activity_level IS NOT NULL 
GROUP BY activity_level;




