# 🚨 Body Fat Percentage Migration Required

## Issue
The `daily_user_metrics` table is missing the `body_fat_percentage` column, preventing users from tracking body fat percentage in their progress history.

## Quick Fix (Run in Supabase SQL Editor)

```sql
-- Add the missing body_fat_percentage column
ALTER TABLE public.daily_user_metrics 
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5,2);

-- Add comment to document the column
COMMENT ON COLUMN public.daily_user_metrics.body_fat_percentage 
IS 'User''s body fat percentage for this date (0-100)';
```

## Verification
After running the SQL command, verify the column was added:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'daily_user_metrics' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Steps to Fix:

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run the ALTER TABLE command above**
4. **Test body fat percentage logging**

## Context
The body fat percentage feature has been implemented in the codebase but requires this database column to function properly. Users can input body fat percentage when logging their progress, and it will display in their progress history once this migration is complete.

## Files Updated:
- `src/types/database.ts` - Added body_fat_percentage to DailyMetric type
- `src/services/progressService.ts` - Updated to handle body fat percentage
- `app/(main)/progress/log-progress.tsx` - Updated to save body fat to daily metrics
- `app/(main)/progress/log-metrics.tsx` - Updated to save body fat to daily metrics
- `app/(main)/progress/index.tsx` - Already has display logic for body fat percentage

## Testing
After the migration, test with:
```bash
node test-body-fat-logging.js
```

This should show a successful response with `body_fat_percentage` included in the data.
