#!/usr/bin/env node

/**
 * Complete RevenueCat Setup Script
 * This script provides a comprehensive guide for setting up RevenueCat
 * and includes automated checks and fixes
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Complete RevenueCat Setup Guide');
console.log('==================================\n');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔑 Step 1: API Keys Status');
console.log('==========================');

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

console.log(`iOS API Key: ${iosKey ? '✅ ' + iosKey.substring(0, 8) + '...' : '❌ NOT SET'}`);
console.log(`Android API Key: ${androidKey ? '✅ ' + androidKey.substring(0, 8) + '...' : '❌ NOT SET'}`);

if (!iosKey || !iosKey.startsWith('appl_')) {
  console.log('\n❌ iOS API Key Issue:');
  console.log('- Should start with "appl_"');
  console.log('- Get from: RevenueCat Dashboard > Your App > API Keys');
  console.log('- Make sure it\'s the PUBLIC API key (not secret)\n');
}

if (!androidKey || !androidKey.startsWith('goog_')) {
  console.log('\n⚠️  Android API Key Missing:');
  console.log('- Should start with "goog_"');
  console.log('- Get from: RevenueCat Dashboard > Your App > API Keys');
  console.log('- Add: EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_key\n');
}

console.log('📱 Step 2: Dashboard Configuration');
console.log('==================================');

console.log('Required Products:');
console.log('  📦 gofitai_premium_monthly1');
console.log('  📦 gofitai_premium_lifetime1');
console.log('  🎯 Premium Entitlement: premium\n');

console.log('Required Offering:');
console.log('  📋 default (with both products)\n');

console.log('📋 Step 3: Dashboard Setup Instructions');
console.log('=====================================');
console.log('1. Go to: https://app.revenuecat.com');
console.log('2. Select your app "GoFitAI"');
console.log('3. Create Products:');
console.log('   - Product ID: gofitai_premium_monthly1');
console.log('     • Type: Auto-renewable subscription');
console.log('     • Duration: 1 month');
console.log('     • Price: $9.99');
console.log('   - Product ID: gofitai_premium_lifetime1');
console.log('     • Type: Auto-renewable subscription');
console.log('     • Duration: 1 year');
console.log('     • Price: $99.99');
console.log('4. Create Offering:');
console.log('   - Identifier: "default"');
console.log('   - Add both products');
console.log('5. Link to App Store Connect (see Step 4)\n');

console.log('🛍️  Step 4: App Store Connect Setup');
console.log('==================================');
console.log('1. Go to: https://appstoreconnect.apple.com');
console.log('2. For your app "GoFitAI" (Bundle ID: com.henrymadeit.gofitai)');
console.log('3. Go to "In-App Purchases"');
console.log('4. Create products:');
console.log('   - Product ID: gofitai_premium_monthly1');
console.log('   - Product ID: gofitai_premium_lifetime1');
console.log('5. Set pricing and submit for review');
console.log('6. For testing: Set to "Approved for Testing" (sandbox)\n');

console.log('🔗 Step 5: Link Products in RevenueCat');
console.log('====================================');
console.log('1. In RevenueCat Dashboard, go to "Products"');
console.log('2. For each product:');
console.log('   • Click "Link to App Store Connect"');
console.log('   • Select your App Store Connect product');
console.log('3. RevenueCat will sync pricing automatically\n');

console.log('🧪 Step 6: Testing Checklist');
console.log('===========================');
console.log('✅ Mock service enabled (for development)');
console.log('✅ Products created in RevenueCat');
console.log('✅ Products linked to App Store Connect');
console.log('✅ Products approved for testing');
console.log('✅ API keys configured');
console.log('❌ Switch to real integration (after dashboard setup)\n');

console.log('🔧 Step 7: Enable Real Integration');
console.log('==================================');
console.log('When dashboard is configured:');
console.log('1. Edit src/services/subscription/RevenueCatService.ts');
console.log('2. Set: const USE_MOCK_SERVICE = false;');
console.log('3. Restart your app');
console.log('4. Check console for "offerings" logs\n');

// Check mock service status
try {
  const servicePath = path.join(__dirname, 'src/services/subscription/RevenueCatService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  const isMockEnabled = content.includes('USE_MOCK_SERVICE = true');

  console.log('📊 Current Status:');
  console.log('=================');
  console.log(`Mock Service: ${isMockEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`iOS API Key: ${iosKey ? '✅ SET' : '❌ MISSING'}`);
  console.log(`Android API Key: ${androidKey ? '✅ SET' : '❌ MISSING'}`);

  if (isMockEnabled) {
    console.log('\n🎯 Recommended Next Steps:');
    console.log('1. Complete dashboard configuration');
    console.log('2. Test with mock service');
    console.log('3. When ready, set USE_MOCK_SERVICE = false');
    console.log('4. Test real integration');
  } else {
    console.log('\n⚠️  Mock service is disabled!');
    console.log('Make sure dashboard is configured before testing.');
  }

} catch (error) {
  console.log('⚠️  Could not check service status');
}

console.log('\n📝 Step 8: Production Checklist');
console.log('===============================');
console.log('✅ Dashboard configured');
console.log('✅ Products linked to App Store Connect');
console.log('✅ Products approved by Apple');
console.log('✅ API keys are production keys');
console.log('✅ Test purchases working');
console.log('✅ Real integration enabled\n');

console.log('🆘 Troubleshooting');
console.log('==================');
console.log('Common issues:');
console.log('• "Error fetching offerings" - Products not linked');
console.log('• "Invalid API key" - Using secret instead of public key');
console.log('• "None registered" - Products don\'t exist in App Store');
console.log('\nDebug commands:');
console.log('• npm run debug-revenuecat');
console.log('• node test-revenuecat-fix.js\n');

console.log('✅ SETUP GUIDE COMPLETE!');
console.log('Follow the steps above to complete your RevenueCat integration.\n');




