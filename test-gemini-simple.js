// Load environment variables first
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🧪 Simple Gemini API Test\n');
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.slice(-4));
  console.log('📝 Key length:', apiKey.length, 'characters\n');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test with a simple model list that should work
  const testModels = [
    'gemini-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest', 
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'models/gemini-pro',
    'models/gemini-1.5-pro-latest',
    'models/gemini-1.5-flash-latest'
  ];
  
  console.log('🧪 Testing models with simple "Hello" prompt...\n');
  
  for (const modelName of testModels) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const prompt = "Say hello in exactly this JSON format: {\"message\": \"Hello\"}";
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ SUCCESS: ${modelName}`);
      console.log(`   Response: ${text.substring(0, 200)}`);
      console.log('');
      
      // Found a working model, let's test it with a workout prompt
      console.log('🏋️ Testing workout generation with working model...\n');
      const workoutPrompt = `Create a simple JSON workout plan:
{
  "plan_name": "Test Plan",
  "exercises": [
    {"name": "Push-ups", "sets": 3, "reps": "10"}
  ]
}`;
      
      const workoutResult = await model.generateContent(workoutPrompt);
      const workoutResponse = await workoutResult.response;
      const workoutText = workoutResponse.text();
      
      console.log('🏋️ Workout generation test:');
      console.log(workoutText.substring(0, 500));
      console.log('\n🎉 WORKING MODEL FOUND:', modelName);
      return modelName; // Return the working model
      
    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`❌ FAILED: ${modelName} - Model not found (404)`);
      } else if (error.message.includes('503')) {
        console.log(`❌ FAILED: ${modelName} - Service unavailable (503)`);
      } else if (error.message.includes('403')) {
        console.log(`❌ FAILED: ${modelName} - Access denied (403) - API key may not have access`);
      } else {
        console.log(`❌ FAILED: ${modelName} - ${error.message.substring(0, 100)}`);
      }
    }
  }
  
  console.log('\n💡 Possible issues:');
  console.log('1. API key may not have access to these models (free tier limitations)');
  console.log('2. Regional restrictions (some models not available in your region)');
  console.log('3. Model names may have changed');
  console.log('4. API quota may be exceeded');
  
  // Let's try to manually test the API endpoint
  console.log('\n🔍 Trying manual HTTP request...');
  try {
    const axios = require('axios');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const data = {
      contents: [{
        parts: [{ text: "Hello" }]
      }]
    };
    
    const response = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ Manual HTTP request successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2).substring(0, 500));
    
  } catch (httpError) {
    console.log('❌ Manual HTTP request failed:', httpError.message);
    if (httpError.response) {
      console.log('Status:', httpError.response.status);
      console.log('Error data:', JSON.stringify(httpError.response.data, null, 2));
    }
  }
}

if (require.main === module) {
  testGeminiAPI().catch(console.error);
}

module.exports = { testGeminiAPI };
