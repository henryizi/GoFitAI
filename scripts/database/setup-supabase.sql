-- GoFitAI Database Setup Script
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create body_photos table
CREATE TABLE IF NOT EXISTS body_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('front', 'back')),
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_analyzed BOOLEAN DEFAULT FALSE,
  analysis_status TEXT DEFAULT 'pending',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Create RLS policies
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own photos" ON body_photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON body_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON body_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON body_photos;

-- Create new policies
CREATE POLICY "Users can view their own photos" ON body_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos" ON body_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" ON body_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" ON body_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_body_photos_user_id ON body_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_body_photos_photo_type ON body_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_body_photos_uploaded_at ON body_photos(uploaded_at);

-- Create body_analysis table for storing AI analysis results
CREATE TABLE IF NOT EXISTS body_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  front_photo_id UUID REFERENCES body_photos(id) ON DELETE CASCADE,
  back_photo_id UUID REFERENCES body_photos(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  overall_score DECIMAL(3,1),
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on body_analysis
ALTER TABLE body_analysis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist for body_analysis
DROP POLICY IF EXISTS "Users can view their own analysis" ON body_analysis;
DROP POLICY IF EXISTS "Users can insert their own analysis" ON body_analysis;
DROP POLICY IF EXISTS "Users can update their own analysis" ON body_analysis;
DROP POLICY IF EXISTS "Users can delete their own analysis" ON body_analysis;

-- Create policies for body_analysis
CREATE POLICY "Users can view their own analysis" ON body_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis" ON body_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis" ON body_analysis
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis" ON body_analysis
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for body_analysis
CREATE INDEX IF NOT EXISTS idx_body_analysis_user_id ON body_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_body_analysis_created_at ON body_analysis(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it already exists to ensure idempotency
DROP TRIGGER IF EXISTS update_body_analysis_updated_at ON body_analysis;

-- Create trigger for body_analysis
CREATE TRIGGER update_body_analysis_updated_at 
    BEFORE UPDATE ON body_analysis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create progress_entries table
create table if not exists public.progress_entries (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade not null,
    date date not null,
    weight_kg float,
    front_photo_id uuid references public.body_photos(id) on delete set null,
    back_photo_id uuid references public.body_photos(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.progress_entries enable row level security;

-- Drop existing policies if they exist for progress_entries
DROP POLICY IF EXISTS "Users can view their own progress entries" ON public.progress_entries;
DROP POLICY IF EXISTS "Users can insert their own progress entries" ON public.progress_entries;
DROP POLICY IF EXISTS "Users can update their own progress entries" ON public.progress_entries;
DROP POLICY IF EXISTS "Users can delete their own progress entries" ON public.progress_entries;

create policy "Users can view their own progress entries"
on public.progress_entries for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own progress entries"
on public.progress_entries for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own progress entries"
on public.progress_entries for update
to authenticated
using (auth.uid() = user_id);

-- Add unique constraint to ensure one entry per user per day, dropping it first to ensure idempotency
ALTER TABLE public.progress_entries DROP CONSTRAINT IF EXISTS progress_entries_user_id_date_key;
alter table public.progress_entries add constraint progress_entries_user_id_date_key unique (user_id, date);

-- Workout Plans Table
CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
    mesocycle_length_weeks INTEGER NOT NULL DEFAULT 4,
    current_week INTEGER NOT NULL DEFAULT 1,
    training_level TEXT NOT NULL CHECK (training_level IN ('beginner', 'intermediate', 'advanced')),
    volume_landmarks JSON NOT NULL, -- Stores MEV, MAV, MRV for each muscle group
    deload_week BOOLEAN NOT NULL DEFAULT false,
    goal_fat_loss INTEGER CHECK (goal_fat_loss BETWEEN 1 AND 5),
    goal_muscle_gain INTEGER CHECK (goal_muscle_gain BETWEEN 1 AND 5),
    estimated_time_per_session TEXT
);

-- Training Splits Table (e.g., Push/Pull/Legs, Upper/Lower, etc.)
CREATE TABLE IF NOT EXISTS training_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    frequency_per_week INTEGER NOT NULL,
    order_in_week INTEGER NOT NULL,
    focus_areas TEXT[] NOT NULL -- Array of muscle groups targeted
);

-- Exercises Library
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE, -- Link to a specific plan if not a global exercise
    name TEXT NOT NULL, -- Name is no longer unique globally, but could be per plan
    category TEXT NOT NULL CHECK (category IN ('compound', 'isolation', 'accessory')),
    muscle_groups TEXT[] NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    equipment_needed TEXT[],
    description TEXT,
    form_tips TEXT[],
    rpe_recommendation INTEGER CHECK (rpe_recommendation BETWEEN 1 AND 10),
    is_custom BOOLEAN DEFAULT false,
    UNIQUE(name, plan_id)
);

-- Workout Sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    split_id UUID NOT NULL REFERENCES training_splits(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'skipped')) DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    session_feedback TEXT,
    session_rpe INTEGER CHECK (session_rpe BETWEEN 1 AND 10),
    recovery_score INTEGER CHECK (recovery_score BETWEEN 1 AND 10),
    estimated_calories INTEGER
);

-- Exercise Sets (Planned)
CREATE TABLE IF NOT EXISTS exercise_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_in_session INTEGER NOT NULL,
    target_sets INTEGER NOT NULL,
    target_reps TEXT NOT NULL, -- e.g., "8-12" or "12-15"
    target_rpe INTEGER CHECK (target_rpe BETWEEN 1 AND 10),
    rest_period TEXT NOT NULL, -- e.g., "90 seconds"
    progression_scheme TEXT NOT NULL CHECK (progression_scheme IN ('double_progression', 'linear_progression', 'rpe_based')),
    notes TEXT
);

-- Exercise Logs (Actual performance)
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
    actual_reps INTEGER NOT NULL,
    actual_weight DECIMAL,
    actual_rpe INTEGER CHECK (actual_rpe BETWEEN 1 AND 10),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Volume Tracking
CREATE TABLE IF NOT EXISTS volume_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    muscle_group TEXT NOT NULL,
    weekly_sets INTEGER NOT NULL,
    average_rpe DECIMAL,
    recovery_rating INTEGER CHECK (recovery_rating BETWEEN 1 AND 10),
    volume_category TEXT CHECK (volume_category IN ('MEV', 'MAV', 'MRV')),
    notes TEXT
);

-- Progression Tracking
CREATE TABLE IF NOT EXISTS progression_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TIMESTAMPTZ DEFAULT NOW(),
    top_set_weight DECIMAL,
    top_set_reps INTEGER,
    top_set_rpe INTEGER CHECK (top_set_rpe BETWEEN 1 AND 10),
    e1rm DECIMAL, -- Estimated 1 Rep Max
    notes TEXT
);

-- Add RLS Policies
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones to ensure idempotency
DROP POLICY IF EXISTS "Users can view their own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Users can create their own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Users can update their own workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Users can delete their own workout plans" ON workout_plans;

-- Policies for workout_plans
CREATE POLICY "Users can view their own workout plans"
    ON workout_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout plans"
    ON workout_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans"
    ON workout_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans"
    ON workout_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for training_splits
DROP POLICY IF EXISTS "Users can manage their own training splits" ON training_splits;
CREATE POLICY "Users can manage their own training splits"
    ON training_splits FOR ALL
    USING (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = training_splits.plan_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = training_splits.plan_id));

-- Policies for exercises
DROP POLICY IF EXISTS "Users can manage their own exercises" ON exercises;
CREATE POLICY "Users can manage their own exercises"
    ON exercises FOR ALL
    USING (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = exercises.plan_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = exercises.plan_id));

-- Policies for workout_sessions
DROP POLICY IF EXISTS "Users can manage their own workout sessions" ON workout_sessions;
CREATE POLICY "Users can manage their own workout sessions"
    ON workout_sessions FOR ALL
    USING (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = workout_sessions.plan_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = workout_sessions.plan_id));
    
-- Policies for exercise_sets
DROP POLICY IF EXISTS "Users can manage their own exercise sets" ON exercise_sets;
CREATE POLICY "Users can manage their own exercise sets"
    ON exercise_sets FOR ALL
    USING (
        session_id IN (
            SELECT id FROM workout_sessions 
            WHERE plan_id IN (
                SELECT id FROM workout_plans 
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        session_id IN (
            SELECT id FROM workout_sessions 
            WHERE plan_id IN (
                SELECT id FROM workout_plans 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policies for exercise_logs
DROP POLICY IF EXISTS "Users can manage their own exercise logs" ON exercise_logs;
CREATE POLICY "Users can manage their own exercise logs"
    ON exercise_logs FOR ALL
    USING (auth.uid() = (SELECT wp.user_id FROM workout_plans wp JOIN workout_sessions ws ON wp.id = ws.plan_id JOIN exercise_sets es ON ws.id = es.session_id WHERE es.id = exercise_logs.set_id))
    WITH CHECK (auth.uid() = (SELECT wp.user_id FROM workout_plans wp JOIN workout_sessions ws ON wp.id = ws.plan_id JOIN exercise_sets es ON ws.id = es.session_id WHERE es.id = exercise_logs.set_id));

-- Policies for volume_tracking
DROP POLICY IF EXISTS "Users can manage their own volume tracking" ON volume_tracking;
CREATE POLICY "Users can manage their own volume tracking"
    ON volume_tracking FOR ALL
    USING (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = volume_tracking.plan_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM workout_plans WHERE id = volume_tracking.plan_id));

-- Policies for progression_tracking
DROP POLICY IF EXISTS "Users can manage their own progression tracking" ON progression_tracking;
CREATE POLICY "Users can manage their own progression tracking"
    ON progression_tracking FOR ALL
    USING (auth.uid() = progression_tracking.user_id);

-- Create workout_history table
CREATE TABLE IF NOT EXISTS workout_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER,
    total_sets INTEGER,
    total_exercises INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for workout_history
ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;

-- Policies for workout_history
DROP POLICY IF EXISTS "Users can manage their own workout history" ON workout_history;
CREATE POLICY "Users can manage their own workout history"
    ON workout_history FOR ALL
    USING (auth.uid() = workout_history.user_id);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_training_splits_plan_id ON training_splits(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan_id ON workout_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session_id ON exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_set_id ON exercise_logs(set_id);
CREATE INDEX IF NOT EXISTS idx_volume_tracking_plan_id ON volume_tracking(plan_id);
CREATE INDEX IF NOT EXISTS idx_progression_tracking_user_id ON progression_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_user_id ON workout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_completed_at ON workout_history(completed_at);

-- Verify tables were created
SELECT 'body_photos' as table_name, COUNT(*) as row_count FROM body_photos
UNION ALL
SELECT 'progress_entries' as table_name, COUNT(*) as row_count FROM progress_entries; 