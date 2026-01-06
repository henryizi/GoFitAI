import Constants from 'expo-constants';
import {
  SUPPORTED_EXERCISES,
  getExerciseNamesForPrompt,
  getExercisesByEquipment,
  isSupportedExercise,
  getExerciseInfo,
  ExerciseInfo
} from '../../constants/exerciseNames';
// import { generateWeeklyWorkoutPrompt } from './exercisePrompts';
import { bodybuilderWorkouts, BodybuilderWorkout } from '../../data/bodybuilder-workouts';
import { WorkoutPlan as AppWorkoutPlan, WorkoutDay as AppWorkoutDay, ExerciseItem } from '../../types/chat';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutHistoryService } from './WorkoutHistoryService';
import { ExerciseService } from './ExerciseService';
import { WorkoutLocalStore } from './WorkoutLocalStore';
import { GeminiService } from '../ai/GeminiService';
import { supabase } from '../supabase/client';
import { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Validate if a string is a valid UUID
 */
function isValidUUID(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

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
  training_level?: string;
  goal_fat_loss?: number;
  goal_muscle_gain?: number;
  mesocycle_length_weeks?: number;
  estimated_time_per_session?: string;
  primary_goal?: string;
  workout_frequency?: string;
  ai_reasoning?: {
    split_reasoning?: string;
    exercise_selection_reasoning?: string;
  };
  source?: string;
}

// Main WorkoutService class that combines functionality
export class WorkoutService {
  static history = WorkoutHistoryService;
  static exercises = ExerciseService;

  private static loadedPlans: StoredWorkoutPlan[] = [];

  /**
   * Initialize workout data from local storage for a specific user
   */
  static async initializeFromStorage(userId?: string) {
    try {
      console.log('[WorkoutService] Initializing workout data from storage', userId ? `for user ${userId}` : '');

      if (userId) {
        // Get plans for specific user only
        const userPlans = await WorkoutLocalStore.getPlans(userId);
        this.loadedPlans = userPlans;
        console.log(`[WorkoutService] Loaded ${userPlans.length} workout plans for user ${userId}`);
        
        // Log details about active plans for this user
        const activePlans = userPlans.filter(p => p.is_active || p.status === 'active');
        console.log(`[WorkoutService] Found ${activePlans.length} active workout plans for user ${userId}`);
        
        return userPlans;
      } else {
        // Fallback: Get all plans from storage (for backward compatibility)
        const allPlans = await WorkoutLocalStore.getAllPlans();
        this.loadedPlans = allPlans;
        console.log(`[WorkoutService] Loaded ${allPlans.length} workout plans from storage (all users)`);
        
        // Log details about active plans
        const activePlans = allPlans.filter(p => p.is_active || p.status === 'active');
        console.log(`[WorkoutService] Found ${activePlans.length} active workout plans (all users)`);
        
        return allPlans;
      }
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
   * Get active workout plans for a specific user
   */
  static getActivePlans(userId?: string): StoredWorkoutPlan[] {
    let plans = this.loadedPlans.filter(p => p.is_active || p.status === 'active');
    
    // Filter by user ID if provided
    if (userId) {
      plans = plans.filter(p => p.user_id === userId);
    }
    
    return plans;
  }

  /**
   * Get the first active workout plan (single plan)
   */
  static async getActivePlan(userId: string): Promise<StoredWorkoutPlan | null> {
    try {
      // First try to get from Supabase database
      if (supabase) {
        const { data: plans, error } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!error && plans && plans.length > 0) {
          console.log('[WorkoutService] Found active plan in database:', plans[0].id);
          return plans[0] as StoredWorkoutPlan;
        }
      }
      
      // Look for stored active plan ID (handles locally created plans)
      const storedActivePlanId = await WorkoutLocalStore.getActivePlanId(userId);
      if (storedActivePlanId) {
        const localPlans = await WorkoutLocalStore.getPlans(userId);
        const storedPlan = localPlans.find(p => p.id === storedActivePlanId);
        if (storedPlan) {
          console.log(`[WorkoutService] Restored active plan ${storedActivePlanId} from local storage`);
          return storedPlan as StoredWorkoutPlan;
        }
      }

      // Fallback to any locally marked active plan
      const localPlans = await WorkoutLocalStore.getPlans(userId);
      if (localPlans && localPlans.length > 0) {
        const localActive = localPlans.find(p => p.is_active || p.status === 'active');
        if (localActive) {
          console.log(`[WorkoutService] Found active plan in local storage for user ${userId}:`, localActive.id);
          return localActive as StoredWorkoutPlan;
        }
      }

      // Fallback to in-memory cache
      const activePlans = this.getActivePlans(userId);
      if (activePlans.length > 0) {
        console.log(`[WorkoutService] Found active plan in memory for user ${userId}:`, activePlans[0].id);
      return activePlans[0];
      }

      console.log(`[WorkoutService] No active plans found for user ${userId}`);
      return null;
    } catch (error) {
      console.error('[WorkoutService] Error getting active plan:', error);
      return null;
    }
  }

  /**
   * Get all workout plans for a specific user
   */
  static async getPlansForUser(userId: string): Promise<StoredWorkoutPlan[]> {
    try {
      // First try to get from Supabase database
      if (supabase) {
        const { data: plans, error } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (!error && plans && plans.length > 0) {
          console.log('[WorkoutService] Found', plans.length, 'plans in database for user');
          return plans as StoredWorkoutPlan[];
        }
      }
      
      // Fallback to local storage
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

      // 1. Update Supabase directly to ensure persistence across sessions/devices
      if (supabase) {
        try {
          // First archive all plans for this user
          const { error: archiveError } = await supabase
            .from('workout_plans')
            .update({ status: 'archived', is_active: false })
            .eq('user_id', userId);

          if (archiveError) {
            console.error('[WorkoutService] Error archiving plans in Supabase:', archiveError);
          }

          // Then activate the selected plan
          const { error: activateError } = await supabase
            .from('workout_plans')
            .update({ status: 'active', is_active: true })
            .eq('id', planId)
            .eq('user_id', userId);

          if (activateError) {
            console.error('[WorkoutService] Error activating plan in Supabase:', activateError);
        } else {
            console.log('[WorkoutService] Successfully updated active plan in Supabase');
          }
        } catch (dbError) {
          console.error('[WorkoutService] Database error during setActivePlan:', dbError);
        }
      }

      // 2. Try to update via server API (legacy/backup)
      try {
        const serverUrl = Constants.expoConfig?.extra?.serverUrl || 'https://gofitai-production.up.railway.app';
        // ... existing API call code ...
      } catch (apiError) {
        // Ignore API errors as we handled it via Supabase directly above
      }

      // 3. Update local storage
      const userPlans = await WorkoutLocalStore.getPlans(userId);

      // Find the plan to activate
      const planToActivate = userPlans.find(p => p.id === planId);
      if (!planToActivate) {
        console.error(`[WorkoutService] Plan ${planId} not found for user ${userId}`);
        return false;
      }

      // Deactivate all other plans locally
      userPlans.forEach(plan => {
        if (plan.id === planId) {
          plan.is_active = true;
          plan.status = 'active';
        } else {
          plan.is_active = false;
          plan.status = 'archived';
        }
      });

      // Save the updated plans locally
      await WorkoutLocalStore.savePlans(userId, userPlans);
      await WorkoutLocalStore.setActivePlanId(userId, planId);

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
      const profile: Partial<Profile> = profileData || {};

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
        primaryGoal: (params.primaryGoal || profile.primary_goal || 'general_fitness') as 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain',
        emulateBodybuilder: params.emulateBodybuilder,
        workoutFrequency: params.workoutFrequency || profile.workout_frequency || '4_5',
        exerciseFrequency: profile.exercise_frequency,
        activityLevel: profile.activity_level,
        bodyFat: profile.body_fat,
        weightTrend: profile.weight_trend,
        bodyAnalysis: profile.body_analysis ? {
          chest_rating: (profile.body_analysis as any).chest_rating,
          arms_rating: (profile.body_analysis as any).arms_rating,
          back_rating: (profile.body_analysis as any).back_rating,
          legs_rating: (profile.body_analysis as any).legs_rating,
          waist_rating: (profile.body_analysis as any).waist_rating,
          overall_rating: (profile.body_analysis as any).overall_rating,
          strongest_body_part: (profile.body_analysis as any).strongest_body_part,
          weakest_body_part: (profile.body_analysis as any).weakest_body_part,
          ai_feedback: (profile.body_analysis as any).ai_feedback,
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
      console.log('[WorkoutService] 🚀 Calling GeminiService.generateWorkoutPlan...');
      const plan = await GeminiService.generateWorkoutPlan(geminiInput);

      if (!plan) {
        throw new Error('Failed to generate workout plan');
      }

      console.log('[WorkoutService] ✅ Generated plan successfully:', plan.name);
      console.log('[WorkoutService] 🔍 Plan structure check:', {
        hasWeeklySchedule: !!plan.weeklySchedule,
        hasWeeklyScheduleSnake: !!plan.weekly_schedule,
        weeklyScheduleLength: plan.weeklySchedule?.length || plan.weekly_schedule?.length || 0,
        weeklyScheduleType: Array.isArray(plan.weeklySchedule) ? 'array' : typeof plan.weeklySchedule,
        firstDayHasExercises: plan.weeklySchedule?.[0]?.exercises?.length || plan.weekly_schedule?.[0]?.exercises?.length || 0
      });
      console.log('[WorkoutService] 🔍 AI Reasoning check (CRITICAL):', {
        hasAiReasoning: !!(plan as any).ai_reasoning,
        splitReasoning: !!(plan as any).ai_reasoning?.split_reasoning,
        exerciseReasoning: !!(plan as any).ai_reasoning?.exercise_selection_reasoning,
        splitReasoningPreview: (plan as any).ai_reasoning?.split_reasoning?.substring(0, 100) || 'N/A',
        exerciseReasoningPreview: (plan as any).ai_reasoning?.exercise_selection_reasoning?.substring(0, 100) || 'N/A',
        fullReasoning: (plan as any).ai_reasoning,
        reasoningType: typeof (plan as any).ai_reasoning,
        reasoningIsEmpty: (plan as any).ai_reasoning && 
          (!(plan as any).ai_reasoning.split_reasoning || !(plan as any).ai_reasoning.split_reasoning.trim()) &&
          (!(plan as any).ai_reasoning.exercise_selection_reasoning || !(plan as any).ai_reasoning.exercise_selection_reasoning.trim()),
        allPlanKeys: Object.keys(plan || {}).slice(0, 20)
      });
      
      // CRITICAL: If reasoning is missing, log a warning
      // Check if ai_reasoning exists but is undefined, null, or empty
      const hasAiReasoning = (plan as any).ai_reasoning !== undefined && 
                             (plan as any).ai_reasoning !== null &&
                             typeof (plan as any).ai_reasoning === 'object' &&
                             ((plan as any).ai_reasoning.split_reasoning || (plan as any).ai_reasoning.exercise_selection_reasoning);
      
      if (!hasAiReasoning) {
        // AI reasoning is optional for plans — warn and continue without it.
        console.warn('[WorkoutService] ⚠️ Plan has no AI reasoning; continuing without ai_reasoning field.');
      }

      // Generate a unique plan ID (always use as stored ID to ensure valid UUID)
      const planId = uuidv4();

      // Create the stored plan object - handle both new database structure and old structure
      const storedPlan: StoredWorkoutPlan = {
        id: planId, // Always use a valid UUID locally to avoid invalid UUID issues
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
        mesocycle_length_weeks: plan.mesocycle_length || plan.mesocycle_length_weeks,
        estimated_time_per_session: plan.estimated_time_per_session,
        primary_goal: plan.primary_goal,
        workout_frequency: plan.workout_frequency,
        // Preserve AI reasoning if available (will be validated and saved separately)
        // Only include if it has actual content
        ai_reasoning: (() => {
          const reasoning = (plan as any).ai_reasoning;
          if (!reasoning || reasoning === null || reasoning === undefined) return null;
          if (typeof reasoning === 'object' && Object.keys(reasoning).length === 0) return null;
          const hasContent = (reasoning.split_reasoning && reasoning.split_reasoning.trim()) || 
                           (reasoning.exercise_selection_reasoning && reasoning.exercise_selection_reasoning.trim());
          return hasContent ? reasoning : null;
        })()
      };
      
      console.log('[WorkoutService] 🔍 Stored plan structure check:', {
        hasWeeklySchedule: !!storedPlan.weeklySchedule,
        hasWeeklyScheduleSnake: !!storedPlan.weekly_schedule,
        weeklyScheduleLength: storedPlan.weeklySchedule?.length || storedPlan.weekly_schedule?.length || 0,
        firstDayInStored: storedPlan.weeklySchedule?.[0] || storedPlan.weekly_schedule?.[0],
        firstDayExercises: storedPlan.weeklySchedule?.[0]?.exercises || storedPlan.weekly_schedule?.[0]?.exercises,
        fullFirstDay: JSON.stringify(storedPlan.weeklySchedule?.[0] || storedPlan.weekly_schedule?.[0])
      });
      console.log('[WorkoutService] 🔍 Stored plan AI Reasoning check:', {
        hasAiReasoning: !!storedPlan.ai_reasoning,
        splitReasoning: !!storedPlan.ai_reasoning?.split_reasoning,
        exerciseReasoning: !!storedPlan.ai_reasoning?.exercise_selection_reasoning
      });
      console.log('[WorkoutService] 🔍 FULL STORED PLAN WEEKLY_SCHEDULE:', JSON.stringify(storedPlan.weeklySchedule || storedPlan.weekly_schedule, null, 2));

      // Save to Supabase database first for persistence across devices
      try {
        console.log('[WorkoutService] Saving workout plan to Supabase database...');
        
        // Archive existing active plans first
        const { error: archiveError } = await supabase
          .from('workout_plans')
          .update({ status: 'archived', is_active: false })
          .eq('user_id', params.userId)
          .eq('status', 'active');
        
        if (archiveError) {
          console.warn('[WorkoutService] Warning: Could not archive existing plans:', archiveError.message);
        }
        
        // Insert new plan into database
        const dbPlan: any = {
          id: storedPlan.id,
          user_id: params.userId,
          name: storedPlan.name,
          status: 'active',
          training_level: storedPlan.training_level || params.trainingLevel,
          primary_goal: storedPlan.primary_goal || params.primaryGoal,
          days_per_week: storedPlan.workout_frequency ? parseInt(storedPlan.workout_frequency.split('_')[0]) : 4,
          estimated_time_per_session: storedPlan.estimated_time_per_session || '45-60 minutes',
          is_active: true,
          mesocycle_length_weeks: storedPlan.mesocycle_length_weeks || 4,
          goal_fat_loss: storedPlan.goal_fat_loss || params.fatLossGoal,
          goal_muscle_gain: storedPlan.goal_muscle_gain || params.muscleGainGoal,
          created_at: storedPlan.created_at,
          updated_at: storedPlan.updated_at,
          description: `AI-generated ${params.primaryGoal} workout plan`,
          weekly_schedule: storedPlan.weeklySchedule || storedPlan.weekly_schedule,
          // Add volume_landmarks if required by schema (using default or empty values)
          volume_landmarks: (plan as any).volume_landmarks || { 
            chest: 'MV', back: 'MV', quads: 'MV', hamstrings: 'MV', 
            glutes: 'MV', shoulders: 'MV', triceps: 'MV', biceps: 'MV', 
            calves: 'MV', abs: 'MV' 
          }
        };
        
        // Preserve AI reasoning if available (as JSONB)
        // Always set ai_reasoning, even if null, to ensure the column is updated
        const aiReasoningToSave = (plan as any)?.ai_reasoning || storedPlan.ai_reasoning;
        
        // Check if reasoning has actual content (not just empty strings)
        const hasValidReasoning = aiReasoningToSave && (
          (aiReasoningToSave.split_reasoning && aiReasoningToSave.split_reasoning.trim() && !aiReasoningToSave.split_reasoning.includes('YOUR ACTUAL REASONING')) ||
          (aiReasoningToSave.exercise_selection_reasoning && aiReasoningToSave.exercise_selection_reasoning.trim() && !aiReasoningToSave.exercise_selection_reasoning.includes('YOUR ACTUAL REASONING'))
        );
        
        if (hasValidReasoning) {
          dbPlan.ai_reasoning = aiReasoningToSave;
          console.log('[WorkoutService] ✅ Saving VALID AI reasoning to database:', {
            hasSplitReasoning: !!dbPlan.ai_reasoning?.split_reasoning,
            hasExerciseReasoning: !!dbPlan.ai_reasoning?.exercise_selection_reasoning,
            splitReasoningPreview: dbPlan.ai_reasoning?.split_reasoning?.substring(0, 50) || 'N/A',
            exerciseReasoningPreview: dbPlan.ai_reasoning?.exercise_selection_reasoning?.substring(0, 50) || 'N/A'
          });
        } else {
          // Set to null explicitly if no valid reasoning
          dbPlan.ai_reasoning = null;
          console.log('[WorkoutService] ⚠️ No valid AI reasoning to save. Setting ai_reasoning to null.', {
            hasAiReasoning: !!aiReasoningToSave,
            aiReasoningValue: aiReasoningToSave,
            splitReasoning: aiReasoningToSave?.split_reasoning,
            exerciseReasoning: aiReasoningToSave?.exercise_selection_reasoning,
            planHasAiReasoning: !!(plan as any)?.ai_reasoning,
            storedPlanHasAiReasoning: !!storedPlan.ai_reasoning
          });
        }
        
        const { data: savedPlan, error: insertError } = await supabase
          .from('workout_plans')
          .insert(dbPlan)
          .select()
          .single();
        
        if (insertError) {
          // Fallback: If is_active column is missing (schema mismatch), try inserting without it
          if (insertError.message.includes('is_active') || insertError.message.includes('column "is_active" of relation "workout_plans" does not exist')) {
            console.warn('[WorkoutService] Schema mismatch: is_active column missing. Retrying without it...');
            const { is_active, ...dbPlanWithoutIsActive } = dbPlan;
            
            const { data: retrySavedPlan, error: retryError } = await supabase
              .from('workout_plans')
              .insert(dbPlanWithoutIsActive)
              .select()
              .single();
              
            if (retryError) {
               console.error('[WorkoutService] Error saving plan to database (retry failed):', retryError.message);
               console.warn('[WorkoutService] Continuing with local-only storage...');
            } else {
               console.log('[WorkoutService] ✅ Successfully saved workout plan to database (without is_active):', retrySavedPlan.id);
            }
          } else {
          console.error('[WorkoutService] Error saving plan to database:', insertError.message);
          console.warn('[WorkoutService] Continuing with local-only storage...');
          }
        } else {
          console.log('[WorkoutService] ✅ Successfully saved workout plan to database:', savedPlan.id);
        }
      } catch (dbError: any) {
        console.error('[WorkoutService] Exception while saving to database:', dbError.message);
        console.warn('[WorkoutService] Continuing with local-only storage...');
      }

      // Save to local storage for offline access
      await WorkoutLocalStore.savePlan(params.userId, storedPlan);

      // Reload plans to include the new one
      await this.initializeFromStorage(params.userId);

      console.log('[WorkoutService] AI plan created and saved successfully with ID:', storedPlan.id);
      return storedPlan;

    } catch (error) {
      console.error('[WorkoutService] Error creating AI plan:', error);
      throw error;
    }
  }


  /**
   * Delete a workout plan from both database and local storage
   */
  static async deletePlan(planId: string, userId?: string): Promise<boolean> {
    try {
      console.log(`[WorkoutService] Deleting plan ${planId}`);

      let dbSuccess = false;
      let localSuccess = false;

      // First, try to delete from database if it's a valid UUID
      if (this.isValidUUID(planId)) {
        try {
          console.log(`[WorkoutService] Attempting to delete plan from database: ${planId}`);
          
          // Try using the API endpoint first (more reliable)
          try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/delete-workout-plan/${planId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              console.log(`[WorkoutService] Successfully deleted plan from database via API: ${planId}`);
              dbSuccess = true;
            } else {
              console.warn('[WorkoutService] API deletion failed, trying direct Supabase');
              throw new Error('API deletion failed');
            }
          } catch (apiError) {
            // Fallback to direct Supabase deletion
            const { error: dbDeleteError } = await supabase
              .from('workout_plans')
              .delete()
              .eq('id', planId);
            
            if (dbDeleteError) {
              console.error('[WorkoutService] Database deletion failed:', dbDeleteError);
            } else {
              console.log(`[WorkoutService] Successfully deleted plan from database via Supabase: ${planId}`);
              dbSuccess = true;
            }
          }
        } catch (dbError) {
          console.error(`[WorkoutService] Error deleting plan from database: ${dbError}`);
        }
      }

      // Delete from local storage (improved method with userId)
      try {
        localSuccess = await WorkoutLocalStore.deletePlan(planId, userId);
        if (localSuccess) {
          console.log(`[WorkoutService] Successfully deleted plan from local storage: ${planId}`);
        }
      } catch (localError) {
        console.error(`[WorkoutService] Error deleting plan from local storage: ${localError}`);
      }

      // Reload plans if any deletion was successful
      const success = dbSuccess || localSuccess;
      if (success) {
        await this.initializeFromStorage(userId);
      }

      return success;
    } catch (error) {
      console.error('[WorkoutService] Error deleting plan:', error);
      return false;
    }
  }

  /**
   * Delete a workout plan by name (for cases where ID is not available)
   */
  static async deletePlanByName(planName: string, userId: string): Promise<boolean> {
    try {
      console.log(`[WorkoutService] Deleting plan by name: ${planName} for user: ${userId}`);

      let success = false;

      // Try to delete from database by name
      try {
        const { error: dbDeleteError } = await supabase
          .from('workout_plans')
          .delete()
          .eq('user_id', userId)
          .eq('name', planName);
        
        if (dbDeleteError) {
          console.error('[WorkoutService] Database deletion by name failed:', dbDeleteError);
        } else {
          console.log(`[WorkoutService] Successfully deleted plan from database by name: ${planName}`);
          success = true;
        }
      } catch (dbError) {
        console.error(`[WorkoutService] Error deleting plan from database by name: ${dbError}`);
      }

      // Delete from local storage by name (improved method with userId)
      try {
        const localSuccess = await WorkoutLocalStore.deletePlansByName(planName, userId);
        if (localSuccess) {
          success = true;
          console.log(`[WorkoutService] Successfully deleted plan from local storage by name: ${planName}`);
        }
      } catch (localError) {
        console.error(`[WorkoutService] Error deleting plan from local storage by name: ${localError}`);
      }

      // Reload plans if any deletion was successful
      if (success) {
        await this.initializeFromStorage(userId);
      }

      return success;
    } catch (error) {
      console.error('[WorkoutService] Error deleting plan by name:', error);
      return false;
    }
  }

  /**
   * Get a plan by ID
   */
  static async getPlanById(planId: string): Promise<StoredWorkoutPlan | null> {
    try {
      // First try to get from Supabase database
      if (supabase) {
        // Explicitly select all columns including JSONB fields
        const { data: plan, error } = await supabase
          .from('workout_plans')
          .select('*, weekly_schedule, ai_reasoning')
          .eq('id', planId)
          .single();
        
        if (error) {
          console.error('[WorkoutService] Error fetching plan:', error);
          // If error is about missing column, log it
          if (error.message?.includes('ai_reasoning') || error.message?.includes('column')) {
            console.warn('[WorkoutService] ⚠️ Database column error - ai_reasoning column may not exist. Run the migration: supabase/migrations/20250101000000_add_ai_reasoning_column.sql');
          }
        }
        
        if (!error && plan) {
          console.log('[WorkoutService] Found plan in database:', planId);
          console.log('[WorkoutService] Plan columns check:', {
            hasWeeklySchedule: !!(plan as any)?.weekly_schedule,
            hasAiReasoning: !!(plan as any)?.ai_reasoning,
            aiReasoningType: typeof (plan as any)?.ai_reasoning,
            aiReasoningValue: (plan as any)?.ai_reasoning,
            allPlanKeys: Object.keys(plan || {})
          });
          console.log('[WorkoutService] Plan has AI reasoning:', {
            hasAiReasoning: !!(plan as any)?.ai_reasoning,
            splitReasoning: !!(plan as any)?.ai_reasoning?.split_reasoning,
            exerciseReasoning: !!(plan as any)?.ai_reasoning?.exercise_selection_reasoning,
            aiReasoningType: typeof (plan as any)?.ai_reasoning,
            planKeys: Object.keys(plan || {}).slice(0, 15)
          });
          
          // If ai_reasoning is null or missing, it means this plan was generated before the feature was added
          if (!(plan as any)?.ai_reasoning) {
            console.log('[WorkoutService] ⚠️ Plan does not have ai_reasoning - this plan was generated before the reasoning feature was added. Generate a new plan to see reasoning.');
          }
          
          return plan as StoredWorkoutPlan;
        }
      }
      
      // Fallback to local storage
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
      if (!supabase) {
        console.warn('[WorkoutService] Supabase not available');
        return [];
      }
      
      // Log the plan ID for debugging
      console.log('[WorkoutService] getSessionsForPlan called with planId:', planId);
      
      // OPTIMIZATION: Don't include estimated_calories to avoid retries
      // This column may not exist in all database schemas
      const { data: sessionsData, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          plan_id,
          split_id,
          day_number,
          week_number,
          status,
          completed_at,
          training_splits:split_id (
            id,
            name,
            focus_areas,
            order_in_week
          )
        `)
        .eq('plan_id', planId)
        .order('day_number', { ascending: true });
      
      if (error) {
        // Check if error is related to invalid UUID format
        if (error.message && error.message.includes('invalid input syntax for type uuid')) {
          console.error('[WorkoutService] UUID validation error - invalid format in database. Plan ID:', planId);
          return [];
        }
        console.error('[WorkoutService] Error fetching sessions:', error);
        return [];
      }
      
      // Validate that split_ids in returned data are valid UUIDs
      let sessions = sessionsData || [];
      if (sessions && Array.isArray(sessions)) {
        sessions = sessions.filter(session => {
          if (!isValidUUID(session.split_id)) {
            console.warn('[WorkoutService] Filtering out session with invalid split_id:', session.split_id);
            return false;
          }
          return true;
        });
      }
      
      console.log(`[WorkoutService] Found ${sessions?.length || 0} valid sessions for plan ${planId}`);
      
      return sessions || [];
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
        id: uuidv4(),
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
      // Import muscle group inference utility
      const { inferMuscleGroupsFromName, getDefaultMuscleGroupsByCategory } = await import('../../utils/muscleGroupInference');
      
      // Infer muscle groups from exercise name
      let inferredMuscleGroups = inferMuscleGroupsFromName(exerciseName);
      
      // If no muscle groups inferred, use default based on category
      if (inferredMuscleGroups.length === 0) {
        inferredMuscleGroups = getDefaultMuscleGroupsByCategory('compound');
      }
      
      const { data: newExercise, error: createError } = await supabase
        .from('exercises')
        .insert({
          name: exerciseName,
          is_custom: true,
          plan_id: planId || null,
          category: 'compound',
          muscle_groups: inferredMuscleGroups,
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
