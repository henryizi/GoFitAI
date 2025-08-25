import { supabase } from './supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HabitScoreComponents {
  nutrition: {
    score: number;
    details: {
      foodLogged: boolean;
      macroCompliance: number;
      qualityScore: number;
    };
  };
  weight: {
    score: number;
    details: {
      weightLogged: boolean;
      streakBonus: number;
    };
  };
  workout: {
    score: number;
    details: {
      workoutCompleted: boolean;
      consistencyBonus: number;
    };
  };
  wellness: {
    score: number;
    details: {
      sleepLogged: boolean;
      stressLogged: boolean;
    };
  };
  total: number;
}

export class HabitScoreService {
  /**
   * Calculate comprehensive habit score for a specific date
   */
  static async calculateHabitScore(userId: string, date: string): Promise<HabitScoreComponents> {
    const [nutritionScore, weightScore, workoutScore, wellnessScore] = await Promise.all([
      this.calculateNutritionScore(userId, date),
      this.calculateWeightScore(userId, date),
      this.calculateWorkoutScore(userId, date),
      this.calculateWellnessScore(userId, date),
    ]);

    const total = Math.round(
      nutritionScore.score + weightScore.score + workoutScore.score + wellnessScore.score
    );

    return {
      nutrition: nutritionScore,
      weight: weightScore,
      workout: workoutScore,
      wellness: wellnessScore,
      total: Math.min(100, total), // Cap at 100
    };
  }

  /**
   * Calculate nutrition score (40 points max)
   * - Food logged: 15 points
   * - Macro compliance: 15 points  
   * - Quality score: 10 points
   */
  private static async calculateNutritionScore(userId: string, date: string) {
    try {
      // Get food entries from local storage
      const storageKey = `nutrition_log_${userId}_${date}`;
      const savedEntries = await AsyncStorage.getItem(storageKey);
      
      let foodLogged = false;
      let macroCompliance = 0;
      let qualityScore = 0;

      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        foodLogged = entries.length > 0;

        if (foodLogged) {
          // Calculate totals from entries
          let totalCalories = 0;
          let totalProtein = 0;
          let totalCarbs = 0;
          let totalFat = 0;
          let totalQuality = 0;

          entries.forEach((entry: any) => {
            totalCalories += entry.calories || 0;
            totalProtein += entry.protein_grams || 0;
            totalCarbs += entry.carbs_grams || 0;
            totalFat += entry.fat_grams || 0;

            // Calculate quality score for each entry
            const proteinG = Number(entry.protein_grams || 0);
            const carbsG = Number(entry.carbs_grams || 0);
            const fatG = Number(entry.fat_grams || 0);
            const calsFromMacros = proteinG * 4 + carbsG * 4 + fatG * 9;
            const entryCalories = Number(entry.calories || calsFromMacros || 0);
            const safeTotal = Math.max(entryCalories, 1);
            
            const proteinShare = Math.min((proteinG * 4) / safeTotal, 0.4) / 0.4;
            const fatShare = (fatG * 9) / safeTotal;
            const fatPenalty = Math.max(0, fatShare - 0.45) / 0.35;
            const entryScore = Math.max(0, Math.min(10, Math.round((proteinShare * 7 + (1 - fatPenalty) * 3))));
            
            totalQuality += entryScore;
          });

          // Get user's nutrition plan targets
          const { data: nutritionPlan } = await supabase
            .from('nutrition_plans')
            .select('daily_calories, protein_grams')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

          if (nutritionPlan) {
            const targetCalories = nutritionPlan.daily_calories || 2000;
            const targetProtein = nutritionPlan.protein_grams || 150;

            // Calculate compliance (how close to targets)
            const calorieCompliance = Math.max(0, 1 - Math.abs(totalCalories - targetCalories) / targetCalories);
            const proteinCompliance = Math.min(1, totalProtein / targetProtein);
            macroCompliance = (calorieCompliance + proteinCompliance) / 2;
          }

          // Average quality score
          qualityScore = entries.length > 0 ? totalQuality / entries.length / 10 : 0;
        }
      }

      const score = Math.round(
        (foodLogged ? 15 : 0) +
        (macroCompliance * 15) +
        (qualityScore * 10)
      );

      return {
        score,
        details: {
          foodLogged,
          macroCompliance: Math.round(macroCompliance * 100),
          qualityScore: Math.round(qualityScore * 100),
        },
      };
    } catch (error) {
      console.error('[HabitScoreService] Error calculating nutrition score:', error);
      return {
        score: 0,
        details: {
          foodLogged: false,
          macroCompliance: 0,
          qualityScore: 0,
        },
      };
    }
  }

  /**
   * Calculate weight tracking score (20 points max)
   * - Weight logged today: 15 points
   * - Streak bonus: 5 points (for 7+ day streak)
   */
  private static async calculateWeightScore(userId: string, date: string) {
    try {
      // Check if weight was logged today
      const { data: todayMetric } = await supabase
        .from('daily_user_metrics')
        .select('weight_kg')
        .eq('user_id', userId)
        .eq('metric_date', date)
        .single();

      const weightLogged = !!(todayMetric?.weight_kg);

      // Calculate streak for bonus
      const { data: recentMetrics } = await supabase
        .from('daily_user_metrics')
        .select('metric_date, weight_kg')
        .eq('user_id', userId)
        .not('weight_kg', 'is', null)
        .order('metric_date', { ascending: false })
        .limit(30);

      let streakDays = 0;
      if (recentMetrics) {
        const byDate = new Set(recentMetrics.map(m => m.metric_date));
        for (let i = 0; i < 30; i++) {
          const d = new Date(date);
          d.setDate(d.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${day}`;
          if (byDate.has(key)) streakDays += 1; else break;
        }
      }

      const streakBonus = streakDays >= 7 ? 5 : 0;
      const score = (weightLogged ? 15 : 0) + streakBonus;

      return {
        score,
        details: {
          weightLogged,
          streakBonus,
        },
      };
    } catch (error) {
      console.error('[HabitScoreService] Error calculating weight score:', error);
      return {
        score: 0,
        details: {
          weightLogged: false,
          streakBonus: 0,
        },
      };
    }
  }

  /**
   * Calculate workout score (30 points max)
   * - Workout completed: 25 points
   * - Consistency bonus: 5 points (for 3+ workouts this week)
   */
  private static async calculateWorkoutScore(userId: string, date: string) {
    try {
      // Check if any workout was completed today
      const { data: todayWorkouts } = await supabase
        .from('workout_sessions')
        .select('id, status')
        .eq('user_id', userId)
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`);

      const workoutCompleted = todayWorkouts?.some(w => w.status === 'completed') || false;

      // Calculate weekly consistency (last 7 days)
      const weekAgo = new Date(date);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data: weeklyWorkouts } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', `${weekAgoStr}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`);

      const weeklyCount = weeklyWorkouts?.length || 0;
      const consistencyBonus = weeklyCount >= 3 ? 5 : 0;

      const score = (workoutCompleted ? 25 : 0) + consistencyBonus;

      return {
        score,
        details: {
          workoutCompleted,
          consistencyBonus,
        },
      };
    } catch (error) {
      console.error('[HabitScoreService] Error calculating workout score:', error);
      return {
        score: 0,
        details: {
          workoutCompleted: false,
          consistencyBonus: 0,
        },
      };
    }
  }

  /**
   * Calculate wellness score (10 points max)
   * - Sleep logged: 5 points
   * - Stress logged: 5 points
   */
  private static async calculateWellnessScore(userId: string, date: string) {
    try {
      const { data: todayMetric } = await supabase
        .from('daily_user_metrics')
        .select('sleep_hours, stress_level')
        .eq('user_id', userId)
        .eq('metric_date', date)
        .single();

      const sleepLogged = !!(todayMetric?.sleep_hours);
      const stressLogged = !!(todayMetric?.stress_level);

      const score = (sleepLogged ? 5 : 0) + (stressLogged ? 5 : 0);

      return {
        score,
        details: {
          sleepLogged,
          stressLogged,
        },
      };
    } catch (error) {
      console.error('[HabitScoreService] Error calculating wellness score:', error);
      return {
        score: 0,
        details: {
          sleepLogged: false,
          stressLogged: false,
        },
      };
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  static getTodayDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate and store habit score for a specific date
   */
  static async calculateAndStoreHabitScore(userId: string, date: string): Promise<number> {
    try {
      const habitScore = await this.calculateHabitScore(userId, date);
      
      // Store the habit score in daily_user_metrics
      const { error } = await supabase
        .from('daily_user_metrics')
        .upsert({
          user_id: userId,
          metric_date: date,
          habit_score: habitScore.total,
        }, {
          onConflict: 'user_id, metric_date'
        });

      if (error) {
        // If it's a column not found error, warn but don't crash the app
        if (error.code === 'PGRST204' && error.message.includes('habit_score')) {
          console.warn('[HabitScoreService] habit_score column not found - please run database migration. Score calculated but not stored.');
          console.warn('Run this SQL in Supabase: ALTER TABLE public.daily_user_metrics ADD COLUMN IF NOT EXISTS habit_score INTEGER CHECK (habit_score >= 0 AND habit_score <= 100);');
        } else {
          console.error('[HabitScoreService] Error storing habit score:', error);
        }
      }

      return habitScore.total;
    } catch (error) {
      console.error('[HabitScoreService] Error calculating and storing habit score:', error);
      return 0;
    }
  }

  /**
   * Get stored habit score for a specific date
   */
  static async getStoredHabitScore(userId: string, date: string): Promise<number | null> {
    try {
      const { data } = await supabase
        .from('daily_user_metrics')
        .select('habit_score')
        .eq('user_id', userId)
        .eq('metric_date', date)
        .single();

      return data?.habit_score || null;
    } catch (error) {
      console.error('[HabitScoreService] Error getting stored habit score:', error);
      return null;
    }
  }
}
