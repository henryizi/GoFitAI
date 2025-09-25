-- Corrected fix for profile constraints based on actual schema
-- This addresses the real columns: activity_level, training_level, primary_goal, fitness_strategy

-- Step 1: Check current constraints
SELECT 'Current constraints:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
AND contype = 'c';

-- Step 2: Check current data values in actual columns
SELECT 'Current data values:' as info;
SELECT 'activity_level' as field, activity_level as value, COUNT(*) as count 
FROM public.profiles 
WHERE activity_level IS NOT NULL 
GROUP BY activity_level

UNION ALL

SELECT 'training_level' as field, training_level as value, COUNT(*) as count 
FROM public.profiles 
WHERE training_level IS NOT NULL 
GROUP BY training_level

UNION ALL

SELECT 'primary_goal' as field, primary_goal as value, COUNT(*) as count 
FROM public.profiles 
WHERE primary_goal IS NOT NULL 
GROUP BY primary_goal

UNION ALL

SELECT 'fitness_strategy' as field, fitness_strategy as value, COUNT(*) as count 
FROM public.profiles 
WHERE fitness_strategy IS NOT NULL 
GROUP BY fitness_strategy

UNION ALL

SELECT 'weight_trend' as field, weight_trend as value, COUNT(*) as count 
FROM public.profiles 
WHERE weight_trend IS NOT NULL 
GROUP BY weight_trend

UNION ALL

SELECT 'exercise_frequency' as field, exercise_frequency as value, COUNT(*) as count 
FROM public.profiles 
WHERE exercise_frequency IS NOT NULL 
GROUP BY exercise_frequency

ORDER BY field, value;

-- Step 3: Update existing data to match TypeScript types
SELECT 'Updating existing data...' as info;

-- Fix activity_level: map 'moderate' -> 'moderately_active', 'very-active' -> 'very_active'
UPDATE public.profiles 
SET activity_level = 'moderately_active' 
WHERE activity_level = 'moderate';

UPDATE public.profiles 
SET activity_level = 'very_active' 
WHERE activity_level = 'very-active';

-- Fix primary_goal: ensure it matches TypeScript types
UPDATE public.profiles 
SET primary_goal = 'fat_loss' 
WHERE primary_goal = 'weight_loss';

UPDATE public.profiles 
SET primary_goal = 'muscle_gain' 
WHERE primary_goal = 'hypertrophy';

-- Fix fitness_strategy: map common variants
UPDATE public.profiles 
SET fitness_strategy = 'maintenance' 
WHERE fitness_strategy = 'maintain';

-- Step 4: Drop all existing check constraints that might conflict
SELECT 'Dropping old constraints...' as info;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_activity_level_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_training_level_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_primary_goal_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_fitness_strategy_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_weight_trend_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_exercise_frequency_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;

-- Step 5: Add new constraints that match TypeScript types exactly
SELECT 'Adding new constraints...' as info;

-- activity_level: 'sedentary' | 'moderately_active' | 'very_active'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_activity_level_check 
CHECK (activity_level IN ('sedentary', 'moderately_active', 'very_active'));

-- training_level: 'beginner' | 'intermediate' | 'advanced' 
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_training_level_check 
CHECK (training_level IN ('beginner', 'intermediate', 'advanced'));

-- primary_goal: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_primary_goal_check 
CHECK (primary_goal IN ('general_fitness', 'hypertrophy', 'athletic_performance', 'fat_loss', 'muscle_gain'));

-- fitness_strategy: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_fitness_strategy_check 
CHECK (fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining'));

-- weight_trend: 'losing' | 'gaining' | 'stable' | 'unsure'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_weight_trend_check 
CHECK (weight_trend IN ('losing', 'gaining', 'stable', 'unsure'));

-- exercise_frequency: '1' | '2-3' | '4-5' | '6-7'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_exercise_frequency_check 
CHECK (exercise_frequency IN ('1', '2-3', '4-5', '6-7'));

-- gender: 'male' | 'female'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_gender_check 
CHECK (gender IN ('male', 'female'));

-- Step 6: Verify the fixes
SELECT 'Verification - Current data after fixes:' as info;
SELECT 'activity_level' as field, activity_level as value, COUNT(*) as count 
FROM public.profiles 
WHERE activity_level IS NOT NULL 
GROUP BY activity_level

UNION ALL

SELECT 'training_level' as field, training_level as value, COUNT(*) as count 
FROM public.profiles 
WHERE training_level IS NOT NULL 
GROUP BY training_level

UNION ALL

SELECT 'primary_goal' as field, primary_goal as value, COUNT(*) as count 
FROM public.profiles 
WHERE primary_goal IS NOT NULL 
GROUP BY primary_goal

UNION ALL

SELECT 'fitness_strategy' as field, fitness_strategy as value, COUNT(*) as count 
FROM public.profiles 
WHERE fitness_strategy IS NOT NULL 
GROUP BY fitness_strategy

ORDER BY field, value;

SELECT 'All constraints updated successfully!' as result;
