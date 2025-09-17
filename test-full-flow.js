const axios = require('axios');

async function testFullFlow() {
  console.log('🧪 Testing Full Flow with Existing User');
  console.log('=======================================');

  try {
    // Use an existing user ID from the test endpoint
    const userId = '2b7ea2b7-b739-47f1-b389-aba682ac8c5f';
    console.log(`📋 Testing daily meal plan generation for user: ${userId}`);

    // Test daily meal plan generation
    console.log('\n🍽️  Generating daily meal plan...');
    const dailyMealPlanResponse = await axios.post('http://localhost:4000/api/generate-daily-meal-plan', {
      userId: userId
    });

    console.log('✅ Daily meal plan generated successfully!');
    console.log('📊 Plan details:');
    console.log('- Total meals:', dailyMealPlanResponse.data.meals?.length || 0);
    console.log('- Total calories:', dailyMealPlanResponse.data.totalCalories || 'N/A');
    console.log('- Total protein:', dailyMealPlanResponse.data.totalProtein || 'N/A');

    if (dailyMealPlanResponse.data.meals && dailyMealPlanResponse.data.meals.length > 0) {
      console.log('\n🍽️  Sample meals:');
      dailyMealPlanResponse.data.meals.slice(0, 2).forEach((meal, index) => {
        console.log(`  ${index + 1}. ${meal.name || meal.description || 'Unnamed meal'}`);
      });
    }

    console.log('\n✅ SUCCESS: Full flow test completed successfully!');
    console.log('The Supabase configuration is working correctly.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status code:', error.response.status);
    }
  }
}

testFullFlow();


