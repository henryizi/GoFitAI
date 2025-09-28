// Load environment variables
require('dotenv').config();

const axios = require('axios');

async function listAvailableModels() {
  console.log('📋 Fetching available Gemini models...\n');
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.slice(-4));
  
  try {
    // Call the ListModels API as suggested by the error message
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    console.log('🔍 Calling ListModels API...');
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Successfully retrieved models!\n');
    
    const models = response.data.models || [];
    
    if (models.length === 0) {
      console.log('⚠️ No models found in the response');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      return;
    }
    
    console.log(`📋 Found ${models.length} available models:\n`);
    
    const generateModels = [];
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName || 'N/A'}`);
      console.log(`   Version: ${model.version || 'N/A'}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      
      // Check if it supports generateContent
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        generateModels.push(model.name);
        console.log(`   ✅ Supports generateContent`);
      } else {
        console.log(`   ❌ Does not support generateContent`);
      }
      console.log('');
    });
    
    console.log('🎯 Models that support generateContent:');
    generateModels.forEach(name => {
      console.log(`   - ${name}`);
    });
    
    if (generateModels.length > 0) {
      console.log('\n🧪 Testing the first available model...');
      await testModel(generateModels[0], apiKey);
    } else {
      console.log('\n❌ No models support generateContent with this API key');
    }
    
    return generateModels;
    
  } catch (error) {
    console.error('❌ Failed to list models:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // If ListModels fails, the API key might not have the right permissions
    console.log('\n💡 This suggests:');
    console.log('1. API key may be for a different Google service');
    console.log('2. API key may not have Generative AI API enabled');
    console.log('3. API key may have quota/billing issues');
    console.log('4. Regional restrictions may apply');
  }
}

async function testModel(modelName, apiKey) {
  try {
    console.log(`Testing model: ${modelName}`);
    
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
    const data = {
      contents: [{
        parts: [{ text: "Hello! Please respond with: {\"status\": \"working\"}" }]
      }]
    };
    
    const response = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ Model test successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
    return modelName;
    
  } catch (error) {
    console.log('❌ Model test failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

if (require.main === module) {
  listAvailableModels().catch(console.error);
}

module.exports = { listAvailableModels, testModel };
