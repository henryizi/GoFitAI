const axios = require('axios');

async function testSupabaseCheck() {
  console.log('🧪 Testing Supabase Configuration Check');
  console.log('=====================================\n');

  try {
    // Test daily meal plan without nutrition plan
    console.log('📋 Testing daily meal plan with database not configured...');
    const mealPlanData = {
      userId: 'test-user-123'
    };

    const response = await axios.post('http://localhost:4000/api/generate-daily-meal-plan', mealPlanData);
    console.log('✅ SUCCESS: Response received');
    console.log('Status:', response.status);
    console.log('Message:', response.data.error);

  } catch (error) {
    console.log('❌ ERROR:', error.response?.data?.error || error.message);
    console.log('Status code:', error.response?.status);

    if (error.response?.data?.error?.includes('Database not configured')) {
      console.log('✅ SUCCESS: Database configuration check working correctly');
    }
  }
}

testSupabaseCheck();


