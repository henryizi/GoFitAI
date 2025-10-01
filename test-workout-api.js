#!/usr/bin/env node

/**
 * Test script to check Railway workout plan API
 */

const https = require('https');

const API_URL = 'https://gofitai-production.up.railway.app/api/generate-workout-plan';

const testProfile = {
  profile: {
    full_name: "Test User",
    gender: "male",
    age: 30,
    training_level: "intermediate",
    primary_goal: "muscle_gain",
    workout_frequency: "4_5",
    height_cm: 180,
    weight_kg: 80
  }
};

console.log('🚀 Testing Railway Workout API...');
console.log('URL:', API_URL);
console.log('Profile:', JSON.stringify(testProfile, null, 2));
console.log('\n⏳ Sending request (max 120s timeout)...\n');

const startTime = Date.now();

const data = JSON.stringify(testProfile);

const url = new URL(API_URL);
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'User-Agent': 'NodeJS-Test/1.0'
  },
  timeout: 120000 // 120 second timeout
};

const req = https.request(options, (res) => {
  const elapsedMs = Date.now() - startTime;
  console.log(`📡 Response Status: ${res.statusCode} (${elapsedMs}ms)`);
  console.log('Response Headers:', res.headers);
  console.log('');

  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    const totalMs = Date.now() - startTime;
    console.log(`✅ Response received (${totalMs}ms total)`);
    console.log('');
    
    try {
      const parsed = JSON.parse(body);
      console.log('📊 Parsed Response:');
      console.log('  Success:', parsed.success);
      console.log('  Provider:', parsed.provider);
      console.log('  Used AI:', parsed.used_ai);
      console.log('  Has Workout Plan:', !!parsed.workoutPlan);
      
      if (parsed.workoutPlan) {
        console.log('  Plan Name:', parsed.workoutPlan.name);
        console.log('  Weekly Schedule Length:', parsed.workoutPlan.weeklySchedule?.length || 0);
        console.log('  Training Level:', parsed.workoutPlan.training_level);
      }
      
      if (parsed.note) {
        console.log('  Note:', parsed.note);
      }
      
      if (parsed.system_info) {
        console.log('  System Info:', JSON.stringify(parsed.system_info, null, 2));
      }
      
      console.log('');
      console.log('🎉 Test completed successfully!');
      
      if (!parsed.used_ai) {
        console.log('\n⚠️  WARNING: API is using FALLBACK (rule-based) instead of AI!');
        console.log('   This might indicate:');
        console.log('   - Gemini API key not configured on Railway');
        console.log('   - Gemini API quota exceeded');
        console.log('   - Gemini service initialization failed');
      }
      
    } catch (error) {
      console.error('❌ Failed to parse JSON response:');
      console.error('Body preview:', body.substring(0, 500));
      console.error('Parse error:', error.message);
    }
  });
});

req.on('error', (error) => {
  const elapsedMs = Date.now() - startTime;
  console.error(`❌ Request failed after ${elapsedMs}ms:`, error.message);
  process.exit(1);
});

req.on('timeout', () => {
  const elapsedMs = Date.now() - startTime;
  console.error(`⏱️  Request timed out after ${elapsedMs}ms`);
  req.destroy();
  process.exit(1);
});

req.write(data);
req.end();


