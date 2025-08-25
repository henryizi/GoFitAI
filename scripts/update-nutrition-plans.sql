-- This script updates the nutrition_plans table to align with the server's data structure.

-- Drop the old columns that are no longer in use
ALTER TABLE public.nutrition_plans
DROP COLUMN IF EXISTS daily_calories,
DROP COLUMN IF EXISTS protein_grams,
DROP COLUMN IF EXISTS carbs_grams,
DROP COLUMN IF EXISTS fat_grams,
DROP COLUMN IF EXISTS meal_suggestions;

-- Add the new JSONB columns that the server expects
ALTER TABLE public.nutrition_plans
ADD COLUMN IF NOT EXISTS daily_targets JSONB,
ADD COLUMN IF NOT EXISTS food_suggestions JSONB,
ADD COLUMN IF NOT EXISTS snack_suggestions JSONB,
ADD COLUMN IF NOT EXISTS daily_schedule JSONB; 