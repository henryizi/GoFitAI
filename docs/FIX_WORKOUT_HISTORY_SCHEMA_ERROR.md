# Fix Workout History Schema Error

## Problem
The app is encountering a `PGRST204` error when trying to save workout history:

```
ERROR [WorkoutHistoryService] Error saving workout history: {"code": "PGRST204", "details": null, "hint": null, "message": "Could not find the 'estimated_calories' column of 'workout_history' in the schema cache"}
```

## Root Cause
The `workout_history` table in the database is missing the `estimated_calories` column, but the application code expects it to exist.

## Solution
Run the migration script to add the missing column to the database.

### Option 1: Run SQL Migration (Recommended)
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `scripts/database/fix-workout-history-schema.sql`
4. Execute the script

### Option 2: Manual SQL Command
```sql
ALTER TABLE public.workout_history 
ADD COLUMN IF NOT EXISTS estimated_calories INTEGER;
```

## What the Migration Does
1. **Adds the missing column**: `estimated_calories INTEGER` to the `workout_history` table
2. **Verifies the change**: Shows the new column structure
3. **Checks RLS policies**: Ensures row-level security is properly configured
4. **Audits existing data**: Shows how many records exist and their calorie data status

## Files Modified
- ✅ `src/types/database.ts` - Added `estimated_calories` to TypeScript types
- ✅ `create-workout-history-table.sql` - Updated table creation script
- ✅ `scripts/database/fix-workout-history-schema.sql` - Created migration script

## Verification
After running the migration, you should see:
- ✅ No more `PGRST204` errors when saving workout history
- ✅ Workout history entries include calorie information
- ✅ Dashboard calorie calculations work properly

## Prevention
This issue occurred because the database schema was out of sync with the application code. In the future:
1. Always run database migrations before deploying code changes
2. Use the `create-workout-history-table.sql` script for new installations
3. Test database operations in development before production

## Related Issues
- Dashboard calorie calculations may have been showing 0 calories
- Workout history entries may have been missing calorie data
- Session completion may have failed silently


