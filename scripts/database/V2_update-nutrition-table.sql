-- This script fully migrates the nutrition_plans table to the new format.

-- Drop old columns if they exist
ALTER TABLE public.nutrition_plans
DROP COLUMN IF EXISTS daily_calories,
DROP COLUMN IF EXISTS protein_grams,
DROP COLUMN IF EXISTS carbs_grams,
DROP COLUMN IF EXISTS fat_grams,
DROP COLUMN IF EXISTS meal_suggestions,
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS updated_at;

-- Add new columns if they don't exist
ALTER TABLE public.nutrition_plans
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL CHECK (status IN ('active', 'archived')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS daily_targets JSONB,
ADD COLUMN IF NOT EXISTS food_suggestions JSONB,
ADD COLUMN IF NOT EXISTS snack_suggestions JSONB,
ADD COLUMN IF NOT EXISTS daily_schedule JSONB;

-- Make the old 'meals' column nullable, as it's no longer used
ALTER TABLE public.nutrition_plans
ALTER COLUMN meals DROP NOT NULL; 