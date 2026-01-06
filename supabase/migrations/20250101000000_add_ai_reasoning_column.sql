-- Add ai_reasoning column to workout_plans table
-- This column stores the AI's explanation for why the split and exercises were chosen

ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS ai_reasoning JSONB;

-- Add comment to document the column
COMMENT ON COLUMN public.workout_plans.ai_reasoning IS 'AI-generated reasoning for workout plan decisions, including split_reasoning and exercise_selection_reasoning';
