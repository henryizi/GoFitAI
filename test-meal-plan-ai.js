const axios = require('axios');

// Test meal plan generation
async function testMealPlanGeneration() {
    console.log('🍽️ Testing Meal Plan Generation...\n');

    // Test deployed service first
    try {
        console.log('📡 Testing deployed service meal plan generation...');
        const response = await axios.post(
            'https://gofitai-production.up.railway.app/api/test-ai-meal-generation',
            {
                targets: {
                    daily_calories: 2000,
                    protein_grams: 150,
                    carbs_grams: 200,
                    fat_grams: 70
                },
                dietaryPreferences: []
            },
            { 
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Deployed Service Response:');
        console.log('Meals generated:', response.data?.length || 0);
        if (response.data && response.data.length > 0) {
            console.log('First meal:', response.data[0]?.recipe_name || 'No name');
            console.log('Meal types:', response.data.map(m => m.meal_type).join(', '));
        }
        console.log('');
        
    } catch (error) {
        console.log('❌ Deployed Service Test Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
        console.log('');
    }

    // Test local service if running
    try {
        console.log('📡 Testing local service meal plan generation...');
        const response = await axios.post(
            'http://localhost:3001/api/test-ai-meal-generation',
            {
                targets: {
                    daily_calories: 2000,
                    protein_grams: 150,
                    carbs_grams: 200,
                    fat_grams: 70
                },
                dietaryPreferences: []
            },
            { 
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Local Service Response:');
        console.log('Meals generated:', response.data?.length || 0);
        if (response.data && response.data.length > 0) {
            console.log('First meal:', response.data[0]?.recipe_name || 'No name');
            console.log('Meal types:', response.data.map(m => m.meal_type).join(', '));
        }
        console.log('');
        
    } catch (error) {
        console.log('❌ Local Service Test Failed (server may not be running):');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Run the test
testMealPlanGeneration();


