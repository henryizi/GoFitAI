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

async function createSampleExerciseData() {
  try {
    console.log('🔍 Creating sample exercise data for testing...');
    
    // Get the existing workout history record
    const { data: historyRecord, error: fetchError } = await supabase
      .from('workout_history')
      .select('*')
      .is('exercises_data', null)
      .limit(1)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching workout history record:', fetchError);
      return;
    }
    
    console.log(`📝 Found workout history record: ${historyRecord.id}`);
    
    // Create sample exercise data
    const sampleExercisesData = {
      exercises: [
        {
          exercise_id: "75965092-ca75-4abb-8a7d-7d7346651e51",
          exercise_name: "Barbell Bench Press",
          target_sets: 3,
          target_reps: "8-10",
          logs: [
            {
              id: "sample-log-1",
              actual_reps: 8,
              actual_weight: 80,
              completed_at: "2025-08-30T14:15:00.000Z"
            },
            {
              id: "sample-log-2", 
              actual_reps: 8,
              actual_weight: 80,
              completed_at: "2025-08-30T14:17:30.000Z"
            },
            {
              id: "sample-log-3",
              actual_reps: 7,
              actual_weight: 80,
              completed_at: "2025-08-30T14:20:00.000Z"
            }
          ]
        },
        {
          exercise_id: "sample-exercise-2",
          exercise_name: "Pull-ups",
          target_sets: 3,
          target_reps: "8-10",
          logs: [
            {
              id: "sample-log-4",
              actual_reps: 8,
              actual_weight: null,
              completed_at: "2025-08-30T14:25:00.000Z"
            },
            {
              id: "sample-log-5",
              actual_reps: 7,
              actual_weight: null,
              completed_at: "2025-08-30T14:27:30.000Z"
            },
            {
              id: "sample-log-6",
              actual_reps: 6,
              actual_weight: null,
              completed_at: "2025-08-30T14:30:00.000Z"
            }
          ]
        },
        {
          exercise_id: "sample-exercise-3",
          exercise_name: "Squats",
          target_sets: 3,
          target_reps: "10-12",
          logs: [
            {
              id: "sample-log-7",
              actual_reps: 10,
              actual_weight: 100,
              completed_at: "2025-08-30T14:35:00.000Z"
            },
            {
              id: "sample-log-8",
              actual_reps: 10,
              actual_weight: 100,
              completed_at: "2025-08-30T14:37:30.000Z"
            },
            {
              id: "sample-log-9",
              actual_reps: 9,
              actual_weight: 100,
              completed_at: "2025-08-30T14:40:00.000Z"
            }
          ]
        }
      ]
    };
    
    // Update the workout history record with sample data
    const { error: updateError } = await supabase
      .from('workout_history')
      .update({ exercises_data: sampleExercisesData })
      .eq('id', historyRecord.id);
    
    if (updateError) {
      console.error('❌ Error updating workout history:', updateError);
    } else {
      console.log('✅ Successfully added sample exercise data to workout history');
      console.log('📊 Sample data includes:');
      console.log(`   - ${sampleExercisesData.exercises.length} exercises`);
      console.log(`   - ${sampleExercisesData.exercises.reduce((total, ex) => total + ex.logs.length, 0)} total sets`);
      console.log('   - Barbell Bench Press (3 sets)');
      console.log('   - Pull-ups (3 sets)');
      console.log('   - Squats (3 sets)');
    }
    
  } catch (error) {
    console.error('❌ Error in createSampleExerciseData:', error);
  }
}

createSampleExerciseData();




