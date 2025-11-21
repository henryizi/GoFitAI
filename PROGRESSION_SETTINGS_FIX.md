# 🔧 Progression Settings Schema Fix

## ✅ What Was Fixed

Fixed the `progression_settings` table schema mismatch that was causing errors when trying to fetch or create progression settings.

### Issues Resolved:
1. ❌ **Removed `planId` parameter** - The database doesn't have a `plan_id` column; settings are per-user only
2. ❌ **Removed non-existent RPC call** - `initialize_progression_settings()` function doesn't exist
3. ✅ **Simplified queries** - Now uses direct table access instead of RPC functions
4. ✅ **Fixed field mappings** - Properly maps between database fields and TypeScript interface

## 📝 Changes Made

### 1. Updated TypeScript Interface (`ProgressionSettings`)
- Removed `planId?: string` field
- Interface now matches actual database schema

### 2. Fixed `getProgressionSettings()` Method
**Before:**
```typescript
static async getProgressionSettings(
  userId: string,
  planId: string | null = null
): Promise<ProgressionSettings | null>
```

**After:**
```typescript
static async getProgressionSettings(
  userId: string
): Promise<ProgressionSettings | null>
```

### 3. Fixed `createDefaultSettings()` Method
**Before:**
```typescript
// Used non-existent RPC function
const { data, error } = await supabase.rpc('initialize_progression_settings', {
  p_user_id: userId,
  p_mode: mode,
});
```

**After:**
```typescript
// Direct insert with all required fields
const { data, error } = await supabase
  .from('progression_settings')
  .insert({
    user_id: userId,
    mode: dbMode,
    primary_goal: 'strength_gain',
    target_weight_increase_kg: 2.5,
    target_rep_increase: 2,
    intensity_preference: 'moderate',
    recovery_sensitivity: 'normal',
    auto_progression_enabled: true,
    plateau_detection_enabled: true,
    recovery_tracking_enabled: true,
    form_quality_threshold: 7,
  })
  .select()
  .single();
```

### 4. Updated All Callers
Fixed all calls to `getProgressionSettings()` in:
- ✅ `AdaptiveProgressionService.ts`
- ✅ `PlateauDetectionService.ts` (6 occurrences)
- ✅ `app/(main)/settings/progression-settings.tsx`

## 🚀 How to Apply the Fix

### Step 1: Restart Your Development Environment

The code has been updated, but you need to reload it:

#### Option A: Metro Bundler (React Native)
```bash
# In your terminal where Metro is running, press:
r    # Reload the app
# OR
R    # Reload and clear cache
```

#### Option B: Full Restart
```bash
# Kill the Metro bundler (Ctrl+C)
# Then restart:
cd /Users/ngkwanho/Desktop/GoFitAI
npm start
```

#### Option C: In the Expo Go app
- Shake your device
- Tap "Reload"

### Step 2: Verify the Fix

1. Open your app
2. Navigate to **Settings → Progression Settings**
3. You should see the settings load without errors
4. Check the console - no more "planId" or "initialize_progression_settings" errors

## 📊 Database Schema Reference

The `progression_settings` table has these columns:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `user_id` | UUID | required | Foreign key to auth.users |
| `mode` | VARCHAR(20) | 'balanced' | conservative, balanced, aggressive |
| `primary_goal` | VARCHAR(50) | 'strength_gain' | User's primary fitness goal |
| `target_weight_increase_kg` | DECIMAL(5,2) | 2.5 | Weight increase target |
| `target_rep_increase` | INTEGER | 2 | Rep increase target |
| `intensity_preference` | VARCHAR(20) | 'moderate' | low, moderate, high |
| `recovery_sensitivity` | VARCHAR(20) | 'normal' | low, normal, high |
| `auto_progression_enabled` | BOOLEAN | true | Enable auto progression |
| `plateau_detection_enabled` | BOOLEAN | true | Enable plateau detection |
| `recovery_tracking_enabled` | BOOLEAN | true | Enable recovery tracking |
| `form_quality_threshold` | INTEGER | 7 | Form quality threshold (1-10) |
| `created_at` | TIMESTAMP | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NOW() | Update timestamp |

**Important:** `UNIQUE(user_id)` constraint means **one settings record per user** (not per plan).

## 🎯 Expected Behavior

### First Time User
1. User navigates to Progression Settings
2. No settings exist yet → `getProgressionSettings()` returns null
3. App calls `createDefaultSettings()` → creates settings with defaults
4. Settings screen displays default values
5. User can customize and save

### Existing User
1. User navigates to Progression Settings
2. Settings exist → `getProgressionSettings()` returns data
3. Settings screen displays saved values
4. User can modify and save changes

## 🧪 Testing

Run this script to verify your database is ready:

```bash
cd /Users/ngkwanho/Desktop/GoFitAI
node scripts/run-adaptive-progression-migration.js
```

Expected output:
```
✅ All adaptive progression tables already exist:
  ✓ progression_settings
  ✓ exercise_history
  ✓ progression_recommendations
  ✓ plateau_detections

💡 The migration has already been applied. No action needed!
```

## ❓ Troubleshooting

### Error: "Could not find the function initialize_progression_settings"
**Cause:** Old code still cached  
**Solution:** Restart Metro bundler and reload app (see Step 1 above)

### Error: "column 'plan_id' does not exist"
**Cause:** Old code still cached  
**Solution:** Clear Metro cache and restart:
```bash
cd /Users/ngkwanho/Desktop/GoFitAI
npm start -- --reset-cache
```

### Error: "Failed to load progression settings"
**Cause:** Database migration not applied  
**Solution:** Run the migration script above to verify tables exist

## ✨ Summary

All code changes are complete. Just **restart your development environment** to see the fixes take effect!

---

**Status:** ✅ Code fixed, ready to test  
**Action Required:** Restart Metro bundler / Reload app  
**Estimated Time:** 2 minutes

