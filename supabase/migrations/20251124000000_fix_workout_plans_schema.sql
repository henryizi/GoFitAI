-- Fix workout_plans table schema to match application code

-- Add days_per_week column (Integer version of workout_frequency)
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS days_per_week INTEGER DEFAULT 4;

-- Add description column
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add weekly_schedule column (JSONB storage for the full schedule)
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;

-- Add mesocycle_length_weeks if it doesn't exist
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS mesocycle_length_weeks INTEGER DEFAULT 4;

-- Add estimated_time_per_session if it doesn't exist
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS estimated_time_per_session TEXT;

-- Add training_level if it doesn't exist
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS training_level TEXT;

-- Add primary_goal if it doesn't exist
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS primary_goal TEXT;


-- Reload schema cache
NOTIFY pgrst, 'reload schema';
