-- Drop the existing primary key constraint if it exists
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_pkey;

-- Add a new primary key constraint on the 'id' column
ALTER TABLE public.exercises ADD PRIMARY KEY (id);

-- Add a unique constraint to the 'name' column
ALTER TABLE public.exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);

-- Add the animation_url column if it doesn't exist
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS animation_url TEXT; 