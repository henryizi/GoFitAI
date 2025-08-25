import { getExerciseInfo } from '../../constants/exerciseNames';
import { Database } from '../../types/database';

type Exercise = Database['public']['Tables']['exercises']['Row'];

interface AnimationSource {
  uri: any; // React Native requires 'any' type for require('./path/to/file')
  type: 'url' | 'exercise' | 'category' | 'placeholder';
}

export class ExerciseAnimationService {
  private static exerciseGifs: Record<string, any> = {
    // Bodyweight
    'Push Up': require('../../../assets/videos/exercises/push_up.gif'),
    'Bodyweight Squat': require('../../../assets/videos/exercises/squat.gif'),

    // Weighted
    'Bench Press': require('../../../assets/videos/exercises/bench_press.gif'),
    'Incline Bench Press': require('../../../assets/videos/exercises/bench_press.gif'),
    'Dumbbell Press': require('../../../assets/videos/exercises/dumbbell_press.gif'),
    'Barbell Back Squat': require('../../../assets/videos/exercises/squat.gif'),
    'Front Squat': require('../../../assets/videos/exercises/squat.gif'),
    'Conventional Deadlift': require('../../../assets/videos/exercises/deadlift.gif'),
    'Romanian Deadlift': require('../../../assets/videos/exercises/deadlift.gif'),
    'Lateral Raise': require('../../../assets/videos/exercises/lateral_raise.gif'),
    'Overhead Press': require('../../../assets/videos/exercises/dumbbell_press.gif'), // Using dumbbell press as a stand-in
    'Barbell Row': require('../../../assets/videos/exercises/deadlift.gif'), // Using deadlift as a stand-in
    
    // Add more specific mappings as you create more GIFs
  };

  private static categoryGifs: Record<string, any> = {
    'Push': require('../../../assets/videos/categories/push_category.gif'),
    'Pull': require('../../../assets/videos/categories/pull_category.gif'),
    'Legs': require('../../../assets/videos/categories/legs_category.gif'),
    'Core': require('../../../assets/videos/categories/core_category.gif'),
    'Cardio': require('../../../assets/videos/categories/cardio_category.gif'),
  };

  private static placeholderGif = require('../../../assets/videos/placeholder.gif');

  /**
   * Get the appropriate animation source for an exercise, prioritizing URL.
   */
  static getAnimationSource(exercise: Exercise): AnimationSource {
    // 1. Prioritize the animation_url from the database
    if (exercise.animation_url) {
      return {
        uri: { uri: exercise.animation_url }, // React Native requires this format for network images
        type: 'url',
      };
    }

    // 2. Fall back to local, specific GIFs
    if (this.exerciseGifs[exercise.name]) {
      return {
        uri: this.exerciseGifs[exercise.name],
        type: 'exercise',
      };
    }

    // 3. Fall back to category GIFs
    const exerciseInfo = getExerciseInfo(exercise.name);
    if (exerciseInfo && this.categoryGifs[exerciseInfo.category]) {
      return {
        uri: this.categoryGifs[exerciseInfo.category],
        type: 'category',
      };
    }

    // 4. Fall back to placeholder
    return {
      uri: this.placeholderGif,
      type: 'placeholder',
    };
  }

  /**
   * Check if a specific exercise has a dedicated animation
   * @param exerciseName The name of the exercise
   * @returns boolean indicating if a specific animation exists
   */
  static hasExerciseAnimation(exerciseName: string): boolean {
    return !!this.exerciseGifs[exerciseName];
  }

  /**
   * Add a new exercise GIF to the service
   * @param exerciseName The name of the exercise
   * @param gifPath The path to the GIF file
   */
  static addExerciseGif(exerciseName: string, gifPath: any) {
    this.exerciseGifs[exerciseName] = gifPath;
  }
} 