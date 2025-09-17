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

async function populateExercisesData() {
  try {
    console.log('🔍 Finding workout history records without exercises_data...');
    
    // Get all workout history records that don't have exercises_data
    const { data: historyRecords, error: fetchError } = await supabase
      .from('workout_history')
      .select('*')
      .is('exercises_data', null);
    
    if (fetchError) {
      console.error('❌ Error fetching workout history:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${historyRecords.length} records without exercises_data`);
    
    for (const record of historyRecords) {
      console.log(`\n🔄 Processing record ${record.id}...`);
      console.log(`   Plan: ${record.plan_name}, Session: ${record.session_name}`);
      console.log(`   Week: ${record.week_number}, Day: ${record.day_number}`);
      
      // Try to find exercise data from exercise_sets table
      let exercisesData = null;
      
      if (record.session_id) {
        console.log(`   Looking for exercise sets with session_id: ${record.session_id}`);
        
        const { data: exerciseSets, error: setsError } = await supabase
          .from('exercise_sets')
          .select(`
            id,
            exercise_id,
            target_sets,
            target_reps,
            exercise:exercises(name)
          `)
          .eq('session_id', record.session_id);
        
        if (setsError) {
          console.error(`   ❌ Error fetching exercise sets:`, setsError);
        } else if (exerciseSets && exerciseSets.length > 0) {
          console.log(`   ✅ Found ${exerciseSets.length} exercise sets`);
          
          // Get exercise logs for these sets
          const setIds = exerciseSets.map(set => set.id);
          const { data: exerciseLogs, error: logsError } = await supabase
            .from('exercise_logs')
            .select('*')
            .in('set_id', setIds)
            .order('completed_at');
          
          if (logsError) {
            console.error(`   ❌ Error fetching exercise logs:`, logsError);
          } else {
            console.log(`   ✅ Found ${exerciseLogs?.length || 0} exercise logs`);
            
            // Build exercises data structure
            const exercises = exerciseSets.map(set => {
              const logs = exerciseLogs?.filter(log => log.set_id === set.id) || [];
              const exerciseName = set.exercise?.[0]?.name || 'Unknown Exercise';
              
              return {
                exercise_id: set.exercise_id,
                exercise_name: exerciseName,
                target_sets: set.target_sets,
                target_reps: set.target_reps,
                logs: logs.map(log => ({
                  id: log.id,
                  actual_reps: log.actual_reps,
                  actual_weight: log.actual_weight,
                  completed_at: log.completed_at
                }))
              };
            });
            
            exercisesData = { exercises };
            console.log(`   📝 Built exercises data with ${exercises.length} exercises`);
          }
        }
      }
      
      // Update the record with exercises_data
      if (exercisesData) {
        const { error: updateError } = await supabase
          .from('workout_history')
          .update({ exercises_data: exercisesData })
          .eq('id', record.id);
        
        if (updateError) {
          console.error(`   ❌ Error updating record:`, updateError);
        } else {
          console.log(`   ✅ Successfully updated record with exercises_data`);
        }
      } else {
        console.log(`   ⚠️  No exercise data found for this record`);
      }
    }
    
    console.log('\n✅ Finished processing all records');
    
  } catch (error) {
    console.error('❌ Error in populateExercisesData:', error);
  }
}

populateExercisesData();

























































