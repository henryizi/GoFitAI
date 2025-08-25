-- Add body_fat column to profiles table
ALTER TABLE profiles ADD COLUMN body_fat DECIMAL(5,2);

-- Add comment to document the column
COMMENT ON COLUMN profiles.body_fat IS 'User''s estimated body fat percentage (0-100)'; 