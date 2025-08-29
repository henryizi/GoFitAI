// Test script to verify all workout frequency settings
const axios = require('axios');

async function testAllFrequencies() {
  console.log('🧪 Testing All Workout Frequency Settings...\n');

  try {
    const testProfiles = [
      {
        name: '2_3 days/week',
        profile: {
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
        expected: '2-3'
      },
      {
        name: '4_5 days/week',
        profile: {
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
        expected: '4-5'
      },
      {
        name: '6 days/week',
        profile: {
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
        },
        expected: '6'
      }
    ];

    for (const test of testProfiles) {
      console.log(`\n📋 Testing ${test.name}:`);
      console.log(`   Expected: ${test.expected} training days`);

      try {
        const response = await axios.post('http://localhost:4000/api/generate-workout-plan', {
          profile: test.profile
        }, {
          timeout: 60000
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
          console.log(`   📝 Schedule:`);
          plan.weeklySchedule.forEach(day => {
            const isTraining = day.exercises && day.exercises.length > 0;
            console.log(`      - ${day.day}: ${isTraining ? `Training (${day.exercises.length} exercises)` : 'Rest'}`);
          });

          const expectedMin = test.expected === '2-3' ? 2 : test.expected === '4-5' ? 4 : 6;
          const expectedMax = test.expected === '2-3' ? 3 : test.expected === '4-5' ? 5 : 6;

          if (trainingDays >= expectedMin && trainingDays <= expectedMax) {
            console.log(`   ✅ Frequency matches expectation`);
          } else {
            console.log(`   ❌ Frequency mismatch! Expected ${expectedMin}-${expectedMax}, got ${trainingDays}`);
          }
        } else {
          console.log(`   ❌ No plan returned:`, response.data);
        }
      } catch (error) {
        console.log(`   ❌ Request failed:`, error.message);
      }

      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAllFrequencies();
