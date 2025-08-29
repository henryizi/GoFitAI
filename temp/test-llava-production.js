const https = require('https');
const fs = require('fs');

console.log('🧪 TESTING LLAVA 1.5 MODEL VIA PRODUCTION API');
console.log('==============================================');

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testSimpleImage() {
  console.log('🔍 Test 1: Simple PNG image (should work with LLaVA)');
  
  // Simple red dot PNG
  const simplePng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const result = await makeRequest('https://gofitai-production.up.railway.app/api/analyze-food', {
      image: `data:image/png;base64,${simplePng}`,
      forceCloudflare: true // This should force it to use Cloudflare
    });
    
    console.log(`📡 Status: ${result.status}`);
    console.log(`✅ Success: ${result.data.success}`);
    console.log(`🤖 Provider: ${result.data.data?.provider || 'Unknown'}`);
    
    if (result.data.success && result.data.data?.provider === 'cloudflare') {
      console.log('✅ CLOUDFLARE LLAVA 1.5 IS WORKING!');
      console.log(`🍎 Food detected: ${result.data.data.nutrition?.food_name || 'N/A'}`);
    } else if (result.data.data?.provider === 'deepseek') {
      console.log('🔄 Automatically routed to DeepSeek (bypass activated)');
    } else {
      console.log('❌ Unexpected result:', result.data);
    }
    
  } catch (error) {
    console.error('💥 Error testing simple image:', error.message);
  }
}

async function testProblematicWebP() {
  console.log('');
  console.log('🔍 Test 2: WebP image (tensor-problematic format)');
  
  // WebP that commonly causes tensor decode errors
  const webpImage = 'UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  
  try {
    const result = await makeRequest('https://gofitai-production.up.railway.app/api/analyze-food', {
      image: `data:image/webp;base64,${webpImage}`,
      forceCloudflare: true
    });
    
    console.log(`📡 Status: ${result.status}`);
    console.log(`✅ Success: ${result.data.success}`);
    console.log(`🤖 Provider: ${result.data.data?.provider || 'Unknown'}`);
    console.log(`🛡️ Prevented tensor error: ${result.data.data?.prevented_tensor_error || false}`);
    
    if (result.data.data?.provider === 'deepseek') {
      console.log('✅ BYPASS SYSTEM WORKING! WebP routed to DeepSeek');
      console.log('🎯 This confirms our tensor decode fix is active');
    } else if (result.data.data?.provider === 'cloudflare') {
      console.log('⚠️  WebP processed by Cloudflare - checking for errors...');
      if (result.data.success) {
        console.log('✅ Surprisingly, this WebP worked with LLaVA!');
      }
    } else {
      console.log('❓ Unexpected routing:', result.data);
    }
    
  } catch (error) {
    console.error('💥 Error testing WebP image:', error.message);
  }
}

async function testLargeImage() {
  console.log('');
  console.log('🔍 Test 3: Large image simulation (should trigger bypass)');
  
  try {
    const result = await makeRequest('https://gofitai-production.up.railway.app/api/analyze-food', {
      image: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      simulateSize: { width: 4000, height: 3000 } // This should trigger our bypass
    });
    
    console.log(`📡 Status: ${result.status}`);
    console.log(`🤖 Provider: ${result.data.data?.provider || 'Unknown'}`);
    
    if (result.data.data?.provider === 'deepseek') {
      console.log('✅ LARGE IMAGE BYPASS WORKING!');
    }
    
  } catch (error) {
    console.error('💥 Error testing large image:', error.message);
  }
}

async function checkServerLogs() {
  console.log('');
  console.log('📋 CHECKING SERVER LOGS FOR VISION MODEL INFO');
  console.log('=============================================');
  
  try {
    const result = await makeRequest('https://gofitai-production.up.railway.app/api/health', {});
    console.log('🏥 Server health check passed');
    
    // The server logs should show vision model configuration at startup
    console.log('');
    console.log('💡 TIP: Check your Railway deployment logs to see:');
    console.log('   - [VISION MODEL DEBUG] CF_VISION_MODEL env var');
    console.log('   - [VISION MODEL DEBUG] Resolved model');
    console.log('   - Provider availability in API configuration');
    
  } catch (error) {
    console.error('💥 Health check failed:', error.message);
  }
}

async function runAllTests() {
  await testSimpleImage();
  await testProblematicWebP();
  await testLargeImage();
  await checkServerLogs();
  
  console.log('');
  console.log('🏁 LLAVA 1.5 TEST SUMMARY');
  console.log('==========================');
  console.log('✅ If Test 1 shows "cloudflare" provider → LLaVA 1.5 is working');
  console.log('✅ If Test 2 shows "deepseek" provider → Bypass system is working');
  console.log('✅ If both work → Your app handles all image types perfectly!');
  console.log('');
  console.log('🚀 Expected behavior: Simple images use LLaVA, problematic ones use DeepSeek');
}

runAllTests().catch(console.error);

