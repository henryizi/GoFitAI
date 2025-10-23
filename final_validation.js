const http = require('http');

function makeRequest(payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/generate-workout-plan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          resolve({ error: 'Parse failed' });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runFinalValidation() {
  console.log('\n' + '='.repeat(60));
  console.log('  FINAL VALIDATION TEST - ALL WORKOUT FREQUENCIES');
  console.log('='.repeat(60) + '\n');
  
  const tests = [
    { freq: '2_3', label: 'Beginner (2-3 days/week)', expected: 3 },
    { freq: '3_4', label: 'Intermediate-Low (3-4 days/week)', expected: 4 },
    { freq: '4_5', label: 'Intermediate (4-5 days/week)', expected: 5 },
    { freq: '5_6', label: 'Advanced (5-6 days/week)', expected: 6 },
    { freq: '6_7', label: 'Elite (6-7 days/week)', expected: 7 }
  ];

  let allTestsPassed = true;

  for (const test of tests) {
    const payload = {
      profile: {
        full_name: `Test User ${test.freq}`,
        gender: 'M',
        age: 30,
        height_cm: 180,
        weight_kg: 80,
        training_level: 'intermediate',
        primary_goal: 'muscle_gain',
        workout_frequency: test.freq
      }
    };

    const response = await makeRequest(payload);
    
    if (response.error) {
      console.log(`❌ ${test.label}: Request failed (${response.error})`);
      allTestsPassed = false;
    } else {
      const plan = response.workoutPlan;
      const schedule = plan.weeklySchedule || [];
      const workoutDays = schedule.filter(d => d.exercises && d.exercises.length > 0);
      const hasSeven = schedule.length === 7;
      const hasCorrectWorkoutDays = workoutDays.length === test.expected;

      const passed = hasSeven && hasCorrectWorkoutDays && Array.isArray(schedule) && response.success;
      
      console.log(`${passed ? '✅' : '❌'} ${test.label}`);
      console.log(`   - Total days: ${schedule.length}/7 ${hasSeven ? '✅' : '❌'}`);
      console.log(`   - Workout days: ${workoutDays.length}/${test.expected} ${hasCorrectWorkoutDays ? '✅' : '❌'}`);
      console.log(`   - Response success: ${response.success ? '✅' : '❌'}`);
      console.log(`   - Plan name: ${plan.name ? '✅' : '❌'}`);
      
      if (!passed) allTestsPassed = false;
    }
    console.log();
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('='.repeat(60));
  console.log(allTestsPassed ? '✨ ALL TESTS PASSED! 🎉' : '❌ Some tests failed');
  console.log('='.repeat(60) + '\n');
}

runFinalValidation().catch(console.error);
