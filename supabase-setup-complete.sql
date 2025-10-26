-- GoFitAI Complete Supabase Setup Script
-- Run this script in your new Supabase project's SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  birthday DATE,
  height NUMERIC,
  weight NUMERIC,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  training_level TEXT CHECK (training_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goal TEXT CHECK (primary_goal IN ('general_fitness', 'hypertrophy', 'athletic_performance', 'fat_loss', 'muscle_gain')),
  workout_frequency TEXT CHECK (workout_frequency IN ('2_3', '4_5', '6')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  body_fat NUMERIC,
  weight_trend TEXT CHECK (weight_trend IN ('losing', 'gaining', 'stable', 'unsure')),
  exercise_frequency TEXT CHECK (exercise_frequency IN ('1', '2-3', '4-5', '6-7')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'moderately_active', 'very_active')),
  fitness_strategy TEXT CHECK (fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining')),
  gender TEXT CHECK (gender IN ('male', 'female')),
  height_unit_preference TEXT CHECK (height_unit_preference IN ('cm', 'ft')) DEFAULT 'cm',
  weight_unit_preference TEXT CHECK (weight_unit_preference IN ('kg', 'lbs')) DEFAULT 'kg',
  height_original_value TEXT,
  weight_original_value TEXT,
  goal_fat_reduction NUMERIC,
  goal_muscle_gain NUMERIC,
  body_analysis JSONB,
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Create nutrition_plans table
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name VARCHAR(100) NOT NULL DEFAULT 'Adaptive Nutrition Plan',
  goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('fat_loss', 'muscle_gain', 'maintenance')),
  preferences JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  daily_targets JSONB,
  micronutrients_targets JSONB,
  daily_schedule JSONB,
  food_suggestions JSONB,
  snack_suggestions JSONB,
  metabolic_calculations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own nutrition plans" ON public.nutrition_plans
  FOR ALL USING (auth.uid() = user_id);

-- 3. Create workout_sessions table
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_plan_id UUID,
  session_name VARCHAR(200),
  session_type VARCHAR(50),
  duration_minutes INTEGER,
  calories_burned INTEGER,
  exercises_completed JSONB,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workout sessions" ON public.workout_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Create workout_plans table
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name VARCHAR(200) NOT NULL,
  plan_type VARCHAR(50),
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks INTEGER,
  sessions_per_week INTEGER,
  plan_data JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workout plans" ON public.workout_plans
  FOR ALL USING (auth.uid() = user_id);

-- 5. Create body_photos table
CREATE TABLE IF NOT EXISTS public.body_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_type VARCHAR(20) NOT NULL CHECK (photo_type IN ('front', 'back', 'side')),
  photo_url VARCHAR(500) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  is_analyzed BOOLEAN DEFAULT FALSE,
  analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_data JSONB
);

ALTER TABLE public.body_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own body photos" ON public.body_photos
  FOR ALL USING (auth.uid() = user_id);

-- 6. Create daily_user_metrics table
CREATE TABLE IF NOT EXISTS public.daily_user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC,
  body_fat_percentage NUMERIC,
  muscle_mass_kg NUMERIC,
  water_percentage NUMERIC,
  sleep_hours NUMERIC,
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own daily metrics" ON public.daily_user_metrics
  FOR ALL USING (auth.uid() = user_id);

-- 7. Create meal_logs table
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_items JSONB NOT NULL,
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own meal logs" ON public.meal_logs
  FOR ALL USING (auth.uid() = user_id);

-- 8. Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nutrition_plans_updated_at BEFORE UPDATE ON public.nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_sessions_updated_at BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_user_metrics_updated_at BEFORE UPDATE ON public.daily_user_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_logs_updated_at BEFORE UPDATE ON public.meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Enable realtime for key tables (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_user_metrics;

-- Success message
SELECT 'GoFitAI database setup completed successfully!' as message;
