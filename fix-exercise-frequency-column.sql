-- Add the missing exercise_frequency column to profiles table
-- This is needed for the onboarding to work properly

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS exercise_frequency TEXT CHECK (exercise_frequency IN ('1', '2-3', '4-5', '6-7'));

COMMENT ON COLUMN profiles.exercise_frequency IS 'User''s exercise frequency: 1, 2-3, 4-5, or 6-7 sessions per week';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public' AND column_name = 'exercise_frequency';




