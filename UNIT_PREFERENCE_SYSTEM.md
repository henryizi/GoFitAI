# Unit Preference System Implementation

## Overview
The app now remembers and respects user preferences for height and weight units. When users input their data in feet/pounds, the app will continue to display all measurements in their preferred units while storing the metric values for calculations.

## What Was Implemented

### 1. Database Schema Updates
- Added `height_unit_preference` column (cm | ft | null)
- Added `weight_unit_preference` column (kg | lbs | null)
- Created migration file: `supabase/migrations/20250908111306_add_unit_preferences.sql`
- **Manual Step Required**: Run `add_unit_preferences.sql` in Supabase dashboard

### 2. Updated Onboarding Forms
**Height Screen** (`app/(onboarding)/height.tsx`):
- Now stores both height in cm AND user's preferred unit
- Users who select "ft" will see feet values throughout the app

**Weight Screen** (`app/(onboarding)/weight.tsx`):
- Now stores both weight in kg AND user's preferred unit  
- Users who select "lbs" will see pound values throughout the app

### 3. Utility Functions
**New file**: `src/utils/unitConversions.ts`
- `formatHeight()` - Display height in user's preferred unit
- `formatWeight()` - Display weight in user's preferred unit
- `formatHeightWithUnit()` - Format with unit label
- `formatWeightWithUnit()` - Format with unit label
- Conversion functions: `cmToFeet()`, `feetToCm()`, `kgToLbs()`, `lbsToKg()`

### 4. Updated Display Components
**Profile Settings** (`app/(main)/settings/profile-premium.tsx`):
- Height/weight now display in user's preferred units
- Example: "5.7 ft" instead of "173 cm" for users who chose feet

**Workout Plan Creation** (`app/(main)/workout/plan-create.tsx`):
- Profile summary shows measurements in preferred units
- Labels updated to be unit-agnostic ("HEIGHT" instead of "HEIGHT (CM)")

**Progress Tracking** (`app/(main)/progress/log-metrics.tsx` & `log-progress.tsx`):
- Weight input defaults to user's preferred unit
- Automatically switches to preferred unit when profile loads
- Maintains conversion accuracy for database storage

### 5. TypeScript Type Updates
**Database Types** (`src/types/database.ts`):
- Added unit preference fields to Profile interface
- Supports both Row, Insert, and Update operations

## How It Works

### For New Users
1. User selects height in feet → `height_unit_preference = 'ft'` saved
2. User selects weight in lbs → `weight_unit_preference = 'lbs'` saved  
3. All future displays show feet/pounds
4. Database still stores metric values (cm/kg) for calculations

### For Existing Users
1. Default preferences set to cm/kg (maintains current behavior)
2. Users can change preferences in future settings updates
3. No disruption to existing functionality

### Data Flow
```
User Input (5.7 ft) → Convert to CM (173) → Store in DB
Database (173 cm) → Check preference (ft) → Display (5.7 ft)
```

## Benefits

1. **User Experience**: Users see measurements in familiar units
2. **Data Consistency**: All calculations use standardized metric values
3. **Backward Compatible**: Existing users see no changes
4. **Future Proof**: Easy to add more unit preferences later

## CRITICAL FIXES APPLIED

### Issues Fixed:
1. **Scroll Handler Bug**: Height/weight pickers weren't calling `handleValueChange()` on scroll end
2. **Wrong Database Columns**: Code was saving to `height`/`weight` instead of `height_cm`/`weight_kg`
3. **Value Not Updating**: Scroll events were only updating `selectedIndex` but not the actual state values

### Changes Made:
- ✅ Fixed scroll handlers in both height.tsx and weight.tsx to call `handleValueChange()`
- ✅ Updated database saves to use `height_cm` and `weight_kg` columns
- ✅ Ensured proper unit conversion when scrolling/selecting values

## Next Steps

### Required Manual Database Update
Run this SQL in your Supabase dashboard:
```sql
-- Copy contents from add_unit_preferences.sql
ALTER TABLE profiles 
ADD COLUMN height_unit_preference text CHECK (height_unit_preference IN ('cm', 'ft')),
ADD COLUMN weight_unit_preference text CHECK (weight_unit_preference IN ('kg', 'lbs'));
```

### Testing
1. Complete onboarding with feet/pounds
2. Verify height shows as feet in profile settings
3. Verify weight logging uses pounds by default
4. Check workout plan creation shows correct units

### Future Enhancements
1. Add unit preference settings page
2. Support more units (stones, inches, etc.)
3. Add temperature preferences (°C/°F)
4. Implement unit preferences for exercise weights

## Files Modified
- `src/types/database.ts` - Added unit preference types
- `app/(onboarding)/height.tsx` - Store height unit preference
- `app/(onboarding)/weight.tsx` - Store weight unit preference
- `src/utils/unitConversions.ts` - New utility functions
- `app/(main)/settings/profile-premium.tsx` - Display preferred units
- `app/(main)/workout/plan-create.tsx` - Profile metrics in preferred units
- `app/(main)/progress/log-metrics.tsx` - Weight input in preferred unit
- `app/(main)/progress/log-progress.tsx` - Weight input in preferred unit

The system is now ready to provide a personalized experience based on user unit preferences!
