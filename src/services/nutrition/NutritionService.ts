import { supabase } from '../supabase/client';
// import { Database } from '../../types/database';
import { mockNutritionPlan, mockPlansStore, mockMotivationalMessage } from '../../mock-data';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Update database types to include nutrition_plans
export type NutritionPlan = any;

export type FoodSuggestion = {
  food: string;
  serving_size: string;
  image_url?: string;
};

// Import environment configuration
import { environment } from '../../config/environment';
import { GeminiService } from '../ai/GeminiService';

// Base URLs for fallback system (Railway first, then local)
const getBaseUrls = () => {
  return [
    'https://gofitai-production.up.railway.app', // Railway server first (always available)
    environment.apiUrl, // Configured URL from environment
    'http://192.168.0.100:4000', // Local server fallback (only if Railway fails)
  ].filter(Boolean) as string[];
};

// Activity level multipliers for TDEE calculation
export const ACTIVITY_LEVELS = {
  sedentary: { multiplier: 1.2, label: 'Sedentary (little/no exercise)' },
  moderately_active: { multiplier: 1.55, label: 'Moderately active (moderate exercise 3-5 days/week)' },
  very_active: { multiplier: 1.725, label: 'Very active (hard exercise 6-7 days/week)' }
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

// Metabolic calculation results interface
export interface MetabolicData {
  bmr: number; // Basal Metabolic Rate
  tdee: number; // Total Daily Energy Expenditure
  activity_level: ActivityLevel;
  activity_multiplier: number;
  goal_calories: number; // Adjusted calories based on goal
  goal_adjustment: number; // Calorie adjustment (+/- from TDEE)
  goal_adjustment_reason: string; // Explanation of the calorie adjustment
  calculation_method: string;
}

// Add code to load and save plans to AsyncStorage when app starts/changes
export class NutritionService {
  static getBaseUrls = getBaseUrls;
  static API_URL = getBaseUrls()[0]; // Default to Railway, fallback handled in specific methods

  /**
   * Calculate Basal Metabolic Rate (BMR) using the Henry/Oxford equation
   * This equation provides age-specific formulas for better accuracy
   */
  static calculateBMR(
    weight: number, // in kg
    height: number, // in cm
    age: number, // in years
    gender: 'male' | 'female'
  ): number {
    if (gender === 'male') {
      if (age >= 18 && age <= 30) {
        return 14.4 * weight + 3.13 * height + 113;
      } else if (age >= 30 && age <= 60) {
        return 11.4 * weight + 5.41 * height - 137;
      } else { // 60+
        return 11.4 * weight + 5.41 * height - 256;
      }
    } else {
      if (age >= 18 && age <= 30) {
        return 10.4 * weight + 6.15 * height - 282;
      } else if (age >= 30 && age <= 60) {
        return 8.18 * weight + 5.02 * height - 11.6;
      } else { // 60+
        return 8.52 * weight + 4.21 * height + 10.7;
      }
    }
  }

  /**
   * Calculate Total Daily Energy Expenditure (TDEE) 
   * TDEE = BMR × Activity Factor
   */
  static calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    const activityMultiplier = ACTIVITY_LEVELS[activityLevel].multiplier;
    return Math.round(bmr * activityMultiplier);
  }

  /**
   * Calculate goal-adjusted calories based on body fat percentage reduction and muscle gain targets
   * 
   * Goal-Adjusted Calories Logic:
   * - Fat reduction: Based on % of body fat to lose (e.g., 5% means go from 20% to 15% body fat)
   * - Converts body fat % to actual kg using user's weight and current body fat %
   * - Assumes 12-week timeframe for fat loss goals (reasonable and sustainable)
   * - Muscle gain: 1 kg muscle gain per week = 2200 calorie surplus per week = 314 cal/day surplus
   * - Safety minimum of 1200 calories
   * - If both goals exist, net the effects
   */
  static calculateGoalCalories(
    tdee: number, 
    fitnessStrategy: string = 'maintenance', // Fitness strategy: 'bulk', 'cut', 'maintenance', 'recomp', 'maingaining'
    goalMuscleGain: number = 0,              // Legacy parameter - kept for backward compatibility
    userWeight: number = 70,                 // user's current weight in kg
    currentBodyFat: number = 20              // user's current body fat percentage
  ): { goalCalories: number; adjustment: number; adjustmentReason: string } {
    let adjustment = 0;
    let adjustmentReason = '';
    
    // Strategy-based calorie adjustments
    const strategyAdjustments = {
      bulk: { calories: 400, description: 'Aggressive muscle building' },
      cut: { calories: -400, description: 'Fat loss while preserving muscle' },
      maintenance: { calories: 0, description: 'Maintain current physique' },
      recomp: { calories: 0, description: 'Body recomposition' },
      maingaining: { calories: 150, description: 'Slow, lean muscle gains' }
    };
    
    // Get adjustment for the selected strategy
    const strategy = strategyAdjustments[fitnessStrategy as keyof typeof strategyAdjustments] || strategyAdjustments.maintenance;
    adjustment = strategy.calories;
    
    // Build explanation based on strategy
    if (adjustment === 0) {
      adjustmentReason = `${strategy.description}: Eating at maintenance calories`;
    } else if (adjustment > 0) {
      adjustmentReason = `${strategy.description}: ${adjustment} cal surplus for controlled growth`;
    } else {
      adjustmentReason = `${strategy.description}: ${Math.abs(adjustment)} cal deficit for fat loss`;
    }

    // Calculate goal calories with safety minimum
    const rawGoalCalories = tdee + adjustment;
    const goalCalories = Math.max(1200, rawGoalCalories); // Safety minimum of 1200 calories
    
    // Update reason if safety minimum was applied
    if (rawGoalCalories < 1200) {
      adjustmentReason += ` (adjusted to 1200 minimum for safety)`;
    }

    return { goalCalories, adjustment, adjustmentReason };
  }

  /**
   * Get macronutrient ratios based on fitness strategy
   * Returns protein, carbs, and fat percentages that sum to 100%
   */
  static getMacroRatiosForStrategy(fitnessStrategy: string = 'maintenance'): { protein: number; carbs: number; fat: number } {
    const macroRatios = {
      bulk: { protein: 25, carbs: 45, fat: 30 },           // High carbs for energy, moderate protein
      cut: { protein: 35, carbs: 25, fat: 40 },            // Very high protein, lower carbs, higher fat for satiety
      maintenance: { protein: 30, carbs: 35, fat: 35 },    // Balanced approach
      recomp: { protein: 35, carbs: 35, fat: 30 },         // High protein for muscle building while in deficit
      maingaining: { protein: 30, carbs: 40, fat: 30 }     // Moderate protein, good carbs for performance
    };
    
    return macroRatios[fitnessStrategy as keyof typeof macroRatios] || macroRatios.maintenance;
  }

  /**
   * Map goal_type to fitness_strategy for proper calorie adjustments
   */
  static mapGoalTypeToFitnessStrategy(goalType: string): string {
    const goalMapping = {
      'weight_loss': 'cut',
      'fat_loss': 'cut', 
      'muscle_gain': 'bulk',
      'weight_gain': 'bulk',
      'maintenance': 'maintenance',
      'body_recomposition': 'recomp'
    };
    
    return goalMapping[goalType as keyof typeof goalMapping] || 'maintenance';
  }

  /**
   * Validates and normalizes an activity level to ensure it's a valid ActivityLevel
   */
  static validateActivityLevel(activityLevel: any): ActivityLevel {
    if (typeof activityLevel === 'string' && activityLevel in ACTIVITY_LEVELS) {
      return activityLevel as ActivityLevel;
    }
    return 'moderately_active'; // Default fallback
  }

  /**
   * Get complete metabolic data for a user profile
   */
  static getMetabolicData(
    profile: any, 
    activityLevel: ActivityLevel = 'moderately_active'
  ): MetabolicData {
    const bmr = this.calculateBMR(
      profile.weight,
      profile.height,
      profile.age,
      profile.gender
    );

    const tdee = this.calculateTDEE(bmr, activityLevel);
    
    // Use fitness strategy for calorie adjustment
    const { goalCalories, adjustment, adjustmentReason } = this.calculateGoalCalories(
      tdee,
      profile.fitness_strategy || 'maintenance', // Fitness strategy
      profile.goal_muscle_gain || 0,             // Legacy parameter
      profile.weight || 70,                      // user's current weight
      profile.body_fat || 20                     // user's current body fat percentage
    );

    return {
      bmr: Math.round(bmr),
      tdee,
      activity_level: activityLevel,
      activity_multiplier: ACTIVITY_LEVELS[activityLevel].multiplier,
      goal_calories: goalCalories,
      goal_adjustment: adjustment,
      goal_adjustment_reason: adjustmentReason,
      calculation_method: 'Henry/Oxford Equation'
    };
  }

  // Fallback fetch method similar to ProgressService
  private static async fetchWithBaseFallback(path: string, init?: RequestInit): Promise<{ base: string; response: Response }> {
    const bases = getBaseUrls();

    let lastError: unknown = null;
    for (const base of bases) {
      const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
      try {
        if (__DEV__) console.log('[NutritionService] Trying base:', base, '→', url);
        const response = await fetch(url, init);
        
        // Special handling for Railway's "Route not found" errors
        if (response.status === 404) {
          const responseClone = response.clone();
          try {
            const errorData = await responseClone.json() as any;
            if (__DEV__) console.log('[NutritionService] 404 Response from', base, ':', errorData);

            // Check for Railway-specific error patterns
            if (errorData?.message?.includes('does not exist on the Railway server') ||
                errorData?.error === 'Route not found' ||
                errorData?.message === 'Route not found') {
              if (__DEV__) console.log('[NutritionService] Railway missing endpoint, trying next base...');
              continue; // Try the next base
            }
          } catch (parseError) {
            if (__DEV__) console.log('[NutritionService] Could not parse 404 response as JSON:', parseError);
            // If we can't parse response and it's from Railway, assume it's missing endpoint
            if (base.includes('railway.app')) {
              if (__DEV__) console.log('[NutritionService] Assuming Railway 404 is missing endpoint, trying next base...');
              continue;
            }
          }
        }
        
        // Consider any network-level success a success path; status handling is done by callers
        return { base, response };
      } catch (err) {
        lastError = err;
        if (__DEV__) console.log('[NutritionService] Failed to fetch from', base, ':', err);
      }
    }

    throw lastError || new Error('All API bases failed');
  }
  
  // Add initialization method to load plans from storage when app starts
  static async initializeFromStorage() {
    try {
      console.log('[NUTRITION] Initializing from storage');
      
      // Check if we need to clear stale data (hardcoded calories of 1800 indicates old data)
      const storedPlans = await this.readPersisted<any[]>('nutrition_plans');
      if (storedPlans && Array.isArray(storedPlans)) {
        // Check for stale data with old hardcoded values
        const hasStaleData = storedPlans.some(plan => 
          plan.daily_targets?.calories === 1800 || 
          plan.metabolic_calculations?.goal_calories === 1800
        );
        
        if (hasStaleData) {
          console.log('[NUTRITION] Detected stale data with old calculations, clearing cache');
          await this.clearCachedPlans();
        } else {
          console.log(`[NUTRITION] Loaded ${storedPlans.length} plans from storage`);
          mockPlansStore.plans = storedPlans;
        }
      }
      
      const deletedDefaultFlag = await this.readPersisted<boolean>('deleted_default_plan');
      if (deletedDefaultFlag !== null) {
        console.log(`[NUTRITION] Loaded deleted default plan flag: ${deletedDefaultFlag}`);
        mockPlansStore.deletedDefaultPlan = deletedDefaultFlag;
      }
    } catch (err) {
      console.error('[NUTRITION] Error initializing from storage:', err);
    }
  }
  
  // Save plans to storage whenever they change
  private static async savePlansToStorage() {
    try {
      await this.writePersisted('nutrition_plans', mockPlansStore.plans);
      await this.writePersisted('deleted_default_plan', mockPlansStore.deletedDefaultPlan);
      console.log('[NUTRITION] Saved plans to storage:', mockPlansStore.plans.length);
    } catch (err) {
      console.error('[NUTRITION] Error saving plans to storage:', err);
    }
  }

  /**
   * Clears all cached nutrition plans and forces regeneration with fresh calculations
   */
  static async clearCachedPlans(): Promise<void> {
    try {
      console.log('[NUTRITION] Clearing cached plans');
      mockPlansStore.plans = [];
      mockPlansStore.deletedDefaultPlan = false;
      await this.savePlansToStorage();
      console.log('[NUTRITION] Cached plans cleared successfully');
    } catch (err) {
      console.error('[NUTRITION] Error clearing cached plans:', err);
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
      console.error('[NUTRITION] Failed to persist key', key, err);
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
      console.error('[NUTRITION] Failed to read key', key, err);
      return null;
    }
  }

  /**
   * Generate a local mock nutrition plan and store it in the in-memory mock store.
   */
  static async generateLocalMockPlan(
    userId: string,
    options: { goal: string; dietaryPreferences: string[]; intolerances: string[] }
  ): Promise<NutritionPlan> {
    const id = `mock-${Math.random().toString(36).slice(2, 10)}`;
    const fallbackPlan: any = {
      id,
      user_id: userId,
      plan_name: 'Mock Nutrition Plan',
      goal_type: options.goal || 'maintenance',
      preferences: {
        dietary: options.dietaryPreferences || [],
        intolerances: options.intolerances || [],
      },
      status: 'active',
      created_at: new Date().toISOString(),
      daily_targets: {
        calories: options.goal === 'fat_loss' ? 1800 : options.goal === 'muscle_gain' ? 2400 : 2100,
        protein: 120,
        carbs: 230,
        fat: 60,
      },
    };
    
    // Ensure the daily_targets are properly formatted and accessible
    if (!fallbackPlan.daily_targets) {
      fallbackPlan.daily_targets = {};
    }
    
    // Make sure all required fields exist with default values
    fallbackPlan.daily_targets.calories = fallbackPlan.daily_targets.calories || 2000;
    fallbackPlan.daily_targets.protein = fallbackPlan.daily_targets.protein || 120;
    fallbackPlan.daily_targets.carbs = fallbackPlan.daily_targets.carbs || 230;
    fallbackPlan.daily_targets.fat = fallbackPlan.daily_targets.fat || 60;
    
    // Add to mock store
    mockPlansStore.plans.push(fallbackPlan);
    
    // Save to persistent storage
    await this.savePlansToStorage();
    
    return fallbackPlan;
  }
  /**
   * Fetches the user's active nutrition plan from the database.
   */
  static async getLatestNutritionPlan(
    userId: string
  ): Promise<NutritionPlan | null> {
    try {
      console.log('[NUTRITION] Using mock data for getLatestNutritionPlan');
      console.log('[NUTRITION] User ID:', userId);
      console.log('[NUTRITION] Mock store plans:', mockPlansStore.plans.map(p => ({ id: p.id, name: p.plan_name, user_id: p.user_id })));
      console.log('[NUTRITION] Deleted default plan flag:', mockPlansStore.deletedDefaultPlan);
      
      // First, try to find a plan from our mock store
      const userPlans = mockPlansStore.plans.filter(plan => plan.user_id === userId);
      console.log('[NUTRITION] User plans found:', userPlans.length);
      
      if (userPlans.length > 0) {
        // Return the most recently created plan
        const sortedPlans = [...userPlans].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        console.log('[NUTRITION] Returning most recent user plan:', sortedPlans[0].plan_name);
        return sortedPlans[0];
      }
      
      // If no plans found in the mock store and default plan wasn't deleted, return the default mock plan
      if (!mockPlansStore.deletedDefaultPlan) {
        console.log('[NUTRITION] Returning default mock plan');
      return {
        ...mockNutritionPlan,
        user_id: userId
      };
      } else {
        console.log('[NUTRITION] No plans available - default plan was deleted');
        return null;
      }
    } catch (error) {
      console.error('Error fetching latest nutrition plan:', error);
      return null;
    }
  }

  static async getNutritionPlanById(
    planId: string
  ): Promise<NutritionPlan | null> {
    try {
      console.log('[NUTRITION] Using mock data for getNutritionPlanById');
      console.log('[NUTRITION] Looking for plan ID:', planId);
      console.log('[NUTRITION] Available plans in mock store:', mockPlansStore.plans.map(p => ({ id: p.id, name: p.plan_name })));
      
      // First check the mock store for generated plans
      const storedPlan = mockPlansStore.plans.find(plan => plan.id === planId);
      if (storedPlan) {
        console.log('[NUTRITION] Found plan in mock store:', storedPlan.plan_name);
        return storedPlan;
      }
      
      // Then check for the default mock plan
      if (planId === mockNutritionPlan.id) {
        console.log('[NUTRITION] Found default mock plan');
        return mockNutritionPlan;
      }
      
      console.log('[NUTRITION] Plan not found');
      return null;
    } catch (error) {
      console.error(`Error fetching nutrition plan by id: ${planId}`, error);
      return null;
    }
  }

  static async getAllNutritionPlans(
    userId: string
  ): Promise<NutritionPlan[]> {
    try {
      console.log('[NUTRITION] Using mock data for getAllNutritionPlans');
      console.log('[NUTRITION] Current mock store plans:', mockPlansStore.plans.map(p => ({ id: p.id, name: p.plan_name, user_id: p.user_id })));
      console.log('[NUTRITION] Requesting plans for user:', userId);
      
      // Return any stored plans for this user
      const userPlans = mockPlansStore.plans
        .filter(plan => plan.user_id === userId);
      
      // Only add the default mock plan if no user plans exist and it hasn't been deleted
      if (userPlans.length === 0 && !mockPlansStore.deletedDefaultPlan) {
        console.log('[NUTRITION] Adding default mock plan to empty list');
        userPlans.push({
          ...mockNutritionPlan,
          user_id: userId
        });
      } else if (userPlans.length === 0 && mockPlansStore.deletedDefaultPlan) {
        console.log('[NUTRITION] Default mock plan was deleted, returning empty list');
      }

      // Add metabolic calculations to existing plans that don't have them
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          const age = profile.birthday ? 
            new Date().getFullYear() - new Date(profile.birthday).getFullYear() : 30;

          userPlans.forEach(plan => {
            if (!plan.metabolic_calculations) {
              const metabolicData = this.getMetabolicData({
                id: userId,
                goal_type: plan.goal_type || 'maintenance',
                height: profile.height || 170,
                weight: profile.weight || 70,
                age: age,
                gender: profile.gender || 'male',
                goal_fat_reduction: profile.goal_fat_reduction || 5,
                goal_muscle_gain: profile.goal_muscle_gain || 5,
                full_name: profile.full_name || 'User'
              }, 'moderately_active');

              plan.metabolic_calculations = {
                bmr: metabolicData.bmr,
                tdee: metabolicData.tdee,
                activity_level: metabolicData.activity_level,
                adjusted_calories: metabolicData.goal_calories,
                calorie_adjustment_reason: `Calculated for ${plan.goal_type || 'maintenance'} goal`
              };

              console.log('[NUTRITION] Added metabolic calculations to existing plan:', plan.id);
            }
          });

          // Save updated plans to storage
          await this.savePlansToStorage();
        }
      } catch (profileError) {
        console.warn('[NUTRITION] Could not fetch profile for metabolic calculations:', profileError);
      }
      
      // Simulate a delay to mimic network request
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log(`[NUTRITION] Returning ${userPlans.length} nutrition plans for user ${userId}`);
      console.log('[NUTRITION] Plans being returned:', userPlans.map(p => ({ id: p.id, name: p.plan_name })));
      return userPlans;
    } catch (error) {
      console.error('Error fetching all nutrition plans:', error);
      return [];
    }
  }

  static async getHistoricalNutritionTargets(
    planId: string
  ): Promise<any[]> {
    try {
      console.log('[NUTRITION] Using mock data for getHistoricalNutritionTargets');
      console.log('[NUTRITION] Looking for targets for plan ID:', planId);
      
      // Check for generated plans in mock store
      const storedPlan = mockPlansStore.plans.find(plan => plan.id === planId);
      if (storedPlan) {
        console.log('[NUTRITION] Found generated plan targets');
        
        // Handle both daily_targets and daily_targets_json fields
        const dailyTargets = storedPlan.daily_targets || storedPlan.daily_targets_json;
        
        if (dailyTargets) {
          return [{
            id: 'target-' + planId,
            nutrition_plan_id: planId,
            start_date: storedPlan.created_at ? storedPlan.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            end_date: null,
            daily_calories: dailyTargets.calories,
            protein_grams: dailyTargets.protein || dailyTargets.protein_grams,
            carbs_grams: dailyTargets.carbs || dailyTargets.carbs_grams,
            fat_grams: dailyTargets.fat || dailyTargets.fat_grams,
            micronutrients_targets: storedPlan.micronutrients_targets || null,
            reasoning: 'Generated plan targets.',
            created_at: storedPlan.created_at || new Date().toISOString()
          }];
        }
      }
      
      // Check for default mock plan
      if (planId === mockNutritionPlan.id) {
        console.log('[NUTRITION] Found default mock plan targets');
        return [{
          id: '550e8400-e29b-41d4-a716-446655440001',
          nutrition_plan_id: mockNutritionPlan.id,
          start_date: '2023-07-28',
          end_date: null,
          daily_calories: mockNutritionPlan.daily_targets.calories,
          protein_grams: mockNutritionPlan.daily_targets.protein_grams,
          carbs_grams: mockNutritionPlan.daily_targets.carbs_grams,
          fat_grams: mockNutritionPlan.daily_targets.fat_grams,
          micronutrients_targets: null,
          reasoning: 'Initial targets based on user profile and goals.',
          created_at: mockNutritionPlan.created_at
        }];
      }
      
      console.log('[NUTRITION] No targets found for plan');
      return [];
    } catch (error) {
      console.error(
        `Error fetching historical nutrition targets for plan ${planId}:`,
        error
      );
      return [];
    }
  }

  static async reevaluatePlan(userId: string, profile?: any): Promise<any> {
    try {
      console.log('Re-evaluating nutrition plan using mathematical calculations');
      
      // If profile is not provided, try to call the server endpoint
      if (!profile) {
        console.log('No profile provided, calling server endpoint for re-evaluation');
        try {
          const { base, response } = await this.fetchWithBaseFallback('/api/re-evaluate-plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            throw new Error(`Re-evaluation failed: ${response.statusText}`);
          }

          const result = await response.json();
          return result;
        } catch (serverError) {
          console.error('Server re-evaluation failed, using fallback calculations:', serverError);
          // Fall back to local calculations with default values
          profile = {
            weight: 70,
            height: 170,
            age: 30,
            gender: 'male',
            activity_level: 'moderately_active',
            fitness_strategy: 'maintenance',
            body_fat: 20
          };
        }
      }

      // Perform mathematical calculations
      const activityLevel = this.validateActivityLevel(profile.activity_level);
      const bmr = this.calculateBMR(
        profile.weight || 70,
        profile.height || 170, 
        profile.age || 30,
        profile.gender || 'male'
      );
      
      const tdee = this.calculateTDEE(bmr, activityLevel);
      
      // Map goal_type to fitness_strategy if needed
      let fitnessStrategy = profile.fitness_strategy;
      if (!fitnessStrategy && profile.goal_type) {
        fitnessStrategy = this.mapGoalTypeToFitnessStrategy(profile.goal_type);
      }
      
      const { goalCalories, adjustment, adjustmentReason } = this.calculateGoalCalories(
        tdee,
        fitnessStrategy || 'maintenance',
        0, // Legacy parameter
        profile.weight || 70,
        profile.body_fat || 20
      );

      // Calculate macro targets
      const macroRatios = this.getMacroRatiosForStrategy(fitnessStrategy || 'maintenance');
      const proteinGrams = Math.round((goalCalories * macroRatios.protein / 100) / 4);
      const carbsGrams = Math.round((goalCalories * macroRatios.carbs / 100) / 4);
      const fatGrams = Math.round((goalCalories * macroRatios.fat / 100) / 9);

      const newTargets = {
        daily_calories: Math.round(goalCalories),
        protein_grams: proteinGrams,
        carbs_grams: carbsGrams,
        fat_grams: fatGrams,
        // Add legacy property names for full compatibility
        calories: Math.round(goalCalories),
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams,
        micronutrients_targets: {
          sodium_mg: 2300,
          potassium_mg: 4700,
          calcium_mg: 1000,
          iron_mg: 18,
          vitamin_d_mcg: 20,
          vitamin_c_mg: 90,
          fiber_g: 25
        },
        reasoning: `Recalculated using scientific formulas: BMR (${Math.round(bmr)} cal) × Activity Factor (${ACTIVITY_LEVELS[activityLevel].multiplier}) = ${Math.round(tdee)} TDEE. ${adjustmentReason}`
      };

      console.log('[REEVALUATE] Mathematical calculation results:', {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        goalCalories: Math.round(goalCalories),
        adjustment,
        macros: { proteinGrams, carbsGrams, fatGrams }
      });
      
      return { 
        success: true,
        new_targets: newTargets
      };
    } catch (error) {
      console.error('Error re-evaluating nutrition plan:', error);
      throw error;
    }
  }

  /**
   * Calls the backend to generate a new nutrition plan using mathematical calculations.
   */
  static async generateNutritionPlan(
    userId: string,
    options: {
      goal: string;
      dietaryPreferences: string[];
      intolerances: string[];
    }
  ): Promise<NutritionPlan | null> {
    try {
      console.log('[NUTRITION] Generating nutrition plan with options:', options);
      console.log('[NUTRITION] Using API URL:', NutritionService.API_URL);

      let userProfile;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[NUTRITION] Error fetching user profile:', error);
          throw new Error('Unable to fetch user profile for nutrition plan generation');
        }

        userProfile = data;

        if (!userProfile) {
          throw new Error('User profile not found');
        }
      } catch (profileError) {
        console.error('[NUTRITION] Profile fetch error:', profileError);
        // For guest mode or when profile can't be fetched, create a minimal profile
        userProfile = {
          id: userId,
          full_name: 'Guest User',
          username: 'guest',
          email: 'guest@example.com',
          birthday: null,
          height: 170,
          weight: 70,
          gender: 'male',
          goal_type: options.goal,
          goal_fat_reduction: options.goal === 'fat_loss' ? 10 : (options.goal === 'muscle_gain' ? 2 : 5), // Realistic percentage goals
          goal_muscle_gain: options.goal === 'muscle_gain' ? 5 : (options.goal === 'fat_loss' ? 1 : 2), // Realistic kg goals
          fitness_strategy: 'maintenance', // Default fitness strategy for guests
          activity_level: 'moderately_active', // Default activity level for guests  
          body_fat_percentage: 20 // Default body fat percentage for guests
        };
        console.log('[NUTRITION] Using fallback profile for guest/error:', userProfile);
      }

      // Calculate age from birthday
      const age = userProfile.birthday ? 
        new Date().getFullYear() - new Date(userProfile.birthday).getFullYear() : 30;
    
      // Get user's name for the plan name
      const userName = userProfile.full_name || userProfile.username || userProfile.email || 'User';

      // Format the request to match what the server expects
      const profile = {
        id: userId,
        goal_type: options.goal,
        height: userProfile.height || 170,
        weight: userProfile.weight || 70,
        age: age,
        gender: userProfile.gender || 'male',
        goal_fat_reduction: userProfile.goal_fat_reduction || (options.goal === 'fat_loss' ? 10 : (options.goal === 'muscle_gain' ? 2 : 5)),
        goal_muscle_gain: userProfile.goal_muscle_gain || (options.goal === 'muscle_gain' ? 5 : (options.goal === 'fat_loss' ? 1 : 2)),
        full_name: userName, // Add user's name to the profile
        fitness_strategy: userProfile.fitness_strategy || this.mapGoalTypeToFitnessStrategy(options.goal) || 'maintenance', // Map goal_type to fitness strategy
        activity_level: userProfile.activity_level || 'moderately_active', // Include activity level
        body_fat_percentage: userProfile.body_fat_percentage || 20 // Include body fat percentage
      };

      // Calculate metabolic data (BMR, TDEE) for transparency
      const metabolicData = this.getMetabolicData(profile, this.validateActivityLevel(profile.activity_level));
      console.log('[NUTRITION] Calculated metabolic data:', metabolicData);
    
      // Combine dietary preferences and intolerances into a single array
      const allPreferences = [...options.dietaryPreferences, ...options.intolerances];
    
      // Try multiple URLs with Railway server first, then environment, then local
      const baseUrls = [
        'https://gofitai-production.up.railway.app', // Railway server first
        environment.apiUrl,
        NutritionService.API_URL
      ].filter(Boolean) as string[];

      console.log('[NUTRITION] Available base URLs:', baseUrls);

      // Test connectivity to each server
      let workingUrl = null;
      for (const baseUrl of baseUrls) {
        try {
          const pingUrl = `${baseUrl}/ping`;
          console.log(`[NUTRITION] Testing connectivity to: ${pingUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for ping
        
        const pingResponse = await fetch(pingUrl, { 
          method: 'GET',
          headers: { 'Accept': 'text/plain' },
            signal: controller.signal as any
        });
        
        clearTimeout(timeoutId);
        
          console.log(`[NUTRITION] Ping response from ${baseUrl}: ${pingResponse.status} ${pingResponse.statusText}`);
          if (pingResponse.ok) {
            console.log(`[NUTRITION] ✅ Server ${baseUrl} is working!`);
            workingUrl = baseUrl;
            break; // Found a working server, use it
        } else {
            console.warn(`[NUTRITION] ❌ Server ${baseUrl} responded with ${pingResponse.status}, trying next...`);
        }
      } catch (pingError) {
          console.error(`[NUTRITION] ❌ Ping failed to ${baseUrl}:`, pingError);
          console.warn(`[NUTRITION] Trying next server...`);
        }
      }

      if (!workingUrl) {
        throw new Error('All nutrition service servers are unreachable. Please check your internet connection and try again later.');
      }

      const apiUrl = `${workingUrl}/api/generate-nutrition-plan`;
      console.log('[NUTRITION] ✅ Using working server:', apiUrl);
      console.log('[NUTRITION] Request payload:', JSON.stringify({
        profile: profile,
        preferences: allPreferences,
        mealsPerDay: 3,
        snacksPerDay: 1
      }, null, 2));

      // Use a React Native-compatible timeout approach with retry logic
      const timeoutMs = 30000; // 30 seconds for mathematical calculation
      console.log(`[NUTRITION] Using timeout of ${timeoutMs}ms for nutrition plan generation`);
      
      // Helper function to create a fetch with proper timeout handling for React Native
      const fetchWithRNTimeout = async (url: string, options: RequestInit, timeout: number) => {
        console.log(`[NUTRITION] Starting request to: ${url}`);
        console.log(`[NUTRITION] Request body:`, options.body);
        console.log(`[NUTRITION] Timeout set to: ${timeout}ms (${timeout / 1000} seconds)`);
        
        return new Promise<Response>((resolve, reject) => {
          const controller = new AbortController();
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          const startTime = Date.now();
          
          // Set up timeout
          timeoutId = setTimeout(() => {
            const elapsed = Date.now() - startTime;
            console.log(`[NUTRITION] Request timed out after ${elapsed}ms (limit was ${timeout}ms)`);
            controller.abort();
            reject(new Error(`Network request timed out after ${timeout / 1000} seconds`));
          }, timeout);
          
          // Make the request
          fetch(url, {
            ...options,
            signal: controller.signal as any
          })
          .then(response => {
            const elapsed = Date.now() - startTime;
            console.log(`[NUTRITION] Request completed in ${elapsed}ms`);
            console.log(`[NUTRITION] Response status: ${response.status} ${response.statusText}`);
            if (timeoutId) clearTimeout(timeoutId);
            resolve(response);
          })
          .catch(error => {
            const elapsed = Date.now() - startTime;
            console.log(`[NUTRITION] Request failed after ${elapsed}ms`);
            console.log(`[NUTRITION] Error name: ${error.name}`);
            console.log(`[NUTRITION] Error message: ${error.message}`);
            if (timeoutId) clearTimeout(timeoutId);
            
            // Check if it's a timeout error or network error
            if (error.name === 'AbortError') {
              reject(new Error(`Network request timed out after ${elapsed}ms`));
            } else if (error.message.includes('Network request failed')) {
              reject(new Error(`Network connection failed - check if server is reachable at ${url}`));
            } else {
              reject(error);
            }
          });
        });
      };

      try {
        const response = await fetchWithRNTimeout(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            profile: profile,
            preferences: allPreferences,
            mealsPerDay: 3,
            snacksPerDay: 1
          }),
          mode: 'cors',
          credentials: 'omit'
        }, timeoutMs);
        
        console.log('[NUTRITION] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[NUTRITION] Error response:', errorText);
          throw new Error(`Server error: ${response.status}. ${errorText.substring(0, 200)}`);
        }
        
        const result = await response.json();
        console.log('[NUTRITION] Successfully generated plan with ID:', result.id);
        
        // Log the full response to see metabolic calculations
        console.log('[NUTRITION] Full API response:', JSON.stringify(result, null, 2));
        
        // Add the generated plan to the mock store so it appears in the nutrition page
        if (result && result.id) {
          // Ensure the plan has all necessary fields for display
          const planToStore = {
            ...result,
            user_id: userId,
            created_at: result.created_at || new Date().toISOString(),
            // Make sure daily_targets is available even if stored as daily_targets_json
            daily_targets: result.daily_targets || result.daily_targets_json || {},
            // Use server metabolic calculations if available, otherwise use our local calculations
            metabolic_calculations: result.metabolic_calculations || metabolicData
          };
          
          // Log metabolic calculations for debugging
          console.log('[NUTRITION] Metabolic calculations from API:', result.metabolic_calculations);
          console.log('[NUTRITION] Local metabolic calculations:', metabolicData);
          console.log('[NUTRITION] Final metabolic calculations being stored:', planToStore.metabolic_calculations);
          
          // Ensure daily_targets has all required fields
          if (!planToStore.daily_targets) {
            planToStore.daily_targets = {};
          }
          
          // Set default values if missing
          planToStore.daily_targets.calories = planToStore.daily_targets.calories || 2000;
          planToStore.daily_targets.protein = planToStore.daily_targets.protein || planToStore.daily_targets.protein_grams || 120;
          planToStore.daily_targets.carbs = planToStore.daily_targets.carbs || planToStore.daily_targets.carbs_grams || 230;
          planToStore.daily_targets.fat = planToStore.daily_targets.fat || planToStore.daily_targets.fat_grams || 60;
          
          mockPlansStore.plans.push(planToStore);
          console.log('[NUTRITION] Added generated plan to mock store');
          
          // Save to persistent storage
          await this.savePlansToStorage();
        }
        
        // Ensure the returned result also includes metabolic calculations
        if (!result.metabolic_calculations) {
          result.metabolic_calculations = metabolicData;
          console.log('[NUTRITION] Added local metabolic calculations to result');
        }
        
        // Return the plan directly since the server already formatted it correctly
        return result;
      } catch (fetchError: any) {
        
        // Handle timeout errors more clearly
        if (fetchError.message && fetchError.message.includes('timed out')) {
          console.error('[NUTRITION] Request timed out after', timeoutMs / 1000, 'seconds');
          throw new Error('Request timed out. The nutrition service may be overloaded. Please try again later.');
        }
        
        if (fetchError.name === 'AbortError') {
          console.error('[NUTRITION] Request was aborted due to timeout');
          throw new Error('Request timed out. The nutrition service may be overloaded. Please try again later.');
        }
        
        // Network timeout or connection error
        if (fetchError.message && (
          fetchError.message.includes('Network request failed') ||
          fetchError.message.includes('Network request timed out')
        )) {
          console.error('[NUTRITION] Network connection failed');
          throw new Error('Network connection failed. Please check your internet connection and try again.');
        }
        
        console.error('[NUTRITION] Fetch error:', fetchError);
        throw fetchError;
      }
    } catch (error: any) {
      console.error('[NUTRITION] Error generating AI nutrition plan:', error);
      throw new Error('Failed to generate nutrition plan: ' + (error.message || 'Unknown error'));
    }
  }

  static async deleteNutritionPlan(planId: string): Promise<boolean> {
    console.log(`[NutritionService] Deleting plan with ID: ${planId}`);
    
    // Check if this is the default mock plan
    if (planId === mockNutritionPlan.id) {
      console.log('[NutritionService] Deleting default mock plan');
      mockPlansStore.deletedDefaultPlan = true;
      
      // Save to persistent storage
      await this.savePlansToStorage();
      
      return true;
    }
    
    // Check if plan exists in mockPlansStore
    const mockPlanIndex = mockPlansStore.plans.findIndex(p => p.id === planId);
    if (mockPlanIndex !== -1) {
      console.log('[NutritionService] Deleting plan from mock store');
      mockPlansStore.plans.splice(mockPlanIndex, 1);
      
      // Save to persistent storage
      await this.savePlansToStorage();
      
      return true;
    }
    
    // If not a mock plan, try API call with fallback
    try {
      // For web platform, just return success
      if (Platform.OS === 'web') {
        console.log('[NutritionService] Web platform detected, skipping API call');
        return true;
      }
      
      // First check if we can connect to the server
      const isConnected = await this.testConnection();
      
      if (!isConnected) {
        console.log('[NutritionService] Server not available, using mock fallback');
        return true; // Pretend it worked in offline mode
      }
      
      // If connected, make the actual API call
      const apiUrl = `${NutritionService.API_URL}/api/delete-nutrition-plan/${planId}`;
      console.log(`[NutritionService] Calling API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
          const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete nutrition plan');
      }
      
      return true;
    } catch (error) {
      console.error('[NutritionService] Error deleting plan:', error);
      // In web mode, pretend it worked to avoid errors
      if (Platform.OS === 'web') {
        console.log('[NutritionService] Web mode - returning success despite error');
        return true;
      }
      throw error;
    }
  }

  static async customizeMeal(
    originalMeal: string,
    targetMacros: any,
    ingredientToReplace: string,
    newIngredient: string
  ): Promise<string> {
    const response = await fetch(`${NutritionService.API_URL}/api/customize-meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalMeal,
        targetMacros,
        ingredientToReplace,
        newIngredient,
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      } else {
        const errorText = await response.text();
        throw new Error(
          `Server Error: ${response.status}. ${errorText.substring(0, 200)}`
        );
      }
    }

    const data = await response.json();
    return data.newMealDescription;
  }

  static async updateMeal(
    planId: string,
    mealTimeSlot: string,
    newMealDescription: string
  ): Promise<void> {
    const response = await fetch(`${NutritionService.API_URL}/api/update-meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, mealTimeSlot, newMealDescription }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      } else {
        const errorText = await response.text();
        throw new Error(
          `Server Error: ${response.status}. ${errorText.substring(0, 200)}`
        );
      }
    }
  }

  static async logDailyMetric(
    userId: string,
    metricDate: string,
    metrics: object
  ): Promise<any> {
    const response = await fetch(`${NutritionService.API_URL}/api/log-daily-metric`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, metricDate, metrics }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to log daily metric.');
    }

    return response.json();
  }

  static async logFoodEntry(
    userId: string,
    entry: {
      food_name: string;
      calories: number;
      protein_grams?: number;
      carbs_grams?: number;
      fat_grams?: number;
      [key: string]: any;
    }
  ): Promise<any> {
    try {
      // Update local storage first for immediate UI feedback
      const todayDate = new Date().toISOString().split('T')[0];
      const storageKey = `nutrition_log_${userId}_${todayDate}`;
      
      // Get existing entries for today
      let todayEntries = await this.readPersisted<any[]>(storageKey) || [];
      
      // Add new entry with timestamp
      const newEntry = {
        ...entry,
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        date: todayDate
      };
      
      todayEntries.push(newEntry);
      
      // Save back to storage
      await this.writePersisted(storageKey, todayEntries);
      console.log('[NUTRITION] Added food entry to local storage:', newEntry.food_name);
      
      // Only send to server if not a guest user (guest users don't have valid UUIDs for database)
      if (userId !== 'guest') {
        // Then send to server
        const response = await fetch(`${environment.apiUrl}/api/log-food-entry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, entry }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to log food entry.');
        }

        return response.json();
      } else {
        // For guest users, just return the local entry
        console.log('[NUTRITION] Guest user - skipping server sync');
        return { success: true, entry: newEntry };
      }
    } catch (error) {
      console.error('[NUTRITION] Error logging food entry:', error);
      throw error;
    }
  }

  static async analyzeFoodImage(imageUri: string): Promise<any> {
    console.log('[FOOD ANALYZE] Starting food photo analysis');
    console.log('[FOOD ANALYZE] Image URI:', imageUri);
    
    try {
      // Create FormData for image upload
      const formData = new FormData();
      
      // For React Native, we need to append the image with proper format
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'food-image.jpg'
      } as any;
      
      formData.append('foodImage', imageFile);
      
      console.log('[FOOD ANALYZE] Sending request to:', `${NutritionService.API_URL}/api/analyze-food`);
      
      // Make request to the food analysis endpoint
      const response = await fetch(`${NutritionService.API_URL}/api/analyze-food`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('[FOOD ANALYZE] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[FOOD ANALYZE] API error:', errorData);
        throw new Error(errorData.message || errorData.error || 'Food analysis failed');
      }
      
      const result = await response.json();
      console.log('[FOOD ANALYZE] Analysis successful:', result.data?.foodName);
      console.log('[FOOD ANALYZE] Confidence:', result.data?.confidence);
      
      return {
        success: true,
        data: result.data,
        message: result.message
      };
      
    } catch (error: any) {
      console.error('[FOOD ANALYZE] Error:', error.message);
      
      // Provide user-friendly error messages
      if (error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        throw new Error('The analysis is taking longer than expected. Please try again.');
      } else {
        throw new Error(error.message || 'Food analysis failed. Please try again.');
      }
    }
  }

  static async generateDailyMealPlan(userId: string): Promise<any> {
    console.log(`[NutritionService] Generating daily meal plan for user: ${userId}`);
    
    try {
      // Get the active nutrition plan
      const activePlan = await this.getLatestNutritionPlan(userId);
      
      if (!activePlan) {
        console.log('[NutritionService] No active plan found, cannot generate meal plan');
        throw new Error('No active nutrition plan found. Please create a nutrition plan first.');
      }
      
      // For web testing, always use mock data
      if (Platform.OS === 'web') {
        console.log('[NutritionService] Web mode - using mock meal plan generation');
        return this.generateMockMealPlan(activePlan);
      }
      
      // Try server API first
      const isConnected = await this.testConnection();
      
      if (isConnected) {
        try {
          const apiUrl = `${NutritionService.API_URL}/api/generate-daily-meal-plan`;
          console.log(`[NutritionService] Calling API: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
      method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              planId: activePlan.id,
            }),
    });

    if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('[NutritionService] API meal plan generation successful');
          return data;
        } catch (apiError) {
          console.error('[NutritionService] API meal plan generation failed:', apiError);
          console.log('[NutritionService] Falling back to mock meal plan');
        }
      }
      
      // Fallback to mock data
      return this.generateMockMealPlan(activePlan);
    } catch (error) {
      console.error('[NutritionService] Error in generateDailyMealPlan:', error);
      throw error;
    }
  }

  // Helper method to generate mock meal plan
  private static generateMockMealPlan(activePlan: any): any {
    console.log('[NutritionService] Generating mock meal plan');
    
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // Generate a unique meal plan for today
    const mockMealPlan = {
      id: `mock-meal-${dateString}-${Math.random().toString(36).substring(2, 10)}`,
      plan_id: activePlan.id,
      date: today.toISOString(),
      meals: [
        {
          name: 'Breakfast',
          time: '08:00',
          foods: [
            { name: 'Scrambled Eggs', quantity: '3 large', calories: 210, protein: 21, carbs: 3, fat: 15 },
            { name: 'Whole Wheat Toast', quantity: '2 slices', calories: 160, protein: 8, carbs: 30, fat: 2 },
            { name: 'Avocado', quantity: '1/2 medium', calories: 120, protein: 1, carbs: 6, fat: 10 },
          ]
        },
        {
          name: 'Morning Snack',
          time: '10:30',
          foods: [
            { name: 'Greek Yogurt', quantity: '1 cup', calories: 130, protein: 22, carbs: 8, fat: 0 },
            { name: 'Blueberries', quantity: '1/2 cup', calories: 40, protein: 0, carbs: 10, fat: 0 },
          ]
        },
        {
          name: 'Lunch',
          time: '13:00',
          foods: [
            { name: 'Grilled Chicken Breast', quantity: '6 oz', calories: 180, protein: 36, carbs: 0, fat: 4 },
            { name: 'Brown Rice', quantity: '1 cup', calories: 220, protein: 5, carbs: 45, fat: 2 },
            { name: 'Steamed Broccoli', quantity: '1 cup', calories: 55, protein: 4, carbs: 11, fat: 0 },
          ]
        },
        {
          name: 'Afternoon Snack',
          time: '16:00',
          foods: [
            { name: 'Protein Shake', quantity: '1 serving', calories: 150, protein: 25, carbs: 5, fat: 2 },
            { name: 'Banana', quantity: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
          ]
        },
        {
          name: 'Dinner',
          time: '19:00',
          foods: [
            { name: 'Baked Salmon', quantity: '6 oz', calories: 240, protein: 36, carbs: 0, fat: 12 },
            { name: 'Quinoa', quantity: '1 cup', calories: 220, protein: 8, carbs: 39, fat: 4 },
            { name: 'Roasted Vegetables', quantity: '2 cups', calories: 120, protein: 4, carbs: 24, fat: 2 },
          ]
        }
      ]
    };
    
    // Store the generated meal plan in mockPlansStore for persistence
const existingPlanIndex = mockPlansStore.mealPlans.findIndex(
  (mp: any) => mp.date.split('T')[0] === dateString
);
    
    if (existingPlanIndex >= 0) {
      mockPlansStore.mealPlans[existingPlanIndex] = mockMealPlan;
    } else {
      mockPlansStore.mealPlans.push(mockMealPlan);
    }
    
    return mockMealPlan;
  }

  static async getMealPlanForDate(
    planId: string,
    date: string
  ): Promise<any[]> {
    try {
      console.log('[NUTRITION] Getting meal plan for date:', date, 'plan ID:', planId);
      
      // First check mock store for generated meal plans
      const generatedNutritionPlan = mockPlansStore.plans.find(
        plan => plan.suggestion_date === date && plan.meal_plan
      );
      
      if (generatedNutritionPlan && generatedNutritionPlan.meal_plan) {
        console.log('[NUTRITION] Found generated meal plan in mock store for date:', date);
        return generatedNutritionPlan.meal_plan;
      }
      
      // Try database next
      try {
    const { data, error } = await supabase
      .from('meal_plan_suggestions')
      .select('*')
      .eq('nutrition_plan_id', planId)
      .eq('suggestion_date', date)
      .order('meal_type', {
        ascending: true,
        nullsFirst: false,
      });

        if (!error && data && data.length > 0) {
          console.log('[NUTRITION] Found meal plan in database');
          return data;
        }
      } catch (dbError) {
        console.log('[NUTRITION] Database error, using mock meal plan:', dbError);
      }
      
      // Fallback to generating a unique meal plan for this date
      console.log('[NUTRITION] Generating unique mock meal plan for date:', date);
      
      // Use the date string to seed our random number generator
      const getDateBasedRandom = (dateStr: string, mealType: string) => {
        const seed = dateStr.split('-').join('') + mealType.charCodeAt(0);
        return (parseInt(seed) % 5) + 1;
      };
      
      // Create meal options
      const breakfastOptions = [
        'Oatmeal with berries, nuts, and a drizzle of honey',
        'Greek yogurt parfait with granola and mixed berries',
        'Avocado toast with poached eggs and cherry tomatoes',
        'Protein smoothie with spinach, banana, and almond butter',
        'Vegetable omelet with whole grain toast'
      ];
      
      const lunchOptions = [
        'Grilled chicken salad with mixed greens, quinoa, and olive oil dressing',
        'Turkey and avocado wrap with spinach and hummus',
        'Lentil soup with a side of whole grain bread',
        'Quinoa bowl with roasted vegetables and tahini dressing',
        'Tuna salad on whole grain bread with cucumber slices'
      ];
      
      const dinnerOptions = [
        'Baked salmon with roasted sweet potatoes and steamed broccoli',
        'Grilled chicken breast with brown rice and sautéed vegetables',
        'Stir-fried tofu with mixed vegetables and brown rice',
        'Lean beef stir-fry with bell peppers, broccoli, and brown rice',
        'Baked cod with quinoa and roasted asparagus'
      ];
      
      const snackOptions = [
        'Greek yogurt with almonds and a small apple',
        'Protein shake with banana',
        'Carrot sticks with hummus',
        'Hard-boiled egg and a piece of fruit',
        'Cottage cheese with berries'
      ];
      
      // Get variety based on date
      const breakfastVariety = getDateBasedRandom(date, 'B');
      const lunchVariety = getDateBasedRandom(date, 'L');
      const dinnerVariety = getDateBasedRandom(date, 'D');
      const snackVariety = getDateBasedRandom(date, 'S');
      
      const mockMealPlan = [
        {
          id: `meal-breakfast-${date}`,
          nutrition_plan_id: planId,
          suggestion_date: date,
          meal_type: 'Breakfast',
          meal_description: breakfastOptions[breakfastVariety - 1],
          calories: 300 + (breakfastVariety * 10),
          protein_grams: 10 + breakfastVariety,
          carbs_grams: 50 + (breakfastVariety * 2),
          fat_grams: 8 + breakfastVariety
        },
        {
          id: `meal-lunch-${date}`,
          nutrition_plan_id: planId,
          suggestion_date: date,
          meal_type: 'Lunch',
          meal_description: lunchOptions[lunchVariety - 1],
          calories: 400 + (lunchVariety * 10),
          protein_grams: 30 + lunchVariety,
          carbs_grams: 25 + (lunchVariety * 2),
          fat_grams: 15 + lunchVariety
        },
        {
          id: `meal-dinner-${date}`,
          nutrition_plan_id: planId,
          suggestion_date: date,
          meal_type: 'Dinner',
          meal_description: dinnerOptions[dinnerVariety - 1],
          calories: 450 + (dinnerVariety * 10),
          protein_grams: 35 + dinnerVariety,
          carbs_grams: 30 + (dinnerVariety * 2),
          fat_grams: 20 + dinnerVariety
        },
        {
          id: `meal-snack-${date}`,
          nutrition_plan_id: planId,
          suggestion_date: date,
          meal_type: 'Snack',
          meal_description: snackOptions[snackVariety - 1],
          calories: 180 + (snackVariety * 10),
          protein_grams: 12 + snackVariety,
          carbs_grams: 15 + (snackVariety * 2),
          fat_grams: 6 + snackVariety
        }
      ];
      
      // Store this meal plan for future reference
      const existingPlanIndex = mockPlansStore.plans.findIndex(p => p.id === `generated-${date}`);
      if (existingPlanIndex === -1) {
        // Create a new plan for this date
        mockPlansStore.plans.push({
          id: `generated-${date}`,
          user_id: 'system-generated',
          plan_name: `Generated Meal Plan - ${date}`,
          goal_type: 'weight_loss',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          daily_targets: {
            calories: 1500,
            protein_grams: 120,
            carbs_grams: 150,
            fat_grams: 50
          },
          meal_plan: mockMealPlan,
          suggestion_date: date
        });
      } else {
        // Update existing plan with this meal plan
        mockPlansStore.plans[existingPlanIndex].meal_plan = mockMealPlan;
      }
      
      return mockMealPlan;
    } catch (error) {
      console.error(
        `[NUTRITION] Error getting meal plan for date ${date}:`,
        error
      );
      return [];
    }
  }

  static async analyzeBehavior(userId: string): Promise<any> {
    const response = await fetch(`${NutritionService.API_URL}/api/analyze-behavior`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze behavior.');
    }
    return response.json();
  }

  static async getLatestInsight(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('behavioral_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest insight:', error);
      throw error;
    }
    return data;
  }

  static async getInsightById(insightId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('behavioral_insights')
      .select('*')
      .eq('id', insightId)
      .single();

    if (error) {
      console.error('Error fetching insight by ID:', error);
      throw error;
    }
    return data;
  }

  static async getCoachingResponse(
    insight: any,
    chatHistory: any[]
  ): Promise<string> {
    const response = await fetch(`${NutritionService.API_URL}/api/behavioral-coaching-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insight, chatHistory }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get coaching response.');
    }

    const data = await response.json();
    return data.aiMessage;
  }

  static async acknowledgeInsight(insightId: string): Promise<void> {
    const { error } = await supabase
      .from('behavioral_insights')
      .update({ is_acknowledged: true })
      .eq('id', insightId);

    if (error) {
      console.error('Error acknowledging insight:', error);
      throw error;
    }
  }

  static async generateMotivationalMessage(): Promise<any> {
    try {
      console.log('Using mock motivational message data');
              return { success: true, message: mockMotivationalMessage };
    } catch (error) {
      console.error('Error generating motivational message:', error);
      throw error;
    }
  }

  static async getLatestMotivationalMessage(): Promise<any | null> {
    try {
      console.log('Using mock latest message data');
              return mockMotivationalMessage;
    } catch (error) {
      console.error('Error fetching latest motivational message:', error);
      return null;
    }
  }

  static async markMessageAsSeen(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('motivational_messages')
      .update({ is_seen: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as seen:', error);
      throw error;
    }
  }

}
