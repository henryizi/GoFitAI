-- ================================================================
-- FIX PROGRESSION SETTINGS TABLE
-- ================================================================
-- This SQL adds the missing columns needed for progression settings
-- to work properly in your GoFitAI app.
--
-- WHAT'S WRONG:
-- - Database has "mode" column, but code expects "progression_mode"
-- - Missing "auto_adjust_enabled" column
-- - Missing "recovery_threshold" column
--
-- RUN THIS IN: Supabase SQL Editor
-- ================================================================

-- Add missing columns
ALTER TABLE progression_settings
  ADD COLUMN IF NOT EXISTS progression_mode text DEFAULT 'moderate';

ALTER TABLE progression_settings
  ADD COLUMN IF NOT EXISTS auto_adjust_enabled boolean DEFAULT true;

ALTER TABLE progression_settings
  ADD COLUMN IF NOT EXISTS recovery_threshold integer DEFAULT 5;

-- Migrate any existing data from old "mode" to new "progression_mode"
UPDATE progression_settings
  SET progression_mode = mode
  WHERE progression_mode IS NULL AND mode IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN progression_settings.progression_mode IS 'Progression speed: aggressive, moderate, or conservative';
COMMENT ON COLUMN progression_settings.auto_adjust_enabled IS 'Whether to automatically apply AI recommendations';
COMMENT ON COLUMN progression_settings.recovery_threshold IS 'Recovery capacity score (1-10), affects progression speed';

-- Verify the fix
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'progression_settings'
ORDER BY ordinal_position;

