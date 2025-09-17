const axios = require('axios');

// Test actual meal plan generation endpoint that the app uses
async function testActualMealPlanGeneration() {
    console.log('🍽️ Testing Actual Daily Meal Plan Generation...\n');

    // Test the actual endpoint the app uses
    try {
        console.log('📡 Testing deployed service daily meal plan generation...');
        const response = await axios.post(
            'https://gofitai-production.up.railway.app/api/generate-daily-meal-plan',
            {
                userId: 'test-user-123'
            },
            { 
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Daily Meal Plan Response:');
        console.log('Success:', response.data?.success);
        console.log('Meals generated:', response.data?.mealPlan?.length || 0);
        if (response.data?.mealPlan && response.data.mealPlan.length > 0) {
            console.log('First meal:', response.data.mealPlan[0]?.recipe_name || 'No name');
            console.log('Generation method:', response.data?.method || 'unknown');
            console.log('Meal types:', response.data.mealPlan.map(m => m.meal_type).join(', '));
        }
        console.log('');
        
    } catch (error) {
        console.log('❌ Daily Meal Plan Test Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
        console.log('');
    }

    // Test the health endpoint to see what providers are available
    try {
        console.log('📡 Testing health endpoint...');
        const response = await axios.get(
            'https://gofitai-production.up.railway.app/api/health',
            { timeout: 10000 }
        );
        
        console.log('✅ Health Response:');
        console.log('Services:', response.data?.services || 'none');
        console.log('AI Providers:', response.data?.aiProviders || 'none');
        console.log('');
        
    } catch (error) {
        console.log('❌ Health Test Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Run the test
testActualMealPlanGeneration();


