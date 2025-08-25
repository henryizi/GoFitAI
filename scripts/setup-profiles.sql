-- Create the profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  birthday DATE,
  height NUMERIC,
  weight NUMERIC,
  training_level TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  PRIMARY KEY (id),
  CONSTRAINT fk_user FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id); 