/**
 * ============================================================
 * PLATEAU DETECTION SERVICE
 * ============================================================
 * AI-powered detection of training plateaus with automated
 * recommendations for breaking through stagnation.
 * ============================================================
 */

import { supabase } from '../supabase/client';
import { ProgressionAnalyticsService, ExercisePerformanceAnalytics } from './ProgressionAnalyticsService';
import { AdaptiveProgressionService, ProgressionSettings } from './AdaptiveProgressionService';

export interface PlateauDetection {
  id?: string;
  userId: string;
  exerciseId: string | null;
  planId: string | null;
  detectedAt: string;
  plateauType: 'exercise_specific' | 'muscle_group' | 'overall_training';
  weeksWithoutProgress: number;
  metricPlateaued: 'weight' | 'volume' | 'reps' | 'e1rm';
  previousValue: number;
  currentValue: number;
  recommendedAction: 'deload' | 'increase_volume' | 'decrease_volume' | 'swap_exercise' | 'change_rep_range' | 'rest_week';
  actionDetails: any;
  actionStatus: 'pending' | 'applied' | 'dismissed' | 'completed';
}

export interface DeloadSchedule {
  id?: string;
  userId: string;
  planId: string;
  scheduledWeek: number;
  scheduledStartDate: string;
  scheduledEndDate: string;
  deloadType: 'volume_reduction' | 'intensity_reduction' | 'full_rest' | 'active_recovery';
  reductionPercentage: number;
  status: 'scheduled' | 'active' | 'completed' | 'skipped';
  reason: 'planned_periodization' | 'fatigue_detected' | 'plateau_recovery' | 'injury_prevention' | 'user_requested';
}

export interface ExerciseAlternative {
  primaryExerciseId: string;
  primaryExerciseName: string;
  alternativeExerciseId: string;
  alternativeExerciseName: string;
  muscleGroupOverlap: number;
  movementPatternSimilarity: number;
  difficultyDifference: number;
  equipmentCompatibility: boolean;
  recommendedFor: string[];
}

export class PlateauDetectionService {
  /**
   * Detect plateaus across all exercises in a plan
   */
  static async detectPlateaus(
    userId: string,
    planId: string | null = null
  ): Promise<PlateauDetection[]> {
    try {
      console.log('[PlateauDetection] Scanning for plateaus...');

      const settings = await AdaptiveProgressionService.getProgressionSettings(userId);
      if (!settings) {
        console.log('[PlateauDetection] No settings found');
        return [];
      }

      // Get all exercises from active plan
      const exercises = await this.getActiveExercises(userId, planId);
      if (exercises.length === 0) {
        console.log('[PlateauDetection] No active exercises found');
        return [];
      }

      const plateaus: PlateauDetection[] = [];

      for (const exercise of exercises) {
        const analytics = await ProgressionAnalyticsService.analyzeExercisePerformance(
          userId,
          exercise.id,
          exercise.name,
          settings.plateauDetectionWeeks
        );

        if (!analytics) continue;

        const plateau = await this.detectExercisePlateau(
          userId,
          exercise,
          analytics,
          settings
        );

        if (plateau) {
          plateaus.push(plateau);
        }
      }

      // Check for overall training plateau
      if (plateaus.length >= exercises.length * 0.5) {
        const overallPlateau = await this.detectOverallPlateau(
          userId,
          planId,
          plateaus,
          settings
        );
        if (overallPlateau) {
          plateaus.push(overallPlateau);
        }
      }

      console.log('[PlateauDetection] Detected', plateaus.length, 'plateaus');
      return plateaus;
    } catch (error) {
      console.error('[PlateauDetection] Error detecting plateaus:', error);
      return [];
    }
  }

  /**
   * Detect plateau for a specific exercise
   */
  private static async detectExercisePlateau(
    userId: string,
    exercise: { id: string; name: string },
    analytics: ExercisePerformanceAnalytics,
    settings: ProgressionSettings
  ): Promise<PlateauDetection | null> {
    const { performanceStatus, e1rmChangePercentage, weightTrend, volumeTrend, estimated1RM } = analytics.performanceWindow;

    // Not a plateau if progressing
    if (performanceStatus === 'progressing') {
      return null;
    }

    // Check if actually plateaued
    if (performanceStatus !== 'plateaued' && Math.abs(e1rmChangePercentage) >= 2) {
      return null;
    }

    // Determine what metric is plateaued
    let metricPlateaued: 'weight' | 'volume' | 'reps' | 'e1rm' = 'e1rm';
    if (weightTrend === 'stable') metricPlateaued = 'weight';
    else if (volumeTrend === 'stable') metricPlateaued = 'volume';

    // Get historical value for comparison
    const previousAnalytics = await this.getPreviousAnalytics(
      userId,
      exercise.id,
      settings.plateauDetectionWeeks * 2 // Look back twice as far
    );

    const previousValue = previousAnalytics?.performanceWindow.estimated1RM || estimated1RM;
    const currentValue = estimated1RM;

    // Determine recommended action
    const { action, details } = this.determineRecommendedAction(
      analytics,
      settings
    );

    const plateau: PlateauDetection = {
      userId,
      exerciseId: exercise.id,
      planId: null,
      detectedAt: new Date().toISOString(),
      plateauType: 'exercise_specific',
      weeksWithoutProgress: settings.plateauDetectionWeeks,
      metricPlateaued,
      previousValue,
      currentValue,
      recommendedAction: action,
      actionDetails: details,
      actionStatus: 'pending',
    };

    return plateau;
  }

  /**
   * Detect overall training plateau (multiple exercises stalled)
   */
  private static async detectOverallPlateau(
    userId: string,
    planId: string | null,
    exercisePlateaus: PlateauDetection[],
    settings: ProgressionSettings
  ): Promise<PlateauDetection | null> {
    // Calculate average weeks without progress
    const avgWeeks = exercisePlateaus.reduce((sum, p) => sum + p.weeksWithoutProgress, 0) / exercisePlateaus.length;

    // Get overall fatigue indicators
    const recentSessions = await this.getRecentSessionData(userId, 14); // Last 2 weeks
    const avgFatigue = recentSessions.reduce((sum, s) => sum + (s.fatigue || 0), 0) / recentSessions.length || 0;
    const avgRecovery = recentSessions.reduce((sum, s) => sum + (s.recovery || 0), 0) / recentSessions.length || 7;

    // Determine if a systemic deload is needed
    const needsDeload = avgFatigue >= 7 || avgRecovery <= 5;

    const plateau: PlateauDetection = {
      userId,
      exerciseId: null,
      planId,
      detectedAt: new Date().toISOString(),
      plateauType: 'overall_training',
      weeksWithoutProgress: Math.round(avgWeeks),
      metricPlateaued: 'e1rm',
      previousValue: 0,
      currentValue: 0,
      recommendedAction: needsDeload ? 'deload' : 'rest_week',
      actionDetails: {
        affectedExercises: exercisePlateaus.length,
        averageFatigue: avgFatigue.toFixed(1),
        averageRecovery: avgRecovery.toFixed(1),
        recommendation: needsDeload 
          ? 'Take a full deload week (40-50% volume reduction)'
          : 'Consider a full rest week or active recovery',
      },
      actionStatus: 'pending',
    };

    return plateau;
  }

  /**
   * Determine recommended action for breaking plateau
   */
  private static determineRecommendedAction(
    analytics: ExercisePerformanceAnalytics,
    settings: ProgressionSettings
  ): { action: PlateauDetection['recommendedAction']; details: any } {
    const { performanceStatus, fatigueScore, volumeTrend, completionRate } = analytics.performanceWindow;

    // High fatigue: deload
    if (fatigueScore >= 7) {
      return {
        action: 'deload',
        details: {
          reason: 'High accumulated fatigue requires recovery',
          recommendation: 'Reduce volume by 40% for one week',
          expectedOutcome: 'Improved recovery and performance rebound',
        },
      };
    }

    // Low volume: increase
    if (volumeTrend === 'decreasing' && fatigueScore < 6) {
      return {
        action: 'increase_volume',
        details: {
          reason: 'Insufficient training stimulus',
          recommendation: 'Add 1-2 sets per exercise',
          expectedOutcome: 'Greater training stimulus may trigger adaptation',
        },
      };
    }

    // High volume with plateau: exercise swap
    if (volumeTrend === 'increasing' && performanceStatus === 'plateaued') {
      return {
        action: 'swap_exercise',
        details: {
          reason: 'Adaptation to current exercise pattern',
          recommendation: 'Swap to a similar exercise variation',
          expectedOutcome: 'Novel stimulus can restart progress',
        },
      };
    }

    // Low consistency: improve adherence
    if (completionRate < 70) {
      return {
        action: 'rest_week',
        details: {
          reason: 'Inconsistent training frequency',
          recommendation: 'Focus on improving training consistency',
          expectedOutcome: 'Regular training is needed for progress',
        },
      };
    }

    // Default: change rep range
    return {
      action: 'change_rep_range',
      details: {
        reason: 'Stagnation in current rep range',
        recommendation: 'Shift to different rep range (e.g., 6-8 or 12-15)',
        expectedOutcome: 'Different intensity zone may trigger new adaptations',
      },
    };
  }

  /**
   * Save plateau detection to database
   */
  static async savePlateauDetection(plateau: PlateauDetection): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('plateau_detection')
        .insert({
          user_id: plateau.userId,
          exercise_id: plateau.exerciseId,
          plan_id: plateau.planId,
          detected_at: plateau.detectedAt,
          plateau_type: plateau.plateauType,
          weeks_without_progress: plateau.weeksWithoutProgress,
          metric_plateaued: plateau.metricPlateaued,
          previous_value: plateau.previousValue,
          current_value: plateau.currentValue,
          recommended_action: plateau.recommendedAction,
          action_details: plateau.actionDetails,
          action_status: plateau.actionStatus,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[PlateauDetection] Error saving plateau:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('[PlateauDetection] Error saving plateau:', error);
      return null;
    }
  }

  /**
   * Schedule a deload week
   */
  static async scheduleDeload(
    userId: string,
    planId: string,
    reason: DeloadSchedule['reason'],
    weeksFromNow: number = 0
  ): Promise<string | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (weeksFromNow * 7));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const settings = await AdaptiveProgressionService.getProgressionSettings(userId);
      
      const deload: Partial<DeloadSchedule> = {
        userId,
        planId,
        scheduledWeek: weeksFromNow + 1,
        scheduledStartDate: startDate.toISOString().split('T')[0],
        scheduledEndDate: endDate.toISOString().split('T')[0],
        deloadType: reason === 'fatigue_detected' ? 'volume_reduction' : 'intensity_reduction',
        reductionPercentage: 40,
        status: weeksFromNow === 0 ? 'active' : 'scheduled',
        reason,
      };

      const { data, error } = await supabase
        .from('deload_schedule')
        .insert({
          user_id: deload.userId,
          plan_id: deload.planId,
          scheduled_week: deload.scheduledWeek,
          scheduled_start_date: deload.scheduledStartDate,
          scheduled_end_date: deload.scheduledEndDate,
          deload_type: deload.deloadType,
          reduction_percentage: deload.reductionPercentage,
          status: deload.status,
          reason: deload.reason,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[PlateauDetection] Error scheduling deload:', error);
        return null;
      }

      console.log('[PlateauDetection] Deload scheduled:', data.id);
      return data.id;
    } catch (error) {
      console.error('[PlateauDetection] Error scheduling deload:', error);
      return null;
    }
  }

  /**
   * Get active deload status
   */
  static async getActiveDeload(userId: string, planId: string): Promise<DeloadSchedule | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('deload_schedule')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_id', planId)
        .lte('scheduled_start_date', today)
        .gte('scheduled_end_date', today)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        console.error('[PlateauDetection] Error fetching active deload:', error);
        return null;
      }

      return this.mapToDeloadSchedule(data);
    } catch (error) {
      console.error('[PlateauDetection] Error fetching active deload:', error);
      return null;
    }
  }

  /**
   * Find exercise alternatives
   */
  static async findExerciseAlternatives(
    exerciseId: string,
    context: 'plateau' | 'injury_prevention' | 'variety' = 'plateau'
  ): Promise<ExerciseAlternative[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_alternatives')
        .select(`
          primary_exercise_id,
          alternative_exercise_id,
          muscle_group_overlap,
          movement_pattern_similarity,
          difficulty_difference,
          equipment_compatibility,
          recommended_for,
          primary_exercise:exercises!exercise_alternatives_primary_exercise_id_fkey(id, name),
          alternative_exercise:exercises!exercise_alternatives_alternative_exercise_id_fkey(id, name)
        `)
        .eq('primary_exercise_id', exerciseId)
        .contains('recommended_for', [context]);

      if (error) {
        console.error('[PlateauDetection] Error fetching alternatives:', error);
        return [];
      }

      return data.map((row: any) => ({
        primaryExerciseId: row.primary_exercise_id,
        primaryExerciseName: row.primary_exercise?.name || '',
        alternativeExerciseId: row.alternative_exercise_id,
        alternativeExerciseName: row.alternative_exercise?.name || '',
        muscleGroupOverlap: Number(row.muscle_group_overlap),
        movementPatternSimilarity: Number(row.movement_pattern_similarity),
        difficultyDifference: row.difficulty_difference,
        equipmentCompatibility: row.equipment_compatibility,
        recommendedFor: row.recommended_for,
      }));
    } catch (error) {
      console.error('[PlateauDetection] Error finding alternatives:', error);
      return [];
    }
  }

  /**
   * Auto-detect and schedule periodic deloads
   */
  static async autoSchedulePeriodicDeloads(
    userId: string,
    planId: string
  ): Promise<void> {
    try {
      const settings = await AdaptiveProgressionService.getProgressionSettings(userId);
      if (!settings || !settings.autoDeloadEnabled) {
        return;
      }

      // Check if a deload is already scheduled
      const { data: existing, error: existingError } = await supabase
        .from('deload_schedule')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_id', planId)
        .eq('status', 'scheduled')
        .gte('scheduled_start_date', new Date().toISOString().split('T')[0]);

      if (!existingError && existing && existing.length > 0) {
        console.log('[PlateauDetection] Deload already scheduled');
        return;
      }

      // Schedule deload based on frequency setting
      await this.scheduleDeload(
        userId,
        planId,
        'planned_periodization',
        settings.deloadFrequencyWeeks - 1 // Schedule for N weeks from now
      );

      console.log('[PlateauDetection] Auto-scheduled periodic deload');
    } catch (error) {
      console.error('[PlateauDetection] Error auto-scheduling deload:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private static async getActiveExercises(
    userId: string,
    planId: string | null
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      let query = supabase
        .from('exercise_sets')
        .select(`
          exercise_id,
          exercises (id, name)
        `);

      if (planId) {
        // Get from workout_sessions that belong to the plan
        const { data: sessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('plan_id', planId);

        if (sessionsError || !sessions) return [];

        const sessionIds = sessions.map(s => s.id);
        query = query.in('session_id', sessionIds);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('[PlateauDetection] Error fetching exercises:', error);
        return [];
      }

      // Deduplicate exercises
      const exerciseMap = new Map<string, { id: string; name: string }>();
      data.forEach((row: any) => {
        if (row.exercises) {
          exerciseMap.set(row.exercises.id, {
            id: row.exercises.id,
            name: row.exercises.name,
          });
        }
      });

      return Array.from(exerciseMap.values());
    } catch (error) {
      console.error('[PlateauDetection] Error getting active exercises:', error);
      return [];
    }
  }

  private static async getPreviousAnalytics(
    userId: string,
    exerciseId: string,
    weeksAgo: number
  ): Promise<ExercisePerformanceAnalytics | null> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (weeksAgo * 7));

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (weeksAgo * 7));

    const { data, error } = await supabase
      .from('performance_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .gte('analysis_date', startDate.toISOString())
      .lte('analysis_date', endDate.toISOString())
      .order('analysis_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    // Convert to ExercisePerformanceAnalytics format
    return {
      exerciseId: data.exercise_id,
      exerciseName: '',
      userId: data.user_id,
      analysisDate: data.analysis_date,
      performanceWindow: {
        windowStartDate: data.window_start_date,
        windowEndDate: data.window_end_date,
        totalVolume: Number(data.total_volume),
        averageVolumePerSession: Number(data.average_volume_per_session),
        volumeTrend: data.volume_trend,
        averageRPE: Number(data.average_rpe),
        averageWeight: Number(data.average_weight),
        maxWeight: Number(data.max_weight),
        weightTrend: data.weight_trend,
        estimated1RM: Number(data.estimated_1rm),
        e1rmChangePercentage: Number(data.e1rm_change_percentage),
        sessionsCompleted: data.sessions_completed,
        sessionsSkipped: data.sessions_skipped,
        completionRate: Number(data.completion_rate),
        averageRecoveryScore: Number(data.average_recovery_score),
        highRPEFrequency: data.high_rpe_frequency,
        fatigueScore: Number(data.fatigue_score),
        performanceStatus: data.performance_status,
      },
      insights: data.insights,
    };
  }

  private static async getRecentSessionData(
    userId: string,
    days: number
  ): Promise<Array<{ fatigue: number; recovery: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('session_rpe, recovery_score')
      .eq('status', 'completed')
      .gte('completed_at', startDate.toISOString());

    if (error || !data) return [];

    return data.map(s => ({
      fatigue: s.session_rpe || 0,
      recovery: s.recovery_score || 7,
    }));
  }

  private static mapToDeloadSchedule(data: any): DeloadSchedule {
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      scheduledWeek: data.scheduled_week,
      scheduledStartDate: data.scheduled_start_date,
      scheduledEndDate: data.scheduled_end_date,
      deloadType: data.deload_type,
      reductionPercentage: data.reduction_percentage,
      status: data.status,
      reason: data.reason,
    };
  }
}




 * PLATEAU DETECTION SERVICE
 * ============================================================
 * AI-powered detection of training plateaus with automated
 * recommendations for breaking through stagnation.
 * ============================================================
 */

import { supabase } from '../supabase/client';
import { ProgressionAnalyticsService, ExercisePerformanceAnalytics } from './ProgressionAnalyticsService';
import { AdaptiveProgressionService, ProgressionSettings } from './AdaptiveProgressionService';

export interface PlateauDetection {
  id?: string;
  userId: string;
  exerciseId: string | null;
  planId: string | null;
  detectedAt: string;
  plateauType: 'exercise_specific' | 'muscle_group' | 'overall_training';
  weeksWithoutProgress: number;
  metricPlateaued: 'weight' | 'volume' | 'reps' | 'e1rm';
  previousValue: number;
  currentValue: number;
  recommendedAction: 'deload' | 'increase_volume' | 'decrease_volume' | 'swap_exercise' | 'change_rep_range' | 'rest_week';
  actionDetails: any;
  actionStatus: 'pending' | 'applied' | 'dismissed' | 'completed';
}

export interface DeloadSchedule {
  id?: string;
  userId: string;
  planId: string;
  scheduledWeek: number;
  scheduledStartDate: string;
  scheduledEndDate: string;
  deloadType: 'volume_reduction' | 'intensity_reduction' | 'full_rest' | 'active_recovery';
  reductionPercentage: number;
  status: 'scheduled' | 'active' | 'completed' | 'skipped';
  reason: 'planned_periodization' | 'fatigue_detected' | 'plateau_recovery' | 'injury_prevention' | 'user_requested';
}

export interface ExerciseAlternative {
  primaryExerciseId: string;
  primaryExerciseName: string;
  alternativeExerciseId: string;
  alternativeExerciseName: string;
  muscleGroupOverlap: number;
  movementPatternSimilarity: number;
  difficultyDifference: number;
  equipmentCompatibility: boolean;
  recommendedFor: string[];
}

export class PlateauDetectionService {
  /**
   * Detect plateaus across all exercises in a plan
   */
  static async detectPlateaus(
    userId: string,
    planId: string | null = null
  ): Promise<PlateauDetection[]> {
    try {
      console.log('[PlateauDetection] Scanning for plateaus...');

      const settings = await AdaptiveProgressionService.getProgressionSettings(userId);
      if (!settings) {
        console.log('[PlateauDetection] No settings found');
        return [];
      }

      // Get all exercises from active plan
      const exercises = await this.getActiveExercises(userId, planId);
      if (exercises.length === 0) {
        console.log('[PlateauDetection] No active exercises found');
        return [];
      }

      const plateaus: PlateauDetection[] = [];

      for (const exercise of exercises) {
        const analytics = await ProgressionAnalyticsService.analyzeExercisePerformance(
          userId,
          exercise.id,
          exercise.name,
          settings.plateauDetectionWeeks
        );

        if (!analytics) continue;

        const plateau = await this.detectExercisePlateau(
          userId,
          exercise,
          analytics,
          settings
        );

        if (plateau) {
          plateaus.push(plateau);
        }
      }

      // Check for overall training plateau
      if (plateaus.length >= exercises.length * 0.5) {
        const overallPlateau = await this.detectOverallPlateau(
          userId,
          planId,
          plateaus,
          settings
        );
        if (overallPlateau) {
          plateaus.push(overallPlateau);
        }
      }

      console.log('[PlateauDetection] Detected', plateaus.length, 'plateaus');
      return plateaus;
    } catch (error) {
      console.error('[PlateauDetection] Error detecting plateaus:', error);
      return [];
    }
  }

  /**
   * Detect plateau for a specific exercise
   */
  private static async detectExercisePlateau(
    userId: string,
    exercise: { id: string; name: string },
    analytics: ExercisePerformanceAnalytics,
    settings: ProgressionSettings
  ): Promise<PlateauDetection | null> {
    const { performanceStatus, e1rmChangePercentage, weightTrend, volumeTrend, estimated1RM } = analytics.performanceWindow;

    // Not a plateau if progressing
    if (performanceStatus === 'progressing') {
      return null;
    }

    // Check if actually plateaued
    if (performanceStatus !== 'plateaued' && Math.abs(e1rmChangePercentage) >= 2) {
      return null;
    }

    // Determine what metric is plateaued
    let metricPlateaued: 'weight' | 'volume' | 'reps' | 'e1rm' = 'e1rm';
    if (weightTrend === 'stable') metricPlateaued = 'weight';
    else if (volumeTrend === 'stable') metricPlateaued = 'volume';

    // Get historical value for comparison
    const previousAnalytics = await this.getPreviousAnalytics(
      userId,
      exercise.id,
      settings.plateauDetectionWeeks * 2 // Look back twice as far
    );

    const previousValue = previousAnalytics?.performanceWindow.estimated1RM || estimated1RM;
    const currentValue = estimated1RM;

    // Determine recommended action
    const { action, details } = this.determineRecommendedAction(
      analytics,
      settings
    );

    const plateau: PlateauDetection = {
      userId,
      exerciseId: exercise.id,
      planId: null,
      detectedAt: new Date().toISOString(),
      plateauType: 'exercise_specific',
      weeksWithoutProgress: settings.plateauDetectionWeeks,
      metricPlateaued,
      previousValue,
      currentValue,
      recommendedAction: action,
      actionDetails: details,
      actionStatus: 'pending',
    };

    return plateau;
  }

  /**
   * Detect overall training plateau (multiple exercises stalled)
   */
  private static async detectOverallPlateau(
    userId: string,
    planId: string | null,
    exercisePlateaus: PlateauDetection[],
    settings: ProgressionSettings
  ): Promise<PlateauDetection | null> {
    // Calculate average weeks without progress
    const avgWeeks = exercisePlateaus.reduce((sum, p) => sum + p.weeksWithoutProgress, 0) / exercisePlateaus.length;

    // Get overall fatigue indicators
    const recentSessions = await this.getRecentSessionData(userId, 14); // Last 2 weeks
    const avgFatigue = recentSessions.reduce((sum, s) => sum + (s.fatigue || 0), 0) / recentSessions.length || 0;
    const avgRecovery = recentSessions.reduce((sum, s) => sum + (s.recovery || 0), 0) / recentSessions.length || 7;

    // Determine if a systemic deload is needed
    const needsDeload = avgFatigue >= 7 || avgRecovery <= 5;

    const plateau: PlateauDetection = {
      userId,
      exerciseId: null,
      planId,
      detectedAt: new Date().toISOString(),
      plateauType: 'overall_training',
      weeksWithoutProgress: Math.round(avgWeeks),
      metricPlateaued: 'e1rm',
      previousValue: 0,
      currentValue: 0,
      recommendedAction: needsDeload ? 'deload' : 'rest_week',
      actionDetails: {
        affectedExercises: exercisePlateaus.length,
        averageFatigue: avgFatigue.toFixed(1),
        averageRecovery: avgRecovery.toFixed(1),
        recommendation: needsDeload 
          ? 'Take a full deload week (40-50% volume reduction)'
          : 'Consider a full rest week or active recovery',
      },
      actionStatus: 'pending',
    };

    return plateau;
  }

  /**
   * Determine recommended action for breaking plateau
   */
  private static determineRecommendedAction(
    analytics: ExercisePerformanceAnalytics,
    settings: ProgressionSettings
  ): { action: PlateauDetection['recommendedAction']; details: any } {
    const { performanceStatus, fatigueScore, volumeTrend, completionRate } = analytics.performanceWindow;

    // High fatigue: deload
    if (fatigueScore >= 7) {
      return {
        action: 'deload',
        details: {
          reason: 'High accumulated fatigue requires recovery',
          recommendation: 'Reduce volume by 40% for one week',
          expectedOutcome: 'Improved recovery and performance rebound',
        },
      };
    }

    // Low volume: increase
    if (volumeTrend === 'decreasing' && fatigueScore < 6) {
      return {
        action: 'increase_volume',
        details: {
          reason: 'Insufficient training stimulus',
          recommendation: 'Add 1-2 sets per exercise',
          expectedOutcome: 'Greater training stimulus may trigger adaptation',
        },
      };
    }

    // High volume with plateau: exercise swap
    if (volumeTrend === 'increasing' && performanceStatus === 'plateaued') {
      return {
        action: 'swap_exercise',
        details: {
          reason: 'Adaptation to current exercise pattern',
          recommendation: 'Swap to a similar exercise variation',
          expectedOutcome: 'Novel stimulus can restart progress',
        },
      };
    }

    // Low consistency: improve adherence
    if (completionRate < 70) {
      return {
        action: 'rest_week',
        details: {
          reason: 'Inconsistent training frequency',
          recommendation: 'Focus on improving training consistency',
          expectedOutcome: 'Regular training is needed for progress',
        },
      };
    }

    // Default: change rep range
    return {
      action: 'change_rep_range',
      details: {
        reason: 'Stagnation in current rep range',
        recommendation: 'Shift to different rep range (e.g., 6-8 or 12-15)',
        expectedOutcome: 'Different intensity zone may trigger new adaptations',
      },
    };
  }

  /**
   * Save plateau detection to database
   */
  static async savePlateauDetection(plateau: PlateauDetection): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('plateau_detection')
        .insert({
          user_id: plateau.userId,
          exercise_id: plateau.exerciseId,
          plan_id: plateau.planId,
          detected_at: plateau.detectedAt,
          plateau_type: plateau.plateauType,
          weeks_without_progress: plateau.weeksWithoutProgress,
          metric_plateaued: plateau.metricPlateaued,
          previous_value: plateau.previousValue,
          current_value: plateau.currentValue,
          recommended_action: plateau.recommendedAction,
          action_details: plateau.actionDetails,
          action_status: plateau.actionStatus,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[PlateauDetection] Error saving plateau:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('[PlateauDetection] Error saving plateau:', error);
      return null;
    }
  }

  /**
   * Schedule a deload week
   */
  static async scheduleDeload(
    userId: string,
    planId: string,
    reason: DeloadSchedule['reason'],
    weeksFromNow: number = 0
  ): Promise<string | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (weeksFromNow * 7));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const settings = await AdaptiveProgressionService.getProgressionSettings(userId);
      
      const deload: Partial<DeloadSchedule> = {
        userId,
        planId,
        scheduledWeek: weeksFromNow + 1,
        scheduledStartDate: startDate.toISOString().split('T')[0],
        scheduledEndDate: endDate.toISOString().split('T')[0],
        deloadType: reason === 'fatigue_detected' ? 'volume_reduction' : 'intensity_reduction',
        reductionPercentage: 40,
        status: weeksFromNow === 0 ? 'active' : 'scheduled',
        reason,
      };

      const { data, error } = await supabase
        .from('deload_schedule')
        .insert({
          user_id: deload.userId,
          plan_id: deload.planId,
          scheduled_week: deload.scheduledWeek,
          scheduled_start_date: deload.scheduledStartDate,
          scheduled_end_date: deload.scheduledEndDate,
          deload_type: deload.deloadType,
          reduction_percentage: deload.reductionPercentage,
          status: deload.status,
          reason: deload.reason,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[PlateauDetection] Error scheduling deload:', error);
        return null;
      }

      console.log('[PlateauDetection] Deload scheduled:', data.id);
      return data.id;
    } catch (error) {
      console.error('[PlateauDetection] Error scheduling deload:', error);
      return null;
    }
  }

  /**
   * Get active deload status
   */
  static async getActiveDeload(userId: string, planId: string): Promise<DeloadSchedule | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('deload_schedule')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_id', planId)
        .lte('scheduled_start_date', today)
        .gte('scheduled_end_date', today)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        console.error('[PlateauDetection] Error fetching active deload:', error);
        return null;
      }

      return this.mapToDeloadSchedule(data);
    } catch (error) {
      console.error('[PlateauDetection] Error fetching active deload:', error);
      return null;
    }
  }

  /**
   * Find exercise alternatives
   */
  static async findExerciseAlternatives(
    exerciseId: string,
    context: 'plateau' | 'injury_prevention' | 'variety' = 'plateau'
  ): Promise<ExerciseAlternative[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_alternatives')
        .select(`
          primary_exercise_id,
          alternative_exercise_id,
          muscle_group_overlap,
          movement_pattern_similarity,
          difficulty_difference,
          equipment_compatibility,
          recommended_for,
          primary_exercise:exercises!exercise_alternatives_primary_exercise_id_fkey(id, name),
          alternative_exercise:exercises!exercise_alternatives_alternative_exercise_id_fkey(id, name)
        `)
        .eq('primary_exercise_id', exerciseId)
        .contains('recommended_for', [context]);

      if (error) {
        console.error('[PlateauDetection] Error fetching alternatives:', error);
        return [];
      }

      return data.map((row: any) => ({
        primaryExerciseId: row.primary_exercise_id,
        primaryExerciseName: row.primary_exercise?.name || '',
        alternativeExerciseId: row.alternative_exercise_id,
        alternativeExerciseName: row.alternative_exercise?.name || '',
        muscleGroupOverlap: Number(row.muscle_group_overlap),
        movementPatternSimilarity: Number(row.movement_pattern_similarity),
        difficultyDifference: row.difficulty_difference,
        equipmentCompatibility: row.equipment_compatibility,
        recommendedFor: row.recommended_for,
      }));
    } catch (error) {
      console.error('[PlateauDetection] Error finding alternatives:', error);
      return [];
    }
  }

  /**
   * Auto-detect and schedule periodic deloads
   */
  static async autoSchedulePeriodicDeloads(
    userId: string,
    planId: string
  ): Promise<void> {
    try {
      const settings = await AdaptiveProgressionService.getProgressionSettings(userId);
      if (!settings || !settings.autoDeloadEnabled) {
        return;
      }

      // Check if a deload is already scheduled
      const { data: existing, error: existingError } = await supabase
        .from('deload_schedule')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_id', planId)
        .eq('status', 'scheduled')
        .gte('scheduled_start_date', new Date().toISOString().split('T')[0]);

      if (!existingError && existing && existing.length > 0) {
        console.log('[PlateauDetection] Deload already scheduled');
        return;
      }

      // Schedule deload based on frequency setting
      await this.scheduleDeload(
        userId,
        planId,
        'planned_periodization',
        settings.deloadFrequencyWeeks - 1 // Schedule for N weeks from now
      );

      console.log('[PlateauDetection] Auto-scheduled periodic deload');
    } catch (error) {
      console.error('[PlateauDetection] Error auto-scheduling deload:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private static async getActiveExercises(
    userId: string,
    planId: string | null
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      let query = supabase
        .from('exercise_sets')
        .select(`
          exercise_id,
          exercises (id, name)
        `);

      if (planId) {
        // Get from workout_sessions that belong to the plan
        const { data: sessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('plan_id', planId);

        if (sessionsError || !sessions) return [];

        const sessionIds = sessions.map(s => s.id);
        query = query.in('session_id', sessionIds);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error('[PlateauDetection] Error fetching exercises:', error);
        return [];
      }

      // Deduplicate exercises
      const exerciseMap = new Map<string, { id: string; name: string }>();
      data.forEach((row: any) => {
        if (row.exercises) {
          exerciseMap.set(row.exercises.id, {
            id: row.exercises.id,
            name: row.exercises.name,
          });
        }
      });

      return Array.from(exerciseMap.values());
    } catch (error) {
      console.error('[PlateauDetection] Error getting active exercises:', error);
      return [];
    }
  }

  private static async getPreviousAnalytics(
    userId: string,
    exerciseId: string,
    weeksAgo: number
  ): Promise<ExercisePerformanceAnalytics | null> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (weeksAgo * 7));

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (weeksAgo * 7));

    const { data, error } = await supabase
      .from('performance_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .gte('analysis_date', startDate.toISOString())
      .lte('analysis_date', endDate.toISOString())
      .order('analysis_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    // Convert to ExercisePerformanceAnalytics format
    return {
      exerciseId: data.exercise_id,
      exerciseName: '',
      userId: data.user_id,
      analysisDate: data.analysis_date,
      performanceWindow: {
        windowStartDate: data.window_start_date,
        windowEndDate: data.window_end_date,
        totalVolume: Number(data.total_volume),
        averageVolumePerSession: Number(data.average_volume_per_session),
        volumeTrend: data.volume_trend,
        averageRPE: Number(data.average_rpe),
        averageWeight: Number(data.average_weight),
        maxWeight: Number(data.max_weight),
        weightTrend: data.weight_trend,
        estimated1RM: Number(data.estimated_1rm),
        e1rmChangePercentage: Number(data.e1rm_change_percentage),
        sessionsCompleted: data.sessions_completed,
        sessionsSkipped: data.sessions_skipped,
        completionRate: Number(data.completion_rate),
        averageRecoveryScore: Number(data.average_recovery_score),
        highRPEFrequency: data.high_rpe_frequency,
        fatigueScore: Number(data.fatigue_score),
        performanceStatus: data.performance_status,
      },
      insights: data.insights,
    };
  }

  private static async getRecentSessionData(
    userId: string,
    days: number
  ): Promise<Array<{ fatigue: number; recovery: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('session_rpe, recovery_score')
      .eq('status', 'completed')
      .gte('completed_at', startDate.toISOString());

    if (error || !data) return [];

    return data.map(s => ({
      fatigue: s.session_rpe || 0,
      recovery: s.recovery_score || 7,
    }));
  }

  private static mapToDeloadSchedule(data: any): DeloadSchedule {
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      scheduledWeek: data.scheduled_week,
      scheduledStartDate: data.scheduled_start_date,
      scheduledEndDate: data.scheduled_end_date,
      deloadType: data.deload_type,
      reductionPercentage: data.reduction_percentage,
      status: data.status,
      reason: data.reason,
    };
  }
}


