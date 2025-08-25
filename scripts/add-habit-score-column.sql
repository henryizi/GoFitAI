-- Add habit_score column to daily_user_metrics table
-- This will store the calculated daily habit score (0-100)

ALTER TABLE public.daily_user_metrics 
ADD COLUMN IF NOT EXISTS habit_score INTEGER CHECK (habit_score >= 0 AND habit_score <= 100);

-- Add index for efficient habit score queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_habit_score 
ON public.daily_user_metrics(user_id, metric_date, habit_score);

-- Update RLS policy to include habit_score (policy already exists, just ensuring it covers new column)
-- No changes needed as existing policy covers all columns for the user's own data

-- Add comment for documentation
COMMENT ON COLUMN public.daily_user_metrics.habit_score IS 'Daily habit adherence score (0-100) calculated from nutrition, weight tracking, workouts, and wellness metrics';






