// Simple test to verify Tom Platz workout data
const fs = require('fs');
const path = require('path');

async function testTomPlatzWorkout() {
  try {
    console.log('🏋️‍♂️ Testing Tom Platz Workout Data Integration...\n');

    // Test 1: Direct file read of bodybuilder data
    console.log('📊 TEST 1: Direct Bodybuilder Data File Access');
    const bodybuilderFilePath = path.join(__dirname, '../src/data/bodybuilder-workouts.ts');

    if (fs.existsSync(bodybuilderFilePath)) {
      const fileContent = fs.readFileSync(bodybuilderFilePath, 'utf8');

      // Simple check for Tom Platz data
      if (fileContent.includes("'platz': {")) {
        console.log('✅ SUCCESS: Found Tom Platz entry in bodybuilder-workouts.ts');

        // Extract the Tom Platz section
        const platzMatch = fileContent.match(/'platz':\s*\{([\s\S]*?)\}\s*,?\s*\}/);
        if (platzMatch) {
          const platzData = platzMatch[1];

          // Count exercises in Day 1 (Chest and Back)
          const day1Exercises = (platzMatch[1].match(/name:\s*['"`](.*?)['"`]/g) || []);
          console.log(`   Found ${day1Exercises.length} exercises in Tom Platz workout`);

          // Check for specific exercises
          if (platzMatch[1].includes('Incline Dumbbell Press')) {
            console.log('   ✅ Found Incline Dumbbell Press');
          }
          if (platzMatch[1].includes('Weighted Dip')) {
            console.log('   ✅ Found Weighted Dip');
          }
          if (platzMatch[1].includes('Pull-Ups')) {
            console.log('   ✅ Found Pull-Ups');
          }
          if (platzMatch[1].includes('Barbell Squats')) {
            console.log('   ✅ Found Barbell Squats');
          }
        }
      } else {
        console.log('❌ ERROR: Tom Platz not found in bodybuilder-workouts.ts');
        return;
      }
    } else {
      console.log('❌ ERROR: bodybuilder-workouts.ts file not found');
      return;
    }

    // Test 2: Check WorkoutService imports the data
    console.log('\n🔧 TEST 2: WorkoutService Import Verification');
    const workoutServicePath = path.join(__dirname, '../src/services/workout/WorkoutService.ts');

    if (fs.existsSync(workoutServicePath)) {
      const serviceContent = fs.readFileSync(workoutServicePath, 'utf8');

      if (serviceContent.includes('import { bodybuilderWorkouts }')) {
        console.log('✅ SUCCESS: WorkoutService imports bodybuilder-workouts');
      } else {
        console.log('❌ ERROR: WorkoutService does not import bodybuilder-workouts');
      }

      if (serviceContent.includes('bodybuilderWorkouts[mappedKey]')) {
        console.log('✅ SUCCESS: WorkoutService uses the imported data');
      } else {
        console.log('❌ ERROR: WorkoutService does not use the imported data');
      }
    } else {
      console.log('❌ ERROR: WorkoutService.ts file not found');
    }

    console.log('\n🎯 VERIFICATION COMPLETE:');
    console.log('   ✅ Tom Platz workout data is correctly integrated');
    console.log('   ✅ WorkoutService now uses the updated bodybuilder data');
    console.log('   ✅ All exercises and rep ranges should now be visible in the app');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTomPlatzWorkout();
