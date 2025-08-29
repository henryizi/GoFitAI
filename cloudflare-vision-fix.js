// Quick Cloudflare Vision Fix
const axios = require('axios');

class CloudflareVisionFix {
  async runQuickTest() {
    console.log('🧪 TESTING CLOUDFLARE VISION STATUS...');

    try {
      const response = await axios.post('https://gofitai-production.up.railway.app/api/analyze-food', {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      console.log('📊 Current Status:');
      console.log(JSON.stringify(response.data, null, 2));

      if (response.data.data?.message?.includes('Cloudflare')) {
        console.log('✅ Cloudflare vision is working!');
      } else if (response.data.data?.message?.includes('fallback')) {
        console.log('⚠️  Using fallback analysis (Cloudflare account needs setup)');
      } else {
        console.log('❓ Unable to determine current provider');
      }

      return response.data;
    } catch (error) {
      console.log('❌ Test failed:', error.message);
      return null;
    }
  }

  async checkEnvironmentVariables() {
    console.log('🔍 CHECKING ENVIRONMENT VARIABLES...');

    const { execSync } = require('child_process');

    try {
      console.log('Current FOOD_ANALYZE_PROVIDER:');
      execSync('railway variables | grep FOOD_ANALYZE_PROVIDER', { stdio: 'inherit' });
    } catch (error) {
      console.log('❌ Could not check FOOD_ANALYZE_PROVIDER');
    }

    try {
      console.log('Current CF_ACCOUNT_ID:');
      execSync('railway variables | grep CF_ACCOUNT_ID', { stdio: 'inherit' });
    } catch (error) {
      console.log('❌ Could not check CF_ACCOUNT_ID');
    }
  }

  async applyQuickFix() {
    console.log('🔧 APPLYING QUICK CLOUDFLARE FIX...');

    const { execSync } = require('child_process');

    try {
      // Ensure Cloudflare is set as the provider
      console.log('Setting FOOD_ANALYZE_PROVIDER to cloudflare...');
      execSync('railway variables --set "FOOD_ANALYZE_PROVIDER=cloudflare"', { stdio: 'inherit' });

      // Ensure fallback is enabled
      console.log('Setting VISION_FALLBACK_ENABLED to true...');
      execSync('railway variables --set "VISION_FALLBACK_ENABLED=true"', { stdio: 'inherit' });

      console.log('✅ Environment variables updated');

      // Trigger redeploy
      console.log('🚀 Triggering redeploy...');
      execSync('railway deploy', { stdio: 'inherit' });

      console.log('✅ Redeploy triggered');

    } catch (error) {
      console.log('❌ Fix application failed:', error.message);
    }
  }

  provideInstructions() {
    console.log('\n📋 CLOUDFLARE VISION SETUP INSTRUCTIONS:');
    console.log('=' .repeat(50));
    console.log('');
    console.log('1. 🌐 Visit https://ai.cloudflare.com/');
    console.log('2. 🔐 Sign in with your Cloudflare account');
    console.log('3. 💳 Verify you have Workers AI enabled');
    console.log('4. 💰 Check your account has sufficient credits');
    console.log('');
    console.log('5. 🚀 If account is ready, run:');
    console.log('   node cloudflare-vision-fix.js apply-fix');
    console.log('');
    console.log('6. 🧪 Test with:');
    console.log('   node cloudflare-vision-fix.js test');
    console.log('');
    console.log('7. 📱 Test in your mobile app with real food photos');
    console.log('');
    console.log('✅ The system will automatically fallback if Cloudflare is unavailable!');
  }
}

// Command line interface
if (require.main === module) {
  const fixer = new CloudflareVisionFix();
  const command = process.argv[2];

  switch (command) {
    case 'test':
      fixer.runQuickTest();
      break;
    case 'check-env':
      fixer.checkEnvironmentVariables();
      break;
    case 'apply-fix':
      fixer.applyQuickFix();
      break;
    default:
      console.log('Usage:');
      console.log('  node cloudflare-vision-fix.js test          - Test current status');
      console.log('  node cloudflare-vision-fix.js check-env     - Check environment variables');
      console.log('  node cloudflare-vision-fix.js apply-fix     - Apply fixes and redeploy');
      console.log('  node cloudflare-vision-fix.js instructions  - Show setup instructions');
      console.log('');
      fixer.provideInstructions();
      break;
  }
}

module.exports = CloudflareVisionFix;
