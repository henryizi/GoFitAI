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
          resolve({ error: 'Parse failed', raw: data.substring(0, 200) });
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
  console.log('\n📊 FINAL VALIDATION TEST\n');
  
  const payload = {
    profile: {
      full_name: 'John Doe',
      gender: 'M',
      age: 30,
      height_cm: 180,
      weight_kg: 80,
      training_level: 'intermediate',
      primary_goal: 'muscle_gain',
      workout_frequency: '4_5'
    }
  };

  console.log('📤 Sending request...');
  const response = await makeRequest(payload);

  if (response.error) {
    console.log(`❌ Error: ${response.error}`);
    return;
  }

  const plan = response.workoutPlan;
  const schedule = plan.weeklySchedule || [];
  
  console.log('\n📋 RESULTS:');
  console.log(`✅ Response success: ${response.success}`);
  console.log(`✅ Plan name: ${plan.plan_name}`);
  console.log(`✅ Total days in schedule: ${schedule.length}`);
  
  console.log('\n📅 Weekly Schedule Breakdown:');
  schedule.forEach((day, idx) => {
    const hasExercises = day.exercises && day.exercises.length > 0;
    const exerciseCount = hasExercises ? day.exercises.length : 0;
    const status = hasExercises ? '💪' : '😴';
    console.log(`   ${status} ${day.day}: ${day.focus} (${exerciseCount} exercises)`);
  });

  const workoutDays = schedule.filter(d => d.exercises && d.exercises.length > 0);
  console.log(`\n🎯 Total workout days: ${workoutDays.length}/7`);
  
  console.log('\n✨ VALIDATION SUMMARY:');
  const checks = [
    { name: 'All 7 days present', pass: schedule.length === 7 },
    { name: 'Response success flag', pass: response.success === true },
    { name: 'Plan has proper structure', pass: plan.plan_name && Array.isArray(schedule) },
    { name: 'Exercises are arrays', pass: schedule.every(d => Array.isArray(d.exercises)) }
  ];

  checks.forEach(check => {
    console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED! 🎉' : '❌ Some tests failed'}\n`);
}

runFinalValidation().catch(console.error);
