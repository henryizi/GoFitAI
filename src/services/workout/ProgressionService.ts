/**
 * ============================================================
 * PROGRESSION SERVICE
 * ============================================================
 * Frontend service for communicating with backend Progression API
 * ============================================================
 */

import environment from '../../config/environment';
import { supabase } from '../supabase/client';

const API_URL = environment.apiUrl;

export interface PerformanceInsight {
  exerciseName: string;
  performanceStatus: 'progressing' | 'maintaining' | 'plateaued' | 'regressing';
  recommendation: string;
  metrics: {
    estimatedOneRM: number;
    volumeChange: number;
    avgRPE: number;
  };
  recordCount: number;
  trend?: {
    oneRMChange: number;
    recentAvg1RM: number;
    oldAvg1RM: number;
  };
}

export interface PlateauAlert {
  exerciseName: string;
  weeksWithoutProgress: number;
  currentAvg1RM: number;
  improvementPercent: number;
  recommendedAction: string;
}

export interface ProgressionRecommendation {
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  recommendation_type: 'increase_intensity' | 'change_strategy' | 'deload' | 'maintain';
  suggested_weight_change: number | null;
  suggested_rep_change: number | null;
  suggested_set_change: number | null;
  reasoning: string;
  confidence_score: number;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface ProgressionSettings {
  id?: string;
  user_id: string;
  mode: 'conservative' | 'balanced' | 'aggressive';
  primary_goal: string;
  target_weight_increase_kg: number;
  target_rep_increase: number;
  intensity_preference: 'low' | 'moderate' | 'high';
  recovery_sensitivity: 'low' | 'normal' | 'high';
  auto_progression_enabled: boolean;
  plateau_detection_enabled: boolean;
  recovery_tracking_enabled: boolean;
  form_quality_threshold: number;
}

class ProgressionService {
  /**
   * Client-side fallback: compute basic insights from workout_history when server is unavailable
   */
  private async computeClientFallbackInsights(userId: string, lookbackDays: number = 30): Promise<PerformanceInsight[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      const { data: historyData, error } = await supabase
        .from('workout_history')
        .select('id, completed_at, exercises_data')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .gte('completed_at', cutoffDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error || !historyData || historyData.length === 0) {
        return [];
      }

      const groups = new Map<string, { date: string; sets: { reps: number; weight: number; rpe?: number | null; weight_unit?: string; original_weight?: number | null }[] }[]>();

      for (const workout of historyData as any[]) {
        const exercisesData = (workout as any).exercises_data;
        if (!Array.isArray(exercisesData)) continue;
        for (const exercise of exercisesData) {
          const exerciseName = exercise.exercise_name || exercise.name || 'Exercise';
          let sets: { reps: number; weight: number; rpe?: number | null; weight_unit?: string; original_weight?: number | null }[] = [];
          if (Array.isArray(exercise.sets)) {
            sets = exercise.sets.map((s: any) => ({
              reps: s.reps || s.actual_reps || 0,
              weight: s.weight || s.actual_weight || 0,
              rpe: s.rpe ?? s.actual_rpe ?? null,
              weight_unit: s.weight_unit || 'kg',
              original_weight: s.original_weight ?? null,
            })).filter((s: any) => s.reps > 0 && s.weight > 0);
          } else if (Array.isArray(exercise.logs)) {
            sets = exercise.logs.map((l: any) => ({
              reps: l.actual_reps || l.reps || 0,
              weight: l.actual_weight || l.weight || 0,
              rpe: l.actual_rpe ?? l.rpe ?? null,
              weight_unit: l.weight_unit || 'kg',
              original_weight: l.original_weight ?? null,
            })).filter((s: any) => s.reps > 0 && s.weight > 0);
          } else if (Array.isArray(exercise.reps) && Array.isArray(exercise.weights)) {
            // Legacy format - also check for RPE array if it exists
            const rpeArray = Array.isArray(exercise.rpe) ? exercise.rpe : [];
            sets = exercise.reps.map((r: any, idx: number) => ({
              reps: r || 0,
              weight: exercise.weights[idx] || 0,
              rpe: rpeArray[idx] ?? null,
              weight_unit: 'kg',
              original_weight: null,
            })).filter((s: any) => s.reps > 0 && s.weight > 0);
          }
          if (sets.length === 0) continue;
          if (!groups.has(exerciseName)) groups.set(exerciseName, []);
          groups.get(exerciseName)!.push({
            date: (workout as any).completed_at,
            sets,
          });
        }
      }

      const insights: PerformanceInsight[] = [];

      const calculateEpley = (weight: number, reps: number) => {
        if (!weight || weight <= 0) return 0;
        if (reps <= 1) return weight;
        return weight * (1 + reps / 30);
      };
      const average = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

      // Conversion helper
      const convertLbsToKg = (lbs: number): number => lbs * 0.453592;

      for (const [exerciseName, records] of groups.entries()) {
        const perWorkout = records.map(r => {
          // Normalize weights to kg for volume calculation
          // Database stores weights in kg, but if we have original_weight, use that for accurate comparison
          const normalizedSets = r.sets.map(s => {
            let weightInKg = s.weight || 0;
            // If we have original_weight and weight_unit is lbs, convert original_weight to kg
            // This ensures we're comparing the actual weights the user logged, not the stored converted values
            if (s.original_weight != null && s.original_weight !== undefined && s.weight_unit === 'lbs') {
              weightInKg = convertLbsToKg(s.original_weight);
            } else {
              // Otherwise, weight is already in kg (database standard)
              // No conversion needed
              weightInKg = s.weight || 0;
            }
            return {
              ...s,
              weight: weightInKg
            };
          });

          const totalVolume = normalizedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
          const avgWeight = average(normalizedSets.map(s => s.weight));
          const avgReps = average(normalizedSets.map(s => s.reps));
          // Fix: Only count sets where RPE was actually logged (not null/undefined/0)
          const avgRpeVals = normalizedSets
            .map(s => s.rpe)
            .filter(rpe => rpe != null && rpe !== undefined && rpe > 0);
          const avgRPE = average(avgRpeVals);
          const e1rm = calculateEpley(avgWeight, avgReps);
          return {
            date: r.date,
            totalVolume,
            avgWeight,
            avgReps,
            avgRPE,
            e1rm,
          };
        });

        if (perWorkout.length === 0) continue;

        const n = perWorkout.length;
        
        // Split workouts into recent and early periods, ensuring they don't overlap
        // Need at least 2 workouts to calculate meaningful change
        let recent: typeof perWorkout = [];
        let early: typeof perWorkout = [];
        
        if (n >= 2) {
          // If we have 2-5 workouts, compare first half vs second half
          if (n <= 5) {
            const midPoint = Math.floor(n / 2);
            early = perWorkout.slice(0, midPoint);
            recent = perWorkout.slice(midPoint);
          } else {
            // If we have 6+ workouts, compare first 3-5 vs last 3-5
            const periodSize = Math.min(5, Math.floor(n / 2));
            early = perWorkout.slice(0, periodSize);
            recent = perWorkout.slice(n - periodSize);
          }
        } else {
          // Only 1 workout - can't calculate change
          recent = perWorkout;
          early = [];
        }

        const recentAvg1RM = average(recent.map(r => r.e1rm));
        const oldAvg1RM = early.length > 0 ? average(early.map(r => r.e1rm)) : recentAvg1RM;
        const recentAvgVol = average(recent.map(r => r.totalVolume));
        const oldAvgVol = early.length > 0 ? average(early.map(r => r.totalVolume)) : 0;
        // Fix: Only average RPE from workouts that actually have RPE data
        const avgRPEValues = recent.map(r => r.avgRPE).filter(x => x > 0);
        const avgRPE = avgRPEValues.length > 0 ? average(avgRPEValues) : 0;

        const oneRMChangePct = oldAvg1RM > 0 ? ((recentAvg1RM - oldAvg1RM) / oldAvg1RM) * 100 : 0;
        // Calculate volume change - only if we have both periods to compare
        let volumeChangePct = 0;
        if (early.length > 0 && oldAvgVol > 0) {
          const rawChange = ((recentAvgVol - oldAvgVol) / oldAvgVol) * 100;
          volumeChangePct = rawChange;
        } else if (early.length === 0 && n === 1) {
          // Only one workout - can't calculate change
          volumeChangePct = 0;
        }
        
        // Debug logging - log when volume change is 0% to help diagnose
        if (volumeChangePct === 0 && early.length > 0) {
          const actualChange = ((recentAvgVol - oldAvgVol) / oldAvgVol) * 100;
          console.log(`[ProgressionService] Volume change is 0% for ${exerciseName}:`, {
            totalWorkouts: n,
            recentCount: recent.length,
            earlyCount: early.length,
            recentAvgVol: recentAvgVol.toFixed(2),
            oldAvgVol: oldAvgVol.toFixed(2),
            actualChangePct: actualChange.toFixed(2),
            recentVolumes: recent.map(r => r.totalVolume.toFixed(2)),
            earlyVolumes: early.map(r => r.totalVolume.toFixed(2)),
            reason: Math.abs(actualChange) < 0.05 ? 'Change < 0.05% (rounds to 0)' : 
                    Math.abs(recentAvgVol - oldAvgVol) < 0.01 ? 'Volumes are identical' : 
                    'Unknown'
          });
        }
        
        // Debug logging for RPE issues
        if (avgRPE === 0 && perWorkout.some(r => r.avgRPE > 0)) {
          console.warn(`[ProgressionService] RPE calculation issue for ${exerciseName}:`, {
            workoutsWithRPE: perWorkout.filter(r => r.avgRPE > 0).length,
            totalWorkouts: perWorkout.length,
            recentWorkoutsWithRPE: recent.filter(r => r.avgRPE > 0).length
          });
        }

        let performanceStatus: PerformanceInsight['performanceStatus'] = 'maintaining';
        let recommendation = '';
        if (oneRMChangePct > 2 || volumeChangePct > 4) {
          performanceStatus = 'progressing';
          recommendation = 'Great progress. Consider increasing weight by ~2.5kg or add reps.';
        } else if (oneRMChangePct < -1 && volumeChangePct < -2) {
          performanceStatus = 'regressing';
          recommendation = 'Performance declining. Reduce volume and focus on recovery for a week.';
        } else if (Math.abs(oneRMChangePct) < 1 && Math.abs(volumeChangePct) < 2) {
          performanceStatus = 'plateaued';
          recommendation = 'Progress stalled. Change rep ranges, add volume, or try a variation.';
        } else {
          performanceStatus = 'maintaining';
          recommendation = 'Stable performance. Keep consistent or slightly increase intensity.';
        }

        insights.push({
          exerciseName,
          performanceStatus,
          recommendation,
          metrics: {
            estimatedOneRM: Number(recentAvg1RM.toFixed(1)),
            volumeChange: Math.round(volumeChangePct * 10) / 10,
            avgRPE: Math.round((avgRPE || 0) * 10) / 10,
          },
          recordCount: perWorkout.length,
          trend: {
            oneRMChange: Math.round(oneRMChangePct * 10) / 10,
            recentAvg1RM: Number(recentAvg1RM.toFixed(1)),
            oldAvg1RM: Number(oldAvg1RM.toFixed(1)),
          },
        });
      }

      insights.sort((a, b) => b.recordCount - a.recordCount);
      return insights;
    } catch (e) {
      console.warn('[ProgressionService] Fallback computation failed:', e);
      return [];
    }
  }
  /**
   * Analyzes user's overall training progress
   * Returns performance status for each exercise
   */
  async analyzeProgress(userId: string, lookbackDays: number = 30): Promise<{
    insights: PerformanceInsight[];
    settings: ProgressionSettings | null;
  }> {
    try {
      console.log('[ProgressionService] Calling analyze API:', `${API_URL}/api/progression/analyze`);
      const response = await fetch(`${API_URL}/api/progression/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          lookbackDays,
        }),
      });

      if (!response.ok) {
        // Handle "Route not found" errors gracefully (support multiple server message variants)
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            const msg = (errorData.error || errorData.message || '').toString();
            if (
              msg.includes('Route not found') ||
              msg.includes('Progression route not found')
            ) {
              console.warn('[ProgressionService] Route not found - returning empty results');
              return { insights: [], settings: null };
            }
          } catch (e) {
            // If 404 and can't parse, assume route doesn't exist
            console.warn('[ProgressionService] 404 error - route may not exist, returning empty results');
            return { insights: [], settings: null };
          }
        }
 
        let errorMessage = `Failed to analyze progress: ${response.status} ${response.statusText || 'Unknown error'}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `Failed to analyze progress: ${errorData.error}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the status
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        insights: data.insights || [],
        settings: data.settings || null,
      };
    } catch (error: any) {
      // Handle "Route not found" errors gracefully
      if (
        error.message?.includes('Route not found') ||
        error.message?.includes('Progression route not found')
      ) {
        console.warn('[ProgressionService] Route not found - returning empty results');
        return { insights: [], settings: null };
      }
      // Handle network errors - use fallback instead of throwing
      const isNetworkError = 
        error instanceof TypeError && error.message?.includes('Network request failed') ||
        error.message?.includes('fetch') || 
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.warn('[ProgressionService] Network error - using client-side fallback:', error.message || error);
        // Return empty results and let getProgressionOverview use client-side fallback
        return { insights: [], settings: null };
      }
      console.error('[ProgressionService] Analysis error:', error);
      throw error;
    }
  }

  /**
   * Detects exercises that have plateaued
   * Returns plateau alerts with recommendations
   */
  async detectPlateaus(userId: string, plateauWeeks: number = 3): Promise<{
    plateaus: PlateauAlert[];
  }> {
    try {
      console.log('[ProgressionService] Calling detect-plateaus API:', `${API_URL}/api/progression/detect-plateaus`);
      const response = await fetch(`${API_URL}/api/progression/detect-plateaus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          plateauWeeks,
        }),
      });

      if (!response.ok) {
        // Handle "Route not found" errors gracefully (support multiple server message variants)
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            const msg = (errorData.error || errorData.message || '').toString();
            if (
              msg.includes('Route not found') ||
              msg.includes('Progression route not found')
            ) {
              console.warn('[ProgressionService] Route not found - returning empty results');
              return { plateaus: [] };
            }
          } catch (e) {
            // If 404 and can't parse, assume route doesn't exist
            console.warn('[ProgressionService] 404 error - route may not exist, returning empty results');
            return { plateaus: [] };
          }
        }
 
        let errorMessage = `Failed to detect plateaus: ${response.status} ${response.statusText || 'Unknown error'}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `Failed to detect plateaus: ${errorData.error}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the status
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        plateaus: data.plateaus || [],
      };
    } catch (error: any) {
      // Handle "Route not found" errors gracefully
      if (
        error.message?.includes('Route not found') ||
        error.message?.includes('Progression route not found')
      ) {
        console.warn('[ProgressionService] Route not found - returning empty results');
        return { plateaus: [] };
      }
      // Handle network errors - use fallback instead of throwing
      const isNetworkError = 
        error instanceof TypeError && error.message?.includes('Network request failed') ||
        error.message?.includes('fetch') || 
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.warn('[ProgressionService] Network error - returning empty plateaus:', error.message || error);
        return { plateaus: [] };
      }
      console.warn('[ProgressionService] Plateau detection error:', error);
      return { plateaus: [] };
    }
  }

  /**
   * Generates progression recommendations
   * Provides specific suggestions based on current performance
   */
  async generateRecommendations(userId: string): Promise<{
    recommendations: ProgressionRecommendation[];
  }> {
    try {
      console.log('[ProgressionService] Calling recommendations API:', `${API_URL}/api/progression/recommendations`);
      const response = await fetch(`${API_URL}/api/progression/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        // Handle "Route not found" errors gracefully (support multiple server message variants)
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            const msg = (errorData.error || errorData.message || '').toString();
            if (
              msg.includes('Route not found') ||
              msg.includes('Progression route not found')
            ) {
              console.warn('[ProgressionService] Route not found - returning empty results');
              return { recommendations: [] };
            }
          } catch (e) {
            // If 404 and can't parse, assume route doesn't exist
            console.warn('[ProgressionService] 404 error - route may not exist, returning empty results');
            return { recommendations: [] };
          }
        }
 
        let errorMessage = `Failed to generate recommendations: ${response.status} ${response.statusText || 'Unknown error'}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `Failed to generate recommendations: ${errorData.error}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the status
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        recommendations: data.recommendations || [],
      };
    } catch (error: any) {
      // Handle "Route not found" errors gracefully
      if (
        error.message?.includes('Route not found') ||
        error.message?.includes('Progression route not found')
      ) {
        console.warn('[ProgressionService] Route not found - returning empty results');
        return { recommendations: [] };
      }
      // Handle network errors - use fallback instead of throwing
      const isNetworkError = 
        error instanceof TypeError && error.message?.includes('Network request failed') ||
        error.message?.includes('fetch') || 
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.warn('[ProgressionService] Network error - returning empty recommendations:', error.message || error);
        return { recommendations: [] };
      }
      console.warn('[ProgressionService] Recommendation generation error:', error);
      return { recommendations: [] };
    }
  }

  /**
   * Manually syncs exercise history
   * Extracts data from workout_sessions
   */
  async syncExerciseHistory(userId: string, lookbackDays: number = 90): Promise<{
    synced: number;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_URL}/api/progression/sync-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          lookbackDays,
        }),
      });

      if (!response.ok) {
        // Gracefully ignore missing routes
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            const msg = (errorData.error || errorData.message || '').toString();
            if (
              msg.includes('Route not found') ||
              msg.includes('Progression route not found')
            ) {
              console.warn('[ProgressionService] Sync route not found - skipping sync');
              return { synced: 0, message: 'Sync route not found' };
            }
          } catch (_) {
            console.warn('[ProgressionService] 404 on sync-history - skipping');
            return { synced: 0, message: 'Sync route missing' };
          }
        }
        throw new Error(`Failed to sync history: ${response.status} ${response.statusText || ''}`.trim());
      }

      const data = await response.json();
      return {
        synced: data.synced || 0,
        message: data.message || 'Sync completed',
      };
    } catch (error: any) {
      // Handle network errors gracefully - don't throw, just return empty result
      const isNetworkError = 
        error instanceof TypeError && error.message?.includes('Network request failed') ||
        error.message?.includes('fetch') || 
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.warn('[ProgressionService] Sync history network error - skipping sync (non-blocking):', error.message || error);
        return { synced: 0, message: 'Network unavailable - sync skipped' };
      }
      
      // For other errors, log but don't throw - sync is non-critical
      console.warn('[ProgressionService] Sync history error (non-blocking):', error.message || error);
      return { synced: 0, message: 'Sync failed' };
    }
  }

  /**
   * Gets user's progression settings
   */
  async getSettings(userId: string): Promise<ProgressionSettings | null> {
    try {
      const response = await fetch(`${API_URL}/api/progression/settings/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get settings: ${response.statusText}`);
      }

      const data = await response.json();
      return data.settings || null;
    } catch (error) {
      console.error('[ProgressionService] Get settings error:', error);
      throw error;
    }
  }

  /**
   * Updates user's progression settings
   */
  async updateSettings(userId: string, settings: Partial<ProgressionSettings>): Promise<ProgressionSettings | null> {
    try {
      const response = await fetch(`${API_URL}/api/progression/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          settings,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }

      const data = await response.json();
      return data.settings || null;
    } catch (error) {
      console.error('[ProgressionService] Update settings error:', error);
      throw error;
    }
  }

  /**
   * Gets complete progression overview
   * Includes insights, plateaus, and recommendations
   */
  async getProgressionOverview(userId: string): Promise<{
    insights: PerformanceInsight[];
    plateaus: PlateauAlert[];
    recommendations: ProgressionRecommendation[];
    settings: ProgressionSettings | null;
  }> {
    try {
      console.log('[ProgressionService] Getting progression overview for user:', userId);
      // Skip sync on every call - it's too slow. Only sync when explicitly needed.
      // The sync can be done separately or on first load only.
      // Call all APIs in parallel, but handle individual failures gracefully
      const results = await Promise.allSettled([
        this.analyzeProgress(userId, 30),
        this.detectPlateaus(userId, 3),
        this.generateRecommendations(userId),
      ]);

      const analysisResult = results[0].status === 'fulfilled' 
        ? results[0].value 
        : { insights: [], settings: null };
      
      const plateausResult = results[1].status === 'fulfilled'
        ? results[1].value
        : { plateaus: [] };
      
      const recommendationsResult = results[2].status === 'fulfilled'
        ? results[2].value
        : { recommendations: [] };

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const apiNames = ['analyzeProgress', 'detectPlateaus', 'generateRecommendations'];
          console.warn(`[ProgressionService] ${apiNames[index]} failed:`, result.reason);
        }
      });

      let insights = analysisResult.insights;
      let settings = analysisResult.settings;

      // Client-side fallback: compute insights locally if server returns empty
      if (!insights || insights.length === 0) {
        const fallbackInsights = await this.computeClientFallbackInsights(userId, 30);
        if (fallbackInsights.length > 0) {
          console.log('[ProgressionService] Using client-side fallback insights');
          insights = fallbackInsights;
        }
      }

      return {
        insights,
        plateaus: plateausResult.plateaus,
        recommendations: recommendationsResult.recommendations,
        settings,
      };
    } catch (error) {
      console.error('[ProgressionService] Overview error:', error);
      throw error;
    }
  }
}

export default new ProgressionService();


