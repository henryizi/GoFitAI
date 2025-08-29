-- Fix workout_history table to preserve data permanently
-- This ensures workout history is never deleted when plans/sessions are removed

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

-- Step 6: Update existing records to populate the new fields (if any exist)
UPDATE public.workout_history 
SET 
    plan_name = (SELECT name FROM public.workout_plans WHERE id = workout_history.plan_id),
    session_name = CONCAT('Week ', 
        (SELECT week_number FROM public.workout_sessions WHERE id = workout_history.session_id), 
        ' Day ', 
        (SELECT day_number FROM public.workout_sessions WHERE id = workout_history.session_id)
    ),
    week_number = (SELECT week_number FROM public.workout_sessions WHERE id = workout_history.session_id),
    day_number = (SELECT day_number FROM public.workout_sessions WHERE id = workout_history.session_id)
WHERE plan_id IS NOT NULL AND session_id IS NOT NULL;

-- Verification query
SELECT 
    'workout_history' as table_name, 
    COUNT(*) as total_records,
    COUNT(plan_id) as records_with_plan_id,
    COUNT(plan_name) as records_with_plan_name
FROM public.workout_history;




