-- Fix: Optimize exercise_sets RLS Policy
-- Issue: Complex JOIN in RLS policy causes Cloudflare 500 errors
-- Solution: Use nested subqueries instead of JOINs for better performance

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can manage their own exercise sets" ON exercise_sets;

-- Create optimized policy with nested subqueries
CREATE POLICY "Users can manage their own exercise sets"
    ON exercise_sets FOR ALL
    USING (
        session_id IN (
            SELECT id FROM workout_sessions 
            WHERE plan_id IN (
                SELECT id FROM workout_plans 
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        session_id IN (
            SELECT id FROM workout_sessions 
            WHERE plan_id IN (
                SELECT id FROM workout_plans 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'exercise_sets' 
AND policyname = 'Users can manage their own exercise sets';

-- Performance check: Ensure the policy definition is correct
EXPLAIN ANALYZE
SELECT es.id, es.session_id, es.exercise_id
FROM exercise_sets es
WHERE es.session_id IN (
    SELECT id FROM workout_sessions 
    WHERE plan_id IN (
        SELECT id FROM workout_plans 
        WHERE user_id = '12345678-1234-1234-1234-123456789012'::uuid
    )
)
LIMIT 5;

