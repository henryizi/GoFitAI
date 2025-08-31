import { supabase } from '../supabase/client';
import { Database } from '../../types/database';

export type CompletedSessionListItem = {
  id: string;
  completed_at: string;
  week_number: number | null;
  day_number: number | null;
  split_name?: string | null;
  split_focus?: string[] | null;
  estimated_calories?: number | null;
  total_exercises?: number | null;
  total_sets?: number | null;
  plan_name?: string | null;
  session_name?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
};

export type SessionExerciseLog = {
  exercise_set_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
  logs: {
    id: string;
    actual_reps: number;
    actual_weight: number | null;
    actual_rpe: number | null;
    completed_at: string;
  }[];
  total_volume: number; // sum(reps * weight) where weight present
  top_set_weight: number | null; // max weight in logs
  comparison?: {
    volume_delta: number; // current - previous
    top_set_delta: number | null; // current - previous
  };
};

export type SessionDetails = {
  id: string;
  completed_at: string | null;
  exercises: SessionExerciseLog[];
};

export class WorkoutHistoryService {
  /**
   * Utility method to check if a string is a valid UUID
   */
  private static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  static async getCompletedSessions(userId: string): Promise<CompletedSessionListItem[]> {
    console.log(`[WorkoutHistoryService] Getting completed sessions for user: ${userId}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return [];
    }
    
    // Debug: Check current auth state
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log(`[WorkoutHistoryService] Current auth user: ${user?.id || 'NONE'}, Error: ${error?.message || 'NONE'}`);
      console.log(`[WorkoutHistoryService] Requested userId: ${userId}, Match: ${user?.id === userId}`);
    } catch (authError) {
      console.error('[WorkoutHistoryService] Auth check error:', authError);
    }
    
    try {
      // PRIMARY APPROACH: Get completed sessions from workout_history table
      console.log(`[WorkoutHistoryService] Getting completed sessions from workout_history table`);
      const { data: historyData, error: historyError } = await supabase
        .from('workout_history')
        .select(`
          id,
          completed_at,
          week_number,
          day_number,
          estimated_calories,
          plan_name,
          session_name,
          total_sets,
          total_exercises,
          duration_minutes,
          notes
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (!historyError && historyData && historyData.length > 0) {
        console.log(`[WorkoutHistoryService] Found ${historyData.length} completed sessions in workout_history`);
        console.log(`[WorkoutHistoryService] Raw history data:`, JSON.stringify(historyData, null, 2));
        const mappedData = historyData.map(this.mapHistoryData);
        console.log(`[WorkoutHistoryService] Mapped data:`, JSON.stringify(mappedData, null, 2));
        return mappedData;
      }

      // FALLBACK APPROACH: Try to get from workout_sessions table (legacy)
      console.log(`[WorkoutHistoryService] No history found, trying workout_sessions table as fallback`);
      
      // Try active plan first
      const { data: activePlan } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      // Base selection for sessions
      const baseSelect = `
        id,
        completed_at,
        week_number,
        day_number,
        estimated_calories,
        split_id
      `;

      // Helper to apply completed filter that works across schemas
      const applyCompletedFilter = (q: any) => q.or('status.eq.completed,completed_at.not.is.null');

      // First approach: Filter by active plan
      if (activePlan?.id && this.isValidUUID(activePlan.id)) {
        console.log(`[WorkoutHistoryService] Filtering by active plan: ${activePlan.id}`);
        const { data: activeData, error: activeError } = await applyCompletedFilter(
          supabase
            .from('workout_sessions')
            .select(baseSelect)
            .eq('plan_id', activePlan.id)
            .order('completed_at', { ascending: false })
        );

        if (!activeError && activeData && activeData.length > 0) {
          console.log(`[WorkoutHistoryService] Found ${activeData.length} sessions for active plan`);
          return activeData.map(this.mapSessionData);
        }
      }
      
      // Second approach: Get all user's plans and filter by them
      console.log(`[WorkoutHistoryService] Trying to find sessions from all user plans`);
      const { data: plans } = await supabase
        .from('workout_plans')
        .select('id')
        .eq('user_id', userId);
        
      // Filter valid UUIDs only
      const planIds = (plans || []).map(p => p.id).filter(id => this.isValidUUID(id));
      
      if (planIds.length > 0) {
        console.log(`[WorkoutHistoryService] Found ${planIds.length} plans, filtering sessions`);
        const { data: planData, error: planError } = await applyCompletedFilter(
          supabase
            .from('workout_sessions')
            .select(baseSelect)
            .in('plan_id', planIds)
            .order('completed_at', { ascending: false })
        );
        
        if (!planError && planData && planData.length > 0) {
          console.log(`[WorkoutHistoryService] Found ${planData.length} sessions from user plans`);
          return planData.map(this.mapSessionData);
        }
      }
      
      // Third approach: Get all completed sessions for this user directly
      // Note: workout_sessions doesn't have user_id, we need to join with workout_plans
      console.log(`[WorkoutHistoryService] Trying to find any completed sessions for user`);
      const { data: userData, error: userError } = await applyCompletedFilter(
        supabase
          .from('workout_sessions')
          .select(`
            ${baseSelect},
            workout_plans!inner(user_id)
          `)
          .eq('workout_plans.user_id', userId)
          .order('completed_at', { ascending: false })
      );
      
      if (!userError && userData) {
        console.log(`[WorkoutHistoryService] Found ${userData.length} sessions for user directly`);
        return userData.map(this.mapSessionData);
      }
      
      console.log(`[WorkoutHistoryService] No completed sessions found for user`);
      return [];
    } catch (error) {
      console.error(`[WorkoutHistoryService] Error getting completed sessions:`, error);
      return [];
    }
  }

  static async getSessionDetails(sessionId: string): Promise<SessionDetails | null> {
    console.log(`🔍 [WorkoutHistoryService] Getting session details for ID: ${sessionId}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('❌ [WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return null;
    }
    
    // PRIMARY APPROACH: Try to get session from workout_history table first
    console.log(`[WorkoutHistoryService] Trying workout_history table first`);
    const { data: historyData, error: historyError } = await supabase
      .from('workout_history')
      .select('id, completed_at, plan_id, week_number, day_number, session_id, exercises_data, plan_name, session_name')
      .eq('id', sessionId)
      .maybeSingle();
    
    if (historyError) {
      console.error('[WorkoutHistoryService] Error fetching from workout_history:', historyError);
    }
    
    let sessionData: any = historyData;
    
    // FALLBACK APPROACH: If not found in workout_history, try workout_sessions table
    if (!sessionData) {
      console.log(`[WorkoutHistoryService] Not found in workout_history, trying workout_sessions table`);
      const { data: sessionDataFallback, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id, completed_at, plan_id, week_number, day_number, session_id')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (sessionError) {
        console.error('[WorkoutHistoryService] Error fetching from workout_sessions:', sessionError);
      }
      
      sessionData = sessionDataFallback;
    }
    
    if (!sessionData) {
      console.log('[WorkoutHistoryService] No session data found for ID:', sessionId);
      return null;
    }
    
    console.log(`[WorkoutHistoryService] Found session with completion date: ${sessionData.completed_at}`);
    console.log(`[WorkoutHistoryService] Session data:`, JSON.stringify(sessionData, null, 2));
    
    // Determine which session_id to use for fetching exercise data
    let actualSessionId = sessionData.session_id;
    console.log(`[WorkoutHistoryService] Using session_id: ${actualSessionId} to fetch exercise sets`);
    
    // If session_id is null (plan was deleted), try to use the workout_history id as fallback
    if (!actualSessionId) {
      console.log(`[WorkoutHistoryService] sessionData.session_id: ${sessionData.session_id}`);
      actualSessionId = sessionData.id; // Use the workout_history id as fallback
      console.log(`[WorkoutHistoryService] fallback sessionId: ${actualSessionId}`);
    }
    
    // FIRST: Check if we have backup exercise data in the workout_history table
    if (sessionData.exercises_data) {
      console.log(`✅ [WorkoutHistoryService] Found backup exercise data in workout_history!`);
      console.log(`📊 [WorkoutHistoryService] Exercise data:`, JSON.stringify(sessionData.exercises_data, null, 2));
      
      // Convert backup data to exercise format
      const exercises = this.convertBackupDataToExercises(sessionData.exercises_data);
      
      if (exercises.length > 0) {
        console.log(`🎯 [WorkoutHistoryService] Successfully converted backup data to ${exercises.length} exercises`);
        
        // Calculate totals from the backup data
        const totalExercises = exercises.length;
        const totalSets = exercises.reduce((sum, ex) => sum + ex.logs.length, 0);
        
        console.log(`📊 [WorkoutHistoryService] Calculated totals: ${totalExercises} exercises, ${totalSets} sets`);
        
        return {
          id: sessionData.id,
          completed_at: sessionData.completed_at,
          exercises,
        };
      } else {
        console.log(`⚠️ [WorkoutHistoryService] Backup data exists but converted to 0 exercises, trying fallback...`);
      }
    } else {
      console.log(`❌ [WorkoutHistoryService] No exercises_data found in workout_history`);
    }
    
    // FALLBACK: Try to get exercise sets from exercise_sets table (if plan/session still exist)
    console.log(`🔄 [WorkoutHistoryService] Trying to fetch from exercise_sets table...`);
    
    if (!actualSessionId) {
      console.log(`❌ [WorkoutHistoryService] No session_id available, cannot fetch exercise sets`);
      // Return session details without exercise data
      return {
        id: sessionData.id,
        completed_at: sessionData.completed_at,
        exercises: [],
      };
    }
    
    // Debug: Check if there are any exercise_sets at all
    const { data: allSets, error: allSetsError } = await supabase
      .from('exercise_sets')
      .select('id, session_id')
      .limit(5);
    console.log(`[WorkoutHistoryService] Debug - All exercise_sets in DB (sample):`, allSets);
    
    // Debug: Check if there are any exercise_sets with the specific session_id
    const { data: specificSets, error: specificError } = await supabase
      .from('exercise_sets')
      .select('id, session_id, exercise_id')
      .eq('session_id', actualSessionId);
    console.log(`[WorkoutHistoryService] Debug - Sets with session_id ${actualSessionId}:`, specificSets);
    
    console.log(`🔍 [WorkoutHistoryService] Querying exercise_sets with session_id: ${actualSessionId}`);
    const { data: sets, error: setsError } = await supabase
      .from('exercise_sets')
      .select(`
        id, 
        exercise_id, 
        target_sets, 
        target_reps, 
        order_in_session, 
        exercises:exercise_id(name)
      `)
      .eq('session_id', actualSessionId)
      .order('order_in_session');
      
    if (setsError) {
      console.error('❌ [WorkoutHistoryService] Error fetching exercise sets:', setsError);
      return null;
    }
    
    console.log(`✅ [WorkoutHistoryService] Found ${sets?.length || 0} exercise sets`);
    if (sets && sets.length > 0) {
      console.log(`📊 [WorkoutHistoryService] Sample sets:`, JSON.stringify(sets.slice(0, 2), null, 2));
    }

    const exercises: SessionExerciseLog[] = [];

    for (const set of sets || []) {
      const exerciseName = (set as any).exercises?.name ?? 'Exercise';
      
      // Fetch logs for this set
      const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select('id, actual_reps, actual_weight, actual_rpe, completed_at')
        .eq('set_id', set.id)
        .order('completed_at');
        
      if (logsError) {
        console.error(`[WorkoutHistoryService] Error fetching logs for set ${set.id}:`, logsError);
      }
      
      console.log(`[WorkoutHistoryService] Found ${logs?.length || 0} logs for exercise "${exerciseName}"`);

      const totalVolume = (logs || []).reduce((sum, l) => {
        if (l.actual_weight != null) return sum + l.actual_reps * Number(l.actual_weight);
        return sum;
      }, 0);
      
      const topSetWeight = (logs || []).reduce<number | null>((max, l) => {
        if (l.actual_weight == null) return max;
        const val = Number(l.actual_weight);
        return max == null ? val : Math.max(max, val);
      }, null);

      const current: SessionExerciseLog = {
        exercise_set_id: set.id,
        exercise_name: exerciseName,
        target_sets: set.target_sets,
        target_reps: set.target_reps,
        logs: logs || [],
        total_volume: totalVolume,
        top_set_weight: topSetWeight,
      };

      // Comparison vs previous occurrence of the same exercise in earlier completed sessions
      const comparison = await this.computePreviousComparison(
        sessionData.plan_id, 
        sessionData.week_number, 
        sessionData.day_number, 
        set.exercise_id, 
        set.id
      );
      if (comparison) current.comparison = comparison;

      exercises.push(current);
    }
    
    console.log(`🎯 [WorkoutHistoryService] Successfully built details for ${exercises.length} exercises`);
    console.log(`📋 [WorkoutHistoryService] Final result structure:`, {
      id: sessionData.id,
      completed_at: sessionData.completed_at,
      exercise_count: exercises.length
    });

    return {
      id: sessionData.id,
      completed_at: sessionData.completed_at,
      exercises,
    };
  }

  /**
   * Convert backup exercise data from JSONB to SessionExerciseLog format
   */
  private static convertBackupDataToExercises(exercisesData: any): SessionExerciseLog[] {
    try {
      console.log(`[WorkoutHistoryService] Converting backup data:`, JSON.stringify(exercisesData, null, 2));
      
      // Handle different data structures
      let exercisesArray: any[] = [];
      
      if (exercisesData && typeof exercisesData === 'object') {
        if (Array.isArray(exercisesData)) {
          // Legacy format: direct array
          console.log(`[WorkoutHistoryService] Detected legacy array format with ${exercisesData.length} items`);
          exercisesArray = exercisesData;
        } else if (exercisesData.exercises && Array.isArray(exercisesData.exercises)) {
          // New format: object with exercises array
          console.log(`[WorkoutHistoryService] Detected new object format with ${exercisesData.exercises.length} exercises`);
          exercisesArray = exercisesData.exercises;
        } else if (exercisesData.exercise_id || exercisesData.exercise_name) {
          // Single exercise format
          console.log(`[WorkoutHistoryService] Detected single exercise format`);
          exercisesArray = [exercisesData];
        } else {
          console.warn('[WorkoutHistoryService] Invalid exercises_data structure:', exercisesData);
          return [];
        }
      } else {
        console.warn('[WorkoutHistoryService] Invalid exercises_data format:', exercisesData);
        return [];
      }

      console.log(`[WorkoutHistoryService] Processing ${exercisesArray.length} exercises`);
      const exercises: SessionExerciseLog[] = [];

      for (const exercise of exercisesArray) {
        console.log(`[WorkoutHistoryService] Processing exercise:`, {
          exercise_id: exercise.exercise_id,
          exercise_name: exercise.exercise_name,
          has_sets: !!exercise.sets,
          sets_count: exercise.sets?.length || 0,
          has_actual_logs: !!exercise.actual_logs,
          actual_logs_count: exercise.actual_logs?.length || 0
        });

        // Handle different set data structures
        let exerciseLogs: any[] = [];
        
        if (exercise.sets && Array.isArray(exercise.sets)) {
          // New format: sets array with direct data
          console.log(`[WorkoutHistoryService] Processing ${exercise.sets.length} sets with direct data`);
          
          for (const set of exercise.sets) {
            if (set.reps !== undefined || set.weight !== undefined) {
              exerciseLogs.push({
                id: set.set_id || set.id || `backup-log-${Date.now()}-${Math.random()}`,
                actual_reps: set.reps || 0,
                actual_weight: set.weight || null,
                actual_rpe: set.rpe || null,
                completed_at: set.completed_at || new Date().toISOString(),
                notes: set.notes || null
              });
            } else if (set.actual_logs && Array.isArray(set.actual_logs)) {
              // Legacy format: actual_logs array within sets
              console.log(`[WorkoutHistoryService] Processing ${set.actual_logs.length} actual_logs within set`);
              exerciseLogs.push(...set.actual_logs.map((log: any) => ({
                id: log.log_id || log.id || `backup-log-${Date.now()}-${Math.random()}`,
                actual_reps: log.actual_reps || 0,
                actual_weight: log.actual_weight || null,
                actual_rpe: log.actual_rpe || null,
                completed_at: log.completed_at || new Date().toISOString(),
                notes: log.notes || null
              })));
            }
          }
        } else if (exercise.actual_logs && Array.isArray(exercise.actual_logs)) {
          // Legacy format: actual_logs array at exercise level
          console.log(`[WorkoutHistoryService] Processing ${exercise.actual_logs.length} actual_logs at exercise level`);
          exerciseLogs.push(...exercise.actual_logs.map((log: any) => ({
            id: log.log_id || log.id || `backup-log-${Date.now()}-${Math.random()}`,
            actual_reps: log.actual_reps || 0,
            actual_weight: log.actual_weight || null,
            actual_rpe: log.actual_rpe || null,
            completed_at: log.completed_at || new Date().toISOString(),
            notes: log.notes || null
          })));
        } else if (exercise.logs && Array.isArray(exercise.logs)) {
          // Alternative format: logs array
          console.log(`[WorkoutHistoryService] Processing ${exercise.logs.length} logs array`);
          exerciseLogs.push(...exercise.logs.map((log: any) => ({
            id: log.log_id || log.id || `backup-log-${Date.now()}-${Math.random()}`,
            actual_reps: log.actual_reps || log.reps || 0,
            actual_weight: log.actual_weight || log.weight || null,
            actual_rpe: log.actual_rpe || log.rpe || null,
            completed_at: log.completed_at || new Date().toISOString(),
            notes: log.notes || null
          })));
        }

        console.log(`[WorkoutHistoryService] Created ${exerciseLogs.length} exercise logs for "${exercise.exercise_name || 'Unknown Exercise'}"`);

        if (exerciseLogs.length > 0) {
          const totalVolume = exerciseLogs.reduce((sum: number, l: any) => {
            if (l.actual_weight != null) return sum + l.actual_reps * Number(l.actual_weight);
            return sum;
          }, 0);
          
          const topSetWeight = exerciseLogs.reduce((max: number | null, l: any) => {
            if (l.actual_weight == null) return max;
            const val = Number(l.actual_weight);
            return max == null ? val : Math.max(max, val);
          }, null as number | null);

          exercises.push({
            exercise_set_id: exercise.exercise_id || `backup-exercise-${Date.now()}-${Math.random()}`,
            exercise_name: exercise.exercise_name || 'Unknown Exercise',
            target_sets: exerciseLogs.length, // Use actual number of sets performed
            target_reps: '0', // Not available in backup data
            logs: exerciseLogs,
            total_volume: totalVolume,
            top_set_weight: topSetWeight,
          });
        } else {
          console.log(`[WorkoutHistoryService] Skipping exercise "${exercise.exercise_name || 'unknown'}" - no valid log data found`);
        }
      }

      console.log(`[WorkoutHistoryService] Successfully converted ${exercises.length} exercises from backup data`);
      if (exercises.length > 0) {
        console.log(`[WorkoutHistoryService] Sample exercise data:`, {
          exercise_name: exercises[0].exercise_name,
          logs_count: exercises[0].logs.length,
          sample_log: exercises[0].logs[0],
          total_volume: exercises[0].total_volume
        });
      }
      return exercises;
    } catch (error) {
      console.error('[WorkoutHistoryService] Error converting backup exercise data:', error);
      console.error('[WorkoutHistoryService] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        data: exercisesData
      });
      return [];
    }
  }

  private static async computePreviousComparison(
    planId: string,
    currentWeek: number | null,
    currentDay: number | null,
    exerciseId: string,
    currentSetId: string
  ): Promise<{ volume_delta: number; top_set_delta: number | null } | null> {
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return null;
    }
    
    // Check if planId is valid UUID
    if (!this.isValidUUID(planId)) {
      console.warn(`Invalid UUID format for plan_id: ${planId}, skipping comparison query`);
      return null;
    }

    // Find the most recent completed session for this plan before the current one that contains the same exercise
    // PRIMARY APPROACH: Try workout_history table first
    let { data: candidates } = await supabase
      .from('workout_history')
      .select('id, completed_at, week_number, day_number, session_id')
      .eq('plan_id', planId)
      .order('completed_at', { ascending: false })
      .limit(10);
    
    // FALLBACK APPROACH: If no history found, try workout_sessions table
    if (!candidates || candidates.length === 0) {
      console.log('[WorkoutHistoryService] No history found, trying workout_sessions table for comparison');
      const { data: sessionCandidates } = await supabase
        .from('workout_sessions')
        .select('id, completed_at, week_number, day_number, session_id')
        .eq('plan_id', planId)
        .or('status.eq.completed,completed_at.not.is.null')
        .order('completed_at', { ascending: false })
        .limit(10);
      
      candidates = sessionCandidates;
    }
    
    // For workout_history records, use the session_id field; for workout_sessions, use the id field
    const sessionIds = (candidates || []).map(s => s.session_id || s.id);
    console.log(`[WorkoutHistoryService] Using session IDs for exercise sets query:`, sessionIds);
    
    const { data: prevSetCandidates } = await supabase
      .from('exercise_sets')
      .select('id, session_id')
      .eq('exercise_id', exerciseId)
      .in('session_id', sessionIds);

    const previousSet = (prevSetCandidates || [])
      .filter(s => s.id !== currentSetId)
      .sort((a, b) => {
        const aIdx = (candidates || []).findIndex(c => c.id === a.session_id);
        const bIdx = (candidates || []).findIndex(c => c.id === b.session_id);
        return aIdx - bIdx; // earlier in candidates means more recent
      })
      [0];

    if (!previousSet) return null;

    const { data: prevLogs } = await supabase
      .from('exercise_logs')
      .select('actual_reps, actual_weight')
      .eq('set_id', previousSet.id);

    const prevVolume = (prevLogs || []).reduce((sum, l) => {
      if (l.actual_weight != null) return sum + l.actual_reps * Number(l.actual_weight);
      return sum;
    }, 0);
    const prevTop = (prevLogs || []).reduce<number | null>((max, l) => {
      if (l.actual_weight == null) return max;
      const val = Number(l.actual_weight);
      return max == null ? val : Math.max(max, val);
    }, null);

    // Get current logs as well
    const { data: currentLogs } = await supabase
      .from('exercise_logs')
      .select('actual_reps, actual_weight')
      .eq('set_id', currentSetId);

    const currentVolume = (currentLogs || []).reduce((sum, l) => {
      if (l.actual_weight != null) return sum + l.actual_reps * Number(l.actual_weight);
      return sum;
    }, 0);
    const currentTop = (currentLogs || []).reduce<number | null>((max, l) => {
      if (l.actual_weight == null) return max;
      const val = Number(l.actual_weight);
      return max == null ? val : Math.max(max, val);
    }, null);

    return {
      volume_delta: currentVolume - prevVolume,
      top_set_delta: currentTop != null && prevTop != null ? currentTop - prevTop : null,
    };
  }

  /**
   * Delete a workout session and its associated data
   * @param sessionId - The ID of the session to delete
   * @param userId - The ID of the user (for security)
   * @returns Promise<boolean> - True if deletion was successful
   */
  static async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    console.log(`[WorkoutHistoryService] Deleting session: ${sessionId} for user: ${userId}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return false;
    }

    try {
      // First, verify the session belongs to the user
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_history')
        .select('id, user_id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (sessionError) {
        console.error('[WorkoutHistoryService] Error verifying session ownership:', sessionError);
        return false;
      }

      if (!sessionData) {
        console.error('[WorkoutHistoryService] Session not found or does not belong to user');
        return false;
      }

      // Delete associated exercise sets first (if they exist)
      console.log('[WorkoutHistoryService] Deleting associated exercise sets...');
      const { error: setsError } = await supabase
        .from('exercise_sets')
        .delete()
        .eq('session_id', sessionId);

      if (setsError) {
        console.warn('[WorkoutHistoryService] Warning: Could not delete exercise sets:', setsError);
        // Continue with session deletion even if sets deletion fails
      }

      // Delete the workout history entry
      console.log('[WorkoutHistoryService] Deleting workout history entry...');
      const { error: deleteError } = await supabase
        .from('workout_history')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[WorkoutHistoryService] Error deleting workout history:', deleteError);
        return false;
      }

      console.log(`[WorkoutHistoryService] Successfully deleted session: ${sessionId}`);
      return true;

    } catch (error) {
      console.error('[WorkoutHistoryService] Error deleting session:', error);
      return false;
    }
  }

  // Helper method to map session data to the expected format
  /**
   * Save workout history entry with complete data for permanent storage
   */
  static async saveWorkoutHistory(historyData: {
    user_id: string;
    plan_id: string;
    session_id: string;
    completed_at: string;
    duration_minutes?: number;
    total_sets?: number;
    total_exercises?: number;
    estimated_calories?: number | null;
    notes?: string;
  }): Promise<boolean> {
    console.log(`[WorkoutHistoryService] Saving workout history for session: ${historyData.session_id}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return false;
    }
    
    try {
      // Get plan and session details to store permanently
      let planName = 'Unknown Plan';
      let sessionName = 'Unknown Session';
      let weekNumber: number | null = null;
      let dayNumber: number | null = null;
      let exercisesData: any = null;

      // Fetch plan details
      try {
        const { data: planData } = await supabase
          .from('workout_plans')
          .select('name')
          .eq('id', historyData.plan_id)
          .single();
        
        if (planData?.name) {
          planName = planData.name;
        }
      } catch (planError) {
        console.warn('[WorkoutHistoryService] Could not fetch plan name:', planError);
      }

      // Fetch session details and exercises
      try {
        const { data: sessionData } = await supabase
          .from('workout_sessions')
          .select(`
            week_number, 
            day_number,
            split_id
          `)
          .eq('id', historyData.session_id)
          .single();
        
        if (sessionData) {
          weekNumber = sessionData.week_number;
          dayNumber = sessionData.day_number;
          
          // Now fetch the training split name separately to ensure we get it
          if (sessionData.split_id) {
            try {
              const { data: splitData } = await supabase
                .from('training_splits')
                .select('name, focus_areas')
                .eq('id', sessionData.split_id)
                .single();
              
              if (splitData?.name) {
                sessionName = splitData.name;
              } else {
                // Fallback to generic format only if no specific name is available
                sessionName = `Week ${weekNumber} Day ${dayNumber}`;
              }
            } catch (splitError) {
              console.warn('[WorkoutHistoryService] Could not fetch training split name:', splitError);
              // Fallback to generic format
              sessionName = `Week ${weekNumber} Day ${dayNumber}`;
            }
          } else {
            // Fallback to generic format only if no specific name is available
            sessionName = `Week ${weekNumber} Day ${dayNumber}`;
          }
        }

        // Get exercise sets data for this session
        const { data: setsData } = await supabase
          .from('exercise_sets')
          .select(`
            id, exercise_id, set_number, target_reps, target_weight, 
            actual_reps, actual_weight, rest_seconds, completed, rpe,
            exercises (name, category, muscle_groups)
          `)
          .eq('session_id', historyData.session_id);
        
        if (setsData && setsData.length > 0) {
          exercisesData = setsData;
        }
      } catch (sessionError) {
        console.warn('[WorkoutHistoryService] Could not fetch session details:', sessionError);
      }

      // Create enhanced history data with permanent information
      const enhancedHistoryData = {
        ...historyData,
        plan_name: planName,
        session_name: sessionName,
        week_number: weekNumber,
        day_number: dayNumber,
        exercises_data: exercisesData
      };

      const { data, error } = await supabase
        .from('workout_history')
        .insert([enhancedHistoryData])
        .select()
        .single();
        
      if (error) {
        console.error('[WorkoutHistoryService] Error saving workout history:', error);
        return false;
      }
      
      console.log(`[WorkoutHistoryService] Successfully saved permanent workout history with ID: ${data?.id}`);
      console.log(`[WorkoutHistoryService] Saved data: Plan "${planName}", Session "${sessionName}", ${historyData.total_exercises} exercises, ${historyData.total_sets} sets, ${historyData.estimated_calories} calories`);
      return true;
    } catch (error) {
      console.error(`[WorkoutHistoryService] Error saving workout history:`, error);
      return false;
    }
  }

  private static mapSessionData(s: any): CompletedSessionListItem {
    // Sanitize numeric values to remove any question marks or invalid data
    const sanitizeNumericValue = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove any question marks or non-numeric characters
        const cleaned = value.toString().replace(/[?]/g, '').trim();
        if (cleaned === '') return null;
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };
    
    return {
      id: s.id,
      completed_at: s.completed_at,
      week_number: s.week_number ?? null,
      day_number: null, // workout_sessions table doesn't have day_number
      split_name: null, // We'll need to fetch this separately if needed
      split_focus: null, // We'll need to fetch this separately if needed
      estimated_calories: sanitizeNumericValue(s.estimated_calories),
    };
  }

  private static mapHistoryData(history: any): CompletedSessionListItem {
    console.log(`[WorkoutHistoryService] Mapping history data:`, {
      id: history.id,
      total_exercises: history.total_exercises,
      total_sets: history.total_sets,
      estimated_calories: history.estimated_calories,
      session_name: history.session_name,
      plan_name: history.plan_name
    });
    
    // Sanitize numeric values to remove any question marks or invalid data
    const sanitizeNumericValue = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove any question marks or non-numeric characters
        const cleaned = value.toString().replace(/[?]/g, '').trim();
        if (cleaned === '') return null;
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };
    
    // Extract the actual workout name from session_name, removing generic week/day prefixes
    let workoutName = history.session_name;
    
    // If session_name contains generic week/day format, try to extract a better name
    if (workoutName && (workoutName.includes('Week') || workoutName.includes('Day'))) {
      // Try to get a more meaningful name from plan_name or other sources
      if (history.plan_name && history.plan_name !== workoutName) {
        workoutName = history.plan_name;
      }
    }
    
    // If we still have generic names, try to make them more user-friendly
    if (workoutName && workoutName.includes('Week') && workoutName.includes('Day')) {
      // Extract week and day numbers for better formatting
      const weekNum = history.week_number || '-';
      const dayNum = history.day_number || '-';
      workoutName = `Workout ${weekNum}.${dayNum}`;
    }
    
    const mappedData = {
      id: history.id,
      completed_at: history.completed_at,
      week_number: history.week_number ?? null,
      day_number: history.day_number ?? null,
      split_name: workoutName || history.session_name || null,
      split_focus: null, // Not stored in workout_history
      estimated_calories: sanitizeNumericValue(history.estimated_calories),
      total_exercises: sanitizeNumericValue(history.total_exercises),
      total_sets: sanitizeNumericValue(history.total_sets),
      plan_name: history.plan_name ?? null,
      session_name: workoutName || history.session_name || null,
      duration_minutes: sanitizeNumericValue(history.duration_minutes),
      notes: history.notes ?? null,
    };
    
    console.log(`[WorkoutHistoryService] Mapped result:`, mappedData);
    return mappedData;
  }
}