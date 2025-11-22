# 🔍 Diagnose Profile Data Issue

## The Problem

You mentioned seeing "weight is missing" in the AI nutrition plan, even though you completed onboarding.

## Why This Happens

There could be several reasons:

### 1. **Database Column Names Mismatch**
- Onboarding might save to different column names (e.g., `current_weight` vs `weight`)
- Column names might use underscores vs camelCase

### 2. **Profile Not Updated After Onboarding**
- Onboarding data might not have been saved to Supabase
- Data might be in a different table

### 3. **Data Type Issues**
- Numbers might be stored as strings
- NULL vs undefined vs empty string

## How to Diagnose

### Option 1: Check in Supabase Dashboard (Recommended)

1. Go to https://app.supabase.com
2. Select your GoFitAI project
3. Go to **Table Editor**
4. Open the `profiles` table
5. Find your user row (search by email)
6. Check these columns:
   - ✅ `weight` - should have a number
   - ✅ `height` - should have a number
   - ✅ `age` OR `birthday` - should have a value
   - ✅ `gender` - should be 'male' or 'female'
   - ✅ `activity_level` - should have a value
   - ✅ `primary_goal` or `fitness_strategy` - should have a value

### Option 2: Try Generating AI Nutrition in App (With New Logging)

1. Open your GoFitAI app
2. Go to **Nutrition** tab
3. Select **Create New Plan** → **AI-Powered**
4. Generate the plan
5. Open Railway logs: https://railway.com/project/72301c62-a43b-4dae-b0af-9d87dce441e0
6. Look for:
   ```
   [AI NUTRITION TARGETS] Received profile data: {...}
   ```
7. This will show EXACTLY what data is being sent

### Option 3: Check Onboarding Flow

The issue might be in how onboarding saves data. Check:
- `app/(onboarding)/` screens
- How they call `updateUserProfile()` or similar
- What field names they use

## Common Fixes

### Fix 1: Re-do Onboarding
1. Go to Settings → Profile
2. Update your weight, height, age
3. Save
4. Try AI nutrition generation again

### Fix 2: Check if Data Uses Different Column Names

If onboarding uses different names, we need to update:
1. The database query in `AInutritionService.ts`
2. OR update onboarding to use correct column names

## What The Logging Will Show

With the new logging deployed, you'll see output like:

```json
{
  "id": "user-123",
  "full_name": "John Doe",
  "weight": 75,          // ✅ Present
  "height": 178,         // ✅ Present
  "age": null,           // ❌ Missing!
  "birthday": "1995-05-15", // ✅ Can calculate age from this
  "gender": "male",
  "activity_level": "moderately_active",
  ...
}
```

This will tell us EXACTLY which fields are missing.

## Next Action

**Please try one of these:**

1. **Check your profile in Supabase** (fastest way to diagnose)
2. **Generate an AI nutrition plan and share the logs** (I'll tell you exactly what's wrong)
3. **Tell me what you see** when generating the plan (does it say "Not specified" for certain fields?)

Then I can fix the exact issue!

