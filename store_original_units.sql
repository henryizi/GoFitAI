-- Modify database to store original unit values
-- Run this query in Supabase Dashboard > SQL Editor

BEGIN;

-- 1. Add columns to store original values
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS height_original_value TEXT,
ADD COLUMN IF NOT EXISTS weight_original_value TEXT;

-- 2. Add column comments
COMMENT ON COLUMN profiles.height_original_value IS 'JSON string storing original height input (e.g. {"value":6.1,"unit":"ft","feet":6,"inches":1} or {"value":173,"unit":"cm"})';
COMMENT ON COLUMN profiles.weight_original_value IS 'JSON string storing original weight input (e.g. {"value":174,"unit":"lbs"} or {"value":79,"unit":"kg"})';

-- 3. Set original values for existing data (based on current metric values)
UPDATE profiles 
SET 
  height_original_value = CASE 
    WHEN height_unit_preference = 'ft' AND height_cm IS NOT NULL THEN 
      -- Convert cm to feet and inches, store as JSON
      '{"value":' || ROUND((height_cm * 0.0328084)::numeric, 1) || ',"unit":"ft","feet":' || FLOOR(height_cm * 0.0328084) || ',"inches":' || ROUND(((height_cm * 0.0328084) - FLOOR(height_cm * 0.0328084)) * 12) || '}'
    WHEN height_cm IS NOT NULL THEN
      -- Store cm as JSON
      '{"value":' || height_cm || ',"unit":"cm"}'
    ELSE NULL
  END,
  weight_original_value = CASE 
    WHEN weight_unit_preference = 'lbs' AND weight_kg IS NOT NULL THEN 
      -- Convert kg to lbs, store as JSON
      '{"value":' || ROUND((weight_kg * 2.20462)::numeric, 0) || ',"unit":"lbs"}'
    WHEN weight_kg IS NOT NULL THEN
      -- Store kg as JSON
      '{"value":' || weight_kg || ',"unit":"kg"}'
    ELSE NULL
  END
WHERE height_original_value IS NULL OR weight_original_value IS NULL;

COMMIT;

-- Verify changes
SELECT 
  id,
  height_cm,
  height_unit_preference, 
  height_original_value,
  weight_kg,
  weight_unit_preference,
  weight_original_value
FROM profiles 
WHERE height_original_value IS NOT NULL OR weight_original_value IS NOT NULL
LIMIT 5;
