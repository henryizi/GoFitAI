#!/usr/bin/env node
/**
 * Diagnostic script to identify why AI workout generation is failing
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gofitai-production.up.railway.app';

console.log('🔍 DIAGNOSING AI WORKOUT GENERATION ISSUE\n');
console.log('═'.repeat(60));

// Check 1: Environment Variables
console.log('\n1️⃣ CHECKING ENVIRONMENT VARIABLES');
console.log('─'.repeat(60));
const geminiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
console.log('GEMINI_API_KEY:', geminiKey ? `✅ Set (${geminiKey.substring(0, 10)}...)` : '❌ NOT SET');
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL || process.env.EXPO_PUBLIC_GEMINI_MODEL || 'Not set (will use default)');
console.log('API_URL:', API_URL);

// Check 2: Server Health
console.log('\n2️⃣ CHECKING SERVER HEALTH');
console.log('─'.repeat(60));
async function checkServerHealth() {
  try {
    const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is responding');
    console.log('Status:', response.status);
    if (response.data) {
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.log('❌ Server health check failed');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
    }
  }
}

// Check 3: Test Workout Generation
console.log('\n3️⃣ TESTING WORKOUT GENERATION');
console.log('─'.repeat(60));
async function testWorkoutGeneration() {
  const testProfile = {
    full_name: 'Test User',
    gender: 'male',
    primary_goal: 'muscle_gain',
    workout_frequency: '4-5',
    training_level: 'intermediate',
    age: 30,
    weight_kg: 75,
    height_cm: 175
  };

  try {
    console.log('Sending test request to:', `${API_URL}/api/generate-workout-plan`);
    console.log('Test profile:', JSON.stringify(testProfile, null, 2));
    
    const response = await axios.post(
      `${API_URL}/api/generate-workout-plan`,
      testProfile,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000 // 3 minutes
      }
    );

    console.log('\n✅ Request completed');
    console.log('Status:', response.status);
    
    if (response.data) {
      console.log('\nResponse data:');
      console.log('Success:', response.data.success);
      console.log('Provider:', response.data.provider);
      console.log('Used AI:', response.data.used_ai);
      
      if (response.data.system_info) {
        console.log('\nSystem Info:');
        console.log('AI Available:', response.data.system_info.ai_available);
        console.log('Fallback Used:', response.data.system_info.fallback_used);
        console.log('Fallback Reason:', response.data.system_info.fallback_reason);
      }
      
      if (response.data.workoutPlan) {
        console.log('\nWorkout Plan:');
        console.log('Plan Name:', response.data.workoutPlan.plan_name || response.data.workoutPlan.name);
        console.log('Weekly Schedule Length:', response.data.workoutPlan.weekly_schedule?.length || response.data.workoutPlan.weeklySchedule?.length || 0);
      }
      
      if (response.data.note) {
        console.log('\n⚠️ Note:', response.data.note);
      }
      
      if (!response.data.used_ai) {
        console.log('\n❌ ISSUE DETECTED: AI was not used!');
        console.log('This means the system fell back to rule-based generation.');
        console.log('Possible causes:');
        console.log('  - GEMINI_API_KEY not set on server');
        console.log('  - API key is invalid or expired');
        console.log('  - API quota exceeded');
        console.log('  - Network/timeout issues');
        console.log('  - Gemini service error');
      }
    }
  } catch (error) {
    console.log('\n❌ Request failed');
    console.log('Error:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received');
      console.log('Request config:', error.config?.url);
    }
    
    console.log('\nPossible issues:');
    console.log('  - Server is down or unreachable');
    console.log('  - Network connectivity issues');
    console.log('  - Request timeout (check server logs)');
  }
}

// Run diagnostics
async function runDiagnostics() {
  await checkServerHealth();
  await testWorkoutGeneration();
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📋 NEXT STEPS:');
  console.log('1. If GEMINI_API_KEY is not set, add it to your Railway environment variables');
  console.log('2. Check Railway server logs for detailed error messages');
  console.log('3. Verify the API key is valid at https://aistudio.google.com/');
  console.log('4. Check if you\'ve exceeded API quota limits');
  console.log('\nTo check Railway logs:');
  console.log('  railway logs --tail');
  console.log('\nTo set Railway environment variable:');
  console.log('  railway variables --set GEMINI_API_KEY=your_key_here');
}

runDiagnostics().catch(console.error);









