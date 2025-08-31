-- Comprehensive fix for workout history data
-- This script will fix both workout names and remove all "?" symbols

-- ========================================
-- STEP 0: DIAGNOSTIC - Check what training split names are available
-- ========================================

SELECT '🔍 DIAGNOSTIC: Available Training Splits' as info;
SELECT 
  ts.id as split_id,
  ts.name as split_name,
  wp.name as plan_name,
  ws.week_number,
  ws.day_number
FROM public.training_splits ts
JOIN public.workout_sessions ws ON ts.id = ws.split_id
JOIN public.workout_plans wp ON ws.plan_id = wp.id
ORDER BY wp.name, ws.week_number, ws.day_number;

SELECT '🔍 DIAGNOSTIC: Current Workout History Names' as info;
SELECT 
  id,
  session_name,
  plan_name,
  week_number,
  day_number,
  plan_id
FROM public.workout_history
WHERE session_name LIKE 'Workout%' OR session_name LIKE 'Week%' OR session_name LIKE '%Plan%'
ORDER BY completed_at DESC
LIMIT 10;

-- ========================================
-- STEP 1: Fix the workout names first - Get actual training split names from user's plan
-- ========================================

-- First, let's see what the actual training split names are
SELECT '🔍 DIAGNOSTIC: What training splits exist for this plan?' as info;
SELECT DISTINCT
  ts.name as actual_split_name,
  ts.id as split_id
FROM public.training_splits ts
JOIN public.workout_sessions ws ON ts.id = ws.split_id
WHERE ws.plan_id IN (
  SELECT DISTINCT plan_id FROM public.workout_history WHERE plan_id IS NOT NULL
);

-- Now fix the workout names by getting the actual training split names
-- Use a more direct approach to find the right training split
UPDATE public.workout_history 
SET session_name = (
  SELECT ts.name
  FROM public.workout_sessions ws
  JOIN public.training_splits ts ON ws.split_id = ts.id
  WHERE ws.plan_id = workout_history.plan_id
    AND ws.week_number = workout_history.week_number
    AND ws.day_number = workout_history.day_number
    AND ts.name IS NOT NULL
    AND ts.name != ''
    AND ts.name NOT LIKE '%Plan%'
  LIMIT 1
)
WHERE week_number IS NOT NULL 
  AND day_number IS NOT NULL
  AND plan_id IS NOT NULL
  AND (session_name LIKE 'Workout%' OR session_name LIKE 'Week%' OR session_name LIKE '%Plan%');

-- If we still don't have good names, create simple descriptive ones
UPDATE public.workout_history 
SET session_name = CASE
  WHEN week_number IS NOT NULL AND day_number IS NOT NULL 
  THEN CONCAT('Week ', week_number, ' Day ', day_number)
  WHEN week_number IS NOT NULL 
  THEN CONCAT('Week ', week_number, ' Workout')
  ELSE 'Workout Session'
END
WHERE session_name LIKE 'Workout%' 
  OR session_name LIKE 'Week%'
  OR session_name LIKE '%Plan%'
  OR session_name IS NULL;

-- ========================================
-- STEP 2: Fix the missing totals (remove "?" symbols)
-- ========================================

-- Update total_exercises based on exercises_data
UPDATE public.workout_history 
SET total_exercises = (
  SELECT COUNT(DISTINCT e->>'exercise_id') 
  FROM public.workout_history wh2,
  LATERAL jsonb_array_elements(wh2.exercises_data->'exercises') AS e
  WHERE wh2.id = workout_history.id
)
WHERE exercises_data IS NOT NULL 
  AND (total_exercises IS NULL OR total_exercises = 0);

-- Update total_sets based on exercises_data
UPDATE public.workout_history 
SET total_sets = (
  SELECT COUNT(s) 
  FROM public.workout_history wh2,
  LATERAL jsonb_array_elements(wh2.exercises_data->'exercises') AS e,
  LATERAL jsonb_array_elements(e->'sets') AS s
  WHERE wh2.id = workout_history.id
)
WHERE exercises_data IS NOT NULL 
  AND (total_sets IS NULL OR total_sets = 0);

-- Update estimated_calories based on exercises_data
UPDATE public.workout_history 
SET estimated_calories = (
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN s->>'weight' IS NOT NULL AND s->>'reps' IS NOT NULL 
        THEN (s->>'weight')::numeric * (s->>'reps')::numeric * 0.1
        ELSE 0 
      END
    ), 0
  )
  FROM public.workout_history wh2,
  LATERAL jsonb_array_elements(wh2.exercises_data->'exercises') AS e,
  LATERAL jsonb_array_elements(e->'sets') AS s
  WHERE wh2.id = workout_history.id
)
WHERE exercises_data IS NOT NULL 
  AND (estimated_calories IS NULL OR estimated_calories = 0);

-- ========================================
-- STEP 3: Verify all fixes worked
-- ========================================

-- Show the final results - Focus on session_name (training split names)
SELECT '🎯 Final Results - Training Split Names Only!' as info;
SELECT 
  id,
  session_name as "Training Split Name",
  total_exercises,
  total_sets,
  estimated_calories,
  week_number,
  day_number
FROM public.workout_history
ORDER BY completed_at DESC;

-- Show summary of what was fixed
SELECT '📊 Summary of fixes:' as info;
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_exercises IS NOT NULL AND total_exercises > 0 THEN 1 END) as records_with_exercise_count,
  COUNT(CASE WHEN total_sets IS NOT NULL AND total_sets > 0 THEN 1 END) as records_with_set_count,
  COUNT(CASE WHEN estimated_calories IS NOT NULL AND estimated_calories > 0 THEN 1 END) as records_with_calories,
  COUNT(CASE WHEN session_name NOT LIKE 'Workout%' AND session_name NOT LIKE 'Week%' AND session_name NOT LIKE '%Plan%' THEN 1 END) as records_with_good_names
FROM public.workout_history;




