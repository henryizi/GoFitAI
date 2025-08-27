-- Add body_fat_percentage column to daily_user_metrics table
-- This allows users to track body fat percentage over time in their progress history

ALTER TABLE public.daily_user_metrics 
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5,2);

-- Add comment to document the column
COMMENT ON COLUMN public.daily_user_metrics.body_fat_percentage IS 'User''s body fat percentage for this date (0-100)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_metrics_body_fat ON public.daily_user_metrics(user_id, metric_date) 
WHERE body_fat_percentage IS NOT NULL;
