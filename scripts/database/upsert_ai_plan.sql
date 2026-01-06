-- Function to upsert an AI-generated workout plan atomically
CREATE OR REPLACE FUNCTION upsert_ai_workout_plan(
  user_id_param UUID,
  plan_data JSONB
)
RETURNS UUID AS $$
DECLARE
  plan_id_var UUID;
  split_id_var UUID;
  session_id_var UUID;
  exercise_id_var UUID;
  day_data JSONB;
  exercise_data JSONB;
  day_counter INT := 0; -- Counter for the day order
  exercise_name_lower TEXT;
  inferred_muscle_groups TEXT[];
BEGIN
  -- Step 1: Delete the user's current active plan and its children
  DELETE FROM public.workout_plans WHERE user_id = user_id_param AND status = 'active';

  -- Step 2: Insert the new main workout plan
  INSERT INTO public.workout_plans (
    user_id, name, training_level, goal_fat_loss, goal_muscle_gain, mesocycle_length_weeks, estimated_time_per_session, volume_landmarks
  )
  VALUES (
    user_id_param,
    plan_data->>'name',
    plan_data->>'training_level',
    (plan_data->>'goal_fat_loss')::INTEGER,
    (plan_data->>'goal_muscle_gain')::INTEGER,
    (plan_data->>'mesocycle_length_weeks')::INTEGER,
    plan_data->>'estimated_time_per_session',
    '{}'::JSONB -- Default empty JSON
  )
  RETURNING id INTO plan_id_var;

  -- Step 3: Loop through the weekly schedule to create splits, sessions, and sets
  FOR day_data IN SELECT * FROM jsonb_array_elements(plan_data->'weeklySchedule')
  LOOP
    day_counter := day_counter + 1; -- Increment day counter for order

    -- Create training split
    INSERT INTO public.training_splits (plan_id, name, order_in_week, focus_areas, frequency_per_week)
    VALUES (plan_id_var, day_data->>'focus', day_counter, ARRAY[day_data->>'focus'], 1)
    RETURNING id INTO split_id_var;

    -- Create workout session
    INSERT INTO public.workout_sessions (plan_id, split_id, week_number, day_number, estimated_calories)
    VALUES (plan_id_var, split_id_var, 1, day_counter, (day_data->>'estimatedCaloriesBurned')::INTEGER)
    RETURNING id INTO session_id_var;

    -- Loop through exercises for the day
    FOR exercise_data IN SELECT * FROM jsonb_array_elements(day_data->'exercises')
    LOOP
      -- Find or create the exercise (assumes exercises are global)
      SELECT id INTO exercise_id_var FROM public.exercises WHERE name = exercise_data->>'name';

      IF NOT FOUND THEN
        -- Infer muscle groups from exercise name
        exercise_name_lower := LOWER(exercise_data->>'name');
        inferred_muscle_groups := ARRAY[]::TEXT[];
          
          -- Chest
          IF exercise_name_lower LIKE '%chest%' OR 
             exercise_name_lower LIKE '%bench%' OR 
             (exercise_name_lower LIKE '%press%' AND exercise_name_lower NOT LIKE '%shoulder%' AND exercise_name_lower NOT LIKE '%overhead%') OR
             exercise_name_lower LIKE '%fly%' OR
             exercise_name_lower LIKE '%pec%' THEN
            inferred_muscle_groups := array_append(inferred_muscle_groups, 'chest');
          END IF;
          
          -- Back
          IF exercise_name_lower LIKE '%back%' OR 
             exercise_name_lower LIKE '%row%' OR 
             exercise_name_lower LIKE '%pull%' OR 
             exercise_name_lower LIKE '%lat%' OR 
             exercise_name_lower LIKE '%deadlift%' THEN
            inferred_muscle_groups := array_append(inferred_muscle_groups, 'back');
          END IF;
          
          -- Legs
          IF exercise_name_lower LIKE '%leg%' OR 
             exercise_name_lower LIKE '%squat%' OR 
             exercise_name_lower LIKE '%lunge%' OR 
             exercise_name_lower LIKE '%calf%' OR
             exercise_name_lower LIKE '%quad%' OR
             exercise_name_lower LIKE '%hamstring%' OR
             exercise_name_lower LIKE '%glute%' THEN
            inferred_muscle_groups := array_append(inferred_muscle_groups, 'legs');
          END IF;
          
          -- Shoulders
          IF exercise_name_lower LIKE '%shoulder%' OR 
             exercise_name_lower LIKE '%delt%' OR 
             (exercise_name_lower LIKE '%press%' AND (exercise_name_lower LIKE '%overhead%' OR exercise_name_lower LIKE '%shoulder%')) OR
             exercise_name_lower LIKE '%lateral raise%' THEN
            inferred_muscle_groups := array_append(inferred_muscle_groups, 'shoulders');
          END IF;
          
          -- Arms
          IF exercise_name_lower LIKE '%arm%' OR 
             exercise_name_lower LIKE '%bicep%' OR 
             exercise_name_lower LIKE '%tricep%' OR 
             exercise_name_lower LIKE '%curl%' THEN
            inferred_muscle_groups := array_append(inferred_muscle_groups, 'arms');
          END IF;
          
          -- Core
          IF exercise_name_lower LIKE '%core%' OR 
             exercise_name_lower LIKE '%abs%' OR 
             exercise_name_lower LIKE '%abdominal%' OR 
             exercise_name_lower LIKE '%crunch%' OR
             exercise_name_lower LIKE '%plank%' THEN
            inferred_muscle_groups := array_append(inferred_muscle_groups, 'core');
          END IF;
          
          -- Default to 'full body' if no matches
          IF array_length(inferred_muscle_groups, 1) IS NULL THEN
            inferred_muscle_groups := ARRAY['full body']::TEXT[];
          END IF;
          
        INSERT INTO public.exercises (name, category, muscle_groups, difficulty, is_custom)
        VALUES (exercise_data->>'name', 'accessory', inferred_muscle_groups, 'intermediate', false)
        RETURNING id INTO exercise_id_var;
      END IF;

      -- Create exercise set
      INSERT INTO public.exercise_sets (session_id, exercise_id, order_in_session, target_sets, target_reps, rest_period, progression_scheme)
      VALUES (
        session_id_var,
        exercise_id_var,
        (SELECT COUNT(*) + 1 FROM public.exercise_sets WHERE session_id = session_id_var),
        (exercise_data->>'sets')::INTEGER,
        exercise_data->>'reps',
        exercise_data->>'restBetweenSets',
        'double_progression'
      );
    END LOOP;
  END LOOP;

  RETURN plan_id_var;
END;
$$ LANGUAGE plpgsql; 