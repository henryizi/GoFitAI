// Load environment variables first
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🔍 Testing Gemini API and discovering available models...\n');
  
  // Try to get API key from multiple sources
  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
                 process.env.GOOGLE_AI_API_KEY ||
                 process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No Gemini API key found. Please set one of:');
    console.error('   - GEMINI_API_KEY');
    console.error('   - EXPO_PUBLIC_GEMINI_API_KEY');
    console.error('   - GOOGLE_AI_API_KEY');
    console.error('   - GOOGLE_GENERATIVE_AI_API_KEY\n');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.slice(-4));
  console.log('📝 Key length:', apiKey.length, 'characters\n');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test 1: List available models
  console.log('📋 Attempting to list available models...');
  try {
    const models = await genAI.listModels();
    console.log('✅ Successfully retrieved models list!\n');
    
    console.log('🎯 Available models:');
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName || 'N/A'}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log('');
    });
    
    // Extract just model names for easy testing
    const modelNames = models.map(m => m.name);
    console.log('🏷️  Model names for testing:');
    modelNames.forEach(name => console.log(`   - ${name}`));
    console.log('');
    
    // Test 2: Try generating content with different models
    const testModels = [
      'models/gemini-pro',
      'models/gemini-1.5-pro', 
      'models/gemini-1.5-flash',
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];
    
    console.log('🧪 Testing content generation with different model names...\n');
    
    for (const modelName of testModels) {
      console.log(`Testing: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "Hello" in JSON format: {"message": "Hello"}');
        const response = await result.response;
        const text = response.text();
        console.log(`✅ SUCCESS: ${modelName}`);
        console.log(`   Response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        console.log('');
        break; // Stop on first success
      } catch (error) {
        console.log(`❌ FAILED: ${modelName}`);
        console.log(`   Error: ${error.message.substring(0, 150)}${error.message.length > 150 ? '...' : ''}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to list models:', error.message);
    console.log('\n🔧 Attempting basic API test instead...\n');
    
    // Fallback: Test basic API functionality
    const testModels = [
      'models/gemini-pro',
      'models/gemini-1.5-pro', 
      'models/gemini-1.5-flash',
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];
    
    for (const modelName of testModels) {
      console.log(`Testing: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        console.log(`✅ SUCCESS: ${modelName}`);
        break;
      } catch (error) {
        console.log(`❌ FAILED: ${modelName} - ${error.message.substring(0, 100)}...`);
      }
    }
  }
}

// Export for use in other scripts
module.exports = { testGeminiAPI };

// Run if called directly
if (require.main === module) {
  testGeminiAPI().catch(console.error);
}
