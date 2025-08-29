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
        training_splits:split_id(name, focus_areas)
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
    console.log(`[WorkoutHistoryService] Getting details for session: ${sessionId}`);
    
    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutHistoryService] Supabase client not initialized. Check environment variables.');
      return null;
    }
    
    // Get session basic info
    const { data: sessionData, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('id, completed_at, plan_id, week_number, day_number')
      .eq('id', sessionId)
      .maybeSingle();
    
    if (sessionError) {
      console.error('[WorkoutHistoryService] Error fetching session:', sessionError);
      return null;
    }
    
    if (!sessionData) {
      console.log('[WorkoutHistoryService] No session data found for ID:', sessionId);
      return null;
    }
    
    console.log(`[WorkoutHistoryService] Found session with completion date: ${sessionData.completed_at}`);

    // Fetch exercise sets with exercise info
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
      .eq('session_id', sessionId)
      .order('order_in_session');
      
    if (setsError) {
      console.error('[WorkoutHistoryService] Error fetching exercise sets:', setsError);
      return null;
    }
    
    console.log(`[WorkoutHistoryService] Found ${sets?.length || 0} exercise sets`);

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
    
    console.log(`[WorkoutHistoryService] Successfully built details for ${exercises.length} exercises`);

    return {
      id: sessionData.id,
      completed_at: sessionData.completed_at,
      exercises,
    };
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
    let sessionQuery = supabase
      .from('workout_sessions')
      .select('id, completed_at, week_number, day_number')
      .eq('plan_id', planId)
      .or('status.eq.completed,completed_at.not.is.null')
      .order('completed_at', { ascending: false })
      .limit(10);

    const { data: candidates } = await sessionQuery;
    const { data: prevSetCandidates } = await supabase
      .from('exercise_sets')
      .select('id, session_id')
      .eq('exercise_id', exerciseId)
      .in('session_id', (candidates || []).map(s => s.id));

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
          .select('week_number, day_number')
          .eq('id', historyData.session_id)
          .single();
        
        if (sessionData) {
          weekNumber = sessionData.week_number;
          dayNumber = sessionData.day_number;
          sessionName = `Week ${weekNumber} Day ${dayNumber}`;
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
    return {
      id: s.id,
      completed_at: s.completed_at,
      week_number: s.week_number ?? null,
      day_number: s.day_number ?? null,
      split_name: s.training_splits?.name ?? null,
      split_focus: s.training_splits?.focus_areas ?? null,
      estimated_calories: s.estimated_calories ?? null,
    };
  }
} 