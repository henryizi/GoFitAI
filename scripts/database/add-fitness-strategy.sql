-- Add fitness_strategy column to profiles table
-- This replaces the complex fat/muscle goal inputs with simple fitness strategies

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_strategy TEXT;

-- Add a check constraint to ensure only valid strategies are stored
-- Use DO block to check if constraint exists first (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_fitness_strategy' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT check_fitness_strategy 
        CHECK (fitness_strategy IS NULL OR fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining'));
    END IF;
END $$;

-- Update existing profiles to have a default strategy based on their current goals
-- This is a migration to help existing users
UPDATE profiles 
SET fitness_strategy = CASE 
  WHEN goal_fat_reduction > goal_muscle_gain THEN 'cut'
  WHEN goal_muscle_gain > goal_fat_reduction THEN 'bulk'
  ELSE 'maintenance'
END
WHERE fitness_strategy IS NULL AND (goal_fat_reduction IS NOT NULL OR goal_muscle_gain IS NOT NULL);

-- For profiles with no goals set, default to maintenance
UPDATE profiles 
SET fitness_strategy = 'maintenance'
WHERE fitness_strategy IS NULL;


ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_strategy TEXT;

-- Add a check constraint to ensure only valid strategies are stored
-- Use DO block to check if constraint exists first (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_fitness_strategy' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT check_fitness_strategy 
        CHECK (fitness_strategy IS NULL OR fitness_strategy IN ('bulk', 'cut', 'maintenance', 'recomp', 'maingaining'));
    END IF;
END $$;

-- Update existing profiles to have a default strategy based on their current goals
-- This is a migration to help existing users
UPDATE profiles 
SET fitness_strategy = CASE 
  WHEN goal_fat_reduction > goal_muscle_gain THEN 'cut'
  WHEN goal_muscle_gain > goal_fat_reduction THEN 'bulk'
  ELSE 'maintenance'
END
WHERE fitness_strategy IS NULL AND (goal_fat_reduction IS NOT NULL OR goal_muscle_gain IS NOT NULL);

-- For profiles with no goals set, default to maintenance
UPDATE profiles 
SET fitness_strategy = 'maintenance'
WHERE fitness_strategy IS NULL;
