-- Allow the "meals" column to be nullable to support the new nutrition guide format
ALTER TABLE public.nutrition_plans
ALTER COLUMN meals DROP NOT NULL; 