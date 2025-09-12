-- Migration to fix constraint violations in profiles table
-- This script safely removes constraints, updates data, then re-adds constraints
-- IMPORTANT: Run this script when no constraint violations exist or constraints are temporarily disabled

-- 1. FIRST: Remove existing constraints to allow data updates
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_exercise_frequency_check;

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_workout_frequency_check;

-- 2. Show current invalid values before fixing
SELECT 'BEFORE MIGRATION - exercise_frequency' as step;
SELECT DISTINCT exercise_frequency, COUNT(*) 
FROM public.profiles 
WHERE exercise_frequency IS NOT NULL 
GROUP BY exercise_frequency 
ORDER BY exercise_frequency;

SELECT 'BEFORE MIGRATION - workout_frequency' as step;
SELECT DISTINCT workout_frequency, COUNT(*) 
FROM public.profiles 
WHERE workout_frequency IS NOT NULL 
GROUP BY workout_frequency 
ORDER BY workout_frequency;

-- 3. Update existing data mapping old values to new values
-- Fix exercise_frequency column
UPDATE public.profiles 
SET exercise_frequency = CASE 
  WHEN exercise_frequency = '0' THEN '2-3'      -- Just starting out -> 2-3 workouts
  WHEN exercise_frequency = '1-3' THEN '2-3'    -- 1-3 times -> 2-3 workouts
  WHEN exercise_frequency = '4-6' THEN '4-5'    -- 4-6 times -> 4-5 workouts
  WHEN exercise_frequency = '7+' THEN '6-7'     -- 7+ times -> 6-7 workouts
  WHEN exercise_frequency = '7' THEN '6-7'      -- 7 times -> 6-7 workouts
  WHEN exercise_frequency IN ('1', '2', '3') THEN '2-3'  -- Individual numbers -> 2-3 workouts
  WHEN exercise_frequency IN ('4', '5', '6') THEN '4-5'  -- Individual numbers -> 4-5 workouts
  ELSE exercise_frequency
END
WHERE exercise_frequency NOT IN ('1', '2-3', '4-5', '6-7');

-- Fix workout_frequency column  
UPDATE public.profiles 
SET workout_frequency = CASE 
  WHEN workout_frequency = '0' THEN '2_3'       -- Just starting out -> 2_3 workouts
  WHEN workout_frequency = '1' THEN '2_3'       -- 1 time -> 2_3 workouts
  WHEN workout_frequency = '2' THEN '2_3'       -- 2 times -> 2_3 workouts
  WHEN workout_frequency = '3' THEN '2_3'       -- 3 times -> 2_3 workouts
  WHEN workout_frequency = '4' THEN '4_5'       -- 4 times -> 4_5 workouts
  WHEN workout_frequency = '5' THEN '4_5'       -- 5 times -> 4_5 workouts
  WHEN workout_frequency = '7' THEN '6'         -- 7 times -> 6 workouts (highest option)
  WHEN workout_frequency = '7+' THEN '6'        -- 7+ times -> 6 workouts
  WHEN workout_frequency = '1-3' THEN '2_3'     -- 1-3 times -> 2_3 workouts
  WHEN workout_frequency = '4-6' THEN '4_5'     -- 4-6 times -> 4_5 workouts
  ELSE workout_frequency
END
WHERE workout_frequency NOT IN ('2_3', '4_5', '6');

-- 4. Show values after data migration
SELECT 'AFTER MIGRATION - exercise_frequency' as step;
SELECT DISTINCT exercise_frequency, COUNT(*) 
FROM public.profiles 
WHERE exercise_frequency IS NOT NULL 
GROUP BY exercise_frequency 
ORDER BY exercise_frequency;

SELECT 'AFTER MIGRATION - workout_frequency' as step;
SELECT DISTINCT workout_frequency, COUNT(*) 
FROM public.profiles 
WHERE workout_frequency IS NOT NULL 
GROUP BY workout_frequency 
ORDER BY workout_frequency;

-- 5. Re-add the constraints with correct values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_exercise_frequency_check 
CHECK (exercise_frequency IN ('1', '2-3', '4-5', '6-7'));

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_workout_frequency_check 
CHECK (workout_frequency IN ('2_3', '4_5', '6'));

-- 6. Update the column comments
COMMENT ON COLUMN public.profiles.exercise_frequency IS 'User''s exercise frequency: 1, 2-3, 4-5, or 6-7 sessions per week';
COMMENT ON COLUMN public.profiles.workout_frequency IS 'User''s preferred workout frequency per week: 2_3, 4_5, or 6';

-- 7. Final verification - should show only valid values
SELECT 'FINAL VERIFICATION - exercise_frequency' as step;
SELECT 
  exercise_frequency, 
  COUNT(*) as count
FROM public.profiles 
WHERE exercise_frequency IS NOT NULL
GROUP BY exercise_frequency
ORDER BY exercise_frequency;

SELECT 'FINAL VERIFICATION - workout_frequency' as step;
SELECT 
  workout_frequency, 
  COUNT(*) as count
FROM public.profiles 
WHERE workout_frequency IS NOT NULL
GROUP BY workout_frequency
ORDER BY workout_frequency;

-- SUCCESS: Migration completed! All values should now be compliant with constraints.
