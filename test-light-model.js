// Test lighter Gemini models to avoid quota issues
require('dotenv').config();
const axios = require('axios');

async function testLightModel() {
  console.log('🧪 Testing lighter Gemini models...\n');
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.slice(-4));
  
  // Try lighter/different models that might have separate quotas
  const modelsToTry = [
    'models/gemini-flash-lite-latest',  // Lightest current model
    'models/gemini-2.0-flash-lite',     // Light version
    'models/gemini-2.5-flash-lite',     // New light model
    'models/gemma-3-1b-it',             // Small Gemma model
    'models/gemini-2.0-flash-lite-001', // Specific version
  ];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`\n🧪 Testing: ${modelName}`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
      const data = {
        contents: [{
          parts: [{ text: "Hello! Respond with just: SUCCESS" }]
        }]
      };
      
      const response = await axios.post(url, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      console.log('✅ SUCCESS!', modelName);
      console.log('Response text:', response.data.candidates?.[0]?.content?.parts?.[0]?.text);
      
      // If successful, test with a workout generation prompt
      console.log('\n🏋️ Testing workout generation...');
      await testWorkoutGeneration(modelName, apiKey);
      
      return modelName; // Return first working model
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('❌ Quota exceeded for', modelName);
      } else if (error.response?.status === 404) {
        console.log('❌ Model not found:', modelName);
      } else {
        console.log('❌ Error:', error.message);
      }
    }
  }
  
  console.log('\n❌ All light models failed. Quota limits affect entire API key.');
  console.log('\n💡 Solutions:');
  console.log('1. Wait for quota reset (daily/monthly)');
  console.log('2. Upgrade to paid plan');
  console.log('3. Use your excellent enhanced fallback system');
  console.log('4. Deploy server to VPN region permanently');
}

async function testWorkoutGeneration(modelName, apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
    const data = {
      contents: [{
        parts: [{ 
          text: `Create a simple workout plan for muscle gain. Include 3 exercises with sets and reps.` 
        }]
      }]
    };
    
    const response = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    
    const workoutText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('✅ Workout generation successful!');
    console.log('Sample output:', workoutText.substring(0, 200) + '...');
    
  } catch (error) {
    console.log('❌ Workout generation failed:', error.message);
  }
}

if (require.main === module) {
  testLightModel().catch(console.error);
}

module.exports = { testLightModel };
