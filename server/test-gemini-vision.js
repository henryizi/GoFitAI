require('dotenv').config();
const GeminiVisionService = require('./services/geminiVisionService');
const fs = require('fs');

async function testGeminiVisionService() {
  console.log('🧪 Testing Gemini Vision Service...\n');

  try {
    const service = new GeminiVisionService(process.env.GEMINI_API_KEY);
    console.log('✅ Service initialized successfully');

    const imageBuffer = fs.readFileSync('./test-food-image.jpg');
    console.log('✅ Test image loaded, size:', imageBuffer.length, 'bytes');

    console.log('\n🔍 Service health check:', JSON.stringify(service.getHealthStatus(), null, 2));

    console.log('\n📸 Testing image analysis...');
    console.log('🔄 This may take a moment...\n');

    // Test the actual analysis function
    const result = await service.analyzeFoodImage(imageBuffer, 'image/jpeg');

    console.log('✅ Analysis completed successfully!');
    console.log('📝 Result type:', typeof result);
    console.log('📝 Result length:', result.length, 'characters');
    console.log('\n📝 Full Result:');
    console.log('─'.repeat(50));
    console.log(result);
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testGeminiVisionService();
