/**
 * ============================================================
 * PROGRESSION SERVICE
 * ============================================================
 * Frontend service for communicating with backend Progression API
 * ============================================================
 */

import environment from '../../config/environment';

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
      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        console.error('[ProgressionService] Network error - server may be unreachable:', error);
        throw new Error(`Network error: Unable to connect to server. Please check your connection.`);
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
      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        console.error('[ProgressionService] Network error - server may be unreachable:', error);
        throw new Error(`Network error: Unable to connect to server. Please check your connection.`);
      }
      console.error('[ProgressionService] Plateau detection error:', error);
      throw error;
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
      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        console.error('[ProgressionService] Network error - server may be unreachable:', error);
        throw new Error(`Network error: Unable to connect to server. Please check your connection.`);
      }
      console.error('[ProgressionService] Recommendation generation error:', error);
      throw error;
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
        throw new Error(`Failed to sync history: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        synced: data.synced || 0,
        message: data.message || 'Sync completed',
      };
    } catch (error) {
      console.error('[ProgressionService] Sync history error:', error);
      throw error;
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

      return {
        insights: analysisResult.insights,
        plateaus: plateausResult.plateaus,
        recommendations: recommendationsResult.recommendations,
        settings: analysisResult.settings,
      };
    } catch (error) {
      console.error('[ProgressionService] Overview error:', error);
      throw error;
    }
  }
}

export default new ProgressionService();

