# 🔧 Fix Progression Settings Buttons

## Problem
The progression settings buttons appear to do nothing because **the database columns don't exist**.

The UI tries to update columns like:
- `rpe_target_min`, `rpe_target_max`
- `auto_deload_enabled`, `auto_exercise_swap_enabled`  
- `weight_increment_percentage`, `volume_increment_sets`
- `plateau_detection_weeks`, `deload_frequency_weeks`
- `recovery_score_threshold`, `high_fatigue_rpe_threshold`

But the `progression_settings` table only has:
- `mode`, `primary_goal`, `target_weight_increase_kg`, `target_rep_increase`
- `intensity_preference`, `recovery_sensitivity`
- `auto_progression_enabled`, `plateau_detection_enabled`, `recovery_tracking_enabled`

## Solution

### Step 1: Run SQL Migration in Supabase

1. Go to: https://lmfdgnxertwrhbjhrcby.supabase.co/project/_/sql

2. Copy and paste the contents of `scripts/database/add-progression-columns.sql`:

```sql
-- Add missing columns to progression_settings table
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
  high_fatigue_rpe_threshold = COALESCE(high_fatigue_rpe_threshold, 9);
```

3. Click **RUN** to execute the migration

### Step 2: Reload Your App

After running the migration, reload your app:

```bash
# Press 'r' in Metro bundler
# OR shake device → Reload
```

### Step 3: Test the Buttons

1. Open Settings → Progression Settings
2. Tap **Conservative**, **Moderate**, or **Aggressive**
3. Toggle switches
4. Tap **Save Settings**
5. You should see "Success" alert

## What Was Fixed

✅ **Updated `AdaptiveProgressionService.ts`**:
- Fixed `updateProgressionSettings()` to map UI fields to actual database columns
- Added proper field mapping (e.g., `progressionMode` → `mode`)
- Added console logging for debugging

✅ **Created SQL migration**:
- Adds all missing columns to `progression_settings` table
- Sets sensible defaults
- Updates existing records

## Files Changed

- `src/services/progression/AdaptiveProgressionService.ts` - Fixed update method
- `scripts/database/add-progression-columns.sql` - New migration file
- `scripts/run-progression-migration.js` - Migration runner (can't run automatically, needs manual SQL execution)

## Quick Test

```javascript
// In your app console, check if settings save:
const { user } = useAuth();
const settings = await AdaptiveProgressionService.getProgressionSettings(user.id);
console.log('Current settings:', settings);

// Try updating
settings.progressionMode = 'aggressive';
const success = await AdaptiveProgressionService.updateProgressionSettings(settings);
console.log('Update success:', success);
```

🎯 **After running the SQL migration, all buttons will work!**

