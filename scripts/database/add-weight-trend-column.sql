-- Add weight_trend column to profiles table
ALTER TABLE profiles 
ADD COLUMN weight_trend TEXT CHECK (weight_trend IN ('losing', 'gaining', 'stable', 'unsure'));

-- Add comment to document the column
COMMENT ON COLUMN profiles.weight_trend IS 'User''s weight trend over the past few weeks: losing, gaining, stable, or unsure'; 