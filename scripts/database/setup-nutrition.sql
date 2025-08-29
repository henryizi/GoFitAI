-- This script sets up the nutrition_plans table and its related policies.
-- Run this in your Supabase SQL Editor.

-- Create the nutrition_plans table
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('active', 'archived')) DEFAULT 'active',
    
    -- Store daily targets like calories, protein, carbs, and fat
    daily_targets JSONB NOT NULL,

    -- Store the full meal plan, including an array of meals and their items
    meals JSONB NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON public.nutrition_plans(user_id);

-- Drop existing policies if they exist to ensure idempotency
DROP POLICY IF EXISTS "Users can view their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can insert their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can update their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can delete their own nutrition plans" ON public.nutrition_plans;

-- Create policies for data access
CREATE POLICY "Users can view their own nutrition plans"
ON public.nutrition_plans FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition plans"
ON public.nutrition_plans FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition plans"
ON public.nutrition_plans FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition plans"
ON public.nutrition_plans FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

SELECT 'Nutrition plans table and policies created successfully.'; 