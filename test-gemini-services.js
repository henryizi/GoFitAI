const axios = require('axios');

// Railway deployment URL
const BASE_URL = 'https://gofitai-production.up.railway.app';

async function testGeminiServices() {
    console.log('🧪 Testing Gemini-Powered Services...\n');

    try {
        // Test health check first
        console.log('📡 Testing health check...');
        const healthResponse = await axios.get(`${BASE_URL}/api/health`, { timeout: 10000 });
        console.log('✅ Health check passed:', JSON.stringify(healthResponse.data, null, 2));
        console.log('');

        // Test Recipe Generation
        console.log('🍳 Testing recipe generation...');
        console.log('📤 Sending request to:', `${BASE_URL}/api/generate-recipe`);
        
        const recipeData = {
            mealType: "dinner",
            targets: {
                calories: 500,
                protein: 35,
                carbs: 45,
                fat: 18
            },
            ingredients: [
                "chicken breast",
                "broccoli",
                "brown rice",
                "olive oil"
            ],
            strict: false
        };
        
        console.log('Request data:', JSON.stringify(recipeData, null, 2));
        
        const recipeResponse = await axios.post(
            `${BASE_URL}/api/generate-recipe`,
            recipeData,
            { 
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Recipe Generation Success!');
        console.log('Provider:', recipeResponse.data.provider);
        console.log('Recipe Name:', recipeResponse.data.recipe?.recipe_name);
        console.log('Ingredients Count:', recipeResponse.data.recipe?.ingredients?.length);
        console.log('Instructions Count:', recipeResponse.data.recipe?.instructions?.length);
        console.log('Nutrition:', recipeResponse.data.recipe?.nutrition);
        console.log('');

        // Test Workout Plan Generation
        console.log('💪 Testing workout plan generation...');
        console.log('📤 Sending request to:', `${BASE_URL}/api/generate-workout-plan`);
        
        const workoutData = {
            userProfile: {
                fitnessLevel: "intermediate",
                primaryGoal: "muscle_gain", // Use the correct field name
                age: 25,
                workoutFrequency: "2_3", // Use the correct format for 2-3 times per week
                equipment: "Full gym access",
                experience: "2 years"
            },
            preferences: {
                workoutTypes: ["strength_training", "compound_movements"],
                daysPerWeek: 3, // Match the workoutFrequency
                sessionDuration: 60,
                focusAreas: ["chest", "back", "legs"],
                limitations: "None"
            }
        };
        
        console.log('Request data:', JSON.stringify(workoutData, null, 2));
        
        const workoutResponse = await axios.post(
            `${BASE_URL}/api/generate-workout-plan`,
            workoutData,
            { 
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Workout Plan Generation Success!');
        console.log('Provider:', workoutResponse.data.provider);
        console.log('Plan Name:', workoutResponse.data.workoutPlan?.plan_name);
        console.log('Duration:', workoutResponse.data.workoutPlan?.duration_weeks, 'weeks');
        console.log('Sessions per week:', workoutResponse.data.workoutPlan?.sessions_per_week);
        console.log('Weekly schedule length:', workoutResponse.data.workoutPlan?.weekly_schedule?.length);
        console.log('Equipment needed:', workoutResponse.data.workoutPlan?.equipment_needed);
        console.log('');

        // Summary
        console.log('🎉 All Gemini Services Tests Passed!');
        console.log('✅ Health Check: Working');
        console.log('✅ Recipe Generation: Working (Provider:', recipeResponse.data.provider + ')');
        console.log('✅ Workout Plan Generation: Working (Provider:', workoutResponse.data.provider + ')');

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
testGeminiServices();








