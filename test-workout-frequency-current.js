// Test script to verify workout frequency handling in current system
const axios = require('axios');

async function testWorkoutFrequency() {
  console.log('🧪 Testing Workout Frequency Handling...\n');

  try {
    // Test different workout frequencies
    const testProfiles = [
      {
        full_name: 'Test User 2-3',
        gender: 'male',
        age: 30,
        height: 180,
        weight: 80,
        training_level: 'intermediate',
        goal_fat_reduction: 2,
        goal_muscle_gain: 4,
        workout_frequency: '2_3',
        activity_level: 'moderate'
      },
      {
        full_name: 'Test User 4-5',
        gender: 'male',
        age: 30,
        height: 180,
        weight: 80,
        training_level: 'intermediate',
        goal_fat_reduction: 2,
        goal_muscle_gain: 4,
        workout_frequency: '4_5',
        activity_level: 'moderate'
      },
      {
        full_name: 'Test User 6',
        gender: 'male',
        age: 30,
        height: 180,
        weight: 80,
        training_level: 'intermediate',
        goal_fat_reduction: 2,
        goal_muscle_gain: 4,
        workout_frequency: '6',
        activity_level: 'moderate'
      }
    ];

    for (const profile of testProfiles) {
      console.log(`\n📋 Testing ${profile.workout_frequency} days/week:`);
      console.log(`   Expected: ${profile.workout_frequency.replace('_', '-')} training days`);

      try {
        const response = await axios.post('http://localhost:4000/api/generate-workout-plan', {
          profile: profile
        }, {
          timeout: 30000
        });

        if (response.data && response.data.success && response.data.plan) {
          const plan = response.data.plan;
          const actualDays = plan.weeklySchedule ? plan.weeklySchedule.length : 0;
          const trainingDays = plan.weeklySchedule ?
            plan.weeklySchedule.filter(day =>
              !day.day.toLowerCase().includes('rest') &&
              day.exercises && day.exercises.length > 0
            ).length : 0;

          console.log(`   ✅ Plan generated successfully`);
          console.log(`   📊 Total schedule days: ${actualDays}`);
          console.log(`   💪 Training days: ${trainingDays}`);
          console.log(`   📝 Days: ${plan.weeklySchedule.map(d => d.day).join(', ')}`);

          const expectedDays = profile.workout_frequency === '2_3' ? 2 :
                              profile.workout_frequency === '4_5' ? 4 :
                              profile.workout_frequency === '6' ? 6 : 0;

          if (trainingDays >= expectedDays - 1 && trainingDays <= expectedDays + 1) {
            console.log(`   ✅ Frequency matches expectation (±1 day tolerance)`);
          } else {
            console.log(`   ❌ Frequency mismatch! Expected ~${expectedDays}, got ${trainingDays}`);
          }
        } else {
          console.log(`   ❌ No plan returned:`, response.data);
        }
      } catch (error) {
        console.log(`   ❌ Request failed:`, error.message);
      }

      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWorkoutFrequency();
