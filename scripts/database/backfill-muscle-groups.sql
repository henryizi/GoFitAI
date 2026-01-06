-- Migration to backfill missing muscle groups for existing exercises
-- This script infers muscle groups from exercise names for exercises with empty or placeholder muscle_groups

-- Function to infer muscle groups from exercise name
CREATE OR REPLACE FUNCTION infer_muscle_groups(exercise_name TEXT)
RETURNS TEXT[] AS $$
DECLARE
  name_lower TEXT;
  muscle_groups TEXT[] := ARRAY[]::TEXT[];
BEGIN
  name_lower := LOWER(exercise_name);
  
  -- Chest
  IF name_lower LIKE '%chest%' OR 
     name_lower LIKE '%bench%' OR 
     (name_lower LIKE '%press%' AND name_lower NOT LIKE '%shoulder%' AND name_lower NOT LIKE '%overhead%') OR
     name_lower LIKE '%fly%' OR
     name_lower LIKE '%pec%' OR
     name_lower LIKE '%pectoral%' THEN
    muscle_groups := array_append(muscle_groups, 'chest');
  END IF;
  
  -- Back
  IF name_lower LIKE '%back%' OR 
     name_lower LIKE '%row%' OR 
     name_lower LIKE '%pull%' OR 
     name_lower LIKE '%lat%' OR 
     name_lower LIKE '%deadlift%' OR
     name_lower LIKE '%rhomboid%' OR
     name_lower LIKE '%trap%' OR
     name_lower LIKE '%latissimus%' THEN
    muscle_groups := array_append(muscle_groups, 'back');
  END IF;
  
  -- Legs
  IF name_lower LIKE '%leg%' OR 
     name_lower LIKE '%squat%' OR 
     name_lower LIKE '%lunge%' OR 
     name_lower LIKE '%calf%' OR
     name_lower LIKE '%quad%' OR
     name_lower LIKE '%hamstring%' OR
     name_lower LIKE '%glute%' OR
     name_lower LIKE '%thigh%' THEN
    muscle_groups := array_append(muscle_groups, 'legs');
  END IF;
  
  -- Shoulders
  IF name_lower LIKE '%shoulder%' OR 
     name_lower LIKE '%delt%' OR 
     (name_lower LIKE '%press%' AND (name_lower LIKE '%overhead%' OR name_lower LIKE '%shoulder%')) OR
     name_lower LIKE '%lateral raise%' OR
     name_lower LIKE '%rear delt%' OR
     name_lower LIKE '%front raise%' THEN
    muscle_groups := array_append(muscle_groups, 'shoulders');
  END IF;
  
  -- Arms
  IF name_lower LIKE '%arm%' OR 
     name_lower LIKE '%bicep%' OR 
     name_lower LIKE '%tricep%' OR 
     name_lower LIKE '%curl%' OR
     name_lower LIKE '%forearm%' THEN
    muscle_groups := array_append(muscle_groups, 'arms');
  END IF;
  
  -- Core
  IF name_lower LIKE '%core%' OR 
     name_lower LIKE '%abs%' OR 
     name_lower LIKE '%abdominal%' OR 
     name_lower LIKE '%crunch%' OR
     name_lower LIKE '%plank%' OR
     name_lower LIKE '%sit-up%' OR
     name_lower LIKE '%oblique%' THEN
    muscle_groups := array_append(muscle_groups, 'core');
  END IF;
  
  -- If no matches found, return empty array (will be handled by default)
  IF array_length(muscle_groups, 1) IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  RETURN muscle_groups;
END;
$$ LANGUAGE plpgsql;

-- Update exercises with empty muscle_groups or placeholder values
UPDATE exercises
SET muscle_groups = infer_muscle_groups(name)
WHERE 
  -- Empty array
  (array_length(muscle_groups, 1) IS NULL OR array_length(muscle_groups, 1) = 0)
  OR
  -- Placeholder values
  (muscle_groups = ARRAY['new']::TEXT[] OR muscle_groups = ARRAY['']::TEXT[])
  OR
  -- Single generic value that might be wrong
  (array_length(muscle_groups, 1) = 1 AND muscle_groups[1] IN ('new', 'general', 'full body', 'cardio'))
;

-- For exercises that still have no muscle groups, set a default based on category
UPDATE exercises
SET muscle_groups = CASE
  WHEN category = 'compound' THEN ARRAY['full body']::TEXT[]
  WHEN category = 'isolation' THEN ARRAY['arms']::TEXT[]
  WHEN category = 'accessory' THEN ARRAY['core']::TEXT[]
  ELSE ARRAY['full body']::TEXT[]
END
WHERE array_length(muscle_groups, 1) IS NULL OR array_length(muscle_groups, 1) = 0
;

-- Drop the temporary function
DROP FUNCTION IF EXISTS infer_muscle_groups(TEXT);

-- Log the results
DO $$
DECLARE
  updated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM exercises
  WHERE array_length(muscle_groups, 1) IS NOT NULL AND array_length(muscle_groups, 1) > 0;
  
  SELECT COUNT(*) INTO total_count FROM exercises;
  
  RAISE NOTICE 'Migration complete: % out of % exercises now have muscle groups', updated_count, total_count;
END $$;







