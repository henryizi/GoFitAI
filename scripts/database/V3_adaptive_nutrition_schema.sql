-- V3 Adaptive Nutrition Schema
-- This script completely overhauls the nutrition tracking system to support
-- dynamic, adaptive plans based on daily user metrics.

-- Drop old tables if they exist to ensure a clean slate.
-- Note: This is a destructive action. In a real production environment,
-- you would write a migration script to preserve existing data.
DROP TABLE IF EXISTS public.meal_logs CASCADE;
DROP TABLE IF EXISTS public.nutrition_log_entries CASCADE;
DROP TABLE IF EXISTS public.daily_user_metrics CASCADE;
DROP TABLE IF EXISTS public.historical_nutrition_targets CASCADE;
DROP TABLE IF EXISTS public.nutrition_plans CASCADE;

--- 1. NUTRITION PLANS (Revised)
-- Stores the overall strategy and settings for a user's nutrition plan.
CREATE TABLE public.nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name VARCHAR(100) NOT NULL DEFAULT 'Adaptive Nutrition Plan',
  goal_type VARCHAR(50) NOT NULL, -- 'fat_loss', 'muscle_gain', 'maintenance'
  preferences JSONB, -- { "dietary": ["vegan"], "intolerances": ["gluten"] }
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  daily_targets JSONB, -- { "calories": 2300, "protein": 180, "carbs": 250, "fat": 70 }
  micronutrients_targets JSONB, -- { "vitamin_d_mcg": 15, "calcium_mg": 1000 }
  daily_schedule JSONB, -- Array of meals with macros
  food_suggestions JSONB, -- { "proteins": [...], "carbs": [...], "fats": [...], "vegetables": [...] }
  snack_suggestions JSONB, -- Array of snack suggestions
  metabolic_calculations JSONB, -- { "bmr": 1800, "tdee": 2400, "activity_level": "moderately_active", ... }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own nutrition plans" ON public.nutrition_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_nutrition_plans_user_id ON public.nutrition_plans(user_id);


--- 2. HISTORICAL NUTRITION TARGETS (New)
-- Keeps a record of how the user's nutritional targets have changed over time.
CREATE TABLE public.historical_nutrition_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutrition_plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL if currently active
  daily_calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fat_grams INTEGER,
  micronutrients_targets JSONB, -- { "vitamin_d_mcg": 20, "sodium_mg": 2300 }
  reasoning TEXT, -- AI-generated reason for the adjustment
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.historical_nutrition_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own target history" ON public.historical_nutrition_targets
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM nutrition_plans WHERE nutrition_plans.id = nutrition_plan_id AND nutrition_plans.user_id = auth.uid()
    )
  );
CREATE INDEX idx_historical_targets_plan_id ON public.historical_nutrition_targets(nutrition_plan_id);


--- 3. DAILY USER METRICS (New)
-- Stores daily inputs from the user and wearables.
CREATE TABLE public.daily_user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  trend_weight_kg DECIMAL(5,2),
  sleep_hours DECIMAL(4,2),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  activity_calories INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);
ALTER TABLE public.daily_user_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily metrics" ON public.daily_user_metrics
  FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_daily_metrics_user_date ON public.daily_user_metrics(user_id, metric_date);


--- 4. NUTRITION LOG ENTRIES (New)
-- Logs every single food item a user consumes.
CREATE TABLE public.nutrition_log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  food_name VARCHAR(200) NOT NULL,
  serving_size_grams INTEGER,
  calories INTEGER,
  protein_grams DECIMAL(5,1),
  carbs_grams DECIMAL(5,1),
  fat_grams DECIMAL(5,1),
  micronutrients JSONB -- { "vitamin_d_mcg": 5, "sodium_mg": 300 }
);
ALTER TABLE public.nutrition_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own nutrition log entries" ON public.nutrition_log_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_nutrition_log_user_date ON public.nutrition_log_entries(user_id, logged_at);

SELECT 'V3 Adaptive Nutrition Schema deployed successfully.'; 