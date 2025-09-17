#!/usr/bin/env node

/**
 * Test script to verify creative daily meal plan generation
 * This tests the enhanced AI meal plan generation with global cuisine variety
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Test user configuration
const testUser = {
  id: 'test-user-001',
  dailyCalories: 2200,
  proteinGrams: 140,
  carbsGrams: 250,
  fatGrams: 85
};

async function testCreativeMealPlanGeneration() {
  console.log('🧪 Testing Creative Daily Meal Plan Generation');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n🎯 Test Parameters:');
    console.log(`User ID: ${testUser.id}`);
    console.log(`Daily Calories: ${testUser.dailyCalories} kcal`);
    console.log(`Protein: ${testUser.proteinGrams}g`);
    console.log(`Carbs: ${testUser.carbsGrams}g`);
    console.log(`Fat: ${testUser.fatGrams}g`);

    // First, create a nutrition plan for the test user
    console.log('\n📋 Creating nutrition plan for test user...');
    try {
      const nutritionPlanResponse = await axios.post(`${BASE_URL}/api/generate-nutrition-plan`, {
        profile: {
          weight: 70,
          height: 175,
          age: 30,
          gender: 'male',
          activity_level: 'moderately_active',
          goal_type: 'maintenance',
          fitness_strategy: 'maintenance'
        },
        preferences: [],
        userId: testUser.id
      });
      
      if (nutritionPlanResponse.data.success) {
        console.log('✅ Nutrition plan created successfully');
        console.log('Plan details:', {
          calories: nutritionPlanResponse.data.daily_targets?.daily_calories,
          planId: nutritionPlanResponse.data.id,
          method: nutritionPlanResponse.data.method
        });
      } else {
        console.log('⚠️  Nutrition plan creation returned:', nutritionPlanResponse.data);
      }
    } catch (planError) {
      console.log('⚠️  Nutrition plan creation failed:', planError.response?.data || planError.message);
      console.log('Proceeding with meal plan test anyway...');
    }

    // Wait a bit for the nutrition plan to be fully saved
    console.log('\n⏳ Waiting 2 seconds for nutrition plan to be saved...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n🚀 Calling daily meal plan generation API...');
    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/api/generate-daily-meal-plan`, {
      userId: testUser.id
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n⏱️  API Response Time: ${duration}ms`);
    console.log(`📊 Response Status: ${response.status}`);

    if (response.data && response.data.length > 0) {
      console.log('\n✅ SUCCESS! Generated Creative Meal Plan:');
      console.log('=' .repeat(60));

      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      response.data.forEach((meal, index) => {
        console.log(`\n${index + 1}. ${meal.meal_type.toUpperCase()}: ${meal.recipe_name}`);
        console.log(`   🍽️  Calories: ${meal.macros.calories} kcal`);
        console.log(`   🥩 Protein: ${meal.macros.protein_grams}g`);
        console.log(`   🍞 Carbs: ${meal.macros.carbs_grams}g`);
        console.log(`   🥑 Fat: ${meal.macros.fat_grams}g`);
        console.log(`   ⏰ Prep: ${meal.prep_time}min | Cook: ${meal.cook_time}min`);
        
        // Show first few ingredients to assess creativity
        if (meal.ingredients && meal.ingredients.length > 0) {
          const firstIngredients = meal.ingredients.slice(0, 3).map(ing => 
            typeof ing === 'string' ? ing : ing.name || ing
          ).join(', ');
          console.log(`   🛒 Key ingredients: ${firstIngredients}...`);
        }

        totalCalories += meal.macros.calories;
        totalProtein += meal.macros.protein_grams;
        totalCarbs += meal.macros.carbs_grams;
        totalFat += meal.macros.fat_grams;
      });

      console.log('\n📊 NUTRITION SUMMARY:');
      console.log('=' .repeat(40));
      console.log(`Total Calories: ${totalCalories} / ${testUser.dailyCalories} (${((totalCalories/testUser.dailyCalories)*100).toFixed(1)}%)`);
      console.log(`Total Protein: ${totalProtein}g / ${testUser.proteinGrams}g (${((totalProtein/testUser.proteinGrams)*100).toFixed(1)}%)`);
      console.log(`Total Carbs: ${totalCarbs}g / ${testUser.carbsGrams}g (${((totalCarbs/testUser.carbsGrams)*100).toFixed(1)}%)`);
      console.log(`Total Fat: ${totalFat}g / ${testUser.fatGrams}g (${((totalFat/testUser.fatGrams)*100).toFixed(1)}%)`);

      // Assess creativity by checking for diverse meal names
      const mealNames = response.data.map(meal => meal.recipe_name);
      console.log('\n🎨 CREATIVITY ASSESSMENT:');
      console.log('=' .repeat(40));
      console.log('Generated Meal Names:');
      mealNames.forEach(name => console.log(`   • ${name}`));

      // Check for global cuisine variety
      const cuisineKeywords = ['korean', 'thai', 'mexican', 'italian', 'indian', 'mediterranean', 'japanese', 'moroccan', 'greek'];
      const foundCuisines = cuisineKeywords.filter(cuisine => 
        mealNames.some(name => name.toLowerCase().includes(cuisine))
      );
      console.log(`\n🌍 Global Cuisines Detected: ${foundCuisines.join(', ') || 'None detected in meal names'}`);

      // Check nutrition accuracy
      const calorieAccuracy = Math.abs(totalCalories - testUser.dailyCalories) / testUser.dailyCalories;
      const proteinAccuracy = Math.abs(totalProtein - testUser.proteinGrams) / testUser.proteinGrams;
      
      console.log('\n🎯 ACCURACY ASSESSMENT:');
      console.log('=' .repeat(40));
      console.log(`Calorie Accuracy: ${calorieAccuracy < 0.1 ? '✅ Excellent' : calorieAccuracy < 0.2 ? '⚠️  Good' : '❌ Needs Improvement'} (${(calorieAccuracy*100).toFixed(1)}% variance)`);
      console.log(`Protein Accuracy: ${proteinAccuracy < 0.1 ? '✅ Excellent' : proteinAccuracy < 0.2 ? '⚠️  Good' : '❌ Needs Improvement'} (${(proteinAccuracy*100).toFixed(1)}% variance)`);

      console.log('\n🎉 Test completed successfully!');
      
    } else {
      console.log('\n❌ FAILURE: Empty response from API');
      console.log('Response data:', response.data);
    }

  } catch (error) {
    console.error('\n💥 ERROR during test:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Test multiple generations to check consistency
async function testMultipleGenerations() {
  console.log('\n\n🔄 Testing Multiple Generations for Variety...');
  console.log('=' .repeat(60));
  
  try {
    const generations = [];
    
    for (let i = 1; i <= 3; i++) {
      console.log(`\n🎲 Generation ${i}/3...`);
      
      const response = await axios.post(`${BASE_URL}/api/generate-daily-meal-plan`, {
        userId: `test-user-00${i}`,
        targets: {
          daily_calories: testUser.dailyCalories,
          protein_grams: testUser.proteinGrams,
          carbs_grams: testUser.carbsGrams,
          fat_grams: testUser.fatGrams
        },
        dietaryPreferences: []
      });
      
      if (response.data && response.data.length > 0) {
        const mealNames = response.data.map(meal => meal.recipe_name);
        generations.push(mealNames);
        console.log(`   Generated: ${mealNames.join(' | ')}`);
      }
      
      // Wait a bit between calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🔍 VARIETY ANALYSIS:');
    console.log('=' .repeat(40));
    
    // Check if all generations are different
    const allMeals = generations.flat();
    const uniqueMeals = [...new Set(allMeals)];
    
    console.log(`Total meals generated: ${allMeals.length}`);
    console.log(`Unique meals: ${uniqueMeals.length}`);
    console.log(`Variety score: ${((uniqueMeals.length / allMeals.length) * 100).toFixed(1)}%`);
    
    if (uniqueMeals.length === allMeals.length) {
      console.log('✅ Excellent variety - all meals are unique!');
    } else if (uniqueMeals.length / allMeals.length > 0.8) {
      console.log('⚠️  Good variety - most meals are unique');
    } else {
      console.log('❌ Low variety - too many repeated meals');
    }
    
  } catch (error) {
    console.error('Error in variety test:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testCreativeMealPlanGeneration();
    await testMultipleGenerations();
    console.log('\n🏁 All tests completed!');
  } catch (error) {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    // Try to hit any endpoint to see if server responds
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    // If we get a 404 but server responds, that means server is running
    if (error.response && error.response.status === 404) {
      console.log('✅ Server is running');
      return true;
    }
    console.log('❌ Server is not running. Please start the server first.');
    console.log('Run: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🧪 Creative Daily Meal Plan Test Suite');
  console.log('=' .repeat(60));
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runAllTests();
}

main().catch(console.error);
