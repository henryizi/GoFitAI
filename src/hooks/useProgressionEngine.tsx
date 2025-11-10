/**
 * ============================================================
 * USE PROGRESSION ENGINE HOOK
 * ============================================================
 * React hook for integrating adaptive progression into workout
 * sessions with real-time recommendations and adjustments.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { AdaptiveProgressionService, AdjustmentRecommendation } from '../services/progression/AdaptiveProgressionService';
import { ProgressionAnalyticsService } from '../services/progression/ProgressionAnalyticsService';
import { PlateauDetectionService } from '../services/progression/PlateauDetectionService';

interface ProgressionEngineOptions {
  userId: string;
  sessionId: string;
  planId?: string | null;
  enabled?: boolean;
}

interface ExerciseRecommendation {
  exerciseId: string;
  exerciseName: string;
  suggestedWeight?: number;
  suggestedSets?: number;
  suggestedReps?: string;
  reason: string;
  confidence: number;
  autoApplied: boolean;
}

export function useProgressionEngine(options: ProgressionEngineOptions) {
  const { userId, sessionId, planId, enabled = true } = options;

  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Map<string, ExerciseRecommendation>>(new Map());
  const [activeDeload, setActiveDeload] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);

  /**
   * Load progression settings and check for active deload
   */
  useEffect(() => {
    if (!enabled || !userId) return;

    loadSettings();
    checkActiveDeload();
  }, [userId, planId, enabled]);

  /**
   * Generate recommendations when session loads
   */
  useEffect(() => {
    if (!enabled || !userId || !sessionId || !settings?.autoAdjustEnabled) return;

    generateRecommendations();
  }, [sessionId, settings]);

  /**
   * Load user's progression settings
   */
  const loadSettings = async () => {
    try {
      const fetchedSettings = await AdaptiveProgressionService.getProgressionSettings(userId, planId);
      setSettings(fetchedSettings);
    } catch (error) {
      console.error('[useProgressionEngine] Error loading settings:', error);
    }
  };

  /**
   * Check if user is in an active deload week
   */
  const checkActiveDeload = async () => {
    if (!planId) return;

    try {
      const deload = await PlateauDetectionService.getActiveDeload(userId, planId);
      setActiveDeload(deload);
    } catch (error) {
      console.error('[useProgressionEngine] Error checking deload:', error);
    }
  };

  /**
   * Generate recommendations for all exercises in the session
   */
  const generateRecommendations = async () => {
    try {
      setLoading(true);

      const adjustments = await AdaptiveProgressionService.generateAdjustmentRecommendations(
        userId,
        sessionId,
        planId
      );

      const recommendationsMap = new Map<string, ExerciseRecommendation>();

      adjustments.forEach(adjustment => {
        recommendationsMap.set(adjustment.exerciseId, {
          exerciseId: adjustment.exerciseId,
          exerciseName: adjustment.exerciseName,
          suggestedWeight: adjustment.recommendedWeight,
          suggestedSets: adjustment.recommendedSets,
          suggestedReps: adjustment.recommendedReps,
          reason: adjustment.reason,
          confidence: adjustment.confidence,
          autoApplied: adjustment.autoApply,
        });
      });

      setRecommendations(recommendationsMap);
    } catch (error) {
      console.error('[useProgressionEngine] Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get recommendation for a specific exercise
   */
  const getRecommendation = useCallback((exerciseId: string): ExerciseRecommendation | null => {
    return recommendations.get(exerciseId) || null;
  }, [recommendations]);

  /**
   * Accept a recommendation and apply it
   */
  const acceptRecommendation = useCallback(async (exerciseId: string): Promise<boolean> => {
    const recommendation = recommendations.get(exerciseId);
    if (!recommendation) return false;

    try {
      // The recommendation is applied in real-time by the user during the workout
      // Mark it as accepted for tracking
      console.log('[useProgressionEngine] Recommendation accepted:', recommendation);
      return true;
    } catch (error) {
      console.error('[useProgressionEngine] Error accepting recommendation:', error);
      return false;
    }
  }, [recommendations]);

  /**
   * Dismiss a recommendation
   */
  const dismissRecommendation = useCallback((exerciseId: string) => {
    const newRecommendations = new Map(recommendations);
    newRecommendations.delete(exerciseId);
    setRecommendations(newRecommendations);
  }, [recommendations]);

  /**
   * Analyze performance after a set is completed
   */
  const analyzeSetPerformance = useCallback(async (
    exerciseId: string,
    exerciseName: string,
    completedReps: number,
    weight: number,
    rpe: number,
    targetRepsMin: number,
    targetRepsMax: number
  ): Promise<{
    feedback: string;
    shouldAdjust: boolean;
    suggestedAdjustment?: string;
  }> => {
    if (!settings) {
      return {
        feedback: 'Good set!',
        shouldAdjust: false,
      };
    }

    const { rpeTargetMin, rpeTargetMax } = settings;

    // Immediate feedback based on this set
    let feedback = '';
    let shouldAdjust = false;
    let suggestedAdjustment = '';

    // Exceeded target reps with low RPE
    if (completedReps > targetRepsMax && rpe < rpeTargetMin) {
      feedback = '💪 Great set! You might be ready for more weight.';
      shouldAdjust = true;
      suggestedAdjustment = `Consider adding ${(weight * 0.025).toFixed(1)}kg next set`;
    }
    // Hit target with good RPE
    else if (completedReps >= targetRepsMin && completedReps <= targetRepsMax && rpe >= rpeTargetMin && rpe <= rpeTargetMax) {
      feedback = '✅ Perfect! Right in the target zone.';
      shouldAdjust = false;
    }
    // Failed to hit minimum reps
    else if (completedReps < targetRepsMin) {
      feedback = '⚠️ Weight might be too heavy. Focus on form.';
      shouldAdjust = true;
      suggestedAdjustment = `Consider reducing ${(weight * 0.05).toFixed(1)}kg`;
    }
    // RPE too high
    else if (rpe > rpeTargetMax) {
      feedback = '🔥 Very intense! Monitor fatigue.';
      shouldAdjust = false;
    }
    // RPE too low
    else if (rpe < rpeTargetMin && completedReps >= targetRepsMin) {
      feedback = '🚀 Room to grow! Consider progression.';
      shouldAdjust = true;
      suggestedAdjustment = 'Ready for more challenging load';
    }
    else {
      feedback = '👍 Solid set!';
      shouldAdjust = false;
    }

    return {
      feedback,
      shouldAdjust,
      suggestedAdjustment,
    };
  }, [settings]);

  /**
   * Get deload adjustment factor
   */
  const getDeloadAdjustment = useCallback((): {
    isDeload: boolean;
    volumeReduction: number;
    intensityReduction: number;
    message: string;
  } => {
    if (!activeDeload) {
      return {
        isDeload: false,
        volumeReduction: 0,
        intensityReduction: 0,
        message: '',
      };
    }

    const reduction = activeDeload.reductionPercentage || 40;

    return {
      isDeload: true,
      volumeReduction: reduction,
      intensityReduction: reduction * 0.5, // Less intensity reduction than volume
      message: `🔄 Deload Week Active: ${reduction}% volume reduction for recovery`,
    };
  }, [activeDeload]);

  /**
   * Find alternative exercises for a plateaued movement
   */
  const findAlternatives = useCallback(async (exerciseId: string): Promise<any[]> => {
    try {
      const alternatives = await PlateauDetectionService.findExerciseAlternatives(
        exerciseId,
        'plateau'
      );
      return alternatives;
    } catch (error) {
      console.error('[useProgressionEngine] Error finding alternatives:', error);
      return [];
    }
  }, []);

  /**
   * Track exercise completion for analytics
   */
  const trackExerciseCompletion = useCallback(async (
    exerciseId: string,
    exerciseName: string
  ) => {
    try {
      // Trigger analytics update in the background
      // This doesn't need to block the UI
      ProgressionAnalyticsService.analyzeExercisePerformance(
        userId,
        exerciseId,
        exerciseName,
        4 // 4-week window
      ).then(analytics => {
        if (analytics) {
          ProgressionAnalyticsService.savePerformanceAnalytics(analytics);
        }
      });
    } catch (error) {
      console.error('[useProgressionEngine] Error tracking completion:', error);
    }
  }, [userId]);

  return {
    // State
    loading,
    recommendations,
    settings,
    activeDeload,
    isDeloadActive: !!activeDeload,

    // Functions
    getRecommendation,
    acceptRecommendation,
    dismissRecommendation,
    analyzeSetPerformance,
    getDeloadAdjustment,
    findAlternatives,
    trackExerciseCompletion,
    refreshRecommendations: generateRecommendations,
  };
}



