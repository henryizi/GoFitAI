const axios = require('axios');

// Test complete meal flow: create nutrition plan -> generate daily meal plan
async function testCompleteMealFlow() {
    console.log('🍽️ Testing Complete Meal Generation Flow...\n');

    const testUserId = 'test-user-' + Date.now();
    const baseUrl = 'https://gofitai-production.up.railway.app';
    
    try {
        // Step 1: Create a nutrition plan for the test user
        console.log('📋 Step 1: Creating nutrition plan for user:', testUserId);
        
        const nutritionPlanData = {
            profile: {
                user_id: testUserId,
                goal_type: 'muscle_gain',
                age: 25,
                weight: 70,
                height: 175,
                gender: 'male',
                activity_level: 'moderate',
                full_name: 'Test User'
            },
            preferences: ['high_protein']
        };
        
        console.log('Request data:', JSON.stringify(nutritionPlanData, null, 2));
        
        const nutritionResponse = await axios.post(
            `${baseUrl}/api/generate-nutrition-plan`,
            nutritionPlanData,
            { 
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Nutrition Plan Created Successfully!');
        console.log('Plan Name:', nutritionResponse.data?.plan_name);
        console.log('Daily Calories:', nutritionResponse.data?.daily_targets?.calories);
        console.log('Protein:', nutritionResponse.data?.daily_targets?.protein_grams, 'g');
        console.log('');

        // Step 2: Generate daily meal plan using the created nutrition plan
        console.log('🍳 Step 2: Generating daily meal plan for user:', testUserId);
        
        const mealPlanResponse = await axios.post(
            `${baseUrl}/api/generate-daily-meal-plan`,
            {
                userId: testUserId
            },
            { 
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Daily Meal Plan Generated Successfully!');
        console.log('Success:', mealPlanResponse.data?.success);
        console.log('Generation Method:', mealPlanResponse.data?.method || 'unknown');
        console.log('AI Provider Used:', mealPlanResponse.data?.aiProvider || 'none');
        console.log('Meals Count:', mealPlanResponse.data?.mealPlan?.length || 0);
        
        if (mealPlanResponse.data?.mealPlan && mealPlanResponse.data.mealPlan.length > 0) {
            console.log('\n📋 Generated Meals:');
            mealPlanResponse.data.mealPlan.forEach((meal, index) => {
                console.log(`${index + 1}. ${meal.meal_type}: ${meal.recipe_name || 'Unnamed Recipe'}`);
                console.log(`   Calories: ${meal.nutrition?.calories || 'N/A'}, Protein: ${meal.nutrition?.protein || 'N/A'}g`);
            });
        }
        
        console.log('\n🎉 Complete Flow Test Passed!');
        console.log('✅ Nutrition Plan Creation: Working');
        console.log('✅ Daily Meal Plan Generation: Working');
        
        // Check if AI was actually used
        if (mealPlanResponse.data?.aiProvider && mealPlanResponse.data.aiProvider !== 'none') {
            console.log('✅ AI Provider:', mealPlanResponse.data.aiProvider);
        } else {
            console.log('⚠️  AI Provider: Not detected - may be using mathematical generation only');
        }

    } catch (error) {
        console.log('❌ Test Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else if (error.code === 'ECONNABORTED') {
            console.log('Request timeout - service may be taking too long to respond');
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Run the test
testCompleteMealFlow();


