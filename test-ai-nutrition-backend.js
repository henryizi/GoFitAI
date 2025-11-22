/**
 * Test Script: AI Nutrition Backend Endpoint
 * Tests the deployed /api/generate-ai-nutrition-targets endpoint
 */

const API_URL = 'https://gofitai-production.up.railway.app';

// Sample user profile for testing
const testProfile = {
  age: 28,
  gender: 'male',
  weight: 75,
  height: 178,
  body_fat: 18,
  primary_goal: 'muscle_gain',
  fitness_strategy: 'muscle_gain',
  activity_level: 'moderately_active',
  exercise_frequency: 5,
  training_level: 'intermediate',
  weight_trend: 'stable',
  goal_fat_reduction: 0,
  goal_muscle_gain: 5
};

async function testAINutritionGeneration() {
  console.log('🧪 Testing AI Nutrition Generation Backend\n');
  console.log('📍 API URL:', API_URL);
  console.log('👤 Test Profile:', JSON.stringify(testProfile, null, 2));
  console.log('\n🚀 Sending request to /api/generate-ai-nutrition-targets...\n');

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_URL}/api/generate-ai-nutrition-targets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile: testProfile })
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`⏱️  Response time: ${duration}s`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:', errorText);
      return;
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ AI Nutrition Generation SUCCESSFUL!\n');
      console.log('📈 Generated Nutrition Targets:');
      console.log('  • Calories:', result.calories, 'kcal/day');
      console.log('  • Protein:', result.protein, 'g/day');
      console.log('  • Carbs:', result.carbs, 'g/day');
      console.log('  • Fat:', result.fat, 'g/day');
      console.log('  • Method:', result.method || 'unknown');
      console.log('  • Model:', result.model || 'unknown');
      console.log('\n📝 AI Explanation:');
      console.log(result.explanation || 'No explanation provided');
      
      // Validate the results
      console.log('\n🔍 Validation:');
      const macroCalories = (result.protein * 4) + (result.carbs * 4) + (result.fat * 9);
      const calorieDiff = Math.abs(macroCalories - result.calories);
      const isValid = calorieDiff < 100; // Allow 100 calorie tolerance
      
      console.log(`  • Macro calories: ${macroCalories} kcal`);
      console.log(`  • Target calories: ${result.calories} kcal`);
      console.log(`  • Difference: ${calorieDiff.toFixed(0)} kcal`);
      console.log(`  • Valid: ${isValid ? '✅ Yes' : '❌ No (difference too large)'}`);
      
    } else {
      console.log('❌ AI Nutrition Generation FAILED');
      console.log('Error:', result.error);
      console.log('Details:', result.details);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run test
console.log('=' .repeat(60));
console.log('🤖 AI NUTRITION BACKEND TEST');
console.log('=' .repeat(60));
console.log();

testAINutritionGeneration().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed');
  console.log('=' .repeat(60));
});

