-- COMPLETE PROFILES TABLE MIGRATION
-- This will add ALL missing columns to match your TypeScript types exactly
-- Run this in Supabase SQL Editor

BEGIN;

-- First, let's check what columns currently exist
SELECT 'Current columns in profiles table:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Add all missing columns that are in TypeScript but not in database
SELECT 'Adding missing columns...' as info;

-- Core onboarding columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height_cm REAL,
ADD COLUMN IF NOT EXISTS weight_kg REAL,
ADD COLUMN IF NOT EXISTS primary_goal TEXT,
ADD COLUMN IF NOT EXISTS workout_frequency TEXT,
ADD COLUMN IF NOT EXISTS body_fat REAL,
ADD COLUMN IF NOT EXISTS weight_trend TEXT,
ADD COLUMN IF NOT EXISTS activity_level TEXT,
ADD COLUMN IF NOT EXISTS fitness_strategy TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS height_unit_preference TEXT,
ADD COLUMN IF NOT EXISTS weight_unit_preference TEXT,
ADD COLUMN IF NOT EXISTS height_original_value TEXT,
ADD COLUMN IF NOT EXISTS weight_original_value TEXT,
ADD COLUMN IF NOT EXISTS goal_fat_reduction REAL,
ADD COLUMN IF NOT EXISTS goal_muscle_gain REAL;

-- Drop any existing constraints that might conflict
SELECT 'Removing old constraints...' as info;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_activity_level_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_training_level_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_primary_goal_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_fitness_strategy_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_weight_trend_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_workout_frequency_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_height_unit_preference_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_weight_unit_preference_check;

-- Add constraints that match TypeScript types exactly
SELECT 'Adding new constraints...' as info;

-- training_level: 'beginner' | 'intermediate' | 'advanced' 
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_training_level_check 
CHECK (training_level IN ('beginner', 'intermediate', 'advanced'));

-- primary_goal: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_primary_goal_check 
CHECK (primary_goal IN ('general_fitness', 'hypertrophy', 'athletic_performance', 'fat_loss', 'muscle_gain'));

-- workout_frequency: '2_3' | '4_5' | '6'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_workout_frequency_check 
CHECK (workout_frequency IN ('2_3', '4_5', '6'));

-- weight_trend: 'losing' | 'gaining' | 'stable' | 'unsure'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_weight_trend_check 
CHECK (weight_trend IN ('losing', 'gaining', 'stable', 'unsure'));


-- activity_level: 'sedentary' | 'moderately_active' | 'very_active'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_activity_level_check 
CHECK (activity_level IN ('sedentary', 'moderately_active', 'very_active'));

-- fitness_strategy: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_fitness_strategy_check 
CHECK (fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining'));

-- gender: 'male' | 'female'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_gender_check 
CHECK (gender IN ('male', 'female'));

-- height_unit_preference: 'cm' | 'ft'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_height_unit_preference_check 
CHECK (height_unit_preference IN ('cm', 'ft'));

-- weight_unit_preference: 'kg' | 'lbs'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_weight_unit_preference_check 
CHECK (weight_unit_preference IN ('kg', 'lbs'));

-- Add helpful comments
COMMENT ON COLUMN public.profiles.workout_frequency IS 'User workout frequency per week: 2_3, 4_5, or 6';
COMMENT ON COLUMN public.profiles.activity_level IS 'User daily activity level: sedentary, moderately_active, or very_active';
COMMENT ON COLUMN public.profiles.primary_goal IS 'User primary fitness goal';
COMMENT ON COLUMN public.profiles.fitness_strategy IS 'User fitness strategy approach';

-- Set default values for unit preferences for existing users
UPDATE public.profiles 
SET 
  height_unit_preference = COALESCE(height_unit_preference, 'cm'),
  weight_unit_preference = COALESCE(weight_unit_preference, 'kg')
WHERE id IS NOT NULL;

-- Migrate existing data to new columns
UPDATE public.profiles 
SET 
  height_cm = COALESCE(height_cm, height),
  weight_kg = COALESCE(weight_kg, weight)
WHERE height_cm IS NULL OR weight_kg IS NULL;

COMMIT;

-- Verify the migration
SELECT 'Migration complete! New columns added:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
AND column_name IN ('workout_frequency', 'activity_level', 'primary_goal', 'fitness_strategy')
ORDER BY column_name;
