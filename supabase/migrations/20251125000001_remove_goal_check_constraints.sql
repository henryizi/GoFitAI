-- Remove restrictive check constraints on goal_fat_loss and goal_muscle_gain
-- These were initially set as 1-5 integer ratings but are now used for actual weight values

ALTER TABLE workout_plans DROP CONSTRAINT IF EXISTS workout_plans_goal_fat_loss_check;
ALTER TABLE workout_plans DROP CONSTRAINT IF EXISTS workout_plans_goal_muscle_gain_check;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

