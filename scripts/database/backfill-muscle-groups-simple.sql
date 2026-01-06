-- Single SQL script to backfill missing muscle groups for existing exercises
-- Run this directly in your Supabase SQL editor

UPDATE exercises
SET muscle_groups = CASE
  -- Chest exercises
  WHEN LOWER(name) LIKE '%chest%' OR 
       LOWER(name) LIKE '%bench%' OR 
       (LOWER(name) LIKE '%press%' AND LOWER(name) NOT LIKE '%shoulder%' AND LOWER(name) NOT LIKE '%overhead%') OR
       LOWER(name) LIKE '%fly%' OR
       LOWER(name) LIKE '%pec%' OR
       LOWER(name) LIKE '%pectoral%' THEN ARRAY['chest']::TEXT[]
  
  -- Back exercises
  WHEN LOWER(name) LIKE '%back%' OR 
       LOWER(name) LIKE '%row%' OR 
       LOWER(name) LIKE '%pull%' OR 
       LOWER(name) LIKE '%lat%' OR 
       LOWER(name) LIKE '%deadlift%' OR
       LOWER(name) LIKE '%rhomboid%' OR
       LOWER(name) LIKE '%trap%' OR
       LOWER(name) LIKE '%latissimus%' THEN ARRAY['back']::TEXT[]
  
  -- Legs exercises
  WHEN LOWER(name) LIKE '%leg%' OR 
       LOWER(name) LIKE '%squat%' OR 
       LOWER(name) LIKE '%lunge%' OR 
       LOWER(name) LIKE '%calf%' OR
       LOWER(name) LIKE '%quad%' OR
       LOWER(name) LIKE '%hamstring%' OR
       LOWER(name) LIKE '%glute%' OR
       LOWER(name) LIKE '%thigh%' THEN ARRAY['legs']::TEXT[]
  
  -- Shoulders exercises
  WHEN LOWER(name) LIKE '%shoulder%' OR 
       LOWER(name) LIKE '%delt%' OR 
       (LOWER(name) LIKE '%press%' AND (LOWER(name) LIKE '%overhead%' OR LOWER(name) LIKE '%shoulder%')) OR
       LOWER(name) LIKE '%lateral raise%' OR
       LOWER(name) LIKE '%rear delt%' OR
       LOWER(name) LIKE '%front raise%' THEN ARRAY['shoulders']::TEXT[]
  
  -- Arms exercises
  WHEN LOWER(name) LIKE '%arm%' OR 
       LOWER(name) LIKE '%bicep%' OR 
       LOWER(name) LIKE '%tricep%' OR 
       LOWER(name) LIKE '%curl%' OR
       LOWER(name) LIKE '%forearm%' THEN ARRAY['arms']::TEXT[]
  
  -- Core exercises
  WHEN LOWER(name) LIKE '%core%' OR 
       LOWER(name) LIKE '%abs%' OR 
       LOWER(name) LIKE '%abdominal%' OR 
       LOWER(name) LIKE '%crunch%' OR
       LOWER(name) LIKE '%plank%' OR
       LOWER(name) LIKE '%sit-up%' OR
       LOWER(name) LIKE '%oblique%' THEN ARRAY['core']::TEXT[]
  
  -- Default based on category
  WHEN category = 'compound' THEN ARRAY['full body']::TEXT[]
  WHEN category = 'isolation' THEN ARRAY['arms']::TEXT[]
  WHEN category = 'accessory' THEN ARRAY['core']::TEXT[]
  ELSE ARRAY['full body']::TEXT[]
END
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







