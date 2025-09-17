// Test script to simulate the metabolic calculations flow
const axios = require('axios');

async function testMetabolicCalculations() {
  console.log('=== Testing Metabolic Calculations Flow ===\n');

  try {
    // 1. Generate a nutrition plan via API
    console.log('1. Generating nutrition plan via API...');
    const response = await axios.post('http://localhost:4000/api/generate-nutrition-plan', {
      profile: {
        full_name: 'Test User',
        age: 25,
        gender: 'male',
        height: 180,
        weight: 75,
        activity_level: 'moderately_active',
        goal_type: 'muscle_gain'
      },
      preferences: ['high_protein'],
      mealsPerDay: 3
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Metabolic Calculations:');
    console.log(JSON.stringify(response.data.metabolic_calculations, null, 2));

    if (!response.data.metabolic_calculations) {
      console.log('❌ ERROR: No metabolic calculations in API response!');
      return;
    }

    console.log('✅ API returned metabolic calculations successfully');

    // 2. Check if the plan was stored (simulate frontend storage)
    console.log('\n2. Simulating frontend storage...');

    const planToStore = {
      ...response.data,
      user_id: 'test-user',
      created_at: response.data.created_at || new Date().toISOString(),
      daily_targets: response.data.daily_targets || {},
      metabolic_calculations: response.data.metabolic_calculations
    };

    console.log('Plan to store metabolic calculations:');
    console.log(JSON.stringify(planToStore.metabolic_calculations, null, 2));

    console.log('✅ Plan prepared for storage with metabolic calculations');

  } catch (error) {
    console.error('❌ Error in test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMetabolicCalculations();












