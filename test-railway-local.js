const axios = require('axios');

// Test the Railway version locally first
async function testRailwayLocal() {
    console.log('🚂 Testing Railway Version Locally...\n');

    // Test basic health
    try {
        console.log('📡 Testing health endpoint...');
        const response = await axios.get('http://localhost:4000/api/health', { timeout: 5000 });
        
        console.log('✅ Health Response:');
        console.log('Status:', response.status);
        console.log('Message:', response.data?.message);
        console.log('');
        
    } catch (error) {
        console.log('❌ Health Test Failed - Server may not be running locally');
        console.log('Error:', error.message);
        console.log('Starting with deployed test instead...\n');
    }

    // Test deployed meal plan generation
    try {
        console.log('📡 Testing deployed meal plan generation...');
        const response = await axios.post(
            'https://gofitai-production.up.railway.app/api/generate-daily-meal-plan',
            {
                userId: 'test-user-' + Date.now()
            },
            { 
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Meal Plan Generation Response:');
        console.log('Success:', response.data?.success);
        console.log('Method:', response.data?.method);
        console.log('AI Provider:', response.data?.aiProvider);
        console.log('Meals Count:', response.data?.mealPlan?.length || 0);
        console.log('Message:', response.data?.message);
        
        if (response.data?.mealPlan && response.data.mealPlan.length > 0) {
            console.log('\n📋 Generated Meals:');
            response.data.mealPlan.forEach((meal, index) => {
                console.log(`${index + 1}. ${meal.meal_type}: ${meal.recipe_name || 'Unnamed Recipe'}`);
                console.log(`   Calories: ${meal.nutrition?.calories || meal.macros?.calories || 'N/A'}`);
            });
        }
        
        console.log('\n🎉 Test Completed Successfully!');
        
        // Check if AI was used
        if (response.data?.aiProvider === 'gemini') {
            console.log('✅ Gemini AI is working!');
        } else if (response.data?.method === 'mathematical') {
            console.log('⚠️  Using mathematical fallback - AI may not be configured');
        }
        
    } catch (error) {
        console.log('❌ Deployed Test Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else if (error.code === 'ECONNABORTED') {
            console.log('Request timeout - service may be processing');
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Run the test
testRailwayLocal();


