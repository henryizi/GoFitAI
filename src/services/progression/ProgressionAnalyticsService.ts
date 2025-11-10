/**
 * ============================================================
 * PROGRESSION ANALYTICS SERVICE
 * ============================================================
 * Analyzes workout performance data to detect trends, calculate
 * metrics, and provide insights for adaptive progression.
 * ============================================================
 */

import { supabase } from '../supabase/client';

export interface PerformanceWindow {
  windowStartDate: string;
  windowEndDate: string;
  totalVolume: number;
  averageVolumePerSession: number;
  volumeTrend: 'increasing' | 'stable' | 'decreasing' | 'volatile';
  averageRPE: number;
  averageWeight: number;
  maxWeight: number;
  weightTrend: 'increasing' | 'stable' | 'decreasing';
  estimated1RM: number;
  e1rmChangePercentage: number;
  sessionsCompleted: number;
  sessionsSkipped: number;
  completionRate: number;
  averageRecoveryScore: number;
  highRPEFrequency: number;
  fatigueScore: number;
  performanceStatus: 'progressing' | 'maintaining' | 'regressing' | 'plateaued' | 'overtrained';
}

export interface ExercisePerformanceAnalytics {
  exerciseId: string;
  exerciseName: string;
  userId: string;
  analysisDate: string;
  performanceWindow: PerformanceWindow;
  insights: {
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  };
}

export interface VolumeDataPoint {
  date: string;
  totalVolume: number;
  sessionRPE: number;
  recoveryScore?: number;
}

export class ProgressionAnalyticsService {
  /**
   * Calculate estimated 1RM using Brzycki formula
   */
  static calculateE1RM(weight: number, reps: number): number {
    if (reps <= 1) return weight;
    if (reps >= 37) return weight * 1.5; // Cap for very high reps
    return weight * (36 / (37 - reps));
  }

  /**
   * Analyze performance trend from data points
   */
  static analyzeTrend(dataPoints: number[]): 'increasing' | 'stable' | 'decreasing' | 'volatile' {
    if (dataPoints.length < 3) return 'stable';

    // Calculate linear regression
    const n = dataPoints.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = dataPoints;

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }

    const slope = numerator / denominator;
    
    // Calculate coefficient of variation for volatility
    const stdDev = Math.sqrt(
      yValues.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0) / n
    );
    const coefficientOfVariation = (stdDev / yMean) * 100;

    // Determine trend
    if (coefficientOfVariation > 20) return 'volatile';
    if (Math.abs(slope) < 0.1) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate fatigue score based on RPE, recovery, and volume
   */
  static calculateFatigueScore(
    averageRPE: number,
    averageRecoveryScore: number,
    volumeChangePercentage: number,
    highRPEFrequency: number
  ): number {
    // Fatigue score: 0 (well-rested) to 10 (overtrained)
    
    // Component 1: High RPE contributes to fatigue (0-3 points)
    const rpeComponent = Math.min(3, (averageRPE - 7) * 0.75);
    
    // Component 2: Low recovery score indicates high fatigue (0-3 points)
    const recoveryComponent = Math.min(3, (10 - averageRecoveryScore) * 0.3);
    
    // Component 3: High volume increase without adaptation (0-2 points)
    const volumeComponent = Math.min(2, Math.max(0, volumeChangePercentage - 10) * 0.1);
    
    // Component 4: Frequent high RPE sets (0-2 points)
    const highRPEComponent = Math.min(2, highRPEFrequency * 0.2);
    
    const totalFatigue = Math.max(0, Math.min(10, 
      rpeComponent + recoveryComponent + volumeComponent + highRPEComponent
    ));
    
    return Number(totalFatigue.toFixed(1));
  }

  /**
   * Determine performance status
   */
  static determinePerformanceStatus(
    weightTrend: string,
    volumeTrend: string,
    e1rmChangePercentage: number,
    fatigueScore: number,
    weeksAnalyzed: number
  ): 'progressing' | 'maintaining' | 'regressing' | 'plateaued' | 'overtrained' {
    // Overtrained: high fatigue with regressing performance
    if (fatigueScore >= 7 && (weightTrend === 'decreasing' || volumeTrend === 'decreasing')) {
      return 'overtrained';
    }

    // Plateaued: no significant progress for 3+ weeks
    if (weeksAnalyzed >= 3 && Math.abs(e1rmChangePercentage) < 2 && 
        weightTrend === 'stable' && volumeTrend === 'stable') {
      return 'plateaued';
    }

    // Progressing: positive trends in weight or volume
    if (weightTrend === 'increasing' || (volumeTrend === 'increasing' && e1rmChangePercentage > 0)) {
      return 'progressing';
    }

    // Regressing: negative trends
    if (weightTrend === 'decreasing' || e1rmChangePercentage < -5) {
      return 'regressing';
    }

    // Default: maintaining
    return 'maintaining';
  }

  /**
   * Fetch exercise logs for a time window
   */
  static async fetchExerciseLogs(
    userId: string,
    exerciseId: string,
    windowStartDate: string,
    windowEndDate: string
  ): Promise<any[]> {
    console.log('[ProgressionAnalytics] Fetching logs for exercise:', exerciseId);

    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        completed_at,
        session_rpe,
        recovery_score,
        plan_id
      `)
      .eq('status', 'completed')
      .gte('completed_at', windowStartDate)
      .lte('completed_at', windowEndDate);

    if (sessionsError || !sessions) {
      console.error('[ProgressionAnalytics] Error fetching sessions:', sessionsError);
      return [];
    }

    // Get exercise sets and logs for these sessions
    const allLogs: any[] = [];

    for (const session of sessions) {
      const { data: exerciseSets, error: setsError } = await supabase
        .from('exercise_sets')
        .select(`
          id,
          target_sets,
          target_reps,
          exercise_id
        `)
        .eq('session_id', session.id)
        .eq('exercise_id', exerciseId);

      if (setsError || !exerciseSets || exerciseSets.length === 0) continue;

      for (const set of exerciseSets) {
        const { data: logs, error: logsError } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('set_id', set.id);

        if (!logsError && logs) {
          allLogs.push(...logs.map(log => ({
            ...log,
            session_id: session.id,
            session_completed_at: session.completed_at,
            session_rpe: session.session_rpe,
            recovery_score: session.recovery_score,
          })));
        }
      }
    }

    console.log('[ProgressionAnalytics] Found', allLogs.length, 'logs');
    return allLogs;
  }

  /**
   * Analyze exercise performance over a time window
   */
  static async analyzeExercisePerformance(
    userId: string,
    exerciseId: string,
    exerciseName: string,
    windowWeeks: number = 4
  ): Promise<ExercisePerformanceAnalytics | null> {
    try {
      console.log('[ProgressionAnalytics] Analyzing performance for:', exerciseName);

      const windowEndDate = new Date();
      const windowStartDate = new Date();
      windowStartDate.setDate(windowStartDate.getDate() - (windowWeeks * 7));

      const logs = await this.fetchExerciseLogs(
        userId,
        exerciseId,
        windowStartDate.toISOString(),
        windowEndDate.toISOString()
      );

      if (logs.length === 0) {
        console.log('[ProgressionAnalytics] No logs found for analysis');
        return null;
      }

      // Group logs by session
      const sessionMap = new Map<string, any[]>();
      logs.forEach(log => {
        const sessionId = log.session_id;
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, []);
        }
        sessionMap.get(sessionId)!.push(log);
      });

      const sessions = Array.from(sessionMap.values());
      const sessionsCompleted = sessions.length;

      // Calculate volume per session
      const volumeData: VolumeDataPoint[] = sessions.map(sessionLogs => {
        const totalVolume = sessionLogs.reduce((sum, log) => {
          const weight = log.actual_weight || 0;
          const reps = log.actual_reps || 0;
          return sum + (weight * reps);
        }, 0);

        return {
          date: sessionLogs[0].session_completed_at,
          totalVolume,
          sessionRPE: sessionLogs[0].session_rpe || 7,
          recoveryScore: sessionLogs[0].recovery_score,
        };
      });

      // Sort by date
      volumeData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate metrics
      const totalVolume = volumeData.reduce((sum, d) => sum + d.totalVolume, 0);
      const averageVolumePerSession = totalVolume / sessionsCompleted;
      const volumeTrend = this.analyzeTrend(volumeData.map(d => d.totalVolume));

      // Weight analysis
      const weights = logs.map(log => log.actual_weight || 0).filter(w => w > 0);
      const averageWeight = weights.length > 0 
        ? weights.reduce((a, b) => a + b, 0) / weights.length 
        : 0;
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
      
      // Group weights by week to analyze trend
      const weeklyMaxWeights: number[] = [];
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const startTime = new Date(windowStartDate).getTime();
      
      for (let week = 0; week < windowWeeks; week++) {
        const weekStart = startTime + (week * weekMs);
        const weekEnd = weekStart + weekMs;
        
        const weekLogs = logs.filter(log => {
          const logTime = new Date(log.session_completed_at).getTime();
          return logTime >= weekStart && logTime < weekEnd;
        });
        
        if (weekLogs.length > 0) {
          const weekMax = Math.max(...weekLogs.map(l => l.actual_weight || 0));
          if (weekMax > 0) weeklyMaxWeights.push(weekMax);
        }
      }
      
      const weightTrend = this.analyzeTrend(weeklyMaxWeights);

      // RPE analysis
      const rpeValues = logs
        .map(log => log.actual_rpe || 0)
        .filter(rpe => rpe > 0);
      const averageRPE = rpeValues.length > 0
        ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length
        : 7;
      const highRPEFrequency = rpeValues.filter(rpe => rpe >= 9).length;

      // Recovery analysis
      const recoveryScores = volumeData
        .map(d => d.recoveryScore)
        .filter((score): score is number => score !== undefined && score > 0);
      const averageRecoveryScore = recoveryScores.length > 0
        ? recoveryScores.reduce((a, b) => a + b, 0) / recoveryScores.length
        : 7;

      // Estimated 1RM calculation
      const topSets = logs
        .filter(log => log.actual_weight && log.actual_reps)
        .map(log => ({
          e1rm: this.calculateE1RM(log.actual_weight, log.actual_reps),
          date: log.session_completed_at,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const estimated1RM = topSets.length > 0 ? topSets[0].e1rm : 0;

      // Calculate e1RM change (compare first half vs second half of window)
      const midpoint = Math.floor(topSets.length / 2);
      const recentE1RMs = topSets.slice(0, midpoint).map(s => s.e1rm);
      const earlierE1RMs = topSets.slice(midpoint).map(s => s.e1rm);
      
      const recentAvg = recentE1RMs.length > 0
        ? recentE1RMs.reduce((a, b) => a + b, 0) / recentE1RMs.length
        : 0;
      const earlierAvg = earlierE1RMs.length > 0
        ? earlierE1RMs.reduce((a, b) => a + b, 0) / earlierE1RMs.length
        : 0;
      
      const e1rmChangePercentage = earlierAvg > 0
        ? ((recentAvg - earlierAvg) / earlierAvg) * 100
        : 0;

      // Completion rate (assume user planned to train 2x per week)
      const expectedSessions = windowWeeks * 2;
      const completionRate = (sessionsCompleted / expectedSessions) * 100;

      // Volume change percentage for fatigue calculation
      const firstHalfVolume = volumeData.slice(0, midpoint).reduce((sum, d) => sum + d.totalVolume, 0);
      const secondHalfVolume = volumeData.slice(midpoint).reduce((sum, d) => sum + d.totalVolume, 0);
      const volumeChangePercentage = firstHalfVolume > 0
        ? ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100
        : 0;

      // Fatigue score
      const fatigueScore = this.calculateFatigueScore(
        averageRPE,
        averageRecoveryScore,
        volumeChangePercentage,
        highRPEFrequency
      );

      // Performance status
      const performanceStatus = this.determinePerformanceStatus(
        weightTrend,
        volumeTrend,
        e1rmChangePercentage,
        fatigueScore,
        windowWeeks
      );

      // Generate insights
      const insights = this.generateInsights(
        performanceStatus,
        weightTrend,
        volumeTrend,
        e1rmChangePercentage,
        fatigueScore,
        averageRPE,
        completionRate
      );

      const performanceWindow: PerformanceWindow = {
        windowStartDate: windowStartDate.toISOString(),
        windowEndDate: windowEndDate.toISOString(),
        totalVolume,
        averageVolumePerSession,
        volumeTrend,
        averageRPE: Number(averageRPE.toFixed(1)),
        averageWeight: Number(averageWeight.toFixed(1)),
        maxWeight: Number(maxWeight.toFixed(1)),
        weightTrend,
        estimated1RM: Number(estimated1RM.toFixed(1)),
        e1rmChangePercentage: Number(e1rmChangePercentage.toFixed(1)),
        sessionsCompleted,
        sessionsSkipped: Math.max(0, expectedSessions - sessionsCompleted),
        completionRate: Number(completionRate.toFixed(1)),
        averageRecoveryScore: Number(averageRecoveryScore.toFixed(1)),
        highRPEFrequency,
        fatigueScore,
        performanceStatus,
      };

      return {
        exerciseId,
        exerciseName,
        userId,
        analysisDate: new Date().toISOString(),
        performanceWindow,
        insights,
      };
    } catch (error) {
      console.error('[ProgressionAnalytics] Error analyzing performance:', error);
      return null;
    }
  }

  /**
   * Generate AI-style insights from performance data
   */
  static generateInsights(
    performanceStatus: string,
    weightTrend: string,
    volumeTrend: string,
    e1rmChangePercentage: number,
    fatigueScore: number,
    averageRPE: number,
    completionRate: number
  ): {
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Summary based on performance status
    let summary = '';
    switch (performanceStatus) {
      case 'progressing':
        summary = `Excellent progress! Your strength is increasing consistently. Keep up the great work.`;
        strengths.push('Consistent strength gains');
        break;
      case 'maintaining':
        summary = `You're maintaining your current level. Consider adding progressive overload to continue advancing.`;
        recommendations.push('Increase weight by 2.5-5% or add 1-2 reps per set');
        break;
      case 'plateaued':
        summary = `Your progress has stalled. Time to change your training stimulus.`;
        concerns.push('No significant progress in 3+ weeks');
        recommendations.push('Consider a deload week followed by a new training block');
        recommendations.push('Try swapping to exercise variations');
        break;
      case 'regressing':
        summary = `Performance is declining. You may need more recovery or reduced training stress.`;
        concerns.push('Decreasing strength or volume');
        recommendations.push('Take a deload week to recover');
        recommendations.push('Check nutrition and sleep quality');
        break;
      case 'overtrained':
        summary = `High fatigue with declining performance indicates overtraining. Prioritize recovery.`;
        concerns.push('High fatigue score with performance decline');
        recommendations.push('Take 3-7 days of complete rest or active recovery');
        recommendations.push('Review training volume and intensity');
        break;
    }

    // Analyze specific metrics
    if (weightTrend === 'increasing') {
      strengths.push('Progressive overload is working');
    }

    if (volumeTrend === 'increasing' && fatigueScore < 6) {
      strengths.push('Successfully increasing training volume');
    }

    if (completionRate >= 80) {
      strengths.push('Excellent training consistency');
    } else if (completionRate < 60) {
      concerns.push('Low training frequency may limit progress');
      recommendations.push('Try to hit at least 80% of planned sessions');
    }

    if (fatigueScore >= 7) {
      concerns.push('High fatigue levels detected');
      recommendations.push('Reduce training volume by 20-30%');
      recommendations.push('Focus on recovery: sleep, nutrition, stress management');
    }

    if (averageRPE > 9) {
      concerns.push('Training too close to failure too often');
      recommendations.push('Leave 1-2 reps in reserve (RPE 8) on most sets');
    } else if (averageRPE < 6) {
      concerns.push('Training intensity may be too low');
      recommendations.push('Aim for RPE 7-8 on working sets');
    }

    if (e1rmChangePercentage > 10) {
      strengths.push(`Estimated 1RM increased by ${e1rmChangePercentage.toFixed(1)}%`);
    }

    return {
      summary,
      strengths,
      concerns,
      recommendations,
    };
  }

  /**
   * Save performance analytics to database
   */
  static async savePerformanceAnalytics(
    analytics: ExercisePerformanceAnalytics
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('performance_analytics')
        .insert({
          user_id: analytics.userId,
          exercise_id: analytics.exerciseId,
          analysis_date: analytics.analysisDate,
          window_start_date: analytics.performanceWindow.windowStartDate,
          window_end_date: analytics.performanceWindow.windowEndDate,
          total_volume: analytics.performanceWindow.totalVolume,
          average_volume_per_session: analytics.performanceWindow.averageVolumePerSession,
          volume_trend: analytics.performanceWindow.volumeTrend,
          average_rpe: analytics.performanceWindow.averageRPE,
          average_weight: analytics.performanceWindow.averageWeight,
          max_weight: analytics.performanceWindow.maxWeight,
          weight_trend: analytics.performanceWindow.weightTrend,
          estimated_1rm: analytics.performanceWindow.estimated1RM,
          e1rm_change_percentage: analytics.performanceWindow.e1rmChangePercentage,
          sessions_completed: analytics.performanceWindow.sessionsCompleted,
          sessions_skipped: analytics.performanceWindow.sessionsSkipped,
          completion_rate: analytics.performanceWindow.completionRate,
          average_recovery_score: analytics.performanceWindow.averageRecoveryScore,
          high_rpe_frequency: analytics.performanceWindow.highRPEFrequency,
          fatigue_score: analytics.performanceWindow.fatigueScore,
          performance_status: analytics.performanceWindow.performanceStatus,
          insights: analytics.insights,
        });

      if (error) {
        console.error('[ProgressionAnalytics] Error saving analytics:', error);
        return false;
      }

      console.log('[ProgressionAnalytics] Successfully saved analytics');
      return true;
    } catch (error) {
      console.error('[ProgressionAnalytics] Error saving analytics:', error);
      return false;
    }
  }

  /**
   * Get latest performance analytics for an exercise
   */
  static async getLatestAnalytics(
    userId: string,
    exerciseId: string
  ): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('performance_analytics')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('[ProgressionAnalytics] Error fetching analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[ProgressionAnalytics] Error fetching analytics:', error);
      return null;
    }
  }
}
