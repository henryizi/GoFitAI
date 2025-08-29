// Test script to reproduce and verify fix for user's specific issue
const axios = require('axios');

async function testUserIssue() {
  console.log('🧪 Testing User\'s Specific Issue: 6 training days with only 1 rest day\n');

  try {
    // Simulate what might happen if AI generates too many training days
    const testProfile = {
      full_name: 'Test User 6 Days',
      gender: 'male',
      age: 30,
      height: 180,
      weight: 80,
      training_level: 'intermediate',
      goal_fat_reduction: 2,
      goal_muscle_gain: 4,
      workout_frequency: '2_3', // User wants 2-3 days but AI generates 6
      activity_level: 'moderate'
    };

    console.log(`📋 User's intended frequency: ${testProfile.workout_frequency} days/week`);
    console.log(`   Expected: 2-3 training days with 4-5 rest days`);

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
      const restDays = actualDays - trainingDays;

      console.log(`\n✅ Plan generated successfully`);
      console.log(`📊 Total schedule days: ${actualDays}`);
      console.log(`💪 Training days: ${trainingDays}`);
      console.log(`😴 Rest days: ${restDays}`);
      console.log(`📝 Schedule:`);

      plan.weeklySchedule.forEach(day => {
        const isTraining = day.exercises && day.exercises.length > 0;
        console.log(`   - ${day.day}: ${isTraining ? `Training (${day.exercises.length} exercises)` : 'Rest'}`);
      });

      if (trainingDays >= 2 && trainingDays <= 3) {
        console.log(`\n✅ ISSUE FIXED! Workout frequency now correctly matches user's preference`);
        console.log(`   User wanted 2-3 days/week, got ${trainingDays} training days and ${restDays} rest days`);
      } else {
        console.log(`\n❌ ISSUE PERSISTS! Still got ${trainingDays} training days instead of 2-3`);
      }
    } else {
      console.log(`❌ No plan returned:`, response.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserIssue();
