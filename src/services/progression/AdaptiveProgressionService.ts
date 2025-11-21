/**
 * ============================================================
 * ADAPTIVE PROGRESSION SERVICE
 * ============================================================
 * Core service for automatically adjusting workout parameters
 * based on performance data and progression mode settings.
 * ============================================================
 */

import { supabase } from '../supabase/client';
import { ProgressionAnalyticsService, ExercisePerformanceAnalytics } from './ProgressionAnalyticsService';

export interface ProgressionSettings {
  id: string;
  userId: string;
  progressionMode: 'aggressive' | 'moderate' | 'conservative';
  autoAdjustEnabled: boolean;
  autoDeloadEnabled: boolean;
  autoExerciseSwapEnabled: boolean;
  weightIncrementPercentage: number;
  volumeIncrementSets: number;
  rpeTargetMin: number;
  rpeTargetMax: number;
  plateauDetectionWeeks: number;
  deloadFrequencyWeeks: number;
  recoveryScoreThreshold: number;
  highFatigueRpeThreshold: number;
}

export interface WorkoutAdjustment {
  exerciseSetId: string;
  adjustmentType: 'weight' | 'reps' | 'sets' | 'rest_period' | 'exercise_swap' | 'deload' | 'rep_range_shift';
  previousValue: any;
  newValue: any;
  reason: string;
  trigger: string;
  supportingMetrics: any;
}

export interface AdjustmentRecommendation {
  exerciseId: string;
  exerciseName: string;
  currentWeight: number;
  currentSets: number;
  currentReps: string;
  recommendedWeight?: number;
  recommendedSets?: number;
  recommendedReps?: string;
  recommendedRestPeriod?: string;
  reason: string;
  confidence: number; // 0-100
  autoApply: boolean;
}

export class AdaptiveProgressionService {
  /**
   * Get or create progression settings for a user
   */
  static async getProgressionSettings(
    userId: string
  ): Promise<ProgressionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('progression_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default
          return await this.createDefaultSettings(userId);
        }
        console.error('[AdaptiveProgression] Error fetching settings:', error);
        return null;
      }

      return this.mapToProgressionSettings(data);
    } catch (error) {
      console.error('[AdaptiveProgression] Error getting settings:', error);
      return null;
    }
  }

  /**
   * Create default progression settings
   */
  static async createDefaultSettings(
    userId: string,
    mode: 'aggressive' | 'moderate' | 'conservative' = 'moderate'
  ): Promise<ProgressionSettings | null> {
    try {
      // Map mode to database 'mode' field (database uses 'balanced' instead of 'moderate')
      const dbMode = mode === 'moderate' ? 'balanced' : mode;
      
      // Insert default settings directly
      const { data, error } = await supabase
        .from('progression_settings')
        .insert({
          user_id: userId,
          mode: dbMode,
          primary_goal: 'strength_gain',
          target_weight_increase_kg: 2.5,
          target_rep_increase: 2,
          intensity_preference: 'moderate',
          recovery_sensitivity: 'normal',
          auto_progression_enabled: true,
          plateau_detection_enabled: true,
          recovery_tracking_enabled: true,
          form_quality_threshold: 7,
        })
        .select()
        .single();

      if (error) {
        console.error('[AdaptiveProgression] Error creating settings:', error);
        return null;
      }

      return this.mapToProgressionSettings(data);
    } catch (error) {
      console.error('[AdaptiveProgression] Error creating default settings:', error);
      return null;
    }
  }

  /**
   * Update progression settings
   */
  static async updateProgressionSettings(
    settings: Partial<ProgressionSettings>
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Map progressionMode to database columns (database uses 'balanced' instead of 'moderate')
      if (settings.progressionMode) {
        const dbMode = settings.progressionMode === 'moderate' ? 'balanced' : settings.progressionMode;
        updateData.mode = dbMode;
        // Also update progression_mode if it exists (for backwards compatibility)
        updateData.progression_mode = dbMode;
        console.log('[AdaptiveProgression] Setting mode:', settings.progressionMode, '→', dbMode);
      }

      // Map fields directly to database columns
      if (settings.autoAdjustEnabled !== undefined) {
        updateData.auto_progression_enabled = settings.autoAdjustEnabled;
      }
      if (settings.autoDeloadEnabled !== undefined) {
        updateData.auto_deload_enabled = settings.autoDeloadEnabled;
      }
      if (settings.autoExerciseSwapEnabled !== undefined) {
        updateData.auto_exercise_swap_enabled = settings.autoExerciseSwapEnabled;
      }
      if (settings.weightIncrementPercentage !== undefined) {
        updateData.weight_increment_percentage = settings.weightIncrementPercentage;
      }
      if (settings.volumeIncrementSets !== undefined) {
        updateData.volume_increment_sets = settings.volumeIncrementSets;
      }
      if (settings.rpeTargetMin !== undefined) {
        updateData.rpe_target_min = settings.rpeTargetMin;
      }
      if (settings.rpeTargetMax !== undefined) {
        updateData.rpe_target_max = settings.rpeTargetMax;
      }
      if (settings.plateauDetectionWeeks !== undefined) {
        updateData.plateau_detection_weeks = settings.plateauDetectionWeeks;
      }
      if (settings.deloadFrequencyWeeks !== undefined) {
        updateData.deload_frequency_weeks = settings.deloadFrequencyWeeks;
      }
      if (settings.recoveryScoreThreshold !== undefined) {
        updateData.recovery_score_threshold = settings.recoveryScoreThreshold;
      }
      if (settings.highFatigueRpeThreshold !== undefined) {
        updateData.high_fatigue_rpe_threshold = settings.highFatigueRpeThreshold;
      }

      console.log('[AdaptiveProgression] Updating settings:', updateData);

      const { error } = await supabase
        .from('progression_settings')
        .update(updateData)
        .eq('id', settings.id!);

      if (error) {
        console.error('[AdaptiveProgression] Error updating settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AdaptiveProgression] Error updating settings:', error);
      return false;
    }
  }

  /**
   * Calculate recommended weight adjustment based on recent performance
   */
  static calculateWeightAdjustment(
    currentWeight: number,
    lastSessionRPE: number,
    lastSessionReps: number,
    targetRepsMin: number,
    targetRepsMax: number,
    settings: ProgressionSettings
  ): { newWeight: number; reason: string } {
    const { weightIncrementPercentage, rpeTargetMin, rpeTargetMax } = settings;

    // If completed more than target max reps with low RPE, increase weight
    if (lastSessionReps >= targetRepsMax && lastSessionRPE < rpeTargetMin) {
      const increment = currentWeight * (weightIncrementPercentage / 100);
      return {
        newWeight: Number((currentWeight + increment).toFixed(1)),
        reason: `Exceeded target reps (${lastSessionReps}) with RPE ${lastSessionRPE}. Time to increase weight.`,
      };
    }

    // If hitting target reps consistently with good RPE, moderate increase
    if (lastSessionReps >= targetRepsMin && lastSessionRPE >= rpeTargetMin && lastSessionRPE <= rpeTargetMax) {
      const increment = currentWeight * (weightIncrementPercentage / 100);
      return {
        newWeight: Number((currentWeight + increment).toFixed(1)),
        reason: `Solid performance at RPE ${lastSessionRPE}. Ready for progressive overload.`,
      };
    }

    // If failing to hit minimum reps, reduce weight slightly
    if (lastSessionReps < targetRepsMin - 2) {
      const decrement = currentWeight * 0.05; // 5% reduction
      return {
        newWeight: Number((currentWeight - decrement).toFixed(1)),
        reason: `Only completed ${lastSessionReps} reps. Reducing weight for better form and volume.`,
      };
    }

    // If RPE too high consistently, maintain weight
    if (lastSessionRPE > rpeTargetMax) {
      return {
        newWeight: currentWeight,
        reason: `RPE ${lastSessionRPE} is too high. Maintaining weight to improve technique.`,
      };
    }

    // Default: maintain current weight
    return {
      newWeight: currentWeight,
      reason: `Performance within target range. Maintaining current weight.`,
    };
  }

  /**
   * Calculate volume adjustment based on performance and fatigue
   */
  static calculateVolumeAdjustment(
    currentSets: number,
    analytics: ExercisePerformanceAnalytics,
    settings: ProgressionSettings
  ): { newSets: number; reason: string } {
    const { volumeIncrementSets } = settings;
    const { performanceStatus, volumeTrend, fatigueScore } = analytics.performanceWindow;

    // High fatigue: reduce volume
    if (fatigueScore >= 7) {
      const reduction = Math.max(1, Math.floor(currentSets * 0.3));
      return {
        newSets: Math.max(1, currentSets - reduction),
        reason: `High fatigue score (${fatigueScore}/10). Reducing volume for recovery.`,
      };
    }

    // Progressing well with low fatigue: increase volume
    if (performanceStatus === 'progressing' && volumeTrend === 'increasing' && fatigueScore < 5) {
      return {
        newSets: currentSets + volumeIncrementSets,
        reason: `Strong progress with good recovery. Increasing volume.`,
      };
    }

    // Plateaued: try increasing volume
    if (performanceStatus === 'plateaued' && fatigueScore < 6) {
      return {
        newSets: currentSets + 1,
        reason: `Progress stalled. Increasing volume may break plateau.`,
      };
    }

    // Overtrained or regressing: reduce volume
    if (performanceStatus === 'overtrained' || performanceStatus === 'regressing') {
      const reduction = Math.max(1, Math.floor(currentSets * 0.4));
      return {
        newSets: Math.max(1, currentSets - reduction),
        reason: `Performance declining. Reducing volume for recovery.`,
      };
    }

    // Default: maintain
    return {
      newSets: currentSets,
      reason: `Performance stable. Maintaining current volume.`,
    };
  }

  /**
   * Calculate rest period adjustment based on fatigue and rep range
   */
  static calculateRestPeriodAdjustment(
    currentRest: string, // e.g., "90s"
    lastSessionRPE: number,
    repRange: string, // e.g., "8-12"
    fatigueScore: number,
    settings: ProgressionSettings
  ): { newRest: string; reason: string } {
    const currentRestSeconds = parseInt(currentRest);
    const avgReps = this.parseRepRangeAverage(repRange);

    // High fatigue or very high RPE: increase rest
    if (fatigueScore >= 7 || lastSessionRPE >= settings.highFatigueRpeThreshold) {
      const increase = Math.min(60, currentRestSeconds * 0.2);
      return {
        newRest: `${Math.round(currentRestSeconds + increase)}s`,
        reason: `High fatigue/RPE. Increasing rest for better recovery between sets.`,
      };
    }

    // Lower reps (strength focus): ensure adequate rest
    if (avgReps <= 6 && currentRestSeconds < 120) {
      return {
        newRest: '120s',
        reason: `Strength-focused rep range. Increasing rest for power recovery.`,
      };
    }

    // Higher reps (hypertrophy): moderate rest
    if (avgReps >= 12 && currentRestSeconds > 90) {
      return {
        newRest: '75s',
        reason: `Hypertrophy-focused rep range. Shorter rest for metabolic stress.`,
      };
    }

    return {
      newRest: currentRest,
      reason: `Rest period appropriate for current training focus.`,
    };
  }

  /**
   * Generate adjustment recommendations for upcoming workout
   */
  static async generateAdjustmentRecommendations(
    userId: string,
    sessionId: string,
    planId: string | null = null
  ): Promise<AdjustmentRecommendation[]> {
    try {
      console.log('[AdaptiveProgression] Generating recommendations for session:', sessionId);

      // Get progression settings
      const settings = await this.getProgressionSettings(userId);
      if (!settings || !settings.autoAdjustEnabled) {
        console.log('[AdaptiveProgression] Auto-adjust disabled');
        return [];
      }

      // Get exercise sets for this session
      const { data: exerciseSets, error: setsError } = await supabase
        .from('exercise_sets')
        .select(`
          id,
          exercise_id,
          target_sets,
          target_reps,
          target_rpe,
          rest_period,
          exercises (
            id,
            name
          )
        `)
        .eq('session_id', sessionId);

      if (setsError || !exerciseSets) {
        console.error('[AdaptiveProgression] Error fetching exercise sets:', setsError);
        return [];
      }

      const recommendations: AdjustmentRecommendation[] = [];

      for (const set of exerciseSets) {
        const exerciseData = set.exercises as any;
        if (!exerciseData) continue;

        // Get latest performance analytics
        const analytics = await ProgressionAnalyticsService.analyzeExercisePerformance(
          userId,
          set.exercise_id,
          exerciseData.name,
          4 // 4-week window
        );

        if (!analytics) continue;

        // Get last session performance
        const lastPerformance = await this.getLastExercisePerformance(
          userId,
          set.exercise_id
        );

        if (!lastPerformance) continue;

        // Parse current target reps
        const [targetMin, targetMax] = this.parseRepRange(set.target_reps);

        // Calculate weight adjustment
        const weightAdjustment = this.calculateWeightAdjustment(
          lastPerformance.weight,
          lastPerformance.rpe,
          lastPerformance.reps,
          targetMin,
          targetMax,
          settings
        );

        // Calculate volume adjustment
        const volumeAdjustment = this.calculateVolumeAdjustment(
          set.target_sets,
          analytics,
          settings
        );

        // Calculate rest period adjustment
        const restAdjustment = this.calculateRestPeriodAdjustment(
          set.rest_period,
          lastPerformance.rpe,
          set.target_reps,
          analytics.performanceWindow.fatigueScore,
          settings
        );

        // Determine if changes are significant enough to recommend
        const hasWeightChange = weightAdjustment.newWeight !== lastPerformance.weight;
        const hasVolumeChange = volumeAdjustment.newSets !== set.target_sets;
        const hasRestChange = restAdjustment.newRest !== set.rest_period;

        if (hasWeightChange || hasVolumeChange || hasRestChange) {
          const recommendation: AdjustmentRecommendation = {
            exerciseId: set.exercise_id,
            exerciseName: exerciseData.name,
            currentWeight: lastPerformance.weight,
            currentSets: set.target_sets,
            currentReps: set.target_reps,
            recommendedWeight: hasWeightChange ? weightAdjustment.newWeight : undefined,
            recommendedSets: hasVolumeChange ? volumeAdjustment.newSets : undefined,
            recommendedRestPeriod: hasRestChange ? restAdjustment.newRest : undefined,
            reason: [
              hasWeightChange ? weightAdjustment.reason : '',
              hasVolumeChange ? volumeAdjustment.reason : '',
              hasRestChange ? restAdjustment.reason : '',
            ].filter(r => r).join(' '),
            confidence: this.calculateConfidence(analytics, lastPerformance),
            autoApply: settings.progressionMode === 'aggressive' && 
                       analytics.performanceWindow.performanceStatus === 'progressing',
          };

          recommendations.push(recommendation);
        }
      }

      console.log('[AdaptiveProgression] Generated', recommendations.length, 'recommendations');
      return recommendations;
    } catch (error) {
      console.error('[AdaptiveProgression] Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Apply adjustment to exercise set
   */
  static async applyAdjustment(
    adjustment: WorkoutAdjustment,
    userId: string
  ): Promise<boolean> {
    try {
      // Update the exercise set
      let updateData: any = {};

      switch (adjustment.adjustmentType) {
        case 'weight':
          // Weight is tracked in exercise_logs, not exercise_sets
          // This is applied during workout execution
          break;
        case 'sets':
          updateData.target_sets = adjustment.newValue;
          break;
        case 'reps':
          updateData.target_reps = adjustment.newValue;
          break;
        case 'rest_period':
          updateData.rest_period = adjustment.newValue;
          break;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('exercise_sets')
          .update(updateData)
          .eq('id', adjustment.exerciseSetId);

        if (error) {
          console.error('[AdaptiveProgression] Error applying adjustment:', error);
          return false;
        }
      }

      // Log the adjustment
      const { error: logError } = await supabase
        .from('adaptive_adjustments')
        .insert({
          user_id: userId,
          exercise_set_id: adjustment.exerciseSetId,
          adjustment_type: adjustment.adjustmentType,
          previous_value: JSON.stringify(adjustment.previousValue),
          new_value: JSON.stringify(adjustment.newValue),
          reason: adjustment.reason,
          trigger: adjustment.trigger,
          supporting_metrics: adjustment.supportingMetrics,
          user_accepted: true,
        });

      if (logError) {
        console.error('[AdaptiveProgression] Error logging adjustment:', logError);
      }

      return true;
    } catch (error) {
      console.error('[AdaptiveProgression] Error applying adjustment:', error);
      return false;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Map database record to ProgressionSettings type
   */
  private static mapToProgressionSettings(data: any): ProgressionSettings {
    // Map database 'balanced' to 'moderate' for UI consistency
    const mode = data.progression_mode || data.mode || 'moderate';
    const progressionMode = mode === 'balanced' ? 'moderate' : mode;
    
    return {
      id: data.id,
      userId: data.user_id,
      progressionMode: progressionMode as 'aggressive' | 'moderate' | 'conservative',
      autoAdjustEnabled: data.auto_adjust_enabled ?? data.auto_progression_enabled ?? true,
      autoDeloadEnabled: data.auto_deload_enabled ?? true,
      autoExerciseSwapEnabled: data.auto_exercise_swap_enabled ?? false,
      weightIncrementPercentage: Number(data.weight_increment_percentage ?? data.target_weight_increase_kg ?? 2.5),
      volumeIncrementSets: data.volume_increment_sets ?? 1,
      rpeTargetMin: data.rpe_target_min ?? 7,
      rpeTargetMax: data.rpe_target_max ?? 9,
      plateauDetectionWeeks: data.plateau_detection_weeks ?? (data.plateau_detection_enabled ? 3 : 0),
      deloadFrequencyWeeks: data.deload_frequency_weeks ?? 6,
      recoveryScoreThreshold: data.recovery_score_threshold ?? 6,
      highFatigueRpeThreshold: data.high_fatigue_rpe_threshold ?? 9,
    };
  }

  /**
   * Get last performance for an exercise
   */
  private static async getLastExercisePerformance(
    userId: string,
    exerciseId: string
  ): Promise<{ weight: number; reps: number; rpe: number } | null> {
    try {
      // Get the most recent completed session with this exercise
      const { data: recentSessions, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);

      if (sessionError || !recentSessions) return null;

      for (const session of recentSessions) {
        const { data: sets, error: setsError } = await supabase
          .from('exercise_sets')
          .select('id')
          .eq('session_id', session.id)
          .eq('exercise_id', exerciseId);

        if (setsError || !sets || sets.length === 0) continue;

        // Get logs for the first set (representative)
        const { data: logs, error: logsError } = await supabase
          .from('exercise_logs')
          .select('actual_weight, actual_reps, actual_rpe')
          .eq('set_id', sets[0].id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        if (!logsError && logs) {
          return {
            weight: Number(logs.actual_weight) || 0,
            reps: logs.actual_reps || 0,
            rpe: logs.actual_rpe || 7,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[AdaptiveProgression] Error getting last performance:', error);
      return null;
    }
  }

  /**
   * Parse rep range string to [min, max]
   */
  private static parseRepRange(repRange: string): [number, number] {
    const parts = repRange.split('-').map(s => parseInt(s.trim()));
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    const single = parseInt(repRange);
    return [single, single];
  }

  /**
   * Parse rep range string to average
   */
  private static parseRepRangeAverage(repRange: string): number {
    const [min, max] = this.parseRepRange(repRange);
    return (min + max) / 2;
  }

  /**
   * Calculate confidence score for recommendation
   */
  private static calculateConfidence(
    analytics: ExercisePerformanceAnalytics,
    lastPerformance: { weight: number; reps: number; rpe: number }
  ): number {
    let confidence = 50; // Base confidence

    // More data = higher confidence
    if (analytics.performanceWindow.sessionsCompleted >= 8) confidence += 20;
    else if (analytics.performanceWindow.sessionsCompleted >= 4) confidence += 10;

    // Clear trends = higher confidence
    if (analytics.performanceWindow.weightTrend === 'increasing') confidence += 15;
    if (analytics.performanceWindow.volumeTrend === 'stable') confidence += 10;

    // Low volatility = higher confidence
    if (analytics.performanceWindow.volumeTrend !== 'volatile') confidence += 10;

    // Consistent training = higher confidence
    if (analytics.performanceWindow.completionRate >= 80) confidence += 15;

    return Math.min(100, confidence);
  }
}



