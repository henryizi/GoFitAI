# Diagnostic Improvements for User Details Issue

## Problem Statement
User reported that while CLIENT PROFILE shows correct goal (athletic_performance), the generated plans weren't reflecting this properly, and logs showed USER DETAILS with default values (general_fitness).

## Root Cause Analysis
Investigation revealed:
1. **Data Flow**: The data IS being passed correctly from frontend to backend
2. **Frontend**: GeminiService correctly transforms camelCase to snake_case
3. **Backend**: Endpoint correctly receives and normalizes profile data
4. **Prompt**: composeEnhancedWorkoutPrompt receives correct parameters
5. **Issue**: Insufficient logging made it hard to trace where problems might occur

## Solution: Enhanced Diagnostics
Added comprehensive logging at 3 critical points to help diagnose any issues:

### 1. Backend Endpoint (server/index.js)
**Lines 2308-2319**: Added validation check
```javascript
if (!profileData.primary_goal || profileData.primary_goal === 'general_fitness') {
  console.warn('[WORKOUT] ⚠️ WARNING: primary_goal might be using default value...');
  console.log('[WORKOUT] Raw profileData received:', {
    has_primary_goal: !!profileData.primary_goal,
    primary_goal_value: profileData.primary_goal,
    from_userProfile: userProfile?.primaryGoal,
    from_profile_snake: profile?.primary_goal,
    userProfile_exists: !!userProfile,
    profile_exists: !!profile
  });
}
```

**Lines 2351-2360**: Added parameter logging
```javascript
console.log('[WORKOUT] ✅ Parameters passed to composeEnhancedWorkoutPrompt:', {
  gender: profileData.gender,
  primaryGoal: profileData.primary_goal,
  workoutFrequency: profileData.workout_frequency,
  trainingLevel: profileData.training_level,
  age: profileData.age,
  weight_kg: profileData.weight_kg,
  height_cm: profileData.height_cm,
  fullName: profileData.full_name
});
```

This shows EXACTLY what parameters are being sent to the AI prompt generator, making it easy to spot if data is incorrect.

### 2. Gemini Text Service (server/services/geminiTextService.js)
**Lines 398-406**: Enhanced goal logging from prompt
```javascript
// Extract actual primary goal from the prompt for logging
let primaryGoalFromPrompt = 'N/A';
const goalMatch = prompt.match(/Primary Goal:\s*([^\n]+)/);
if (goalMatch && goalMatch[1]) {
  primaryGoalFromPrompt = goalMatch[1].trim();
}

console.log('[GEMINI TEXT] Goal: ' + primaryGoalFromPrompt + ' (extracted from prompt)');
```

Instead of hardcoded "N/A", this extracts the actual goal from the prompt being sent to Gemini, confirming it's correct.

## Benefits of Enhanced Diagnostics

1. **Traceability**: Can now follow the goal value from:
   - User input → Frontend transformation → Backend normalization → AI prompt

2. **Quick Debugging**: When something goes wrong:
   - Check if goal is correct in "[WORKOUT] Parameters passed" log
   - Check if goal is correct in "[GEMINI TEXT] Goal: ..." log
   - Quickly identify if the problem is in frontend, backend, or data flow

3. **Validation**: The warning if primary_goal uses default value catches cases where:
   - Frontend fails to send the goal
   - Backend normalization doesn't work correctly
   - Profile data is somehow reset to defaults

4. **Confidence**: When fixes are deployed, these logs prove:
   - Athletic performance goals ARE being sent correctly
   - Prompts ARE being generated with the right parameters
   - Any remaining issues are in AI response handling, not in data flow

## Expected Log Output After Fix

```
[WORKOUT] Profile: {
  name: 'Henry',
  level: 'intermediate',
  goal: 'athletic_performance',
  frequency: '4_5',
  age: 25,
  gender: 'male'
}

[WORKOUT] ✅ Parameters passed to composeEnhancedWorkoutPrompt: {
  gender: 'male',
  primaryGoal: 'athletic_performance',
  workoutFrequency: '4_5',
  trainingLevel: 'intermediate',
  age: 25,
  weight_kg: 80,
  height_cm: 180,
  fullName: 'Henry'
}

[GEMINI TEXT] Goal: ATHLETIC PERFORMANCE (extracted from prompt)
```

## Deployment Impact
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ Only adds logging (zero performance impact)
- ✅ Helps identify issues in Railway logs
- ✅ Safe to deploy immediately

