// Test script to verify Cloudflare vision service for food analysis
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const VisionService = require('./server/services/visionService');

// Test the Cloudflare vision service with a food image
async function testCloudflareFoodAnalysis() {
  console.log('🍽️  TESTING CLOUDFLARE FOOD ANALYSIS...');

  try {
    // Initialize the vision service
    const visionService = new VisionService();

    // Check if we have a test image
    const testImagePath = path.join(__dirname, 'server', 'test_image.png');

    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      console.log('📸 Creating a simple test image...');

      // Create a simple test image (you can replace this with actual food image)
      const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(testImagePath, testImageBuffer);
      console.log('✅ Test image created');
    }

    // Read and convert test image to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('📸 Test image loaded, size:', imageBuffer.length, 'bytes');
    console.log('🔄 Analyzing food image with Cloudflare...');

    // Test the food analysis
    const result = await visionService.analyzeFoodImage(base64Image);

    console.log('✅ Cloudflare food analysis successful!');
    console.log('📊 Analysis Result:', JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    console.error('❌ Cloudflare food analysis failed:', error.message);
    console.error('🔍 Error details:', error);

    // Check if it's a configuration issue
    if (error.message.includes('Cloudflare API token or Account ID not found')) {
      console.log('⚠️  Cloudflare credentials not configured locally (this is expected in production)');
      console.log('🚀 Testing production endpoint instead...');

      // Test the production endpoint
      await testProductionEndpoint();
    }

    throw error;
  }
}

// Test the production food analysis endpoint
async function testProductionEndpoint() {
  console.log('🌐 TESTING PRODUCTION FOOD ANALYSIS ENDPOINT...');

  try {
    // Create a simple test image
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const base64Image = testImageBuffer.toString('base64');

    const response = await axios.post('https://gofitai-production.up.railway.app/api/analyze-food', {
      image: `data:image/png;base64,${base64Image}`,
      imageDescription: 'A simple test image'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Production endpoint successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));

    return response.data;

  } catch (error) {
    console.error('❌ Production endpoint failed:', error.message);
    if (error.response) {
      console.error('🔍 Response status:', error.response.status);
      console.error('🔍 Response data:', error.response.data);
    }
    throw error;
  }
}

// Run the test
async function runTest() {
  try {
    await testCloudflareFoodAnalysis();
  } catch (error) {
    console.log('🔄 Local test failed, trying production test...');
    try {
      await testProductionEndpoint();
    } catch (prodError) {
      console.error('❌ Both local and production tests failed');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  runTest().then(() => {
    console.log('🎉 Test completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testCloudflareFoodAnalysis, testProductionEndpoint };
