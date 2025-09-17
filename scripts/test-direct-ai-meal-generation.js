#!/usr/bin/env node

/**
 * Test script to directly test the Gemini AI meal plan generation
 * This bypasses database requirements and tests the AI generation directly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Test nutritional targets
const testTargets = {
  daily_calories: 2200,
  protein_grams: 140,
  carbs_grams: 250,
  fat_grams: 85
};

async function testDirectAIMealGeneration() {
  console.log('🤖 Testing Direct AI Meal Plan Generation');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n🎯 Test Targets:');
    console.log(`Daily Calories: ${testTargets.daily_calories} kcal`);
    console.log(`Protein: ${testTargets.protein_grams}g`);
    console.log(`Carbs: ${testTargets.carbs_grams}g`);
    console.log(`Fat: ${testTargets.fat_grams}g`);

    console.log('\n🚀 Calling direct AI meal generation...');
    const startTime = Date.now();
    
    // Create a request that simulates having nutritional targets available
    const response = await axios.post(`${BASE_URL}/api/test-ai-meal-generation`, {
      targets: testTargets,
      dietaryPreferences: []
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n⏱️  API Response Time: ${duration}ms`);
    console.log(`📊 Response Status: ${response.status}`);

    if (response.data && response.data.length > 0) {
      console.log('\n✅ SUCCESS! Generated Creative AI Meal Plan:');
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
        console.log(`   ⏰ Prep: ${meal.prep_time || 'N/A'}min | Cook: ${meal.cook_time || 'N/A'}min`);
        
        // Show first few ingredients to assess creativity
        if (meal.ingredients && meal.ingredients.length > 0) {
          const firstIngredients = meal.ingredients.slice(0, 4).map(ing => 
            typeof ing === 'string' ? ing : ing.name || ing
          ).join(', ');
          console.log(`   🛒 Ingredients: ${firstIngredients}${meal.ingredients.length > 4 ? '...' : ''}`);
        }

        // Show cooking instructions preview
        if (meal.instructions && meal.instructions.length > 0) {
          const firstInstruction = meal.instructions[0];
          const instructionPreview = firstInstruction.length > 80 ? 
            firstInstruction.substring(0, 80) + '...' : firstInstruction;
          console.log(`   📝 Instructions: ${instructionPreview}`);
        }

        totalCalories += meal.macros.calories;
        totalProtein += meal.macros.protein_grams;
        totalCarbs += meal.macros.carbs_grams;
        totalFat += meal.macros.fat_grams;
      });

      console.log('\n📊 NUTRITION SUMMARY:');
      console.log('=' .repeat(40));
      console.log(`Total Calories: ${totalCalories} / ${testTargets.daily_calories} (${((totalCalories/testTargets.daily_calories)*100).toFixed(1)}%)`);
      console.log(`Total Protein: ${totalProtein}g / ${testTargets.protein_grams}g (${((totalProtein/testTargets.protein_grams)*100).toFixed(1)}%)`);
      console.log(`Total Carbs: ${totalCarbs}g / ${testTargets.carbs_grams}g (${((totalCarbs/testTargets.carbs_grams)*100).toFixed(1)}%)`);
      console.log(`Total Fat: ${totalFat}g / ${testTargets.fat_grams}g (${((totalFat/testTargets.fat_grams)*100).toFixed(1)}%)`);

      // Assess creativity by checking for diverse meal names and global cuisines
      const mealNames = response.data.map(meal => meal.recipe_name.toLowerCase());
      console.log('\n🎨 CREATIVITY ASSESSMENT:');
      console.log('=' .repeat(40));
      console.log('Generated Meal Names:');
      response.data.forEach(meal => console.log(`   • ${meal.recipe_name}`));

      // Check for global cuisine variety indicators
      const cuisineKeywords = [
        'korean', 'thai', 'mexican', 'italian', 'indian', 'mediterranean', 'japanese', 
        'moroccan', 'greek', 'chinese', 'vietnamese', 'french', 'spanish', 'turkish',
        'middle eastern', 'asian', 'latin', 'european'
      ];
      
      const foundCuisines = cuisineKeywords.filter(cuisine => 
        mealNames.some(name => name.includes(cuisine)) ||
        response.data.some(meal => 
          meal.ingredients?.some(ing => 
            (typeof ing === 'string' ? ing : ing.name || ing).toLowerCase().includes(cuisine)
          )
        )
      );
      
      console.log(`\n🌍 Global Cuisines Detected: ${foundCuisines.length > 0 ? foundCuisines.join(', ') : 'None detected'}`);

      // Check for creative ingredients
      const allIngredients = response.data.flatMap(meal => 
        meal.ingredients?.map(ing => typeof ing === 'string' ? ing : ing.name || ing) || []
      );
      const uniqueIngredients = [...new Set(allIngredients.map(i => i.toLowerCase()))];
      
      console.log(`\n🥘 Ingredient Diversity: ${uniqueIngredients.length} unique ingredients across all meals`);
      
      // Show some interesting ingredients
      const interestingIngredients = uniqueIngredients.filter(ing => 
        !['salt', 'pepper', 'oil', 'water', 'garlic', 'onion'].includes(ing)
      ).slice(0, 8);
      
      if (interestingIngredients.length > 0) {
        console.log(`   Interesting ingredients: ${interestingIngredients.join(', ')}`);
      }

      // Check nutrition accuracy
      const calorieAccuracy = Math.abs(totalCalories - testTargets.daily_calories) / testTargets.daily_calories;
      const proteinAccuracy = Math.abs(totalProtein - testTargets.protein_grams) / testTargets.protein_grams;
      
      console.log('\n🎯 ACCURACY ASSESSMENT:');
      console.log('=' .repeat(40));
      console.log(`Calorie Accuracy: ${calorieAccuracy < 0.1 ? '✅ Excellent' : calorieAccuracy < 0.2 ? '⚠️  Good' : '❌ Needs Improvement'} (${(calorieAccuracy*100).toFixed(1)}% variance)`);
      console.log(`Protein Accuracy: ${proteinAccuracy < 0.1 ? '✅ Excellent' : proteinAccuracy < 0.2 ? '⚠️  Good' : '❌ Needs Improvement'} (${(proteinAccuracy*100).toFixed(1)}% variance)`);

      // Overall assessment
      const creativityScore = (foundCuisines.length * 20) + (uniqueIngredients.length * 2);
      const accuracyScore = 100 - (calorieAccuracy * 100) - (proteinAccuracy * 100);
      
      console.log('\n🏆 OVERALL ASSESSMENT:');
      console.log('=' .repeat(40));
      console.log(`Creativity Score: ${Math.min(creativityScore, 100)}/100`);
      console.log(`Accuracy Score: ${Math.max(accuracyScore, 0).toFixed(1)}/100`);
      
      if (creativityScore > 60 && accuracyScore > 70) {
        console.log('🎉 EXCELLENT: Creative, diverse, and nutritionally accurate!');
      } else if (creativityScore > 40 && accuracyScore > 60) {
        console.log('👍 GOOD: Solid meal plan with room for improvement');
      } else {
        console.log('⚠️  NEEDS WORK: Consider adjusting AI prompts');
      }

      console.log('\n🎉 Test completed successfully!');
      
    } else {
      console.log('\n❌ FAILURE: Empty response from AI generation');
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

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return true; // Server is running, just no health endpoint
    }
    console.log('❌ Server is not running. Please start the server first.');
    console.log('Run: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🧪 Direct AI Meal Plan Generation Test');
  console.log('=' .repeat(60));
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await testDirectAIMealGeneration();
}

main().catch(console.error);
