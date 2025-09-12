-- COMPREHENSIVE PROFILES TABLE MIGRATION
-- Run this SQL in your Supabase dashboard to add all missing columns
-- Go to Supabase Dashboard > SQL Editor and run this query

BEGIN;

-- 1. Add unit preference columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS height_unit_preference text CHECK (height_unit_preference IN ('cm', 'ft')),
ADD COLUMN IF NOT EXISTS weight_unit_preference text CHECK (weight_unit_preference IN ('kg', 'lbs'));

-- 2. Add height_cm and weight_kg columns for metric storage
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS height_cm REAL,
ADD COLUMN IF NOT EXISTS weight_kg REAL;

-- 3. Migrate existing height/weight data to new columns if they exist
UPDATE profiles 
SET height_cm = height, weight_kg = weight 
WHERE height_cm IS NULL AND height IS NOT NULL;

-- 2. Add fitness strategy column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fitness_strategy text CHECK (fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining'));

-- 3. Add legacy goal columns (for backward compatibility)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_fat_reduction REAL,
ADD COLUMN IF NOT EXISTS goal_muscle_gain REAL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.height_unit_preference IS 'User preferred unit for height display (cm or ft)';
COMMENT ON COLUMN profiles.weight_unit_preference IS 'User preferred unit for weight display (kg or lbs)';
COMMENT ON COLUMN profiles.fitness_strategy IS 'User fitness strategy: bulk, cut, maintenance, recomp, or maingaining';
COMMENT ON COLUMN profiles.goal_fat_reduction IS 'Legacy: User goal for fat reduction in kg';
COMMENT ON COLUMN profiles.goal_muscle_gain IS 'Legacy: User goal for muscle gain in kg';

-- Set default preferences for existing users
UPDATE profiles 
SET 
  height_unit_preference = COALESCE(height_unit_preference, 'cm'),
  weight_unit_preference = COALESCE(weight_unit_preference, 'kg'),
  fitness_strategy = COALESCE(fitness_strategy, 'maintenance')
WHERE height_unit_preference IS NULL OR weight_unit_preference IS NULL OR fitness_strategy IS NULL;

COMMIT;

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('height_unit_preference', 'weight_unit_preference');
