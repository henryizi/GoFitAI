const axios = require('axios');

// Test the workout plan generation to verify it creates 5 sessions
async function testWorkoutGeneration() {
  try {
    console.log('🧪 Testing workout plan generation for 5 sessions per week...');

    const testUserProfile = {
      fitnessLevel: 'intermediate',
      primaryGoal: 'muscle_gain',
      age: 25,
      height_cm: 175,
      weight_kg: 75,
      gender: 'male',
      workoutFrequency: '4_5', // This should result in 5 sessions
      activity_level: 'moderately_active'
    };

    const response = await axios.post('http://localhost:4000/api/generate-workout-plan', {
      userProfile: testUserProfile,
      preferences: {
        daysPerWeek: 5,
        sessionDuration: 45,
        workoutTypes: ['strength_training'],
        intensity: 'medium',
        equipment: ['dumbbells', 'barbell']
      }
    });

    console.log('✅ API Response received');
    console.log('📊 Response status:', response.status);
    console.log('🔍 Provider used:', response.data.provider);
    console.log('🤖 Used AI:', response.data.used_ai);

    if (response.data.plan) {
      const plan = response.data.plan;
      console.log('📋 Plan name:', plan.plan_name);
      console.log('📅 Sessions per week:', plan.sessions_per_week);
      console.log('📆 Weekly schedule length:', plan.weeklySchedule?.length || plan.weekly_schedule?.length || 0);

      // Check if we got 5 sessions
      const sessions = plan.weeklySchedule || plan.weekly_schedule || [];
      console.log('📋 Weekly schedule:');
      sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.day_name}: ${session.focus}`);
      });

      if (sessions.length === 5) {
        console.log('✅ SUCCESS: Generated exactly 5 workout sessions!');
      } else {
        console.log(`❌ ISSUE: Generated ${sessions.length} sessions, expected 5`);
      }
    } else {
      console.log('❌ No plan returned in response');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Wait for server to start, then test
setTimeout(testWorkoutGeneration, 3000);

