import AsyncStorage from '@react-native-async-storage/async-storage';

interface ExerciseUsage {
  exerciseName: string;
  lastUsed: Date;
  usageCount: number;
  muscleGroups: string[];
}

interface WorkoutHistory {
  workoutDate: Date;
  exercises: string[];
  muscleGroups: string[];
}

export class ExerciseVarietyService {
  private static readonly EXERCISE_USAGE_KEY = 'exercise_usage_history';
  private static readonly WORKOUT_HISTORY_KEY = 'workout_history';
  private static readonly MAX_HISTORY_DAYS = 30;

  /**
   * Track exercise usage for variety management
   */
  static async trackExerciseUsage(exercises: Array<{ name: string; muscleGroups?: string[] }>): Promise<void> {
    try {
      const now = new Date();
      const usageData = await this.getExerciseUsage();
      
      // Update usage for each exercise
      exercises.forEach(exercise => {
        const existing = usageData.find(u => u.exerciseName === exercise.name);
        if (existing) {
          existing.lastUsed = now;
          existing.usageCount++;
        } else {
          usageData.push({
            exerciseName: exercise.name,
            lastUsed: now,
            usageCount: 1,
            muscleGroups: exercise.muscleGroups || []
          });
        }
      });

      // Store updated usage data
      await AsyncStorage.setItem(this.EXERCISE_USAGE_KEY, JSON.stringify(usageData));
      
      // Track workout history
      await this.trackWorkoutHistory(exercises.map(e => e.name), exercises.flatMap(e => e.muscleGroups || []));
    } catch (error) {
      console.error('[ExerciseVarietyService] Error tracking exercise usage:', error);
    }
  }

  /**
   * Get exercises that haven't been used recently for variety
   */
  static async getUnderusedExercises(
    targetMuscleGroups: string[],
    availableExercises: Array<{ name: string; muscleGroups: string[] }>,
    count: number = 5
  ): Promise<string[]> {
    try {
      const usageData = await this.getExerciseUsage();
      const workoutHistory = await this.getWorkoutHistory();
      
      // Get exercises used in the last 7 days
      const recentExercises = new Set<string>();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      workoutHistory
        .filter(workout => new Date(workout.workoutDate) > sevenDaysAgo)
        .forEach(workout => {
          workout.exercises.forEach(exercise => recentExercises.add(exercise));
        });

      // Filter exercises by muscle groups and find underused ones
      const eligibleExercises = availableExercises.filter(exercise => {
        const matchesMuscleGroup = exercise.muscleGroups.some(mg => 
          targetMuscleGroups.some(targetMg => 
            targetMg.toLowerCase().includes(mg.toLowerCase()) || 
            mg.toLowerCase().includes(targetMg.toLowerCase())
          )
        );
        
        const notRecentlyUsed = !recentExercises.has(exercise.name);
        
        return matchesMuscleGroup && notRecentlyUsed;
      });

      // Sort by usage count (least used first) and last used date
      eligibleExercises.sort((a, b) => {
        const usageA = usageData.find(u => u.exerciseName === a.name);
        const usageB = usageData.find(u => u.exerciseName === b.name);
        
        const countA = usageA?.usageCount || 0;
        const countB = usageB?.usageCount || 0;
        
        if (countA !== countB) {
          return countA - countB;
        }
        
        const lastUsedA = usageA?.lastUsed ? new Date(usageA.lastUsed).getTime() : 0;
        const lastUsedB = usageB?.lastUsed ? new Date(usageB.lastUsed).getTime() : 0;
        
        return lastUsedA - lastUsedB;
      });

      return eligibleExercises.slice(0, count).map(e => e.name);
    } catch (error) {
      console.error('[ExerciseVarietyService] Error getting underused exercises:', error);
      return [];
    }
  }

  /**
   * Get exercise variety score for a muscle group
   */
  static async getVarietyScore(muscleGroup: string): Promise<number> {
    try {
      const usageData = await this.getExerciseUsage();
      const workoutHistory = await this.getWorkoutHistory();
      
      // Get exercises for this muscle group used in last 14 days
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const recentExercises = new Set<string>();
      
      workoutHistory
        .filter(workout => new Date(workout.workoutDate) > fourteenDaysAgo)
        .forEach(workout => {
          if (workout.muscleGroups.some(mg => 
            mg.toLowerCase().includes(muscleGroup.toLowerCase()) || 
            muscleGroup.toLowerCase().includes(mg.toLowerCase())
          )) {
            workout.exercises.forEach(exercise => recentExercises.add(exercise));
          }
        });

      // Score based on number of different exercises used
      const exerciseCount = recentExercises.size;
      if (exerciseCount >= 8) return 10; // Excellent variety
      if (exerciseCount >= 6) return 8;  // Good variety
      if (exerciseCount >= 4) return 6;  // Moderate variety
      if (exerciseCount >= 2) return 4;  // Limited variety
      return 2; // Poor variety
    } catch (error) {
      console.error('[ExerciseVarietyService] Error getting variety score:', error);
      return 5; // Default moderate score
    }
  }

  /**
   * Get variety recommendations for a muscle group
   */
  static async getVarietyRecommendations(
    muscleGroup: string,
    availableExercises: Array<{ name: string; muscleGroups: string[] }>
  ): Promise<string[]> {
    try {
      const varietyScore = await this.getVarietyScore(muscleGroup);
      
      if (varietyScore >= 8) {
        return ['Great variety! Keep rotating exercises to maintain progress.'];
      }
      
      const underusedExercises = await this.getUnderusedExercises(
        [muscleGroup],
        availableExercises,
        3
      );
      
      if (underusedExercises.length === 0) {
        return ['Try adding more exercise variations for this muscle group.'];
      }
      
      return [
        `Consider adding these exercises for more variety: ${underusedExercises.join(', ')}`,
        'Rotate exercises every 2-3 weeks to prevent adaptation.'
      ];
    } catch (error) {
      console.error('[ExerciseVarietyService] Error getting variety recommendations:', error);
      return ['Focus on progressive overload and proper form.'];
    }
  }

  /**
   * Clear old workout history to prevent storage bloat
   */
  static async cleanupOldHistory(): Promise<void> {
    try {
      const workoutHistory = await this.getWorkoutHistory();
      const cutoffDate = new Date(Date.now() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      
      const filteredHistory = workoutHistory.filter(workout => 
        new Date(workout.workoutDate) > cutoffDate
      );
      
      await AsyncStorage.setItem(this.WORKOUT_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('[ExerciseVarietyService] Error cleaning up history:', error);
    }
  }

  /**
   * Get exercise usage data from storage
   */
  private static async getExerciseUsage(): Promise<ExerciseUsage[]> {
    try {
      const data = await AsyncStorage.getItem(this.EXERCISE_USAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[ExerciseVarietyService] Error getting exercise usage:', error);
      return [];
    }
  }

  /**
   * Get workout history from storage
   */
  private static async getWorkoutHistory(): Promise<WorkoutHistory[]> {
    try {
      const data = await AsyncStorage.getItem(this.WORKOUT_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[ExerciseVarietyService] Error getting workout history:', error);
      return [];
    }
  }

  /**
   * Track workout history
   */
  private static async trackWorkoutHistory(exercises: string[], muscleGroups: string[]): Promise<void> {
    try {
      const history = await this.getWorkoutHistory();
      
      history.push({
        workoutDate: new Date(),
        exercises,
        muscleGroups
      });
      
      // Keep only recent history
      const cutoffDate = new Date(Date.now() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(workout => 
        new Date(workout.workoutDate) > cutoffDate
      );
      
      await AsyncStorage.setItem(this.WORKOUT_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('[ExerciseVarietyService] Error tracking workout history:', error);
    }
  }
}


