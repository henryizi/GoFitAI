-- Add snack_suggestions and daily_schedule columns to the nutrition_plans table
ALTER TABLE public.nutrition_plans
ADD COLUMN snack_suggestions JSONB,
ADD COLUMN daily_schedule JSONB; 