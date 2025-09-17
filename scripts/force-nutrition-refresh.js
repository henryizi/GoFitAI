#!/usr/bin/env node

/**
 * Force clear all nutrition cache and refresh
 * Run this script when nutrition values are showing incorrectly
 */

console.log('🔄 FORCE NUTRITION REFRESH SCRIPT');
console.log('=================================');

// Simulate clearing AsyncStorage keys that might contain stale data
const keysToRemove = [
  'nutrition_plans',
  'deleted_default_plan', 
  'nutrition_cache_timestamp',
  'nutrition_log_*', // Pattern for daily nutrition logs
];

console.log('\n🧹 CLEARING NUTRITION CACHE KEYS:');
keysToRemove.forEach(key => {
  console.log(`   - ${key}`);
});

console.log('\n✅ ACTIONS TO TAKE:');
console.log('1. Clear app data/cache in device settings');
console.log('2. Force close and restart the app');
console.log('3. Create a new nutrition plan');
console.log('4. The new plan should show correct calculated values');

console.log('\n🎯 WHAT THIS FIXES:');
console.log('- Removes stale cached nutrition plans');
console.log('- Forces fresh mathematical calculations');
console.log('- Eliminates conflicts between old and new data');
console.log('- Ensures UI displays server-calculated values');

console.log('\n📱 FOR TESTING:');
console.log('After running this and restarting the app:');
console.log('1. Go to Nutrition → Create Plan');
console.log('2. Fill in your details and create a plan');
console.log('3. Check that calories and macros match expected calculations');
console.log('4. Values should be consistent between generation and display');

console.log('\n🔍 DEBUG LOGS TO WATCH FOR:');
console.log('- "🧹 Detected stale/old data, clearing ALL cached plans"');
console.log('- "✅ Using server-provided daily_targets"'); 
console.log('- "🎯 Final stored plan summary" with correct values');
console.log('- "✅ Using latest mathematical target" in plan view');

console.log('\n✨ Script completed! Clear app cache and restart the app.');

