// Debug workout frequency issue
console.log('🔍 Debugging workout frequency issue...\n');

// Test the frequency mapping function
function getTargetTrainingDays(workoutFrequency) {
  switch (workoutFrequency) {
    case '2_3':
      return 3; // Use 3 days as middle ground
    case '4_5':
      return 4; // Use 4 days as middle ground
    case '6':
      return 6;
    default:
      return 4; // Default fallback
  }
}

// Test different frequency values
const testFrequencies = [
  '2_3',
  '4_5', 
  '6',
  '2-3', // Possible alternative format
  '2_3_times',
  undefined,
  null,
  ''
];

console.log('🧪 Testing frequency mapping:');
testFrequencies.forEach(freq => {
  const result = getTargetTrainingDays(freq);
  console.log(`  "${freq}" → ${result} days`);
});

// Test with a sample bodybuilder workout schedule (Arnold's typical 6-day split)
const sampleSchedule = [
  { day: 'Monday', focus: 'Chest & Back', exercises: [{ name: 'Bench Press' }] },
  { day: 'Tuesday', focus: 'Legs', exercises: [{ name: 'Squats' }] },
  { day: 'Wednesday', focus: 'Shoulders & Arms', exercises: [{ name: 'Overhead Press' }] },
  { day: 'Thursday', focus: 'Chest & Back', exercises: [{ name: 'Pull-ups' }] },
  { day: 'Friday', focus: 'Legs', exercises: [{ name: 'Deadlifts' }] },
  { day: 'Saturday', focus: 'Shoulders & Arms', exercises: [{ name: 'Bicep Curls' }] },
  { day: 'Sunday', focus: 'Rest', exercises: [] }
];

console.log('\n🔧 Testing schedule adaptation:');
console.log(`  Original schedule: ${sampleSchedule.filter(day => day.exercises.length > 0).length} training days`);

// Test adaptation for 2_3 frequency
const targetDays = getTargetTrainingDays('2_3');
console.log(`  Target days for 2_3: ${targetDays}`);

// Simulate the adaptation logic
function adaptWorkoutScheduleForFrequency(originalSchedule, targetDays, frequency) {
  const trainingDays = originalSchedule.filter(day => 
    day.exercises && day.exercises.length > 0
  );

  console.log(`    Adapting: ${trainingDays.length} → ${targetDays} days`);

  if (trainingDays.length === targetDays) {
    return originalSchedule; // No adaptation needed
  }

  if (trainingDays.length > targetDays) {
    // Need to reduce training days - select the most important ones
    const priorityOrder = [
      'chest', 'back', 'legs', 'shoulders', 'arms',
      'chest and back', 'upper body', 'lower body', 'full body'
    ];

    const prioritizedDays = trainingDays.sort((a, b) => {
      const aPriority = priorityOrder.findIndex(p =>
        a.focus.toLowerCase().includes(p)
      );
      const bPriority = priorityOrder.findIndex(p =>
        b.focus.toLowerCase().includes(p)
      );
      return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
    });

    const selectedDays = prioritizedDays.slice(0, targetDays);
    
    // Reconstruct schedule with selected days and rest days
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const adaptedSchedule = [];
    
    let dayIndex = 0;
    let trainingDayIndex = 0;
    
    for (const dayName of daysOfWeek) {
      if (trainingDayIndex < selectedDays.length && dayIndex % 2 === 0) {
        // Add training day
        adaptedSchedule.push({
          ...selectedDays[trainingDayIndex],
          day: dayName
        });
        trainingDayIndex++;
      } else {
        // Add rest day
        adaptedSchedule.push({
          day: dayName,
          focus: 'Rest',
          exercises: []
        });
      }
      dayIndex++;
    }

    return adaptedSchedule;
  } else {
    // Need to add training days - this is less common but could happen
    console.log(`    User requested more days (${targetDays}) than template has (${trainingDays.length}). Keeping all available days.`);
    return originalSchedule;
  }
}

const adapted = adaptWorkoutScheduleForFrequency(sampleSchedule, targetDays, '2_3');
const finalTrainingDays = adapted.filter(day => day.exercises && day.exercises.length > 0).length;

console.log(`  Final result: ${finalTrainingDays} training days`);
console.log(`  Expected: ${targetDays} training days`);
console.log(`  ✅ Success: ${finalTrainingDays === targetDays ? 'YES' : 'NO'}`);

if (finalTrainingDays !== targetDays) {
  console.log('\n❌ ISSUE FOUND: The adaptation is not working correctly!');
  console.log('  This could be due to:');
  console.log('  1. The workout frequency value not being passed correctly');
  console.log('  2. The adaptation logic having a bug');
  console.log('  3. The bodybuilder workout data having a different structure');
} else {
  console.log('\n✅ The logic appears to be working correctly');
  console.log('  The issue might be in how the workout frequency is being passed from the client');
}

console.log('\n📝 Next steps:');
console.log('  1. Check if workout_frequency is being passed correctly from client');
console.log('  2. Add console.log to see the actual value being received');
console.log('  3. Verify the bodybuilder workout data structure');

























































