#!/usr/bin/env node
/**
 * Test script for improved 503 retry logic
 * This will test the Gemini API with better error handling
 */

const SERVER_URL = 'http://localhost:4000';

async function testRecipeGeneration() {
  console.log('🧪 Testing Recipe Generation with Improved 503 Handling...\n');
  
  const requestData = {
    mealType: 'lunch',
    targets: {
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20
    },
    ingredients: ['chicken breast', 'brown rice', 'broccoli', 'olive oil'],
    strict: false
  };

  console.log('📤 Sending request to:', `${SERVER_URL}/api/generate-recipe`);
  console.log('📦 Request data:', JSON.stringify(requestData, null, 2));
  console.log('\n⏳ Waiting for response (this may take up to 60 seconds with retries)...\n');

  const startTime = Date.now();

  try {
    const response = await fetch(`${SERVER_URL}/api/generate-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed');
      console.error('Status:', response.status, response.statusText);
      console.error('Response:', errorText);
      console.error(`Duration: ${duration}s`);
      
      if (response.status === 503) {
        console.error('\n⚠️  503 ERROR DETECTED');
        console.error('This means Gemini is overloaded.');
        console.error('The improved retry logic should have attempted 3 times with delays.');
        console.error('\n📋 Check server logs for retry attempts:');
        console.error('   tail -50 /Users/ngkwanho/Desktop/GoFitAI/server/server_local.log | grep "Retryable error"');
      }
      
      return;
    }

    const data = await response.json();
    
    console.log('✅ SUCCESS!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('\n📄 Generated Recipe:');
    console.log('━'.repeat(50));
    console.log('Name:', data.recipe?.recipe_name || 'N/A');
    console.log('Meal Type:', data.recipe?.meal_type || 'N/A');
    console.log('Prep Time:', data.recipe?.prep_time || 'N/A', 'minutes');
    console.log('Cook Time:', data.recipe?.cook_time || 'N/A', 'minutes');
    console.log('Servings:', data.recipe?.servings || 'N/A');
    console.log('Difficulty:', data.recipe?.difficulty || 'N/A');
    
    if (data.recipe?.nutrition) {
      console.log('\n🥗 Nutrition:');
      console.log('  Calories:', data.recipe.nutrition.calories, 'kcal');
      console.log('  Protein:', data.recipe.nutrition.protein, 'g');
      console.log('  Carbs:', data.recipe.nutrition.carbs, 'g');
      console.log('  Fat:', data.recipe.nutrition.fat, 'g');
    }
    
    if (data.recipe?.ingredients && data.recipe.ingredients.length > 0) {
      console.log('\n🛒 Ingredients:', data.recipe.ingredients.length);
      data.recipe.ingredients.slice(0, 3).forEach((ing, idx) => {
        console.log(`  ${idx + 1}. ${ing.name} - ${ing.quantity}`);
      });
      if (data.recipe.ingredients.length > 3) {
        console.log(`  ... and ${data.recipe.ingredients.length - 3} more`);
      }
    }
    
    if (data.recipe?.instructions && data.recipe.instructions.length > 0) {
      console.log('\n📝 Instructions:', data.recipe.instructions.length, 'steps');
      data.recipe.instructions.slice(0, 2).forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step.substring(0, 60)}...`);
      });
    }
    
    console.log('\n━'.repeat(50));
    console.log('✨ Recipe generation completed successfully!');
    console.log('\n💡 TIP: If you saw delays, check logs for:');
    console.log('   [GEMINI TEXT] 🚀 IMPROVED 503 HANDLING');
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('❌ Test failed after', duration, 's');
    console.error('Error:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check if server is running: curl http://localhost:4000/api/test');
    console.error('2. View server logs: tail -50 /Users/ngkwanho/Desktop/GoFitAI/server/server_local.log');
    console.error('3. Check for 503 errors in logs');
  }
}

async function testHealth() {
  console.log('\n🏥 Testing Health Endpoint...\n');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/health`);
    const data = await response.json();
    
    console.log('✅ Server Health:');
    console.log('Status:', data.status);
    console.log('AI Provider:', data.ai?.provider || 'N/A');
    console.log('AI Model:', data.ai?.model || 'N/A');
    console.log('Available Providers:', data.ai?.providers?.map(p => p.name).join(', ') || 'N/A');
    console.log('\n');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

// Run tests
(async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  GoFitAI - Improved 503 Retry Logic Test                  ║');
  console.log('║  Version: 1.0.0                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  await testHealth();
  await testRecipeGeneration();
  
  console.log('\n✨ Test completed!\n');
  console.log('📊 View detailed logs:');
  console.log('   tail -100 /Users/ngkwanho/Desktop/GoFitAI/server/server_local.log\n');
})();

