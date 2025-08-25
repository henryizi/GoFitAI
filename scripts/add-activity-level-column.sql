-- Add activity_level column to profiles table
ALTER TABLE profiles 
ADD COLUMN activity_level TEXT CHECK (activity_level IN ('sedentary', 'moderate', 'very-active'));

-- Add comment to document the column
COMMENT ON COLUMN profiles.activity_level IS 'User''s activity level based on daily steps: sedentary (under 5k), moderate (5k-15k), or very-active (15k+)'; 