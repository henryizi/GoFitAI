-- Add AI nutrition plan fields to nutrition_plans table
-- This migration adds support for AI-generated nutrition plans with explanations

-- Add plan_type column to distinguish between manual, mathematical, and AI plans
ALTER TABLE public.nutrition_plans 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'manual' CHECK (plan_type IN ('manual', 'mathematical', 'ai_generated'));

-- Add AI explanation field for storing the summary explanation
ALTER TABLE public.nutrition_plans 
ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

-- Add AI reasoning field for storing detailed reasoning breakdown
ALTER TABLE public.nutrition_plans 
ADD COLUMN IF NOT EXISTS ai_reasoning JSONB;

-- Update existing plans to have proper plan_type
UPDATE public.nutrition_plans 
SET plan_type = 'mathematical' 
WHERE metabolic_calculations IS NOT NULL 
AND plan_type = 'manual';

-- Add index for plan_type for better query performance
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_plan_type ON public.nutrition_plans(plan_type);

-- Add comments to document the new fields
COMMENT ON COLUMN public.nutrition_plans.plan_type IS 'Type of nutrition plan: manual (user-defined), mathematical (formula-based), or ai_generated (AI-powered)';
COMMENT ON COLUMN public.nutrition_plans.ai_explanation IS 'AI-generated summary explanation of why this nutrition plan was recommended';
COMMENT ON COLUMN public.nutrition_plans.ai_reasoning IS 'Detailed AI reasoning breakdown including BMR, TDEE, adjustments, and personalization factors';

SELECT 'AI nutrition plan fields added successfully.' AS result;
