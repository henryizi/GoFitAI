import { DeepSeekService } from '../src/services/ai/deepseek';

async function testWorkoutPlans() {
  try {
    // Test Case 1: Minimal Equipment (Home Workout)
    console.log('\n=== Home Workout (Dumbbells Only) ===\n');
    const homeWorkout = await DeepSeekService.generateWorkoutPlan({
      height: 175,
      weight: 75,
      age: 25,
      gender: 'male',
      fatLossGoal: 3,
      muscleGainGoal: 4,
      trainingLevel: 'beginner',
      availableEquipment: ['Dumbbell']
    });
    console.log(JSON.stringify(homeWorkout, null, 2));

    // Test Case 2: Full Gym Access
    console.log('\n=== Full Gym Workout (All Equipment) ===\n');
    const gymWorkout = await DeepSeekService.generateWorkoutPlan({
      height: 175,
      weight: 75,
      age: 25,
      gender: 'male',
      fatLossGoal: 3,
      muscleGainGoal: 4,
      trainingLevel: 'intermediate',
      availableEquipment: ['Dumbbell', 'Barbell', 'Kettlebell', 'Cable Machine', 'Plate']
    });
    console.log(JSON.stringify(gymWorkout, null, 2));

  } catch (error) {
    console.error('Error testing workout plans:', error);
  }
}

testWorkoutPlans(); 