-- Add estimated_calories column to workout_history table if it doesn't exist
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
    -- Check if the estimated_calories column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workout_history' 
        AND column_name = 'estimated_calories'
    ) THEN
        -- Add the estimated_calories column if it doesn't exist
        ALTER TABLE public.workout_history 
        ADD COLUMN estimated_calories INTEGER;
        
        RAISE NOTICE 'Added estimated_calories column to workout_history table';
    ELSE
        RAISE NOTICE 'estimated_calories column already exists in workout_history table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workout_history' 
AND column_name = 'estimated_calories';


