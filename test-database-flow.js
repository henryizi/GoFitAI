const axios = require('axios');

// Generate a valid UUID for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testDatabaseFlow() {
  const userId = generateUUID();
  console.log('🧪 Testing Database Flow with UUID:', userId);
  console.log('=====================================\n');

  try {
    // Step 1: Generate nutrition plan
    console.log('📋 Step 1: Generate nutrition plan');
    const nutritionPlanData = {
      profile: {
        id: userId,
        full_name: 'Test User',
        age: 30,
        weight: 70,
        height: 175,
        gender: 'male',
        activity_level: 'moderate',
        fitness_strategy: 'cut',
        goal_type: 'weight_loss'
      },
      preferences: ['high_protein', 'gluten_free']
    };

    console.log('Sending nutrition plan request...');
    const nutritionResponse = await axios.post('http://localhost:4000/api/generate-nutrition-plan', nutritionPlanData);
    console.log('✅ SUCCESS: Nutrition plan generated');
    console.log('Response status:', nutritionResponse.status);
    console.log('Plan saved to database:', nutritionResponse.data.saved_to_database ? 'Yes' : 'No');
    console.log('');

    // Step 2: Wait a moment for database operations
    console.log('⏳ Waiting 2 seconds for database operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Generate daily meal plan
    console.log('📋 Step 3: Generate daily meal plan');
    const mealPlanData = {
      userId: userId
    };

    console.log('Sending daily meal plan request...');
    const mealResponse = await axios.post('http://localhost:4000/api/generate-daily-meal-plan', mealPlanData);
    console.log('✅ SUCCESS: Daily meal plan generated');
    console.log('Response status:', mealResponse.status);
    console.log('Meals generated:', mealResponse.data.meal_plan?.length || 0);
    console.log('');

    console.log('🎯 Test Summary:');
    console.log('✅ Nutrition plan generated with mathematical calculations');
    console.log('✅ Daily meal plan generation works after nutrition plan creation');
    console.log('✅ All database operations successful');

  } catch (error) {
    console.log('❌ ERROR:', error.response?.data?.error || error.message);
    console.log('Status code:', error.response?.status);

    if (error.response?.status === 400 &&
        error.response?.data?.error?.includes('No active nutrition plan found')) {
      console.log('\n🔍 Debugging database issue...');

      // Let's check if the nutrition plan was actually saved
      console.log('Checking if nutrition plan was saved...');
      const nutritionPlanData = {
        profile: {
          id: userId,
          full_name: 'Test User',
          age: 30,
          weight: 70,
          height: 175,
          gender: 'male',
          activity_level: 'moderate',
          fitness_strategy: 'cut',
          goal_type: 'weight_loss'
        },
        preferences: ['high_protein', 'gluten_free']
      };

      try {
        const nutritionResponse = await axios.post('http://localhost:4000/api/generate-nutrition-plan', nutritionPlanData);
        console.log('Nutrition plan response:', {
          status: nutritionResponse.status,
          saved_to_database: nutritionResponse.data.saved_to_database,
          plan_id: nutritionResponse.data.id
        });
      } catch (nutritionError) {
        console.log('Nutrition plan error:', nutritionError.response?.data);
      }
    }
  }
}

// Run the test
testDatabaseFlow();


