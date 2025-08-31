-- Fix workout history exercises_data field
-- This script populates the exercises_data field with backup exercise information
-- Run this in your Supabase SQL Editor to fix the "0 exercises" issue

-- Step 1: Check current state
SELECT '📊 Current workout history state:' as info;
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN exercises_data IS NOT NULL THEN 1 END) as records_with_backup_data,
  COUNT(CASE WHEN exercises_data IS NULL THEN 1 END) as records_without_backup_data,
  COUNT(CASE WHEN total_exercises > 0 THEN 1 END) as records_with_exercises,
  COUNT(CASE WHEN total_sets > 0 THEN 1 END) as records_with_sets
FROM public.workout_history;

-- Step 2: Show sample records that need fixing
SELECT '🔍 Sample records needing backup data:' as info;
SELECT 
  id,
  completed_at,
  plan_name,
  session_name,
  total_exercises,
  total_sets,
  exercises_data IS NOT NULL as has_backup_data,
  session_id IS NOT NULL as has_session
FROM public.workout_history
WHERE exercises_data IS NULL 
  OR total_exercises = 0 
  OR total_sets = 0
ORDER BY completed_at DESC
LIMIT 10;

-- Step 3: Create a temporary function to build exercises data
CREATE OR REPLACE FUNCTION build_exercises_data_for_session(session_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'exercises', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'exercise_id', e.id,
          'exercise_name', e.name,
          'muscle_groups', e.muscle_groups,
          'sets', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'set_id', es.id,
                'target_sets', es.target_sets,
                'target_reps', es.target_reps,
                'target_rpe', es.target_rpe,
                'rest_period', es.rest_period,
                'order_in_session', es.order_in_session,
                'weight', el.actual_weight,
                'reps', el.actual_reps,
                'rpe', el.actual_rpe,
                'completed_at', el.completed_at,
                'notes', el.notes
              )
            ) FROM public.exercise_sets es
            LEFT JOIN public.exercise_logs el ON es.id = el.set_id
            WHERE es.exercise_id = e.id 
            AND es.session_id = session_uuid), '[]'::jsonb
          )
        )
      ) FROM public.exercises e
      WHERE e.id IN (
        SELECT DISTINCT es.exercise_id 
        FROM public.exercise_sets es 
        WHERE es.session_id = session_uuid
      )), '[]'::jsonb
    ),
    'session_info', jsonb_build_object(
      'plan_name', (SELECT plan_name FROM public.workout_history WHERE session_id = session_uuid LIMIT 1),
      'session_name', (SELECT session_name FROM public.workout_history WHERE session_id = session_uuid LIMIT 1),
      'week_number', (SELECT week_number FROM public.workout_history WHERE session_id = session_uuid LIMIT 1),
      'day_number', (SELECT day_number FROM public.workout_history WHERE session_id = session_uuid LIMIT 1)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a temporary function to build exercises data from plan name
CREATE OR REPLACE FUNCTION build_exercises_data_from_plan(plan_name_text TEXT, session_name_text TEXT, week_num INTEGER, day_num INTEGER, completed_date TIMESTAMP)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'exercises', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'exercise_id', e.id,
          'exercise_name', e.name,
          'muscle_groups', e.muscle_groups,
          'sets', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'weight', 0,
                'reps', 0,
                'rpe', null,
                'completed_at', completed_date,
                'notes', 'Data reconstructed from plan name'
              )
            ) FROM generate_series(1, 3) as set_number), '[]'::jsonb
          )
        )
      ) FROM public.exercises e
      WHERE e.plan_id = (
        SELECT id FROM public.workout_plans 
        WHERE name = plan_name_text 
        LIMIT 1
      )
      LIMIT 5), '[]'::jsonb
    ),
    'session_info', jsonb_build_object(
      'plan_name', plan_name_text,
      'session_name', session_name_text,
      'week_number', week_num,
      'day_number', day_num,
      'note', 'Reconstructed from plan name - actual performance data may be limited'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Populate exercises_data for records that have session_id but no backup data
UPDATE public.workout_history 
SET exercises_data = build_exercises_data_for_session(session_id)
WHERE session_id IS NOT NULL 
  AND exercises_data IS NULL
  AND EXISTS (
    SELECT 1 FROM public.exercise_sets es 
    WHERE es.session_id = workout_history.session_id
  );

-- Step 6: For records without session_id (plan was deleted), try to reconstruct from plan_name
UPDATE public.workout_history 
SET exercises_data = build_exercises_data_from_plan(plan_name, session_name, week_number, day_number, completed_at)
WHERE session_id IS NULL 
  AND plan_name IS NOT NULL
  AND exercises_data IS NULL
  AND EXISTS (
    SELECT 1 FROM public.workout_plans wp 
    WHERE wp.name = workout_history.plan_name
  );

-- Step 7: Update totals based on the new exercises_data
UPDATE public.workout_history 
SET 
  total_exercises = (
    SELECT COUNT(DISTINCT e->>'exercise_id') 
    FROM public.workout_history wh2,
    LATERAL jsonb_array_elements(wh2.exercises_data->'exercises') AS e
    WHERE wh2.id = workout_history.id
  ),
  total_sets = (
    SELECT COUNT(s) 
    FROM public.workout_history wh2,
    LATERAL jsonb_array_elements(wh2.exercises_data->'exercises') AS e,
    LATERAL jsonb_array_elements(e->'sets') AS s
    WHERE wh2.id = workout_history.id
  )
WHERE exercises_data IS NOT NULL 
  AND (total_exercises IS NULL OR total_exercises = 0 OR total_sets IS NULL OR total_sets = 0);

-- Step 8: Clean up temporary functions
DROP FUNCTION IF EXISTS build_exercises_data_for_session(UUID);
DROP FUNCTION IF EXISTS build_exercises_data_from_plan(TEXT, TEXT, INTEGER, INTEGER, TIMESTAMP);

-- Step 9: Verify the fix worked
SELECT '✅ Fix completed! Verifying results:' as info;
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN exercises_data IS NOT NULL THEN 1 END) as records_with_backup_data,
  COUNT(CASE WHEN exercises_data IS NULL THEN 1 END) as records_without_backup_data,
  COUNT(CASE WHEN total_exercises > 0 THEN 1 END) as records_with_exercises,
  COUNT(CASE WHEN total_sets > 0 THEN 1 END) as records_with_sets
FROM public.workout_history;

-- Step 10: Show sample fixed records
SELECT '🎯 Sample fixed records:' as info;
SELECT 
  id,
  completed_at,
  plan_name,
  session_name,
  total_exercises,
  total_sets,
  exercises_data IS NOT NULL as has_backup_data
FROM public.workout_history
WHERE exercises_data IS NOT NULL 
  AND total_exercises > 0
ORDER BY completed_at DESC
LIMIT 10;

-- Step 11: Show any remaining problematic records
SELECT '⚠️ Remaining problematic records:' as info;
SELECT 
  id,
  completed_at,
  plan_name,
  session_name,
  total_exercises,
  total_sets,
  exercises_data IS NOT NULL as has_backup_data
FROM public.workout_history
WHERE exercises_data IS NULL 
  OR total_exercises = 0 
  OR total_sets = 0
ORDER BY completed_at DESC;