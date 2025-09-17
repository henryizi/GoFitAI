-- Add metabolic_calculations column to nutrition_plans table
-- This migration adds support for storing metabolic calculation data

ALTER TABLE public.nutrition_plans
ADD COLUMN IF NOT EXISTS metabolic_calculations JSONB;

-- Add comment to document the column
COMMENT ON COLUMN public.nutrition_plans.metabolic_calculations IS 'Stores metabolic calculations including BMR, TDEE, activity level, and calorie adjustments';

SELECT 'Metabolic calculations column added to nutrition_plans table successfully.';





























































