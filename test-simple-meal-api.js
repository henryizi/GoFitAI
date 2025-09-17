const axios = require('axios');

// Test just the direct AI meal generation endpoint (bypasses database)
async function testSimpleMealAPI() {
    console.log('🤖 Testing Direct AI Meal Generation API...\n');

    const baseUrl = 'https://gofitai-production.up.railway.app';
    
    // Test with simple targets that should be easy for AI to handle
    const testTargets = {
        daily_calories: 2000,
        protein_grams: 150,
        carbs_grams: 200,
        fat_grams: 70
    };
    
    const testPreferences = ['high_protein'];
    
    try {
        console.log('📡 Testing direct AI meal generation endpoint...');
        console.log('Target Calories:', testTargets.daily_calories);
        console.log('Target Protein:', testTargets.protein_grams, 'g');
        console.log('Preferences:', testPreferences.join(', '));
        console.log('');
        
        const response = await axios.post(
            `${baseUrl}/api/test-ai-meal-generation`,
            {
                targets: testTargets,
                dietaryPreferences: testPreferences
            },
            { 
                timeout: 30000, // Shorter timeout
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Direct AI Meal Generation Response:');
        
        if (Array.isArray(response.data)) {
            console.log('Meals Count:', response.data.length);
            console.log('');
            
            response.data.forEach((meal, index) => {
                console.log(`${index + 1}. ${meal.meal_type}: ${meal.recipe_name || 'Unnamed Recipe'}`);
                console.log(`   Calories: ${meal.macros?.calories || 'N/A'}, Protein: ${meal.macros?.protein || 'N/A'}g`);
                console.log(`   Prep: ${meal.prep_time || 'N/A'} min, Cook: ${meal.cook_time || 'N/A'} min`);
                console.log('');
            });
            
            console.log('🎉 Direct AI Test Passed!');
            
            // Check if this looks like AI-generated content vs mathematical
            const firstMeal = response.data[0];
            if (firstMeal && firstMeal.recipe_name && firstMeal.recipe_name.length > 10) {
                console.log('✅ Appears to be AI-generated (creative recipe names)');
            } else {
                console.log('⚠️  Appears to be mathematical generation (simple names)');
            }
        } else {
            console.log('Unexpected response format:', typeof response.data);
            console.log('Response:', JSON.stringify(response.data, null, 2));
        }
        
    } catch (error) {
        console.log('❌ Direct AI Test Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else if (error.code === 'ECONNABORTED') {
            console.log('Request timeout - service taking too long');
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Run the test
testSimpleMealAPI();


