-- Create missing tables for GoFitAI
-- Run this in your Supabase SQL Editor

-- Create weight_entries table
CREATE TABLE IF NOT EXISTS public.weight_entries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress table
CREATE TABLE IF NOT EXISTS public.progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass DECIMAL(5,2),
  notes TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_id ON public.weight_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON public.weight_entries(date);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_date ON public.progress(date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for weight_entries
CREATE POLICY "Users can view their own weight entries" ON public.weight_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight entries" ON public.weight_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight entries" ON public.weight_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight entries" ON public.weight_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for progress
CREATE POLICY "Users can view their own progress" ON public.progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON public.progress
  FOR DELETE USING (auth.uid() = user_id);

-- Verify tables were created
SELECT 'weight_entries' as table_name, COUNT(*) as row_count FROM public.weight_entries
UNION ALL
SELECT 'progress' as table_name, COUNT(*) as row_count FROM public.progress;


