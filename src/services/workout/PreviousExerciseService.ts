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
    workoutCompletedAt?: string; // For grouping sets by workout session
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

      // Collect ALL sets from ALL workouts to find true personal best
      const allHistoricalSets: Array<{
        reps: number;
        weight: number | null;
        weightUnit: 'kg' | 'lbs';
        completedAt: string;
      }> = [];
      let mostRecentDate: string | null = null;
      let exerciseName = 'Exercise';

      // Search through ALL workout history to collect all sets
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
          // Extract exercise name from first occurrence
          if (exerciseName === 'Exercise' && exerciseEntry.exercise_name) {
            exerciseName = exerciseEntry.exercise_name;
          }

          // Track most recent date
          if (!mostRecentDate || new Date(workout.completed_at) > new Date(mostRecentDate)) {
            mostRecentDate = workout.completed_at;
          }

          // Collect all sets from this workout
          exerciseEntry.sets.forEach((set: any) => {
            allHistoricalSets.push({
              reps: set.reps || 0,
              weight: set.weight || null,
              weightUnit: set.weight_unit || 'kg',
              completedAt: set.completed_at || workout.completed_at
            });
          });
        }
      }

      // If we found sets, calculate true personal best from ALL history
      if (allHistoricalSets.length > 0) {
        // Find the actual personal best (highest weight across all history)
        let topSetWeight: number | null = null;
        let topSetReps: number = 0;
        let totalVolume = 0;
        const recentSets: typeof allHistoricalSets = [];

        // Sort by date (most recent first) for recent sets
        const sortedByDate = [...allHistoricalSets].sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        
        // Get most recent 10 sets for display
        recentSets.push(...sortedByDate.slice(0, 10));

        // Find TRUE personal best across ALL historical sets
        allHistoricalSets.forEach((set) => {
          if (set.weight !== null) {
            // Update personal best if this weight is higher
            if (topSetWeight === null || set.weight > topSetWeight) {
              topSetWeight = set.weight;
              topSetReps = set.reps;
            }
            totalVolume += set.reps * set.weight;
          }
        });

        return {
          exerciseId: exerciseId,
          exerciseName: exerciseName,
          lastPerformed: mostRecentDate,
          sets: recentSets, // Show recent sets, but PB is from all history
          topSetWeight: topSetWeight,
          totalVolume: totalVolume
        };
      }

      // Also check exercise_logs table as fallback for older data
      // Get ALL logs (not just 10) to find true personal best
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
        .order('completed_at', { ascending: false });

      if (logsError) {
        console.error('[PreviousExerciseService] Error fetching exercise logs:', logsError);
      }

      if (logsData && logsData.length > 0) {
        // Collect ALL sets from ALL sessions to find true personal best
        const allLogSets = logsData.map((log: any) => ({
          reps: log.actual_reps || 0,
          weight: log.actual_weight || null,
          weightUnit: 'kg' as const, // exercise_logs stores in kg
          completedAt: log.completed_at
        }));

        // Sort by date (most recent first) for recent sets display
        allLogSets.sort((a, b) => 
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );

        // Get most recent 10 sets for display
        const recentSets = allLogSets.slice(0, 10);

        // Find TRUE personal best across ALL historical logs
        let topSetWeight: number | null = null;
        let topSetReps: number = 0;
        let totalVolume = 0;
        let mostRecentDate: string | null = null;

        allLogSets.forEach((set) => {
          if (set.weight !== null) {
            // Update personal best if this weight is higher
            if (topSetWeight === null || set.weight > topSetWeight) {
              topSetWeight = set.weight;
              topSetReps = set.reps;
            }
            totalVolume += set.reps * set.weight;
          }
          
          // Track most recent date
          if (!mostRecentDate || new Date(set.completedAt) > new Date(mostRecentDate)) {
            mostRecentDate = set.completedAt;
          }
        });

        return {
          exerciseId: exerciseId,
          exerciseName: 'Exercise', // Name not available from logs
          lastPerformed: mostRecentDate,
          sets: recentSets, // Show recent sets, but PB is from all history
          topSetWeight: topSetWeight,
          totalVolume: totalVolume
        };
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
      const allExerciseData = new Map<string, {
        allSets: Array<{ reps: number; weight: number | null; weightUnit: 'kg' | 'lbs'; completedAt: string; workoutCompletedAt?: string }>;
        mostRecentDate: string | null;
        exerciseName: string;
      }>();

      // First pass: Collect ALL sets from ALL workouts for each exercise
      for (const workout of historyData) {
        const exercisesData = workout.exercises_data as any[];
        
        if (!Array.isArray(exercisesData)) {
          continue;
        }

        // Check each exercise we're looking for
        for (const targetExerciseId of exerciseIds) {
          const exerciseEntry = exercisesData.find(
            (ex: any) => ex.exercise_id === targetExerciseId
          );

          if (!exerciseEntry) continue;

          // Check for sets in either 'sets' array or 'logs' array (quick workouts use 'logs')
          const setsArray = exerciseEntry.sets || exerciseEntry.logs || [];
          
          console.log(`[PreviousExerciseService] Checking exercise ${targetExerciseId} in workout ${workout.completed_at}:`, {
            hasExerciseEntry: !!exerciseEntry,
            exerciseName: exerciseEntry?.exercise_name,
            hasSets: !!exerciseEntry?.sets,
            hasLogs: !!exerciseEntry?.logs,
            setsArrayLength: setsArray?.length || 0
          });
          
          if (Array.isArray(setsArray) && setsArray.length > 0) {
            if (!allExerciseData.has(targetExerciseId)) {
              allExerciseData.set(targetExerciseId, {
                allSets: [],
                mostRecentDate: null,
                exerciseName: exerciseEntry.exercise_name || 'Exercise'
              });
            }

            const exerciseData = allExerciseData.get(targetExerciseId)!;
            
            // Update exercise name if not set
            if (exerciseData.exerciseName === 'Exercise' && exerciseEntry.exercise_name) {
              exerciseData.exerciseName = exerciseEntry.exercise_name;
            }

            // Track most recent date
            if (!exerciseData.mostRecentDate || 
                new Date(workout.completed_at) > new Date(exerciseData.mostRecentDate)) {
              exerciseData.mostRecentDate = workout.completed_at;
            }

            // Collect all sets from this workout
            // Handle both 'sets' format (with reps/weight) and 'logs' format (with actual_reps/actual_weight)
            setsArray.forEach((set: any) => {
              const reps = set.actual_reps || set.reps || 0;
              const weight = set.actual_weight !== undefined ? set.actual_weight : (set.weight !== undefined ? set.weight : null);
              const completedAt = set.completed_at || workout.completed_at;
              
              exerciseData.allSets.push({
                reps: reps,
                weight: weight,
                weightUnit: set.weight_unit || 'kg',
                completedAt: completedAt,
                workoutCompletedAt: workout.completed_at // Store workout date for grouping
              });
            });
          }
        }
      }

      // Second pass: Calculate true personal best from ALL collected sets
      for (const [targetExerciseId, exerciseData] of allExerciseData.entries()) {
        const allSets = exerciseData.allSets;
        
        // Sort by date (most recent first) for recent sets display
        allSets.sort((a, b) => 
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );

        // Get sets from the most recent workout session only
        // Group sets by workout session (using workoutCompletedAt if available, otherwise completedAt date)
        const setsBySession = new Map<string, typeof allSets>();
        allSets.forEach(set => {
          const sessionKey = set.workoutCompletedAt 
            ? set.workoutCompletedAt 
            : new Date(set.completedAt).toISOString().split('T')[0]; // Group by date
          if (!setsBySession.has(sessionKey)) {
            setsBySession.set(sessionKey, []);
          }
          setsBySession.get(sessionKey)!.push(set);
        });
        
        // Get sets from the most recent session (first date after sorting)
        const sessionKeys = Array.from(setsBySession.keys()).sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        const mostRecentSessionSets = sessionKeys.length > 0 
          ? setsBySession.get(sessionKeys[0]) || []
          : [];
        
        // Sort most recent session sets by completedAt (oldest first) to match set order
        mostRecentSessionSets.sort((a, b) => 
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );

        // Use sets from most recent session for "Last Time" display
        const recentSets = mostRecentSessionSets;

        // Find TRUE personal best across ALL historical sets
        let topSetWeight: number | null = null;
        let totalVolume = 0;

        allSets.forEach((set) => {
          if (set.weight !== null) {
            // Update personal best if this weight is higher
            if (topSetWeight === null || set.weight > topSetWeight) {
              topSetWeight = set.weight;
            }
            totalVolume += set.reps * set.weight;
          }
        });

        results.set(targetExerciseId, {
          exerciseId: targetExerciseId,
          exerciseName: exerciseData.exerciseName,
          lastPerformed: exerciseData.mostRecentDate,
          sets: recentSets, // Show recent sets, but PB is from all history
          topSetWeight: topSetWeight,
          totalVolume: totalVolume
        });

        exercisesFound.add(targetExerciseId);
      }

      console.log(`[PreviousExerciseService] Found previous data for ${results.size} out of ${exerciseIds.length} exercises`);
      return results;
    } catch (error) {
      console.error('[PreviousExerciseService] Exception in getLastPerformedExercises:', error);
      return results;
    }
  }

  /**
   * Fetches previous exercise data by exercise name (for quick workouts with synthetic IDs)
   * 
   * @param userId - The user's ID
   * @param exercises - Array of {exerciseId, exerciseName} pairs
   * @returns Map of exerciseId -> PreviousExerciseData
   */
  static async getLastPerformedExercisesByName(
    userId: string,
    exercises: Array<{ exerciseId: string; exerciseName: string }>
  ): Promise<Map<string, PreviousExerciseData>> {
    const results = new Map<string, PreviousExerciseData>();

    try {
      if (!supabase || exercises.length === 0) {
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

      const allExerciseData = new Map<string, {
        allSets: Array<{ reps: number; weight: number | null; weightUnit: 'kg' | 'lbs'; completedAt: string; workoutCompletedAt?: string }>;
        mostRecentDate: string | null;
        exerciseName: string;
      }>();

      // First pass: Collect ALL sets from ALL workouts for each exercise by name
      for (const workout of historyData) {
        const exercisesData = workout.exercises_data as any[];
        
        if (!Array.isArray(exercisesData)) {
          continue;
        }

        // Check each exercise we're looking for
        for (const { exerciseId, exerciseName } of exercises) {
          // Find exercise by name (case-insensitive)
          const exerciseEntry = exercisesData.find(
            (ex: any) => {
              const savedName = ex.exercise_name || ex.name;
              return savedName && savedName.toLowerCase() === exerciseName.toLowerCase();
            }
          );

          if (!exerciseEntry) continue;

          // Check for sets in either 'sets' array or 'logs' array (quick workouts use 'logs')
          const setsArray = exerciseEntry.sets || exerciseEntry.logs || [];
          
          console.log(`[PreviousExerciseService] Checking exercise "${exerciseName}" (${exerciseId}) in workout ${workout.completed_at}:`, {
            hasExerciseEntry: !!exerciseEntry,
            savedName: exerciseEntry?.exercise_name || exerciseEntry?.name,
            hasSets: !!exerciseEntry?.sets,
            hasLogs: !!exerciseEntry?.logs,
            setsArrayLength: setsArray?.length || 0
          });
          
          if (Array.isArray(setsArray) && setsArray.length > 0) {
            if (!allExerciseData.has(exerciseId)) {
              allExerciseData.set(exerciseId, {
                allSets: [],
                mostRecentDate: null,
                exerciseName: exerciseName
              });
            }

            const exerciseData = allExerciseData.get(exerciseId)!;

            // Track most recent date
            if (!exerciseData.mostRecentDate || 
                new Date(workout.completed_at) > new Date(exerciseData.mostRecentDate)) {
              exerciseData.mostRecentDate = workout.completed_at;
            }

            // Collect all sets from this workout
            // Handle both 'sets' format (with reps/weight) and 'logs' format (with actual_reps/actual_weight)
            setsArray.forEach((set: any) => {
              const reps = set.actual_reps || set.reps || 0;
              const weight = set.actual_weight !== undefined ? set.actual_weight : (set.weight !== undefined ? set.weight : null);
              const completedAt = set.completed_at || workout.completed_at;
              
              exerciseData.allSets.push({
                reps: reps,
                weight: weight,
                weightUnit: set.weight_unit || 'kg',
                completedAt: completedAt,
                workoutCompletedAt: workout.completed_at // Store workout date for grouping
              });
            });
          }
        }
      }

      // Second pass: Calculate true personal best from ALL collected sets
      for (const [targetExerciseId, exerciseData] of allExerciseData.entries()) {
        const allSets = exerciseData.allSets;
        
        // Sort by date (most recent first) for recent sets display
        allSets.sort((a, b) => 
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );

        // Get sets from the most recent workout session only
        // Group sets by workout session (using workoutCompletedAt if available, otherwise completedAt date)
        const setsBySession = new Map<string, typeof allSets>();
        allSets.forEach(set => {
          const sessionKey = set.workoutCompletedAt 
            ? set.workoutCompletedAt 
            : new Date(set.completedAt).toISOString().split('T')[0]; // Group by date
          if (!setsBySession.has(sessionKey)) {
            setsBySession.set(sessionKey, []);
          }
          setsBySession.get(sessionKey)!.push(set);
        });
        
        // Get sets from the most recent session (first date after sorting)
        const sessionKeys = Array.from(setsBySession.keys()).sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        const mostRecentSessionSets = sessionKeys.length > 0 
          ? setsBySession.get(sessionKeys[0]) || []
          : [];
        
        // Sort most recent session sets by completedAt (oldest first) to match set order
        mostRecentSessionSets.sort((a, b) => 
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );

        // Use sets from most recent session for "Last Time" display
        const recentSets = mostRecentSessionSets;

        // Find TRUE personal best across ALL historical sets
        let topSetWeight: number | null = null;
        let totalVolume = 0;

        allSets.forEach((set) => {
          if (set.weight !== null) {
            // Update personal best if this weight is higher
            if (topSetWeight === null || set.weight > topSetWeight) {
              topSetWeight = set.weight;
            }
            totalVolume += set.reps * set.weight;
          }
        });

        results.set(targetExerciseId, {
          exerciseId: targetExerciseId,
          exerciseName: exerciseData.exerciseName,
          lastPerformed: exerciseData.mostRecentDate,
          sets: recentSets, // Show recent sets, but PB is from all history
          topSetWeight: topSetWeight,
          totalVolume: totalVolume
        });
      }

      console.log(`[PreviousExerciseService] Found previous data by name for ${results.size} out of ${exercises.length} exercises`);
      return results;
    } catch (error) {
      console.error('[PreviousExerciseService] Exception in getLastPerformedExercisesByName:', error);
      return results;
    }
  }
}






