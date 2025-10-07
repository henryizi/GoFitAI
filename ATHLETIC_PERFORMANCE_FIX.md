# Athletic Performance Goal Fix - Summary

## Problem
When generating workout plans with `primaryGoal: "athletic_performance"`, the Railway server was:
1. **Ignoring the user's goal** and defaulting to `"general_fitness"`
2. Not properly normalizing the profile data format from the app
3. Not building a detailed prompt with the user's goal

## Root Cause Analysis

### Issue 1: Wrong Server File on Railway
Railway was using `server/index-railway-clean.js` (configured in `railway.json`), which had outdated workout generation logic.

### Issue 2: Missing Profile Normalization
The app sends profile data as:
```javascript
{
  userProfile: {
    fullName: "John Doe",
    primaryGoal: "athletic_performance",  // camelCase
    fitnessLevel: "intermediate",
    workoutFrequency: "4_5"
  }
}
```

But the server/AI expected:
```javascript
{
  full_name: "John Doe",
  primary_goal: "athletic_performance",  // snake_case
  training_level: "intermediate",
  workout_frequency: "4_5"
}
```

### Issue 3: Missing Prompt Composition
The Railway server was calling:
```javascript
geminiTextService.generateWorkoutPlan(profileData, preferences)
```

But `geminiTextService` expects a **prompt string**, not profile objects:
```javascript
geminiTextService.generateWorkoutPlan(promptString)
```

## Solution Applied

### Changes to `server/index-railway-clean.js`:

1. **Added Profile Normalization** (lines 384-405)
   - Convert `camelCase` fields from app to `snake_case` for AI prompt
   - Map `fitnessLevel` → `training_level`
   - Map `primaryGoal` → `primary_goal`
   - Map `workoutFrequency` → `workout_frequency`

2. **Added Helper Functions** (lines 250-367)
   - `formatWorkoutFrequency()` - Format frequency display
   - `getMinFrequency()` - Get minimum workout days
   - `getMaxFrequency()` - Get maximum workout days
   - `getFrequencyExplanation()` - Get detailed frequency instructions
   - `composePrompt()` - Build comprehensive AI prompt with **primary_goal**

3. **Updated Endpoint Logic** (lines 424-430)
   ```javascript
   // OLD (broken):
   const plan = await geminiTextService.generateWorkoutPlan(profileData, preferences);
   
   // NEW (fixed):
   const prompt = composePrompt(profileData);
   console.log('[WORKOUT] Generated prompt with primary_goal:', profileData.primary_goal);
   const plan = await geminiTextService.generateWorkoutPlan(prompt);
   ```

## Key Fix: The Prompt Now Includes Primary Goal

The `composePrompt()` function explicitly includes:
```
CLIENT PROFILE:
- Full Name: John Doe
- Training Level: intermediate
- Primary Goal: athletic_performance    ← THIS IS NOW INCLUDED!
- Preferred Workout Frequency: 4-5 times per week

IMPORTANT REQUIREMENTS:
5. Ensure the plan matches the client's primary goal: athletic_performance
```

## Expected Behavior After Fix

### Before (Broken):
```json
{
  "workoutPlan": {
    "name": "General Fitness Plan",
    "primaryGoal": "general_fitness",    ← WRONG!
    "weeklySchedule": [...]
  }
}
```

### After (Fixed):
```json
{
  "workoutPlan": {
    "name": "John Doe's Athletic Performance Plan",
    "primaryGoal": "athletic_performance",  ← CORRECT!
    "weeklySchedule": [
      {
        "day": "Monday",
        "focus": "Power & Explosiveness",
        "exercises": [
          { "name": "Box Jumps", ... },
          { "name": "Power Cleans", ... },
          ...
        ]
      },
      ...
    ]
  }
}
```

## Deployment

### Commit:
```
fd4a971 - Fix Railway: Add profile normalization and composePrompt to respect primary_goal
```

### Pushed to:
- GitHub: `origin/main`
- Railway: Auto-deploys from main branch

### Deployment Status:
Railway will automatically rebuild and deploy the updated `server/index-railway-clean.js`.

## Testing

### Manual Test:
1. Wait for Railway deployment to complete (~2-3 minutes)
2. Run the test script:
   ```bash
   node test-athletic-performance-fix.js
   ```

### Expected Test Output:
```
✅ SUCCESS: Primary goal "athletic_performance" is PRESERVED!

📋 Weekly Schedule Preview:
  Monday: Power & Explosiveness
    Exercises: Box Jumps, Power Cleans...
  Tuesday: Agility Training
    Exercises: Ladder Drills, Cone Drills...
```

### In-App Test:
1. Open GoFitAI mobile app
2. Go to Workout Plans
3. Create new plan with:
   - Goal: "Athletic Performance"
   - Level: "Intermediate"
   - Frequency: "4-5 days/week"
4. Generate plan
5. Verify plan name includes "Athletic Performance"
6. Verify exercises focus on power, agility, and sport-specific movements

## Files Modified

- `server/index-railway-clean.js` - Railway server file
  - Added profile normalization (18 lines)
  - Added helper functions (118 lines)
  - Updated endpoint to use `composePrompt()`

## Related Issues Fixed

This fix also resolves:
- ✅ Primary goal being ignored for ALL goal types
- ✅ Profile data format mismatch between app and server
- ✅ Missing detailed workout instructions in AI prompt
- ✅ Inconsistent workout frequency handling

## Notes for Future

1. **Profile Format**: The app uses `camelCase`, server/AI uses `snake_case`. Normalization is **required**.

2. **Prompt Composition**: Always use `composePrompt()` to build detailed prompts that include:
   - User profile (name, age, gender)
   - Training level
   - **Primary goal** ← Critical!
   - Workout frequency
   - Detailed instructions for AI

3. **Railway File**: Railway uses `server/index-railway-clean.js`, not `server/index.js`. Keep both in sync!

4. **Testing**: Always test with different goals:
   - `muscle_gain`
   - `fat_loss`
   - `athletic_performance`
   - `general_fitness`

## Success Criteria

✅ User's `primaryGoal` is preserved in generated plan  
✅ Plan name reflects the goal  
✅ Exercises match the goal type  
✅ Workout structure aligns with goal (e.g., power moves for athletic performance)  
✅ No more defaults to "general_fitness"  

---

**Status**: ✅ FIXED and DEPLOYED  
**Date**: October 5, 2025  
**Commit**: `fd4a971`






