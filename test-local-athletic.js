#!/usr/bin/env node

/**
 * Test script to verify athletic_performance goal on LOCAL server
 */

const LOCAL_URL = 'http://192.168.0.176:4000';

async function testAthleticPerformanceGeneration() {
  console.log('🧪 Testing Athletic Performance Workout Generation on LOCAL Server');
  console.log('=' .repeat(70));
  
  const testProfile = {
    userProfile: {
      fullName: 'Test Athlete',
      gender: 'male',
      age: 25,
      heightCm: 180,
      weightKg: 75,
      fitnessLevel: 'intermediate',
      primaryGoal: 'athletic_performance', // THIS is the key field we're testing
      workoutFrequency: '4_5'
    }
  };

  console.log('\n📤 Sending request with profile:');
  console.log(JSON.stringify(testProfile, null, 2));
  console.log('\n⏳ Waiting for AI to generate plan...\n');

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${LOCAL_URL}/api/generate-workout-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testProfile)
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error ${response.status}:`, errorText);
      return false;
    }

    const data = await response.json();
    
    console.log(`✅ Response received in ${(responseTime/1000).toFixed(1)}s`);
    console.log('\n📊 Generated Plan Summary:');
    console.log('  - Plan Name:', data.workoutPlan?.name || 'N/A');
    console.log('  - Provider:', data.provider || 'N/A');
    console.log('  - Used AI:', data.used_ai || false);
    
    // Check if primary_goal is respected
    const planGoal = data.workoutPlan?.primaryGoal || data.workoutPlan?.primary_goal;
    console.log('  - Primary Goal in Response:', planGoal);
    
    if (planGoal === 'athletic_performance') {
      console.log('\n✅ SUCCESS: Primary goal "athletic_performance" is PRESERVED!');
      
      // Check exercise types to verify athletic focus
      const weeklySchedule = data.workoutPlan?.weeklySchedule || [];
      console.log('\n📋 Weekly Schedule Preview:');
      weeklySchedule.slice(0, 3).forEach(day => {
        if (day.exercises && day.exercises.length > 0) {
          console.log(`  ${day.day}: ${day.focus}`);
          console.log(`    Exercises: ${day.exercises.slice(0, 2).map(e => e.name).join(', ')}...`);
        }
      });
      
      return true;
    } else {
      console.log(`\n❌ FAILURE: Expected "athletic_performance", but got "${planGoal}"`);
      console.log('\n🔍 Full plan structure:');
      console.log(JSON.stringify(data, null, 2));
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
    }
    return false;
  }
}

// Run the test
testAthleticPerformanceGeneration()
  .then(success => {
    console.log('\n' + '='.repeat(70));
    if (success) {
      console.log('✅ TEST PASSED: Athletic performance goal is working correctly!');
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED: Check logs above for details');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });






