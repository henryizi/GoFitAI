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
Generate a personalized workout plan with ${count} exercises suitable for a ${difficulty.toLowerCase()} level ${goal} workout.

IMPORTANT: Only use exercises from this approved list:
${supportedNames}

For your reference, here are the ${difficulty.toLowerCase()} level exercises:
${difficultyExercises}

CONSIDER THESE PERSONALIZATION FACTORS:
- Fitness Level: ${difficulty} - adjust intensity, volume, and complexity accordingly
- Goal: ${goal} - prioritize exercises that support this specific objective
- Recovery: Factor in appropriate rest between sets and overall program recovery

For each exercise, provide:
1. The exact exercise name (must match the approved list exactly)
2. Number of sets and reps (appropriate for ${difficulty} level)
3. Rest between sets (consider recovery needs)
4. A brief form cue or tip

Format each exercise as:
- Exercise Name: [name]
- Sets x Reps: [sets] x [reps]
- Rest Between Sets: [time in seconds]
- Tip: [brief form cue]

DO NOT include any exercises not in the approved list.
DO NOT modify or create variations of the approved exercise names.
`;
};

export const generateWeeklyWorkoutPrompt = (
  userProfile: {
    age?: number;
    gender?: string;
    height?: number;
    weight?: number;
    trainingLevel: 'Beginner' | 'Intermediate' | 'Advanced';
    primaryGoal: string;
    workoutFrequency?: string;
    activityLevel?: string;
    bodyFat?: number;
    weightTrend?: string;
    exerciseFrequency?: string;
    bodyAnalysis?: any;
  }
): string => {
  const {
    trainingLevel,
    primaryGoal,
    workoutFrequency = '4_5',
    activityLevel = 'moderately_active',
    weightTrend = 'stable'
  } = userProfile;

  // Calculate dynamic rest day recommendations based on fitness level and goals
  const getRestDayRecommendation = () => {
    if (trainingLevel === 'Beginner') {
      return '3-4 rest days per week to allow proper recovery and form development';
    } else if (trainingLevel === 'Intermediate') {
      return '2-3 rest days per week with active recovery options';
    } else { // Advanced
      return '1-2 rest days per week, can include active recovery or lighter sessions';
    }
  };

  // Adjust for goals
  const getGoalSpecificGuidance = () => {
    switch (primaryGoal.toLowerCase()) {
      case 'muscle_gain':
        return 'Focus on progressive overload, compound movements, and adequate recovery. Include rest days for muscle growth.';
      case 'fat_loss':
        return 'Include cardio elements and consider metabolic stress. Balance training with recovery to prevent burnout.';
      case 'general_fitness':
        return 'Balanced approach with compound movements and functional exercises. Include variety and active recovery.';
      default:
        return 'Balanced training approach with compound movements and progressive overload.';
    }
  };

  // Adjust for activity level
  const getActivityLevelGuidance = () => {
    switch (activityLevel) {
      case 'sedentary':
        return 'Start conservatively due to low baseline activity. More rest days recommended.';
      case 'moderately_active':
        return 'Good foundation for progressive training. Standard recovery protocols apply.';
      case 'very_active':
        return 'Higher work capacity. Can handle more frequent training but monitor for overtraining.';
      default:
        return 'Standard training approach with adequate recovery.';
    }
  };

  return `
Generate a TRULY PERSONALIZED 7-day weekly workout plan for this user:

USER PROFILE:
- Training Level: ${trainingLevel}
- Primary Goal: ${primaryGoal}
- Preferred Workout Frequency: ${workoutFrequency} days per week
- Activity Level: ${activityLevel}
- Weight Trend: ${weightTrend}

PERSONALIZATION REQUIREMENTS:
${getRestDayRecommendation()}
${getGoalSpecificGuidance()}
${getActivityLevelGuidance()}

WEEKLY STRUCTURE REQUIREMENTS:
- EXACTLY ${workoutFrequency === '2_3' ? '2-3' : workoutFrequency === '4_5' ? (userProfile.trainingLevel === 'Beginner' ? '3-4' : userProfile.trainingLevel === 'Intermediate' ? '4-5' : '5-6') : '5-6'} workout days per week (based on user preference and fitness level)
- Remaining days should be rest/recovery days
- Strategic placement of rest days for optimal recovery
- Consider muscle group recovery (e.g., don't train same groups consecutively)
- Include progressive overload principles
- Balance push/pull/legs distribution

For each day, specify:
- Day: [Day 1, Day 2, etc. or "Rest Day"]
- Focus: [Specific muscle groups, training type, or "Rest/Recovery"]
- Exercises: [3-6 exercises with name, sets, reps, rest] (ONLY for workout days)
- Rationale: [Why this day structure works for this user]
- Estimated Duration: [Time estimate] (ONLY for workout days)

CRITICAL: This plan should have the CORRECT number of workout days vs rest days based on the user's stated preference. If they want 4-5 workouts per week, create 4-5 workout days and 2-3 rest days, not the other way around.

IMPORTANT: This plan should feel uniquely tailored to this user's profile, not generic.
Consider their specific goals, fitness level, and recovery needs when designing the weekly structure.
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