import { SUPPORTED_EXERCISES, ExerciseInfo, getExerciseInfo } from '../constants/exerciseNames';

/**
 * Metabolic Equivalent Task (MET) values for different exercise types
 * Based on research from the Compendium of Physical Activities
 */
export interface ExerciseCalorieData {
  category: string;
  exerciseType: 'strength' | 'cardio' | 'mixed';
  baseMetValue: number; // Base MET value
  difficultyMultiplier: {
    Beginner: number;
    Intermediate: number;
    Advanced: number;
  };
  equipmentMultiplier?: {
    Bodyweight?: number;
    Dumbbell?: number;
    Barbell?: number;
    Kettlebell?: number;
    'Cable Machine'?: number;
    Machine?: number;
    'Resistance Band'?: number;
    Plate?: number;
  };
}

/**
 * Comprehensive MET values for different exercise categories
 * These values are based on scientific research and real-world measurements
 */
const EXERCISE_CALORIE_DATABASE: Record<string, ExerciseCalorieData> = {
  // Strength Training Categories
  Push: {
    category: 'Push',
    exerciseType: 'strength',
    baseMetValue: 5.0, // Moderate resistance training
    difficultyMultiplier: {
      Beginner: 0.8,    // 4.0 METs
      Intermediate: 1.0, // 5.0 METs
      Advanced: 1.3      // 6.5 METs
    },
    equipmentMultiplier: {
      Bodyweight: 0.9,      // Slightly lower intensity
      Dumbbell: 1.0,        // Base intensity
      Barbell: 1.2,         // Higher intensity due to more weight
      Kettlebell: 1.1,      // Slightly higher due to stabilization
      'Cable Machine': 0.95, // Controlled movement
      Machine: 0.85,        // Most controlled, lower stabilization
      'Resistance Band': 0.8, // Lower resistance typically
      Plate: 1.1            // Similar to dumbbell but often heavier
    }
  },
  
  Pull: {
    category: 'Pull',
    exerciseType: 'strength',
    baseMetValue: 5.2, // Slightly higher than push due to larger muscle groups
    difficultyMultiplier: {
      Beginner: 0.8,    // 4.16 METs
      Intermediate: 1.0, // 5.2 METs
      Advanced: 1.4      // 7.28 METs (pull-ups are very demanding)
    },
    equipmentMultiplier: {
      Bodyweight: 1.2,      // Pull-ups are very demanding
      Dumbbell: 1.0,        // Base intensity
      Barbell: 1.15,        // Heavy rows
      Kettlebell: 1.05,     // Swings and pulls
      'Cable Machine': 0.9,  // Controlled movement
      Machine: 0.8,         // Assisted movements
      'Resistance Band': 0.75, // Lower resistance
      Plate: 1.0            // Similar to dumbbell
    }
  },
  
  Legs: {
    category: 'Legs',
    exerciseType: 'strength',
    baseMetValue: 6.0, // Highest MET value due to largest muscle groups
    difficultyMultiplier: {
      Beginner: 0.75,   // 4.5 METs
      Intermediate: 1.0, // 6.0 METs
      Advanced: 1.35     // 8.1 METs (heavy squats/deadlifts)
    },
    equipmentMultiplier: {
      Bodyweight: 0.8,      // Lower intensity
      Dumbbell: 1.0,        // Base intensity
      Barbell: 1.3,         // Heavy squats/deadlifts
      Kettlebell: 1.15,     // Dynamic movements
      'Cable Machine': 0.95, // Leg press, extensions
      Machine: 0.9,         // Most controlled
      'Resistance Band': 0.7, // Lower resistance
      Plate: 1.05           // Weighted movements
    }
  },
  
  Core: {
    category: 'Core',
    exerciseType: 'strength',
    baseMetValue: 3.8, // Lower intensity, more endurance-based
    difficultyMultiplier: {
      Beginner: 0.8,    // 3.04 METs
      Intermediate: 1.0, // 3.8 METs
      Advanced: 1.3      // 4.94 METs
    },
    equipmentMultiplier: {
      Bodyweight: 1.0,      // Most common for core
      Dumbbell: 1.2,        // Added resistance
      Barbell: 1.3,         // Heavy core work
      Kettlebell: 1.15,     // Dynamic core training
      'Cable Machine': 1.1,  // Cable crunches, woodchops
      Machine: 0.9,         // Assisted core machines
      'Resistance Band': 0.85, // Lower resistance
      Plate: 1.2            // Weighted core exercises
    }
  },
  
  Cardio: {
    category: 'Cardio',
    exerciseType: 'cardio',
    baseMetValue: 8.0, // High intensity cardio
    difficultyMultiplier: {
      Beginner: 0.75,   // 6.0 METs
      Intermediate: 1.0, // 8.0 METs
      Advanced: 1.25     // 10.0 METs
    },
    equipmentMultiplier: {
      Bodyweight: 1.0,      // Burpees, jump rope, etc.
      Dumbbell: 1.15,       // Weighted cardio
      Barbell: 1.2,         // Thrusters, etc.
      Kettlebell: 1.3,      // Kettlebell swings are very intense
      'Cable Machine': 0.9,  // Cable cardio movements
      Machine: 0.85,        // Cardio machines
      'Resistance Band': 0.8, // Lower intensity
      Plate: 1.1            // Weighted cardio
    }
  }
};

/**
 * Calculate calories burned for a single exercise
 * Formula: METs × weight(kg) × time(hours) = calories burned
 */
export function calculateExerciseCalories(
  exerciseName: string,
  sets: number,
  reps: number,
  userWeight: number = 70, // kg
  restTimeBetweenSets: number = 60 // seconds
): number {
  // Get exercise information
  const exerciseInfo = getExerciseInfo(exerciseName);
  
  if (!exerciseInfo) {
    // Fallback for unknown exercises
    return estimateCaloriesForUnknownExercise(sets, reps, userWeight);
  }
  
  // Get calorie data for this exercise category
  const calorieData = EXERCISE_CALORIE_DATABASE[exerciseInfo.category];
  
  if (!calorieData) {
    return estimateCaloriesForUnknownExercise(sets, reps, userWeight);
  }
  
  // Calculate base MET value with multipliers
  const difficultyMult = calorieData.difficultyMultiplier[exerciseInfo.difficulty];
  const equipmentMult = calorieData.equipmentMultiplier?.[exerciseInfo.equipment!] || 1.0;
  
  const finalMetValue = calorieData.baseMetValue * difficultyMult * equipmentMult;
  
  // Estimate exercise duration
  const exerciseDuration = estimateExerciseDuration(exerciseInfo, sets, reps, restTimeBetweenSets);
  
  // Calculate calories: METs × weight(kg) × time(hours)
  const calories = finalMetValue * userWeight * (exerciseDuration / 3600); // Convert seconds to hours
  
  return Math.round(calories);
}

/**
 * Estimate the duration of an exercise based on type, sets, and reps
 */
function estimateExerciseDuration(
  exerciseInfo: ExerciseInfo,
  sets: number,
  reps: number,
  restTimeBetweenSets: number
): number {
  // Time per rep estimates (in seconds)
  const timePerRep = getTimePerRep(exerciseInfo);
  
  // Calculate working time
  const workingTime = sets * reps * timePerRep;
  
  // Add rest time (rest between sets, not after the last set)
  const restTime = Math.max(0, sets - 1) * restTimeBetweenSets;
  
  return workingTime + restTime;
}

/**
 * Get estimated time per rep for different exercise types
 */
function getTimePerRep(exerciseInfo: ExerciseInfo): number {
  // Time per rep in seconds based on exercise characteristics
  const baseTimePerRep: Record<string, number> = {
    Push: 3.0,    // Push-ups, bench press (controlled tempo)
    Pull: 3.5,    // Pull-ups, rows (often slower eccentric)
    Legs: 4.0,    // Squats, deadlifts (larger range of motion)
    Core: 2.5,    // Crunches, planks (often held positions)
    Cardio: 1.5   // Fast, explosive movements
  };
  
  let timePerRep = baseTimePerRep[exerciseInfo.category] || 3.0;
  
  // Adjust based on difficulty (advanced exercises often require slower, more controlled movement)
  const difficultyMultiplier = {
    Beginner: 0.9,      // Faster, less controlled
    Intermediate: 1.0,   // Normal tempo
    Advanced: 1.2       // Slower, more controlled
  };
  
  timePerRep *= difficultyMultiplier[exerciseInfo.difficulty];
  
  // Adjust based on equipment
  const equipmentMultiplier: Record<string, number> = {
    Bodyweight: 1.0,
    Dumbbell: 1.1,      // Slightly slower for stabilization
    Barbell: 1.2,       // Slower for safety
    Kettlebell: 0.9,    // Often more dynamic
    'Cable Machine': 1.0,
    Machine: 0.8,       // Guided motion, faster
    'Resistance Band': 0.9,
    Plate: 1.0
  };
  
  if (exerciseInfo.equipment) {
    timePerRep *= equipmentMultiplier[exerciseInfo.equipment] || 1.0;
  }
  
  return timePerRep;
}

/**
 * Fallback calorie estimation for unknown exercises
 */
function estimateCaloriesForUnknownExercise(
  sets: number,
  reps: number,
  userWeight: number
): number {
  // Use a moderate MET value for unknown exercises
  const estimatedMET = 4.5;
  
  // Estimate 3 seconds per rep + 60 seconds rest between sets
  const estimatedDuration = (sets * reps * 3) + ((sets - 1) * 60);
  
  // Calculate calories
  const calories = estimatedMET * userWeight * (estimatedDuration / 3600);
  
  return Math.round(calories);
}

/**
 * Calculate total calories for a complete workout
 */
export function calculateWorkoutCalories(
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
  }>,
  userWeight: number = 70,
  restTimeBetweenSets: number = 60,
  restTimeBetweenExercises: number = 120
): {
  totalCalories: number;
  exerciseBreakdown: Array<{
    name: string;
    calories: number;
    sets: number;
    reps: number;
  }>;
  estimatedDuration: number; // in minutes
} {
  let totalCalories = 0;
  let totalDuration = 0;
  const exerciseBreakdown: Array<{
    name: string;
    calories: number;
    sets: number;
    reps: number;
  }> = [];
  
  exercises.forEach((exercise, index) => {
    const calories = calculateExerciseCalories(
      exercise.name,
      exercise.sets,
      exercise.reps,
      userWeight,
      restTimeBetweenSets
    );
    
    totalCalories += calories;
    
    exerciseBreakdown.push({
      name: exercise.name,
      calories,
      sets: exercise.sets,
      reps: exercise.reps
    });
    
    // Add exercise duration
    const exerciseInfo = getExerciseInfo(exercise.name);
    if (exerciseInfo) {
      const exerciseDuration = estimateExerciseDuration(
        exerciseInfo,
        exercise.sets,
        exercise.reps,
        restTimeBetweenSets
      );
      totalDuration += exerciseDuration;
    } else {
      // Fallback duration estimation
      totalDuration += (exercise.sets * exercise.reps * 3) + ((exercise.sets - 1) * restTimeBetweenSets);
    }
    
    // Add rest between exercises (except after the last exercise)
    if (index < exercises.length - 1) {
      totalDuration += restTimeBetweenExercises;
    }
  });
  
  return {
    totalCalories,
    exerciseBreakdown,
    estimatedDuration: Math.round(totalDuration / 60) // Convert to minutes
  };
}

/**
 * Get calorie estimation for different workout intensities
 */
export function getIntensityMultiplier(intensity: 'light' | 'moderate' | 'high' | 'extreme'): number {
  const multipliers = {
    light: 0.8,     // Taking longer rests, lower intensity
    moderate: 1.0,  // Normal intensity
    high: 1.2,      // Shorter rests, higher intensity
    extreme: 1.4    // Minimal rest, maximum intensity
  };
  
  return multipliers[intensity];
}

/**
 * Adjust calories based on user fitness level and workout intensity
 */
export function adjustCaloriesForUserProfile(
  baseCalories: number,
  userProfile: {
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
    age?: number;
    gender?: 'male' | 'female';
    intensity?: 'light' | 'moderate' | 'high' | 'extreme';
  }
): number {
  let adjustedCalories = baseCalories;
  
  // Fitness level adjustment (more experienced users burn slightly more calories due to better form and intensity)
  if (userProfile.fitnessLevel) {
    const fitnessMultipliers = {
      beginner: 0.9,     // Lower efficiency, but also lower intensity
      intermediate: 1.0,  // Base level
      advanced: 1.1       // Higher efficiency and intensity
    };
    adjustedCalories *= fitnessMultipliers[userProfile.fitnessLevel];
  }
  
  // Age adjustment (metabolism decreases with age)
  if (userProfile.age) {
    if (userProfile.age >= 65) {
      adjustedCalories *= 0.85;
    } else if (userProfile.age >= 50) {
      adjustedCalories *= 0.9;
    } else if (userProfile.age >= 35) {
      adjustedCalories *= 0.95;
    }
    // No adjustment for ages 18-34 (peak metabolism)
  }
  
  // Gender adjustment (males typically burn slightly more calories due to higher muscle mass)
  if (userProfile.gender === 'female') {
    adjustedCalories *= 0.95;
  }
  
  // Intensity adjustment
  if (userProfile.intensity) {
    adjustedCalories *= getIntensityMultiplier(userProfile.intensity);
  }
  
  return Math.round(adjustedCalories);
}

/**
 * Quick estimation for custom workout plans
 * This provides a fast estimation when detailed exercise breakdown isn't available
 */
export function quickWorkoutCalorieEstimate(
  totalExercises: number,
  estimatedDuration: number, // in minutes
  userWeight: number = 70,
  workoutType: 'strength' | 'cardio' | 'mixed' = 'mixed'
): number {
  // Base MET values for different workout types
  const baseMetValues = {
    strength: 5.0,
    cardio: 8.0,
    mixed: 6.0
  };
  
  const metValue = baseMetValues[workoutType];
  
  // Calculate base calories
  const baseCalories = metValue * userWeight * (estimatedDuration / 60);
  
  // Adjust based on number of exercises (more exercises = higher intensity)
  const exerciseMultiplier = Math.min(1.3, 0.8 + (totalExercises * 0.05));
  
  return Math.round(baseCalories * exerciseMultiplier);
}

