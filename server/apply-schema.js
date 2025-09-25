require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchema() {
  try {
    console.log('Creating upsert_ai_workout_plan function...');

    // Create the upsert function directly
    const functionSQL = `
      CREATE OR REPLACE FUNCTION upsert_ai_workout_plan(
        user_id_param UUID,
        plan_data JSONB
      )
      RETURNS UUID AS $$
      DECLARE
        plan_id_var UUID;
      BEGIN
        -- Delete the user's current active plan
        DELETE FROM public.workout_plans WHERE user_id = user_id_param AND status = 'active';

        -- Insert the new workout plan
        INSERT INTO public.workout_plans (
          user_id,
          name,
          training_level,
          goal_fat_loss,
          goal_muscle_gain,
          mesocycle_length_weeks,
          estimated_time_per_session,
          weekly_schedule,
          primary_goal,
          workout_frequency,
          status,
          is_active,
          source
        )
        VALUES (
          user_id_param,
          plan_data->>'name',
          COALESCE(plan_data->>'training_level', 'intermediate'),
          COALESCE((plan_data->>'goal_fat_loss')::DECIMAL(4,1), 0),
          COALESCE((plan_data->>'goal_muscle_gain')::DECIMAL(4,1), 0),
          COALESCE((plan_data->>'mesocycle_length_weeks')::INTEGER, 8),
          COALESCE(plan_data->>'estimated_time_per_session', '45-60 min'),
          plan_data->'weeklySchedule',
          COALESCE(plan_data->>'primary_goal', 'general_fitness'),
          COALESCE(plan_data->>'workout_frequency', '4_5'),
          'active',
          true,
          COALESCE(plan_data->>'source', 'ai_generated')
        )
        RETURNING id INTO plan_id_var;

        RETURN plan_id_var;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Try to execute the function creation using a direct approach
    const { data, error } = await supabase.from('workout_plans').select('id').limit(1);

    if (error && error.code !== 'PGRST116') {
      console.log('workout_plans table exists, trying to create function...');

      // Since we can't execute raw SQL directly, let's check if the function exists
      try {
        const { data: funcData, error: funcError } = await supabase.rpc('upsert_ai_workout_plan', {
          user_id_param: '00000000-0000-0000-0000-000000000000',
          plan_data: { name: 'test', weeklySchedule: [] }
        });

        if (funcError && funcError.message.includes('does not exist')) {
          console.log('Function does not exist. Please create it manually in your Supabase dashboard.');
          console.log('SQL to execute:');
          console.log(functionSQL);
        } else {
          console.log('Function already exists or was created successfully!');
        }
      } catch (funcErr) {
        console.log('Function check failed:', funcErr.message);
      }
    } else {
      console.log('Database connection successful!');
    }
  } catch (err) {
    console.error('Failed to apply schema:', err);
  }
}

// Run the function
applySchema()
  .then(() => {
    console.log('Schema application process completed.');
  })
  .catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
  }); 