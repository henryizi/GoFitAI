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

// Base URLs for fallback system (Railway first, then environment)
const getBaseUrls = () => {
  return [
    'https://gofitai-production.up.railway.app', // Railway server first (always available)
    environment.apiUrl, // Configured URL from environment
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
   * Calculate nutrition targets (calories, protein, carbs, fat) based on profile and metabolic data
   */
  static calculateNutritionTargets(profile: any, metabolicData: MetabolicData): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    console.log('[NUTRITION] Calculating targets from metabolic data:', metabolicData);
    
    // ⭐ Use the goal-adjusted calories from metabolic data (TDEE + goal adjustment)
    const goalCalories = metabolicData.goal_calories;
    
    // ⭐ Map fitness strategy to macro ratios using the proper strategy-based ratios
    const fitnessStrategy = profile.fitness_strategy || this.mapGoalTypeToFitnessStrategy(profile.goal_type) || 'maintenance';
    console.log('[NUTRITION] Using fitness strategy:', fitnessStrategy);
    
    // ⭐ Use the proper strategy-based macro ratios (not hardcoded ones)
    const ratios = this.getMacroRatiosForStrategy(fitnessStrategy);
    console.log('[NUTRITION] Using strategy-based macro ratios:', ratios);
    
    // Calculate macros in grams
    // Protein: 4 calories per gram
    // Carbs: 4 calories per gram  
    // Fat: 9 calories per gram
    const proteinGrams = Math.round((goalCalories * ratios.protein / 100) / 4);
    const carbsGrams = Math.round((goalCalories * ratios.carbs / 100) / 4);
    const fatGrams = Math.round((goalCalories * ratios.fat / 100) / 9);
    
    const targets = {
      calories: Math.round(goalCalories), // ⭐ This is the final goal-adjusted calories
      protein: proteinGrams,
      carbs: carbsGrams,
      fat: fatGrams
    };
    
    console.log('[NUTRITION] ✅ Calculated nutrition targets with proper strategy-based ratios:', targets);
    console.log('[NUTRITION] 🔍 Used goal_calories (TDEE + adjustment):', goalCalories, 'from TDEE:', metabolicData.tdee, 'adjustment:', metabolicData.goal_adjustment);
    return targets;
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
      fat_loss: { calories: -400, description: 'Fat loss while preserving muscle' }, // Support fat_loss alias
      weight_loss: { calories: -400, description: 'Fat loss while preserving muscle' }, // Support weight_loss alias
      muscle_gain: { calories: 400, description: 'Aggressive muscle building' }, // Support muscle_gain alias
      weight_gain: { calories: 400, description: 'Aggressive muscle building' }, // Support weight_gain alias
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
      fat_loss: { protein: 35, carbs: 25, fat: 40 },       // Same as cut - fat loss strategy
      weight_loss: { protein: 35, carbs: 25, fat: 40 },    // Same as cut - weight loss strategy
      muscle_gain: { protein: 25, carbs: 45, fat: 30 },    // Same as bulk - muscle gain strategy
      weight_gain: { protein: 25, carbs: 45, fat: 30 },    // Same as bulk - weight gain strategy
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
      'weight_loss': 'weight_loss',
      'fat_loss': 'fat_loss', 
      'muscle_gain': 'muscle_gain',
      'weight_gain': 'weight_gain',
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

  // Fallback fetch method with graceful timeout handling
  private static async fetchWithBaseFallback(path: string, init?: RequestInit): Promise<{ base: string; response: Response } | null> {
    const bases = getBaseUrls();
    console.log(`[NutritionService] 🔍 Attempting API call to path: ${path}`);
    console.log(`[NutritionService] 🌐 Available bases:`, bases);

    let lastError: unknown = null;
    for (let i = 0; i < bases.length; i++) {
      const base = bases[i];
      const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
      
      try {
        console.log(`[NutritionService] 📡 Trying base ${i + 1}/${bases.length}: ${base} → ${url}`);
        
        // Add timeout handling for each request  
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[NutritionService] ⏰ Request timeout after 30 seconds for: ${base}`);
          controller.abort();
        }, 30000); // 30 second timeout per base URL (reasonable for AI operations)
        
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log(`[NutritionService] 📨 Response from ${base}: status ${response.status}`);
        
        // Special handling for Railway's "Route not found" errors
        if (response.status === 404) {
          const responseClone = response.clone();
          try {
            const errorData = await responseClone.json() as any;
            console.log('[NutritionService] 404 Response from', base, ':', errorData);

            // Check for Railway-specific error patterns
            if (errorData?.message?.includes('does not exist on the Railway server') ||
                errorData?.error === 'Route not found' ||
                errorData?.message === 'Route not found') {
              console.log('[NutritionService] 🚫 Railway missing endpoint, trying next base...');
              lastError = new Error(`404 Not Found at ${base} - ${errorData?.message || 'Route not found'}`);
              continue; // Try the next base
            }
          } catch (parseError) {
            console.log('[NutritionService] Could not parse 404 response as JSON:', parseError);
            // If we can't parse response and it's from Railway, assume it's missing endpoint
            if (base.includes('railway.app')) {
              console.log('[NutritionService] 🚫 Assuming Railway 404 is missing endpoint, trying next base...');
              lastError = new Error(`404 Not Found at Railway server`);
              continue;
            }
          }
        }
        
        // Consider any network-level success a success path; status handling is done by callers
        console.log(`[NutritionService] ✅ Success with base: ${base} (status: ${response.status})`);
        return { base, response };
      } catch (err) {
        console.log(`[NutritionService] ⚠️ Failed to fetch from ${base}:`, err);
        
        if (err instanceof Error && err.name === 'AbortError') {
          console.log(`[NutritionService] ⏱️ Request to ${base} timed out (AI taking longer than expected)`);
          lastError = new Error(`Timeout connecting to ${base}`);
        } else {
          lastError = err;
        }
      }
    }

    // Instead of throwing, return null to indicate graceful fallback should be used
    console.log(`[NutritionService] 🧮 All API endpoints unavailable, will use mathematical generation`);
    return null; // This signals that mathematical fallback should be used
  }
  
  // Add initialization method to load plans from storage when app starts
  static async initializeFromStorage() {
    try {
      console.log('[NUTRITION] Initializing from storage');
      
      // Check if we need to clear stale data (hardcoded calories or inconsistent values indicate old data)
      const storedPlans = await this.readPersisted<any[]>('nutrition_plans');
      if (storedPlans && Array.isArray(storedPlans)) {
        // Check for stale data with old hardcoded values or inconsistent calculations
        const hasStaleData = storedPlans.some(plan => 
          plan.daily_targets?.calories === 1800 || 
          plan.metabolic_calculations?.goal_calories === 1800 ||
          plan.metabolic_calculations?.adjusted_calories === 1800 ||
          // Also check for plans with suspicious round numbers that might be hardcoded
          (plan.daily_targets?.calories && plan.daily_targets.calories % 100 === 0 && plan.daily_targets.calories < 1500) ||
          // Check for missing metabolic calculations (indicates old format)
          !plan.metabolic_calculations ||
          // ✅ NEW: Check for missing adjusted_calories field (UI priority field)
          !plan.metabolic_calculations?.adjusted_calories ||
          // ✅ NEW: Check for inconsistent values between daily_targets and metabolic_calculations
          (plan.daily_targets?.calories && plan.metabolic_calculations?.goal_calories && 
           Math.abs(plan.daily_targets.calories - plan.metabolic_calculations.goal_calories) > 10) ||
          // ✅ NEW: Check for inconsistent values between goal_calories and adjusted_calories
          (plan.metabolic_calculations?.goal_calories && plan.metabolic_calculations?.adjusted_calories && 
           Math.abs(plan.metabolic_calculations.goal_calories - plan.metabolic_calculations.adjusted_calories) > 10) ||
          // Check for plans older than 7 days (force refresh)
          (plan.created_at && new Date().getTime() - new Date(plan.created_at).getTime() > 7 * 24 * 60 * 60 * 1000) ||
          // ✅ NEW: Clear plans created before the macro fix (aggressive cleanup)
          (plan.created_at && new Date(plan.created_at) < new Date('2025-01-10'))
        );
        
        if (hasStaleData) {
          console.log('[NUTRITION] 🧹 Detected stale/old data, clearing ALL cached plans for fresh calculations');
          await this.clearCachedPlans();
        } else {
          console.log(`[NUTRITION] Loaded ${storedPlans.length} fresh plans from storage`);
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
      console.log('[NUTRITION] 🧹 Clearing all cached nutrition plans...');
      const previousCount = mockPlansStore.plans.length;
      mockPlansStore.plans = [];
      mockPlansStore.deletedDefaultPlan = false;
      await this.savePlansToStorage();
      console.log(`[NUTRITION] ✅ Cleared ${previousCount} cached plans successfully`);
    } catch (err) {
      console.error('[NUTRITION] ❌ Error clearing cached plans:', err);
    }
  }

  /**
   * Forces a complete nutrition cache clear and refresh - use when values are inconsistent
   */
  static async forceNutritionRefresh(): Promise<void> {
    try {
      console.log('[NUTRITION] 🔄 Forcing complete nutrition refresh...');
      
      // Clear all cached plans
      await this.clearCachedPlans();
      
      // Also clear any persistent storage keys that might be causing issues
      const keysToRemove = [
        'nutrition_plans',
        'deleted_default_plan',
        'nutrition_cache_timestamp'
      ];
      
      for (const key of keysToRemove) {
        try {
          if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
            (globalThis as any).localStorage.removeItem(key);
          } else {
            await AsyncStorage.removeItem(key);
          }
          console.log(`[NUTRITION] 🗑️ Cleared storage key: ${key}`);
        } catch (keyErr) {
          console.warn(`[NUTRITION] ⚠️ Could not clear storage key ${key}:`, keyErr);
        }
      }
      
      console.log('[NUTRITION] ✅ Complete nutrition refresh completed');
    } catch (err) {
      console.error('[NUTRITION] ❌ Error during force refresh:', err);
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
      
      // Don't return default plan for new users - let them create their own
      console.log('[NUTRITION] No user plans found - new users should create their own plan');
      return null;
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
      console.log('[NUTRITION] Available plans in mock store:', mockPlansStore.plans.map(p => ({ 
        id: p.id, 
        name: p.plan_name, 
        user_id: p.user_id,
        calories: p.daily_targets?.calories,
        updated_at: p.updated_at
      })));
      
      // First check the mock store for generated plans
      const storedPlan = mockPlansStore.plans.find(plan => plan.id === planId);
      if (storedPlan) {
        console.log('[NUTRITION] ✅ Found plan in mock store:', {
          name: storedPlan.plan_name,
          id: storedPlan.id,
          calories: storedPlan.daily_targets?.calories,
          protein: storedPlan.daily_targets?.protein,
          updated_at: storedPlan.updated_at
        });
        
        // ✅ Ensure daily_targets is properly formatted for display
        if (storedPlan.daily_targets) {
          // Make sure we have both formats for compatibility
          if (!storedPlan.daily_targets.protein && storedPlan.daily_targets.protein_grams) {
            storedPlan.daily_targets.protein = storedPlan.daily_targets.protein_grams;
          }
          if (!storedPlan.daily_targets.carbs && storedPlan.daily_targets.carbs_grams) {
            storedPlan.daily_targets.carbs = storedPlan.daily_targets.carbs_grams;
          }
          if (!storedPlan.daily_targets.fat && storedPlan.daily_targets.fat_grams) {
            storedPlan.daily_targets.fat = storedPlan.daily_targets.fat_grams;
          }
        }
        
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
      
      // Don't add default plan for new users - let them create their own
      if (userPlans.length === 0) {
        console.log('[NUTRITION] No user plans found - new users should create their own plan');
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
                goal_calories: metabolicData.goal_calories, // ⭐ ENSURE CONSISTENCY
                adjusted_calories: metabolicData.goal_calories, // ⭐ UI PRIORITY FIELD
                goal_adjustment: metabolicData.goal_adjustment,
                goal_adjustment_reason: metabolicData.goal_adjustment_reason,
                calorie_adjustment_reason: metabolicData.goal_adjustment_reason, // ⭐ UI DISPLAY FIELD
                calculation_method: metabolicData.calculation_method
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
          // Create a unique target ID that includes the plan's updated timestamp
          // This ensures each recalculation creates a "new" target entry
          const targetId = `target-${planId}-${storedPlan.updated_at || storedPlan.created_at || Date.now()}`;
          const targetTimestamp = storedPlan.updated_at || storedPlan.created_at || new Date().toISOString();
          
          console.log('[NUTRITION] Creating target entry:', {
            targetId,
            targetTimestamp,
            calories: dailyTargets.calories,
            protein: dailyTargets.protein || dailyTargets.protein_grams
          });
          
          return [{
            id: targetId,
            nutrition_plan_id: planId,
            start_date: targetTimestamp.split('T')[0],
            end_date: null,
            daily_calories: dailyTargets.calories,
            protein_grams: dailyTargets.protein || dailyTargets.protein_grams,
            carbs_grams: dailyTargets.carbs || dailyTargets.carbs_grams,
            fat_grams: dailyTargets.fat || dailyTargets.fat_grams,
            micronutrients_targets: storedPlan.micronutrients_targets || null,
            reasoning: storedPlan.updated_at ? 'Recalculated plan targets.' : 'Generated plan targets.',
            created_at: targetTimestamp
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
      
      // ✅ CRITICAL FIX: Update the mock store with the new recalculated targets
      // Find the user's nutrition plan and update it with new targets
      const userPlan = mockPlansStore.plans.find(plan => plan.user_id === userId);
      if (userPlan) {
        console.log('[REEVALUATE] 🔄 Updating mock store with new targets...');
        
        // Update the plan's daily_targets with new values
        userPlan.daily_targets = {
          calories: Math.round(goalCalories),
          protein: proteinGrams,
          carbs: carbsGrams,
          fat: fatGrams,
          // Also include the _grams versions for compatibility
          protein_grams: proteinGrams,
          carbs_grams: carbsGrams,
          fat_grams: fatGrams
        };
        
      // ✅ CRITICAL FIX: Also update metabolic_calculations fields
      // The UI reads from these fields, so they must be updated too
      if (userPlan.metabolic_calculations) {
        userPlan.metabolic_calculations.goal_calories = Math.round(goalCalories);
        userPlan.metabolic_calculations.adjusted_calories = Math.round(goalCalories); // ⭐ UI PRIORITY FIELD
        userPlan.metabolic_calculations.goal_adjustment = adjustment;
        userPlan.metabolic_calculations.goal_adjustment_reason = adjustmentReason;
        userPlan.metabolic_calculations.calorie_adjustment_reason = adjustmentReason; // ⭐ UI DISPLAY FIELD
        console.log('[REEVALUATE] ✅ Updated metabolic_calculations.goal_calories:', Math.round(goalCalories));
        console.log('[REEVALUATE] ✅ Updated metabolic_calculations.adjusted_calories:', Math.round(goalCalories));
      } else {
          console.warn('[REEVALUATE] ⚠️ No metabolic_calculations field found to update');
        }
        
        // Also update daily_targets_json if it exists
        userPlan.daily_targets_json = userPlan.daily_targets;
        
        // Update the plan's updated_at timestamp
        userPlan.updated_at = new Date().toISOString();
        
        console.log('[REEVALUATE] ✅ Mock store updated with new targets:', {
          planId: userPlan.id,
          newTargets: userPlan.daily_targets,
          updatedAt: userPlan.updated_at
        });
        
        // Save the updated plans to persistent storage
        try {
          await this.savePlansToStorage();
          console.log('[REEVALUATE] ✅ Updated plans saved to persistent storage');
        } catch (saveError) {
          console.error('[REEVALUATE] ⚠️ Failed to save to persistent storage:', saveError);
        }
      } else {
        console.warn('[REEVALUATE] ⚠️ Could not find user plan in mock store to update');
      }
      
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
   * Generate a nutrition plan using pure mathematical calculations (NO API CALLS).
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
      console.log('[NUTRITION] 🧮 Generating nutrition plan using PURE MATHEMATICAL CALCULATIONS (no API)');
      console.log('[NUTRITION] Options:', options);

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
          goal_fat_reduction: options.goal === 'fat_loss' ? 10 : (options.goal === 'muscle_gain' ? 2 : 5),
          goal_muscle_gain: options.goal === 'muscle_gain' ? 5 : (options.goal === 'fat_loss' ? 1 : 2),
          fitness_strategy: 'maintenance',
          activity_level: 'moderately_active',
          body_fat_percentage: 20
        };
        console.log('[NUTRITION] Using fallback profile for guest/error:', userProfile);
      }

      // Calculate age from birthday
      const age = userProfile.birthday ? 
        new Date().getFullYear() - new Date(userProfile.birthday).getFullYear() : 30;
    
      // Get user's name for the plan name
      const userName = userProfile.full_name || userProfile.username || userProfile.email || 'User';

      // Create profile object for calculations
      const profile = {
        id: userId,
        goal_type: options.goal,
        height: userProfile.height || 170,
        weight: userProfile.weight || 70,
        age: age,
        gender: userProfile.gender || 'male',
        goal_fat_reduction: userProfile.goal_fat_reduction || (options.goal === 'fat_loss' ? 10 : (options.goal === 'muscle_gain' ? 2 : 5)),
        goal_muscle_gain: userProfile.goal_muscle_gain || (options.goal === 'muscle_gain' ? 5 : (options.goal === 'fat_loss' ? 1 : 2)),
        full_name: userName,
        fitness_strategy: userProfile.fitness_strategy || this.mapGoalTypeToFitnessStrategy(options.goal) || 'maintenance',
        activity_level: userProfile.activity_level || 'moderately_active',
        body_fat_percentage: userProfile.body_fat_percentage || 20
      };

      console.log('[NUTRITION] 🔢 Starting mathematical calculations...');
      
      // 1. Calculate metabolic data (BMR, TDEE, goal calories)
      const metabolicData = this.getMetabolicData(profile, this.validateActivityLevel(profile.activity_level));
      console.log('[NUTRITION] ✅ Metabolic calculations:', metabolicData);
      
      // 2. Calculate nutrition targets (calories, protein, carbs, fat)
      const nutritionTargets = this.calculateNutritionTargets(profile, metabolicData);
      console.log('[NUTRITION] ✅ Nutrition targets calculated:', JSON.stringify(nutritionTargets, null, 2));
      console.log('[NUTRITION] 🔍 Metabolic data used:', JSON.stringify(metabolicData, null, 2));
      
      // 3. Generate food suggestions (general categories, not specific meals)
      const foodSuggestions = this.generateFoodSuggestions(options.dietaryPreferences, options.intolerances);
      
      console.log('[NUTRITION] ✅ Generated food suggestions (no specific meals)');
      
      // 4. Create the nutrition plan object - TARGETS ONLY, NO SPECIFIC MEALS
      const planId = `math-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
      const planName = `${userName}'s Nutrition Plan`;
      
      const nutritionPlan: NutritionPlan = {
        id: planId,
        user_id: userId,
        plan_name: planName,
        goal_type: options.goal,
        status: 'active',
        preferences: {
          dietary: options.dietaryPreferences,
          intolerances: options.intolerances
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metabolic_calculations: {
          ...metabolicData,
          adjusted_calories: metabolicData.goal_calories, // ⭐ UI PRIORITY FIELD - Final goal-adjusted calories (TDEE + adjustment)
          calorie_adjustment_reason: metabolicData.goal_adjustment_reason // ⭐ UI DISPLAY FIELD
        },
        daily_targets: nutritionTargets,
        micronutrients_targets: this.generateMicronutrientTargets(profile),
        // ❌ REMOVED: daily_schedule - nutrition plans should only contain targets, not specific meals
        food_suggestions: foodSuggestions.food_suggestions,
        snack_suggestions: foodSuggestions.snack_suggestions
      };

      console.log('[NUTRITION] 🎯 Generated complete nutrition plan:', {
        id: nutritionPlan.id,
        plan_name: nutritionPlan.plan_name,
        goal_type: nutritionPlan.goal_type,
        daily_targets: nutritionPlan.daily_targets,
        metabolic_calculations: nutritionPlan.metabolic_calculations
      });

      // 5. Store the plan locally (NO API CALLS)
      console.log('[NUTRITION] 🧹 Clearing existing plans for user to prevent conflicts...');
      const existingPlanIndices = [];
      for (let i = mockPlansStore.plans.length - 1; i >= 0; i--) {
        if (mockPlansStore.plans[i].user_id === userId) {
          existingPlanIndices.push(i);
        }
      }
      
      if (existingPlanIndices.length > 0) {
        console.log(`[NUTRITION] 🗑️ Removing ${existingPlanIndices.length} existing plans for user ${userId}`);
        existingPlanIndices.forEach(index => {
          mockPlansStore.plans.splice(index, 1);
        });
      }

      // Ensure daily_targets has both formats for compatibility
      const compatibleDailyTargets = {
        calories: nutritionTargets.calories,
        protein: nutritionTargets.protein,
        carbs: nutritionTargets.carbs,
        fat: nutritionTargets.fat,
        protein_grams: nutritionTargets.protein,
        carbs_grams: nutritionTargets.carbs,
        fat_grams: nutritionTargets.fat
      };

      // Create the final plan to store
      const planToStore = {
        ...nutritionPlan,
        daily_targets: compatibleDailyTargets
      };
      
      // Add to mock store
      mockPlansStore.plans.unshift(planToStore);
      console.log('[NUTRITION] ✅ Added plan to mock store');
      
      // Save to persistent storage
      await this.savePlansToStorage();
      
      console.log('[NUTRITION] 🎯 Final plan summary:', {
        id: planToStore.id,
        plan_name: planToStore.plan_name,
        goal_type: planToStore.goal_type,
        calories: planToStore.daily_targets.calories,
        protein: planToStore.daily_targets.protein,
        carbs: planToStore.daily_targets.carbs,
        fat: planToStore.daily_targets.fat,
        bmr: planToStore.metabolic_calculations.bmr,
        tdee: planToStore.metabolic_calculations.tdee,
        goal_calories: planToStore.metabolic_calculations.goal_calories
      });
      
      console.log('[NUTRITION] 🔍 CRITICAL CHECK - Values stored in plan:');
      console.log('  daily_targets.calories:', planToStore.daily_targets.calories);
      console.log('  metabolic_calculations.goal_calories:', planToStore.metabolic_calculations.goal_calories);
      console.log('  These should be IDENTICAL for UI consistency!');
      
      console.log('[NUTRITION] ✅ Nutrition plan generated successfully!');
      return nutritionPlan;
    } catch (error: any) {
      console.error('[NUTRITION] Error generating nutrition plan:', error);
      throw new Error('Failed to generate nutrition plan: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Generate meal templates based on nutrition targets and preferences
   */
  static generateMealTemplates(targets: any, fitnessStrategy: string, dietaryPreferences: string[] = []): any[] {
    console.log('[NUTRITION] Generating meal templates for strategy:', fitnessStrategy);
    
    // Meal distribution percentages
    const mealDistribution = {
      breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
      lunch: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.30 },
      dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.35 },
      snack: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 }
    };

    // Determine template type based on dietary preferences
    let templateType = 'standard';
    if (dietaryPreferences.includes('vegan')) templateType = 'vegan';
    else if (dietaryPreferences.includes('vegetarian')) templateType = 'vegetarian';

    const mealTemplates = [];
    
    Object.entries(mealDistribution).forEach(([mealType, distribution]) => {
      const mealCalories = Math.round(targets.calories * distribution.calories);
      const mealProtein = Math.round(targets.protein * distribution.protein);
      const mealCarbs = Math.round(targets.carbs * distribution.carbs);
      const mealFat = Math.round(targets.fat * distribution.fat);
      
      // Generate meal template based on type and preferences
      const template = this.getMealTemplate(mealType, templateType);
      
      mealTemplates.push({
        meal_type: mealType,
        recipe_name: template.name,
        prep_time: template.prep_time,
        cook_time: template.cook_time,
        servings: 1,
        ingredients: template.ingredients,
        instructions: template.instructions,
        macros: {
          calories: mealCalories,
          protein_grams: mealProtein,
          carbs_grams: mealCarbs,
          fat_grams: mealFat
            }
          });
        });
    
    return mealTemplates;
  }

  /**
   * Get meal template based on meal type and dietary preference
   */
  static getMealTemplate(mealType: string, templateType: string): any {
    const templates = {
      breakfast: {
        standard: {
          name: "Protein Oatmeal Bowl",
          prep_time: 5,
          cook_time: 10,
          ingredients: ["Rolled oats", "Protein powder", "Banana", "Almond butter", "Milk"],
          instructions: ["Cook oats with milk", "Mix in protein powder", "Top with banana and almond butter"]
        },
        vegetarian: {
          name: "Greek Yogurt Parfait",
          prep_time: 5,
          cook_time: 0,
          ingredients: ["Greek yogurt", "Granola", "Mixed berries", "Honey", "Chia seeds"],
          instructions: ["Layer yogurt with granola", "Add berries and honey", "Sprinkle chia seeds"]
        },
        vegan: {
          name: "Plant Protein Smoothie Bowl",
          prep_time: 10,
          cook_time: 0,
          ingredients: ["Plant protein powder", "Oat milk", "Frozen berries", "Banana", "Granola"],
          instructions: ["Blend protein, milk, and fruits", "Pour into bowl", "Top with granola"]
        }
      },
      lunch: {
        standard: {
          name: "Grilled Chicken Salad",
          prep_time: 15,
          cook_time: 20,
          ingredients: ["Chicken breast", "Mixed greens", "Quinoa", "Avocado", "Olive oil dressing"],
          instructions: ["Grill chicken breast", "Cook quinoa", "Assemble salad with all ingredients"]
        },
        vegetarian: {
          name: "Quinoa Buddha Bowl",
          prep_time: 10,
          cook_time: 25,
          ingredients: ["Quinoa", "Chickpeas", "Roasted vegetables", "Tahini", "Mixed greens"],
          instructions: ["Cook quinoa", "Roast vegetables", "Assemble bowl with tahini dressing"]
        },
        vegan: {
          name: "Lentil Power Bowl",
          prep_time: 15,
          cook_time: 30,
          ingredients: ["Red lentils", "Brown rice", "Steamed broccoli", "Nutritional yeast", "Hemp seeds"],
          instructions: ["Cook lentils and rice", "Steam broccoli", "Combine with nutritional yeast"]
        }
      },
      dinner: {
        standard: {
          name: "Baked Salmon with Vegetables",
          prep_time: 10,
          cook_time: 25,
          ingredients: ["Salmon fillet", "Sweet potato", "Asparagus", "Olive oil", "Herbs"],
          instructions: ["Bake salmon and sweet potato", "Steam asparagus", "Season with herbs"]
        },
        vegetarian: {
          name: "Stuffed Bell Peppers",
          prep_time: 20,
          cook_time: 35,
          ingredients: ["Bell peppers", "Quinoa", "Black beans", "Cheese", "Tomatoes"],
          instructions: ["Hollow peppers", "Mix quinoa and beans", "Stuff and bake peppers"]
        },
        vegan: {
          name: "Tofu Stir-Fry",
          prep_time: 15,
          cook_time: 15,
          ingredients: ["Firm tofu", "Mixed vegetables", "Brown rice", "Soy sauce", "Sesame oil"],
          instructions: ["Press and cube tofu", "Stir-fry with vegetables", "Serve over rice"]
        }
      },
      snack: {
        standard: {
          name: "Protein Shake",
          prep_time: 2,
          cook_time: 0,
          ingredients: ["Protein powder", "Milk", "Banana"],
          instructions: ["Blend all ingredients", "Serve immediately"]
        },
        vegetarian: {
          name: "Trail Mix",
          prep_time: 5,
          cook_time: 0,
          ingredients: ["Mixed nuts", "Dried fruits", "Seeds"],
          instructions: ["Mix all ingredients", "Store in container"]
        },
        vegan: {
          name: "Hummus with Veggies",
          prep_time: 5,
          cook_time: 0,
          ingredients: ["Hummus", "Carrots", "Celery", "Bell peppers"],
          instructions: ["Cut vegetables", "Serve with hummus"]
        }
      }
    };

    return templates[mealType]?.[templateType] || templates[mealType]?.standard || templates.breakfast.standard;
  }

  /**
   * Generate food suggestions based on dietary preferences
   */
  static generateFoodSuggestions(dietaryPreferences: string[] = [], intolerances: string[] = []): any {
    const baseFoodSuggestions = {
      proteins: ["Chicken breast", "Salmon", "Eggs", "Greek yogurt", "Cottage cheese", "Lean beef"],
      carbs: ["Oats", "Quinoa", "Sweet potato", "Brown rice", "Whole grain bread", "Fruits"],
      fats: ["Avocado", "Nuts", "Olive oil", "Seeds", "Nut butter", "Fatty fish"],
      vegetables: ["Spinach", "Broccoli", "Bell peppers", "Carrots", "Tomatoes", "Cucumber"]
    };

    const snackSuggestions = [
      "Greek yogurt with berries",
      "Apple with almond butter",
      "Trail mix",
      "Protein shake",
      "Vegetable sticks with hummus",
      "Hard-boiled eggs"
    ];

    // Filter based on dietary preferences
    let filteredSuggestions = { ...baseFoodSuggestions };
    let filteredSnacks = [...snackSuggestions];

    if (dietaryPreferences.includes('vegan')) {
      filteredSuggestions.proteins = ["Tofu", "Tempeh", "Lentils", "Chickpeas", "Plant protein powder", "Nuts"];
      filteredSnacks = ["Smoothie bowl", "Nuts and fruits", "Hummus with veggies", "Plant protein shake", "Chia pudding"];
    } else if (dietaryPreferences.includes('vegetarian')) {
      filteredSuggestions.proteins = ["Eggs", "Greek yogurt", "Cottage cheese", "Tofu", "Lentils", "Chickpeas"];
      filteredSnacks = ["Greek yogurt with berries", "Trail mix", "Vegetable sticks with hummus", "Cheese and crackers"];
    }

    // Filter based on intolerances
    if (intolerances.includes('dairy')) {
      filteredSuggestions.proteins = filteredSuggestions.proteins.filter(p => 
        !['Greek yogurt', 'Cottage cheese', 'Milk'].includes(p));
      filteredSnacks = filteredSnacks.filter(s => !s.includes('yogurt') && !s.includes('cheese'));
    }

    if (intolerances.includes('gluten')) {
      filteredSuggestions.carbs = filteredSuggestions.carbs.filter(c => 
        !['Whole grain bread', 'Oats'].includes(c));
    }

    return {
      food_suggestions: filteredSuggestions,
      snack_suggestions: filteredSnacks
    };
  }

  /**
   * Generate micronutrient targets based on profile
   */
  static generateMicronutrientTargets(profile: any): any {
    // Basic micronutrient targets (can be enhanced based on age, gender, etc.)
    return {
      vitamin_d_mcg: 15,
      calcium_mg: profile.gender === 'female' ? 1200 : 1000,
      iron_mg: profile.gender === 'female' ? 18 : 10,
      potassium_mg: 4000,
      sodium_mg: 2300,
      fiber_g: 25,
      vitamin_c_mg: 90,
      vitamin_b12_mcg: 2.4
    };
  }

  /**
   * Create a manual nutrition plan with user-specified targets (no mathematical calculations)
   */
  static async createManualNutritionPlan(
    userId: string,
    manualTargets: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    },
    options: {
      goal: string;
      dietaryPreferences: string[];
      intolerances: string[];
    }
  ): Promise<NutritionPlan> {
    try {
      console.log('[NUTRITION] Creating manual nutrition plan with user-specified targets');

      // Get user profile for plan metadata
      let userProfile;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[NUTRITION] Error fetching user profile:', error);
          throw new Error('Unable to fetch user profile');
        }

        userProfile = data;
      } catch (profileError) {
        console.log('[NUTRITION] Using fallback profile for manual plan creation');
        userProfile = {
          id: userId,
          full_name: 'User',
          goal_type: options.goal,
          goal_fat_reduction: 5,
          goal_muscle_gain: 2,
          fitness_strategy: 'maintenance'
        };
      }

      // Get user's name for the plan name
      const userName = userProfile.full_name || userProfile.username || userProfile.email || 'User';

      // Create plan ID
      const planId = `manual-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
      const planName = `${userName}'s Manual Nutrition Plan`;

      // Calculate basic BMR for reference (even though we're using manual targets)
      const age = userProfile.birthday ?
        new Date().getFullYear() - new Date(userProfile.birthday).getFullYear() : 30;

      const bmr = this.calculateBMR(
        userProfile.weight || 70,
        userProfile.height || 170,
        age,
        userProfile.gender || 'male'
      );

      // Create the manual nutrition plan
      const manualPlan: NutritionPlan = {
        id: planId,
        user_id: userId,
        plan_name: planName,
        goal_type: options.goal,
        status: 'active',
        preferences: {
          dietary: options.dietaryPreferences,
          intolerances: options.intolerances
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        // Use the manual targets provided by the user
        daily_targets: manualTargets,

        // Create minimal metabolic calculations (for reference only)
        metabolic_calculations: {
          bmr: Math.round(bmr),
          tdee: Math.round(bmr * 1.375), // Use moderate activity as default
          activity_level: 'moderately_active',
          activity_multiplier: 1.375,
          goal_calories: manualTargets.calories,
          adjusted_calories: manualTargets.calories, // UI priority field
          goal_adjustment: 0, // No adjustment since it's manual
          goal_adjustment_reason: 'Manual plan - user specified exact targets',
          calorie_adjustment_reason: 'Manual plan - user specified exact targets',
          calculation_method: 'Manual Input'
        },

        // Generate food suggestions based on preferences
        food_suggestions: this.generateFoodSuggestions(options.dietaryPreferences, options.intolerances).food_suggestions,
        snack_suggestions: this.generateFoodSuggestions(options.dietaryPreferences, options.intolerances).snack_suggestions,

        micronutrients_targets: this.generateMicronutrientTargets(userProfile)
      };

      console.log('[NUTRITION] ✅ Created manual nutrition plan:', {
        id: manualPlan.id,
        plan_name: manualPlan.plan_name,
        goal_type: manualPlan.goal_type,
        daily_targets: manualPlan.daily_targets,
        metabolic_calculations: manualPlan.metabolic_calculations
      });

      // Clear existing plans for this user to prevent conflicts
      const existingPlanIndices = [];
      for (let i = mockPlansStore.plans.length - 1; i >= 0; i--) {
        if (mockPlansStore.plans[i].user_id === userId) {
          existingPlanIndices.push(i);
        }
      }

      if (existingPlanIndices.length > 0) {
        console.log(`[NUTRITION] 🗑️ Removing ${existingPlanIndices.length} existing plans for user ${userId}`);
        existingPlanIndices.forEach(index => {
          mockPlansStore.plans.splice(index, 1);
        });
      }

      // Ensure daily_targets has both formats for compatibility
      const compatibleDailyTargets = {
        calories: manualTargets.calories,
        protein: manualTargets.protein,
        carbs: manualTargets.carbs,
        fat: manualTargets.fat,
        protein_grams: manualTargets.protein,
        carbs_grams: manualTargets.carbs,
        fat_grams: manualTargets.fat
      };

      // Create the final plan to store
      const planToStore = {
        ...manualPlan,
        daily_targets: compatibleDailyTargets
      };

      // Add to mock store
      mockPlansStore.plans.unshift(planToStore);
      console.log('[NUTRITION] ✅ Added manual plan to mock store');

      // Save to persistent storage
      await this.savePlansToStorage();

      console.log('[NUTRITION] ✅ Manual nutrition plan created and saved successfully!');
      return manualPlan;
    } catch (error: any) {
      console.error('[NUTRITION] Error creating manual nutrition plan:', error);
      throw new Error('Failed to create manual nutrition plan: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Generate a nutrition plan using mathematical calculations when API fails
   */
  static async generateMathematicalFallbackPlan(
    userId: string,
    options: { goal: string; dietaryPreferences: string[]; intolerances: string[] },
    profile: any,
    metabolicData: any
  ): Promise<NutritionPlan> {
    console.log('[NUTRITION] Generating mathematical fallback plan...');
    
    // Map goal to fitness strategy for proper macro calculation
    const fitnessStrategy = profile.fitness_strategy || this.mapGoalTypeToFitnessStrategy(options.goal);
    
    // Calculate macro ratios based on strategy
    const macroRatios = this.getMacroRatiosForStrategy(fitnessStrategy);
    
    // Calculate daily targets
    const dailyTargets = {
      calories: Math.round(metabolicData.goal_calories),
      protein: Math.round((metabolicData.goal_calories * macroRatios.protein / 100) / 4),
      carbs: Math.round((metabolicData.goal_calories * macroRatios.carbs / 100) / 4),
      fat: Math.round((metabolicData.goal_calories * macroRatios.fat / 100) / 9),
    };

    // Create plan structure
    const fallbackPlan: NutritionPlan = {
      id: `fallback-${Date.now()}-${userId.substring(0, 8)}`,
            user_id: userId,
      plan_name: `${profile.full_name || 'User'}'s Plan`,
      goal_type: fitnessStrategy, // Use fitness strategy as goal type
      preferences: {
        dietary: options.dietaryPreferences,
        intolerances: options.intolerances
      },
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      daily_targets: dailyTargets,
      food_suggestions: null,
      snack_suggestions: null,
      // ❌ REMOVED: daily_schedule - nutrition plans should only contain targets, not specific meals
      micronutrients_targets: {
        vitamin_d_mcg: 15,
        calcium_mg: 1000,
        iron_mg: 10,
        potassium_mg: 4000,
        sodium_mg: 2000,
      },
      metabolic_calculations: metabolicData
    };

    console.log('[NUTRITION] Generated mathematical fallback plan:', {
      id: fallbackPlan.id,
      goal_type: fallbackPlan.goal_type,
      daily_targets: fallbackPlan.daily_targets
    });

    // Save to mock store if using mock data
    try {
      // Add to mock plans array (assuming it exists)
      const mockPlan = {
        id: fallbackPlan.id,
        user_id: userId,
        name: fallbackPlan.plan_name,
        calories: dailyTargets.calories,
        protein: dailyTargets.protein,
        updated_at: fallbackPlan.updated_at
      };
      
      // Try to access mock storage methods if they exist
      if (typeof (this as any).mockNutritionPlans !== 'undefined') {
        (this as any).mockNutritionPlans.push(mockPlan);
        if (typeof (this as any).savePlansToStorage === 'function') {
          await (this as any).savePlansToStorage();
        }
      }
    } catch (mockError) {
      console.log('[NUTRITION] Could not save to mock store, continuing with plan creation');
    }

    return fallbackPlan;
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
        throw new Error((errorData as any).message || 'Failed to delete nutrition plan');
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
    const { base, response } = await this.fetchWithBaseFallback('/api/customize-meal', {
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
        throw new Error((errorData as any).error || `API Error: ${response.status}`);
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
    const { base, response } = await this.fetchWithBaseFallback('/api/update-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, mealTimeSlot, newMealDescription }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error((errorData as any).error || `API Error: ${response.status}`);
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
    const { base, response } = await this.fetchWithBaseFallback('/api/log-daily-metric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, metricDate, metrics }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error((errorData as any).error || 'Failed to log daily metric.');
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
          throw new Error((errorData as any).error || 'Failed to log food entry.');
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
      
      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      // Make request to the food analysis endpoint
      const { base, response } = await this.fetchWithBaseFallback('/api/analyze-food', {
        method: 'POST',
        body: formData as any, // FormData is valid for fetch body
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('[FOOD ANALYZE] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[FOOD ANALYZE] API error:', errorData);
        throw new Error((errorData as any).message || (errorData as any).error || 'Food analysis failed');
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
      if (error.name === 'AbortError') {
        throw new Error('The analysis is taking longer than expected. Please try again.');
      } else if (error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        throw new Error('The analysis is taking longer than expected. Please try again.');
      } else {
        throw new Error(error.message || 'Food analysis failed. Please try again.');
      }
    }
  }

  static async generateDailyMealPlan(userId: string): Promise<any> {
    console.log(`[NutritionService] 🚀 Generating daily meal plan using SERVER API with AI`);
    
    // Try to get AI-generated meal plan from server
    const fetchResult = await this.fetchWithBaseFallback('/api/generate-daily-meal-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId
      }),
    });

    if (fetchResult) {
      // Server is available, process response
      const { base, response } = fetchResult;
      
      try {
        if (!response.ok) {
          console.log(`[NutritionService] Server responded with status ${response.status}, using mathematical generation`);
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[NutritionService] 🔍 Server response data:', JSON.stringify(data, null, 2));
        
        // Handle both possible response formats: meal_plan (underscore) and mealPlan (camelCase)
        const mealPlanData = data.meal_plan || data.mealPlan;
        const aiGenerated = data.ai_generated || (data.method === 'ai') || (data.aiProvider && data.aiProvider !== 'none');
        
        if (data.success && mealPlanData && mealPlanData.length > 0) {
          console.log(`[NutritionService] ✅ Server generated ${mealPlanData.length} meals with AI: ${aiGenerated ? 'YES' : 'NO'}`);
          console.log(`[NutritionService] Server response format - method: ${data.method}, aiProvider: ${data.aiProvider}`);
          return mealPlanData; // Return the meal plan array directly
        } else {
          console.log('[NutritionService] Server returned empty meal plan, using mathematical generation');
          throw new Error('Server returned empty meal plan');
        }
      } catch (error) {
        // Server available but returned error, fall back to mathematical generation
        console.log('[NutritionService] 🧮 Server error, using reliable mathematical generation:', error);
      }
    } else {
      // All servers unavailable/timed out, use mathematical generation
      console.log('[NutritionService] 🧮 Servers unavailable, using mathematical generation');
    }

    // Mathematical meal plan generation (this path should not be treated as an error)
    console.log('[NutritionService] 🧮 Using reliable mathematical generation');
    
    try {
      const activePlan = await this.getLatestNutritionPlan(userId);
      
      if (!activePlan) {
        throw new Error('No active nutrition plan found. Please create a nutrition plan first.');
      }

      console.log('[NutritionService] Generating mathematical meal plan');
      const dailyTargets = activePlan.daily_targets;
      const preferences = activePlan.preferences?.dietary || [];
      const mealPlan = this.generateMathematicalMealPlan(dailyTargets, preferences);

      console.log(`[NutritionService] ✅ Successfully generated ${mealPlan.length} meals using mathematical approach`);
      return mealPlan; // This is a success, not an error!
    } catch (fallbackError) {
      console.error('[NutritionService] Mathematical generation failed:', fallbackError);
      throw fallbackError; // Only throw if the mathematical approach actually fails
    }
  }

  /**
   * Generate AI-powered daily meal plan with recipes using user's nutrition targets
   */
  static async generateAIDailyMealPlan(
    dailyCalories: number,
    proteinGrams: number, 
    carbsGrams: number,
    fatGrams: number,
    dietaryPreferences: string[] = [],
    cuisinePreference?: string
  ): Promise<any> {
    console.log('[NUTRITION] Generating AI-powered daily meal plan with recipes');
    console.log('[NUTRITION] Targets:', { dailyCalories, proteinGrams, carbsGrams, fatGrams });
    console.log('[NUTRITION] Preferences:', { dietaryPreferences, cuisinePreference });
    
    try {
      // Use the Gemini service to generate the meal plan (already imported at top)
      const result = await GeminiService.generateDailyMealPlan(
        dailyCalories,
        proteinGrams,
        carbsGrams, 
        fatGrams,
        dietaryPreferences,
        cuisinePreference
      );
      
      if (result.success && result.mealPlan) {
        console.log('[NUTRITION] Successfully generated AI meal plan with', result.mealPlan.meals.length, 'meals');
        console.log('[NUTRITION] Cuisines used:', result.mealPlan.cuisine_variety);
        return {
          success: true,
          mealPlan: result.mealPlan.meals,
          totalNutrition: result.mealPlan.total_nutrition,
          cuisineVariety: result.mealPlan.cuisine_variety,
          cookingTips: result.mealPlan.cooking_tips,
          method: 'gemini_ai',
          aiProvider: 'gemini',
          message: 'Daily meal plan generated successfully with AI-powered recipes and cooking instructions'
        };
      } else {
        throw new Error(result.error || 'Failed to generate AI meal plan');
      }
      
    } catch (error: any) {
      console.error('[NUTRITION] Error generating AI daily meal plan:', error.message);
      
      // Return fallback error response
      return {
        success: false,
        error: error.message || 'Failed to generate AI meal plan',
        fallback: true,
        message: 'AI meal plan generation failed. Please try again or use the basic meal plan generator.'
      };
    }
  }

  /**
   * Generate mathematical meal plan based on targets and preferences
   */
  static generateMathematicalMealPlan(targets: any, dietaryPreferences: string[] = []): any[] {
    console.log('[NUTRITION] Generating mathematical meal plan with targets:', targets);
    
    // Meal distribution percentages
    const mealDistribution = {
      breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
      lunch: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.30 },
      dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.35 },
      snack: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 }
    };

    // Determine template type based on dietary preferences
    let templateType = 'standard';
    if (dietaryPreferences.includes('vegan')) templateType = 'vegan';
    else if (dietaryPreferences.includes('vegetarian')) templateType = 'vegetarian';

    const mealPlan: any[] = [];
    
    Object.entries(mealDistribution).forEach(([mealType, distribution]) => {
      const mealCalories = Math.round(targets.calories * distribution.calories);
      const mealProtein = Math.round((targets.protein || targets.protein_grams) * distribution.protein);
      const mealCarbs = Math.round((targets.carbs || targets.carbs_grams) * distribution.carbs);
      const mealFat = Math.round((targets.fat || targets.fat_grams) * distribution.fat);
      
      // Generate meal template
      const template = this.getMealTemplate(mealType, templateType);
      
      mealPlan.push({
        meal_type: mealType,
        recipe_name: template.name,
        prep_time: template.prep_time,
        cook_time: template.cook_time,
        servings: 1,
        ingredients: template.ingredients,
        instructions: template.instructions,
        macros: {
          calories: mealCalories,
          protein_grams: mealProtein,
          carbs_grams: mealCarbs,
          fat_grams: mealFat
        }
      });
    });
    
    return mealPlan;
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

  /**
   * Generate a new meal plan for a specific date using Gemini AI or fallback to mathematical calculation
   */
  static async generateMealPlanForDate(
    planId: string,
    date: string
  ): Promise<any[]> {
    try {
      console.log('[NUTRITION] Generating NEW meal plan for date:', date, 'plan ID:', planId);
      
      // Get the nutrition plan to use its targets
      const nutritionPlan = await this.getNutritionPlanById(planId);
      if (!nutritionPlan) {
        throw new Error('Nutrition plan not found');
      }

      // Try to generate using the server API (which may use Gemini)
      try {
        console.log('[NUTRITION] Attempting to generate meal plan via server API...');
        
        // Add timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const { base, response } = await this.fetchWithBaseFallback('/api/generate-daily-meal-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: nutritionPlan.user_id,
            date: date
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if ((data as any).success && (data as any).meal_plan && (data as any).meal_plan.length > 0) {
            console.log('[NUTRITION] ✅ Generated meal plan via server API');
            
            // Transform server API response to match expected UI format
            const transformedServerMealPlan = (data as any).meal_plan.map((meal: any) => ({
              id: `${meal.meal_type}_${Date.now()}`,
              meal_type: meal.meal_type,
              meal_description: meal.recipe_name, // Map recipe_name to meal_description for UI
              calories: meal.macros?.calories || meal.calories,
              protein_grams: meal.macros?.protein_grams || meal.protein_grams,
              carbs_grams: meal.macros?.carbs_grams || meal.carbs_grams,
              fat_grams: meal.macros?.fat_grams || meal.fat_grams,
              prep_time: meal.prep_time,
              cook_time: meal.cook_time,
              servings: meal.servings,
              ingredients: meal.ingredients,
              instructions: meal.instructions,
              // Keep original structure for compatibility
              recipe_name: meal.recipe_name,
              macros: meal.macros
            }));
            
            return transformedServerMealPlan;
          }
        } else {
          console.log('[NUTRITION] Server API failed, falling back to mathematical generation');
        }
      } catch (apiError: any) {
        console.log('[NUTRITION] API error, falling back to mathematical generation:', apiError);
        
        // Log specific error types for debugging
        if (apiError.name === 'AbortError') {
          console.log('[NUTRITION] Server API request timed out');
        } else if (apiError.message?.includes('Network request failed')) {
          console.log('[NUTRITION] Network connection failed');
        } else if (apiError.message?.includes('fetch')) {
          console.log('[NUTRITION] Fetch request failed');
        }
      }

      // Fallback to mathematical meal plan generation
      console.log('[NUTRITION] Using mathematical meal plan generation as fallback');
      const mealPlan = this.generateMathematicalMealPlan(
        nutritionPlan.daily_targets,
        nutritionPlan.preferences?.dietary || []
      );

      // Store the generated meal plan in mock store for future retrieval
      const existingPlanIndex = mockPlansStore.plans.findIndex(
        plan => plan.suggestion_date === date
      );
      
      if (existingPlanIndex === -1) {
        mockPlansStore.plans.push({
          id: `meal-plan-${date}`,
          user_id: nutritionPlan.user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          daily_targets: nutritionPlan.daily_targets,
          meal_plan: mealPlan,
          suggestion_date: date
        });
      } else {
        mockPlansStore.plans[existingPlanIndex].meal_plan = mealPlan;
      }

      // Transform the meal plan data to match the expected UI format
      const transformedMealPlan = mealPlan.map(meal => ({
        id: `${meal.meal_type}_${Date.now()}`,
        meal_type: meal.meal_type,
        meal_description: meal.recipe_name, // Map recipe_name to meal_description for UI
        calories: meal.macros.calories,
        protein_grams: meal.macros.protein_grams,
        carbs_grams: meal.macros.carbs_grams,
        fat_grams: meal.macros.fat_grams,
        prep_time: meal.prep_time,
        cook_time: meal.cook_time,
        servings: meal.servings,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        // Keep original structure for compatibility
        recipe_name: meal.recipe_name,
        macros: meal.macros
      }));

      console.log('[NUTRITION] ✅ Generated mathematical meal plan with', transformedMealPlan.length, 'meals');
      return transformedMealPlan;

    } catch (error) {
      console.error('[NUTRITION] Error generating meal plan for date:', date, error);
      throw error;
    }
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
    const { base, response } = await this.fetchWithBaseFallback('/api/analyze-behavior', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error((errorData as any).error || 'Failed to analyze behavior.');
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
    const { base, response } = await this.fetchWithBaseFallback('/api/behavioral-coaching-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insight, chatHistory }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error((errorData as any).error || 'Failed to get coaching response.');
    }

    const data = await response.json();
    return (data as any).aiMessage;
  }

  static async acknowledgeInsight(insightId: string): Promise<void> {
    const { error } = await supabase
      .from('behavioral_insights')
      .update({ is_acknowledged: true } as any)
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
      .update({ is_seen: true } as any)
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as seen:', error);
      throw error;
    }
  }

  // Additional missing methods
  static async chatAdjustNutritionPlan(history: any[], plan: any, user: any): Promise<{ aiMessage: string; newPlan?: any }> {
    try {
      const { base, response } = await this.fetchWithBaseFallback('/api/nutrition-chat-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, plan, user }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error((errorData as any).error || 'Failed to adjust nutrition plan.');
      }

      return await response.json();
    } catch (error) {
      console.error('Error adjusting nutrition plan via chat:', error);
      throw error;
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const baseUrls = getBaseUrls();
      for (const baseUrl of baseUrls) {
        try {
          const response = await fetch(`${baseUrl}/api/health`, {
            method: 'GET',
            timeout: 5000,
          } as any);
          if (response.ok) {
            return true;
          }
        } catch (err) {
          console.log(`Connection test failed for ${baseUrl}:`, err);
          continue;
        }
      }
      return false;
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }

  static async generateRecipe(mealType: string, targets: any, ingredients: string[]): Promise<any> {
    try {
      const { base, response } = await this.fetchWithBaseFallback('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, targets, ingredients }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error((errorData as any).error || 'Failed to generate recipe.');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating recipe:', error);
      throw error;
    }
  }

  static async saveRecipe(recipe: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('saved_recipes')
        .insert([recipe])
        .select();

      if (error) {
        console.error('Error saving recipe:', error);
        throw error;
      }

      return data?.[0];
    } catch (error) {
      console.error('Error saving recipe:', error);
      throw error;
    }
  }

  static async getSavedRecipes(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved recipes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching saved recipes:', error);
      return [];
    }
  }

  static async deleteSavedRecipe(recipeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('id', recipeId);

      if (error) {
        console.error('Error deleting saved recipe:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting saved recipe:', error);
      throw error;
    }
  }

}
