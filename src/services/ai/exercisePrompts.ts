import { getExerciseNamesForPrompt, SUPPORTED_EXERCISES } from '../../constants/exerciseNames';

export const generateExercisePrompt = (
  goal: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  count: number = 5
): string => {
  const supportedNames = getExerciseNamesForPrompt();
  const difficultyExercises = SUPPORTED_EXERCISES
    .filter(ex => ex.difficulty === difficulty)
    .map(ex => ex.name)
    .join(", ");

  return `
Generate a workout plan with ${count} exercises suitable for a ${difficulty.toLowerCase()} level ${goal} workout.

IMPORTANT: Only use exercises from this approved list:
${supportedNames}

For your reference, here are the ${difficulty.toLowerCase()} level exercises:
${difficultyExercises}

For each exercise, provide:
1. The exact exercise name (must match the approved list exactly)
2. Number of sets and reps
3. A brief form cue or tip

Format each exercise as:
- Exercise Name: [name]
- Sets x Reps: [sets] x [reps]
- Tip: [brief form cue]

DO NOT include any exercises not in the approved list.
DO NOT modify or create variations of the approved exercise names.
`;
};

export const validateAIResponse = (
  exerciseNames: string[]
): { valid: boolean; invalidExercises: string[] } => {
  const invalidExercises = exerciseNames.filter(
    name => !SUPPORTED_EXERCISES.some(
      ex => ex.name.toLowerCase() === name.trim().toLowerCase()
    )
  );

  return {
    valid: invalidExercises.length === 0,
    invalidExercises
  };
}; 