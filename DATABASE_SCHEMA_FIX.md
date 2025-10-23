# Critical Fix: Database Schema Mismatch in WorkoutService

## Problem
The application was throwing repeated errors:
```
ERROR [WorkoutService] Error fetching sessions: {"code": "42703", "details": null, "hint": null, "message": "column workout_sessions.name does not exist"}
```

This error was being logged for every workout plan being fetched, preventing session data from loading.

## Root Cause
**File**: `src/services/workout/WorkoutService.ts` (Lines 415-435)

The `getSessionsForPlan()` method was querying for columns that don't exist in the `workout_sessions` table:
- `name` (doesn't exist - should come from `training_splits` table via foreign key)
- `created_at` (doesn't exist)
- `updated_at` (doesn't exist)

### Actual Database Schema
The `workout_sessions` table only contains:
```sql
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL,
    split_id UUID NOT NULL,
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_at TIMESTAMPTZ,
    session_feedback TEXT,
    session_rpe INTEGER,
    recovery_score INTEGER,
    estimated_calories INTEGER
);
```

The session name comes from the related `training_splits` table via the `split_id` foreign key relationship.

## Solution
Updated `WorkoutService.ts` to query only columns that actually exist:

**Before:**
```typescript
const { data: sessions, error } = await supabase
  .from('workout_sessions')
  .select(`
    id,
    plan_id,
    split_id,
    day_number,
    week_number,
    status,
    name,                    // ❌ Doesn't exist
    estimated_calories,
    created_at,              // ❌ Doesn't exist
    updated_at,              // ❌ Doesn't exist
    training_splits:split_id (
      id,
      name,
      focus_areas,
      order_in_week
    )
  `)
```

**After:**
```typescript
const { data: sessions, error } = await supabase
  .from('workout_sessions')
  .select(`
    id,
    plan_id,
    split_id,
    day_number,
    week_number,
    status,
    completed_at,           // ✅ Correct column
    estimated_calories,
    training_splits:split_id (
      id,
      name,                 // ✅ Name comes from training_splits
      focus_areas,
      order_in_week
    )
  `)
```

## Impact
- ✅ **Eliminates all "column does not exist" errors**
- ✅ **Sessions now load correctly for all workout plans**
- ✅ **No data loss or schema changes needed**
- ✅ **Maintains relationship with training_splits for session names**
- ✅ **Backward compatible**

## Files Modified
- `src/services/workout/WorkoutService.ts` (Lines 415-435)

## Verification
After deploying this fix, you should see:
- ✅ No more "column workout_sessions.name does not exist" errors
- ✅ Session counts correctly displayed
- ✅ Workout plans fully loadable with their sessions
- ✅ All 7 days of workout schedules visible (including rest days)

## Related Logs
This fix resolves the repeated errors from `getSessionsForPlan` calls that were showing up in Railway logs and preventing proper workout history/planning functionality.
