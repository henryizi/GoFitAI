-- Create workout_history table for GoFitAI
-- Run this in your Supabase SQL Editor

-- Drop existing table if it exists (be careful with this in production!)
-- DROP TABLE IF EXISTS public.workout_history;

-- Create workout_history table with all required fields
CREATE TABLE IF NOT EXISTS public.workout_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER,
    total_sets INTEGER,
    total_exercises INTEGER,
    estimated_calories INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Additional fields for enhanced workout history
    plan_name TEXT,
    session_name TEXT,
    week_number INTEGER,
    day_number INTEGER,
    exercises_data JSONB
);

-- Enable RLS for workout_history
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workout_history
CREATE POLICY "Users can manage their own workout history" ON public.workout_history
    FOR ALL
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_history_user_id ON public.workout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_completed_at ON public.workout_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_workout_history_plan_id ON public.workout_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_session_id ON public.workout_history(session_id);

-- Verify table was created
SELECT 'workout_history' as table_name, COUNT(*) as row_count FROM public.workout_history;
