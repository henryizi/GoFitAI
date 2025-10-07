/**
 * Test script for workout plan generation after fix deployment
 * 
 * This script tests:
 * 1. Connection to deployed Railway backend
 * 2. Workout plan generation with AI
 * 3. Validation that exercises are NOT empty
 * 4. Proper exercise array population
 */

const axios = require('axios');

// Configuration
const RAILWAY_URL = process.env.RAILWAY_URL || 'https://your-railway-url.up.railway.app';
const API_ENDPOINT = `${RAILWAY_URL}/api/generate-workout-plan`;

// Test user profile - matching server expected format
const testProfile = {
  gender: 'male',
  age: 25,
  fitnessLevel: 'intermediate',
  primaryGoal: 'muscle_gain',
  workoutFrequency: '4_5'
};

console.log('🧪 Testing Workout Plan Generation');
console.log('=' .repeat(60));
console.log(`📡 Backend URL: ${RAILWAY_URL}`);
console.log(`🎯 Endpoint: ${API_ENDPOINT}`);
console.log('\n📋 Test Profile:');
console.log(JSON.stringify(testProfile, null, 2));
console.log('=' .repeat(60));

async function testWorkoutGeneration() {
  try {
    console.log('\n⏳ Generating workout plan...');
    const startTime = Date.now();
    
    // Server expects { profile: {...} } or { userProfile: {...} }
    const response = await axios.post(API_ENDPOINT, { 
      userProfile: testProfile 
    }, {
      timeout: 150000, // 150 seconds
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Response received in ${duration}s`);
    console.log(`📊 Status: ${response.status}`);
    
    // Server returns { success: true, workoutPlan: {...}, provider: '...' }
    const responseData = response.data;
    
    if (!responseData.success) {
      console.log('❌ Server returned unsuccessful response:', responseData);
      return false;
    }
    
    console.log(`🤖 Provider: ${responseData.provider}`);
    console.log(`🧠 Used AI: ${responseData.used_ai}`);
    
    const workoutPlan = responseData.workoutPlan;
    
    // Validation checks
    console.log('\n🔍 Validating Workout Plan Structure...');
    console.log('=' .repeat(60));
    
    // Check 1: Basic structure
    if (!workoutPlan.plan_name) {
      console.log('❌ FAIL: Missing plan_name');
      return false;
    }
    console.log(`✅ Plan Name: ${workoutPlan.plan_name}`);
    
    // Check 2: Weekly schedule exists
    if (!workoutPlan.weekly_schedule || !Array.isArray(workoutPlan.weekly_schedule)) {
      console.log('❌ FAIL: Missing or invalid weekly_schedule');
      return false;
    }
    console.log(`✅ Weekly Schedule: ${workoutPlan.weekly_schedule.length} days`);
    
    // Check 3: Validate each workout day
    let totalExercises = 0;
    let emptyDays = 0;
    
    console.log('\n📅 Checking Individual Days:');
    console.log('-'.repeat(60));
    
    workoutPlan.weekly_schedule.forEach((day, index) => {
      const warmUpCount = day.warm_up?.length || 0;
      const mainWorkoutCount = day.main_workout?.length || 0;
      const coolDownCount = day.cool_down?.length || 0;
      const dayTotal = warmUpCount + mainWorkoutCount + coolDownCount;
      
      totalExercises += dayTotal;
      
      const status = dayTotal === 0 ? '❌' : '✅';
      console.log(`${status} Day ${index + 1}: ${day.day_name || 'Unknown'}`);
      console.log(`   Focus: ${day.focus || 'N/A'}`);
      console.log(`   Warm-up: ${warmUpCount} exercises`);
      console.log(`   Main Workout: ${mainWorkoutCount} exercises`);
      console.log(`   Cool-down: ${coolDownCount} exercises`);
      console.log(`   Total: ${dayTotal} exercises`);
      
      if (dayTotal === 0) {
        emptyDays++;
        console.log('   ⚠️  WARNING: This day has NO exercises!');
      }
      
      // Show sample exercises from main workout
      if (mainWorkoutCount > 0) {
        console.log('   Sample exercises:');
        day.main_workout.slice(0, 2).forEach(ex => {
          console.log(`     - ${ex.name} (${ex.sets}x${ex.reps}, ${ex.rest}s rest)`);
        });
      }
      console.log('');
    });
    
    // Final verdict
    console.log('=' .repeat(60));
    console.log('📊 FINAL RESULTS:');
    console.log(`   Total Days: ${workoutPlan.weekly_schedule.length}`);
    console.log(`   Empty Days: ${emptyDays}`);
    console.log(`   Total Exercises: ${totalExercises}`);
    
    if (emptyDays > 0) {
      console.log(`\n❌ TEST FAILED: ${emptyDays} day(s) have NO exercises!`);
      console.log('   This is the bug we were trying to fix.');
      return false;
    }
    
    if (totalExercises < 15) {
      console.log(`\n⚠️  WARNING: Only ${totalExercises} total exercises. Expected more.`);
    }
    
    console.log('\n✅ TEST PASSED: All workout days have exercises!');
    console.log('🎉 The fix is working correctly!');
    
    return true;
    
  } catch (error) {
    console.log('\n❌ TEST FAILED WITH ERROR:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   Connection refused - is Railway backend running?');
      console.log(`   URL: ${RAILWAY_URL}`);
    } else if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || error.response.statusText}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.log('   No response received from server');
      console.log(`   Timeout: ${error.code === 'ECONNABORTED' ? 'YES' : 'NO'}`);
    } else {
      console.log(`   ${error.message}`);
    }
    
    console.log('\n📋 Full Error:');
    console.log(error);
    
    return false;
  }
}

// Run the test
testWorkoutGeneration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });










