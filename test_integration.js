#!/usr/bin/env node

/**
 * Integration Test for GoFitAI
 * Tests the complete flow from frontend API calls to backend responses
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:4000';

async function testWorkoutPlanGeneration() {
  console.log('🏋️ Testing Workout Plan Generation...');
  
  const testProfile = {
    full_name: "Integration Test User",
    age: 28,
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    training_level: "intermediate",
    primary_goal: "muscle_gain",
    workout_frequency: "3_4"
  };

  try {
    const response = await fetch(`${API_BASE}/api/generate-workout-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'GoFitAI-Test/1.0',
      },
      body: JSON.stringify({ profile: testProfile })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Workout Plan Generation Success!');
    console.log(`   Plan Name: ${data.plan?.plan_name || 'N/A'}`);
    console.log(`   Training Days: ${data.plan?.weekly_schedule?.length || 0}`);
    console.log(`   Response Size: ${JSON.stringify(data).length} chars`);
    
    return true;
  } catch (error) {
    console.error('❌ Workout Plan Generation Failed:', error.message);
    return false;
  }
}

async function testNutritionPlanGeneration() {
  console.log('🍎 Testing Nutrition Plan Generation...');
  
  try {
    const response = await fetch(`${API_BASE}/api/generate-daily-meal-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: 'test-user-123' })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Nutrition Plan Generation Success!');
    console.log(`   Success: ${data.success}`);
    console.log(`   Meals Count: ${data.meal_plan?.length || 0}`);
    console.log(`   AI Generated: ${data.ai_generated || false}`);
    
    return true;
  } catch (error) {
    console.error('❌ Nutrition Plan Generation Failed:', error.message);
    return false;
  }
}

async function testServerHealth() {
  console.log('🔍 Testing Server Health...');
  
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Server Health Check Success!');
    console.log(`   Status: ${data.status}`);
    console.log(`   Uptime: ${data.uptime}s`);
    
    return true;
  } catch (error) {
    console.error('❌ Server Health Check Failed:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting GoFitAI Integration Tests...\n');
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Workout Plan Generation', fn: testWorkoutPlanGeneration },
    { name: 'Nutrition Plan Generation', fn: testNutritionPlanGeneration }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const success = await test.fn();
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Integration Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All integration tests passed! GoFitAI is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
  }
}

// Run the tests
runIntegrationTests().catch(console.error);
