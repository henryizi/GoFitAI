// Test script to verify Dorian Yates workout integration
const fs = require('fs');
const path = require('path');

// Read the bodybuilder workouts file
const workoutsPath = path.join(__dirname, 'src', 'data', 'bodybuilder-workouts.ts');
const workoutsContent = fs.readFileSync(workoutsPath, 'utf8');

console.log('🧪 Testing Dorian Yates Shadow Workout Integration');
console.log('=' .repeat(70));

// Check if Dorian Yates workout exists
if (workoutsContent.includes("name: 'Dorian Yates - Shadow'")) {
  console.log('✅ Dorian Yates - Shadow workout found');
} else {
  console.error('❌ Dorian Yates - Shadow workout NOT found');
}

// Verify key exercises from user's plan
const keyExercises = [
  'Smith Machine Shoulder Presses',
  'Lying EZ-Bar Tricep Extensions',
  'Crunches',
  'Reverse Crunches',
  'Machine Pullovers',
  'Reverse-Grip Hammer Pulldowns',
  'Wide-Grip Seated Cable Row',
  'Incline Barbell Bench Press',
  'Decline Bench Press',
  'Flat Bench Dumbbell Flys',
  'Machine Preacher Curl',
  'Leg Extensions',
  'Leg Presses',
  'Seated Hamstring Curls',
  'Calf Presses'
];

console.log('\n📋 Checking Key Exercises:');
let exerciseCount = 0;
keyExercises.forEach(exercise => {
  if (workoutsContent.includes(exercise)) {
    console.log(`✅ ${exercise}`);
    exerciseCount++;
  } else {
    console.log(`❌ ${exercise} - MISSING`);
  }
});

console.log(`\n📊 Exercise Coverage: ${exerciseCount}/${keyExercises.length} exercises found (${Math.round((exerciseCount/keyExercises.length)*100)}%)`);

// Check daily schedule structure
console.log('\n📅 Daily Schedule Check:');
const scheduleDays = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
scheduleDays.forEach(day => {
  if (workoutsContent.includes(`day: '${day}'`)) {
    console.log(`✅ ${day} - Found`);
  } else {
    console.log(`❌ ${day} - MISSING`);
  }
});

// Verify training splits
console.log('\n🏋️ Training Splits Verification:');
const splits = [
  'Shoulders, Triceps, Abs',
  'Back and Rear Delts',
  'Chest, Biceps, Abs',
  'Legs',
  'Rest day',
  'Blood & Guts mentality',
  '6x Mr. Olympia'
];

splits.forEach(split => {
  if (workoutsContent.includes(split)) {
    console.log(`✅ "${split}" - Found`);
  } else {
    console.log(`❌ "${split}" - MISSING`);
  }
});

console.log('\n🎯 Dorian Yates Shadow Workout Integration Test Complete!');
console.log('=' .repeat(70));

if (exerciseCount === keyExercises.length) {
  console.log('🎉 SUCCESS: All exercises from user\'s plan have been integrated!');
} else {
  console.log(`⚠️ PARTIAL: ${keyExercises.length - exerciseCount} exercises still need to be added`);
}
