const fetch = require('node-fetch');

async function testProfileEndpoint() {
  const testData = {
    userId: "2b7ea2b7-b739-47f1-b389-aba682ac8c5f",
    updates: {
      training_level: "intermediate",
      primary_goal: "muscle_gain",
      workout_frequency: "2_3",
      goal_fat_reduction: 7,
      goal_muscle_gain: 7
    }
  };

  console.log('🧪 Testing profile endpoint...');
  console.log('📡 URL: http://localhost:4001/api/profile');
  console.log('📦 Data:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('http://localhost:4001/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📄 Response body:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Profile endpoint is working correctly!');
    } else {
      console.log('❌ Profile endpoint returned error:', result.error);
    }

  } catch (error) {
    console.error('💥 Network error:', error.message);
    
    // Check if it's a "Route not found" error
    if (error.message.includes('Route not found')) {
      console.log('🔍 This appears to be the "Route not found" error the client is experiencing');
    }
  }
}

// Also test the health endpoint
async function testHealthEndpoint() {
  console.log('\n🏥 Testing health endpoint...');
  
  try {
    const response = await fetch('http://localhost:4001/api/health');
    const result = await response.json();
    console.log('📊 Health response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('💥 Health endpoint error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting endpoint tests...\n');
  
  await testHealthEndpoint();
  await testProfileEndpoint();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);
















































