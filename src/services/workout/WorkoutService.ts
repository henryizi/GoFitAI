import { supabase } from '../supabase/client';
import { DeepSeekService } from '../ai/deepseek';
import { getExerciseInfo } from '../../constants/exerciseNames';
import { Database } from '../../types/database';
import { track as analyticsTrack } from '../analytics/analytics';
import Constants from 'expo-constants';
import { environment } from '../../config/environment';

import { WorkoutLocalStore } from './WorkoutLocalStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { WorkoutHistoryService } from './WorkoutHistoryService';
import { ExerciseVarietyService } from './ExerciseVarietyService';
import { bodybuilderWorkouts } from '../../data/bodybuilder-workouts';

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
type TrainingSplit = Database['public']['Tables']['training_splits']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];
type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];
type ExerciseSet = Database['public']['Tables']['exercise_sets']['Row'];
type ExerciseLog = Database['public']['Tables']['exercise_logs']['Row'];
type VolumeTracking = Database['public']['Tables']['volume_tracking']['Row'];

interface CreatePlanInput {
  userId: string;
  height: number;
  weight: number;
  age: number;
  gender: 'male' | 'female';
  fullName: string;
  fatLossGoal: number;
  muscleGainGoal: number;
  trainingLevel: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal?: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain';
  emulateBodybuilder?: string; // Optional parameter to emulate a famous bodybuilder's workout style

  // Enhanced onboarding data - will be fetched from database if not provided
  bodyFat?: number;
  weightTrend?: 'losing' | 'gaining' | 'stable' | 'unsure';
  exerciseFrequency?: '1' | '2-3' | '4-5' | '6-7';
  workoutFrequency?: '2_3' | '4_5' | '6';
  activityLevel?: 'sedentary' | 'moderately_active' | 'very_active';
  bodyAnalysis?: {
    chest_rating?: number;
    arms_rating?: number;
    back_rating?: number;
    legs_rating?: number;
    waist_rating?: number;
    overall_rating?: number;
    strongest_body_part?: string;
    weakest_body_part?: string;
    ai_feedback?: string;
  };
}

// Define API URL with fallback options
const getWorkoutApiUrl = () => {
  // Use centralized environment configuration
  let apiUrl = environment.apiUrl;

  // Allow localhost for testing (comment out for production)
  if (apiUrl && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
    console.log('[WORKOUT] Using localhost for testing');
    // Uncomment the line below to switch to Railway production URL
    // apiUrl = 'https://gofitai-production.up.railway.app';
  }
  
  if (environment.isProduction) {
    console.log('[WORKOUT] Using production API URL:', apiUrl);
  } else {
    console.log('[WORKOUT] Using development API URL:', apiUrl);
  }
  
  return apiUrl;
};

// Helper function to try the configured server URL
const tryServer = async (endpoint: string, options: any) => {
  const serverUrl = WorkoutService.API_URL;

  try {
    console.log(`[WORKOUT] Trying server: ${serverUrl}${endpoint}`);
    const response = await fetch(`${serverUrl}${endpoint}`, options);

    if (response.ok) {
      console.log(`[WORKOUT] Success with server: ${serverUrl}`);
      return response;
    } else {
      console.warn(`[WORKOUT] Server returned status: ${response.status}`);
      throw new Error(`Server returned status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[WORKOUT] Failed to connect to server ${serverUrl}:`, error);
    throw error;
  }
};

export class WorkoutService {
  static API_URL = getWorkoutApiUrl();
  
  /**
   * Utility method to check if a string is a valid UUID
   */
  static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
  
  // Add initialization method to load plans from storage when app starts
  static async initializeFromStorage() {
    try {
      console.log('[WORKOUT] Initializing from storage');
      const storedPlans = await this.readPersisted<any[]>('workout_plans');
      if (storedPlans && Array.isArray(storedPlans)) {
        console.log(`[WORKOUT] Loaded ${storedPlans.length} plans from storage`);
        // No longer using mock store
      }
    } catch (err) {
      console.error('[WORKOUT] Error initializing from storage:', err);
    }
  }
  
  // Save plans to storage whenever they change
  private static async savePlansToStorage() {
    try {
      // Note: Plans are now saved through WorkoutLocalStore only
      console.log('[WORKOUT] Plans saved through WorkoutLocalStore');
    } catch (err) {
      console.error('[WORKOUT] Error saving plans to storage:', err);
    }
  }

  private static async writePersisted(key: string, value: any) {
    try {
      const serialized = JSON.stringify(value);
      if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(key, serialized);
      } else {
        await AsyncStorage.setItem(key, serialized);
      }
    } catch (err) {
      console.error('[WORKOUT] Failed to persist key', key, err);
    }
  }

  private static async readPersisted<T = any>(key: string): Promise<T | null> {
    try {
      if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        const raw = (globalThis as any).localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } else {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      }
    } catch (err) {
      console.error('[WORKOUT] Failed to read key', key, err);
      return null;
    }
  }
  
  /**
   * Generate and save a new AI-powered workout plan
   */
  static async createAIPlan(input: CreatePlanInput): Promise<WorkoutPlan | null> {
    try {
      // EARLY DETECTION: Check if this is a bodybuilder template - handle completely offline
      const bodybuilderTemplates = [
        'cbum', 'platz', 'ronnie', 'arnold', 'dorian', 'jay', 'phil', 'kai',
        'franco', 'frank', 'lee', 'derek', 'hadi', 'nick', 'flex', 'sergio'
      ];

      const isBodybuilderTemplate = input.emulateBodybuilder && bodybuilderTemplates.includes(input.emulateBodybuilder);

      if (isBodybuilderTemplate) {
        console.log(`[WorkoutService] Detected bodybuilder template: ${input.emulateBodybuilder} - using offline mode`);
        return await this.createBodybuilderPlanOffline(input);
      }

      const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[Timeout] ${label} exceeded ${ms}ms`)), ms))
        ]);
      };
      const AI_TIMEOUT_MS = Number(Constants?.expoConfig?.extra?.AI_TIMEOUT_MS || process.env.EXPO_PUBLIC_AI_TIMEOUT_MS) || 45000;
      const DB_TIMEOUT_MS = 12000;
      const RPC_TIMEOUT_MS = 20000;

      analyticsTrack('ai_plan_create_start', { user_id: input.userId, emulate: input.emulateBodybuilder || null, level: input.trainingLevel });

      console.log('[WorkoutService] Step 1: Deactivating any existing active plans...');
      try {
        await withTimeout(
          (async () =>
            await supabase
              .from('workout_plans')
              .update({ status: 'archived' })
              .eq('user_id', input.userId)
              .eq('status', 'active')
          )(),
          DB_TIMEOUT_MS,
          'archive existing plans'
        );
        console.log('[WorkoutService] Step 1 successful: Deactivated existing active plans.');
      } catch (activePlanError) {
        console.error('[WorkoutService] Error deactivating old plans (continuing):', activePlanError);
      }
      
      console.log('[WorkoutService] Step 2: Fetching comprehensive user profile data...');
      // Fetch all onboarding data from database if not provided
      const enhancedInput = await this.enhanceInputWithUserData(input);
      
      console.log('[WorkoutService] Step 3: Generating AI workout plan with enhanced data...', enhancedInput);

      let aiPlan: any;
      {
        // Only try remote generation if explicitly enabled; otherwise create locally
        const remoteFlag = (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_WORKOUT_AI_REMOTE || process.env.EXPO_PUBLIC_WORKOUT_AI_REMOTE;
        // Always enable remote generation
        const remoteEnabled = true; // Force remote generation to always be enabled
        let lastError: unknown = null;
        
        if (remoteEnabled) {
          try {
            console.log('[WORKOUT] Sending request to generate AI workout plan...');
            const apiUrl = `${WorkoutService.API_URL}/api/generate-workout-plan`;
            console.log('[WORKOUT] Using API URL:', apiUrl);
            
            // First test server connectivity with fallback
            console.log('[WORKOUT] Testing server connectivity...');
            try {
              // Create custom timeout for React Native compatibility
              const healthController = new AbortController();
              const healthTimeout = setTimeout(() => healthController.abort(), 5000);
              
              const healthCheck = await tryServer('/api/health', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: healthController.signal,
              });
              
              clearTimeout(healthTimeout);
              
              if (healthCheck.ok) {
                console.log('[WORKOUT] Server health check passed');
              } else {
                console.warn('[WORKOUT] Server health check failed:', healthCheck.status);
                throw new Error(`Health check failed: ${healthCheck.status}`);
              }
            } catch (healthError) {
              console.error('[WORKOUT] Server health check error:', healthError);
              throw new Error(`Server unreachable: ${healthError}`);
            }
            
            // Use a React Native-compatible timeout approach with retry logic
            const timeoutMs = 240000; // 240 seconds (4 minutes) for AI generation
            console.log(`[WORKOUT] Using timeout of ${timeoutMs}ms for AI generation`);
            
            // Helper function for React Native-compatible fetch with timeout
            const fetchWithRNTimeout = async (endpoint: string, options: any, timeout: number) => {
              return new Promise<Response>((resolve, reject) => {
                const controller = new AbortController();
                let timeoutId: ReturnType<typeof setTimeout> | null = null;
                
                // Set up timeout
                timeoutId = setTimeout(() => {
                  controller.abort();
                  reject(new Error(`Request timed out after ${timeout / 1000} seconds`));
                }, timeout);
                
                        // Make the request through tryServer
        tryServer(endpoint, {
                  ...options,
                  signal: controller.signal
                })
                .then((response: Response) => {
                  if (timeoutId) clearTimeout(timeoutId);
                  resolve(response);
                })
                .catch((error: any) => {
                  if (timeoutId) clearTimeout(timeoutId);
                  if (error.name === 'AbortError') {
                    reject(new Error(`Request timed out after ${timeout / 1000} seconds`));
                  } else {
                    reject(error);
                  }
                });
              });
            };
            
            const res = await fetchWithRNTimeout('/api/generate-workout-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userProfile: {
                  fitnessLevel: input.trainingLevel,
                  primaryGoal: enhancedInput.primaryGoal || 'general_fitness',
                  fullName: input.fullName,
                  age: enhancedInput.age,
                  gender: input.gender,
                  height: enhancedInput.height,
                  weight: enhancedInput.weight,
                  bodyFat: enhancedInput.bodyFat,
                  workoutFrequency: enhancedInput.workoutFrequency,
                  exerciseFrequency: enhancedInput.exerciseFrequency,
                  activityLevel: enhancedInput.activityLevel,
                  emulateBodybuilder: input.emulateBodybuilder,
                  bodyAnalysis: enhancedInput.bodyAnalysis
                }
              })
            }, timeoutMs);
            
            if (!res.ok) {
              const errorText = await res.text();
              console.error(`[WORKOUT] Server error (${res.status}):`, errorText);
              
              // Try to parse the error response as JSON
              let errorDetails = errorText;
              try {
                const errorJson = JSON.parse(errorText);
                errorDetails = errorJson.error || errorText;
                console.error('[WORKOUT] Error details:', errorJson);
              } catch (e) {
                // If parsing fails, use the raw error text
              }
              
              throw new Error(`Server workout-plan API ${res.status}: ${errorDetails}`);
            }
            
            const data = await res.json();
            
            // More detailed validation of the response
            if (!data?.success) {
              console.error('[WORKOUT] Server returned success: false', data);
              const serverError = data?.error || 'Unknown server error';
              
              // Convert technical error messages to user-friendly ones
              let userFriendlyMessage = serverError;
              if (serverError.includes('status code 402') || serverError.toLowerCase().includes('payment')) {
                userFriendlyMessage = 'AI service is currently unavailable due to quota limits. Please try again later.';
              } else if (serverError.includes('status code 429')) {
                userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
              } else if (serverError.includes('status code 503')) {
                userFriendlyMessage = 'AI service is temporarily unavailable. Please try again later.';
              }
              
              throw new Error(userFriendlyMessage);
            }
            
            // Handle Railway server response format
            if (data?.workoutPlan) {
              // Railway format: { success: true, workoutPlan: { weekly_schedule: [...] } }
              if (!data.workoutPlan.weekly_schedule || !Array.isArray(data.workoutPlan.weekly_schedule)) {
                console.error('[WORKOUT] Railway response missing weekly_schedule array');
                throw new Error('Server response missing weekly schedule data');
              }
              
              // Convert Railway format to expected format
              // The fallback plan has a different structure, so we need to transform it
              const transformedSchedule = data.workoutPlan.weekly_schedule.map((day: any) => {
                // Handle fallback plan structure
                if (day.main_workout) {
                  // Fallback plan format
                  return {
                    day: day.day_name || day.day || 'Day',
                    focus: day.focus || day.workout_type || 'Full Body',
                    exercises: day.main_workout.map((exercise: any) => ({
                      name: exercise.exercise,
                      sets: exercise.sets,
                      reps: exercise.reps,
                      restBetweenSets: `${exercise.rest_seconds || 60}s`
                    }))
                  };
                } else if (day.exercises) {
                  // Standard format
                  return {
                    day: day.day || day.day_name || 'Day',
                    focus: day.focus || 'Full Body',
                    exercises: day.exercises.map((exercise: any) => ({
                      name: exercise.name || exercise.exercise,
                      sets: exercise.sets,
                      reps: exercise.reps,
                      restBetweenSets: exercise.restBetweenSets || `${exercise.rest_seconds || 60}s`
                    }))
                  };
                } else {
                  console.error('[WORKOUT] Unknown day structure:', day);
                  throw new Error('Unknown workout day structure received from server');
                }
              });
              
              aiPlan = {
                weeklySchedule: transformedSchedule,
                estimatedTimePerSession: data.workoutPlan.estimatedTimePerSession || '45-60 minutes',
                name: data.workoutPlan.plan_name || `${input.fullName || 'User'}'s Personalized Plan`
              };
              
              console.log('[WORKOUT] Successfully received Railway plan with', 
                          aiPlan.weeklySchedule.length, 'workout days');
            } else if (data?.plan) {
              // Legacy format: { plan: { weeklySchedule: [...] } }
              if (!data.plan.weeklySchedule || !Array.isArray(data.plan.weeklySchedule)) {
                console.error('[WORKOUT] Legacy response missing weeklySchedule array');
                throw new Error('Server response missing weekly schedule data');
              }
              
              aiPlan = data.plan;
              console.log('[WORKOUT] Successfully received legacy plan with', 
                          data.plan.weeklySchedule.length, 'workout days and',
                          data.plan.weeklySchedule.reduce((total: number, day: any) => total + (day.exercises?.length || 0), 0), 
                          'total exercises');
            } else {
              console.error('[WORKOUT] Server response missing both plan and workoutPlan data');
              throw new Error('Server response missing plan data');
            }
            console.log(`[WorkoutService] Step 3 successful: AI plan generated.`);
            analyticsTrack('ai_plan_generated', { user_id: input.userId, days: aiPlan?.weeklySchedule?.length || 0 });
          } catch (error) {
            console.error('[WORKOUT] Error generating AI workout plan:', error);
            
            // Enhanced error logging for network issues
            if (error instanceof TypeError && error.message.includes('Network request failed')) {
              console.error('[WORKOUT] Network connection failed - server may be down or unreachable');
              console.error('[WORKOUT] Check server status at:', `${WorkoutService.API_URL}/api/health`);
            } else if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timed out'))) {
              console.error(`[WORKOUT] Request timed out after 180 seconds`);
            } else {
              console.error('[WORKOUT] Unexpected error:', error);
            }
            
            // Store the error for analytics
            analyticsTrack('ai_plan_error', { 
              user_id: input.userId, 
              error: error instanceof Error ? error.message : String(error),
              error_type: error instanceof TypeError ? 'network' : (error instanceof Error && error.name === 'AbortError') ? 'timeout' : 'other',
              stage: 'ai_generation'
            });
            
            // No fallback - throw the error to show proper error message to user
            throw error;
          }
        }
        if (!aiPlan || !aiPlan.weeklySchedule || !Array.isArray(aiPlan.weeklySchedule)) {
          throw new Error('AI plan generation failed - no valid plan received from server');
        }
      }

      // Create a plan name based on whether we're emulating a bodybuilder
      let planName = `${input.fullName}'s Plan`;
      if (input.emulateBodybuilder) {
        switch (input.emulateBodybuilder) {
          case 'cbum':
            planName = `Chris Bumstead's Training Plan`;
            break;
          case 'arnold':
            planName = `Arnold Schwarzenegger's Training Plan`;
            break;
          case 'ronnie':
            planName = `Ronnie Coleman's Training Plan`;
            break;
          case 'dorian':
            planName = `Dorian Yates's Training Plan`;
            break;
          case 'jay':
            planName = `Jay Cutler's Training Plan`;
            break;
          case 'phil':
            planName = `Phil Heath's Training Plan`;
            break;
          case 'kai':
            planName = `Kai Greene's Training Plan`;
            break;
          case 'franco':
            planName = `Franco Columbu's Training Plan`;
            break;
          case 'frank':
            planName = `Frank Zane's Training Plan`;
            break;
          case 'lee':
            planName = `Lee Haney's Training Plan`;
            break;

          case 'nick':
            planName = `Nick Walker's Training Plan`;
            break;
          case 'platz':
            planName = `Tom Platz's Training Plan`;
            break;

        }
      }

      // Store the generated plan locally - with robust validation
      const validatedWeeklySchedule = Array.isArray(aiPlan.weeklySchedule) ? aiPlan.weeklySchedule : [];
      const validatedPlanName = planName && planName.trim() ? planName : `${input.fullName || 'User'}'s Workout Plan`;
      const validatedUserId = input.userId && input.userId.trim() ? input.userId : 'anonymous';
      
      const planWithWeeklySchedule = {
        id: `ai-${Date.now().toString(36)}`,
        user_id: validatedUserId,
        name: validatedPlanName,
        training_level: input.trainingLevel || 'intermediate',
        mesocycle_length_weeks: 4,
        current_week: 1,
        deload_week: false,
        is_active: true,
        status: 'active' as const,
        weekly_schedule: validatedWeeklySchedule,
        weeklySchedule: validatedWeeklySchedule, // Add both formats for compatibility
        goal_fat_loss: input.fatLossGoal || 0,
        goal_muscle_gain: input.muscleGainGoal || 0,
        estimatedTimePerSession: aiPlan.estimatedTimePerSession || '45-60 minutes',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('[WorkoutService] Created validated plan:', {
        id: planWithWeeklySchedule.id,
        name: planWithWeeklySchedule.name,
        user_id: planWithWeeklySchedule.user_id,
        schedule_days: validatedWeeklySchedule.length,
        training_level: planWithWeeklySchedule.training_level
      });

      // Save to local storage only (no mock store) - with error handling
      try {
        // Verify WorkoutLocalStore has the required method
        if (typeof WorkoutLocalStore?.addPlan === 'function') {
          await WorkoutLocalStore.addPlan(validatedUserId, planWithWeeklySchedule);
          console.log('[WorkoutService] Successfully added generated plan to local storage');
        } else {
          console.error('[WorkoutService] WorkoutLocalStore.addPlan method not available');
          // Try alternative method if available
          if (typeof WorkoutLocalStore?.savePlans === 'function') {
            const existingPlans = await WorkoutLocalStore.getPlans(validatedUserId) || [];
            existingPlans.push(planWithWeeklySchedule);
            await WorkoutLocalStore.savePlans(validatedUserId, existingPlans);
            console.log('[WorkoutService] Successfully saved plan using fallback savePlans method');
          }
        }
      } catch (localStorageError) {
        console.error('[WorkoutService] Error saving to local storage (continuing):', localStorageError);
        // Continue execution - don't fail the entire process for local storage issues
      }

      // Save to persistent storage
      await this.savePlansToStorage();

      // Attempt to save plan atomically via RPC first (fast path), then fall back to multi-step inserts.
      try {
        console.log('[WorkoutService] Step 4: Upserting full plan via RPC (splits, sessions, sets)...');
        const rpcResult = await withTimeout(
          (async () =>
            await supabase.rpc('upsert_ai_workout_plan', {
              user_id_param: input.userId,
              plan_data: {
                name: planName,
                training_level: input.trainingLevel,
                goal_fat_loss: input.fatLossGoal,
                goal_muscle_gain: input.muscleGainGoal,
                mesocycle_length_weeks: 4,
                estimated_time_per_session: aiPlan.estimatedTimePerSession,
                weeklySchedule: aiPlan.weeklySchedule || [],
              },
            })
          )(),
          RPC_TIMEOUT_MS,
          'rpc upsert_ai_workout_plan'
        );

        if ((rpcResult as any)?.error) {
          throw (rpcResult as any).error;
        }

        const newPlanId = (rpcResult as any)?.data;
        console.log('[WorkoutService] RPC successful. New plan id:', newPlanId);
        analyticsTrack('ai_plan_saved', { user_id: input.userId, plan_id: newPlanId, method: 'rpc' });

        // Fetch the newly created plan
        const { data: fetchedPlan, error: fetchErr } = await supabase
          .from('workout_plans')
          .select('*')
          .eq('id', newPlanId)
          .single();
        if (fetchErr) {
          throw fetchErr;
        }
        // Attach weekly schedule to the returned plan for client rendering
        const returnedPlan = { 
          ...fetchedPlan, 
          weekly_schedule: aiPlan.weeklySchedule,
          weeklySchedule: aiPlan.weeklySchedule,
          is_active: true,
          status: 'active'
        } as any;

        // Persist the UUID plan with its schedule into local storage for immediate availability
        try {
          if (typeof WorkoutLocalStore?.addPlan === 'function') {
            await WorkoutLocalStore.addPlan(input.userId, returnedPlan);
            console.log('[WorkoutService] Synced RPC-created plan with schedule to local storage');
          }
        } catch (syncErr) {
          console.warn('[WorkoutService] Failed to sync RPC-created plan to local storage (continuing):', syncErr);
        }

        return returnedPlan;
      } catch (rpcError) {
        console.warn('[WorkoutService] RPC path failed, falling back to multi-step inserts:', rpcError);
        analyticsTrack('ai_plan_save_fallback', { user_id: input.userId });

        console.log('[WorkoutService] Step 4: Inserting new workout plan into database (fallback)...');
        const insertResult = await withTimeout(
          (async () =>
            await supabase
              .from('workout_plans')
              .insert({
                user_id: input.userId,
                name: planName,
                training_level: input.trainingLevel,
                goal_fat_loss: input.fatLossGoal,
                goal_muscle_gain: input.muscleGainGoal,
                estimated_time_per_session: aiPlan.estimatedTimePerSession,
                volume_landmarks: this.calculateVolumeLandmarks(input.trainingLevel),
                status: 'active',
                mesocycle_length_weeks: 4,
                current_week: 1,
                deload_week: false,
              })
              .select()
              .single()
          )(),
          DB_TIMEOUT_MS,
          'insert workout_plans'
        );
        const { data: plan, error: planError } = insertResult as any;

        if (planError) {
          console.error('[WorkoutService] Supabase error during plan insertion (raw object):', planError);
          throw planError;
        }

        analyticsTrack('ai_plan_saved', { user_id: input.userId, plan_id: (plan as any)?.id, method: 'fallback' });

        // Create sessions and sets (best-effort, with timeout)
        console.log('[WorkoutService] Step 5: Creating workout sessions and linking exercises (fallback)...');
        try {
          await withTimeout(
            this.createWorkoutSessionsAndSets(plan.id, aiPlan.weeklySchedule || []),
            DB_TIMEOUT_MS,
            'create sessions and sets'
          );
          console.log('[WorkoutService] Step 5 successful: Sessions and sets created (fallback).');
        } catch (e) {
          console.error('[WorkoutService] Timeout/error while creating sessions and sets (continuing):', e);
        }

        // Track exercise usage for variety management
        if (aiPlan.weeklySchedule) {
          const allExercises = aiPlan.weeklySchedule.flatMap((day: any) => 
            day.exercises.map((exercise: any) => ({
              name: exercise.name,
              muscleGroups: getExerciseInfo(exercise.name)?.muscleGroups || []
            }))
          );
          await ExerciseVarietyService.trackExerciseUsage(allExercises);
        }

        // Attach schedule to returned plan for immediate client rendering
        return { ...plan, weekly_schedule: aiPlan.weeklySchedule } as any;
      }
    } catch (dbError) {
      console.error('[WorkoutService] Database unavailable or timed out. Returning offline plan.', dbError);
      // Recompute fallback plan name
      let fallbackPlanName = `${input.fullName}'s Plan`;
      if (input.emulateBodybuilder) {
        switch (input.emulateBodybuilder) {
          case 'cbum': fallbackPlanName = `Chris Bumstead's Training Plan`; break;
          case 'arnold': fallbackPlanName = `Arnold Schwarzenegger's Training Plan`; break;
          case 'ronnie': fallbackPlanName = `Ronnie Coleman's Training Plan`; break;
          case 'dorian': fallbackPlanName = `Dorian Yates's Training Plan`; break;
          case 'jay': fallbackPlanName = `Jay Cutler's Training Plan`; break;
          case 'phil': fallbackPlanName = `Phil Heath's Training Plan`; break;
          case 'kai': fallbackPlanName = `Kai Greene's Training Plan`; break;
          case 'franco': fallbackPlanName = `Franco Columbu's Training Plan`; break;
          case 'frank': fallbackPlanName = `Frank Zane's Training Plan`; break;
          case 'lee': fallbackPlanName = `Lee Haney's Training Plan`; break;

          case 'nick': fallbackPlanName = `Nick Walker's Training Plan`; break;
          case 'platz': fallbackPlanName = `Tom Platz's Training Plan`; break;

        }
      }

      // Create a comprehensive offline fallback plan based on training level
      const getOfflineWorkoutPlan = (trainingLevel: string) => {
        const baseExercises = {
          beginner: {
            monday: { focus: "Upper Body", exercises: [
              { name: "Push-ups", sets: 3, reps: "8-12", restBetweenSets: "60s" },
              { name: "Bodyweight Rows", sets: 3, reps: "8-10", restBetweenSets: "60s" },
              { name: "Shoulder Press", sets: 3, reps: "10-12", restBetweenSets: "60s" },
              { name: "Bicep Curls", sets: 3, reps: "12-15", restBetweenSets: "45s" }
            ]},
            wednesday: { focus: "Lower Body", exercises: [
              { name: "Squats", sets: 3, reps: "10-15", restBetweenSets: "60s" },
              { name: "Lunges", sets: 3, reps: "10 each leg", restBetweenSets: "60s" },
              { name: "Calf Raises", sets: 3, reps: "15-20", restBetweenSets: "45s" },
              { name: "Glute Bridges", sets: 3, reps: "12-15", restBetweenSets: "45s" }
            ]},
            friday: { focus: "Full Body", exercises: [
              { name: "Burpees", sets: 3, reps: "5-8", restBetweenSets: "90s" },
              { name: "Mountain Climbers", sets: 3, reps: "20", restBetweenSets: "60s" },
              { name: "Plank", sets: 3, reps: "30-45s", restBetweenSets: "60s" },
              { name: "Jumping Jacks", sets: 3, reps: "20", restBetweenSets: "45s" }
            ]}
          },
          intermediate: {
            monday: { focus: "Chest & Triceps", exercises: [
              { name: "Bench Press", sets: 4, reps: "8-10", restBetweenSets: "90s" },
              { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", restBetweenSets: "75s" },
              { name: "Chest Flyes", sets: 3, reps: "12-15", restBetweenSets: "60s" },
              { name: "Tricep Dips", sets: 3, reps: "10-12", restBetweenSets: "60s" },
              { name: "Tricep Pushdowns", sets: 3, reps: "12-15", restBetweenSets: "45s" }
            ]},
            tuesday: { focus: "Back & Biceps", exercises: [
              { name: "Pull-ups/Lat Pulldowns", sets: 4, reps: "8-10", restBetweenSets: "90s" },
              { name: "Barbell Rows", sets: 3, reps: "10-12", restBetweenSets: "75s" },
              { name: "Cable Rows", sets: 3, reps: "12-15", restBetweenSets: "60s" },
              { name: "Barbell Curls", sets: 3, reps: "10-12", restBetweenSets: "60s" },
              { name: "Hammer Curls", sets: 3, reps: "12-15", restBetweenSets: "45s" }
            ]},
            thursday: { focus: "Legs", exercises: [
              { name: "Squats", sets: 4, reps: "8-10", restBetweenSets: "2min" },
              { name: "Romanian Deadlifts", sets: 3, reps: "10-12", restBetweenSets: "90s" },
              { name: "Leg Press", sets: 3, reps: "12-15", restBetweenSets: "75s" },
              { name: "Leg Curls", sets: 3, reps: "12-15", restBetweenSets: "60s" },
              { name: "Calf Raises", sets: 4, reps: "15-20", restBetweenSets: "45s" }
            ]},
            friday: { focus: "Shoulders & Core", exercises: [
              { name: "Overhead Press", sets: 4, reps: "8-10", restBetweenSets: "90s" },
              { name: "Lateral Raises", sets: 3, reps: "12-15", restBetweenSets: "60s" },
              { name: "Rear Delt Flyes", sets: 3, reps: "12-15", restBetweenSets: "60s" },
              { name: "Plank", sets: 3, reps: "60s", restBetweenSets: "60s" },
              { name: "Russian Twists", sets: 3, reps: "20", restBetweenSets: "45s" }
            ]}
          },
          advanced: {
            monday: { focus: "Chest & Triceps", exercises: [
              { name: "Barbell Bench Press", sets: 5, reps: "5-8", restBetweenSets: "2-3min" },
              { name: "Incline Dumbbell Press", sets: 4, reps: "8-10", restBetweenSets: "90s" },
              { name: "Decline Barbell Press", sets: 3, reps: "10-12", restBetweenSets: "75s" },
              { name: "Cable Flyes", sets: 3, reps: "12-15", restBetweenSets: "60s" },
              { name: "Close-Grip Bench Press", sets: 4, reps: "8-10", restBetweenSets: "90s" },
              { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", restBetweenSets: "60s" }
            ]},
            tuesday: { focus: "Back & Biceps", exercises: [
              { name: "Deadlifts", sets: 5, reps: "5-8", restBetweenSets: "2-3min" },
              { name: "Pull-ups", sets: 4, reps: "8-10", restBetweenSets: "90s" },
              { name: "T-Bar Rows", sets: 4, reps: "8-10", restBetweenSets: "90s" },
              { name: "Cable Rows", sets: 3, reps: "10-12", restBetweenSets: "75s" },
              { name: "Barbell Curls", sets: 4, reps: "8-10", restBetweenSets: "75s" },
              { name: "Preacher Curls", sets: 3, reps: "10-12", restBetweenSets: "60s" }
            ]},
            wednesday: { focus: "Legs", exercises: [
              { name: "Squats", sets: 5, reps: "5-8", restBetweenSets: "2-3min" },
              { name: "Romanian Deadlifts", sets: 4, reps: "8-10", restBetweenSets: "2min" },
              { name: "Bulgarian Split Squats", sets: 3, reps: "10-12 each", restBetweenSets: "90s" },
              { name: "Leg Curls", sets: 4, reps: "10-12", restBetweenSets: "75s" },
              { name: "Leg Extensions", sets: 3, reps: "12-15", restBetweenSets: "60s" },
              { name: "Standing Calf Raises", sets: 4, reps: "15-20", restBetweenSets: "60s" }
            ]},
            friday: { focus: "Shoulders & Arms", exercises: [
              { name: "Overhead Press", sets: 5, reps: "5-8", restBetweenSets: "2-3min" },
              { name: "Lateral Raises", sets: 4, reps: "10-12", restBetweenSets: "75s" },
              { name: "Rear Delt Flyes", sets: 4, reps: "12-15", restBetweenSets: "60s" },
              { name: "Face Pulls", sets: 3, reps: "15-20", restBetweenSets: "60s" },
              { name: "Barbell Curls", sets: 3, reps: "10-12", restBetweenSets: "75s" },
              { name: "Tricep Dips", sets: 3, reps: "10-12", restBetweenSets: "75s" }
            ]},
            saturday: { focus: "Core & Conditioning", exercises: [
              { name: "Plank", sets: 4, reps: "60-90s", restBetweenSets: "60s" },
              { name: "Russian Twists", sets: 3, reps: "25", restBetweenSets: "45s" },
              { name: "Dead Bug", sets: 3, reps: "10 each", restBetweenSets: "45s" },
              { name: "Mountain Climbers", sets: 3, reps: "30", restBetweenSets: "60s" },
              { name: "Burpees", sets: 3, reps: "8-10", restBetweenSets: "90s" }
            ]}
          }
        };

        const level = trainingLevel as keyof typeof baseExercises;
        const schedule = baseExercises[level] || baseExercises.intermediate;
        
        return Object.entries(schedule).map(([day, workout]) => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          focus: workout.focus,
          exercises: workout.exercises
        }));
      };

      const offlinePlan: any = {
        id: `local-${Date.now()}`,
        user_id: input.userId,
        name: fallbackPlanName,
        training_level: input.trainingLevel,
        goal_fat_loss: input.fatLossGoal,
        goal_muscle_gain: input.muscleGainGoal,
        status: 'active',
        mesocycle_length_weeks: 4,
        current_week: 1,
        deload_week: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        weekly_schedule: getOfflineWorkoutPlan(input.trainingLevel),
        estimated_time_per_session: input.trainingLevel === 'beginner' ? '30-40 minutes' : 
                                   input.trainingLevel === 'intermediate' ? '45-60 minutes' : '60-75 minutes'
      };
      return offlinePlan;
    }
  }

  /**
   * Create a bodybuilder workout plan completely offline without any network calls
   */
  private static async createBodybuilderPlanOffline(input: CreatePlanInput): Promise<WorkoutPlan | null> {
    try {
      console.log(`[WorkoutService] Creating offline bodybuilder plan for: ${input.emulateBodybuilder}`);

      // Get the local bodybuilder workout data
      const bodybuilderData = this.getBodybuilderWorkoutData(input.emulateBodybuilder!, input.trainingLevel);

      // Adapt the workout schedule based on user's workout frequency preference
      let adaptedSchedule = bodybuilderData.weeklySchedule;
      
      // DEBUG: Log the input data to see what's being received
      console.log(`[WorkoutService] DEBUG - Input data:`, {
        workoutFrequency: input.workoutFrequency,
        type: typeof input.workoutFrequency,
        hasValue: !!input.workoutFrequency,
        fullInput: JSON.stringify(input, null, 2)
      });
      
      if (input.workoutFrequency) {
        const targetDays = this.getTargetTrainingDays(input.workoutFrequency);
        const currentTrainingDays = bodybuilderData.weeklySchedule.filter(day => 
          day.exercises && day.exercises.length > 0
        ).length;

        console.log(`[WorkoutService] Adapting bodybuilder plan: ${currentTrainingDays} days → ${targetDays} days (user preference: ${input.workoutFrequency})`);

        if (currentTrainingDays !== targetDays) {
          adaptedSchedule = this.adaptWorkoutScheduleForFrequency(
            bodybuilderData.weeklySchedule, 
            targetDays, 
            input.workoutFrequency
          );
        }
      } else {
        console.log(`[WorkoutService] WARNING: No workout frequency provided! Using default schedule.`);
      }

      console.log(`DEBUG: Bodybuilder data received:`, {
        totalDays: adaptedSchedule?.length || 0,
        trainingDays: adaptedSchedule?.filter(day => day.exercises && day.exercises.length > 0).length || 0,
        estimatedTime: bodybuilderData.estimatedTimePerSession,
        sampleDays: adaptedSchedule?.slice(0, 3).map(day => ({
          day: day.day,
          focus: day.focus,
          exerciseCount: day.exercises?.length || 0
        })) || []
      });

      // Create a plan name based on the bodybuilder
      let planName = `${input.fullName}'s Plan`;
      switch (input.emulateBodybuilder) {
        case 'cbum': planName = `Chris Bumstead's Training Plan`; break;
        case 'platz': planName = `Tom Platz's Training Plan`; break;
        case 'ronnie': planName = `Ronnie Coleman's Training Plan`; break;
        case 'arnold': planName = `Arnold Schwarzenegger's Training Plan`; break;
        case 'dorian': case 'dorian-yates': planName = `Dorian Yates's Training Plan`; break;
        case 'jay': case 'jay-cutler': planName = `Jay Cutler's Training Plan`; break;
        case 'phil': planName = `Phil Heath's Training Plan`; break;
        case 'kai': planName = `Kai Greene's Training Plan`; break;
        case 'franco': planName = `Franco Columbu's Training Plan`; break;
        case 'frank': planName = `Frank Zane's Training Plan`; break;
        case 'lee': planName = `Lee Haney's Training Plan`; break;

        case 'nick': planName = `Nick Walker's Training Plan`; break;

      }

      // Create the plan structure
      const planWithWeeklySchedule = {
        id: `bb-${Date.now().toString(36)}-${input.emulateBodybuilder}`,
        user_id: input.userId,
        name: planName,
        training_level: input.trainingLevel || 'intermediate',
        mesocycle_length_weeks: 4,
        current_week: 1,
        deload_week: false,
        is_active: true,
        status: 'active' as const,
        weekly_schedule: adaptedSchedule,
        weeklySchedule: adaptedSchedule,
        goal_fat_loss: input.fatLossGoal || 0,
        goal_muscle_gain: input.muscleGainGoal || 0,
        estimatedTimePerSession: bodybuilderData.estimatedTimePerSession,
        image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2000&auto=format&fit=crop',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

              console.log(`[WorkoutService] Created offline bodybuilder plan:`, {
          id: planWithWeeklySchedule.id,
          name: planWithWeeklySchedule.name,
          bodybuilder: input.emulateBodybuilder,
          days: adaptedSchedule?.length || 0,
          trainingDays: adaptedSchedule?.filter(day => day.exercises && day.exercises.length > 0).length || 0,
          training_level: planWithWeeklySchedule.training_level,
          weeklyScheduleSample: adaptedSchedule?.slice(0, 3).map(day => ({
            day: day.day,
            focus: day.focus,
            exercises: day.exercises?.length || 0
          })) || []
        });

      // Save to local storage only
      try {
        console.log('[WorkoutService] Attempting to save bodybuilder plan:', {
          id: planWithWeeklySchedule.id,
          name: planWithWeeklySchedule.name,
          userId: input.userId
        });

        if (typeof WorkoutLocalStore?.addPlan === 'function') {
          await WorkoutLocalStore.addPlan(input.userId, planWithWeeklySchedule);
          console.log('[WorkoutService] Successfully added bodybuilder plan to local storage');

          // Verify the plan was saved
          const savedPlans = await WorkoutLocalStore.getPlans(input.userId);
          const savedPlan = savedPlans.find(p => p.id === planWithWeeklySchedule.id);
          if (savedPlan) {
            console.log('[WorkoutService] ✅ Bodybuilder plan verified in local storage:', {
              id: savedPlan.id,
              name: savedPlan.name,
              is_active: savedPlan.is_active,
              status: savedPlan.status
            });
          } else {
            console.error('[WorkoutService] ❌ Bodybuilder plan not found after saving');
            console.log('[WorkoutService] All plans in storage:', savedPlans.map(p => ({ id: p.id, name: p.name })));
          }
        } else if (typeof WorkoutLocalStore?.savePlans === 'function') {
          const existingPlans = await WorkoutLocalStore.getPlans(input.userId) || [];
          existingPlans.push(planWithWeeklySchedule);
          await WorkoutLocalStore.savePlans(input.userId, existingPlans);
          console.log('[WorkoutService] Successfully saved bodybuilder plan using fallback savePlans method');
        }
      } catch (localStorageError) {
        console.error('[WorkoutService] Error saving bodybuilder plan to local storage (continuing):', localStorageError);
      }

      // Track analytics for bodybuilder plan creation
      analyticsTrack('bodybuilder_plan_created', {
        user_id: input.userId,
        bodybuilder: input.emulateBodybuilder,
        training_level: input.trainingLevel,
        method: 'offline_local'
      });

      console.log(`[WorkoutService] RETURNING bodybuilder plan with:`, {
        name: planWithWeeklySchedule.name,
        totalDays: planWithWeeklySchedule.weeklySchedule.length,
        trainingDays: planWithWeeklySchedule.weeklySchedule.filter(day => day.exercises.length > 0).length,
        firstDay: planWithWeeklySchedule.weeklySchedule[0]?.day,
        firstDayExercises: planWithWeeklySchedule.weeklySchedule[0]?.exercises.length
      });

      return planWithWeeklySchedule as any;

    } catch (error) {
      console.error('[WorkoutService] Error creating offline bodybuilder plan:', error);
      return null;
    }
  }

  /**
   * Get local workout data for a specific bodybuilder template
   */
  private static getBodybuilderWorkoutData(bodybuilder: string, trainingLevel: string) {
    // Map bodybuilder keys to the data structure
    const bodybuilderKeyMap: Record<string, string> = {
      'cbum': 'cbum',
      'platz': 'platz',
      'ronnie': 'coleman',
      'arnold': 'arnold',
      'dorian': 'dorian-yates',
      'jay': 'jay-cutler',
      'phil': 'phil',
      'kai': 'kai',
      'franco': 'franco',
      'frank': 'frank',
      'lee': 'lee',
      'derek': 'derek',
      'hadi': 'hadi',
      'nick': 'nick',
      'flex': 'flex',
      'sergio': 'sergio'
    };

    const mappedKey = bodybuilderKeyMap[bodybuilder];

    if (mappedKey && bodybuilderWorkouts[mappedKey]) {
      const workoutData = bodybuilderWorkouts[mappedKey];
      console.log(`DEBUG: Found bodybuilder data for ${bodybuilder} -> ${mappedKey}`);
      
      // Defensive check for weeklySchedule
      if (!workoutData.weeklySchedule || !Array.isArray(workoutData.weeklySchedule)) {
        console.error(`DEBUG: Invalid weeklySchedule for ${mappedKey}:`, workoutData.weeklySchedule);
        throw new Error(`Invalid weeklySchedule data for bodybuilder: ${mappedKey}`);
      }
      
      console.log(`DEBUG: Weekly schedule has ${workoutData.weeklySchedule.length} days`);
      console.log(`DEBUG: Training days:`, workoutData.weeklySchedule.filter(day => day.exercises && day.exercises.length > 0).length);

      return {
        weeklySchedule: workoutData.weeklySchedule.map(day => {
          // Defensive check for day structure
          if (!day || !day.exercises || !Array.isArray(day.exercises)) {
            console.error(`DEBUG: Invalid day structure:`, day);
            throw new Error(`Invalid day structure in bodybuilder data: ${mappedKey}`);
          }
          
          return {
            day: day.day,
            focus: day.bodyParts ? day.bodyParts.join(' & ') : 'Full Body',
            exercises: day.exercises.map(exercise => ({
              name: exercise.name,
              sets: parseInt(exercise.sets),
              reps: exercise.reps,
              restBetweenSets: exercise.restTime || '60s'
            }))
          };
        }),
        estimatedTimePerSession: workoutData.estimatedTimePerSession
      };
    }

    // Fallback to a generic intermediate program if bodybuilder not found
    return {
      weeklySchedule: [
        {
          day: 'Monday',
          focus: 'Chest & Triceps',
          exercises: [
            { name: 'Bench Press', sets: 4, reps: '8-10', restBetweenSets: '90s' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restBetweenSets: '75s' },
            { name: 'Cable Flyes', sets: 3, reps: '12-15', restBetweenSets: '60s' },
            { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', restBetweenSets: '60s' }
          ]
        },
        {
          day: 'Tuesday',
          focus: 'Back & Biceps',
          exercises: [
            { name: 'Pull-ups', sets: 4, reps: '8-10', restBetweenSets: '90s' },
            { name: 'Barbell Rows', sets: 3, reps: '10-12', restBetweenSets: '75s' },
            { name: 'Cable Rows', sets: 3, reps: '12-15', restBetweenSets: '60s' },
            { name: 'Barbell Curls', sets: 3, reps: '10-12', restBetweenSets: '60s' }
          ]
        },
        {
          day: 'Thursday',
          focus: 'Legs',
          exercises: [
            { name: 'Squats', sets: 4, reps: '8-10', restBetweenSets: '2min' },
            { name: 'Romanian Deadlifts', sets: 3, reps: '10-12', restBetweenSets: '90s' },
            { name: 'Leg Press', sets: 3, reps: '12-15', restBetweenSets: '75s' },
            { name: 'Calf Raises', sets: 4, reps: '15-20', restBetweenSets: '60s' }
          ]
        },
        {
          day: 'Friday',
          focus: 'Shoulders & Core',
          exercises: [
            { name: 'Overhead Press', sets: 4, reps: '8-10', restBetweenSets: '90s' },
            { name: 'Lateral Raises', sets: 3, reps: '12-15', restBetweenSets: '60s' },
            { name: 'Rear Delt Flyes', sets: 3, reps: '12-15', restBetweenSets: '60s' },
            { name: 'Plank', sets: 3, reps: '60s', restBetweenSets: '60s' }
          ]
        }
      ],
      estimatedTimePerSession: '60-75 minutes'
    };
  }

  /**
   * Updates multiple exercise sets in a single transaction.
   */
  static async batchUpdateExerciseSets(
    updates: Array<Pick<ExerciseSet, 'id' | 'target_sets' | 'target_reps' | 'rest_period'> & { exercise_id: string }>
  ): Promise<boolean> {
    try {
      console.log(`[WorkoutService] Batch updating ${updates.length} exercise sets.`);
      
      // Supabase's upsert can be used for batch updates.
      // We need to ensure we only pass the columns we want to update.
      const updateData = updates.map(set => ({
        id: set.id,
        exercise_id: set.exercise_id,
        target_sets: set.target_sets,
        target_reps: set.target_reps,
        rest_period: set.rest_period,
      }));

      const { error } = await supabase
        .from('exercise_sets')
        .upsert(updateData);

      if (error) {
        console.error(`[WorkoutService] Error during batch update of exercise sets:`, error);
        throw error;
      }

      console.log(`[WorkoutService] Successfully batch updated exercise sets.`);
      return true;
    } catch (error) {
      console.error(`[WorkoutService] Exception in batchUpdateExerciseSets:`, error);
      return false;
    }
  }

  /**
   * Enhance input with comprehensive user data from database
   */
  private static async enhanceInputWithUserData(input: CreatePlanInput): Promise<CreatePlanInput> {
    try {
      console.log('[WorkoutService] Fetching user profile and body analysis data...');
      
      // Fetch user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', input.userId)
        .single();

      if (profileError) {
        console.error('[WorkoutService] Error fetching profile:', profileError);
        return input; // Return original input if profile fetch fails
      }

      // Fetch latest body analysis data
      const { data: bodyAnalysis, error: analysisError } = await supabase
        .from('body_analysis')
        .select('*')
        .eq('user_id', input.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (analysisError && analysisError.code !== 'PGRST116') {
        console.error('[WorkoutService] Error fetching body analysis:', analysisError);
      }

      // Calculate age from birthday
      let age = input.age;
      if (profile.birthday) {
        const birthDate = new Date(profile.birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        // Adjust age if birthday hasn't occurred this year yet
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      // Enhance input with fetched data
      const enhancedInput: CreatePlanInput = {
        ...input,
        age,
        primaryGoal: input.primaryGoal || profile.primary_goal || undefined,
        bodyFat: input.bodyFat || profile.body_fat || undefined,
        weightTrend: input.weightTrend || profile.weight_trend || undefined,
        exerciseFrequency: input.exerciseFrequency || profile.exercise_frequency || undefined,
        workoutFrequency: input.workoutFrequency || profile.workout_frequency || undefined,
        activityLevel: input.activityLevel || profile.activity_level || undefined,
        bodyAnalysis: input.bodyAnalysis || (bodyAnalysis ? {
          chest_rating: bodyAnalysis.chest_rating,
          arms_rating: bodyAnalysis.arms_rating,
          back_rating: bodyAnalysis.back_rating,
          legs_rating: bodyAnalysis.legs_rating,
          waist_rating: bodyAnalysis.waist_rating,
          overall_rating: bodyAnalysis.overall_rating,
          strongest_body_part: bodyAnalysis.strongest_body_part,
          weakest_body_part: bodyAnalysis.weakest_body_part,
          ai_feedback: bodyAnalysis.ai_feedback,
        } : undefined),
      };

      // DEBUG: Log the workout frequency specifically
      console.log('[WorkoutService] DEBUG - Workout frequency in enhanceInputWithUserData:', {
        inputWorkoutFrequency: input.workoutFrequency,
        profileWorkoutFrequency: profile.workout_frequency,
        finalWorkoutFrequency: enhancedInput.workoutFrequency,
        profileData: {
          id: profile.id,
          workout_frequency: profile.workout_frequency,
          training_level: profile.training_level
        }
      });

      console.log('[WorkoutService] Enhanced input with user data:', enhancedInput);
      return enhancedInput;
    } catch (error) {
      console.error('[WorkoutService] Error enhancing input with user data:', error);
      return input; // Return original input if enhancement fails
    }
  }

  /**
   * Calculate volume landmarks based on training level
   */
  private static calculateVolumeLandmarks(trainingLevel: string) {
    // Based on RP recommendations
    const landmarks = {
      chest: { MEV: 8, MAV: 12, MRV: 20 },
      back: { MEV: 10, MAV: 16, MRV: 25 },
      legs: { MEV: 12, MAV: 18, MRV: 25 },
      shoulders: { MEV: 8, MAV: 14, MRV: 22 },
      biceps: { MEV: 6, MAV: 12, MRV: 18 },
      triceps: { MEV: 6, MAV: 12, MRV: 18 }
    };

    // Adjust based on training level
    const multiplier = trainingLevel === 'beginner' ? 0.8 :
                      trainingLevel === 'intermediate' ? 1 : 1.2;

    return Object.entries(landmarks).reduce((acc, [muscle, values]) => ({
      ...acc,
      [muscle]: {
        MEV: Math.round(values.MEV * multiplier),
        MAV: Math.round(values.MAV * multiplier),
        MRV: Math.round(values.MRV * multiplier)
      }
    }), {});
  }

  /**
   * Create training splits for a workout plan
   */
  private static async createTrainingSplits(planId: string, weeklySchedule: any[]) {
    try {
      const splits = weeklySchedule.map((day, index) => {
        const focus = Array.isArray(day.focus) ? day.focus : [day.focus];
        return {
          plan_id: planId,
          name: focus.join(', '), // Create a name from all focus areas
          frequency_per_week: 1, // Will be updated based on similar focus areas
          order_in_week: index + 1,
          focus_areas: focus,
        };
      });

      // Count frequency of similar focus areas
      const focusFrequency = splits.reduce((acc, split) => {
        split.focus_areas.forEach((focus: string) => {
          acc[focus] = (acc[focus] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      // Update frequency based on similar focus areas
      const updatedSplits = splits.map(split => ({
        ...split,
        frequency_per_week: Math.max(...split.focus_areas.map((f: string) => focusFrequency[f]))
      }));

      const { error } = await supabase
        .from('training_splits')
        .insert(updatedSplits);

      if (error) {
        console.error('[WorkoutService] Supabase error creating training splits:', JSON.stringify(error, null, 2));
        throw error;
      }
    } catch (error) {
      console.error('[WorkoutService] Error in createTrainingSplits function:', error);
      throw error; // re-throw to be caught by createAIPlan's catch block
    }
  }

  /**
   * Create the workout session and the exercise sets for it (with improved exercise handling)
   */
  private static async createWorkoutSessionsAndSets(planId: string, splits: any[]) {
    console.log('[WorkoutService] Creating workout sessions and sets for plan:', planId);
    console.log('[WorkoutService] Splits:', JSON.stringify(splits, null, 2));

    // Check if supabase client is available
    if (!supabase) {
      console.error('[WorkoutService] Supabase client not initialized. Check environment variables.');
      return;
    }

    for (let index = 0; index < splits.length; index++) {
      const splitData = splits[index];
      const focusAreas = splitData.focus ? (Array.isArray(splitData.focus) ? splitData.focus : [splitData.focus]) : [];
      const splitName = splitData.focus || splitData.workout_type || `Day ${index + 1} Workout`;
      console.log(`[WorkoutService] Processing split "${splitName}" with focus:`, focusAreas);
      
      // Create the split for the day
      const { data: split, error: splitError } = await supabase
        .from('training_splits')
        .insert({
          plan_id: planId,
          name: splitName, // Use the focus as the split name, with fallback
          order_in_week: index + 1,
          focus_areas: focusAreas,
          frequency_per_week: 1, // Assuming 1 for now
        })
        .select()
        .single();
      
      if (splitError) {
        console.error(`[WorkoutService] Error creating split for "${splitName}":`, splitError);
        continue;
      }
      console.log(`[WorkoutService] Created split:`, split);

      // Create the workout session
      if (split && splitData.exercises && splitData.exercises.length > 0) {
        // Try to insert with estimated_calories first, fall back without it if column doesn't exist
        const estimatedCalories = (splitData as any).estimatedCaloriesBurned ?? null;
        
        let sessionInsertData: any = {
          plan_id: planId,
          split_id: split.id,
          week_number: 1,
          day_number: index + 1, // Use index for day_number
          estimated_calories: estimatedCalories,
        };

        let { data: session, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert(sessionInsertData)
          .select('id')
          .single();

        // If error is about missing estimated_calories column, retry without it
        if (sessionError && sessionError.message && sessionError.message.includes('estimated_calories')) {
          console.log(`[WorkoutService] Retrying session creation without estimated_calories for "${splitName}"`);
          
          const fallbackSessionData = {
            plan_id: planId,
            split_id: split.id,
            week_number: 1,
            day_number: index + 1,
          };

          const { data: fallbackSession, error: fallbackError } = await supabase
            .from('workout_sessions')
            .insert(fallbackSessionData)
            .select('id')
            .single();

          session = fallbackSession;
          sessionError = fallbackError;
        }

        if (sessionError) {
          console.error(`[WorkoutService] Error creating session for "${splitName}":`, sessionError);
          continue;
        }
        console.log(`[WorkoutService] Created session for "${splitName}":`, session);

        // Create exercise sets for the session
        for (let exerciseIndex = 0; exerciseIndex < splitData.exercises.length; exerciseIndex++) {
          const exerciseData = splitData.exercises[exerciseIndex];
          const exercise = await this.findOrCreateExercise(planId, exerciseData.name);
          if (exercise) {
            const { error: setError } = await supabase.from('exercise_sets').insert({
                session_id: session?.id,
              exercise_id: exercise.id,
              order_in_session: exerciseIndex,
              target_sets: exerciseData.sets,
              target_reps: exerciseData.reps,
              rest_period: exerciseData.restBetweenSets || '60s',
              progression_scheme: 'double_progression', // Default progression
              });
            if (setError) {
              console.error(`[WorkoutService] Error creating exercise set for ${exerciseData.name}:`, setError);
            }
          }
        }
      }
    }
  }

  /**
   * Get a user's active workout plan (single plan)
   */
  static async getActivePlan(userId: string): Promise<any | null> {
    try {
      console.log('[WorkoutService] Getting active plans for user:', userId);
      
      // Get plans from local storage only
      const localPlans = await WorkoutLocalStore.getPlans(userId);
      console.log('[WorkoutService] Found', localPlans.length, 'plans in local storage');
      
      // Find and return the active plan
      const activePlans = localPlans.filter(plan => plan.is_active || plan.status === 'active');
      
      if (activePlans.length === 0) {
        console.log('[WorkoutService] No active plan found');
        return null;
      }
      
      if (activePlans.length > 1) {
        console.warn('[WorkoutService] Multiple active plans found, returning the most recent one:', activePlans.map(p => ({ id: p.id, name: p.name })));
        // Return the most recently created/updated plan
        const sortedPlans = activePlans.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA; // Descending order (most recent first)
        });
        return sortedPlans[0];
      }
      
      return activePlans[0];
    } catch (error) {
      console.error('[WorkoutService] Error getting active plans:', error);
      return null;
    }
  }
  
  /**
   * Get all workout plans for a user
   */
  static async getAllPlans(userId: string): Promise<any[]> {
    try {
      console.log('[WorkoutService] Getting all plans for user:', userId);
      
      // Get plans from local storage only
      const localPlans = await WorkoutLocalStore.getPlans(userId);
      console.log('[WorkoutService] Found', localPlans.length, 'plans in local storage');
      
      return localPlans;
    } catch (error) {
      console.error('[WorkoutService] Error getting all plans:', error);
      return [];
    }
  }

  /**
   * Get a single workout plan by its ID
   */
  static async getPlanById(planId: string): Promise<any | null> {
    try {
      console.log('[WorkoutService] Getting plan by ID:', planId);
      
      // First try local storage
      const localPlans = await WorkoutLocalStore.getAllPlans();
      const localPlan = localPlans.find(p => p.id === planId);
      if (localPlan) {
        console.log('[WorkoutService] Found plan in local storage:', localPlan.id);
        console.log('[WorkoutService] Plan details:', {
          name: localPlan.name,
          weeklyScheduleLength: localPlan.weeklySchedule?.length || 0,
          weekly_scheduleLength: localPlan.weekly_schedule?.length || 0,
          trainingDays: localPlan.weeklySchedule?.filter(day => day.exercises?.length > 0)?.length || 0,
          firstDay: localPlan.weeklySchedule?.[0]?.day,
          firstDayExercises: localPlan.weeklySchedule?.[0]?.exercises?.length || 0,
          sampleDays: localPlan.weeklySchedule?.slice(0, 3)?.map(day => ({
            day: day.day,
            focus: day.focus,
            exercises: day.exercises?.length || 0
          })) || [],
          hasWeeklySchedule: !!localPlan.weeklySchedule,
          hasWeekly_schedule: !!localPlan.weekly_schedule
        });
        return localPlan;
      }
      
      // If not in local storage, try database for remote plans
      if (supabase && this.isValidUUID(planId)) {
        try {
          const { data, error } = await supabase
            .from('workout_plans')
            .select('*')
            .eq('id', planId)
            .single();

          if (error) {
            // It's common for 'single' to error if no row is found
            if (error.code !== 'PGRST116') {
              console.error('[WorkoutService] Error fetching plan by ID:', error);
            }
            return null;
          }
          
          if (data) {
            console.log('[WorkoutService] Found plan in database, syncing to local storage');
            // Convert database plan to local storage format and save it
            try {
              const planForLocalStorage = {
                ...data,
                weekly_schedule: data.weekly_schedule || data.weeklySchedule,
                weeklySchedule: data.weeklySchedule || data.weekly_schedule,
                is_active: data.status === 'active',
                user_id: data.user_id
              };
              
              // Add to local storage for future access
              await WorkoutLocalStore.addPlan(data.user_id, planForLocalStorage);
              console.log('[WorkoutService] Successfully synced plan to local storage');
            } catch (syncError) {
              console.warn('[WorkoutService] Failed to sync plan to local storage:', syncError);
              // Continue anyway, the plan is still available from database
            }
          }
          
          return data;
        } catch (dbError) {
          console.error('[WorkoutService] Database error fetching plan:', dbError);
          return null;
        }
      } else {
        console.log(`[WorkoutService] Skipping database query for plan ${planId} (${!supabase ? 'no supabase' : 'invalid UUID'})`);
        return null;
      }
    } catch (error) {
      console.error('[WorkoutService] Error in getPlanById:', error);
      return null;
    }
  }

  /**
   * Get training splits for a plan
   */
  static async getTrainingSplits(planId: string): Promise<TrainingSplit[]> {
    try {
      // Check if planId is a valid UUID before querying database
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);

      if (!supabase || !isValidUUID) {
        console.log(`[WorkoutService] Skipping database query for training splits with plan ${planId} (${!supabase ? 'no supabase' : 'invalid UUID'})`);
        return [];
      }

      const { data, error } = await supabase
        .from('training_splits')
        .select('*')
        .eq('plan_id', planId)
        .order('order_in_week');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching training splits:', error);
      return [];
    }
  }

  /**
   * Get all workout sessions for a plan
   */
  static async getSessionsForPlan(planId: string): Promise<any[]> {
    try {
      // Check if planId is a valid UUID before querying database
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
      
      if (!supabase || !isValidUUID) {
        console.log(`[WorkoutService] Skipping database query for plan ${planId} (${!supabase ? 'no supabase' : 'invalid UUID'})`);
        // Provide mock sessions or return empty for local/non-UUID plans
        return [];
      }
      
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          training_splits (*)
        `)
        .eq('plan_id', planId)
        .order('day_number');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sessions for plan:', error);
      return [];
    }
  }

  /**
   * Get all exercise sets for a session, including exercise details.
   */
  static async getExerciseSetsForSession(sessionId: string): Promise<any[]> {
    try {
      // Check if sessionId is a valid UUID before querying database
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
      
      if (!supabase || !isValidUUID) {
        console.log(`[WorkoutService] Skipping database query for session ${sessionId} (${!supabase ? 'no supabase' : 'invalid UUID'})`);
        return [];
      }
      
      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
          *,
          exercise:exercises (*)
        `)
        .eq('session_id', sessionId)
        .order('order_in_session');

      if (error) {
        console.error(`[WorkoutService] Error fetching exercise sets for session ${sessionId}:`, error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching exercise sets for session:', error);
      return [];
    }
  }

  /**
   * Log a completed exercise set
   */
  static async logExerciseSet(
    setId: string,
    reps: number,
    weight: number | null,
    rpe: number | null,
    notes?: string
  ): Promise<ExerciseLog | null> {
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .insert({
          set_id: setId,
          actual_reps: reps,
          actual_weight: weight,
          actual_rpe: rpe,
          notes: notes
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging exercise set:', error);
      return null;
    }
  }

  /**
   * Track volume for a muscle group in a week
   */
  static async trackVolume(
    planId: string,
    weekNumber: number,
    muscleGroup: string,
    weeklySets: number,
    averageRPE?: number,
    recoveryRating?: number
  ): Promise<VolumeTracking | null> {
    try {
      // Get current volume landmarks
      const { data: plan } = await supabase
        .from('workout_plans')
        .select('volume_landmarks')
        .eq('id', planId)
        .single();

      if (!plan) throw new Error('Plan not found');

      // Determine volume category based on landmarks
      const landmarks = plan.volume_landmarks[muscleGroup];
      const volumeCategory = weeklySets <= landmarks.MEV ? 'MEV' :
                           weeklySets <= landmarks.MAV ? 'MAV' : 'MRV';

      const { data, error } = await supabase
        .from('volume_tracking')
        .insert({
          plan_id: planId,
          week_number: weekNumber,
          muscle_group: muscleGroup,
          weekly_sets: weeklySets,
          average_rpe: averageRPE,
          recovery_rating: recoveryRating,
          volume_category: volumeCategory
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error tracking volume:', error);
      return null;
    }
  }

  /**
   * Update workout plan status
   */
  static async updatePlanStatus(
    planId: string,
    status: 'active' | 'completed' | 'archived'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .update({ status })
        .eq('id', planId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating plan status:', error);
      return false;
    }
  }

  /**
   * Updates the details of a specific workout plan.
   */
  static async updatePlanDetails(
    planId: string,
    updates: Partial<Pick<WorkoutPlan, 'name' | 'training_level' | 'goal_fat_loss' | 'goal_muscle_gain'>>
  ): Promise<WorkoutPlan | null> {
    try {
      console.log(`[WorkoutService] Updating plan ${planId} with:`, updates);
      const { data, error } = await supabase
        .from('workout_plans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        console.error(`[WorkoutService] Error updating plan ${planId}:`, error);
        throw error;
      }

      console.log(`[WorkoutService] Successfully updated plan ${planId}.`);
      return data;
    } catch (error) {
      console.error(`[WorkoutService] Exception in updatePlanDetails for planId ${planId}:`, error);
      return null;
    }
  }

  static async updateSessionName(sessionId: string, name: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('training_splits')
        .update({ name })
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error updating session name for session ${sessionId}:`, error);
      return false;
    }
  }

  static async addExerciseToSession(
    sessionId: string, 
    exerciseName: string, 
    sets: number, 
    reps: string, 
    rest: string
  ): Promise<boolean> {
    try {
      // Check if supabase client is available
      if (!supabase) {
        console.error('[WorkoutService] Supabase client not initialized. Check environment variables.');
        return false;
      }
      
      const exercise = await this.findOrCreateExercise('', exerciseName); // planId is not needed here
      if (exercise) {
        const { error } = await supabase.from('exercise_sets').insert({
          session_id: sessionId,
          exercise_id: exercise.id,
          order_in_session: 99, // You might want a better way to order this
          target_sets: sets,
          target_reps: reps,
          rest_period: rest,
          progression_scheme: 'double_progression',
        });
        if (error) throw error;
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error adding exercise to session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get the number of workout plans for a user.
   */
  static async getPlanCountForUser(userId: string): Promise<number> {
    try {
      // For testing purposes, always return 0 to allow creating new plans
      console.log('[WorkoutService] getPlanCountForUser: Returning 0 to allow creating new plans');
      return 0;
      
      // Original implementation:
      /*
      const { count, error } = await supabase
        .from('workout_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching plan count:', error);
        throw error;
      }
      return count ?? 0;
      */
    } catch (error) {
      console.error('Exception in getPlanCountForUser:', error);
      return 0; // Return 0 in case of an exception to be safe
    }
  }

    /**
   * Deletes a workout plan and all its related data.
   */
  static async deletePlan(planId: string): Promise<boolean> {
    try {
      console.log(`[WorkoutService] Deleting plan with ID: ${planId}`);

      // Check if this is a local plan (starts with "local-", "ai-", or "bb-" for bodybuilder plans)
      if (planId.startsWith('local-') || planId.startsWith('ai-') || planId.startsWith('bb-')) {
        console.log(`[WorkoutService] Deleting local plan: ${planId}`);

        // Remove from WorkoutLocalStore
        try {
          await WorkoutLocalStore.deletePlan(planId);
          console.log(`[WorkoutService] Removed plan from local storage: ${planId}`);
        } catch (localStoreErr) {
          console.warn(`[WorkoutService] Error removing plan from local store: ${localStoreErr}`);
        }

        console.log(`[WorkoutService] Successfully deleted local plan.`);
        return true;
      }

      // Check if this is a valid UUID format before attempting database deletion
      if (!this.isValidUUID(planId)) {
        console.warn(`[WorkoutService] Plan ID "${planId}" is not a valid UUID and not a recognized local plan format. Cannot delete.`);
        return false;
      }

      // For database plans, use Supabase
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error(`[WorkoutService] Error deleting plan ${planId}:`, error);
        throw error;
      }

      console.log(`[WorkoutService] Successfully deleted plan ${planId}`);
      return true;
    } catch (error) {
      console.error(`[WorkoutService] Exception in deletePlan for planId ${planId}:`, error);
      return false;
    }
  }

  /**
   * Get volume tracking data for analysis
   */
  static async getVolumeData(
    planId: string,
    muscleGroup?: string
  ): Promise<VolumeTracking[]> {
    try {
      // Check if planId is a valid UUID before querying database
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);

      if (!supabase || !isValidUUID) {
        console.log(`[WorkoutService] Skipping database query for volume data with plan ${planId} (${!supabase ? 'no supabase' : 'invalid UUID'})`);
        return [];
      }

      let query = supabase
        .from('volume_tracking')
        .select('*')
        .eq('plan_id', planId)
        .order('week_number');

      if (muscleGroup) {
        query = query.eq('muscle_group', muscleGroup);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching volume data:', error);
      return [];
    }
  }

  /**
   * Finds or creates an exercise for a specific plan.
   * This version assumes exercise names are globally unique.
   */
  static async findOrCreateExercise(planId: string, exerciseName: string): Promise<Exercise | null> {
    try {
      // Check if supabase client is available
      if (!supabase) {
        console.error('[WorkoutService] Supabase client not initialized. Check environment variables.');
        return null;
      }
      
      // Step 1: Check if an exercise with this name already exists, regardless of the plan.
      let { data: existingExercise, error: findError } = await supabase
        .from('exercises')
        .select('*')
        .eq('name', exerciseName)
        .maybeSingle(); // Use maybeSingle to avoid errors if the exercise doesn't exist.

      if (findError) {
        console.error(`[WorkoutService] Error finding exercise "${exerciseName}":`, findError);
        throw findError;
      }
  
      // Step 2: If the exercise already exists, return it immediately.
      if (existingExercise) {
        console.log(`[WorkoutService] Found existing exercise: ${exerciseName}`);
        return existingExercise;
      }
      
      // Step 3: If it doesn't exist, create it as a new global exercise.
      console.log(`[WorkoutService] Exercise not found. Creating new global exercise: ${exerciseName}`);
      
      const exerciseInfo = getExerciseInfo(exerciseName);
      
      const newExerciseData = {
        plan_id: null, // Create as a global exercise
        name: exerciseName,
        category: exerciseInfo ? this.mapCategory(exerciseInfo.category) : 'accessory',
        muscle_groups: exerciseInfo?.muscleGroups ?? [],
        difficulty: exerciseInfo?.difficulty.toLowerCase() as 'beginner' | 'intermediate' | 'advanced' ?? 'intermediate',
        equipment_needed: exerciseInfo?.equipment ? [exerciseInfo.equipment] : [],
        is_custom: false,
      };
  
      const { data: createdExercise, error: createError } = await supabase
        .from('exercises')
        .insert(newExerciseData)
        .select()
        .single();
  
      if (createError) {
        console.error(`[WorkoutService] Error creating exercise ${exerciseName}:`, createError);
        throw createError;
      }
  
      console.log(`[WorkoutService] Successfully created exercise ${exerciseName}`);
      return createdExercise;
    } catch (error) {
      console.error(`[WorkoutService] Exception in findOrCreateExercise for ${exerciseName}:`, error);
      return null;
    }
  }

  private static mapCategory(category: string): 'compound' | 'isolation' | 'accessory' {
    switch (category) {
      case 'Push':
      case 'Pull':
      case 'Legs':
        return 'compound';
      case 'Core':
      case 'Cardio':
        return 'accessory';
      default:
        return 'accessory';
    }
  }

  /**
   * Get recent workout history with detailed metrics
   */
  static async getRecentWorkoutHistory(userId: string, limit: number = 5): Promise<any[]> {
    try {
      // Check if supabase client is available
      if (!supabase) {
        console.error('[WorkoutService] Supabase client not initialized. Check environment variables.');
        return [];
      }
      
      // 1. Get recent completed sessions for the user
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          completed_at,
          training_splits!inner (name, focus_areas)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      // 2. For each session, get the exercise logs with details
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session: any) => {
          // Get all exercise sets for this session
          const { data: exerciseSets } = await supabase
            .from('exercise_sets')
            .select(`
              id,
              target_sets,
              target_reps,
              exercise:exercises!inner (id, name, primary_muscle_group)
            `)
            .eq('session_id', session.id);

          if (!exerciseSets || exerciseSets.length === 0) {
            return {
              ...session,
              exercises: [],
              totalVolume: 0,
              date: session.completed_at,
            };
          }

          // Get logs for all sets in this session
          const setIds = exerciseSets.map((set: any) => set.id);
          const { data: logs } = await supabase
            .from('exercise_logs')
            .select('*')
            .in('set_id', setIds);

          // Group logs by exercise
          const exercisesMap = new Map();
          let totalVolume = 0;

          if (logs && logs.length > 0) {
            logs.forEach((log: any) => {
              const set = exerciseSets.find((s: any) => s.id === log.set_id);
              if (!set || !set.exercise || !Array.isArray(set.exercise) || set.exercise.length === 0) return;

              const exerciseData = set.exercise[0]; // Get the first exercise from the array
              const exerciseId = exerciseData.id;
              if (!exercisesMap.has(exerciseId)) {
                exercisesMap.set(exerciseId, {
                  name: exerciseData.name,
                  muscleGroup: exerciseData.primary_muscle_group || 'Unknown', // Use primary muscle group
                  sets: [],
                  totalReps: 0,
                  totalWeight: 0,
                  volume: 0, // Volume = total weight lifted (weight × reps)
                });
              }

              const exerciseEntry = exercisesMap.get(exerciseId);
              exerciseEntry.sets.push({
                reps: log.actual_reps,
                weight: log.actual_weight || 0,
              });
              
              exerciseEntry.totalReps += log.actual_reps;
              const weight = log.actual_weight || 0;
              exerciseEntry.totalWeight += weight;
              
              const setVolume = log.actual_reps * weight;
              exerciseEntry.volume += setVolume;
              totalVolume += setVolume;
            });
          }

          return {
            id: session.id,
            name: session.training_splits?.name || 'Workout',
            focusAreas: session.training_splits?.focus_areas || [],
            date: session.completed_at,
            exercises: Array.from(exercisesMap.values()),
            totalVolume: Math.round(totalVolume),
            exerciseCount: exercisesMap.size,
            duration: WorkoutService.estimateWorkoutDuration(exercisesMap.size),
          };
        })
      );

      return sessionsWithDetails;
    } catch (error) {
      console.error('Error fetching recent workout history:', error);
      return [];
    }
  }

  /**
   * Estimate workout duration based on exercise count
   */
  private static estimateWorkoutDuration(exerciseCount: number): string {
    // Rough estimate: 5-10 minutes per exercise including rest times
    const minutes = exerciseCount * 7; // Average of 7 minutes per exercise
    return `${minutes} min`;
  }



  /**
   * Clear all workout plans from local storage
   */
  static async clearAllWorkoutPlans(): Promise<boolean> {
    try {
      console.log('[WorkoutService] Clearing all workout plans from local storage');
      
      // Clear through WorkoutLocalStore
      await WorkoutLocalStore.clearAllPlans();
      console.log('[WorkoutService] Cleared all plans from local storage');
      
      // Also try to clear from AsyncStorage directly for redundancy
      try {
        if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
          (globalThis as any).localStorage.setItem('workout_plans', JSON.stringify([]));
        } else {
          await AsyncStorage.setItem('workout_plans', JSON.stringify([]));
        }
        console.log('[WorkoutService] Also cleared AsyncStorage directly');
      } catch (storageErr) {
        console.warn('[WorkoutService] Could not clear AsyncStorage directly:', storageErr);
      }
      
      // Clear all workout plans from WorkoutLocalStore
      try {
        await WorkoutLocalStore.clearAllPlans();
      } catch (localStoreErr) {
        console.warn('[WorkoutService] Could not clear WorkoutLocalStore:', localStoreErr);
      }
      
      console.log('[WorkoutService] Successfully cleared all workout plans');
      return true;
    } catch (error) {
      console.error('[WorkoutService] Error clearing workout plans:', error);
      return false;
    }
  }

  /**
   * Get the count of workout plans in local storage
   */
  static async getPlanCount(userId?: string): Promise<number> {
    try {
      if (userId) {
        const plans = await WorkoutLocalStore.getPlans(userId);
        return plans.length;
      } else {
        const allPlans = await WorkoutLocalStore.getAllPlans();
        return allPlans.length;
      }
    } catch (error) {
      console.error('[WorkoutService] Error getting plan count:', error);
      return 0;
    }
  }

  /**
   * Set a workout plan as the active plan for a user
   */
  static async setActivePlan(userId: string, planId: string): Promise<boolean> {
    try {
      console.log(`[WorkoutService] Setting plan ${planId} as active for user ${userId}`);
      
      // Try to update the database first if it's a valid UUID
      if (this.isValidUUID(planId)) {
        try {
          const response = await fetch(`${this.API_URL}/api/set-active-plan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              planId
            }),
          });

          if (response.ok) {
            console.log(`[WorkoutService] Successfully updated database for plan ${planId}`);
          } else {
            console.warn(`[WorkoutService] Failed to update database for plan ${planId}, continuing with local storage`);
          }
        } catch (dbError) {
          console.warn(`[WorkoutService] Database update failed for plan ${planId}, continuing with local storage:`, dbError);
        }
      }
      
      // Update local storage
      const allPlans = await WorkoutLocalStore.getPlans(userId);
      
      // Find the target plan
      const targetPlan = allPlans.find(plan => plan.id === planId);
      if (!targetPlan) {
        console.error(`[WorkoutService] Plan ${planId} not found for user ${userId}`);
        return false;
      }
      
      // Deactivate all other plans
      const updatedPlans = allPlans.map(plan => ({
        ...plan,
        is_active: plan.id === planId,
        status: (plan.id === planId ? 'active' : 'archived') as 'active' | 'archived' | 'completed'
      }));
      
      // Save the updated plans
      await WorkoutLocalStore.savePlans(userId, updatedPlans);
      
      console.log(`[WorkoutService] Successfully set plan ${planId} as active`);
      return true;
    } catch (error) {
      console.error('[WorkoutService] Error setting active plan:', error);
      return false;
    }
  }

  /**
   * Get the next workout session for a user based on their active plan
   */
  static async getNextWorkoutSession(userId: string): Promise<any | null> {
    try {
      console.log('[WorkoutService] Getting next workout session for user:', userId);

      // Get active plan
      const activePlan = await this.getActivePlan(userId);
      if (!activePlan) {
        console.log('[WorkoutService] No active plan found');
        return null;
      }
      
      console.log('[WorkoutService] Active plan found:', activePlan.name, activePlan.id);
      console.log('[WorkoutService] Active plan type:', activePlan.type);
      console.log('[WorkoutService] Active plan weeklySchedule length:', activePlan.weeklySchedule?.length || 0);
      if (activePlan.weeklySchedule?.length > 0) {
        console.log('[WorkoutService] First day in schedule:', JSON.stringify(activePlan.weeklySchedule[0], null, 2));
      }

      // Check if active plan has a valid UUID (skip database queries for bodybuilder plans)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activePlan.id);

      if (!supabase || !isValidUUID) {
        console.log(`[WorkoutService] Skipping database queries for next workout session with plan ${activePlan.id} (${!supabase ? 'no supabase' : 'invalid UUID'})`);
        
        // For local plans (bodybuilder or custom), return a simple next session based on the local plan data
        if (activePlan.weeklySchedule && activePlan.weeklySchedule.length > 0) {
          console.log('[WorkoutService] Processing local plan with weekly schedule');
          // Get completed sessions for local workout progression
          let completedSessions: any[] = [];
          try {
            completedSessions = await WorkoutHistoryService.getCompletedSessions(userId);
          } catch (error) {
            console.log('[WorkoutService] Could not fetch completed sessions for local plan, defaulting to first day');
          }
          
          // Calculate which day should be next based on completed sessions
          const completedLocalSessions = completedSessions.filter(session => 
            session.plan_id === activePlan.id || session.sessionId?.startsWith('local-session-')
          );
          
          // Determine the next workout day index (cycle through the weekly schedule)
          const nextDayIndex = completedLocalSessions.length % activePlan.weeklySchedule.length;
          const nextWorkoutDay = activePlan.weeklySchedule[nextDayIndex];
          
          // Support both bodybuilder plans (focus) and custom plans (dayName)
          const splitName = nextWorkoutDay.focus || nextWorkoutDay.dayName || 'Workout';
          
          console.log(`[WorkoutService] Next local workout: day ${nextDayIndex + 1}/${activePlan.weeklySchedule.length} - ${splitName}`);
          
          const nextSession = {
            sessionId: `local-session-${Date.now()}`,
            splitName: splitName,
            focusAreas: [splitName],
            dayNumber: nextDayIndex + 1,
            weekNumber: Math.floor(completedLocalSessions.length / activePlan.weeklySchedule.length) + 1,
            estimatedTime: activePlan.estimatedTimePerSession || activePlan.estimated_time_per_session || '60 minutes',
            exercises: nextWorkoutDay.exercises || []
          };
          
          console.log('[WorkoutService] Returning next session:', JSON.stringify(nextSession, null, 2));
          return nextSession;
        } else {
          console.log('[WorkoutService] No weekly schedule found in active plan');
          console.log('[WorkoutService] Active plan structure:', JSON.stringify(activePlan, null, 2));
        }
        return null;
      }

      // Get completed sessions to determine the last completed workout
      const completedSessions = await WorkoutHistoryService.getCompletedSessions(userId);
      console.log('[WorkoutService] Found completed sessions:', completedSessions.length);

      // Get all training splits for the active plan
      const { data: splits, error: splitsError } = await supabase
        .from('training_splits')
        .select('id, name, order_in_week, focus_areas')
        .eq('plan_id', activePlan.id)
        .order('order_in_week');

      if (splitsError) {
        console.error('[WorkoutService] Error fetching splits:', splitsError);
        return null;
      }

      if (!splits || splits.length === 0) {
        console.log('[WorkoutService] No training splits found');
        return null;
      }

      // Get all workout sessions for the active plan
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, split_id, day_number, week_number, status, completed_at')
        .eq('plan_id', activePlan.id)
        .order('week_number')
        .order('day_number');

      if (sessionsError) {
        console.error('[WorkoutService] Error fetching sessions:', sessionsError);
        return null;
      }

      if (!sessions || sessions.length === 0) {
        console.log('[WorkoutService] No workout sessions found');
        return null;
      }

      // Find the next session to complete
      // First, find the last completed session
      const lastCompletedSession = completedSessions
        .filter(session => session.week_number !== null && session.day_number !== null)
        .sort((a, b) => {
          if (a.week_number !== b.week_number) {
            return (b.week_number || 0) - (a.week_number || 0);
          }
          return (b.day_number || 0) - (a.day_number || 0);
        })[0];

      let nextSession;
      if (lastCompletedSession && lastCompletedSession.week_number !== null && lastCompletedSession.day_number !== null) {
        // Find the next session after the last completed one
        const nextDayNumber = lastCompletedSession.day_number + 1;
        const nextWeekNumber = lastCompletedSession.week_number;
        
        // If we've completed all days in the week, move to next week
        const maxDaysInWeek = splits.length;
        if (nextDayNumber > maxDaysInWeek) {
          nextSession = sessions.find(s => s.week_number === nextWeekNumber + 1 && s.day_number === 1);
        } else {
          nextSession = sessions.find(s => s.week_number === nextWeekNumber && s.day_number === nextDayNumber);
        }
      } else {
        // No completed sessions, start with the first session
        nextSession = sessions.find(s => s.week_number === 1 && s.day_number === 1);
      }

      if (!nextSession) {
        console.log('[WorkoutService] No next session found');
        return null;
      }

      // Get the split details for the next session
      const split = splits.find(s => s.id === nextSession.split_id);
      if (!split) {
        console.log('[WorkoutService] Split not found for session');
        return null;
      }

      return {
        sessionId: nextSession.id,
        splitName: split.name,
        focusAreas: split.focus_areas,
        dayNumber: nextSession.day_number,
        weekNumber: nextSession.week_number,
        estimatedTime: activePlan.estimated_time_per_session || '45 minutes'
      };

    } catch (error) {
      console.error('[WorkoutService] Error getting next workout session:', error);
      return null;
    }
  }

  /**
   * Get the current user ID from Supabase
   */
  private static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id || null;
    } catch (error) {
      console.error('[WorkoutService] Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Get target training days based on workout frequency
   */
  private static getTargetTrainingDays(workoutFrequency: string): number {
    switch (workoutFrequency) {
      case '2_3':
        return 3; // Use 3 days as middle ground
      case '4_5':
        return 4; // Use 4 days as middle ground
      case '6':
        return 6;
      default:
        return 4; // Default fallback
    }
  }

  /**
   * Adapt workout schedule to match user's frequency preference
   */
  private static adaptWorkoutScheduleForFrequency(
    originalSchedule: any[], 
    targetDays: number, 
    frequency: string
  ): any[] {
    const trainingDays = originalSchedule.filter(day => 
      day.exercises && day.exercises.length > 0
    );
    const restDays = originalSchedule.filter(day => 
      !day.exercises || day.exercises.length === 0
    );

    console.log(`[WorkoutService] Adapting schedule: ${trainingDays.length} training days → ${targetDays} days`);

    if (trainingDays.length === targetDays) {
      return originalSchedule; // No adaptation needed
    }

    if (trainingDays.length > targetDays) {
      // Need to reduce training days - select the most important ones
      const priorityOrder = [
        'chest', 'back', 'legs', 'shoulders', 'arms',
        'chest and back', 'upper body', 'lower body', 'full body'
      ];

      const prioritizedDays = trainingDays.sort((a, b) => {
        const aPriority = priorityOrder.findIndex(p =>
          a.focus.toLowerCase().includes(p)
        );
        const bPriority = priorityOrder.findIndex(p =>
          b.focus.toLowerCase().includes(p)
        );
        return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
      });

      const selectedDays = prioritizedDays.slice(0, targetDays);
      
      // Reconstruct schedule with selected days and rest days
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const adaptedSchedule: any[] = [];
      
      let dayIndex = 0;
      let trainingDayIndex = 0;
      
      for (const dayName of daysOfWeek) {
        if (trainingDayIndex < selectedDays.length && dayIndex % 2 === 0) {
          // Add training day
          adaptedSchedule.push({
            ...selectedDays[trainingDayIndex],
            day: dayName
          });
          trainingDayIndex++;
        } else {
          // Add rest day
          adaptedSchedule.push({
            day: dayName,
            focus: 'Rest',
            exercises: []
          });
        }
        dayIndex++;
      }

      return adaptedSchedule;
    } else {
      // Need to add training days - this is less common but could happen
      console.log(`[WorkoutService] User requested more days (${targetDays}) than template has (${trainingDays.length}). Keeping all available days.`);
      return originalSchedule;
    }
  }
}