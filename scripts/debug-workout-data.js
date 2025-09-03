require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugWorkoutData() {
  try {
    console.log('🔍 Debugging workout data...');
    
    // Check exercise_sets table
    console.log('\n📊 Checking exercise_sets table...');
    const { data: exerciseSets, error: setsError } = await supabase
      .from('exercise_sets')
      .select('*')
      .limit(5);
    
    if (setsError) {
      console.error('❌ Error fetching exercise_sets:', setsError);
    } else {
      console.log(`✅ Found ${exerciseSets?.length || 0} exercise sets`);
      if (exerciseSets && exerciseSets.length > 0) {
        console.log('Sample exercise set:', JSON.stringify(exerciseSets[0], null, 2));
      }
    }
    
    // Check exercise_logs table
    console.log('\n📊 Checking exercise_logs table...');
    const { data: exerciseLogs, error: logsError } = await supabase
      .from('exercise_logs')
      .select('*')
      .limit(5);
    
    if (logsError) {
      console.error('❌ Error fetching exercise_logs:', logsError);
    } else {
      console.log(`✅ Found ${exerciseLogs?.length || 0} exercise logs`);
      if (exerciseLogs && exerciseLogs.length > 0) {
        console.log('Sample exercise log:', JSON.stringify(exerciseLogs[0], null, 2));
      }
    }
    
    // Check workout_sessions table
    console.log('\n📊 Checking workout_sessions table...');
    const { data: workoutSessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('*')
      .limit(5);
    
    if (sessionsError) {
      console.error('❌ Error fetching workout_sessions:', sessionsError);
    } else {
      console.log(`✅ Found ${workoutSessions?.length || 0} workout sessions`);
      if (workoutSessions && workoutSessions.length > 0) {
        console.log('Sample workout session:', JSON.stringify(workoutSessions[0], null, 2));
      }
    }
    
    // Check workout_plans table
    console.log('\n📊 Checking workout_plans table...');
    const { data: workoutPlans, error: plansError } = await supabase
      .from('workout_plans')
      .select('*')
      .limit(5);
    
    if (plansError) {
      console.error('❌ Error fetching workout_plans:', plansError);
    } else {
      console.log(`✅ Found ${workoutPlans?.length || 0} workout plans`);
      if (workoutPlans && workoutPlans.length > 0) {
        console.log('Sample workout plan:', JSON.stringify(workoutPlans[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error in debugWorkoutData:', error);
  }
}

debugWorkoutData();




