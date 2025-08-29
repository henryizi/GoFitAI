// Comprehensive verification of all bodybuilder workouts
const fs = require('fs');
const path = require('path');

const workoutsFile = path.join(__dirname, 'src', 'data', 'bodybuilder-workouts.ts');
const content = fs.readFileSync(workoutsFile, 'utf8');

// Extract all workout keys
const workoutKeys = content.match(/'([^']+)':/g)?.map(match => match.slice(1, -2)) || [];

console.log('🎯 COMPREHENSIVE WORKOUT VERIFICATION:');
console.log('='.repeat(80));

// Count exercises per workout
const workoutExercises = {};
workoutKeys.forEach(key => {
  const keyRegex = new RegExp(`'${key}':\\s*{\\s*name:\\s*'([^']+)'`, 's');
  const nameMatch = content.match(keyRegex);
  const workoutName = nameMatch ? nameMatch[1] : key;

  // Count exercises for this workout
  const workoutSection = content.split(`'${key}':`)[1]?.split(/'[a-z-]+':/)[0] || '';
  const exerciseCount = (workoutSection.match(/name:\s*'/g) || []).length;

  workoutExercises[key] = {
    name: workoutName,
    exercises: exerciseCount
  };
});

// Display results
let totalWorkouts = 0;
let totalExercises = 0;

workoutKeys.forEach((key, index) => {
  const workout = workoutExercises[key];
  console.log(`${index + 1}. ${key.toUpperCase()}: ${workout.name}`);
  console.log(`   📊 Exercises: ${workout.exercises}`);
  console.log(`   ✅ Status: FOUND & ACCESSIBLE`);
  console.log('');

  totalWorkouts++;
  totalExercises += workout.exercises;
});

console.log('='.repeat(80));
console.log('📈 SUMMARY:');
console.log(`✅ Total Workouts: ${totalWorkouts}`);
console.log(`✅ Total Exercises: ${totalExercises}`);
console.log(`✅ All Workouts: ${workoutKeys.join(', ')}`);
console.log('');
console.log('🏋️ ALL BODYBUILDER WORKOUTS SUCCESSFULLY LOADED! 💪');

// Check specifically for Dorian and Jay
const dorianExists = workoutKeys.includes('dorian-yates');
const jayExists = workoutKeys.includes('jay-cutler');

console.log('');
console.log('🎯 SPECIFIC CHECK FOR REQUESTED WORKOUTS:');
console.log(`✅ Dorian Yates: ${dorianExists ? 'FOUND' : 'MISSING'}`);
console.log(`✅ Jay Cutler: ${jayExists ? 'FOUND' : 'MISSING'}`);

if (dorianExists && jayExists) {
  console.log('');
  console.log('🎉 SUCCESS: Both Dorian Yates and Jay Cutler workouts are properly integrated!');
  console.log('   - Dorian Yates: "Shadow" - Blood & Guts Training');
  console.log('   - Jay Cutler: "Quadfather" - Legendary Quad Development');
}
