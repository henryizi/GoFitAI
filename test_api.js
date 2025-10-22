const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🧪 Testing AI Workout Plan Generation...\n');
    
    const response = await fetch('https://gofitai-production.up.railway.app/api/generate-workout-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile: {
          full_name: 'Test User',
          age: 25,
          gender: 'male',
          weight_kg: 75,
          height_cm: 175,
          training_level: 'intermediate',
          primary_goal: 'muscle_gain',
          workout_frequency: '4_5'
        }
      })
    });
    
    const data = await response.json();
    
    if (data.workoutPlan && data.workoutPlan.weeklySchedule) {
      const days = data.workoutPlan.weeklySchedule;
      console.log(`✅ API Response received!`);
      console.log(`📅 Workout plan has ${days.length} days`);
      console.log('\nDaily breakdown:');
      days.forEach((day, index) => {
        const exerciseCount = day.exercises ? day.exercises.length : 0;
        console.log(`  Day ${index + 1} (${day.focusArea}): ${exerciseCount} exercises`);
      });
    } else {
      console.log('❌ Unexpected response format');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
