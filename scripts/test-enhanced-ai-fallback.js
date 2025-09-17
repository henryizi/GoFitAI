#!/usr/bin/env node

const axios = require('axios');

// Server configuration
const SERVER_URL = 'http://localhost:4000';

// Test configuration
const TEST_CONFIG = {
  timeout: 60000, // 60 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function logSection(title) {
  console.log(`\n${colorize('='.repeat(80), 'cyan')}`);
  console.log(`${colorize(title, 'bright')}`);
  console.log(`${colorize('='.repeat(80), 'cyan')}\n`);
}

function logSuccess(message) {
  console.log(`${colorize('✅', 'green')} ${message}`);
}

function logError(message) {
  console.log(`${colorize('❌', 'red')} ${message}`);
}

function logInfo(message) {
  console.log(`${colorize('ℹ️', 'blue')} ${message}`);
}

function logWarning(message) {
  console.log(`${colorize('⚠️', 'yellow')} ${message}`);
}

async function testMealPlanFallback() {
  logSection('🍽️ Testing Enhanced Meal Plan AI Fallback System');
  
  try {
    const testData = {
      targets: {
        daily_calories: 2000,
        protein_grams: 120,
        carbs_grams: 200,
        fat_grams: 75
      },
      dietaryPreferences: []
    };
    
    logInfo(`Testing with targets: ${JSON.stringify(testData.targets)}`);
    
    const startTime = Date.now();
    const response = await axios.post(
      `${SERVER_URL}/api/test-ai-meal-generation`,
      testData,
      { ...TEST_CONFIG }
    );
    const responseTime = Date.now() - startTime;
    
    if (response.status === 200 && response.data) {
      logSuccess(`Meal plan generated successfully in ${responseTime}ms`);
      
      const mealPlan = response.data;
      logInfo(`Generated ${mealPlan.length} meals`);
      
      // Analyze the response to see which provider was used
      const hasAiMeals = mealPlan.some(meal => 
        meal.source && (meal.source.includes('gemini') || meal.source.includes('deepseek'))
      );
      
      if (hasAiMeals) {
        logSuccess('🤖 AI-generated meal plan detected');
      } else {
        logWarning('🧮 Mathematical fallback was used (expected if AI providers failed)');
      }
      
      // Validate meal plan structure
      let validMeals = 0;
      let totalCalories = 0;
      let totalProtein = 0;
      
      mealPlan.forEach((meal, index) => {
        if (meal.recipe_name && meal.nutrition) {
          validMeals++;
          totalCalories += meal.nutrition.calories || 0;
          totalProtein += meal.nutrition.protein || 0;
        }
        logInfo(`Meal ${index + 1}: ${meal.recipe_name || meal.meal_type} (${meal.nutrition?.calories || 0} kcal)`);
      });
      
      logInfo(`Total nutritional accuracy: ${totalCalories}/${testData.targets.daily_calories} calories, ${totalProtein}/${testData.targets.protein_grams}g protein`);
      
      if (validMeals === mealPlan.length) {
        logSuccess('All meals have valid structure and nutrition data');
      } else {
        logWarning(`Only ${validMeals}/${mealPlan.length} meals have complete data`);
      }
      
      return { success: true, responseTime, aiUsed: hasAiMeals };
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
    
  } catch (error) {
    logError(`Meal plan test failed: ${error.message}`);
    if (error.response) {
      logError(`Response status: ${error.response.status}`);
      logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

async function testWorkoutPlanFallback() {
  logSection('💪 Testing Enhanced Workout Plan AI Fallback System');
  
  try {
    const testProfile = {
      profile: {
        full_name: "Test User",
        age: 25,
        gender: "male",
        training_level: "intermediate",
        primary_goal: "muscle_gain",
        workout_frequency: "4-5"
      }
    };
    
    logInfo(`Testing with profile: ${JSON.stringify(testProfile.profile, null, 2)}`);
    
    const startTime = Date.now();
    const response = await axios.post(
      `${SERVER_URL}/api/generate-workout-plan`,
      testProfile,
      { ...TEST_CONFIG }
    );
    const responseTime = Date.now() - startTime;
    
    if (response.status === 200 && response.data && response.data.success) {
      logSuccess(`Workout plan generated successfully in ${responseTime}ms`);
      
      const { workoutPlan, provider, used_ai } = response.data;
      
      if (used_ai === false && provider === 'rule_based_fallback') {
        logWarning('🧮 Rule-based fallback was used (expected if AI providers failed)');
      } else if (used_ai !== false) {
        logSuccess(`🤖 AI-generated workout plan using provider: ${provider}`);
      }
      
      // Validate workout plan structure
      if (workoutPlan && workoutPlan.plan_name && workoutPlan.weekly_schedule) {
        logSuccess(`Plan generated: "${workoutPlan.plan_name}"`);
        logInfo(`Primary goal: ${workoutPlan.primary_goal}`);
        
        const daysWithWorkouts = workoutPlan.weekly_schedule.filter(day => 
          day.exercises && day.exercises.length > 0
        );
        
        logInfo(`Weekly schedule: ${workoutPlan.weekly_schedule.length} days defined`);
        logInfo(`Active workout days: ${daysWithWorkouts.length}`);
        
        // Validate exercise structure
        let totalExercises = 0;
        daysWithWorkouts.forEach(day => {
          totalExercises += day.exercises.length;
          logInfo(`${day.day}: ${day.focus} (${day.exercises.length} exercises)`);
        });
        
        logSuccess(`Total exercises across all days: ${totalExercises}`);
        
        // Check if plan matches the requested goal
        if (workoutPlan.primary_goal === testProfile.profile.primary_goal) {
          logSuccess('Plan goal matches requested goal');
        } else {
          logWarning(`Plan goal (${workoutPlan.primary_goal}) differs from requested (${testProfile.profile.primary_goal})`);
        }
        
        return { success: true, responseTime, aiUsed: used_ai !== false, provider };
      } else {
        throw new Error('Invalid workout plan structure');
      }
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
    
  } catch (error) {
    logError(`Workout plan test failed: ${error.message}`);
    if (error.response) {
      logError(`Response status: ${error.response.status}`);
      logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

async function testAIProviderStatus() {
  logSection('🔧 Testing AI Provider Configuration');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/test`, { timeout: 5000 });
    
    if (response.status === 200 && response.data) {
      const { environment } = response.data;
      
      logInfo(`Server status: ${response.data.status}`);
      logInfo(`Primary AI provider: ${environment.ai_provider}`);
      logInfo(`DeepSeek configured: ${environment.deepseek_api_configured ? 'Yes' : 'No'}`);
      logInfo(`OpenAI configured: ${environment.openai_configured ? 'Yes' : 'No'}`);
      
      return {
        success: true,
        primaryProvider: environment.ai_provider,
        deepseekConfigured: environment.deepseek_api_configured,
        openaiConfigured: environment.openai_configured
      };
    }
  } catch (error) {
    logError(`Server status check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTest() {
  console.log(`${colorize('🧪 Enhanced AI Fallback System Test Suite', 'bright')}`);
  console.log(`${colorize('============================================================', 'cyan')}\n`);
  
  const results = {};
  
  // Test server status and AI configuration
  results.serverStatus = await testAIProviderStatus();
  
  // Test meal plan fallback system
  results.mealPlan = await testMealPlanFallback();
  
  // Test workout plan fallback system  
  results.workoutPlan = await testWorkoutPlanFallback();
  
  // Generate summary report
  logSection('📊 Test Summary Report');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.success).length;
  
  logInfo(`Tests completed: ${totalTests}`);
  logInfo(`Tests passed: ${passedTests}`);
  logInfo(`Tests failed: ${totalTests - passedTests}`);
  
  if (results.serverStatus?.success) {
    logSuccess('✅ Server connectivity confirmed');
  } else {
    logError('❌ Server connectivity issues');
  }
  
  if (results.mealPlan?.success) {
    logSuccess('✅ Meal plan fallback system working');
    if (results.mealPlan.aiUsed) {
      logInfo('  🤖 AI provider was successfully used');
    } else {
      logInfo('  🧮 Mathematical fallback was used');
    }
  } else {
    logError('❌ Meal plan fallback system failed');
  }
  
  if (results.workoutPlan?.success) {
    logSuccess('✅ Workout plan fallback system working');
    if (results.workoutPlan.aiUsed) {
      logInfo(`  🤖 AI provider was successfully used: ${results.workoutPlan.provider}`);
    } else {
      logInfo('  🧮 Rule-based fallback was used');
    }
  } else {
    logError('❌ Workout plan fallback system failed');
  }
  
  // System recommendations
  logSection('💡 System Recommendations');
  
  if (!results.serverStatus?.deepseekConfigured && !results.serverStatus?.openaiConfigured) {
    logWarning('No AI providers are configured - system will always use fallback methods');
    logInfo('Consider configuring at least one AI provider for enhanced features');
  } else if (results.serverStatus?.deepseekConfigured && results.serverStatus?.openaiConfigured) {
    logSuccess('Multiple AI providers configured - excellent fallback resilience');
  } else {
    logInfo('Single AI provider configured - fallback will work but consider adding a second provider');
  }
  
  const overallSuccess = passedTests === totalTests;
  
  console.log(`\n${colorize('='.repeat(80), 'cyan')}`);
  if (overallSuccess) {
    console.log(`${colorize('🎉 All tests passed! Enhanced AI fallback system is working correctly.', 'green')}`);
  } else {
    console.log(`${colorize('⚠️ Some tests failed. Please review the logs above.', 'yellow')}`);
  }
  console.log(`${colorize('='.repeat(80), 'cyan')}\n`);
  
  process.exit(overallSuccess ? 0 : 1);
}

// Run the test suite
runComprehensiveTest().catch(error => {
  console.error(`${colorize('💥 Unexpected error in test suite:', 'red')} ${error.message}`);
  process.exit(1);
});
