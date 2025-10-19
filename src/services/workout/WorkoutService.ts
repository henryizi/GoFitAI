import { WorkoutHistoryService } from './WorkoutHistoryService';
import { ExerciseService } from './ExerciseService';
import { WorkoutLocalStore } from './WorkoutLocalStore';
import { GeminiService } from '../ai/GeminiService';
import { supabase } from '../supabase/client';

// Re-export all workout-related services for convenience
export { WorkoutHistoryService } from './WorkoutHistoryService';
export { ExerciseService } from './ExerciseService';
export { ExerciseVarietyService } from './ExerciseVarietyService';
export { WorkoutLocalStore } from './WorkoutLocalStore';

interface StoredWorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  status?: 'active' | 'archived' | 'completed';
  weekly_schedule?: any[];
  weeklySchedule?: any[];
  created_at: string;
  updated_at: string;
}

// Main WorkoutService class that combines functionality
export class WorkoutService {
  static history = WorkoutHistoryService;
  static exercises = ExerciseService;

  private static loadedPlans: StoredWorkoutPlan[] = [];

  /**
   * Initialize workout data from local storage
   */
  static async initializeFromStorage() {
    try {
      console.log('[WorkoutService] Initializing workout data from storage');

      // Get all plans from storage
      const allPlans = await WorkoutLocalStore.getAllPlans();
      this.loadedPlans = allPlans;

      console.log(`[WorkoutService] Loaded ${allPlans.length} workout plans from storage`);

      // Log details about active plans
      const activePlans = allPlans.filter(p => p.is_active || p.status === 'active');
      console.log(`[WorkoutService] Found ${activePlans.length} active workout plans`);

      return allPlans;
    } catch (error) {
      console.error('[WorkoutService] Error initializing workout data from storage:', error);
      this.loadedPlans = [];
      throw error;
    }
  }

  /**
   * Utility method to check if a string is a valid UUID
   */
  static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Get the count of loaded workout plans
   */
  static getPlanCount(): number {
    return this.loadedPlans.length;
  }

  /**
   * Get all loaded workout plans
   */
  static getLoadedPlans(): StoredWorkoutPlan[] {
    return this.loadedPlans;
  }

  /**
   * Get active workout plans
   */
  static getActivePlans(): StoredWorkoutPlan[] {
    return this.loadedPlans.filter(p => p.is_active || p.status === 'active');
  }

  /**
   * Get the first active workout plan (single plan)
   */
  static async getActivePlan(userId: string): Promise<StoredWorkoutPlan | null> {
    const activePlans = this.getActivePlans();
    if (activePlans.length === 0) {
      return null;
    }

    // Return the first active plan
    return activePlans[0];
  }

  /**
   * Get all workout plans for a specific user
   */
  static async getPlansForUser(userId: string): Promise<StoredWorkoutPlan[]> {
    try {
      return await WorkoutLocalStore.getPlans(userId);
    } catch (error) {
      console.error('[WorkoutService] Error getting plans for user:', error);
      return [];
    }
  }

  /**
   * Get the count of workout plans for a specific user
   */
  static async getPlanCountForUser(userId: string): Promise<number> {
    try {
      const userPlans = await WorkoutLocalStore.getPlans(userId);
      return userPlans.length;
    } catch (error) {
      console.error('[WorkoutService] Error getting plan count for user:', error);
      return 0;
    }
  }

  /**
   * Set a specific plan as active for a user
   */
  static async setActivePlan(userId: string, planId: string): Promise<boolean> {
    try {
      console.log(`[WorkoutService] Setting plan ${planId} as active for user ${userId}`);

      // Get current plans for the user
      const userPlans = await WorkoutLocalStore.getPlans(userId);

      // Find the plan to activate
      const planToActivate = userPlans.find(p => p.id === planId);
      if (!planToActivate) {
        console.error(`[WorkoutService] Plan ${planId} not found for user ${userId}`);
        return false;
      }

      // Deactivate all other plans
      userPlans.forEach(plan => {
        if (plan.id === planId) {
          plan.is_active = true;
          plan.status = 'active';
        } else {
          plan.is_active = false;
          plan.status = 'archived';
        }
      });

      // Save the updated plans
      await WorkoutLocalStore.savePlans(userId, userPlans);

      console.log(`[WorkoutService] Successfully set plan ${planId} as active`);
      return true;
    } catch (error) {
      console.error('[WorkoutService] Error setting active plan:', error);
      return false;
    }
  }

  /**
   * Create an AI-powered workout plan
   */
  static async createAIPlan(params: {
    userId: string;
    height: number;
    weight: number;
    age: number;
    gender: 'male' | 'female';
    fullName: string;
    trainingLevel: 'beginner' | 'intermediate' | 'advanced';
    primaryGoal: string;
    fatLossGoal: number;
    muscleGainGoal: number;
    workoutFrequency?: string;
    emulateBodybuilder?: string;
  }): Promise<any> {
    try {
      console.log('[WorkoutService] Creating AI plan with params:', params);

      // Fetch the complete user profile from Supabase to get onboarding data
      console.log('[WorkoutService] Fetching complete user profile from Supabase...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.userId)
        .single();

      if (profileError) {
        console.warn('[WorkoutService] Could not fetch complete profile, continuing with provided params:', profileError);
      } else {
        console.log('[WorkoutService] Successfully fetched user profile with onboarding data');
      }

      // Use the fetched profile data if available, otherwise fall back to params
      const profile = profileData || {};

      // Convert parameters to the format expected by GeminiService
      const geminiInput = {
        fullName: params.fullName,
        height: params.height,
        weight: params.weight,
        age: params.age,
        gender: params.gender,
        fatLossGoal: params.fatLossGoal,
        muscleGainGoal: params.muscleGainGoal,
        trainingLevel: params.trainingLevel,
        primaryGoal: params.primaryGoal || profile.primary_goal || 'general_fitness',
        emulateBodybuilder: params.emulateBodybuilder,
        workoutFrequency: params.workoutFrequency || profile.workout_frequency || '4_5',
        exerciseFrequency: profile.exercise_frequency,
        activityLevel: profile.activity_level,
        bodyFat: profile.body_fat,
        weightTrend: profile.weight_trend,
        bodyAnalysis: profile.body_analysis ? {
          chest_rating: profile.body_analysis.chest_rating,
          arms_rating: profile.body_analysis.arms_rating,
          back_rating: profile.body_analysis.back_rating,
          legs_rating: profile.body_analysis.legs_rating,
          waist_rating: profile.body_analysis.waist_rating,
          overall_rating: profile.body_analysis.overall_rating,
          strongest_body_part: profile.body_analysis.strongest_body_part,
          weakest_body_part: profile.body_analysis.weakest_body_part,
          ai_feedback: profile.body_analysis.ai_feedback,
        } : undefined
      };

      console.log('[WorkoutService] Complete GeminiService input with onboarding data:', {
        ...geminiInput,
        // Don't log sensitive data like body analysis for privacy
        hasExerciseFrequency: !!geminiInput.exerciseFrequency,
        hasActivityLevel: !!geminiInput.activityLevel,
        hasBodyFat: !!geminiInput.bodyFat,
        hasWeightTrend: !!geminiInput.weightTrend,
        hasBodyAnalysis: !!geminiInput.bodyAnalysis
      });

      // Generate the workout plan using GeminiService (with static bodybuilder data)
      const plan = await GeminiService.generateWorkoutPlan(geminiInput);

      if (!plan) {
        throw new Error('Failed to generate workout plan');
      }

      console.log('[WorkoutService] Generated plan successfully:', plan.name);
      console.log('[WorkoutService] 🔍 Plan structure check:', {
        hasWeeklySchedule: !!plan.weeklySchedule,
        hasWeeklyScheduleSnake: !!plan.weekly_schedule,
        weeklyScheduleLength: plan.weeklySchedule?.length || plan.weekly_schedule?.length || 0,
        weeklyScheduleType: Array.isArray(plan.weeklySchedule) ? 'array' : typeof plan.weeklySchedule,
        firstDayHasExercises: plan.weeklySchedule?.[0]?.exercises?.length || plan.weekly_schedule?.[0]?.exercises?.length || 0
      });

      // Generate a unique plan ID
      const planId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create the stored plan object - handle both new database structure and old structure
      const storedPlan: StoredWorkoutPlan = {
        id: plan.id || planId, // Use database ID if available, otherwise generate one
        user_id: params.userId,
        name: plan.name || plan.plan_name || `${params.primaryGoal} Workout Plan`,
        is_active: plan.is_active || false,
        status: plan.status || 'active',
        weekly_schedule: plan.weeklySchedule || plan.weekly_schedule,
        weeklySchedule: plan.weeklySchedule || plan.weekly_schedule,
        created_at: plan.created_at || new Date().toISOString(),
        updated_at: plan.updated_at || new Date().toISOString(),
        // Include additional database fields for compatibility
        training_level: plan.training_level,
        goal_fat_loss: plan.goal_fat_loss,
        goal_muscle_gain: plan.goal_muscle_gain,
        mesocycle_length_weeks: plan.mesocycle_length_weeks,
        estimated_time_per_session: plan.estimated_time_per_session,
        primary_goal: plan.primary_goal,
        workout_frequency: plan.workout_frequency
      };
      
      console.log('[WorkoutService] 🔍 Stored plan structure check:', {
        hasWeeklySchedule: !!storedPlan.weeklySchedule,
        hasWeeklyScheduleSnake: !!storedPlan.weekly_schedule,
        weeklyScheduleLength: storedPlan.weeklySchedule?.length || storedPlan.weekly_schedule?.length || 0,
        firstDayInStored: storedPlan.weeklySchedule?.[0] || storedPlan.weekly_schedule?.[0],
        firstDayExercises: storedPlan.weeklySchedule?.[0]?.exercises || storedPlan.weekly_schedule?.[0]?.exercises,
        fullFirstDay: JSON.stringify(storedPlan.weeklySchedule?.[0] || storedPlan.weekly_schedule?.[0])
      });
      console.log('[WorkoutService] 🔍 FULL STORED PLAN WEEKLY_SCHEDULE:', JSON.stringify(storedPlan.weeklySchedule || storedPlan.weekly_schedule, null, 2));

      // Save to local storage for offline access
      await WorkoutLocalStore.savePlan(params.userId, storedPlan);

      // Reload plans to include the new one
      await this.initializeFromStorage();

      console.log('[WorkoutService] AI plan created and saved successfully with ID:', storedPlan.id);
      return storedPlan;

    } catch (error) {
      console.error('[WorkoutService] Error creating AI plan:', error);
      throw error;
    }
  }


  /**
   * Delete a workout plan
   */
  static async deletePlan(planId: string): Promise<boolean> {
    try {
      console.log(`[WorkoutService] Deleting plan ${planId}`);

      // Get all plans from storage
      const allPlans = await WorkoutLocalStore.getAllPlans();

      // Find and remove the plan
      const updatedPlans = allPlans.filter(p => p.id !== planId);

      if (updatedPlans.length === allPlans.length) {
        console.warn(`[WorkoutService] Plan ${planId} not found for deletion`);
        return false;
      }

      // Save updated plans
      await WorkoutLocalStore.saveAllPlans(updatedPlans);

      // Reload plans
      await this.initializeFromStorage();

      console.log(`[WorkoutService] Plan ${planId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('[WorkoutService] Error deleting plan:', error);
      return false;
    }
  }

  /**
   * Get a plan by ID
   */
  static async getPlanById(planId: string): Promise<StoredWorkoutPlan | null> {
    try {
      const allPlans = await WorkoutLocalStore.getAllPlans();
      return allPlans.find(p => p.id === planId) || null;
    } catch (error) {
      console.error('[WorkoutService] Error getting plan by ID:', error);
      return null;
    }
  }

  /**
   * Get workout sessions for a specific plan
   */
  static async getSessionsForPlan(planId: string): Promise<any[]> {
    try {
      // This would typically come from workout history or sessions storage
      // For now, return empty array as sessions are not stored in the current implementation
      console.log(`[WorkoutService] Getting sessions for plan ${planId}`);
      return [];
    } catch (error) {
      console.error('[WorkoutService] Error getting sessions for plan:', error);
      return [];
    }
  }

  /**
   * Get exercise sets for a specific session
   */
  static async getExerciseSetsForSession(sessionId: string): Promise<any[]> {
    try {
      console.log(`[WorkoutService] Getting exercise sets for session ${sessionId}`);
      
      const { data: sets, error: setsError } = await supabase
        .from('exercise_sets')
        .select(`
          id, 
          exercise_id, 
          target_sets, 
          target_reps, 
          rest_period,
          order_in_session, 
          exercises:exercise_id(name, category, muscle_groups)
        `)
        .eq('session_id', sessionId)
        .order('order_in_session');
        
      if (setsError) {
        console.error('[WorkoutService] Error fetching exercise sets:', setsError);
        return [];
      }
      
      console.log(`[WorkoutService] Found ${sets?.length || 0} exercise sets for session ${sessionId}`);
      
      if (!sets || sets.length === 0) {
        return [];
      }
      
      // Transform the data to match the expected format
      return sets.map((set: any) => ({
        id: set.id,
        exercise: {
          name: set.exercises?.name || 'Exercise',
          category: set.exercises?.category || 'compound',
          muscle_groups: set.exercises?.muscle_groups || []
        },
        target_sets: set.target_sets || 3,
        target_reps: set.target_reps || '8-12',
        rest_period: set.rest_period || '60s'
      }));
    } catch (error) {
      console.error('[WorkoutService] Error getting exercise sets for session:', error);
      return [];
    }
  }

  /**
   * Create a custom workout plan
   */
  static async createCustomPlan({
    userId,
    name,
    description,
    workoutDays,
    trainingLevel,
    primaryGoal,
    daysPerWeek,
    sessionTime
  }: {
    userId: string;
    name: string;
    description?: string;
    workoutDays: any[];
    trainingLevel: string;
    primaryGoal: string;
    daysPerWeek: number;
    sessionTime: number;
  }): Promise<any> {
    try {
      console.log('[WorkoutService] Creating custom workout plan:', { userId, name, trainingLevel, primaryGoal });

      // Create the workout plan structure
      const customPlan = {
        id: `custom-${Date.now()}`,
        user_id: userId,
        name: name,
        description: description || '',
        training_level: trainingLevel,
        primary_goal: primaryGoal,
        days_per_week: daysPerWeek,
        estimated_time_per_session: `${sessionTime} min`,
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mesocycle_length_weeks: 4,
        weeklySchedule: workoutDays.map(day => ({
          day: day.day,
          focus: day.focus || `${day.day} Workout`,
          exercises: day.exercises.map((workoutExercise: any) => ({
            name: workoutExercise.exercise.name,
            sets: workoutExercise.sets,
            reps: workoutExercise.reps,
            rest: workoutExercise.rest,
            description: workoutExercise.exercise.description || '',
            category: workoutExercise.exercise.category || 'compound',
            difficulty: workoutExercise.exercise.difficulty || 'intermediate',
            muscle_groups: workoutExercise.exercise.muscle_groups || []
          }))
        })),
        image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2000&auto=format&fit=crop'
      };

      // Save to local storage
      await WorkoutLocalStore.addPlan(userId, customPlan);

      // Add to loaded plans
      this.loadedPlans.push(customPlan);

      // Set as active plan
      await this.setActivePlan(userId, customPlan.id);

      console.log('[WorkoutService] Custom workout plan created successfully:', customPlan.id);
      return customPlan;
    } catch (error) {
      console.error('[WorkoutService] Error creating custom plan:', error);
      throw error;
    }
  }

  /**
   * Clear all workout plans from storage
   */
  static async clearAllWorkoutPlans(): Promise<boolean> {
    try {
      console.log('[WorkoutService] Clearing all workout plans');

      // Clear all plans from storage
      await WorkoutLocalStore.clearAllPlans();

      // Clear loaded plans
      this.loadedPlans = [];

      console.log('[WorkoutService] All workout plans cleared successfully');
      return true;
    } catch (error) {
      console.error('[WorkoutService] Error clearing workout plans:', error);
      return false;
    }
  }

  /**
   * Find or create an exercise by name
   */
  static async findOrCreateExercise(planId: string, exerciseName: string): Promise<any> {
    try {
      // First, try to find existing exercise
      const { data: existingExercise, error: findError } = await supabase
        .from('exercises')
        .select('*')
        .eq('name', exerciseName)
        .single();

      if (existingExercise && !findError) {
        return existingExercise;
      }

      // If not found, create a new custom exercise
      const { data: newExercise, error: createError } = await supabase
        .from('exercises')
        .insert({
          name: exerciseName,
          is_custom: true,
          plan_id: planId || null,
          category: 'compound',
          muscle_groups: [],
          difficulty: 'intermediate',
          equipment_needed: [],
          description: `Custom exercise: ${exerciseName}`,
          form_tips: [],
          rpe_recommendation: null,
          animation_url: null
        })
        .select()
        .single();

      if (createError) throw createError;
      return newExercise;
    } catch (error) {
      console.error('[WorkoutService] Error finding/creating exercise:', error);
      return null;
    }
  }

  /**
   * Batch update exercise sets
   */
  static async batchUpdateExerciseSets(updates: any[]): Promise<boolean> {
    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('exercise_sets')
          .update({
            exercise_id: update.exerciseId,
            target_reps: update.targetReps,
            target_weight: update.targetWeight,
            rest_seconds: update.restSeconds
          })
          .eq('id', update.setId);

        if (error) {
          console.error('[WorkoutService] Error updating set:', error);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('[WorkoutService] Error batch updating exercise sets:', error);
      return false;
    }
  }

  /**
   * Add exercise to workout session
   */
  static async addExerciseToSession(
    sessionId: string,
    exerciseName: string,
    sets: number = 3,
    reps: number = 10,
    weight: number = 0
  ): Promise<boolean> {
    try {
      // Find or create the exercise
      const exercise = await this.findOrCreateExercise('', exerciseName);
      if (!exercise) {
        throw new Error('Could not find or create exercise');
      }

      // Add exercise sets to the session
      const exerciseSets = [];
      for (let i = 1; i <= sets; i++) {
        exerciseSets.push({
          session_id: sessionId,
          exercise_id: exercise.id,
          set_number: i,
          target_reps: reps,
          target_weight: weight,
          rest_seconds: 60,
          completed: false
        });
      }

      const { error } = await supabase
        .from('exercise_sets')
        .insert(exerciseSets);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[WorkoutService] Error adding exercise to session:', error);
      return false;
    }
  }
}
