-- Add estimated_calories column to workout_sessions table if it doesn't exist
-- This fixes the PGRST204 error when creating workout sessions

-- Check if the column already exists before adding it
DO $$
BEGIN
    -- Add the estimated_calories column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'workout_sessions' 
        AND column_name = 'estimated_calories'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.workout_sessions 
        ADD COLUMN estimated_calories INTEGER;
        
        RAISE NOTICE 'Added estimated_calories column to workout_sessions table';
    ELSE
        RAISE NOTICE 'estimated_calories column already exists in workout_sessions table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'workout_sessions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
