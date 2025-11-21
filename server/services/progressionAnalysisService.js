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
   * 第1步：从workout_history提取并保存exercise_history
   * 这个函数会分析最近的训练记录并保存到exercise_history表
   * 如果workout_history为空，会尝试从workout_sessions和exercise_sets读取
   */
  async syncExerciseHistory(userId, lookbackDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      // 首先尝试从workout_history获取数据 (with retry logic)
      let workoutHistory = null;
      const { data: historyData, error: historyError} = await this.retryQuery(() =>
        this.getSupabase()
          .from('workout_history')
          .select('id, exercises_data, completed_at, session_id')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .gte('completed_at', cutoffDate.toISOString())
          .order('completed_at', { ascending: false })
      );

      if (!historyError && historyData && historyData.length > 0) {
        workoutHistory = historyData;
        console.log('[ProgressionAnalysis] Found', workoutHistory.length, 'workout history records');
      } else {
        // Fallback: 从workout_sessions和exercise_sets读取数据
        console.log('[ProgressionAnalysis] No workout_history found, trying workout_sessions...');
        
        // Note: workout_sessions doesn't have user_id, we need to join with workout_plans
        // First, get all workout_plans for this user
        const { data: userPlans, error: plansError } = await this.retryQuery(() =>
          this.getSupabase()
            .from('workout_plans')
            .select('id')
            .eq('user_id', userId)
        );

        if (plansError) {
          console.warn('[ProgressionAnalysis] Error fetching workout_plans:', plansError);
        } else if (!userPlans || userPlans.length === 0) {
          console.log('[ProgressionAnalysis] No workout plans found for user:', userId);
        } else {
          const planIds = userPlans.map(p => p.id);
          console.log('[ProgressionAnalysis] Found', planIds.length, 'workout plans, fetching sessions...');
          
          const { data: sessions, error: sessionsError } = await this.retryQuery(() =>
            this.getSupabase()
              .from('workout_sessions')
              .select('id, completed_at, status, plan_id')
              .in('plan_id', planIds)
              .eq('status', 'completed')
              .not('completed_at', 'is', null)
              .gte('completed_at', cutoffDate.toISOString())
              .order('completed_at', { ascending: false })
          );

          if (sessionsError) {
            console.warn('[ProgressionAnalysis] Error fetching workout_sessions:', sessionsError);
          } else if (sessions && sessions.length > 0) {
          console.log('[ProgressionAnalysis] Found', sessions.length, 'completed workout sessions');
          
          // 为每个session构建exercises_data
          workoutHistory = [];
          for (const session of sessions) {
            // 获取该session的所有exercise_sets
            const { data: exerciseSets, error: setsError } = await this.retryQuery(() =>
              this.getSupabase()
                .from('exercise_sets')
                .select('id, exercise_id, exercise_name, order_in_session')
                .eq('session_id', session.id)
                .order('order_in_session')
            );

            if (setsError) {
              console.warn('[ProgressionAnalysis] Error fetching exercise_sets for session', session.id, ':', setsError);
              continue;
            }
            
            if (!exerciseSets || exerciseSets.length === 0) {
              console.log('[ProgressionAnalysis] No exercise_sets found for session', session.id);
              continue;
            }
            
            console.log('[ProgressionAnalysis] Found', exerciseSets.length, 'exercise_sets for session', session.id);

            // 获取所有exercise_logs
            const setIds = exerciseSets.map(s => s.id);
            if (setIds.length === 0) {
              console.log('[ProgressionAnalysis] No set IDs to fetch logs for');
              continue;
            }
            
            const { data: exerciseLogs, error: logsError } = await this.retryQuery(() =>
              this.getSupabase()
                .from('exercise_logs')
                .select('set_id, actual_reps, actual_weight, actual_rpe, completed_at')
                .in('set_id', setIds)
            );

            if (logsError) {
              console.warn('[ProgressionAnalysis] Error fetching exercise_logs:', logsError);
              continue;
            }
            
            console.log('[ProgressionAnalysis] Found', exerciseLogs?.length || 0, 'exercise_logs for', setIds.length, 'sets');

            // 按exercise分组
            const exercisesMap = new Map();
            exerciseSets.forEach(set => {
              if (!exercisesMap.has(set.exercise_id)) {
                exercisesMap.set(set.exercise_id, {
                  exercise_id: set.exercise_id,
                  exercise_name: set.exercise_name || 'Unknown Exercise',
                  logs: []
                });
              }
            });

            // 添加logs到对应的exercise
            if (exerciseLogs) {
              exerciseLogs.forEach(log => {
                const set = exerciseSets.find(s => s.id === log.set_id);
                if (set && exercisesMap.has(set.exercise_id)) {
                  exercisesMap.get(set.exercise_id).logs.push({
                    actual_reps: log.actual_reps || 0,
                    actual_weight: log.actual_weight || 0,
                    actual_rpe: log.actual_rpe || null,
                    reps: log.actual_reps || 0,
                    weight: log.actual_weight || 0,
                    rpe: log.actual_rpe || null,
                    completed: true
                  });
                }
              });
            }

            // 转换为exercises_data格式
            const exercisesData = Array.from(exercisesMap.values()).filter(ex => ex.logs.length > 0);
            
            console.log('[ProgressionAnalysis] Session', session.id, 'has', exercisesData.length, 'exercises with logs');
            
            if (exercisesData.length > 0) {
              workoutHistory.push({
                id: session.id,
                session_id: session.id,
                completed_at: session.completed_at,
                exercises_data: exercisesData
              });
              console.log('[ProgressionAnalysis] Added workout record for session', session.id, 'with', exercisesData.length, 'exercises');
            } else {
              console.log('[ProgressionAnalysis] Skipping session', session.id, '- no exercises with logs');
            }
          }

          console.log('[ProgressionAnalysis] Built', workoutHistory.length, 'workout records from sessions');
          } else {
            console.log('[ProgressionAnalysis] No completed sessions found in workout_sessions');
          }
        }
      }

      if (!workoutHistory || workoutHistory.length === 0) {
        console.log('[ProgressionAnalysis] No workout data found for user:', userId);
        return { synced: 0, message: 'No completed workouts found' };
      }

      console.log('[ProgressionAnalysis] Processing', workoutHistory.length, 'workout records');
      if (workoutHistory.length > 0) {
        console.log('[ProgressionAnalysis] Sample workout data:', JSON.stringify(workoutHistory[0], null, 2));
      }

      let syncedCount = 0;

      // 第2步：遍历每个workout history记录，提取exercise数据
      for (const workout of workoutHistory) {
        const exercisesData = workout.exercises_data;
        
        // Skip if no exercises_data
        if (!exercisesData || !Array.isArray(exercisesData)) {
          console.log('[ProgressionAnalysis] Skipping workout with no exercises_data:', workout.id);
          continue;
        }
        
        for (const exercise of exercisesData) {
          // Handle different data formats
          let sets = [];
          
          // Format 1: exercise.sets is an array of set objects (regular workouts)
          if (exercise.sets && Array.isArray(exercise.sets)) {
            sets = exercise.sets.map(set => ({
              reps: set.reps || 0,
              weight: set.weight || 0,
              rpe: set.rpe || null,
              completed: set.completed !== false
            }));
          }
          // Format 2: exercise.logs is an array of log objects (custom workouts)
          else if (exercise.logs && Array.isArray(exercise.logs)) {
            sets = exercise.logs.map(log => ({
              reps: log.actual_reps || log.reps || 0,
              weight: log.actual_weight || log.weight || 0,
              rpe: log.actual_rpe || log.rpe || null,
              completed: true
            }));
          }
          // Format 3: exercise has reps/weights arrays (legacy format)
          else if (exercise.reps && Array.isArray(exercise.reps) && exercise.weights && Array.isArray(exercise.weights)) {
            sets = exercise.reps.map((reps, index) => ({
              reps: reps || 0,
              weight: exercise.weights[index] || 0,
              rpe: null,
              completed: true
            }));
          }
          
          // Skip if no sets
          if (sets.length === 0) {
            console.log('[ProgressionAnalysis] Skipping exercise with no sets/logs:', exercise.exercise_name || exercise.name, 'Format:', Object.keys(exercise));
            continue;
          }

          // Filter out incomplete sets (if they have a completed flag)
          const completedSets = sets.filter(s => s.completed !== false);

          if (completedSets.length === 0) {
            console.log('[ProgressionAnalysis] Skipping exercise with no completed sets:', exercise.exercise_name || exercise.name);
            continue;
          }

          // 第3步：计算exercise的汇总数据
          const totalVolume = completedSets.reduce((sum, set) => {
            const weight = set.weight || 0;
            const reps = set.reps || 0;
            return sum + (weight * reps);
          }, 0);

          const avgWeight = completedSets.reduce((sum, set) => sum + (set.weight || 0), 0) / completedSets.length;
          const avgReps = completedSets.reduce((sum, set) => sum + (set.reps || 0), 0) / completedSets.length;
          const avgRPE = completedSets.reduce((sum, set) => {
            const rpe = set.rpe || 0;
            return sum + rpe;
          }, 0) / completedSets.length;

          // 第4步：计算estimated 1RM (使用Epley公式)
          const estimated1RM = this.calculateOneRM(avgWeight, avgReps);

          // Get exercise name and ID
          const exerciseName = exercise.exercise_name || exercise.name || 'Unknown Exercise';
          const exerciseId = exercise.exercise_id || exercise.id || exerciseName;

          // 第5步：保存到exercise_history
          const exerciseHistoryData = {
            user_id: userId,
            exercise_id: exerciseId,
            exercise_name: exerciseName,
            weight_kg: avgWeight,
            reps: Math.round(avgReps),
            sets: completedSets.length,
            volume_kg: totalVolume,
            one_rep_max_kg: estimated1RM,
            rpe: avgRPE > 0 ? Math.round(avgRPE * 10) / 10 : null,
            form_quality: exercise.formQuality || null,
            workout_session_id: workout.session_id || workout.id || null,
            performed_at: workout.completed_at,
          };

          console.log('[ProgressionAnalysis] Inserting exercise history:', exerciseName, exerciseHistoryData);

          // Try upsert first, fallback to insert if unique constraint doesn't exist
          const { error: insertError } = await this.getSupabase()
            .from('exercise_history')
            .upsert(exerciseHistoryData, {
              onConflict: 'user_id,exercise_id,performed_at',
              ignoreDuplicates: false
            });

          if (insertError) {
            // If upsert fails due to missing constraint, try insert
            if (insertError.message?.includes('unique constraint') || insertError.message?.includes('conflict')) {
              console.log('[ProgressionAnalysis] Upsert failed, trying insert instead:', insertError.message);
              const { error: insertError2 } = await this.getSupabase()
                .from('exercise_history')
                .insert(exerciseHistoryData);
              
              if (!insertError2) {
                syncedCount++;
                console.log('[ProgressionAnalysis] Successfully inserted exercise history:', exerciseName);
              } else {
                console.error('[ProgressionAnalysis] Error inserting exercise history (fallback):', insertError2);
              }
            } else {
              console.error('[ProgressionAnalysis] Error upserting exercise history:', insertError);
            }
          } else {
            syncedCount++;
            console.log('[ProgressionAnalysis] Successfully upserted exercise history:', exerciseName);
          }
        }
      }

      console.log('[ProgressionAnalysis] ========================================');
      console.log('[ProgressionAnalysis] SYNC SUMMARY:');
      console.log('[ProgressionAnalysis] - Workout records processed:', workoutHistory.length);
      console.log('[ProgressionAnalysis] - Exercise records synced:', syncedCount);
      console.log('[ProgressionAnalysis] ========================================');
      return { synced: syncedCount, message: `Synced ${syncedCount} exercise records from ${workoutHistory.length} workouts` };
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

      if (historyError) {
        console.error('[ProgressionAnalysis] Error fetching exercise_history:', historyError);
        throw historyError;
      }
      
      console.log('[ProgressionAnalysis] ========================================');
      console.log('[ProgressionAnalysis] EXERCISE HISTORY QUERY:');
      console.log('[ProgressionAnalysis] - Cutoff date:', cutoffDate.toISOString());
      console.log('[ProgressionAnalysis] - Records found:', history?.length || 0);
      if (history && history.length > 0) {
        const uniqueExercises = new Set(history.map(h => h.exercise_name));
        console.log('[ProgressionAnalysis] - Unique exercises:', uniqueExercises.size, Array.from(uniqueExercises));
      }
      console.log('[ProgressionAnalysis] ========================================');
      
      if (!history || history.length === 0) {
        console.warn('[ProgressionAnalysis] No exercise history found after sync');
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
          estimatedOneRM: records[0]?.one_rep_max_kg || records[0]?.estimated_one_rm || 0,
          volumeChange: 0,
          avgRPE: records[0]?.rpe || 0,
        },
        recordCount: records.length,
      };
    }

    // 第3步：计算趋势
    const recentRecords = records.slice(-5); // 最近5次
    const oldRecords = records.slice(0, Math.min(5, records.length - 5)); // 早期5次

    const recentAvg1RM = this.average(recentRecords.map(r => r.one_rep_max_kg || r.estimated_one_rm || 0));
    const oldAvg1RM = oldRecords.length > 0 ? this.average(oldRecords.map(r => r.one_rep_max_kg || r.estimated_one_rm || 0)) : recentAvg1RM;
    
    const recentAvgVolume = this.average(recentRecords.map(r => r.volume_kg || r.total_volume || 0));
    const oldAvgVolume = oldRecords.length > 0 ? this.average(oldRecords.map(r => r.volume_kg || r.total_volume || 0)) : recentAvgVolume;

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

        const firstAvg1RM = this.average(firstThird.map(r => r.one_rep_max_kg || r.estimated_one_rm || 0));
        const lastAvg1RM = this.average(lastThird.map(r => r.one_rep_max_kg || r.estimated_one_rm || 0));

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


