const fetch = require('node-fetch');

async function testWorkoutGeneration() {
  console.log('🧪 Testing Workout Plan Generation...\n');
  
  const testProfile = {
    userId: 'test-user-123',
    height: 175,
    weight: 75,
    age: 30,
    gender: 'male',
    fullName: 'Test User',
    trainingLevel: 'intermediate',
    primaryGoal: 'muscle_gain',
    fatLossGoal: 0,
    muscleGainGoal: 5,
    workoutFrequency: '4_5'
  };

  try {
    console.log('📤 Sending request to generate workout plan...');
    const response = await fetch('http://localhost:4000/api/generate-workout-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testProfile)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('\n📋 RESULT SUMMARY:');
    console.log('Success:', result.success);
    console.log('Provider:', result.provider);
    console.log('Used AI:', result.used_ai);
    
    if (result.workoutPlan) {
      const plan = result.workoutPlan;
      console.log('\n🏋️ WORKOUT PLAN DETAILS:');
      console.log('Plan Name:', plan.name);
      console.log('Training Level:', plan.training_level);
      console.log('Primary Goal:', plan.primary_goal);
      console.log('Weekly Schedule Length:', plan.weeklySchedule?.length || 0);
      
      console.log('\n📅 WEEKLY SCHEDULE:');
      if (plan.weeklySchedule) {
        plan.weeklySchedule.forEach((day, index) => {
          const exerciseCount = day.exercises?.length || 0;
          const isRestDay = exerciseCount === 0 || day.focus === 'Rest Day';
          console.log(`${index + 1}. ${day.day}: ${day.focus} (${exerciseCount} exercises) ${isRestDay ? '😴' : '💪'}`);
        });
        
        const workoutDays = plan.weeklySchedule.filter(d => d.exercises && d.exercises.length > 0);
        const restDays = plan.weeklySchedule.filter(d => !d.exercises || d.exercises.length === 0);
        
        console.log('\n📊 SUMMARY:');
        console.log(`Workout Days: ${workoutDays.length} 💪`);
        console.log(`Rest Days: ${restDays.length} 😴`);
        
        if (workoutDays.length === 0) {
          console.log('\n❌ ISSUE DETECTED: No workout days found!');
        } else if (workoutDays.length < 3) {
          console.log('\n⚠️ WARNING: Very few workout days detected');
        } else {
          console.log('\n✅ Workout plan looks good!');
        }
      } else {
        console.log('❌ No weekly schedule found!');
      }
    } else {
      console.log('❌ No workout plan in response!');
    }

  } catch (error) {
    console.error('❌ Error testing workout generation:', error.message);
  }
}

testWorkoutGeneration();


