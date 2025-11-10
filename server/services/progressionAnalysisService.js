/**
 * ============================================================
 * PROGRESSION ANALYSIS SERVICE
 * ============================================================
 * 分析用户的训练进度，检测停滞，生成进阶建议
 * ============================================================
 */

class ProgressionAnalysisService {
  constructor() {
    this.supabase = null;
  }

  // Initialize with supabase client from server
  initialize(supabaseClient) {
    this.supabase = supabaseClient;
  }

  // Getter for supabase to ensure it's initialized
  getSupabase() {
    if (!this.supabase) {
      throw new Error('ProgressionAnalysisService not initialized. Call initialize() first.');
    }
    return this.supabase;
  }
  /**
   * Helper: Retry a Supabase query with exponential backoff
   */
  async retryQuery(queryFn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await queryFn();
      } catch (error) {
        const isFetchError = error.message?.includes('fetch failed') || 
                           error.message?.includes('ETIMEDOUT') ||
                           error.message?.includes('ECONNREFUSED');
        
        if (!isFetchError || attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff: 100ms, 300ms, 900ms)
        const delay = Math.min(100 * Math.pow(3, attempt - 1), 2000);
        console.log(`[ProgressionAnalysis] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 第1步：从workout_sessions提取并保存exercise_history
   * 这个函数会分析最近的训练记录并保存到exercise_history表
   */
  async syncExerciseHistory(userId, lookbackDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      // 获取用户最近的训练session (with retry logic)
      const { data: sessions, error: sessionsError} = await this.retryQuery(() =>
        this.getSupabase()
          .from('workout_sessions')
          .select('id, exercises_completed, completed_at')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .gte('completed_at', cutoffDate.toISOString())
          .order('completed_at', { ascending: false })
      );

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) {
        return { synced: 0, message: 'No completed sessions found' };
      }

      let syncedCount = 0;

      // 第2步：遍历每个session，提取exercise数据
      for (const session of sessions) {
        const exercises = session.exercises_completed || [];
        
        for (const exercise of exercises) {
          // 跳过没有完成任何set的exercise
          const completedSets = (exercise.sets || []).filter(s => s.completed);
          if (completedSets.length === 0) continue;

          // 第3步：计算exercise的汇总数据
          const totalVolume = completedSets.reduce((sum, set) => {
            return sum + ((set.weight || 0) * (set.reps || 0));
          }, 0);

          const avgWeight = completedSets.reduce((sum, set) => sum + (set.weight || 0), 0) / completedSets.length;
          const avgReps = completedSets.reduce((sum, set) => sum + (set.reps || 0), 0) / completedSets.length;
          const avgRPE = completedSets.reduce((sum, set) => sum + (set.rpe || 0), 0) / completedSets.length;

          // 第4步：计算estimated 1RM (使用Epley公式)
          const estimated1RM = this.calculateOneRM(avgWeight, avgReps);

          // 第5步：保存到exercise_history
          const { error: insertError } = await this.getSupabase()
            .from('exercise_history')
            .upsert({
              user_id: userId,
              exercise_id: exercise.id || exercise.name,
              exercise_name: exercise.name,
              weight_kg: avgWeight,
              reps: Math.round(avgReps),
              sets_completed: completedSets.length,
              total_volume: totalVolume,
              rpe: avgRPE > 0 ? avgRPE : null,
              form_quality: exercise.formQuality || null,
              estimated_one_rm: estimated1RM,
              session_id: session.id,
              performed_at: session.completed_at,
            }, {
              onConflict: 'user_id,exercise_id,performed_at',
              ignoreDuplicates: false
            });

          if (!insertError) syncedCount++;
        }
      }

      return { synced: syncedCount, message: `Synced ${syncedCount} exercise records` };
    } catch (error) {
      console.error('[ProgressionAnalysis] Sync error:', error);
      throw error;
    }
  }

  /**
   * 第1步：计算1RM (One Rep Max)
   * 使用Epley公式: 1RM = weight × (1 + reps/30)
   */
  calculateOneRM(weight, reps) {
    if (!weight || weight === 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  }

  /**
   * 第1步：分析用户整体进度
   * 返回每个exercise的表现状态和建议
   */
  async analyzeProgress(userId, lookbackDays = 30) {
    try {
      // 第2步：尝试同步最新的exercise history（如果失败也继续）
      try {
        await this.syncExerciseHistory(userId, lookbackDays);
      } catch (syncError) {
        console.warn('[ProgressionAnalysis] Sync skipped:', syncError.message);
        // Continue anyway - use existing exercise_history data
      }

      // 第3步：获取用户的progression settings (with retry)
      const { data: settings } = await this.retryQuery(() =>
        this.getSupabase()
          .from('progression_settings')
          .select('*')
          .eq('user_id', userId)
          .single()
      );

      // 第4步：获取exercise history (with retry)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      const { data: history, error: historyError } = await this.retryQuery(() =>
        this.getSupabase()
          .from('exercise_history')
          .select('*')
          .eq('user_id', userId)
          .gte('performed_at', cutoffDate.toISOString())
          .order('performed_at', { ascending: true })
      );

      if (historyError) throw historyError;
      if (!history || history.length === 0) {
        return { insights: [], message: 'No exercise history found' };
      }

      // 第5步：按exercise分组
      const exerciseGroups = this.groupByExercise(history);

      // 第6步：分析每个exercise
      const insights = [];
      for (const [exerciseName, records] of Object.entries(exerciseGroups)) {
        const insight = this.analyzeExerciseProgress(exerciseName, records, settings);
        insights.push(insight);
      }

      return { insights, settings };
    } catch (error) {
      console.error('[ProgressionAnalysis] Analysis error:', error);
      throw error;
    }
  }

  /**
   * 第1步：按exercise名称分组
   */
  groupByExercise(history) {
    const groups = {};
    for (const record of history) {
      if (!groups[record.exercise_name]) {
        groups[record.exercise_name] = [];
      }
      groups[record.exercise_name].push(record);
    }
    return groups;
  }

  /**
   * 第1步：分析单个exercise的进度
   * 第2步：判断是progressing, maintaining, plateaued还是regressing
   */
  analyzeExerciseProgress(exerciseName, records, settings) {
    if (records.length < 2) {
      return {
        exerciseName,
        performanceStatus: 'maintaining',
        recommendation: 'Need more data to analyze progress.',
        metrics: {
          estimatedOneRM: records[0]?.estimated_one_rm || 0,
          volumeChange: 0,
          avgRPE: records[0]?.rpe || 0,
        },
        recordCount: records.length,
      };
    }

    // 第3步：计算趋势
    const recentRecords = records.slice(-5); // 最近5次
    const oldRecords = records.slice(0, Math.min(5, records.length - 5)); // 早期5次

    const recentAvg1RM = this.average(recentRecords.map(r => r.estimated_one_rm || 0));
    const oldAvg1RM = oldRecords.length > 0 ? this.average(oldRecords.map(r => r.estimated_one_rm || 0)) : recentAvg1RM;
    
    const recentAvgVolume = this.average(recentRecords.map(r => r.total_volume || 0));
    const oldAvgVolume = oldRecords.length > 0 ? this.average(oldRecords.map(r => r.total_volume || 0)) : recentAvgVolume;

    const avgRPE = this.average(recentRecords.map(r => r.rpe || 0).filter(r => r > 0));

    // 第4步：计算变化百分比
    const oneRMChange = oldAvg1RM > 0 ? ((recentAvg1RM - oldAvg1RM) / oldAvg1RM) * 100 : 0;
    const volumeChange = oldAvgVolume > 0 ? ((recentAvgVolume - oldAvgVolume) / oldAvgVolume) * 100 : 0;

    // 第5步：判断performance status
    let performanceStatus = 'maintaining';
    let recommendation = '';

    const progressThreshold = settings?.mode === 'aggressive' ? 3 : settings?.mode === 'conservative' ? 1 : 2;
    const plateauThreshold = settings?.mode === 'aggressive' ? -2 : settings?.mode === 'conservative' ? -0.5 : -1;

    if (oneRMChange > progressThreshold || volumeChange > progressThreshold * 2) {
      performanceStatus = 'progressing';
      recommendation = `Excellent progress! Consider increasing weight by ${settings?.target_weight_increase_kg || 2.5}kg or reps by ${settings?.target_rep_increase || 2}.`;
    } else if (oneRMChange < plateauThreshold && volumeChange < plateauThreshold * 2) {
      performanceStatus = 'regressing';
      recommendation = 'Performance declining. Consider reducing volume, checking form, or taking a deload week.';
    } else if (Math.abs(oneRMChange) < 1 && Math.abs(volumeChange) < 2) {
      performanceStatus = 'plateaued';
      recommendation = 'Progress has stalled. Try changing rep ranges, adding volume, or switching exercise variations.';
    } else {
      performanceStatus = 'maintaining';
      recommendation = 'Performance is stable. Keep consistent or slightly increase intensity.';
    }

    return {
      exerciseName,
      performanceStatus,
      recommendation,
      metrics: {
        estimatedOneRM: recentAvg1RM,
        volumeChange: Math.round(volumeChange * 10) / 10,
        avgRPE: Math.round(avgRPE * 10) / 10,
      },
      recordCount: records.length,
      trend: {
        oneRMChange: Math.round(oneRMChange * 10) / 10,
        recentAvg1RM,
        oldAvg1RM,
      },
    };
  }

  /**
   * 第1步：检测plateaus（停滞）
   * 第2步：找出超过plateauWeeks周没有进步的exercises
   */
  async detectPlateaus(userId, plateauWeeks = 3) {
    try {
      const lookbackDays = plateauWeeks * 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      // 获取exercise history
      const { data: history, error } = await this.getSupabase()
        .from('exercise_history')
        .select('*')
        .eq('user_id', userId)
        .gte('performed_at', cutoffDate.toISOString())
        .order('performed_at', { ascending: true });

      if (error) throw error;
      if (!history || history.length === 0) {
        return { plateaus: [] };
      }

      // 第3步：按exercise分组
      const exerciseGroups = this.groupByExercise(history);

      // 第4步：检测每个exercise是否plateau
      const plateaus = [];
      for (const [exerciseName, records] of Object.entries(exerciseGroups)) {
        if (records.length < 3) continue;

        // 第5步：检查最近的记录是否有进步
        const sortedRecords = records.sort((a, b) => 
          new Date(a.performed_at) - new Date(b.performed_at)
        );

        const firstThird = sortedRecords.slice(0, Math.ceil(sortedRecords.length / 3));
        const lastThird = sortedRecords.slice(-Math.ceil(sortedRecords.length / 3));

        const firstAvg1RM = this.average(firstThird.map(r => r.estimated_one_rm || 0));
        const lastAvg1RM = this.average(lastThird.map(r => r.estimated_one_rm || 0));

        const improvement = lastAvg1RM - firstAvg1RM;
        const improvementPercent = firstAvg1RM > 0 ? (improvement / firstAvg1RM) * 100 : 0;

        // 第6步：如果improvement < 1%，认为是plateau
        if (improvementPercent < 1) {
          const weeksStalled = Math.floor(
            (new Date(lastThird[lastThird.length - 1].performed_at) - new Date(firstThird[0].performed_at)) / (7 * 24 * 60 * 60 * 1000)
          );

          plateaus.push({
            exerciseName,
            weeksWithoutProgress: weeksStalled,
            currentAvg1RM: lastAvg1RM,
            improvementPercent: Math.round(improvementPercent * 10) / 10,
            recommendedAction: this.getPlateauRecommendation(exerciseName),
          });

          // 第7步：保存到plateau_detections表
          await this.getSupabase().from('plateau_detections').upsert({
            user_id: userId,
            exercise_id: records[0].exercise_id,
            exercise_name: exerciseName,
            weeks_stalled: weeksStalled,
            last_progress_date: firstThird[firstThird.length - 1].performed_at,
            recommended_action: this.getPlateauRecommendation(exerciseName),
            detected_at: new Date().toISOString(),
            is_resolved: false,
          }, {
            onConflict: 'user_id,exercise_id',
            ignoreDuplicates: false
          });
        }
      }

      return { plateaus };
    } catch (error) {
      console.error('[ProgressionAnalysis] Plateau detection error:', error);
      throw error;
    }
  }

  /**
   * 第1步：根据exercise类型提供plateau建议
   */
  getPlateauRecommendation(exerciseName) {
    const name = exerciseName.toLowerCase();
    
    if (name.includes('squat')) {
      return 'Try front squats, pause squats, or increase frequency to 2-3x per week.';
    } else if (name.includes('bench')) {
      return 'Try incline bench, close-grip bench, or add more tricep accessory work.';
    } else if (name.includes('deadlift')) {
      return 'Try deficit deadlifts, Romanian deadlifts, or focus on improving grip strength.';
    } else if (name.includes('press') || name.includes('shoulder')) {
      return 'Try different pressing angles, increase frequency, or add rear delt work for balance.';
    } else if (name.includes('row') || name.includes('pull')) {
      return 'Try different grip widths, cable variations, or increase training frequency.';
    } else {
      return 'Try different rep ranges (5-8 or 12-15), add volume, or switch to a variation of this exercise.';
    }
  }

  /**
   * 第1步：生成progression recommendations
   * 第2步：基于当前表现和settings生成具体建议
   */
  async generateRecommendations(userId) {
    try {
      // 分析进度
      const { insights, settings } = await this.analyzeProgress(userId);

      const recommendations = [];

      // 第3步：为每个exercise生成建议
      for (const insight of insights) {
        let suggestedWeight = null;
        let suggestedReps = null;
        let suggestedSets = null;
        let reasoning = '';

        if (insight.performanceStatus === 'progressing') {
          // 进步中 - 建议增加
          suggestedWeight = settings?.target_weight_increase_kg || 2.5;
          reasoning = `You've shown consistent progress. Time to increase the challenge.`;
        } else if (insight.performanceStatus === 'plateaued') {
          // 停滞 - 建议改变策略
          suggestedReps = (settings?.target_rep_increase || 2);
          reasoning = `Progress has stalled. Try increasing reps before adding weight.`;
        } else if (insight.performanceStatus === 'regressing') {
          // 退步 - 建议减少或休息
          suggestedWeight = -(settings?.target_weight_increase_kg || 2.5);
          reasoning = `Performance declining. Consider reducing load and focusing on recovery.`;
        } else {
          // 维持 - 建议保持或微调
          reasoning = `Performance is stable. Continue current approach or slightly increase volume.`;
        }

        const recommendation = {
          user_id: userId,
          exercise_id: insight.exerciseName,
          exercise_name: insight.exerciseName,
          recommendation_type: this.getRecommendationType(insight.performanceStatus),
          suggested_weight_change: suggestedWeight,
          suggested_rep_change: suggestedReps,
          suggested_set_change: suggestedSets,
          reasoning,
          confidence_score: this.calculateConfidenceScore(insight.recordCount),
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        recommendations.push(recommendation);

        // 第4步：保存到数据库
        await this.getSupabase().from('progression_recommendations').upsert(recommendation, {
          onConflict: 'user_id,exercise_id',
          ignoreDuplicates: false
        });
      }

      return { recommendations };
    } catch (error) {
      console.error('[ProgressionAnalysis] Recommendation generation error:', error);
      throw error;
    }
  }

  /**
   * 第1步：根据performance status决定recommendation type
   */
  getRecommendationType(performanceStatus) {
    switch (performanceStatus) {
      case 'progressing':
        return 'increase_intensity';
      case 'plateaued':
        return 'change_strategy';
      case 'regressing':
        return 'deload';
      default:
        return 'maintain';
    }
  }

  /**
   * 第1步：根据记录数量计算confidence score
   * 记录越多，confidence越高
   */
  calculateConfidenceScore(recordCount) {
    if (recordCount >= 10) return 0.9;
    if (recordCount >= 7) return 0.8;
    if (recordCount >= 5) return 0.7;
    if (recordCount >= 3) return 0.6;
    return 0.5;
  }

  /**
   * Helper: 计算平均值
   */
  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * 第1步：获取用户的progression settings
   * 如果不存在，创建默认settings
   */
  async getOrCreateSettings(userId) {
    try {
      let { data: settings, error } = await this.getSupabase()
        .from('progression_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // 不存在，创建默认settings
        const { data: newSettings, error: insertError } = await this.getSupabase()
          .from('progression_settings')
          .insert({
            user_id: userId,
            mode: 'balanced',
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

        if (insertError) throw insertError;
        settings = newSettings;
      } else if (error) {
        throw error;
      }

      return settings;
    } catch (error) {
      console.error('[ProgressionAnalysis] Settings error:', error);
      throw error;
    }
  }
}

module.exports = new ProgressionAnalysisService();
