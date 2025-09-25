-- Fix activity_level column constraint to match TypeScript types
-- The current constraint uses 'moderate' and 'very-active' but the app sends 'moderately_active' and 'very_active'

-- Drop the existing constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_activity_level_check;

-- Add the correct constraint that matches the TypeScript types
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_activity_level_check 
CHECK (activity_level IN ('sedentary', 'moderately_active', 'very_active'));

-- Update the comment to reflect the correct values
COMMENT ON COLUMN public.profiles.activity_level IS 'User''s activity level: sedentary, moderately_active, or very_active';

-- Verify the constraint was updated
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND conname = 'profiles_activity_level_check';




