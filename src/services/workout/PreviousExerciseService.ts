import { supabase } from '../supabase/client';

export interface PreviousExerciseData {
  exerciseId: string;
  exerciseName: string;
  lastPerformed: string | null; // ISO date string
  sets: {
    reps: number;
    weight: number | null;
    weightUnit: 'kg' | 'lbs';
    completedAt: string;
  }[];
  topSetWeight: number | null;
  totalVolume: number;
}

export class PreviousExerciseService {
  /**
   * Fetches the most recent performance data for a specific exercise by a user.
   * This looks through workout_history to find the last time this exercise was performed.
   * 
   * @param userId - The user's ID
   * @param exerciseId - The exercise ID to look up
   * @returns PreviousExerciseData or null if no previous data found
   */
  static async getLastPerformedExercise(
    userId: string, 
    exerciseId: string
  ): Promise<PreviousExerciseData | null> {
    try {
      if (!supabase) {
        console.warn('[PreviousExerciseService] Supabase client not initialized');
        return null;
      }

      // Query workout_history for workouts by this user, ordered by most recent
      const { data: historyData, error: historyError } = await supabase
        .from('workout_history')
        .select('id, completed_at, exercises_data')
        .eq('user_id', userId)
        .not('exercises_data', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(50); // Look at last 50 workouts

      if (historyError) {
        console.error('[PreviousExerciseService] Error fetching workout history:', historyError);
        return null;
      }

      if (!historyData || historyData.length === 0) {
        console.log('[PreviousExerciseService] No workout history found for user');
        return null;
      }

      // Search through workout history for the most recent occurrence of this exercise
      for (const workout of historyData) {
        const exercisesData = workout.exercises_data as any[];
        
        if (!Array.isArray(exercisesData)) {
          continue;
        }

        // Find the exercise in this workout
        const exerciseEntry = exercisesData.find(
          (ex: any) => ex.exercise_id === exerciseId
        );

        if (exerciseEntry && Array.isArray(exerciseEntry.sets) && exerciseEntry.sets.length > 0) {
          // Found the exercise! Extract the data
          const sets = exerciseEntry.sets.map((set: any) => ({
            reps: set.reps || 0,
            weight: set.weight || null,
            weightUnit: set.weight_unit || 'kg',
            completedAt: set.completed_at || workout.completed_at
          }));

          // Calculate top set weight and total volume
          let topSetWeight: number | null = null;
          let totalVolume = 0;

          sets.forEach((set: any) => {
            if (set.weight !== null) {
              if (topSetWeight === null || set.weight > topSetWeight) {
                topSetWeight = set.weight;
              }
              totalVolume += set.reps * set.weight;
            }
          });

          return {
            exerciseId: exerciseId,
            exerciseName: exerciseEntry.exercise_name || 'Exercise',
            lastPerformed: workout.completed_at,
            sets: sets,
            topSetWeight: topSetWeight,
            totalVolume: totalVolume
          };
        }
      }

      // Also check exercise_logs table as fallback for older data
      const { data: logsData, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
          id,
          actual_reps,
          actual_weight,
          completed_at,
          exercise_sets!inner(
            exercise_id,
            session_id,
            workout_sessions!inner(
              completed_at
            )
          )
        `)
        .eq('exercise_sets.exercise_id', exerciseId)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (logsError) {
        console.error('[PreviousExerciseService] Error fetching exercise logs:', logsError);
        return null;
      }

      if (logsData && logsData.length > 0) {
        // Group logs by session to get the most recent complete session
        const logsBySession: Record<string, any[]> = {};
        logsData.forEach((log: any) => {
          const sessionId = log.exercise_sets?.session_id;
          if (sessionId) {
            if (!logsBySession[sessionId]) {
              logsBySession[sessionId] = [];
            }
            logsBySession[sessionId].push(log);
          }
        });

        // Get the most recent session
        const sessionIds = Object.keys(logsBySession);
        if (sessionIds.length > 0) {
          const mostRecentSessionId = sessionIds[0];
          const sessionLogs = logsBySession[mostRecentSessionId];

          const sets = sessionLogs.map((log: any) => ({
            reps: log.actual_reps || 0,
            weight: log.actual_weight || null,
            weightUnit: 'kg' as const, // exercise_logs stores in kg
            completedAt: log.completed_at
          }));

          let topSetWeight: number | null = null;
          let totalVolume = 0;

          sets.forEach((set: any) => {
            if (set.weight !== null) {
              if (topSetWeight === null || set.weight > topSetWeight) {
                topSetWeight = set.weight;
              }
              totalVolume += set.reps * set.weight;
            }
          });

          return {
            exerciseId: exerciseId,
            exerciseName: 'Exercise', // Name not available from logs
            lastPerformed: sessionLogs[0].completed_at,
            sets: sets,
            topSetWeight: topSetWeight,
            totalVolume: totalVolume
          };
        }
      }

      console.log('[PreviousExerciseService] No previous data found for exercise:', exerciseId);
      return null;
    } catch (error) {
      console.error('[PreviousExerciseService] Exception in getLastPerformedExercise:', error);
      return null;
    }
  }

  /**
   * Fetches previous exercise data for multiple exercises at once.
   * This is more efficient than calling getLastPerformedExercise multiple times.
   * 
   * @param userId - The user's ID
   * @param exerciseIds - Array of exercise IDs to look up
   * @returns Map of exerciseId -> PreviousExerciseData
   */
  static async getLastPerformedExercises(
    userId: string,
    exerciseIds: string[]
  ): Promise<Map<string, PreviousExerciseData>> {
    const results = new Map<string, PreviousExerciseData>();

    try {
      if (!supabase || exerciseIds.length === 0) {
        return results;
      }

      // Query workout_history for workouts by this user, ordered by most recent
      const { data: historyData, error: historyError } = await supabase
        .from('workout_history')
        .select('id, completed_at, exercises_data')
        .eq('user_id', userId)
        .not('exercises_data', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (historyError) {
        console.error('[PreviousExerciseService] Error fetching workout history:', historyError);
        return results;
      }

      if (!historyData || historyData.length === 0) {
        return results;
      }

      const exercisesFound = new Set<string>();

      // Search through workout history
      for (const workout of historyData) {
        const exercisesData = workout.exercises_data as any[];
        
        if (!Array.isArray(exercisesData)) {
          continue;
        }

        // Check each exercise we're looking for
        for (const targetExerciseId of exerciseIds) {
          if (exercisesFound.has(targetExerciseId)) {
            continue; // Already found this exercise
          }

          const exerciseEntry = exercisesData.find(
            (ex: any) => ex.exercise_id === targetExerciseId
          );

          if (exerciseEntry && Array.isArray(exerciseEntry.sets) && exerciseEntry.sets.length > 0) {
            const sets = exerciseEntry.sets.map((set: any) => ({
              reps: set.reps || 0,
              weight: set.weight || null,
              weightUnit: set.weight_unit || 'kg',
              completedAt: set.completed_at || workout.completed_at
            }));

            let topSetWeight: number | null = null;
            let totalVolume = 0;

            sets.forEach((set: any) => {
              if (set.weight !== null) {
                if (topSetWeight === null || set.weight > topSetWeight) {
                  topSetWeight = set.weight;
                }
                totalVolume += set.reps * set.weight;
              }
            });

            results.set(targetExerciseId, {
              exerciseId: targetExerciseId,
              exerciseName: exerciseEntry.exercise_name || 'Exercise',
              lastPerformed: workout.completed_at,
              sets: sets,
              topSetWeight: topSetWeight,
              totalVolume: totalVolume
            });

            exercisesFound.add(targetExerciseId);
          }
        }

        // If we've found all exercises, we can stop searching
        if (exercisesFound.size === exerciseIds.length) {
          break;
        }
      }

      console.log(`[PreviousExerciseService] Found previous data for ${results.size} out of ${exerciseIds.length} exercises`);
      return results;
    } catch (error) {
      console.error('[PreviousExerciseService] Exception in getLastPerformedExercises:', error);
      return results;
    }
  }
}






