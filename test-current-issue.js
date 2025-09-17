// Test to reproduce the current network issues
const axios = require('axios');

async function testRecipeGeneration() {
  try {
    console.log('🧪 Testing recipe generation endpoint...');
    
    const testData = {
      mealType: 'breakfast',
      targets: {
        calories: 400,
        protein: 25,
        carbs: 30,
        fat: 15
      },
      ingredients: ['eggs', 'bread', 'avocado'],
      strict: false
    };
    
    console.log('📤 Sending request to server...');
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    const startTime = Date.now();
    
    const response = await axios.post('http://192.168.0.116:4000/api/generate-recipe', testData, {
      timeout: 120000, // 2 minute timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    
    console.log('✅ Request completed');
    console.log(`⏱️ Total time: ${endTime - startTime}ms`);
    console.log('📈 Status:', response.status);
    console.log('📝 Recipe:', response.data.recipe?.name || response.data.recipe?.recipe_name || 'No recipe name');
    console.log('🔢 Nutrition:', response.data.recipe?.nutrition);
    console.log('✨ AI Generated:', !response.data.fallback); // fallback=true means AI failed, so AI generated = !fallback
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    } else if (error.request) {
      console.error('🌐 Network error - no response received');
      console.error('Request details:', error.request);
    } else {
      console.error('⚙️ Request setup error:', error.message);
    }
    
    console.error('🔍 Error details:', {
      code: error.code,
      timeout: error.code === 'ECONNABORTED',
      network: error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED'
    });
    
    throw error;
  }
}

async function testMultipleRequests() {
  console.log('🚀 Testing multiple recipe generation requests...\n');
  
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`\n=== Test ${i}/3 ===`);
      await testRecipeGeneration();
      console.log(`✅ Test ${i} completed successfully\n`);
    } catch (error) {
      console.error(`❌ Test ${i} failed:`, error.message);
      console.log(`⏭️ Continuing to next test...\n`);
    }
  }
}

testMultipleRequests().catch(console.error);
