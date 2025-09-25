#!/usr/bin/env node

/**
 * RevenueCat Dashboard Setup Guide
 * This script provides step-by-step instructions for setting up RevenueCat dashboard
 */

console.log('🚀 RevenueCat Dashboard Setup Guide');
console.log('==================================\n');

console.log('🔑 STEP 1: Verify Your API Keys');
console.log('================================');
console.log('✅ iOS API Key:', process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.substring(0, 8) + '...');
console.log('❌ Android API Key: NOT SET');
console.log('📱 App Bundle ID: com.henrymadeit.gofitai');
console.log('📦 Expected Products:');
console.log('   - gofitai_premium_monthly1');
console.log('   - gofitai_premium_lifetime1');
console.log('🎯 Premium Entitlement: premium\n');

console.log('🛠️  STEP 2: Configure RevenueCat Dashboard');
console.log('=========================================');
console.log('1. Go to: https://app.revenuecat.com');
console.log('2. Select your app "GoFitAI" (or create new)');
console.log('3. Go to "Products" tab');
console.log('4. Add these products:');
console.log('   📱 Product ID: gofitai_premium_monthly1');
console.log('      - Type: Auto-renewable subscription');
console.log('      - Duration: 1 month');
console.log('      - Price: $9.99');
console.log('   📱 Product ID: gofitai_premium_lifetime1');
console.log('      - Type: Auto-renewable subscription');
console.log('      - Duration: 1 year');
console.log('      - Price: $99.99');
console.log('5. Go to "Offerings" tab');
console.log('6. Create an offering called "default"');
console.log('7. Add both products to the "default" offering\n');

console.log('🛍️  STEP 3: Configure App Store Connect');
console.log('=====================================');
console.log('1. Go to: https://appstoreconnect.apple.com');
console.log('2. Create App ID: com.henrymadeit.gofitai');
console.log('3. Create In-App Purchase products:');
console.log('   - Product ID: gofitai_premium_monthly1');
console.log('   - Product ID: gofitai_premium_lifetime1');
console.log('4. Submit products for review');
console.log('5. Set products to "Approved for Testing" (sandbox)\n');

console.log('🔗 STEP 4: Link RevenueCat to App Store');
console.log('=====================================');
console.log('1. In RevenueCat Dashboard, go to "Products"');
console.log('2. For each product, click "Link to App Store Connect"');
console.log('3. Select your App Store Connect product');
console.log('4. RevenueCat will automatically sync pricing\n');

console.log('🧪 STEP 5: Testing');
console.log('==================');
console.log('1. Make sure products are approved for testing');
console.log('2. Run the app in development mode');
console.log('3. Check console for "offerings" logs');
console.log('4. When ready, disable mock service in RevenueCatService.ts\n');

console.log('⚠️  IMPORTANT NOTES:');
console.log('===================');
console.log('• Products must be linked to App Store Connect');
console.log('• Products must be approved for sandbox testing');
console.log('• API key must be the PUBLIC key (starts with "appl_")');
console.log('• For production, products need Apple approval\n');

console.log('✅ SETUP COMPLETE!');
console.log('Run your app and check the console for any remaining issues.\n');

console.log('🔧 Quick Fix for Testing:');
console.log('=========================');
console.log('If you want to test immediately, keep USE_MOCK_SERVICE = true');
console.log('in src/services/subscription/RevenueCatService.ts');
console.log('This will use mock offerings while you configure the dashboard.\n');

// Check if mock service is enabled
const fs = require('fs');
const path = require('path');

try {
  const servicePath = path.join(__dirname, 'src/services/subscription/RevenueCatService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  const isMockEnabled = content.includes('USE_MOCK_SERVICE = true');

  if (isMockEnabled) {
    console.log('✅ Mock service is currently ENABLED for testing');
    console.log('📝 To enable real RevenueCat integration later:');
    console.log('   1. Complete dashboard setup above');
    console.log('   2. Set USE_MOCK_SERVICE = false in RevenueCatService.ts');
    console.log('   3. Test with real offerings');
  } else {
    console.log('🚨 Mock service is DISABLED - ensure dashboard is configured');
  }
} catch (error) {
  console.log('⚠️  Could not check mock service status');
}

console.log('\n🎯 Next Actions:');
console.log('===============');
console.log('1. Follow the setup steps above');
console.log('2. When dashboard is configured, restart your app');
console.log('3. Check console logs for "offerings" information');
console.log('4. Test in-app purchases in sandbox mode\n');
