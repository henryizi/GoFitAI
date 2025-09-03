const axios = require('axios');

// Railway deployment URL
const BASE_URL = 'https://gofitai-production.up.railway.app';

async function testRecipeGeneration() {
    console.log('🧪 Testing Deployed Recipe Generation...\n');

    try {
        // Test 1: Health check
        console.log('📡 Testing health check...');
        const healthResponse = await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Health check passed:', healthResponse.data);
        console.log('');

        // Test 2: Recipe generation
        console.log('🍳 Testing recipe generation...');
        const recipeData = {
            mealType: 'dinner',
            targets: {
                calories: 500,
                protein: 35,
                carbs: 45,
                fat: 18
            },
            ingredients: [
                'chicken breast',
                'broccoli',
                'brown rice',
                'olive oil'
            ],
            strict: false
        };

        console.log('📤 Sending request to:', `${BASE_URL}/api/generate-recipe`);
        console.log('Request data:', JSON.stringify(recipeData, null, 2));

        const recipeResponse = await axios.post(`${BASE_URL}/api/generate-recipe`, recipeData, {
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Recipe generation successful!');
        console.log('Response status:', recipeResponse.status);
        console.log('Generated recipe:');
        console.log(JSON.stringify(recipeResponse.data, null, 2));

    } catch (error) {
        console.log('❌ Test Failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
        } else if (error.request) {
            console.log('No response received:', error.message);
        } else {
            console.log('Request setup error:', error.message);
        }
    }
}

testRecipeGeneration();
