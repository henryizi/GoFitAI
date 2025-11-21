-- Add missing columns to progression_settings table
-- These columns are used by the UI but don't exist in the current schema

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS rpe_target_min INTEGER DEFAULT 7 CHECK (rpe_target_min >= 1 AND rpe_target_min <= 10);

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS rpe_target_max INTEGER DEFAULT 9 CHECK (rpe_target_max >= 1 AND rpe_target_max <= 10);

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS auto_deload_enabled BOOLEAN DEFAULT true;

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS auto_exercise_swap_enabled BOOLEAN DEFAULT false;

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS weight_increment_percentage DECIMAL(5,2) DEFAULT 2.5;

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS volume_increment_sets INTEGER DEFAULT 1;

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS plateau_detection_weeks INTEGER DEFAULT 3;

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS deload_frequency_weeks INTEGER DEFAULT 6;

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS recovery_score_threshold INTEGER DEFAULT 6 CHECK (recovery_score_threshold >= 1 AND recovery_score_threshold <= 10);

ALTER TABLE progression_settings 
ADD COLUMN IF NOT EXISTS high_fatigue_rpe_threshold INTEGER DEFAULT 9 CHECK (high_fatigue_rpe_threshold >= 1 AND high_fatigue_rpe_threshold <= 10);

-- Update existing records with defaults
UPDATE progression_settings 
SET 
  rpe_target_min = COALESCE(rpe_target_min, 7),
  rpe_target_max = COALESCE(rpe_target_max, 9),
  auto_deload_enabled = COALESCE(auto_deload_enabled, true),
  auto_exercise_swap_enabled = COALESCE(auto_exercise_swap_enabled, false),
  weight_increment_percentage = COALESCE(weight_increment_percentage, 2.5),
  volume_increment_sets = COALESCE(volume_increment_sets, 1),
  plateau_detection_weeks = COALESCE(plateau_detection_weeks, 3),
  deload_frequency_weeks = COALESCE(deload_frequency_weeks, 6),
  recovery_score_threshold = COALESCE(recovery_score_threshold, 6),
  high_fatigue_rpe_threshold = COALESCE(high_fatigue_rpe_threshold, 9)
WHERE rpe_target_min IS NULL 
   OR rpe_target_max IS NULL 
   OR auto_deload_enabled IS NULL
   OR auto_exercise_swap_enabled IS NULL
   OR weight_increment_percentage IS NULL
   OR volume_increment_sets IS NULL
   OR plateau_detection_weeks IS NULL
   OR deload_frequency_weeks IS NULL
   OR recovery_score_threshold IS NULL
   OR high_fatigue_rpe_threshold IS NULL;

