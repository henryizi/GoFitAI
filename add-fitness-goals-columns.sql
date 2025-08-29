-- Migration to add missing fitness goals columns to profiles table
-- Run this in Supabase SQL Editor

-- Add primary_goal column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS primary_goal TEXT CHECK (primary_goal IN ('general_fitness', 'fat_loss', 'muscle_gain', 'athletic_performance'));

-- Add workout_frequency column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS workout_frequency TEXT CHECK (workout_frequency IN ('2_3', '4_5', '6'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.primary_goal IS 'User''s primary fitness goal';
COMMENT ON COLUMN profiles.workout_frequency IS 'User''s preferred workout frequency per week';

-- Optional: Add default values for existing users
UPDATE profiles
SET
  primary_goal = 'general_fitness',
  workout_frequency = '4_5'
WHERE primary_goal IS NULL OR workout_frequency IS NULL;
