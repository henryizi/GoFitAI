// Test workout frequency integration workflow
console.log('🧪 Testing workout frequency integration workflow...\n');

// Simulate the client-side data
const clientInput = {
  userId: 'test-user-123',
  height: 175,
  weight: 70,
  age: 25,
  gender: 'male',
  fullName: 'Test User',
  fatLossGoal: 2,
  muscleGainGoal: 3,
  trainingLevel: 'intermediate',
  primaryGoal: 'muscle_gain',
  workoutFrequency: '2_3', // This should be passed from client
  emulateBodybuilder: 'arnold'
};

console.log('📱 Client input:', {
  workoutFrequency: clientInput.workoutFrequency,
  type: typeof clientInput.workoutFrequency,
  hasValue: !!clientInput.workoutFrequency
});

// Simulate the enhanceInputWithUserData function
function enhanceInputWithUserData(input) {
  // Simulate database profile data
  const profileData = {
    id: 'test-user-123',
    workout_frequency: '2_3', // This should match what's in the database
    training_level: 'intermediate',
    primary_goal: 'muscle_gain'
  };

  const enhancedInput = {
    ...input,
    workoutFrequency: input.workoutFrequency || profileData.workout_frequency || undefined,
  };

  console.log('🔄 Enhanced input:', {
    inputWorkoutFrequency: input.workoutFrequency,
    profileWorkoutFrequency: profileData.workout_frequency,
    finalWorkoutFrequency: enhancedInput.workoutFrequency
  });

  return enhancedInput;
}

// Simulate the getTargetTrainingDays function
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

// Simulate the bodybuilder workout data (Arnold's 6-day split)
const bodybuilderData = {
  weeklySchedule: [
    { day: 'Monday', focus: 'Chest & Back', exercises: [{ name: 'Bench Press' }] },
    { day: 'Tuesday', focus: 'Legs', exercises: [{ name: 'Squats' }] },
    { day: 'Wednesday', focus: 'Shoulders & Arms', exercises: [{ name: 'Overhead Press' }] },
    { day: 'Thursday', focus: 'Chest & Back', exercises: [{ name: 'Pull-ups' }] },
    { day: 'Friday', focus: 'Legs', exercises: [{ name: 'Deadlifts' }] },
    { day: 'Saturday', focus: 'Shoulders & Arms', exercises: [{ name: 'Bicep Curls' }] },
    { day: 'Sunday', focus: 'Rest', exercises: [] }
  ]
};

// Test the complete workflow
console.log('🔄 Testing complete workflow...\n');

// Step 1: Client sends data
console.log('1️⃣ Client sends data with workout frequency:', clientInput.workoutFrequency);

// Step 2: Enhance with user data
const enhancedInput = enhanceInputWithUserData(clientInput);
console.log('2️⃣ Enhanced input workout frequency:', enhancedInput.workoutFrequency);

// Step 3: Get target training days
const targetDays = getTargetTrainingDays(enhancedInput.workoutFrequency);
console.log('3️⃣ Target training days:', targetDays);

// Step 4: Check if adaptation is needed
const currentTrainingDays = bodybuilderData.weeklySchedule.filter(day => 
  day.exercises && day.exercises.length > 0
).length;

console.log('4️⃣ Current training days in template:', currentTrainingDays);
console.log('5️⃣ Adaptation needed:', currentTrainingDays !== targetDays ? 'YES' : 'NO');

if (currentTrainingDays !== targetDays) {
  console.log('6️⃣ Adapting schedule from', currentTrainingDays, 'to', targetDays, 'days');
  
  // Simulate adaptation logic
  const priorityOrder = ['chest', 'back', 'legs', 'shoulders', 'arms'];
  const trainingDays = bodybuilderData.weeklySchedule.filter(day => 
    day.exercises && day.exercises.length > 0
  );
  
  const prioritizedDays = trainingDays.sort((a, b) => {
    const aPriority = priorityOrder.findIndex(p => a.focus.toLowerCase().includes(p));
    const bPriority = priorityOrder.findIndex(p => b.focus.toLowerCase().includes(p));
    return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
  });
  
  const selectedDays = prioritizedDays.slice(0, targetDays);
  console.log('7️⃣ Selected days:', selectedDays.map(day => day.focus));
  
  const finalTrainingDays = selectedDays.length;
  console.log('8️⃣ Final result:', finalTrainingDays, 'training days');
  console.log('✅ Success:', finalTrainingDays === targetDays ? 'YES' : 'NO');
} else {
  console.log('6️⃣ No adaptation needed');
}

console.log('\n📝 Summary:');
console.log('  - Client sends workout frequency:', clientInput.workoutFrequency);
console.log('  - Enhanced input workout frequency:', enhancedInput.workoutFrequency);
console.log('  - Target training days:', targetDays);
console.log('  - Expected result: 3 training days for 2_3 frequency');
console.log('  - If you\'re still getting 4 days, check the console logs in the app');




