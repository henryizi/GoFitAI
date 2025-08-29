// Test script to verify Arnold Schwarzenegger Chest & Back (Version 1) workout integration
const fs = require('fs');
const path = require('path');

// Read the bodybuilder workouts file
const workoutsPath = path.join(__dirname, 'src', 'data', 'bodybuilder-workouts.ts');
const workoutsContent = fs.readFileSync(workoutsPath, 'utf8');

console.log('🧪 Testing Arnold Schwarzenegger Chest & Back (Version 1) Integration');
console.log('=' .repeat(70));

// Check if Arnold workout exists
if (workoutsContent.includes("name: 'Arnold Schwarzenegger - Chest & Back (Version 1)'")) {
  console.log('✅ Arnold Schwarzenegger Chest & Back (Version 1) workout found');
} else {
  console.error('❌ Arnold Schwarzenegger Chest & Back (Version 1) workout NOT found');
}

// Verify key exercises from user's plan
const keyExercises = [
  'Flat Barbell Bench Press',
  'Bent Over Rows',
  'Dumbbell Incline Bench Press',
  'Cable Crossovers',
  'Dumbbell Pullovers',
  'Seated Cable Rows',
  'Incline Barbell Bench Press',
  'Pull-Ups',
  'Dumbbell Pec Flyes',
  'Kroc Rows',
  'Dips',
  'Lat Pulldowns',
  'Overhead Press',
  'Seated Arnold Press',
  'Lateral Raises',
  'EZ Curl Bar Bicep Curls',
  'Hammer Curls',
  'Skull Crushers',
  'Seated Dumbbell Press',
  'Face Pulls',
  'Close Grip Bench Press',
  'Overhead Tricep Extensions',
  'Bicep 21s',
  'Shrugs',
  'Squats',
  'Straight-Leg Deadlifts',
  'Leg Press',
  'Hamstring Curls',
  'Calf Raises',
  'Deadlifts',
  'Hack Squat',
  'Good Mornings',
  'Glute Ham Raise',
  'Leg Extensions',
  'Cable Crunches',
  'Lying Leg Raise'
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

// Check weekly schedule structure
console.log('\n📅 Weekly Schedule Check:');
const scheduleDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
scheduleDays.forEach(day => {
  if (workoutsContent.includes(`day: '${day}'`)) {
    console.log(`✅ ${day} - Found`);
  } else {
    console.log(`❌ ${day} - MISSING`);
  }
});

// Verify specific training splits
console.log('\n🏋️ Training Splits Verification:');
const splits = [
  'AM: Chest, PM: Back',
  'AM: Shoulders, PM: Arms',
  'AM: Chest, PM: Back, Legs, Abs, Calves',
  'Chest & Back (Version 1)',
  'Double session day',
  'Triple session day'
];

splits.forEach(split => {
  if (workoutsContent.includes(split)) {
    console.log(`✅ "${split}" - Found`);
  } else {
    console.log(`❌ "${split}" - MISSING`);
  }
});

console.log('\n🎯 Arnold Schwarzenegger Chest & Back (Version 1) Integration Test Complete!');
console.log('=' .repeat(70));

if (exerciseCount === keyExercises.length) {
  console.log('🎉 SUCCESS: All exercises from user\'s plan have been integrated!');
} else {
  console.log(`⚠️ PARTIAL: ${keyExercises.length - exerciseCount} exercises still need to be added`);
}
