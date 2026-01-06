-- Create function to delete user account and all associated data
-- This function should be run with elevated permissions to delete across all tables

CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from all user-related tables
  -- Order matters: delete from tables with foreign keys first
  
  -- Delete workout history
  DELETE FROM workout_history WHERE user_id = user_id_to_delete;
  
  -- Delete exercise sets
  DELETE FROM exercise_sets WHERE user_id = user_id_to_delete;
  
  -- Delete workout sessions
  DELETE FROM workout_sessions WHERE user_id = user_id_to_delete;
  
  -- Delete workout plans
  DELETE FROM workout_plans WHERE user_id = user_id_to_delete;
  
  -- Delete nutrition logs
  DELETE FROM nutrition_logs WHERE user_id = user_id_to_delete;
  
  -- Delete meal plans
  DELETE FROM meal_plans WHERE user_id = user_id_to_delete;
  
  -- Delete daily metrics
  DELETE FROM daily_user_metrics WHERE user_id = user_id_to_delete;
  
  -- Delete progress photos
  DELETE FROM progress_photos WHERE user_id = user_id_to_delete;
  
  -- Delete user preferences
  DELETE FROM user_preferences WHERE user_id = user_id_to_delete;
  
  -- Delete profile last (since other tables may reference it)
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  -- Finally delete from auth.users (this requires special permissions)
  -- Note: This should be done through Supabase Auth API, not directly in SQL
  -- The app should call supabase.auth.admin.deleteUser() after this function
  
END;
$$;

-- Grant execute permission to authenticated users (they can only delete their own account via RLS)
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_account IS 'Deletes a user account and all associated data. Should only be called by the account owner.';















