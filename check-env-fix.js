require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Environment Configuration...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
} else {
  console.log('❌ .env file not found');
}

console.log('\n📋 Current Environment Variables:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-2.5-flash');
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL || '❌ Missing');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

console.log('\n🔧 Issues Found:');
const issues = [];

if (!process.env.GEMINI_API_KEY) {
  issues.push('GEMINI_API_KEY is missing - this causes the "Invalid URL" error');
}

if (!process.env.EXPO_PUBLIC_API_URL) {
  issues.push('EXPO_PUBLIC_API_URL is missing - this breaks API communication');
}

if (issues.length === 0) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log('❌ Issues found:');
  issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log('\n🛠️  Fix Instructions:');
console.log('\n1. Set your Gemini API Key:');
console.log('   - Get your API key from: https://makersuite.google.com/app/apikey');
console.log('   - Set in Railway: railway variables set GEMINI_API_KEY="your_key_here"');
console.log('   - Set in local .env: GEMINI_API_KEY=your_key_here');

console.log('\n2. Set the API URL:');
console.log('   - Railway: railway variables set EXPO_PUBLIC_API_URL="https://gofitai-production.up.railway.app"');
console.log('   - Local .env: EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app');

console.log('\n3. Redeploy after setting variables:');
console.log('   - railway up --yes');

console.log('\n📝 Expected .env file contents:');
console.log(`GEMINI_API_KEY=AIzaSyYourActualGeminiKeyHere
GEMINI_MODEL=gemini-2.5-flash
EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app
SUPABASE_URL=${process.env.SUPABASE_URL || 'your_supabase_url'}
SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key'}
SUPABASE_SERVICE_KEY=${process.env.SUPABASE_SERVICE_KEY || 'your_supabase_service_key'}`);


