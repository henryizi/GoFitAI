-- Add is_active column to workout_plans
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add status column if it doesn't exist
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

