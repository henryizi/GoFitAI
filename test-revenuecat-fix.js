#!/usr/bin/env node

/**
 * RevenueCat Test Script
 * This script tests the RevenueCat configuration and helps identify issues
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 RevenueCat Configuration Test');
console.log('================================');

// Check API Key
const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

console.log('\n📱 API Keys:');
console.log(`iOS API Key: ${iosApiKey ? iosApiKey.substring(0, 8) + '...' : 'NOT SET'}`);
console.log(`Android API Key: ${androidApiKey ? androidApiKey.substring(0, 8) + '...' : 'NOT SET'}`);

if (!iosApiKey) {
  console.log('❌ ERROR: iOS API Key is missing!');
  console.log('Please set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in your .env file');
  process.exit(1);
}

if (!iosApiKey.startsWith('appl_')) {
  console.log('❌ ERROR: iOS API Key should start with "appl_"');
  console.log('Please check your API key in the RevenueCat dashboard');
  process.exit(1);
}

console.log('✅ API Key format is correct');

// Check App Configuration
console.log('\n📱 App Configuration:');
console.log('Bundle ID: com.henrymadeit.gofitai');
console.log('Platform: iOS');

console.log('\n📦 Expected Product IDs:');
console.log('- gofitai_premium_monthly1');
console.log('- gofitai_premium_lifetime1');

console.log('\n🛠️  Next Steps:');
console.log('1. Go to RevenueCat Dashboard: https://app.revenuecat.com');
console.log('2. Find your app "GoFitAI"');
console.log('3. Go to Products tab and ensure you have:');
console.log('   - gofitai_premium_monthly1');
console.log('   - gofitai_premium_lifetime1');
console.log('4. Go to App Store Connect and ensure these products exist');
console.log('5. In RevenueCat, link the products to App Store Connect');
console.log('6. Make sure products are approved for testing (sandbox mode)');

console.log('\n🔧 For Development Testing:');
console.log('You can temporarily enable mock offerings in RevenueCatService.ts');
console.log('Set USE_MOCK_SERVICE = true in src/services/subscription/RevenueCatService.ts');

console.log('\n✅ Configuration test completed!');
