// Test script to verify and fix workout frequency handling
const axios = require('axios');

async function testWorkoutFrequency() {
  console.log('🧪 Testing Workout Frequency Fix...\n');

  try {
    const testProfile = {
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
    };

    console.log(`📋 Testing ${testProfile.workout_frequency} days/week:`);
    console.log(`   Expected: ${testProfile.workout_frequency.replace('_', '-')} training days`);

    const response = await axios.post('http://localhost:4000/api/generate-workout-plan', {
      profile: testProfile
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

      const expectedDays = 2; // For 2_3 frequency
      if (trainingDays >= expectedDays - 1 && trainingDays <= expectedDays + 1) {
        console.log(`   ✅ Frequency matches expectation (±1 day tolerance)`);
      } else {
        console.log(`   ❌ Frequency mismatch! Expected ~${expectedDays}, got ${trainingDays}`);
        console.log(`   🔧 Need to fix the AI prompt enforcement`);
      }
    } else {
      console.log(`   ❌ No plan returned:`, response.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWorkoutFrequency();
