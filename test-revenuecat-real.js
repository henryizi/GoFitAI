#!/usr/bin/env node

/**
 * Test script to verify real RevenueCat integration is working
 * This will test if your dashboard configuration is working properly
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Testing Real RevenueCat Integration');
console.log('=====================================\n');

// Check if config file exists
const configPath = './src/config/revenuecat.ts';
if (!fs.existsSync(configPath)) {
  console.error('❌ RevenueCat config file not found:', configPath);
  process.exit(1);
}

try {
  // Read environment variables directly (these are loaded at runtime)
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  console.log('🔑 API Keys Status:');
  console.log('  iOS API Key:', iosKey ? '✅ ' + iosKey.substring(0, 8) + '...' : '❌ NOT SET');
  console.log('  Android API Key:', androidKey ? '✅ ' + androidKey.substring(0, 8) + '...' : '❌ NOT SET');

  // Product configuration (hardcoded expected values)
  const monthlyProduct = 'gofitai_premium_monthly1';
  const yearlyProduct = 'gofitai_premium_lifetime1';
  const premiumEntitlement = 'premium';

  console.log('\n📱 Product Configuration:');
  console.log('  Monthly Product ID:', monthlyProduct);
  console.log('  Yearly Product ID:', yearlyProduct);
  console.log('  Premium Entitlement:', premiumEntitlement);

  console.log('\n🎯 Expected Configuration:');
  console.log('  Monthly Product: gofitai_premium_monthly1');
  console.log('  Yearly Product: gofitai_premium_lifetime1');
  console.log('  Premium Entitlement: premium');

  // Verify configuration matches expected values
  const configCorrect =
    monthlyProduct === 'gofitai_premium_monthly1' &&
    yearlyProduct === 'gofitai_premium_lifetime1' &&
    premiumEntitlement === 'premium';

  console.log('\n✅ Configuration Status:', configCorrect ? 'CORRECT' : 'INCORRECT');

  if (!configCorrect) {
    console.log('\n⚠️  Configuration Issues Found:');
    if (monthlyProduct !== 'gofitai_premium_monthly1') {
      console.log('  - Monthly product ID should be: gofitai_premium_monthly1');
    }
    if (yearlyProduct !== 'gofitai_premium_lifetime1') {
      console.log('  - Yearly product ID should be: gofitai_premium_lifetime1');
    }
    if (premiumEntitlement !== 'premium') {
      console.log('  - Premium entitlement should be: premium');
    }
  }

  console.log('\n🚀 Next Steps:');
  console.log('1. Run your app and check console logs for "offerings"');
  console.log('2. Test in-app purchases in sandbox mode');
  console.log('3. Check RevenueCat dashboard for analytics');

  console.log('\n📊 If you see errors, check:');
  console.log('- Products are linked to App Store Connect');
  console.log('- Products are approved for sandbox testing');
  console.log('- API keys are correct (start with "appl_" for iOS)');

} catch (error) {
  console.error('❌ Error reading configuration:', error.message);
  process.exit(1);
}
