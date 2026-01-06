import { supabase } from '../supabase/client';
import { Database } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validate if a string is a valid UUID
 */
function isValidUUID(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

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
  exercises?: SessionExerciseSummary[]; // 添加详细练习信息
};

export type SessionExerciseSummary = {
  exercise_name: string;
  sets_completed: number;
  total_reps: number;
  max_weight: number | null;
  total_volume: number; // weight × reps
  is_cardio?: boolean; // Whether this is a cardio exercise
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
  duration_minutes?: number | null;
  plan_id?: string | null;
  plan_name?: string | null;
  session_name?: string | null;
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

  /**
   * Helper function to check if an exercise is cardio based on name
   */
  private static isCardioExercise(exerciseName: string): boolean {
    // Explicitly exclude strength exercises that should never be treated as cardio
    const strengthExerciseNames = ['face pull', 'cable face pull', 'reverse fly', 'rear delt fly', 'rope pushdown', 'tricep rope', 'tricep pushdown'];
    if (exerciseName && strengthExerciseNames.some(name => 
      exerciseName.toLowerCase().includes(name)
    )) {
      return false;
    }

    const cardioKeywords = ['jump', 'burpee', 'running', 'sprint', 'hiit', 'interval', 'rope', 'mountain', 'climber', 
                            'jack', 'knee', 'kicker', 'bound', 'crawl', 'star', 'battle', 'swing', 'slam', 'shuttle', 
                            'fartlek', 'swimming', 'dance', 'dancing', 'step', 'stair', 'climb', 'cardio'];
    
    return cardioKeywords.some(keyword => exerciseName?.toLowerCase().includes(keyword));
  }

  static async getCompletedSessions(userId: string): Promise<CompletedSessionListItem[]> {
    console.log(`[WorkoutHistoryService] Getting completed sessions for user: ${userId}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return [];
    }
    
    // Handle guest user case - get all workout history records if user is 'guest'
    let actualUserId = userId;
    if (userId === 'guest') {
      console.log(`[WorkoutHistoryService] Guest user detected, checking for actual user records`);
      try {
        const { data: allRecords } = await supabase
          .from('workout_history')
          .select('user_id')
          .limit(1);
        
        if (allRecords && allRecords.length > 0) {
          actualUserId = allRecords[0].user_id;
          console.log(`[WorkoutHistoryService] Using actual user ID: ${actualUserId}`);
        }
      } catch (error) {
        console.warn('[WorkoutHistoryService] Could not determine actual user ID:', error);
      }
    }
    
    // Debug: Check current auth state
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log(`[WorkoutHistoryService] Current auth user: ${user?.id || 'NONE'}, Error: ${error?.message || 'NONE'}`);
      console.log(`[WorkoutHistoryService] Requested userId: ${userId}, Actual userId: ${actualUserId}, Match: ${user?.id === actualUserId}`);
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
          notes,
          exercises_data
        `)
        .eq('user_id', actualUserId)
        .order('completed_at', { ascending: false });

      if (!historyError && historyData && historyData.length > 0) {
        console.log(`[WorkoutHistoryService] Found ${historyData.length} completed sessions in workout_history`);
        const mappedData = historyData.map(this.mapHistoryData);
        return mappedData;
      }

      // FALLBACK: If query failed due to missing columns, try with only base columns
      if (historyError && historyError.message && historyError.message.includes('column')) {
        console.log(`[WorkoutHistoryService] Some columns missing in workout_history, retrying with base columns only`);
        
        const { data: baseHistoryData, error: baseHistoryError } = await supabase
          .from('workout_history')
          .select(`
            id,
            completed_at,
            total_sets,
            total_exercises,
            duration_minutes,
            notes
          `)
          .eq('user_id', actualUserId)
          .order('completed_at', { ascending: false });

        if (!baseHistoryError && baseHistoryData && baseHistoryData.length > 0) {
          console.log(`[WorkoutHistoryService] Found ${baseHistoryData.length} completed sessions in workout_history (base columns)`);
          const mappedData = baseHistoryData.map(this.mapHistoryData);
          return mappedData;
        }
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

      // Base selection for sessions - try with estimated_calories first
      const baseSelectWithCalories = `
        id,
        completed_at,
        week_number,
        day_number,
        estimated_calories,
        split_id
      `;
      
      // Fallback without estimated_calories if column doesn't exist
      const baseSelectWithoutCalories = `
        id,
        completed_at,
        week_number,
        day_number,
        split_id
      `;

      // Helper to apply completed filter that works across schemas
      const applyCompletedFilter = (q: any) => q.or('status.eq.completed,completed_at.not.is.null');
      
      // Helper function to try fetching with calories, fall back without
      const fetchSessionsWithFallback = async (query: any, baseSelect: string, fallbackSelect: string) => {
        const { data, error } = await applyCompletedFilter(
          query.select(baseSelect)
        );
        
        // If error is about missing column, try without that column
        if (error && error.message && error.message.includes('estimated_calories')) {
          console.log('[WorkoutHistoryService] estimated_calories column not found, retrying without it');
          return await applyCompletedFilter(query.select(fallbackSelect));
        }
        
        return { data, error };
      };

      // First approach: Filter by active plan
      if (activePlan?.id && this.isValidUUID(activePlan.id)) {
        console.log(`[WorkoutHistoryService] Filtering by active plan: ${activePlan.id}`);
        
        const query = supabase
          .from('workout_sessions')
          .eq('plan_id', activePlan.id)
          .order('completed_at', { ascending: false });
        
        const { data: activeData, error: activeError } = await fetchSessionsWithFallback(
          query,
          baseSelectWithCalories,
          baseSelectWithoutCalories
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
        
        const query = supabase
          .from('workout_sessions')
          .in('plan_id', planIds)
          .order('completed_at', { ascending: false });
        
        const { data: planData, error: planError } = await fetchSessionsWithFallback(
          query,
          baseSelectWithCalories,
          baseSelectWithoutCalories
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
            ${baseSelectWithoutCalories},
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

  /**
   * Get completed sessions with detailed exercise information for enhanced history display
   */
  static async getCompletedSessionsWithDetails(userId: string): Promise<CompletedSessionListItem[]> {
    console.log(`[WorkoutHistoryService] Getting completed sessions with details for user: ${userId}`);
    
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized');
      return [];
    }

    try {
      // Get basic session data first
      const sessions = await this.getCompletedSessions(userId);
      
      // For each session, get detailed exercise information
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          try {
            // Get exercise details for this session
            const exercises = await this.getSessionExerciseSummary(session.id);
            return {
              ...session,
              exercises
            };
          } catch (error) {
            console.error(`[WorkoutHistoryService] Error getting exercise details for session ${session.id}:`, error);
            return session; // Return session without exercise details if there's an error
          }
        })
      );

      console.log(`[WorkoutHistoryService] Successfully enhanced ${sessionsWithDetails.length} sessions with exercise details`);
      return sessionsWithDetails;
    } catch (error) {
      console.error('[WorkoutHistoryService] Error getting sessions with details:', error);
      return [];
    }
  }

  /**
   * Get exercise summary for a specific session
   */
  private static async getSessionExerciseSummary(sessionId: string): Promise<SessionExerciseSummary[]> {
    try {
      // Query the workout_history table for this session and get exercises_data
      const { data: sessionData, error } = await supabase
        .from('workout_history')
        .select('exercises_data')
        .eq('id', sessionId)
        .maybeSingle();

      if (error) {
        // Check if error message is HTML (Cloudflare error page)
        const errorMessage = error.message || String(error);
        const isHtmlError = typeof errorMessage === 'string' && (
          errorMessage.includes('<!DOCTYPE html>') ||
          errorMessage.includes('<html') ||
          errorMessage.includes('Internal server error') ||
          errorMessage.includes('Cloudflare')
        );
        
        if (isHtmlError) {
          console.warn(`[WorkoutHistoryService] Server error (500) when fetching exercise data for session ${sessionId}. This is likely a temporary Supabase/Cloudflare issue.`);
          console.warn(`[WorkoutHistoryService] Returning empty array - session details will still be available from backup data.`);
        } else {
          console.error(`[WorkoutHistoryService] Error fetching exercise data for session ${sessionId}:`, error);
        }
        return [];
      }

      if (!sessionData || !sessionData.exercises_data) {
        console.log(`[WorkoutHistoryService] No exercise data found for session ${sessionId}`);
        return [];
      }

      // Parse the exercises_data JSONB to extract exercise summaries
      const exercisesData = sessionData.exercises_data;
      
      if (!Array.isArray(exercisesData)) {
        console.log(`[WorkoutHistoryService] Invalid exercises_data format for session ${sessionId}`);
        return [];
      }

      // Group logs by exercise name first
      const exerciseGroups: Record<string, any[]> = {};
      
      exercisesData.forEach((exercise: any) => {
        // Get exercise name from various possible locations in the data structure
        let exerciseName = exercise.exercises?.name || // From nested exercises object (database query)
                          exercise.exercise_name ||     // From saved exercises_data
                          exercise.name ||              // Fallback
                          null;
        
        // Check if the name is actually a number (index) - if so, it's not a valid name
        if (exerciseName && /^\d+$/.test(String(exerciseName))) {
          console.warn(`[WorkoutHistoryService] Exercise name "${exerciseName}" appears to be an index, not a name. Using fallback.`);
          exerciseName = null;
        }
        
        // If still no valid name, use fallback
        if (!exerciseName) {
          exerciseName = 'Unknown Exercise';
        }
        
        // Get the logs/sets array - handle both database format (logs) and saved format (sets)
        const logs = Array.isArray(exercise.logs) ? exercise.logs :      // Database query format
                    Array.isArray(exercise.sets) ? exercise.sets :       // Saved exercises_data format
                    [];
        
        if (!exerciseGroups[exerciseName]) {
          exerciseGroups[exerciseName] = [];
        }
        
        // Add all logs for this exercise
        exerciseGroups[exerciseName].push(...logs);
      });
      
      // Process the grouped data to create summaries
      const exerciseSummaries: SessionExerciseSummary[] = Object.entries(exerciseGroups).map(([exerciseName, logs]) => {
        // Check if this is a cardio exercise
        const isCardio = this.isCardioExercise(exerciseName);
        
        // Calculate summary statistics from the logs
        const sets_completed = logs.length;
        const total_reps = logs.reduce((sum: number, log: any) => {
          const reps = log.actual_reps || log.reps || 0;
          return sum + reps;
        }, 0);
        const max_weight = logs.reduce((max: number | null, log: any) => {
          const weight = log.actual_weight ?? log.weight;
          if (weight == null) return max;
          return max == null ? weight : Math.max(max, weight);
        }, null);
        const total_volume = logs.reduce((sum: number, log: any) => {
          const weight = log.actual_weight ?? log.weight ?? 0;
          const reps = log.actual_reps ?? log.reps ?? 0;
          return sum + (weight * reps);
        }, 0);

        return {
          exercise_name: exerciseName,
          sets_completed,
          total_reps,
          max_weight,
          total_volume,
          is_cardio: isCardio
        };
      });

      console.log(`[WorkoutHistoryService] Generated ${exerciseSummaries.length} exercise summaries for session ${sessionId}`);
      return exerciseSummaries;
    } catch (error) {
      console.error(`[WorkoutHistoryService] Error generating exercise summary for session ${sessionId}:`, error);
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
    console.log(`[WorkoutHistoryService] Found session data for ID: ${sessionId}`);
    
    // Determine which session_id to use for fetching exercise data
    let actualSessionId = sessionData.session_id;
    console.log(`[WorkoutHistoryService] Using session_id: ${actualSessionId} to fetch exercise sets`);
    
    // If session_id is null (plan was deleted), try to use the workout_history id as fallback
    if (!actualSessionId) {
      console.log(`[WorkoutHistoryService] sessionData.session_id: ${sessionData.session_id}`);
      actualSessionId = sessionData.id; // Use the workout_history id as fallback
      console.log(`[WorkoutHistoryService] fallback sessionId: ${actualSessionId}`);
    }
    
    // Debug: Log the complete sessionData structure
    console.log(`🔍 [WorkoutHistoryService] Complete sessionData structure:`, JSON.stringify(sessionData, null, 2));
    console.log(`🔍 [WorkoutHistoryService] sessionData.exercises_data exists:`, !!sessionData.exercises_data);
    console.log(`🔍 [WorkoutHistoryService] sessionData.exercises_data type:`, typeof sessionData.exercises_data);
    console.log(`🔍 [WorkoutHistoryService] sessionData.exercises_data value:`, sessionData.exercises_data);

    // FIRST: Check if we have backup exercise data in the workout_history table
    if (sessionData.exercises_data) {
      console.log(`✅ [WorkoutHistoryService] Found backup exercise data in workout_history!`);
      console.log(`📊 [WorkoutHistoryService] Found backup exercise data with ${Array.isArray(sessionData.exercises_data) ? sessionData.exercises_data.length : 'unknown count'} exercises`);
      
      // Convert backup data to exercise format
      const exercises = await WorkoutHistoryService.convertBackupDataToExercises(sessionData.exercises_data, sessionData.completed_at);
      
      if (exercises.length > 0) {
        console.log(`🎯 [WorkoutHistoryService] Successfully converted backup data to ${exercises.length} exercises`);
        
        // Calculate totals from the backup data
        const totalExercises = exercises.length;
        const totalSets = exercises.reduce((sum, ex) => sum + ex.logs.length, 0);
        
        console.log(`📊 [WorkoutHistoryService] Calculated totals: ${totalExercises} exercises, ${totalSets} sets`);
        
        // Fetch duration from workout_history if available
        let durationMinutes: number | null = null;
        try {
          console.log(`[WorkoutHistoryService] Fetching duration for workout_history id: ${sessionData.id}`);
          const { data: historyData, error: historyError } = await supabase
            .from('workout_history')
            .select('duration_minutes, completed_at')
            .eq('id', sessionData.id)
            .maybeSingle();
          
          if (historyError) {
            console.warn('[WorkoutHistoryService] Error fetching duration by id:', historyError);
          }
          
          if (historyData?.duration_minutes !== null && historyData?.duration_minutes !== undefined) {
            durationMinutes = historyData.duration_minutes;
            console.log(`[WorkoutHistoryService] ✅ Found duration: ${durationMinutes} minutes`);
          } else {
            console.log(`[WorkoutHistoryService] No duration found in database, calculating from exercise logs...`);
            // Calculate duration from exercise log timestamps
            try {
              const allTimestamps: number[] = [];

              exercises.forEach((ex, exIdx) => {
                console.log(`[WorkoutHistoryService] Exercise ${exIdx + 1} (${ex.exercise_name}): ${ex.logs?.length || 0} logs`);
                (ex.logs || []).forEach((log: any, logIdx: number) => {
                  if (log.completed_at) {
                    const t = new Date(log.completed_at).getTime();
                    if (!isNaN(t)) {
                      allTimestamps.push(t);
                      console.log(`[WorkoutHistoryService]   Log ${logIdx + 1}: ${log.completed_at} -> ${t}`);
                    } else {
                      console.warn(`[WorkoutHistoryService]   Log ${logIdx + 1}: Invalid timestamp ${log.completed_at}`);
                    }
                  } else {
                    console.warn(`[WorkoutHistoryService]   Log ${logIdx + 1}: No completed_at timestamp`);
                  }
                });
              });

              console.log(`[WorkoutHistoryService] Collected ${allTimestamps.length} valid timestamps`);

              if (allTimestamps.length >= 2) {
                const minTime = Math.min(...allTimestamps);
                const maxTime = Math.max(...allTimestamps);
                const calculatedDurationRaw = Math.round((maxTime - minTime) / 60000);
                const safeDuration = Math.max(calculatedDurationRaw, 1);

                console.log(`[WorkoutHistoryService] Time range: ${new Date(minTime).toISOString()} to ${new Date(maxTime).toISOString()}`);
                console.log(`[WorkoutHistoryService] Raw duration: ${calculatedDurationRaw} minutes`);

                if (!Number.isNaN(safeDuration) && safeDuration > 0) {
                  durationMinutes = safeDuration;
                  console.log(`[WorkoutHistoryService] ✅ Calculated duration from set logs: ${durationMinutes} minutes (from ${allTimestamps.length} timestamps)`);
                } else {
                  console.warn(`[WorkoutHistoryService] ⚠️ Calculated duration was invalid: ${calculatedDurationRaw} -> ${safeDuration}`);
                  if (allTimestamps.length > 0) {
                    durationMinutes = 1;
                    console.log(`[WorkoutHistoryService] ⚠️ Setting duration to 1 minute as fallback`);
                  }
                }
              } else if (allTimestamps.length === 1) {
                durationMinutes = 1;
                console.log(`[WorkoutHistoryService] ⚠️ Only 1 set timestamp found, defaulting to 1 minute`);
              } else {
                console.warn(`[WorkoutHistoryService] ⚠️ No valid timestamps found in exercise logs (found ${allTimestamps.length})`);
                if (totalSets > 0) {
                  durationMinutes = Math.max(totalSets, 1);
                  console.log(`[WorkoutHistoryService] ⚠️ No timestamps, estimating ${durationMinutes} minutes based on ${totalSets} sets`);
                }
              }
            } catch (calcError) {
              console.warn('[WorkoutHistoryService] Error calculating duration from logs:', calcError);
              if (totalSets > 0) {
                durationMinutes = Math.max(totalSets, 1);
                console.log(`[WorkoutHistoryService] ⚠️ Error in calculation, estimating ${durationMinutes} minutes based on ${totalSets} sets`);
              }
            }
          }
        } catch (error) {
          console.warn('[WorkoutHistoryService] Could not fetch duration:', error);
        }
        
        return {
          id: sessionData.id,
          completed_at: sessionData.completed_at,
          duration_minutes: durationMinutes,
          plan_id: sessionData.plan_id || null,
          plan_name: sessionData.plan_name || null,
          session_name: sessionData.session_name || null,
          exercises,
        };
      } else {
        console.log(`⚠️ [WorkoutHistoryService] Backup data exists but converted to 0 exercises, trying fallback...`);
      }
    } else {
      console.log(`❌ [WorkoutHistoryService] No exercises_data found in workout_history`);
      console.log(`🔍 [WorkoutHistoryService] Available sessionData keys:`, Object.keys(sessionData || {}));
    }
    
    // FALLBACK: Try to get exercise sets from exercise_sets table (if plan/session still exist)
    console.log(`🔄 [WorkoutHistoryService] Trying to fetch from exercise_sets table...`);
    
    if (!actualSessionId) {
      console.log(`❌ [WorkoutHistoryService] No session_id available, cannot fetch exercise sets`);
      
      // Create a placeholder entry with session info if we have plan/session names
      const placeholderExercises = [];
      if (sessionData.plan_name || sessionData.session_name) {
        console.log(`📝 [WorkoutHistoryService] Creating placeholder entry for deleted plan`);
        placeholderExercises.push({
          id: uuidv4(),
          exercise_id: uuidv4(),
          exercise_name: 'Workout Data Lost',
          muscle_groups: [],
          equipment_needed: [],
          logs: [{
            id: uuidv4(),
            actual_reps: 0,
            actual_weight: null,
            rpe: null,
            completed_at: sessionData.completed_at,
            notes: `Original workout details were lost when the plan "${sessionData.plan_name || 'Unknown Plan'}" was deleted. This workout was completed on ${new Date(sessionData.completed_at).toLocaleDateString()}.`,
            volume_delta: 0,
            top_set_delta: null
          }]
        });
      }
      
      // Fetch duration from workout_history if available
      // Use the workout_history id (sessionData.id) instead of session_id
      let durationMinutes: number | null = null;
      try {
        const { data: historyData } = await supabase
          .from('workout_history')
          .select('duration_minutes')
          .eq('id', sessionData.id)
          .maybeSingle();
        
        if (historyData?.duration_minutes) {
          durationMinutes = historyData.duration_minutes;
        } else {
          // Fallback: try querying by session_id if id didn't work
          const { data: fallbackData } = await supabase
            .from('workout_history')
            .select('duration_minutes')
            .eq('session_id', actualSessionId)
            .maybeSingle();
          
          if (fallbackData?.duration_minutes) {
            durationMinutes = fallbackData.duration_minutes;
          }
        }
      } catch (error) {
        console.warn('[WorkoutHistoryService] Could not fetch duration:', error);
      }

      // Return session details with placeholder or empty data
      return {
        id: sessionData.id,
        completed_at: sessionData.completed_at,
        duration_minutes: durationMinutes,
        exercises: placeholderExercises,
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
      console.log(`📊 [WorkoutHistoryService] Loaded ${sets.length} exercise sets`);
    }

    const exercises: SessionExerciseLog[] = [];

    if (sets && sets.length > 0) {
      // Normal case: We have exercise_sets, process them
      // First, collect all unique exercise_ids and fetch their names
      const exerciseIds = [...new Set(sets.map(s => s.exercise_id))];
      const exerciseNameMap = new Map<string, string>();
      
      // Fetch exercise names in batch
      if (exerciseIds.length > 0) {
        const { data: exercisesData } = await supabase
          .from('exercises')
          .select('id, name')
          .in('id', exerciseIds);
        
        if (exercisesData) {
          exercisesData.forEach(ex => {
            exerciseNameMap.set(ex.id, ex.name);
          });
        }
      }
      
      for (const set of sets) {
        // Try to get name from join first, then from our map, then fallback
        let exerciseName = (set as any).exercises?.name;
        if (!exerciseName && set.exercise_id) {
          exerciseName = exerciseNameMap.get(set.exercise_id);
        }
        if (!exerciseName) {
          exerciseName = 'Unknown Exercise';
          console.warn(`[WorkoutHistoryService] Could not find exercise name for exercise_id: ${set.exercise_id}`);
        }
        
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
    } else {
      // Fallback case: No exercise_sets found, try to get exercises from workout_history.exercises_data
      console.log(`🔄 [WorkoutHistoryService] No exercise_sets found, checking workout_history for exercises_data`);
      
      const { data: historyData, error: historyError } = await supabase
        .from('workout_history')
        .select('exercises_data')
        .eq('session_id', actualSessionId)
        .single();
      
      if (historyError) {
        console.warn(`[WorkoutHistoryService] Could not fetch workout_history for session ${actualSessionId}:`, historyError);
      } else if (historyData?.exercises_data) {
        console.log(`[WorkoutHistoryService] Found exercises_data in workout_history, converting to exercise logs`);
        
        // Convert exercises_data to SessionExerciseLog format
        const convertedExercises = await WorkoutHistoryService.convertBackupDataToExercises(historyData.exercises_data, sessionData.completed_at);
        exercises.push(...convertedExercises);
        
        console.log(`[WorkoutHistoryService] Successfully converted ${convertedExercises.length} exercises from backup data`);
      } else {
        console.warn(`[WorkoutHistoryService] No exercises_data found in workout_history for session ${actualSessionId}`);
      }
    }
    
    console.log(`🎯 [WorkoutHistoryService] Successfully built details for ${exercises.length} exercises`);
    console.log(`📋 [WorkoutHistoryService] Final result structure:`, {
      id: sessionData.id,
      completed_at: sessionData.completed_at,
      exercise_count: exercises.length
    });

    // Fetch duration from workout_history if available
    // Use the workout_history id (sessionData.id) instead of session_id
    let durationMinutes: number | null = null;
    try {
      console.log(`[WorkoutHistoryService] Fetching duration for workout_history id: ${sessionData.id}`);
      const { data: historyData, error: historyError } = await supabase
        .from('workout_history')
        .select('duration_minutes, completed_at')
        .eq('id', sessionData.id)
        .maybeSingle();
      
      if (historyError) {
        console.warn('[WorkoutHistoryService] Error fetching duration by id:', historyError);
      }
      
      if (historyData?.duration_minutes !== null && historyData?.duration_minutes !== undefined) {
        durationMinutes = historyData.duration_minutes;
        console.log(`[WorkoutHistoryService] ✅ Found duration: ${durationMinutes} minutes`);
      } else {
        console.log(`[WorkoutHistoryService] No duration found by id, trying session_id fallback...`);
        // Fallback: try querying by session_id if id didn't work
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('workout_history')
          .select('duration_minutes, completed_at')
          .eq('session_id', actualSessionId)
          .maybeSingle();
        
        if (fallbackError) {
          console.warn('[WorkoutHistoryService] Error fetching duration by session_id:', fallbackError);
        }
        
        if (fallbackData?.duration_minutes !== null && fallbackData?.duration_minutes !== undefined) {
          durationMinutes = fallbackData.duration_minutes;
          console.log(`[WorkoutHistoryService] ✅ Found duration by session_id: ${durationMinutes} minutes`);
        } else {
          // Last resort: calculate from completed_at if we have session start/end times
          if (historyData?.completed_at && sessionData.completed_at) {
            const startTime = new Date(sessionData.completed_at).getTime();
            const endTime = new Date(historyData.completed_at).getTime();
            const calculatedDurationRaw = Math.round((endTime - startTime) / 60000);
            const safeDuration = Math.max(calculatedDurationRaw, 1); // At least 1 minute if any work was logged
            if (!Number.isNaN(safeDuration) && safeDuration > 0) {
              durationMinutes = safeDuration;
              console.log(`[WorkoutHistoryService] ⚠️ Calculated duration from timestamps: ${durationMinutes} minutes`);
            }
          }
          if (durationMinutes === null) {
            console.warn('[WorkoutHistoryService] ⚠️ Could not find or calculate duration');
          }
        }
      }
    } catch (error) {
      console.warn('[WorkoutHistoryService] Could not fetch duration:', error);
    }

    // FINAL FALLBACK: If duration is still missing, calculate from first and last set log times
    if ((durationMinutes === null || durationMinutes === undefined) && exercises.length > 0) {
      try {
        console.log(`[WorkoutHistoryService] 🔄 Attempting to calculate duration from exercise logs...`);
        const allTimestamps: number[] = [];

        exercises.forEach((ex, exIdx) => {
          console.log(`[WorkoutHistoryService] Exercise ${exIdx + 1} (${ex.exercise_name}): ${ex.logs?.length || 0} logs`);
          (ex.logs || []).forEach((log: any, logIdx: number) => {
            if (log.completed_at) {
              const t = new Date(log.completed_at).getTime();
              if (!isNaN(t)) {
                allTimestamps.push(t);
                console.log(`[WorkoutHistoryService]   Log ${logIdx + 1}: ${log.completed_at} -> ${t}`);
              } else {
                console.warn(`[WorkoutHistoryService]   Log ${logIdx + 1}: Invalid timestamp ${log.completed_at}`);
              }
            } else {
              console.warn(`[WorkoutHistoryService]   Log ${logIdx + 1}: No completed_at timestamp`);
            }
          });
        });

        console.log(`[WorkoutHistoryService] Collected ${allTimestamps.length} valid timestamps`);

        if (allTimestamps.length >= 2) {
          const minTime = Math.min(...allTimestamps);
          const maxTime = Math.max(...allTimestamps);
          const calculatedDurationRaw = Math.round((maxTime - minTime) / 60000);
          const safeDuration = Math.max(calculatedDurationRaw, 1); // Treat ultra-short sessions as 1 minute

          console.log(`[WorkoutHistoryService] Time range: ${new Date(minTime).toISOString()} to ${new Date(maxTime).toISOString()}`);
          console.log(`[WorkoutHistoryService] Raw duration: ${calculatedDurationRaw} minutes`);

          if (!Number.isNaN(safeDuration) && safeDuration > 0) {
            durationMinutes = safeDuration;
            console.log(`[WorkoutHistoryService] ✅ Calculated duration from set logs: ${durationMinutes} minutes (from ${allTimestamps.length} timestamps)`);
          } else {
            console.warn(`[WorkoutHistoryService] ⚠️ Calculated duration was invalid: ${calculatedDurationRaw} -> ${safeDuration}`);
            // Even if calculation fails, set to 1 minute if we have logs
            if (allTimestamps.length > 0) {
              durationMinutes = 1;
              console.log(`[WorkoutHistoryService] ⚠️ Setting duration to 1 minute as fallback`);
            }
          }
        } else if (allTimestamps.length === 1) {
          // Only one set logged, assume 1 minute minimum
          durationMinutes = 1;
          console.log(`[WorkoutHistoryService] ⚠️ Only 1 set timestamp found, defaulting to 1 minute`);
        } else {
          console.warn(`[WorkoutHistoryService] ⚠️ No valid timestamps found in exercise logs (found ${allTimestamps.length})`);
          // If we have exercises but no timestamps, still set a minimum duration
          if (exercises.length > 0) {
            const totalSets = exercises.reduce((sum, ex) => sum + (ex.logs?.length || 0), 0);
            if (totalSets > 0) {
              durationMinutes = Math.max(totalSets, 1); // At least 1 minute per set
              console.log(`[WorkoutHistoryService] ⚠️ No timestamps, estimating ${durationMinutes} minutes based on ${totalSets} sets`);
            }
          }
        }
      } catch (calcError) {
        console.warn('[WorkoutHistoryService] Error calculating duration from logs:', calcError);
        // Last resort: if we have exercises, set a minimum duration
        if (exercises.length > 0) {
          const totalSets = exercises.reduce((sum, ex) => sum + (ex.logs?.length || 0), 0);
          if (totalSets > 0) {
            durationMinutes = Math.max(totalSets, 1);
            console.log(`[WorkoutHistoryService] ⚠️ Error in calculation, estimating ${durationMinutes} minutes based on ${totalSets} sets`);
          }
        }
      }
    }

    return {
      id: sessionData.id,
      completed_at: sessionData.completed_at,
      duration_minutes: durationMinutes,
      plan_id: sessionData.plan_id || null,
      plan_name: sessionData.plan_name || null,
      session_name: sessionData.session_name || null,
      exercises,
    };
  }

  /**
   * Convert backup exercise data from JSONB to SessionExerciseLog format
   */
  private static async convertBackupDataToExercises(exercisesData: any, sessionCompletedAt?: string): Promise<SessionExerciseLog[]> {
    try {
      console.log(`[WorkoutHistoryService] Converting backup data:`, exercisesData);
      
      // Handle different data structures
      let exercisesArray: any[] = [];
      
      if (exercisesData && typeof exercisesData === 'object') {
        if (Array.isArray(exercisesData)) {
          // Check if this is exercise_sets data (flat array of sets)
          if (exercisesData.length > 0 && exercisesData[0].exercise_id && exercisesData[0].actual_reps !== undefined) {
            console.log(`[WorkoutHistoryService] Detected exercise_sets format with ${exercisesData.length} sets`);
            return await this.convertExerciseSetsToSessionLogs(exercisesData);
          }
          // Legacy format: direct array of exercises
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
      
      // First, collect all exercise_ids that need name lookup
      const exerciseIdsNeedingName: string[] = [];
      exercisesArray.forEach(ex => {
        const exerciseId = ex.exercise_id || ex.id;
        const exerciseName = ex.exercise_name || ex.name;
        if (exerciseId && !exerciseName) {
          exerciseIdsNeedingName.push(exerciseId);
        }
      });
      
      // Fetch exercise names in batch if needed
      const exerciseNameMap = new Map<string, string>();
      if (exerciseIdsNeedingName.length > 0 && supabase) {
        try {
          const { data: exercisesData } = await supabase
            .from('exercises')
            .select('id, name')
            .in('id', exerciseIdsNeedingName);
          
          if (exercisesData) {
            exercisesData.forEach(ex => {
              exerciseNameMap.set(ex.id, ex.name);
            });
          }
        } catch (error) {
          console.warn('[WorkoutHistoryService] Could not fetch exercise names for backup data:', error);
        }
      }
      
      const exercises: SessionExerciseLog[] = [];

      for (const exercise of exercisesArray) {
        const exerciseId = exercise.exercise_id || exercise.id;
        let exerciseName = exercise.exercise_name || exercise.name;
        
        // Check if the name is actually a number (index) - if so, it's not a valid name
        const isNumericName = exerciseName && /^\d+$/.test(String(exerciseName));
        if (isNumericName) {
          console.warn(`[WorkoutHistoryService] Exercise name "${exerciseName}" appears to be an index, not a name. Looking up by ID...`);
          exerciseName = null; // Reset to null so we can look it up properly
        }
        
        // If name is missing but we have an ID, try to get it from our map
        if (!exerciseName && exerciseId) {
          exerciseName = exerciseNameMap.get(exerciseId);
        }
        
        // If still no name, check if exerciseId looks like a UUID (which means it's probably an ID, not a name)
        if (!exerciseName && exerciseId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId)) {
          // This is a UUID, not a name - we couldn't find the exercise
          exerciseName = 'Unknown Exercise';
          console.warn(`[WorkoutHistoryService] Exercise ID ${exerciseId} appears to be a UUID but name not found in database`);
        } else if (!exerciseName) {
          exerciseName = 'Unknown Exercise';
        }
        
        console.log(`[WorkoutHistoryService] Processing exercise:`, {
          exercise_id: exerciseId,
          exercise_name: exerciseName,
          has_sets: !!exercise.sets,
          sets_count: exercise.sets?.length || 0,
          has_actual_logs: !!exercise.actual_logs,
          actual_logs_count: exercise.actual_logs?.length || 0,
          has_reps_array: !!exercise.reps && Array.isArray(exercise.reps),
          reps_count: exercise.reps?.length || 0,
          has_weights_array: !!exercise.weights && Array.isArray(exercise.weights),
          weights_count: exercise.weights?.length || 0
        });

        // Handle different set data structures
        let exerciseLogs: any[] = [];
        
        if (exercise.sets && Array.isArray(exercise.sets)) {
          // New format: sets array with direct data
          console.log(`[WorkoutHistoryService] Processing ${exercise.sets.length} sets with direct data`);
          
          for (const set of exercise.sets) {
            if (set.reps !== undefined || set.weight !== undefined) {
              exerciseLogs.push({
                id: uuidv4(),
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
                id: uuidv4(),
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
            id: uuidv4(),
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
            id: uuidv4(),
            actual_reps: log.actual_reps || log.reps || 0,
            actual_weight: log.actual_weight || log.weight || null,
            actual_rpe: log.actual_rpe || log.rpe || null,
            completed_at: log.completed_at || new Date().toISOString(),
            notes: log.notes || null
          })));
        } else if (exercise.reps && Array.isArray(exercise.reps) && exercise.weights && Array.isArray(exercise.weights)) {
          // Standalone workout format: reps and weights arrays (legacy format without timestamps)
          console.log(`[WorkoutHistoryService] Processing standalone format with ${exercise.reps.length} sets`);
          const repsArray = exercise.reps;
          const weightsArray = exercise.weights;
          
          // For legacy format, we don't have individual timestamps, so we'll use the session completion time
          // with a small offset to differentiate sets
          const baseTime = sessionCompletedAt ? new Date(sessionCompletedAt) : new Date();
          
          for (let i = 0; i < repsArray.length; i++) {
            // Use session completion time with a small offset (each set is 1 minute before the previous)
            // This is a best-effort approximation since we don't have actual timestamps
            const estimatedTime = new Date(baseTime);
            estimatedTime.setMinutes(estimatedTime.getMinutes() - (repsArray.length - i - 1));
            
            exerciseLogs.push({
              id: uuidv4(),
              actual_reps: repsArray[i] || 0,
              actual_weight: weightsArray[i] || null,
              actual_rpe: null,
              completed_at: estimatedTime.toISOString(),
              notes: null
            });
          }
        }

        console.log(`[WorkoutHistoryService] Created ${exerciseLogs.length} exercise logs for "${exercise.exercise_name || exercise.name || 'Unknown Exercise'}"`);

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
            exercise_set_id: exerciseId || uuidv4(),
            exercise_name: exerciseName,
            target_sets: exerciseLogs.length, // Use actual number of sets performed
            target_reps: '0', // Not available in backup data
            logs: exerciseLogs,
            total_volume: totalVolume,
            top_set_weight: topSetWeight,
          });
        } else {
          console.log(`[WorkoutHistoryService] Skipping exercise "${exercise.exercise_name || exercise.name || 'unknown'}" - no valid log data found`);
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

  /**
   * Convert exercise_sets data to SessionExerciseLog format
   * Handles the flat array of sets from exercise_sets table
   */
  private static async convertExerciseSetsToSessionLogs(exerciseSets: any[]): Promise<SessionExerciseLog[]> {
    try {
      console.log(`[WorkoutHistoryService] Converting ${exerciseSets.length} exercise sets to session logs`);
      
      // Group sets by exercise_id
      const exerciseGroups = new Map<string, {
        exercise_id: string;
        exercise_name: string;
        logs: any[];
      }>();
      
      // First, collect all unique exercise_ids and fetch their names
      const exerciseIds = [...new Set(exerciseSets.map(s => s.exercise_id))];
      const exerciseNameMap = new Map<string, string>();
      
      // Fetch exercise names in batch if we have a supabase client
      if (exerciseIds.length > 0 && supabase) {
        try {
          const { data: exercisesData } = await supabase
            .from('exercises')
            .select('id, name')
            .in('id', exerciseIds);
          
          if (exercisesData) {
            exercisesData.forEach(ex => {
              exerciseNameMap.set(ex.id, ex.name);
            });
          }
        } catch (error) {
          console.warn('[WorkoutHistoryService] Could not fetch exercise names:', error);
        }
      }
      
      for (const set of exerciseSets) {
        const exerciseId = set.exercise_id;
        if (!exerciseGroups.has(exerciseId)) {
          // Try to get name from join, then from map, then fallback
          let exerciseName = set.exercises?.name;
          if (!exerciseName && exerciseId) {
            exerciseName = exerciseNameMap.get(exerciseId);
          }
          if (!exerciseName) {
            exerciseName = 'Unknown Exercise';
            console.warn(`[WorkoutHistoryService] Could not find exercise name for exercise_id: ${exerciseId}`);
          }
          
          exerciseGroups.set(exerciseId, {
            exercise_id: exerciseId,
            exercise_name: exerciseName,
            logs: []
          });
        }
        
        // Add this set as a log - use actual completed_at if available
        exerciseGroups.get(exerciseId)!.logs.push({
          id: uuidv4(),
          actual_reps: set.actual_reps || 0,
          actual_weight: set.actual_weight || null,
          actual_rpe: set.rpe || null,
          completed_at: set.completed_at || new Date().toISOString(),
          notes: null
        });
      }
      
      // Convert to SessionExerciseLog array
      const exercises: SessionExerciseLog[] = [];
      
      for (const exercise of exerciseGroups.values()) {
        const totalVolume = exercise.logs.reduce((sum: number, log: any) => {
          if (log.actual_weight != null) return sum + log.actual_reps * Number(log.actual_weight);
          return sum;
        }, 0);
        
        const topSetWeight = exercise.logs.reduce((max: number | null, log: any) => {
          if (log.actual_weight == null) return max;
          const val = Number(log.actual_weight);
          return max == null ? val : Math.max(max, val);
        }, null as number | null);

        exercises.push({
          exercise_set_id: exercise.exercise_id,
          exercise_name: exercise.exercise_name,
          target_sets: exercise.logs.length,
          target_reps: '0', // Not available in exercise_sets data
          logs: exercise.logs,
          total_volume: totalVolume,
          top_set_weight: topSetWeight,
        });
      }
      
      console.log(`[WorkoutHistoryService] Successfully converted to ${exercises.length} exercises with logs`);
      exercises.forEach(ex => {
        console.log(`- ${ex.exercise_name}: ${ex.logs.length} sets, ${ex.total_volume} volume`);
      });
      
      return exercises;
    } catch (error) {
      console.error('[WorkoutHistoryService] Error converting exercise sets to session logs:', error);
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
  /**
   * Save custom workout history (for workouts not from database plans)
   */
  static async saveCustomWorkoutHistory(historyData: {
    user_id: string;
    plan_name: string;
    session_name: string;
    completed_at: string;
    duration_minutes?: number;
    total_sets?: number;
    total_exercises?: number;
    estimated_calories?: number | null;
    notes?: string;
    exercises_data?: any;
  }): Promise<boolean> {
    console.log(`[WorkoutHistoryService] Saving custom workout history: ${historyData.session_name}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return false;
    }
    
    try {
      // Create enhanced history data with permanent information for custom workouts
      const enhancedHistoryData = {
        user_id: historyData.user_id,
        plan_id: null, // No database plan for custom workouts
        session_id: null, // No database session for custom workouts
        completed_at: historyData.completed_at,
        duration_minutes: historyData.duration_minutes,
        total_sets: historyData.total_sets,
        total_exercises: historyData.total_exercises,
        estimated_calories: historyData.estimated_calories,
        notes: historyData.notes,
        // Permanent storage fields for custom workouts
        plan_name: historyData.plan_name,
        session_name: historyData.session_name,
        week_number: null, // Custom workouts don't have week/day structure
        day_number: null,
        exercises_data: historyData.exercises_data || null
      };

      const { data, error } = await supabase
        .from('workout_history')
        .insert([enhancedHistoryData] as any)
        .select()
        .single();
        
      if (error) {
        console.error('[WorkoutHistoryService] Error saving custom workout history:', error);
        return false;
      }
      
      console.log(`[WorkoutHistoryService] Successfully saved custom workout history with ID: ${data?.id}`);
      console.log(`[WorkoutHistoryService] Custom workout: "${historyData.plan_name}" - "${historyData.session_name}", ${historyData.total_exercises} exercises, ${historyData.total_sets} sets, ${historyData.estimated_calories} calories`);
      return true;
    } catch (error) {
      console.error(`[WorkoutHistoryService] Error saving custom workout history:`, error);
      return false;
    }
  }

  static async saveWorkoutHistory(historyData: {
    user_id: string;
    plan_id: string | null;
    session_id: string | null;
    completed_at: string;
    duration_minutes?: number;
    total_sets?: number;
    total_exercises?: number;
    estimated_calories?: number | null;
    notes?: string;
    plan_name?: string;
    session_name?: string;
    week_number?: number;
    day_number?: number;
    exercises_data?: any;
  }): Promise<boolean> {
    console.log(`[WorkoutHistoryService] Saving workout history for session: ${historyData.session_id}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return false;
    }
    
    try {
      // Use provided data or fetch from database
      let planName = historyData.plan_name || 'Unknown Plan';
      let sessionName = historyData.session_name || 'Unknown Session';
      let weekNumber: number | null = historyData.week_number || null;
      let dayNumber: number | null = historyData.day_number || null;
      let exercisesData: any = historyData.exercises_data || null;

      // Only fetch plan details if not provided and plan_id exists
      if (!historyData.plan_name && historyData.plan_id) {
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
      }

      // Only fetch session details if not provided and session_id exists
      if ((!historyData.session_name || !historyData.exercises_data) && historyData.session_id) {
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

          // Use provided exercises_data if available, otherwise try to fetch from database
          if (historyData.exercises_data) {
            exercisesData = historyData.exercises_data;
            console.log('[WorkoutHistoryService] Using provided exercises_data:', exercisesData.length, 'exercises');
          } else if (historyData.session_id) {
            // Fallback: Get exercise sets data from database if no exercises_data provided
            // Need to join exercise_sets with exercise_logs to get actual performance data
            const { data: setsData } = await supabase
              .from('exercise_sets')
              .select(`
                id, 
                exercise_id, 
                order_in_session,
                target_sets,
                target_reps, 
                target_rpe,
                rest_period,
                exercises (name, category, muscle_groups)
              `)
              .eq('session_id', historyData.session_id)
              .order('order_in_session');
            
            if (setsData && setsData.length > 0) {
              // Now fetch the exercise logs for these sets
              const setIds = setsData.map(set => set.id);
              const { data: logsData } = await supabase
                .from('exercise_logs')
                .select('set_id, actual_reps, actual_weight, actual_rpe, completed_at')
                .in('set_id', setIds);
              
              // Group logs by set_id
              const logsBySetId: Record<string, any[]> = {};
              if (logsData) {
                logsData.forEach(log => {
                  if (!logsBySetId[log.set_id]) {
                    logsBySetId[log.set_id] = [];
                  }
                  logsBySetId[log.set_id].push(log);
                });
              }
              
              // Transform the data to include logs with each set
              exercisesData = setsData.map(set => ({
                ...set,
                logs: logsBySetId[set.id] || []
              }));
              
              console.log('[WorkoutHistoryService] Using fallback exercises_data from database:', setsData.length, 'exercise sets with', logsData?.length || 0, 'logs');
            }
          }
        } catch (sessionError) {
          console.warn('[WorkoutHistoryService] Could not fetch session details:', sessionError);
        }
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
        .insert([enhancedHistoryData] as any)
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
    
    // Process exercises_data to create exercises summary
    let exercises: SessionExerciseSummary[] = [];
    if (history.exercises_data) {
      try {
        exercises = WorkoutHistoryService.convertExercisesDataToSummary(history.exercises_data);
        console.log(`[WorkoutHistoryService] Converted exercises_data to ${exercises.length} exercise summaries`);
      } catch (error) {
        console.warn(`[WorkoutHistoryService] Error processing exercises_data for session ${history.id}:`, error);
      }
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
      exercises: exercises.length > 0 ? exercises : undefined, // Only include if we have exercises
    };
    
    console.log(`[WorkoutHistoryService] Mapped result with ${exercises.length} exercises:`, mappedData);
    return mappedData;
  }

  /**
   * Convert exercises_data from workout_history to SessionExerciseSummary format
   */
  private static convertExercisesDataToSummary(exercisesData: any): SessionExerciseSummary[] {
    if (!exercisesData) return [];

    try {
      // Handle different formats of exercises_data
      let exercisesArray: any[] = [];
      
      if (Array.isArray(exercisesData)) {
        exercisesArray = exercisesData;
      } else if (typeof exercisesData === 'object') {
        // Could be a single exercise object or other format
        if (exercisesData.id || exercisesData.name) {
          exercisesArray = [exercisesData];
        } else {
          console.warn('[WorkoutHistoryService] Unknown exercises_data format:', exercisesData);
          return [];
        }
      } else {
        console.warn('[WorkoutHistoryService] Invalid exercises_data type:', typeof exercisesData);
        return [];
      }

      const summaries: SessionExerciseSummary[] = [];

      for (const exercise of exercisesArray) {
        try {
          // Extract exercise info - handle different data structures
          const exerciseName = exercise.name || exercise.exercise_name || `Exercise ${exercise.id || 'Unknown'}`;
          
          
          // Handle both old format (sets as number, separate reps/weights arrays) and new format (sets as array of objects)
          let setsCompleted = 0;
          let totalReps = 0;
          let maxWeight: number | null = null;
          let totalVolume = 0;
          
          if (Array.isArray(exercise.sets)) {
            // New format: sets is an array of set objects
            setsCompleted = exercise.sets.length;
            
            for (const set of exercise.sets) {
              const setReps = set.reps || 0;
              const setWeight = set.weight || set.original_weight || 0;
              
              totalReps += setReps;
              totalVolume += setReps * setWeight;
              
              if (setWeight > 0) {
                maxWeight = maxWeight === null ? setWeight : Math.max(maxWeight, setWeight);
              }
            }
          } else {
            // Old format: sets as number, separate reps/weights arrays
            setsCompleted = exercise.sets || 0;
            const reps = exercise.reps || [];
            const weights = exercise.weights || [];

            totalReps = Array.isArray(reps) ? reps.reduce((sum: number, r: number) => sum + (r || 0), 0) : 0;
            
            // Calculate max weight, filtering out zero/invalid weights
            if (Array.isArray(weights) && weights.length > 0) {
              const validWeights = weights.filter((w: any) => typeof w === 'number' && w > 0);
              if (validWeights.length > 0) {
                maxWeight = Math.max(...validWeights);
              }
            }
            
            // Calculate total volume (weight × reps for each set, then sum)
            if (Array.isArray(reps) && Array.isArray(weights)) {
              for (let i = 0; i < Math.min(reps.length, weights.length); i++) {
                const setReps = reps[i] || 0;
                const setWeight = weights[i] || 0;
                totalVolume += setReps * setWeight;
              }
            }
          }

          const summary = {
            exercise_name: exerciseName,
            sets_completed: setsCompleted,
            total_reps: totalReps,
            max_weight: maxWeight,
            total_volume: totalVolume
          };
          
          summaries.push(summary);

        } catch (exerciseError) {
          console.warn('[WorkoutHistoryService] Error processing individual exercise:', exerciseError, exercise);
        }
      }

      console.log(`[WorkoutHistoryService] Converted ${exercisesArray.length} exercises to ${summaries.length} summaries`);
      return summaries;

    } catch (error) {
      console.error('[WorkoutHistoryService] Error converting exercises_data to summary:', error);
      return [];
    }
  }
}