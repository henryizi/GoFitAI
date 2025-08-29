// Comprehensive Cloudflare Vision Service Diagnostic Tool
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class CloudflareVisionDiagnostic {
  constructor() {
    this.accountId = process.env.CF_ACCOUNT_ID;
    this.apiToken = process.env.CF_API_TOKEN;
    this.baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
    this.visionModels = [
      '@cf/llava-hf/llava-1.5-7b-hf',
      '@cf/meta/llama-3.2-90b-vision-instruct',
      '@cf/unum/uform-gen2-qwen-500m'
    ];
  }

  async runFullDiagnostic() {
    console.log('🔍 CLOUDFLARE VISION SERVICE DIAGNOSTIC');
    console.log('=' .repeat(50));

    // 1. Check credentials
    console.log('\n1. 🔐 CHECKING CREDENTIALS...');
    await this.checkCredentials();

    // 2. Test API connectivity
    console.log('\n2. 🌐 TESTING API CONNECTIVITY...');
    await this.testAPIConnectivity();

    // 3. Test each vision model
    console.log('\n3. 🤖 TESTING VISION MODELS...');
    await this.testVisionModels();

    // 4. Test production endpoint
    console.log('\n4. 🚀 TESTING PRODUCTION ENDPOINT...');
    await this.testProductionEndpoint();

    // 5. Provide recommendations
    console.log('\n5. 💡 RECOMMENDATIONS...');
    this.provideRecommendations();
  }

  async checkCredentials() {
    console.log(`CF_ACCOUNT_ID: ${this.accountId ? '✅ Configured' : '❌ Missing'}`);
    console.log(`CF_API_TOKEN: ${this.apiToken ? '✅ Configured' : '❌ Missing'}`);

    if (this.accountId && this.apiToken) {
      console.log('✅ Credentials are configured properly');
    } else {
      console.log('❌ Credentials are missing or incomplete');
    }
  }

  async testAPIConnectivity() {
    if (!this.accountId || !this.apiToken) {
      console.log('❌ Cannot test API connectivity - credentials missing');
      return;
    }

    try {
      // Test a simple API call to Cloudflare
      const response = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.success) {
        console.log('✅ API connectivity successful');
        console.log(`   Account: ${response.data.result.name || 'Unknown'}`);
      } else {
        console.log('❌ API connectivity failed - invalid credentials');
      }
    } catch (error) {
      console.log('❌ API connectivity failed:', error.response?.data?.errors?.[0]?.message || error.message);
    }
  }

  async testVisionModels() {
    if (!this.accountId || !this.apiToken) {
      console.log('❌ Cannot test vision models - credentials missing');
      return;
    }

    // Create a simple test image
    const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    for (const model of this.visionModels) {
      console.log(`\n   Testing model: ${model}`);

      try {
        const payload = {
          image: `data:image/png;base64,${testImage.toString('base64')}`,
          prompt: "Describe this image briefly."
        };

        const response = await axios.post(
          `${this.baseURL}/${model}`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );

        if (response.data.success) {
          console.log(`   ✅ ${model}: Available`);
        } else {
          console.log(`   ❌ ${model}: Error - ${response.data.errors?.[0]?.message || 'Unknown error'}`);
        }

      } catch (error) {
        const errorCode = error.response?.data?.errors?.[0]?.code;
        const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;

        if (errorCode === 7000) {
          console.log(`   ❌ ${model}: Model not available (Error 7000)`);
        } else if (errorCode === 9109) {
          console.log(`   ❌ ${model}: Model temporarily unavailable (Error 9109)`);
        } else {
          console.log(`   ❌ ${model}: Failed - ${errorMessage}`);
        }
      }
    }
  }

  async testProductionEndpoint() {
    try {
      // Test with a simple image
      const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

      const response = await axios.post('https://gofitai-production.up.railway.app/api/analyze-food', {
        image: `data:image/png;base64,${testImage.toString('base64')}`
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      });

      console.log('✅ Production endpoint reachable');

      if (response.data.success) {
        console.log('✅ Production endpoint responding successfully');
        console.log(`   Provider used: ${response.data.data?.message?.includes('Cloudflare') ? 'Cloudflare' : 'Fallback'}`);
      } else {
        console.log('❌ Production endpoint returned error');
      }

    } catch (error) {
      console.log('❌ Production endpoint failed:', error.response?.data?.error || error.message);
    }
  }

  provideRecommendations() {
    console.log('\nBased on the diagnostic results, here are recommendations:');

    if (!this.accountId || !this.apiToken) {
      console.log('• 🔐 Configure Cloudflare credentials:');
      console.log('  - Set CF_ACCOUNT_ID in Railway environment variables');
      console.log('  - Set CF_API_TOKEN in Railway environment variables');
      console.log('  - Ensure your Cloudflare account has Workers AI enabled');
    }

    console.log('• 📋 Check Cloudflare Workers AI availability:');
    console.log('  - Visit https://ai.cloudflare.com/ to verify your account');
    console.log('  - Ensure you have sufficient credits/quota');

    console.log('• 🔄 Redeploy after configuration:');
    console.log('  - Run: railway deploy');
    console.log('  - Verify FOOD_ANALYZE_PROVIDER=cloudflare is set');

    console.log('• 🧪 Test with real food images:');
    console.log('  - Use clear, well-lit photos of food');
    console.log('  - Ensure images are under 1MB in size');

    console.log('• 📞 If issues persist, contact Cloudflare support');
    console.log('  - Error 7000: Model not available for your account');
    console.log('  - Error 9109: Temporary model unavailability');
  }

  async testRealFoodImage() {
    console.log('\n🧪 TESTING WITH REAL FOOD IMAGE...');

    try {
      // Check if we have a test food image
      const testImagePath = path.join(__dirname, 'server', 'test-food-image.jpg');

      if (!fs.existsSync(testImagePath)) {
        console.log('❌ No test food image found');
        return;
      }

      const imageBuffer = fs.readFileSync(testImagePath);
      console.log(`📸 Testing with ${imageBuffer.length} byte food image`);

      const response = await axios.post('https://gofitai-production.up.railway.app/api/analyze-food', {
        image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data.success) {
        console.log('✅ Real food image analysis successful!');
        console.log('📊 Result:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('❌ Real food image analysis failed');
      }

    } catch (error) {
      console.log('❌ Real food image test failed:', error.message);
    }
  }
}

// Run diagnostic if called directly
if (require.main === module) {
  const diagnostic = new CloudflareVisionDiagnostic();

  diagnostic.runFullDiagnostic().then(() => {
    return diagnostic.testRealFoodImage();
  }).then(() => {
    console.log('\n🎉 Diagnostic completed!');
  }).catch((error) => {
    console.error('💥 Diagnostic failed:', error.message);
  });
}

module.exports = CloudflareVisionDiagnostic;