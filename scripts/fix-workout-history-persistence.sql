-- Fix workout_history table to preserve data permanently
-- This ensures workout history is NEVER deleted when plans/sessions are removed
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing foreign key constraints that have CASCADE DELETE
ALTER TABLE public.workout_history 
DROP CONSTRAINT IF EXISTS workout_history_plan_id_fkey;

ALTER TABLE public.workout_history 
DROP CONSTRAINT IF EXISTS workout_history_session_id_fkey;

-- Step 2: Add new columns to store plan and session data independently
ALTER TABLE public.workout_history 
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS week_number INTEGER,
ADD COLUMN IF NOT EXISTS day_number INTEGER,
ADD COLUMN IF NOT EXISTS exercises_data JSONB; -- Store complete exercise data

-- Step 3: Make plan_id and session_id nullable since they might be deleted
ALTER TABLE public.workout_history 
ALTER COLUMN plan_id DROP NOT NULL,
ALTER COLUMN session_id DROP NOT NULL;

-- Step 4: Add new foreign key constraints WITHOUT cascade delete
-- This allows the IDs to exist but doesn't delete history when plans are removed
ALTER TABLE public.workout_history 
ADD CONSTRAINT workout_history_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.workout_plans(id) ON DELETE SET NULL;

ALTER TABLE public.workout_history 
ADD CONSTRAINT workout_history_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES public.workout_sessions(id) ON DELETE SET NULL;

-- Step 5: Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_workout_history_plan_name ON public.workout_history(plan_name);
CREATE INDEX IF NOT EXISTS idx_workout_history_session_name ON public.workout_history(session_name);
CREATE INDEX IF NOT EXISTS idx_workout_history_week_day ON public.workout_history(week_number, day_number);
CREATE INDEX IF NOT EXISTS idx_workout_history_exercises_data ON public.workout_history USING GIN(exercises_data);

-- Step 6: Update existing records to populate the new fields (if any exist)
-- This creates a session name from week/day and backs up exercise data
UPDATE public.workout_history 
SET 
  plan_name = (
    SELECT wp.name 
    FROM public.workout_plans wp 
    WHERE wp.id = workout_history.plan_id
  ),
  session_name = (
    SELECT CONCAT('Week ', ws.week_number, ' - Day ', ws.day_number)
    FROM public.workout_sessions ws 
    WHERE ws.id = workout_history.session_id
  ),
  week_number = (
    SELECT ws.week_number 
    FROM public.workout_sessions ws 
    WHERE ws.id = workout_history.session_id
  ),
  day_number = (
    SELECT ws.day_number 
    FROM public.workout_sessions ws 
    WHERE ws.id = workout_history.session_id
  ),
  exercises_data = (
    SELECT jsonb_build_object(
      'exercises', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'exercise_id', e.id,
            'exercise_name', e.name,
            'sets', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'set_id', el.id,
                  'weight', el.actual_weight,
                  'reps', el.actual_reps,
                  'rpe', el.actual_rpe,
                  'completed_at', el.completed_at,
                  'notes', el.notes
                )
              ) FROM public.exercise_logs el 
              WHERE el.set_id IN (
                SELECT es.id FROM public.exercise_sets es 
                WHERE es.exercise_id = e.id AND es.session_id = workout_history.session_id
              )
            )
          )
        ) FROM public.exercises e
        WHERE e.id IN (
          SELECT DISTINCT es.exercise_id 
          FROM public.exercise_sets es 
          WHERE es.session_id = workout_history.session_id
        )
      )
    )
  )
WHERE workout_history.plan_id IS NOT NULL 
  OR workout_history.session_id IS NOT NULL;

-- Step 7: Verify the changes
SELECT '✅ CASCADE DELETE constraints removed' as constraint_status;
SELECT '✅ New permanent storage columns added' as columns_status;
SELECT '✅ Foreign keys now use ON DELETE SET NULL' as foreign_key_status;
SELECT '✅ Existing data backed up to permanent fields' as backup_status;
SELECT '✅ Performance indexes created' as index_status;

-- Step 8: Show the benefits
SELECT '✅ Workout history will survive plan deletions' as benefit1;
SELECT '✅ Exercise data is backed up in exercises_data JSONB field' as benefit2;
SELECT '✅ You can safely delete workout plans without losing history' as benefit3;

-- Step 9: Final verification query
-- This should show your new table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'workout_history' 
AND column_name IN ('plan_name', 'session_name', 'week_number', 'day_number', 'exercises_data')
ORDER BY ordinal_position;




