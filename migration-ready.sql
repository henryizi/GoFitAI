-- Migration: Add original unit value columns to profiles table
-- Run this in your Supabase SQL Editor

-- 1. Add the new columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS height_original_value TEXT,
  ADD COLUMN IF NOT EXISTS weight_original_value TEXT;

-- 2. Update existing data with proper JSON formatting
UPDATE profiles
  SET
    height_original_value = CASE
      WHEN height_unit_preference = 'ft' AND height_cm IS NOT NULL THEN
        '{"value":' || ROUND((height_cm * 0.0328084)::numeric, 1) || ',"unit":"ft","feet":' || FLOOR(height_cm * 0.0328084) || ',"inches":' || ROUND(((height_cm * 0.0328084) - FLOOR(height_cm * 0.0328084)) * 12) || '}'
      WHEN height_cm IS NOT NULL THEN
        '{"value":' || height_cm || ',"unit":"cm"}'
      ELSE NULL
    END,
    weight_original_value = CASE
      WHEN weight_unit_preference = 'lbs' AND weight_kg IS NOT NULL THEN
        '{"value":' || ROUND((weight_kg * 2.20462)::numeric, 0) || ',"unit":"lbs"}'
      WHEN weight_kg IS NOT NULL THEN
        '{"value":' || weight_kg || ',"unit":"kg"}'
      ELSE NULL
    END
  WHERE height_original_value IS NULL OR weight_original_value IS NULL;

-- 3. Verify the changes
SELECT id, height_original_value, weight_original_value
FROM profiles
LIMIT 5;





