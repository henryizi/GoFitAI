const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🤖 Testing All AI-Related Functions');
console.log('===================================');
console.log('');

// Environment check
console.log('📋 Environment Configuration:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- FOOD_ANALYZE_PROVIDER:', process.env.FOOD_ANALYZE_PROVIDER || 'gemini (default)');
console.log('- AI_PROVIDER:', process.env.AI_PROVIDER || 'gemini (default)');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('');

// Test 1: Basic Gemini API connectivity
async function testGeminiAPI() {
    console.log('🔍 Test 1: Gemini API Connectivity');
    console.log('----------------------------------');
    
    if (!process.env.GEMINI_API_KEY) {
        console.log('❌ No GEMINI_API_KEY found');
        return false;
    }
    
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    role: 'user',
                    parts: [{ text: 'Hello' }]
                }]
            },
            {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('✅ Gemini API is working');
        return true;
    } catch (error) {
        console.log('❌ Gemini API error:', error.response?.status, error.response?.data?.error?.message || error.message);
        return false;
    }
}

// Test 2: Food analysis with text description
async function testFoodAnalysis() {
    console.log('');
    console.log('🍎 Test 2: Food Analysis (Text Description)');
    console.log('-------------------------------------------');
    
    try {
        const response = await axios.post('http://localhost:4000/api/analyze-food', {
            imageDescription: 'apple'
        }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Food analysis successful');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Food analysis failed:', error.response?.status, error.response?.data?.error || error.message);
        return false;
    }
}

// Test 3: AI chat functionality
async function testAIChat() {
    console.log('');
    console.log('💬 Test 3: AI Chat Functionality');
    console.log('--------------------------------');
    
    try {
        const response = await axios.post('http://localhost:4000/api/chat', {
            message: 'Hello, how are you?',
            userId: 'test-user-123'
        }, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ AI chat successful');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ AI chat failed:', error.response?.status, error.response?.data?.error || error.message);
        return false;
    }
}

// Test 4: Workout plan generation
async function testWorkoutPlan() {
    console.log('');
    console.log('💪 Test 4: Workout Plan Generation');
    console.log('----------------------------------');
    
    try {
        const response = await axios.post('http://localhost:4000/api/generate-workout-plan', {
            userId: 'test-user-123',
            preferences: {
                fitnessLevel: 'beginner',
                goals: ['weight_loss'],
                availableTime: 30,
                equipment: ['none']
            }
        }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Workout plan generation successful');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Workout plan generation failed:', error.response?.status, error.response?.data?.error || error.message);
        return false;
    }
}

// Test 5: Meal plan generation
async function testMealPlan() {
    console.log('');
    console.log('🍽️  Test 5: Meal Plan Generation');
    console.log('--------------------------------');
    
    try {
        const response = await axios.post('http://localhost:4000/api/generate-meal-plan', {
            userId: 'test-user-123',
            preferences: {
                dietaryRestrictions: [],
                calorieGoal: 2000,
                mealsPerDay: 3
            }
        }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Meal plan generation successful');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Meal plan generation failed:', error.response?.status, error.response?.data?.error || error.message);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    const results = {
        geminiAPI: await testGeminiAPI(),
        foodAnalysis: await testFoodAnalysis(),
        aiChat: await testAIChat(),
        workoutPlan: await testWorkoutPlan(),
        mealPlan: await testMealPlan()
    };
    
    console.log('');
    console.log('📊 Test Results Summary');
    console.log('=======================');
    console.log(`✅ Gemini API: ${results.geminiAPI ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Food Analysis: ${results.foodAnalysis ? 'PASS' : 'FAIL'}`);
    console.log(`✅ AI Chat: ${results.aiChat ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Workout Plan: ${results.workoutPlan ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Meal Plan: ${results.mealPlan ? 'PASS' : 'FAIL'}`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log('');
    console.log(`🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All AI functions are working correctly!');
    } else {
        console.log('⚠️  Some AI functions need attention');
        console.log('');
        console.log('🔧 Next Steps:');
        console.log('1. Get a valid Gemini API key from: https://makersuite.google.com/app/apikey');
        console.log('2. Update Railway environment variables');
        console.log('3. Redeploy to Railway');
    }
}

// Run tests
runAllTests().catch(console.error);

