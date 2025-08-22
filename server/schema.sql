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