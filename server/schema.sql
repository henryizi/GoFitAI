-- Create progress_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.progress_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT NOT NULL, -- 'front', 'side', 'back', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON public.progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_created_at ON public.progress_photos(created_at);

-- Add RLS policies for progress_photos
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own photos
CREATE POLICY "Users can view their own progress photos"
ON public.progress_photos FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own photos
CREATE POLICY "Users can insert their own progress photos"
ON public.progress_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own progress photos"
ON public.progress_photos FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own progress photos"
ON public.progress_photos FOR DELETE
USING (auth.uid() = user_id);

-- Create daily_user_metrics table for weight and progress tracking
CREATE TABLE IF NOT EXISTS public.daily_user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  trend_weight_kg DECIMAL(5,2),
  sleep_hours DECIMAL(4,2),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  activity_calories INTEGER,
  notes TEXT,
  body_fat_percentage DECIMAL(5,2),
  habit_score INTEGER CHECK (habit_score >= 0 AND habit_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);

-- Add RLS policies for daily_user_metrics
ALTER TABLE public.daily_user_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily metrics" ON public.daily_user_metrics
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date ON public.daily_user_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON public.daily_user_metrics(metric_date);

-- Create progress_entries table for comprehensive progress tracking
CREATE TABLE IF NOT EXISTS public.progress_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  front_photo_id UUID REFERENCES progress_photos(id) ON DELETE SET NULL,
  back_photo_id UUID REFERENCES progress_photos(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- Add RLS policies for progress_entries
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own progress entries" ON public.progress_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_entries_user_date ON public.progress_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_progress_entries_date ON public.progress_entries(entry_date);

-- Create nutrition_log_entries table for food tracking
CREATE TABLE IF NOT EXISTS public.nutrition_log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  food_name VARCHAR(200) NOT NULL,
  serving_size_grams INTEGER,
  calories INTEGER,
  protein_grams DECIMAL(5,1),
  carbs_grams DECIMAL(5,1),
  fat_grams DECIMAL(5,1),
  meal_type TEXT,
  notes TEXT
);

-- Add RLS policies for nutrition_log_entries
ALTER TABLE public.nutrition_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own nutrition entries" ON public.nutrition_log_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_nutrition_log_user_date ON public.nutrition_log_entries(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_nutrition_log_date ON public.nutrition_log_entries(logged_at);

-- Create body_analysis table for AI-powered body analysis
CREATE TABLE IF NOT EXISTS public.body_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front_photo_url TEXT,
  back_photo_url TEXT,
  overall_rating TEXT,
  muscle_definition TEXT,
  body_fat_estimate TEXT,
  posture_analysis TEXT,
  improvement_areas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for body_analysis
ALTER TABLE public.body_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own body analysis" ON public.body_analysis
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_body_analysis_user_date ON public.body_analysis(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_body_analysis_date ON public.body_analysis(created_at);

-- Create workout_plans table for storing AI-generated and custom workout plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  training_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (training_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goal TEXT NOT NULL DEFAULT 'general_fitness',
  workout_frequency TEXT NOT NULL DEFAULT '4_5',
  goal_fat_loss DECIMAL(4,1) DEFAULT 0,
  goal_muscle_gain DECIMAL(4,1) DEFAULT 0,
  mesocycle_length_weeks INTEGER DEFAULT 4,
  weekly_schedule JSONB,
  progression_plan JSONB,
  nutrition_tips TEXT[],
  safety_guidelines TEXT[],
  equipment_needed TEXT[],
  estimated_time_per_session TEXT DEFAULT '45-60 minutes',
  estimated_results TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  modified_from_original BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'ai_generated'
);

-- Add RLS policies for workout_plans
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own workout plans
CREATE POLICY "Users can manage their own workout plans" ON public.workout_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_status ON public.workout_plans(status);
CREATE INDEX IF NOT EXISTS idx_workout_plans_created_at ON public.workout_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_status ON public.workout_plans(user_id, status);

-- Function to upsert an AI-generated workout plan (simplified version)
CREATE OR REPLACE FUNCTION upsert_ai_workout_plan(
  user_id_param UUID,
  plan_data JSONB
)
RETURNS UUID AS $$
DECLARE
  plan_id_var UUID;
BEGIN
  -- Delete the user's current active plan
  DELETE FROM public.workout_plans WHERE user_id = user_id_param AND status = 'active';

  -- Insert the new workout plan
  INSERT INTO public.workout_plans (
    user_id,
    name,
    training_level,
    goal_fat_loss,
    goal_muscle_gain,
    mesocycle_length_weeks,
    estimated_time_per_session,
    weekly_schedule,
    primary_goal,
    workout_frequency,
    status,
    is_active,
    source
  )
  VALUES (
    user_id_param,
    plan_data->>'name',
    COALESCE(plan_data->>'training_level', 'intermediate'),
    COALESCE((plan_data->>'goal_fat_loss')::DECIMAL(4,1), 0),
    COALESCE((plan_data->>'goal_muscle_gain')::DECIMAL(4,1), 0),
    COALESCE((plan_data->>'mesocycle_length_weeks')::INTEGER, 8),
    COALESCE(plan_data->>'estimated_time_per_session', '45-60 min'),
    plan_data->'weeklySchedule',
    COALESCE(plan_data->>'primary_goal', 'general_fitness'),
    COALESCE(plan_data->>'workout_frequency', '4_5'),
    'active',
    true,
    COALESCE(plan_data->>'source', 'ai_generated')
  )
  RETURNING id INTO plan_id_var;

  RETURN plan_id_var;
END;
$$ LANGUAGE plpgsql; 