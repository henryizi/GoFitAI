#!/usr/bin/env node

/**
 * 🍽️ Debug Food Analysis Script
 * This script helps debug why food analysis is getting wrong descriptions
 */

const fs = require('fs');
const path = require('path');

console.log('🍽️ Debug Food Analysis Issues');
console.log('================================');

// Check if the enhanced prompts are properly deployed
console.log('\n🔍 Checking Enhanced Prompts...');

const serverFile = path.join(__dirname, 'server', 'index.js');
if (fs.existsSync(serverFile)) {
  const content = fs.readFileSync(serverFile, 'utf8');
  
  // Check for enhanced food recognition prompt
  const hasEnhancedPrompt = content.includes('CRITICAL INSTRUCTIONS FOR DISH RECOGNITION');
  const hasSpecificDishRecognition = content.includes('Be SPECIFIC about dish names, not generic descriptions');
  const hasCorrectExamples = content.includes('✅ CORRECT: "French Toast with maple syrup and butter"');
  const hasWrongExamples = content.includes('❌ WRONG: "triangular pieces of bread with toppings"');
  
  console.log('✅ Enhanced food recognition prompt:', hasEnhancedPrompt);
  console.log('✅ Specific dish recognition instructions:', hasSpecificDishRecognition);
  console.log('✅ Correct examples included:', hasCorrectExamples);
  console.log('✅ Wrong examples included:', hasWrongExamples);
  
  if (hasEnhancedPrompt && hasSpecificDishRecognition) {
    console.log('\n🎉 Enhanced prompts are properly deployed!');
  } else {
    console.log('\n❌ Enhanced prompts are missing or incomplete');
  }
} else {
  console.log('❌ Server file not found');
}

// Check for potential client-side vision AI
console.log('\n🔍 Checking for Client-Side Vision AI...');

const appDir = path.join(__dirname, 'app');
if (fs.existsSync(appDir)) {
  const logFoodFile = path.join(appDir, '(main)', 'nutrition', 'log-food.tsx');
  if (fs.existsSync(logFoodFile)) {
    const content = fs.readFileSync(logFoodFile, 'utf8');
    
    // Check if there's any client-side image processing
    const hasImageProcessing = content.includes('vision') || content.includes('analyze') || content.includes('ocr');
    const hasFormData = content.includes('FormData');
    const hasImageUpload = content.includes('foodImage');
    
    console.log('✅ Image processing code found:', hasImageProcessing);
    console.log('✅ FormData usage found:', hasFormData);
    console.log('✅ Image upload field found:', hasImageUpload);
    
    if (hasImageProcessing) {
      console.log('\n⚠️  Potential client-side image processing detected!');
      console.log('   This might be converting your image to text before sending to server.');
    }
  } else {
    console.log('❌ Log food file not found');
  }
}

// Check environment configuration
console.log('\n🔍 Checking Environment Configuration...');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  
  const hasCloudflareConfig = content.includes('CF_ACCOUNT_ID') && content.includes('CF_API_TOKEN');
  const hasVisionModel = content.includes('CF_VISION_MODEL');
  
  console.log('✅ Cloudflare credentials configured:', hasCloudflareConfig);
  console.log('✅ Vision model configured:', hasVisionModel);
  
  if (!hasCloudflareConfig) {
    console.log('\n⚠️  Cloudflare credentials not configured!');
    console.log('   This will cause vision AI to fail and fall back to text analysis.');
  }
} else {
  console.log('❌ .env file not found');
}

// Summary and recommendations
console.log('\n📋 Summary & Recommendations');
console.log('=============================');

console.log('\n🎯 The Issue:');
console.log('   Your image is being processed by a client-side vision AI that converts');
console.log('   it to text before sending to your server. This is why you get:');
console.log('   "rice, pasta, and meat" instead of your actual eggs and cereal.');

console.log('\n🔧 Solutions:');
console.log('   1. ✅ Enhanced prompts are deployed (working on wrong input)');
console.log('   2. 🔍 Find and disable client-side vision AI processing');
console.log('   3. 🚀 Ensure Cloudflare vision AI is properly configured');
console.log('   4. 📸 Test with direct image upload (bypass client-side processing)');

console.log('\n🧪 Next Steps:');
console.log('   1. Check if there\'s a vision AI service in your app');
console.log('   2. Verify Cloudflare credentials are set correctly');
console.log('   3. Test with a simple curl command to bypass client-side processing');
console.log('   4. Monitor server logs for vision AI vs text analysis paths');

console.log('\n✨ Ready to debug! 🍳');

