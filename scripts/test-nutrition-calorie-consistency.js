require('dotenv').config();
const axios = require('axios');

async function testNutritionCalorieConsistency() {
  console.log('🧪 Testing Nutrition Plan Calorie Consistency\n');

  const baseUrl = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:4000';
  
  // Test user profile
  const testProfile = {
    id: 'test-user-123',
    full_name: 'Test User',
    age: 30,
    weight: 70, // kg
    height: 175, // cm
    gender: 'male',
    activity_level: 'moderately_active',
    fitness_strategy: 'cut', // Should result in -400 calorie adjustment
    goal_type: 'weight_loss',
    body_fat: 20
  };

  const testPreferences = ['high_protein', 'gluten_free'];

  try {
    console.log('📊 Test Profile:');
    console.log(`  - Weight: ${testProfile.weight}kg`);
    console.log(`  - Height: ${testProfile.height}cm`);
    console.log(`  - Age: ${testProfile.age}`);
    console.log(`  - Gender: ${testProfile.gender}`);
    console.log(`  - Activity: ${testProfile.activity_level}`);
    console.log(`  - Strategy: ${testProfile.fitness_strategy}`);
    console.log(`  - Goal: ${testProfile.goal_type}`);

    // Calculate expected values manually for verification using Henry/Oxford equation (same as server)
    // For 30-year-old male: 14.4 * weight + 3.13 * height + 113
    const expectedBMR = 14.4 * testProfile.weight + 3.13 * testProfile.height + 113; // Henry/Oxford male formula
    const expectedTDEE = expectedBMR * 1.55; // moderately_active multiplier
    const expectedGoalCalories = expectedTDEE - 400; // cut strategy = -400 calories
    const safeGoalCalories = Math.max(1200, expectedGoalCalories); // Safety minimum

    console.log('\n🧮 Expected Calculations:');
    console.log(`  - BMR: ${Math.round(expectedBMR)} calories`);
    console.log(`  - TDEE: ${Math.round(expectedTDEE)} calories`);
    console.log(`  - Goal Calories (with cut): ${Math.round(expectedGoalCalories)} calories`);
    console.log(`  - Safe Goal Calories: ${Math.round(safeGoalCalories)} calories`);

    // Step 1: Generate nutrition plan
    console.log('\n🍽️ Step 1: Generating nutrition plan...');
    const response = await axios.post(`${baseUrl}/api/generate-nutrition-plan`, {
      profile: testProfile,
      preferences: testPreferences,
      mealsPerDay: 3,
      snacksPerDay: 1
    });

    if (!response.data.success) {
      throw new Error(`Failed to generate nutrition plan: ${response.data.error}`);
    }

    const nutritionPlan = response.data;
    console.log('✅ Nutrition plan generated successfully');

    // Step 2: Extract and verify calorie values
    console.log('\n🔍 Step 2: Analyzing calorie consistency...');

    const metabolicCalcs = nutritionPlan.metabolic_calculations;
    const dailyTargets = nutritionPlan.daily_targets;
    const mealSchedule = nutritionPlan.daily_schedule;

    console.log('\n📈 Metabolic Calculations:');
    console.log(`  - BMR: ${metabolicCalcs.bmr} calories`);
    console.log(`  - TDEE: ${metabolicCalcs.tdee} calories`);
    console.log(`  - Goal Calories: ${metabolicCalcs.goal_calories} calories`);
    console.log(`  - Adjustment: ${metabolicCalcs.goal_adjustment} calories`);
    console.log(`  - Reason: ${metabolicCalcs.goal_adjustment_reason}`);

    console.log('\n🎯 Daily Targets:');
    console.log(`  - Calories (legacy): ${dailyTargets.calories} calories`);
    console.log(`  - Daily Calories: ${dailyTargets.daily_calories} calories`);
    console.log(`  - Protein: ${dailyTargets.protein}g (legacy) / ${dailyTargets.protein_grams}g (db)`);
    console.log(`  - Carbs: ${dailyTargets.carbs}g (legacy) / ${dailyTargets.carbs_grams}g (db)`);
    console.log(`  - Fat: ${dailyTargets.fat}g (legacy) / ${dailyTargets.fat_grams}g (db)`);

    // Calculate meal schedule totals
    let totalMealCalories = 0;
    let totalMealProtein = 0;
    let totalMealCarbs = 0;
    let totalMealFat = 0;

    console.log('\n🍎 Meal Schedule Distribution:');
    mealSchedule.forEach(meal => {
      console.log(`  - ${meal.time_slot}: ${meal.macros.calories} cal, ${meal.macros.protein}g protein, ${meal.macros.carbs}g carbs, ${meal.macros.fat}g fat`);
      totalMealCalories += meal.macros.calories;
      totalMealProtein += meal.macros.protein;
      totalMealCarbs += meal.macros.carbs;
      totalMealFat += meal.macros.fat;
    });

    console.log(`\n🧾 Meal Schedule Totals:`);
    console.log(`  - Total Calories: ${totalMealCalories}`);
    console.log(`  - Total Protein: ${totalMealProtein}g`);
    console.log(`  - Total Carbs: ${totalMealCarbs}g`);
    console.log(`  - Total Fat: ${totalMealFat}g`);

    // Step 3: Verify consistency
    console.log('\n✅ Step 3: Consistency Verification...\n');

    const issues = [];

    // Check if all calorie values match
    const targetCalories = dailyTargets.daily_calories || dailyTargets.calories;
    const goalCalories = metabolicCalcs.goal_calories;

    if (Math.abs(targetCalories - goalCalories) > 1) {
      issues.push(`❌ Daily targets calories (${targetCalories}) != Goal calories (${goalCalories})`);
    } else {
      console.log(`✅ Daily targets calories = Goal calories: ${targetCalories} cal`);
    }

    // Check if legacy and new property names match
    if (dailyTargets.calories && dailyTargets.daily_calories) {
      if (dailyTargets.calories !== dailyTargets.daily_calories) {
        issues.push(`❌ Legacy calories (${dailyTargets.calories}) != daily_calories (${dailyTargets.daily_calories})`);
      } else {
        console.log(`✅ Legacy and new calorie properties match: ${dailyTargets.calories} cal`);
      }
    }

    // Check if protein properties match
    if (dailyTargets.protein && dailyTargets.protein_grams) {
      if (dailyTargets.protein !== dailyTargets.protein_grams) {
        issues.push(`❌ Legacy protein (${dailyTargets.protein}g) != protein_grams (${dailyTargets.protein_grams}g)`);
      } else {
        console.log(`✅ Legacy and new protein properties match: ${dailyTargets.protein}g`);
      }
    }

    // Check if carbs properties match
    if (dailyTargets.carbs && dailyTargets.carbs_grams) {
      if (dailyTargets.carbs !== dailyTargets.carbs_grams) {
        issues.push(`❌ Legacy carbs (${dailyTargets.carbs}g) != carbs_grams (${dailyTargets.carbs_grams}g)`);
      } else {
        console.log(`✅ Legacy and new carbs properties match: ${dailyTargets.carbs}g`);
      }
    }

    // Check if fat properties match
    if (dailyTargets.fat && dailyTargets.fat_grams) {
      if (dailyTargets.fat !== dailyTargets.fat_grams) {
        issues.push(`❌ Legacy fat (${dailyTargets.fat}g) != fat_grams (${dailyTargets.fat_grams}g)`);
      } else {
        console.log(`✅ Legacy and new fat properties match: ${dailyTargets.fat}g`);
      }
    }

    // Check if meal schedule uses the correct calorie target
    const mealCalorieVariance = Math.abs(totalMealCalories - targetCalories) / targetCalories;
    if (mealCalorieVariance > 0.05) { // Allow 5% variance for rounding
      issues.push(`❌ Meal schedule total (${totalMealCalories}) doesn't match targets (${targetCalories}) - ${Math.round(mealCalorieVariance * 100)}% variance`);
    } else {
      console.log(`✅ Meal schedule totals match daily targets: ${totalMealCalories} cal (${Math.round(mealCalorieVariance * 100)}% variance)`);
    }

    // Check if calculated values match expected values
    const bmrVariance = Math.abs(metabolicCalcs.bmr - expectedBMR) / expectedBMR;
    const tdeeVariance = Math.abs(metabolicCalcs.tdee - expectedTDEE) / expectedTDEE;
    const goalVariance = Math.abs(metabolicCalcs.goal_calories - safeGoalCalories) / safeGoalCalories;

    if (bmrVariance > 0.01) {
      issues.push(`❌ BMR calculation off: expected ${Math.round(expectedBMR)}, got ${metabolicCalcs.bmr}`);
    } else {
      console.log(`✅ BMR calculation correct: ${metabolicCalcs.bmr} cal`);
    }

    if (tdeeVariance > 0.01) {
      issues.push(`❌ TDEE calculation off: expected ${Math.round(expectedTDEE)}, got ${metabolicCalcs.tdee}`);
    } else {
      console.log(`✅ TDEE calculation correct: ${metabolicCalcs.tdee} cal`);
    }

    if (goalVariance > 0.01) {
      issues.push(`❌ Goal calories off: expected ${Math.round(safeGoalCalories)}, got ${metabolicCalcs.goal_calories}`);
    } else {
      console.log(`✅ Goal calories calculation correct: ${metabolicCalcs.goal_calories} cal`);
    }

    // Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    if (issues.length === 0) {
      console.log('🎉 SUCCESS: All calorie values are consistent and unified!');
      console.log('✅ Goal-adjusted calories = Daily target calories = Meal schedule totals');
      console.log('✅ Legacy and new property names match perfectly');
      console.log('✅ Mathematical calculations are accurate');
      console.log('\n✨ The nutrition plan generation now uses unified calorie values throughout the system.');
    } else {
      console.log('❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n🔧 These issues need to be addressed for full consistency.');
    }

    console.log('\n📊 Summary:');
    console.log(`   - BMR: ${metabolicCalcs.bmr} cal`);
    console.log(`   - TDEE: ${metabolicCalcs.tdee} cal`);
    console.log(`   - Strategy Adjustment: ${metabolicCalcs.goal_adjustment} cal`);
    console.log(`   - Final Target: ${targetCalories} cal`);
    console.log(`   - Meal Distribution: ${totalMealCalories} cal total`);

    return issues.length === 0;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
if (require.main === module) {
  testNutritionCalorieConsistency()
    .then(success => {
      process.exit(success ? 0 : 1);
    });
}

module.exports = { testNutritionCalorieConsistency };
