-- Add exercise_frequency column to profiles table
ALTER TABLE profiles 
ADD COLUMN exercise_frequency TEXT CHECK (exercise_frequency IN ('1', '2-3', '4-5', '6-7'));

-- Add comment to document the column
COMMENT ON COLUMN profiles.exercise_frequency IS 'User''s exercise frequency: 1, 2-3, 4-5, or 6-7 sessions per week'; 
COMMENT ON COLUMN profiles.exercise_frequency IS 'User''s exercise frequency: 0, 1-3, 4-6, or 7+ sessions per week'; 