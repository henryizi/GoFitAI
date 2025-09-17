const axios = require('axios');

async function testCreateUser() {
  console.log('🧪 Testing User Creation and Full Flow');
  console.log('=====================================');

  try {
    // First create a test user
    console.log('\n📝 Creating test user...');
    const createUserResponse = await axios.post('http://localhost:4000/api/users', {
      email: 'test@example.com',
      name: 'Test User',
      age: 30,
      gender: 'male',
      weight: 80,
      height: 175,
      activity_level: 'moderately_active',
      goal: 'cut'
    });

    const userId = createUserResponse.data.user.id;
    console.log(`✅ User created with ID: ${userId}`);

    // Now test nutrition plan generation
    console.log('\n📋 Testing nutrition plan generation...');
    const nutritionPlanResponse = await axios.post('http://localhost:4000/api/generate-nutrition-plan', {
      userId: userId,
      weight: 80,
      height: 175,
      age: 30,
      gender: 'male',
      activity_level: 'moderately_active',
      goal: 'cut',
      preferences: ['high_protein', 'gluten_free']
    });

    console.log('✅ Nutrition plan generated successfully');
    console.log('Plan ID:', nutritionPlanResponse.data.plan.id);

    // Now test daily meal plan generation
    console.log('\n🍽️  Testing daily meal plan generation...');
    const dailyMealPlanResponse = await axios.post('http://localhost:4000/api/generate-daily-meal-plan', {
      userId: userId
    });

    console.log('✅ Daily meal plan generated successfully');
    console.log('Meals:', dailyMealPlanResponse.data.meals.length);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCreateUser();


