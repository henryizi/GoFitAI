#!/usr/bin/env node

/**
 * Frontend Integration Test Script
 * Tests the connection between frontend and Railway backend
 */

const API_BASE_URL = 'https://gofitai-production.up.railway.app';

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: '\x1b[36m', // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m', // Red
  };
  console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
};

// Test functions
async function testHealthCheck() {
  log('Testing server health check...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      log('✅ Health check passed', 'success');
      return true;
    } else {
      log(`❌ Health check failed: ${data.message || 'Unknown error'}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'error');
    return false;
  }
}

async function testFoodAnalysis() {
  log('Testing food analysis endpoint...');
  
  try {
    // Create a mock image blob
    const mockImage = new Blob(['mock image data'], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('foodImage', mockImage);
    formData.append('foodDescription', 'Apple');
    
    const response = await fetch(`${API_BASE_URL}/api/analyze-food`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log(`✅ Food analysis successful: ${data.data?.foodName} - ${data.data?.calories} calories`, 'success');
      return true;
    } else {
      log(`❌ Food analysis failed: ${data.error || 'Unknown error'}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Food analysis error: ${error.message}`, 'error');
    return false;
  }
}

async function testWorkoutGeneration() {
  log('Testing workout plan generation...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-workout-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user',
        preferences: {
          fitnessLevel: 'beginner',
          goals: ['weight_loss'],
          availableTime: 30,
          equipment: ['none']
        }
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Workout plan generation successful', 'success');
      return true;
    } else {
      log(`❌ Workout plan generation failed: ${data.error || 'Missing profile data'}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Workout generation error: ${error.message}`, 'error');
    return false;
  }
}

async function testAIChat() {
  log('Testing AI chat endpoint...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId: 'test-plan',
        message: 'Hello AI!',
        currentPlan: { id: 'test-plan' }
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ AI chat successful', 'success');
      return true;
    } else {
      log(`❌ AI chat failed: ${data.error || 'Unknown error'}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ AI chat error: ${error.message}`, 'error');
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting Frontend Integration Tests', 'info');
  log('=====================================', 'info');
  
  const results = {
    health: false,
    foodAnalysis: false,
    workoutGeneration: false,
    aiChat: false,
  };
  
  // Test 1: Health Check
  results.health = await testHealthCheck();
  await delay(1000);
  
  // Test 2: Food Analysis
  results.foodAnalysis = await testFoodAnalysis();
  await delay(1000);
  
  // Test 3: Workout Generation
  results.workoutGeneration = await testWorkoutGeneration();
  await delay(1000);
  
  // Test 4: AI Chat
  results.aiChat = await testAIChat();
  
  // Summary
  log('', 'info');
  log('📊 Test Results Summary:', 'info');
  log('========================', 'info');
  log(`Health Check: ${results.health ? '✅ PASS' : '❌ FAIL'}`, results.health ? 'success' : 'error');
  log(`Food Analysis: ${results.foodAnalysis ? '✅ PASS' : '❌ FAIL'}`, results.foodAnalysis ? 'success' : 'error');
  log(`Workout Generation: ${results.workoutGeneration ? '✅ PASS' : '❌ FAIL'}`, results.workoutGeneration ? 'success' : 'error');
  log(`AI Chat: ${results.aiChat ? '✅ PASS' : '❌ FAIL'}`, results.aiChat ? 'success' : 'error');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log('', 'info');
  log(`Overall: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'success' : 'error');
  
  if (passedTests === totalTests) {
    log('🎉 All tests passed! Frontend integration is ready.', 'success');
  } else {
    log('⚠️  Some tests failed. Check the errors above.', 'error');
  }
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`❌ Test runner error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  testHealthCheck,
  testFoodAnalysis,
  testWorkoutGeneration,
  testAIChat,
  runAllTests,
};
