const http = require('http');

function testAPI(testName, payload) {
  return new Promise((resolve, reject) => {
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
          const plan = response.workoutPlan;
          const schedule = plan.weeklySchedule || [];
          const workoutDays = schedule.filter(d => d.exercises && d.exercises.length > 0);
          
          console.log(`✅ ${testName}`);
          console.log(`   - Total days: ${schedule.length}`);
          console.log(`   - Workout days: ${workoutDays.length}`);
          console.log(`   - All 7 days present: ${schedule.length === 7 ? '✅' : '❌'}`);
          console.log(`   - Status: ${response.success ? '✅' : '❌'}`);
          resolve(true);
        } catch (e) {
          console.log(`❌ ${testName} - Parse error`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${testName} - Error: ${e.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 COMPREHENSIVE WORKOUT PLAN TESTS\n');
  
  const tests = [
    {
      name: 'Test 1: Beginner - 2-3 days/week',
      payload: {
        profile: {
          full_name: 'Beginner User',
          gender: 'M',
          age: 25,
          height_cm: 175,
          weight_kg: 75,
          training_level: 'beginner',
          primary_goal: 'fat_loss',
          workout_frequency: '2_3'
        }
      }
    },
    {
      name: 'Test 2: Intermediate - 3-4 days/week',
      payload: {
        profile: {
          full_name: 'Intermediate User',
          gender: 'F',
          age: 28,
          height_cm: 165,
          weight_kg: 65,
          training_level: 'intermediate',
          primary_goal: 'muscle_gain',
          workout_frequency: '3_4'
        }
      }
    },
    {
      name: 'Test 3: Advanced - 5-6 days/week',
      payload: {
        profile: {
          full_name: 'Advanced User',
          gender: 'M',
          age: 35,
          height_cm: 180,
          weight_kg: 85,
          training_level: 'advanced',
          primary_goal: 'muscle_gain',
          workout_frequency: '5_6'
        }
      }
    },
    {
      name: 'Test 4: Elite - 6-7 days/week',
      payload: {
        profile: {
          full_name: 'Elite User',
          gender: 'F',
          age: 30,
          height_cm: 170,
          weight_kg: 70,
          training_level: 'advanced',
          primary_goal: 'muscle_gain',
          workout_frequency: '6_7'
        }
      }
    }
  ];

  for (const test of tests) {
    await testAPI(test.name, test.payload);
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✨ All tests completed!\n');
}

runTests().catch(console.error);
