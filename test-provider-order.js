const axios = require('axios');

async function testNutritionPlan() {
  try {
    const response = await axios.post('http://localhost:4000/api/generate-nutrition-plan', {
      profile: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        full_name: 'Test User',
        height: 175,
        weight: 80,
        gender: 'male',
        activity_level: 'moderately_active',
        goal_fat_reduction: 10,
        goal_muscle_gain: 2,
        birthday: '1990-01-01'
      }
    });

    console.log('Response:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

testNutritionPlan();



