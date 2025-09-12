-- SnapBodyAI Profile Table Cleanup Script
-- This script removes redundant and legacy fields from the profiles table
-- Run this in your Supabase SQL editor

-- =============================================================================
-- BACKUP FIRST (Optional but recommended)
-- =============================================================================
-- Uncomment the line below if you want to create a backup table first
-- CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- =============================================================================
-- PHASE 1: Remove completely unused legacy fields
-- =============================================================================
-- These fields were superseded by height_cm/weight_kg and are not used anywhere
ALTER TABLE profiles DROP COLUMN IF EXISTS height;
ALTER TABLE profiles DROP COLUMN IF EXISTS weight;

-- =============================================================================
-- PHASE 2: Remove goal-based fields (replaced by fitness_strategy)
-- =============================================================================
-- These were the old numeric goal system, now replaced by strategy-based approach
ALTER TABLE profiles DROP COLUMN IF EXISTS goal_fat_reduction;
ALTER TABLE profiles DROP COLUMN IF EXISTS goal_muscle_gain;

-- =============================================================================
-- PHASE 3: Remove original value fields (optional - see notes below)
-- =============================================================================
-- These store the user's original input values but appear to be unused
-- Uncomment if you want to remove them:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS height_original_value;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS weight_original_value;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these after the cleanup to verify the changes

-- Check remaining columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check sample data to ensure nothing important was lost
SELECT id, username, fitness_strategy, height_cm, weight_kg, 
       height_unit_preference, weight_unit_preference
FROM profiles 
LIMIT 5;

-- Count profiles with fitness_strategy set (should be most/all users)
SELECT 
  fitness_strategy,
  COUNT(*) as user_count
FROM profiles 
GROUP BY fitness_strategy
ORDER BY user_count DESC;







