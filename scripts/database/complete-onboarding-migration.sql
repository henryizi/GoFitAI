-- Complete Onboarding Migration for GoFitAI
-- This migration adds all the onboarding fields to the profiles table

-- 1. Add gender column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

-- 2. Add weight_trend column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weight_trend TEXT CHECK (weight_trend IN ('losing', 'gaining', 'stable', 'unsure'));

-- 3. Add exercise_frequency column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS exercise_frequency TEXT CHECK (exercise_frequency IN ('1', '2-3', '4-5', '6-7'));

-- 4. Add activity_level column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'moderate', 'very-active'));

-- 5. Add body_fat column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS body_fat DECIMAL(5,2);

-- 6. Add goal_fat_reduction column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS goal_fat_reduction REAL;

-- 7. Add goal_muscle_gain column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS goal_muscle_gain REAL;

-- Add comments to document all columns
COMMENT ON COLUMN public.profiles.gender IS 'User''s gender: male or female';
COMMENT ON COLUMN public.profiles.weight_trend IS 'User''s weight trend over the past few weeks: losing, gaining, stable, or unsure';
COMMENT ON COLUMN public.profiles.exercise_frequency IS 'User''s exercise frequency: 1, 2-3, 4-5, or 6-7 sessions per week';
COMMENT ON COLUMN public.profiles.activity_level IS 'User''s activity level based on daily steps: sedentary (under 5k), moderate (5k-15k), or very-active (15k+)';
COMMENT ON COLUMN public.profiles.body_fat IS 'User''s estimated body fat percentage (0-100)';
COMMENT ON COLUMN public.profiles.goal_fat_reduction IS 'User''s goal for fat reduction in kg';
COMMENT ON COLUMN public.profiles.goal_muscle_gain IS 'User''s goal for muscle gain in kg';

-- Verify the migration by showing the table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND table_schema = 'public'
-- ORDER BY ordinal_position; 