# AI Nutrition Workout Frequency Fix

## Problem Identified

The AI nutrition plan was using **bucketed workout frequency values** instead of the user's **actual preferred workout days (1-7)**.

### What Was Wrong

1. **User selects**: "5 days per week" in onboarding or settings
2. **System saved**: 
   - `workout_frequency`: `'4_5'` (bucketed, old format)
   - `exercise_frequency`: `'4-5'` (bucketed range)
3. **AI nutrition received**: `"workout_frequency": "4_5"` or `"exercise_frequency": "4-5"`
4. **Result**: AI couldn't accurately calculate TDEE because it didn't know if user trains 4 or 5 days

### Why This Matters for Nutrition

- **TDEE Calculation**: Training 4 days/week vs 7 days/week has a HUGE impact on calorie burn
- **Carb Requirements**: More training days = more carbs needed for glycogen replenishment
- **Recovery Needs**: Higher frequency requires more precise nutrition timing
- **Accuracy**: Using ranges (4-5) instead of exact numbers (5) reduces calculation precision

## Solution Implemented

### 1. Added New Database Field

**File**: `scripts/database/add-preferred-workout-frequency.sql`

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_workout_frequency INTEGER 
CHECK (preferred_workout_frequency >= 1 AND preferred_workout_frequency <= 7);
```

This field stores the ACTUAL number the user selected (1-7), not a bucketed range.

### 2. Updated Onboarding to Save Exact Value

**File**: `app/(onboarding)/exercise-frequency.tsx`

Now saves all three fields:
- `exercise_frequency`: `'4-5'` (kept for backward compatibility)
- `workout_frequency`: `'4_5'` (kept for backward compatibility)
- `preferred_workout_frequency`: `5` ✅ **NEW - exact number for AI calculations**

### 3. Updated Settings to Save Exact Value

**File**: `app/(main)/settings/fitness-goals.tsx`

When user changes workout frequency in settings, it now saves:
```typescript
preferred_workout_frequency: parseInt(selectedFrequency, 10) // e.g., 5
```

### 4. Updated Backend AI Nutrition Endpoint

**File**: `server/index.js` - `/api/generate-ai-nutrition-targets`

**Before**:
```javascript
- Exercise Frequency: ${profile.exercise_frequency || 'Not specified'} times per week
```

**After**:
```javascript
// Get the actual workout frequency (1-7 days)
let workoutFrequency = profile.preferred_workout_frequency;

// Fallback: Convert from exercise_frequency if needed
if (!workoutFrequency && profile.exercise_frequency) {
  const exerciseFreqMap = {
    '1': 1,
    '2-3': 2.5,
    '4-5': 4.5,
    '6-7': 6.5
  };
  workoutFrequency = exerciseFreqMap[profile.exercise_frequency] || 4;
}

// In prompt:
- Workout Frequency: ${workoutFrequency} days per week (actual preferred workout days)
```

The AI now receives: **"5 days per week"** instead of **"4-5 times per week"**

### 5. Updated Prompt Instructions

Enhanced the AI prompt to emphasize workout frequency:

```
2. Determine TDEE based on activity level AND the exact workout frequency (5 days/week of training)
   - IMPORTANT: Use the workout frequency to accurately adjust TDEE - 5 training days per week means significant caloric expenditure
   
5. Determine carbohydrate needs (prioritize for workout days - 5 days/week of training requires adequate carbs)

7. Provide explanation, specifically mentioning the 5 workout days per week
```

### 6. Updated Fallback Calculation (AInutritionService.ts)

**File**: `src/services/nutrition/AInutritionService.ts`

The fallback TDEE calculation now prioritizes `preferred_workout_frequency`:

```typescript
// Use actual workout frequency for more accurate calculation
if (profile.preferred_workout_frequency) {
  const freq = profile.preferred_workout_frequency;
  if (freq === 1) exerciseMultiplier = 1.0;
  else if (freq <= 3) exerciseMultiplier = 1.05;
  else if (freq <= 5) exerciseMultiplier = 1.1;
  else exerciseMultiplier = 1.15;
}
```

### 7. Updated Type Definitions

**File**: `src/types/database.ts` and `src/services/nutrition/AInutritionService.ts`

Added `preferred_workout_frequency?: number` to profile interfaces.

## Migration Required

**IMPORTANT**: You need to run the SQL migration to add the new column:

```bash
# Run in Supabase SQL Editor:
cat scripts/database/add-preferred-workout-frequency.sql
```

Or manually execute:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_workout_frequency INTEGER 
CHECK (preferred_workout_frequency >= 1 AND preferred_workout_frequency <= 7);
```

## Testing

After migration, test the flow:

1. **New User Onboarding**:
   - Select "5 days" in exercise frequency screen
   - Complete onboarding
   - Generate AI nutrition plan
   - Check logs: Should see "workout frequency: 5 days/week"

2. **Existing User - Update Settings**:
   - Go to Settings → Fitness Goals
   - Change workout frequency to "6 days"
   - Save
   - Generate new AI nutrition plan
   - Check logs: Should see "workout frequency: 6 days/week"

3. **Check Database**:
   ```sql
   SELECT id, exercise_frequency, workout_frequency, preferred_workout_frequency
   FROM profiles
   WHERE id = '<your-user-id>';
   ```

## Expected Results

### Before Fix
```
[AI NUTRITION TARGETS] Received profile data: {
  "exercise_frequency": "4-5",
  "workout_frequency": "4_5"
}
AI: "Applied moderately_active multiplier with 4-5 exercise frequency..."
```

### After Fix
```
[AI NUTRITION TARGETS] Normalized data - workout frequency: 5 days/week
AI: "Applied moderately_active multiplier with 5 days per week workout frequency..."
AI: "Your 5 workout days per week require adequate carbohydrate intake..."
```

## Backward Compatibility

✅ **Fully backward compatible**:
- Keeps `exercise_frequency` and `workout_frequency` fields
- Falls back to converting `exercise_frequency` if `preferred_workout_frequency` is null
- Existing users will still get reasonable calculations until they update their settings
- New users automatically get the improved calculation

## Files Changed

1. ✅ `scripts/database/add-preferred-workout-frequency.sql` - NEW migration
2. ✅ `app/(onboarding)/exercise-frequency.tsx` - Save exact frequency
3. ✅ `app/(main)/settings/fitness-goals.tsx` - Save exact frequency
4. ✅ `server/index.js` - Use exact frequency in AI prompt
5. ✅ `src/services/nutrition/AInutritionService.ts` - Use exact frequency in fallback calc
6. ✅ `src/types/database.ts` - Add field to type definition

## Benefits

✅ **More Accurate TDEE**: AI knows if user trains 4, 5, 6, or 7 days instead of "4-5"
✅ **Better Carb Allocation**: More precise carb recommendations based on exact training days
✅ **Improved Explanations**: AI can say "your 5 workout days" instead of "4-5 times per week"
✅ **Future-Proof**: Enables more advanced features like per-day nutrition customization

---

**Status**: ✅ Implementation Complete - Ready for Database Migration


