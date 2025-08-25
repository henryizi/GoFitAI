# 🚨 Database Migration Required

## Issue
The `workout_sessions` table is missing the `estimated_calories` column, causing `PGRST204` errors when creating workout sessions.

## Quick Fix (Run in Supabase SQL Editor)

```sql
-- Add the missing estimated_calories column
ALTER TABLE public.workout_sessions 
ADD COLUMN IF NOT EXISTS estimated_calories INTEGER;
```

## Verification
After running the SQL command, verify the column was added:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'workout_sessions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Steps to Fix:

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run the ALTER TABLE command above**
4. **Test workout plan creation**

## Alternative: Run Migration Script

If you have your `SUPABASE_SERVICE_KEY`, you can run:

```bash
cd scripts
node run-migration.js
```

## Context
The error occurs in `WorkoutService.ts` line 984 when trying to insert `estimated_calories` into the `workout_sessions` table. The column exists in the schema definition but not in the actual database table.

## Files Affected:
- `src/services/workout/WorkoutService.ts` (line 984)
- `src/types/database.ts` (line 250)
- `scripts/setup-supabase.sql` (line 198)
