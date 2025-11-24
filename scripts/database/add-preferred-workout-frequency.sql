-- Add preferred_workout_frequency column to profiles table
-- This stores the user's actual preferred workout days per week (1-7)
-- Unlike workout_frequency (bucketed: 2_3, 4_5, 6) and exercise_frequency (bucketed: 1, 2-3, 4-5, 6-7),
-- this field stores the exact number the user selected

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_workout_frequency INTEGER CHECK (preferred_workout_frequency >= 1 AND preferred_workout_frequency <= 7);

-- Add comment to document the column
COMMENT ON COLUMN profiles.preferred_workout_frequency IS 'User''s preferred workout frequency as an exact number (1-7 days per week) for accurate nutrition and TDEE calculations';


