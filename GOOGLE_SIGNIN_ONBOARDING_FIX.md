# Google Sign-In Onboarding Data Fix

## Problem Identified

When users sign in with Google (as opposed to creating a new account), their onboarding data wasn't being saved to Supabase. This happened because:

1. **Database Trigger Limitation**: The `handle_new_user()` trigger only fires on `AFTER INSERT` in `auth.users`. When a user signs in with Google (existing account), the trigger doesn't fire, so no profile is created automatically.

2. **Silent Upsert Failures**: The onboarding screens use `upsert` operations, but if the profile doesn't exist, the upsert would fail silently because Row Level Security (RLS) policies require the profile to exist first.

3. **Fire-and-Forget Pattern**: The `saveOnboardingData` function was fire-and-forget, so errors weren't being caught or handled properly.

## Solution Implemented

### 1. Enhanced `saveOnboardingData` Function
- Added `ensureProfileExists()` helper function that checks if a profile exists before saving
- If profile doesn't exist, it creates one automatically
- Improved error handling with detailed logging
- Added automatic retry mechanism if profile creation is needed

### 2. Updated All Onboarding Screens
- All onboarding screens now pass `userId` parameter to `saveOnboardingData`
- This ensures profile existence check happens before each save operation

### 3. Files Modified
- `src/utils/onboardingSave.ts` - Enhanced with profile existence check
- All onboarding screens (`name.tsx`, `gender.tsx`, `birthday.tsx`, `height.tsx`, `weight.tsx`, `weight-trend.tsx`, `exercise-frequency.tsx`, `activity-level.tsx`, `body-fat.tsx`, `primary-goal.tsx`, `fitness-strategy.tsx`) - Updated to pass userId

## Difference Between Sign-In and Sign-Up

### Sign-Up (New Account Creation)
1. User creates account → New user inserted into `auth.users`
2. Database trigger `on_auth_user_created` fires automatically
3. Trigger calls `handle_new_user()` function
4. Profile is created automatically in `profiles` table
5. Onboarding data saves successfully because profile exists

### Sign-In (Existing Account)
1. User signs in with Google → User already exists in `auth.users`
2. **No trigger fires** (trigger only fires on INSERT, not sign-in)
3. Profile might not exist if user was created via social auth previously
4. **Before fix**: Upsert fails silently because profile doesn't exist
5. **After fix**: `saveOnboardingData` checks and creates profile if needed before saving

## How It Works Now

1. User signs in with Google
2. User goes through onboarding
3. First onboarding screen (name) saves data:
   - `saveOnboardingData` checks if profile exists
   - If not, creates profile automatically
   - Then saves onboarding data
4. Subsequent screens work normally because profile now exists

## Testing

To verify the fix works:
1. Sign in with Google account
2. Complete onboarding flow
3. Check Supabase dashboard - profile should exist with all onboarding data
4. Check console logs - should see "Profile created successfully" message if profile was missing

## Future Improvements

Consider adding profile creation directly in the Google sign-in flow to ensure profile exists immediately after sign-in, rather than waiting for first onboarding save.


