/**
 * Test script to verify Gemini JSON parsing fixes
 */

const GeminiTextService = require('./services/geminiTextService');

async function testGeminiRecipeGeneration() {
  console.log('🧪 Testing Gemini Recipe Generation Fixes...\n');

  // Check if API key is available
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }

  try {
    // Initialize service
    const geminiService = new GeminiTextService(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini service initialized successfully');

    // Test data
    const testData = {
      mealType: 'breakfast',
      targets: {
        calories: 400,
        protein: 25,
        carbs: 45,
        fat: 15
      },
      ingredients: ['eggs', 'oatmeal', 'banana', 'milk'],
      strict: false
    };

    console.log('\n📝 Test Parameters:');
    console.log('- Meal Type:', testData.mealType);
    console.log('- Calories Target:', testData.targets.calories);
    console.log('- Ingredients:', testData.ingredients.join(', '));
    console.log('- Strict Mode:', testData.strict);

    console.log('\n🔄 Generating recipe...');
    const startTime = Date.now();

    const recipe = await geminiService.generateRecipe(
      testData.mealType,
      testData.targets,
      testData.ingredients,
      testData.strict
    );

    const generationTime = Date.now() - startTime;

    console.log('\n✅ Recipe generated successfully!');
    console.log('⏱️ Generation time:', generationTime + 'ms');
    console.log('📋 Recipe name:', recipe.recipe_name);
    console.log('🍽️ Meal type:', recipe.meal_type);
    console.log('⏰ Total time:', recipe.total_time + ' minutes');
    console.log('🥘 Servings:', recipe.servings);
    console.log('📊 Calories:', recipe.nutrition.calories);
    console.log('🥩 Protein:', recipe.nutrition.protein + 'g');
    console.log('🍞 Carbs:', recipe.nutrition.carbs + 'g');
    console.log('🧈 Fat:', recipe.nutrition.fat + 'g');
    console.log('🥬 Ingredients count:', recipe.ingredients.length);
    console.log('📝 Instructions count:', recipe.instructions.length);

    console.log('\n📋 Recipe Details:');
    console.log('Ingredients:');
    recipe.ingredients.forEach((ingredient, index) => {
      console.log(`  ${index + 1}. ${ingredient.name} - ${ingredient.quantity}`);
    });

    console.log('\nInstructions:');
    recipe.instructions.forEach((instruction, index) => {
      console.log(`  ${index + 1}. ${instruction}`);
    });

    console.log('\n🎯 Test completed successfully!');
    console.log('✅ JSON parsing fixes are working correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Provide specific debugging information
    if (error.message.includes('JSON parsing failed')) {
      console.error('\n🔍 JSON Parsing Error Details:');
      console.error('- This indicates the response format issue has not been fully resolved');
      console.error('- Check the logs above for raw response details');
    } else if (error.message.includes('API key')) {
      console.error('\n🔑 API Key Error:');
      console.error('- Ensure GEMINI_API_KEY is properly set in environment variables');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.error('\n🌐 Network Error:');
      console.error('- Check internet connection and Gemini API availability');
    }
  }
}

// Run the test
if (require.main === module) {
  testGeminiRecipeGeneration()
    .then(() => {
      console.log('\n🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testGeminiRecipeGeneration };

























































