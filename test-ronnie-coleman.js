// Simple test to verify Ronnie Coleman's workout data
const fs = require('fs');
const path = require('path');

// Read the bodybuilder workouts file
const workoutsPath = path.join(__dirname, 'src', 'data', 'bodybuilder-workouts.ts');
const workoutsContent = fs.readFileSync(workoutsPath, 'utf8');

// Extract the bodybuilderWorkouts object (simple regex approach)
const workoutsMatch = workoutsContent.match(/export const bodybuilderWorkouts: Record<string, BodybuilderWorkout> = ({[\s\S]*?});/);
if (!workoutsMatch) {
  console.error('Could not find bodybuilderWorkouts object');
  process.exit(1);
}

console.log('✅ Bodybuilder workouts file found');
console.log('✅ File contains workout data');

// Check if coleman key exists
if (workoutsContent.includes("'coleman':")) {
  console.log('✅ Ronnie Coleman (coleman) workout found in data');
} else {
  console.error('❌ Ronnie Coleman workout NOT found in data');
}

// Check for key workout elements
const workoutElements = [
  'name: \'Ronnie Coleman\'',
  '8x Mr. Olympia',
  'Day 1',
  'Barbell Squat',
  'Day 7',
  'Rest'
];

workoutElements.forEach(element => {
  if (workoutsContent.includes(element)) {
    console.log(`✅ Found: ${element}`);
  } else {
    console.log(`❌ Missing: ${element}`);
  }
});

console.log('\n🎉 Ronnie Coleman workout integration test complete!');
