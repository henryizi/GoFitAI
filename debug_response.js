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
          resolve({ error: 'Parse failed', raw: data });
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

async function debug() {
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

  console.log('Sending request...\n');
  const response = await makeRequest(payload);
  
  console.log('Full response structure:');
  console.log(JSON.stringify(response, null, 2));
}

debug().catch(console.error);
