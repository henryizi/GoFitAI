async function testAPI() {
  try {
    console.log('🧪 Testing AI Workout Plan Generation with 7-Day Schedule...\n');
    
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
      
      if (days.length === 7) {
        console.log('✅ CORRECT: Plan has 7 days as expected\n');
      } else {
        console.log(`❌ ERROR: Plan should have 7 days, but has ${days.length}\n`);
      }
      
      console.log('Daily breakdown:');
      let trainingDays = 0;
      let restDays = 0;
      
      days.forEach((day, index) => {
        const exerciseCount = day.exercises ? day.exercises.length : 0;
        const isRestDay = day.focus && day.focus.toLowerCase().includes('rest');
        
        if (isRestDay) {
          restDays++;
          console.log(`  Day ${index + 1} (${day.focus}): ✅ Rest Day - 0 exercises`);
        } else {
          trainingDays++;
          console.log(`  Day ${index + 1} (${day.focus}): 💪 ${exerciseCount} exercises`);
          
          // Show rest times for first day
          if (index === 0 && day.exercises && day.exercises.length > 0) {
            console.log('\n  📋 Rest times for Day 1 exercises:');
            day.exercises.forEach((ex, exIdx) => {
              console.log(`    ${exIdx + 1}. ${ex.name}: rest = "${ex.rest}"`);
            });
          }
        }
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`  Training Days: ${trainingDays}`);
      console.log(`  Rest Days: ${restDays}`);
      console.log(`  Total Days: ${trainingDays + restDays}`);
      
      if (restDays > 0) {
        console.log('✅ CORRECT: Plan includes rest days\n');
      } else {
        console.log('❌ ERROR: Plan should include rest days but does not\n');
      }
      
      // Now test the save plan endpoint to ensure all days are saved to the database
      if (data.workoutPlan.id) {
        console.log(`Now testing if all ${days.length} days were saved to the database...`);
        console.log(`Plan ID: ${data.workoutPlan.id}\n`);
        
        const savePlanResponse = await fetch('https://gofitai-production.up.railway.app/api/save-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan: data.workoutPlan,
            userId: 'test-user-' + Date.now()
          })
        });
        
        const saveResult = await savePlanResponse.json();
        console.log('Save plan response:', saveResult);
      }
      
    } else {
      console.log('❌ Unexpected response format');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
