import { supabase } from '../supabase/client';
import { Database } from '../../types/database';
import { mockNutritionPlan, mockPlansStore, mockMotivationalMessage } from '../../mock-data';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Profile = Database['public']['Tables']['profiles']['Row'];

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

// Base URLs for fallback system (Railway first for stability)
const getBaseUrls = () => {
  return [
    'https://gofitai-production.up.railway.app', // Railway server (PRIMARY)
    environment.apiUrl, // Configured URL from environment
    'http://192.168.0.176:4000', // Local network IP (for development)
    'http://localhost:4000', // Localhost fallback
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
        // Use shorter timeout for local servers, longer for remote
        const isLocal = base.includes('localhost') || base.includes('192.168.') || base.includes('127.0.0.1');
        const timeoutMs = isLocal ? 15000 : 30000; // 15s for local, 30s for remote
        const timeoutId = setTimeout(() => {
          console.log(`[NutritionService] ⏰ Request timeout after ${timeoutMs}ms for: ${base}`);
          controller.abort();
        }, timeoutMs);
        
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
  /**
   * Utility method to check if a string is a valid UUID
   */
  private static isValidUUID(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    if (id === 'guest') return false; // Guest users don't have valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  static async getLatestNutritionPlan(
    userId: string
  ): Promise<NutritionPlan | null> {
    try {
      // Skip Supabase queries for guest users or invalid UUIDs
      if (!this.isValidUUID(userId)) {
        console.log('[NUTRITION] Guest user or invalid UUID detected, skipping Supabase query');
        // Fall through to mock data
      } else {
        // Optimized: Use only essential fields to reduce query time
        // Note: metabolic_calculations is not a database column, it's computed/stored in plan object
        const essentialFields = 'id, user_id, plan_name, plan_type, goal_type, created_at, updated_at, status, daily_targets, preferences';
        
          const selectedPlanId = await this.getSelectedNutritionPlanId(userId).catch(() => null);
        
        if (selectedPlanId) {
          // Try to fetch the selected plan from Supabase with essential fields only
          try {
            const { data: selectedPlan, error: selectedError } = await supabase
              .from('nutrition_plans')
              .select(essentialFields)
              .eq('id', selectedPlanId)
              .eq('user_id', userId)
              .maybeSingle();
            
            if (selectedPlan) {
              const planData = selectedPlan as any;
              
              // Normalize daily_targets
              if (planData.daily_targets) {
                if (!planData.daily_targets.protein && planData.daily_targets.protein_grams) {
                  planData.daily_targets.protein = planData.daily_targets.protein_grams;
                }
                if (!planData.daily_targets.carbs && planData.daily_targets.carbs_grams) {
                  planData.daily_targets.carbs = planData.daily_targets.carbs_grams;
                }
                if (!planData.daily_targets.fat && planData.daily_targets.fat_grams) {
                  planData.daily_targets.fat = planData.daily_targets.fat_grams;
                }
              }
              
              // Extract metabolic_calculations from preferences if stored there (for mathematical plans)
              if (planData.plan_type === 'mathematical' && planData.preferences?.metabolic_calculations) {
                planData.metabolic_calculations = planData.preferences.metabolic_calculations;
              }
              
              return planData;
            } else if (selectedError && selectedError.code !== 'PGRST116') {
              // Clear invalid selection (non-blocking)
              AsyncStorage.removeItem(`selected_nutrition_plan_${userId}`).catch(() => {});
            }
          } catch (dbError) {
            // Continue to fallback
          }
        }
        
        // 2. Fallback: get the latest plan if no selected plan found (optimized query)
        try {
          const { data, error } = await supabase
            .from('nutrition_plans')
            .select(essentialFields)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            const planData = data as any;
            console.log('[NUTRITION] ✅ Found latest plan in Supabase:', planData.id);
            
              // Normalize daily_targets
              if (planData.daily_targets) {
                if (!planData.daily_targets.protein && planData.daily_targets.protein_grams) {
                  planData.daily_targets.protein = planData.daily_targets.protein_grams;
                }
                if (!planData.daily_targets.carbs && planData.daily_targets.carbs_grams) {
                  planData.daily_targets.carbs = planData.daily_targets.carbs_grams;
                }
                if (!planData.daily_targets.fat && planData.daily_targets.fat_grams) {
                  planData.daily_targets.fat = planData.daily_targets.fat_grams;
                }
              }
              
              // Extract metabolic_calculations from preferences if stored there (for mathematical plans)
              if (planData.plan_type === 'mathematical' && planData.preferences?.metabolic_calculations) {
                planData.metabolic_calculations = planData.preferences.metabolic_calculations;
              }
              
              return planData;
          }
          
          if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.warn('[NUTRITION] Error fetching from Supabase:', error);
          }
        } catch (dbError) {
          console.warn('[NUTRITION] Exception fetching from Supabase:', dbError);
        }
      }

      console.log('[NUTRITION] Falling back to mock data for getLatestNutritionPlan');
      console.log('[NUTRITION] Mock store plans:', mockPlansStore.plans.map(p => ({ id: p.id, name: p.plan_name, user_id: p.user_id })));
      
      // 3. Fallback to mock store
      const userPlans = mockPlansStore.plans.filter(plan => plan.user_id === userId);
      console.log('[NUTRITION] User plans found in mock store:', userPlans.length);
      
      if (userPlans.length > 0) {
        // First try to find the selected plan
        if (selectedPlanId) {
          const selectedPlan = userPlans.find(plan => plan.id === selectedPlanId);
          if (selectedPlan) {
            console.log('[NUTRITION] Returning selected plan from mock:', selectedPlan.plan_name);
            return selectedPlan;
          }
        }
        
        // If no selected plan, return the most recently created plan
        const sortedPlans = [...userPlans].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        console.log('[NUTRITION] Returning most recent user plan from mock:', sortedPlans[0].plan_name);
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
      // 0. Handle temporary guest plan
      if (planId === 'temp-guest-plan') {
        console.log('[NUTRITION] Loading temporary guest plan from storage');
        const tempPlanStr = await AsyncStorage.getItem('temp_guest_nutrition_plan');
        if (tempPlanStr) {
          const tempPlan = JSON.parse(tempPlanStr);
          // Convert AInutritionPlan format to NutritionPlan format if needed
          return {
            id: tempPlan.id,
            user_id: tempPlan.user_id,
            plan_name: tempPlan.plan_name,
            goal_type: tempPlan.goal_type,
            plan_type: 'ai_generated',
            daily_targets: {
              calories: tempPlan.daily_calories,
              protein: tempPlan.protein_grams,
              carbs: tempPlan.carbs_grams,
              fat: tempPlan.fat_grams,
              protein_percentage: tempPlan.protein_percentage,
              carbs_percentage: tempPlan.carbs_percentage,
              fat_percentage: tempPlan.fat_percentage,
            },
            ai_explanation: tempPlan.explanation,
            ai_reasoning: tempPlan.reasoning,
            preferences: tempPlan.preferences,
            status: 'active',
            created_at: tempPlan.created_at,
            updated_at: tempPlan.updated_at,
          } as NutritionPlan;
        }
      }

      // 1. Try to fetch from Supabase first
      // Only attempt if planId looks like a UUID to avoid PostgreSQL errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(planId)) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data, error } = await supabase
              .from('nutrition_plans')
              .select('*')
              .eq('id', planId)
              .maybeSingle();

            if (data) {
              const planData = data as any;
              console.log('[NUTRITION] ✅ Found plan in Supabase:', planData.id);

              // Normalize daily_targets to ensure compatibility with UI
              if (planData.daily_targets) {
                if (!planData.daily_targets.protein && planData.daily_targets.protein_grams) {
                  planData.daily_targets.protein = planData.daily_targets.protein_grams;
                }
                if (!planData.daily_targets.carbs && planData.daily_targets.carbs_grams) {
                  planData.daily_targets.carbs = planData.daily_targets.carbs_grams;
                }
                if (!planData.daily_targets.fat && planData.daily_targets.fat_grams) {
                  planData.daily_targets.fat = planData.daily_targets.fat_grams;
                }
              }
              
              // Extract metabolic_calculations from preferences if stored there (for mathematical plans)
              if (planData.plan_type === 'mathematical' && planData.preferences?.metabolic_calculations) {
                planData.metabolic_calculations = planData.preferences.metabolic_calculations;
                console.log('[NUTRITION] ✅ Extracted metabolic_calculations from preferences for mathematical plan');
              }

              return planData;
            }
          }
        } catch (err) {
          console.warn('[NUTRITION] Exception fetching plan from Supabase:', err);
        }
      } else {
        console.log('[NUTRITION] Skipping Supabase query for non-UUID planId:', planId);
      }

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
        
        // Extract metabolic_calculations from preferences if stored there (for mathematical plans)
        if (storedPlan.plan_type === 'mathematical' && storedPlan.preferences?.metabolic_calculations) {
          storedPlan.metabolic_calculations = storedPlan.preferences.metabolic_calculations;
          console.log('[NUTRITION] ✅ Extracted metabolic_calculations from preferences for mathematical plan (mock store)');
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
      console.log('[NUTRITION] Fetching all nutrition plans for user:', userId);
      
      // Skip Supabase queries for guest users or invalid UUIDs
      if (this.isValidUUID(userId)) {
        // 1. Try to fetch from Supabase first - only essential fields for list view
        try {
          // Only fetch essential fields - exclude large JSON fields like meal_plans, weekly_schedule
          // IMPORTANT: Do NOT filter by status - return ALL plans (active, archived, draft, etc.)
          // Note: metabolic_calculations is not a database column, it's computed/stored in plan object
          const essentialFields = 'id, user_id, plan_name, plan_type, goal_type, created_at, updated_at, status, daily_targets, preferences';
          const { data, error } = await supabase
            .from('nutrition_plans')
            .select(essentialFields)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50); // Limit to prevent fetching too many plans

          if (error) {
            console.error('[NUTRITION] Query error:', error);
          }

          if (data && data.length > 0) {
            console.log(`[NUTRITION] ✅ Found ${data.length} plans in Supabase`);
            console.log(`[NUTRITION] Plan IDs:`, data.map(p => ({ id: p.id, name: p.plan_name, type: p.plan_type, status: p.status })));
            
            // Normalize plans
            const normalizedPlans = data.map(item => {
              const plan = item as any;
              
              // Normalize daily_targets
              if (plan.daily_targets) {
                if (!plan.daily_targets.protein && plan.daily_targets.protein_grams) {
                  plan.daily_targets.protein = plan.daily_targets.protein_grams;
                }
                if (!plan.daily_targets.carbs && plan.daily_targets.carbs_grams) {
                  plan.daily_targets.carbs = plan.daily_targets.carbs_grams;
                }
                if (!plan.daily_targets.fat && plan.daily_targets.fat_grams) {
                  plan.daily_targets.fat = plan.daily_targets.fat_grams;
                }
              }
              
              return plan;
            });
            
            console.log(`[NUTRITION] ✅ Returning ${normalizedPlans.length} normalized plans`);
            return normalizedPlans;
          } else {
            console.log(`[NUTRITION] ⚠️ No plans found in Supabase for user_id: ${userId}`);
            if (error) {
              console.error(`[NUTRITION] Query had error:`, error);
            }
          }
          
          if (error) {
            console.warn('[NUTRITION] Error fetching plans from Supabase:', error);
          }
        } catch (dbError) {
          console.warn('[NUTRITION] Exception fetching plans from Supabase:', dbError);
        }
      } else {
        console.log('[NUTRITION] Guest user or invalid UUID detected, skipping Supabase query');
      }

      console.log('[NUTRITION] Falling back to mock data for getAllNutritionPlans');
      console.log('[NUTRITION] Current mock store plans:', mockPlansStore.plans.map(p => ({ id: p.id, name: p.plan_name, user_id: p.user_id })));
      
      // Return any stored plans for this user
      const userPlans = mockPlansStore.plans
        .filter(plan => plan.user_id === userId);
      
      // Don't add default plan for new users - let them create their own
      if (userPlans.length === 0) {
        console.log('[NUTRITION] No user plans found - new users should create their own plan');
      }

      // Add metabolic calculations to existing plans that don't have them
      // Only query profile if userId is a valid UUID
      if (this.isValidUUID(userId)) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profile) {
            const typedProfile = profile as Profile;
            const age = typedProfile.birthday ? 
              new Date().getFullYear() - new Date(typedProfile.birthday).getFullYear() : 30;

            userPlans.forEach(plan => {
              if (!plan.metabolic_calculations) {
                const metabolicData = this.getMetabolicData({
                  id: userId,
                  goal_type: plan.goal_type || 'maintenance',
                  height: typedProfile.height || 170,
                  weight: typedProfile.weight || 70,
                  age: age,
                  gender: typedProfile.gender || 'male',
                  goal_fat_reduction: typedProfile.goal_fat_reduction || 5,
                  goal_muscle_gain: typedProfile.goal_muscle_gain || 5,
                  full_name: typedProfile.full_name || 'User'
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
      }
      
      // Removed artificial delay - it was slowing down the app
      
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
      // 1. Try to fetch from Supabase first
      try {
        const { data, error } = await supabase
          .from('historical_nutrition_targets')
          .select('*')
          .eq('nutrition_plan_id', planId)
          .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
          console.log('[NUTRITION] ✅ Found historical targets in Supabase');
          return data;
        }
      } catch (err) {
        console.warn('[NUTRITION] Exception fetching historical targets:', err);
      }

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
      cuisinePreferences?: string[];
    }
  ): Promise<NutritionPlan | null> {
    try {
      console.log('[NUTRITION] 🧮 Generating nutrition plan using PURE MATHEMATICAL CALCULATIONS (no API)');
      console.log('[NUTRITION] Options:', options);

      let userProfile;
      if (userId === 'guest') {
        console.log('[NUTRITION] Guest user detected, using mock profile for mathematical calculation');
        userProfile = {
          id: 'guest',
          full_name: 'Guest User',
          username: 'guest',
          email: 'guest@example.com',
          birthday: null,
          height: 175,
          weight: 75,
          gender: 'male' as const,
          goal_type: options.goal,
          goal_fat_reduction: options.goal === 'fat_loss' ? 10 : (options.goal === 'muscle_gain' ? 2 : 5),
          goal_muscle_gain: options.goal === 'muscle_gain' ? 5 : (options.goal === 'fat_loss' ? 1 : 2),
          fitness_strategy: 'maintenance' as const,
          activity_level: 'moderately_active' as const,
          body_fat_percentage: 20
        };
      } else {
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
      const cuisinePreferences = options.cuisinePreferences ?? [];
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
          intolerances: options.intolerances,
          favorite_cuisines: cuisinePreferences
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
      
      // 6. Save to Supabase database (if not guest user)
      if (userId !== 'guest') {
        try {
          console.log('[NUTRITION] 💾 Saving mathematical plan to database for user:', userId);
          
          // First, archive any existing active plans for this user
          try {
            const { error: archiveError } = await supabase
              .from('nutrition_plans')
              .update({ status: 'archived' })
              .eq('user_id', userId)
              .eq('status', 'active');
            
            if (archiveError) {
              console.warn('[NUTRITION] Could not archive existing plans:', archiveError);
            } else {
              console.log('[NUTRITION] ✅ Archived existing active plans');
            }
          } catch (archiveError) {
            console.warn('[NUTRITION] Exception archiving existing plans:', archiveError);
          }

          // Save to database
          // Note: Store metabolic_calculations in preferences as JSON since it's not a database column
          // This allows us to retrieve it later for displaying reasoning
          const planPreferences = {
            ...(planToStore.preferences || {
              dietary: options.dietaryPreferences || [],
              intolerances: options.intolerances || [],
              favorite_cuisines: options.cuisinePreferences || []
            }),
            // Store metabolic calculations in preferences for retrieval
            metabolic_calculations: planToStore.metabolic_calculations || nutritionPlan.metabolic_calculations
          };
          
          const planData = {
            user_id: userId,
            plan_name: planToStore.plan_name,
            goal_type: planToStore.goal_type,
            plan_type: 'mathematical',
            status: 'active',
            daily_targets: compatibleDailyTargets,
            preferences: planPreferences,
          };
          
          console.log('[NUTRITION] Inserting plan data:', {
            user_id: planData.user_id,
            plan_name: planData.plan_name,
            goal_type: planData.goal_type,
            plan_type: planData.plan_type,
            status: planData.status,
            daily_targets: planData.daily_targets
          });
          
          const { data: savedPlan, error: saveError } = await supabase
            .from('nutrition_plans')
            .insert(planData)
            .select()
            .single();

          if (saveError) {
            console.error('[NUTRITION] ❌ Error saving plan to database:', saveError);
            console.error('[NUTRITION] Error details:', JSON.stringify(saveError, null, 2));
            // Continue with local storage fallback
          } else if (savedPlan) {
            console.log('[NUTRITION] ✅ Plan saved to database successfully!');
            console.log('[NUTRITION] Saved plan ID:', savedPlan.id);
            console.log('[NUTRITION] Saved plan status:', savedPlan.status);
            
            // Update the plan ID to match database ID
            planToStore.id = savedPlan.id;
            nutritionPlan.id = savedPlan.id;
            planToStore.created_at = savedPlan.created_at;
            planToStore.updated_at = savedPlan.updated_at;
            nutritionPlan.created_at = savedPlan.created_at;
            nutritionPlan.updated_at = savedPlan.updated_at;
            
            // Set as selected plan for the user
            try {
              await this.setSelectedNutritionPlanForTargets(userId, savedPlan.id);
              console.log('[NUTRITION] ✅ Plan set as active/selected');
            } catch (selectError) {
              console.warn('[NUTRITION] Could not set plan as selected:', selectError);
            }
            
            // Verify the plan is in the database by querying it
            try {
              // Small delay to ensure database commit
              await new Promise(resolve => setTimeout(resolve, 200));
              
              const { data: verifyPlan, error: verifyError } = await supabase
                .from('nutrition_plans')
                .select('id, plan_name, status, user_id, plan_type')
                .eq('id', savedPlan.id)
                .single();
              
              if (verifyError) {
                console.error('[NUTRITION] ❌ Verification query failed:', verifyError);
              } else if (verifyPlan) {
                console.log('[NUTRITION] ✅ Verified plan exists in database:', verifyPlan);
              }
              
              // Also verify it appears in getAllNutritionPlans query
              const { data: allPlans, error: allPlansError } = await supabase
                .from('nutrition_plans')
                .select('id, plan_name, plan_type, status')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
              
              if (allPlansError) {
                console.error('[NUTRITION] ❌ getAllPlans query failed:', allPlansError);
              } else {
                console.log(`[NUTRITION] ✅ getAllPlans query found ${allPlans?.length || 0} plans:`, allPlans?.map(p => ({ id: p.id, name: p.plan_name, type: p.plan_type })));
              }
            } catch (verifyException) {
              console.warn('[NUTRITION] Exception during verification:', verifyException);
            }
          } else {
            console.error('[NUTRITION] ❌ No data returned from database insert');
          }
        } catch (dbError) {
          console.error('[NUTRITION] ❌ Exception saving plan to database:', dbError);
          console.error('[NUTRITION] Exception details:', dbError instanceof Error ? dbError.message : String(dbError));
          // Continue with local storage fallback
        }
      } else {
        console.log('[NUTRITION] Guest user detected, skipping database save');
      }
      
      // Add to mock store (for local fallback)
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
        bmr: planToStore.metabolic_calculations?.bmr,
        tdee: planToStore.metabolic_calculations?.tdee,
        goal_calories: planToStore.metabolic_calculations?.goal_calories
      });
      
      // Return the plan with database ID if it was saved
      console.log('[NUTRITION] ✅ Nutrition plan generated and saved successfully!');
      console.log('[NUTRITION] Returning plan with ID:', nutritionPlan.id);
      console.log('[NUTRITION] Plan status:', nutritionPlan.status);
      console.log('[NUTRITION] Plan user_id:', nutritionPlan.user_id);
      
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
   * Get the complete food database
   * Returns all foods with their nutritional information (per 100g)
   */
  static getFoodDatabase(): Array<{
    key: string;
    name: string;
    category: 'protein' | 'carbs' | 'fat';
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    description?: string;
    commonServing?: string;
  }> {
    // Access the internal food database directly
    const foodDatabase = this.getFoodDatabaseInternal();
    
    // Convert to array format
    return Object.entries(foodDatabase).map(([key, food]) => ({
      key,
      name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      category: food.category,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      calories: food.calories,
      description: food.description,
      commonServing: food.commonServing,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Internal method to get the raw food database
   */
  private static getFoodDatabaseInternal(): Record<string, {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
    category: 'protein' | 'carbs' | 'fat';
    description?: string;
    commonServing?: string;
  }> {
    // This is the same database used in calculateFoodServingsForMacro
    return {
      // Protein sources
      // Chicken variations
      'chicken_breast': { protein: 31, carbs: 0, fat: 3.6, calories: 165, category: 'protein', description: 'Grilled, skinless', commonServing: '100g (palm-sized portion)' },
      'chicken_thigh': { protein: 26, carbs: 0, fat: 10, calories: 209, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (1 medium thigh)' },
      'chicken_leg': { protein: 27, carbs: 0, fat: 8, calories: 184, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (1 drumstick + thigh)' },
      'chicken_drumstick': { protein: 28, carbs: 0, fat: 5.7, calories: 172, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (1-2 drumsticks)' },
      'chicken_wing': { protein: 27, carbs: 0, fat: 8, calories: 203, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (2-3 wings)' },
      'chicken_thigh_with_skin': { protein: 25, carbs: 0, fat: 15, calories: 229, category: 'protein', description: 'Roasted, with skin', commonServing: '100g (1 medium thigh)' },
      'chicken_leg_with_skin': { protein: 26, carbs: 0, fat: 12, calories: 215, category: 'protein', description: 'Roasted, with skin', commonServing: '100g (1 leg)' },
      'chicken_whole': { protein: 27, carbs: 0, fat: 8, calories: 190, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (mixed parts)' },
      'chicken_ground': { protein: 27, carbs: 0, fat: 3, calories: 143, category: 'protein', description: 'Cooked, 99% lean', commonServing: '100g (palm-sized)' },
      'chicken_liver': { protein: 25, carbs: 1, fat: 4.8, calories: 167, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'chicken_heart': { protein: 26, carbs: 0.1, fat: 7.9, calories: 185, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      
      // Turkey variations
      'turkey_breast': { protein: 30, carbs: 0, fat: 1, calories: 135, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (palm-sized)' },
      'turkey_thigh': { protein: 28, carbs: 0, fat: 7, calories: 189, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (1 medium thigh)' },
      'turkey_leg': { protein: 29, carbs: 0, fat: 4, calories: 159, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (1 leg)' },
      'turkey_wing': { protein: 27, carbs: 0, fat: 6, calories: 177, category: 'protein', description: 'Roasted, skinless', commonServing: '100g (1-2 wings)' },
      'turkey_ground': { protein: 28, carbs: 0, fat: 7, calories: 189, category: 'protein', description: 'Cooked, 93% lean', commonServing: '100g (palm-sized)' },
      'turkey_deli': { protein: 18, carbs: 1.5, fat: 5, calories: 125, category: 'protein', description: 'Sliced, roasted', commonServing: '100g (4-5 slices)' },
      
      // Beef variations
      'lean_beef': { protein: 26, carbs: 0, fat: 5, calories: 150, category: 'protein', description: '95% lean, cooked', commonServing: '100g (palm-sized)' },
      'beef_sirloin': { protein: 28, carbs: 0, fat: 6, calories: 180, category: 'protein', description: 'Grilled, trimmed', commonServing: '100g (palm-sized)' },
      'beef_ribeye': { protein: 25, carbs: 0, fat: 15, calories: 291, category: 'protein', description: 'Grilled, trimmed', commonServing: '100g (palm-sized)' },
      'beef_tenderloin': { protein: 30, carbs: 0, fat: 8, calories: 211, category: 'protein', description: 'Grilled, filet mignon', commonServing: '100g (palm-sized)' },
      'beef_ground_90': { protein: 26, carbs: 0, fat: 10, calories: 204, category: 'protein', description: 'Cooked, 90% lean', commonServing: '100g (palm-sized)' },
      'beef_ground_85': { protein: 25, carbs: 0, fat: 15, calories: 250, category: 'protein', description: 'Cooked, 85% lean', commonServing: '100g (palm-sized)' },
      'beef_ground_80': { protein: 24, carbs: 0, fat: 20, calories: 296, category: 'protein', description: 'Cooked, 80% lean', commonServing: '100g (palm-sized)' },
      'beef_brisket': { protein: 28, carbs: 0, fat: 19, calories: 331, category: 'protein', description: 'Cooked, trimmed', commonServing: '100g (palm-sized)' },
      'beef_chuck': { protein: 27, carbs: 0, fat: 18, calories: 305, category: 'protein', description: 'Braised, trimmed', commonServing: '100g (palm-sized)' },
      'beef_round': { protein: 29, carbs: 0, fat: 4, calories: 157, category: 'protein', description: 'Roasted, top round', commonServing: '100g (palm-sized)' },
      'beef_flank': { protein: 28, carbs: 0, fat: 8, calories: 211, category: 'protein', description: 'Grilled, trimmed', commonServing: '100g (palm-sized)' },
      'beef_short_ribs': { protein: 22, carbs: 0, fat: 25, calories: 351, category: 'protein', description: 'Braised', commonServing: '100g (palm-sized)' },
      'beef_liver': { protein: 29, carbs: 5, fat: 4.7, calories: 191, category: 'protein', description: 'Pan-fried', commonServing: '100g (1/2 cup)' },
      'beef_heart': { protein: 28, carbs: 0.1, fat: 3.9, calories: 165, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'beef_tongue': { protein: 16, carbs: 0, fat: 16, calories: 224, category: 'protein', description: 'Cooked', commonServing: '100g (palm-sized)' },
      'corned_beef': { protein: 25, carbs: 0.5, fat: 5, calories: 251, category: 'protein', description: 'Canned', commonServing: '100g (palm-sized)' },
      'beef_jerky': { protein: 33, carbs: 11, fat: 25, calories: 410, category: 'protein', description: 'Dried', commonServing: '100g (1/2 cup)' },
      
      // Pork variations
      'pork_tenderloin': { protein: 27, carbs: 0, fat: 4, calories: 143, category: 'protein', description: 'Roasted', commonServing: '100g (palm-sized)' },
      'pork_chop': { protein: 26, carbs: 0, fat: 8, calories: 196, category: 'protein', description: 'Grilled, boneless', commonServing: '100g (1 medium chop)' },
      'pork_shoulder': { protein: 27, carbs: 0, fat: 21, calories: 297, category: 'protein', description: 'Roasted, trimmed', commonServing: '100g (palm-sized)' },
      'pork_loin': { protein: 28, carbs: 0, fat: 6, calories: 184, category: 'protein', description: 'Roasted, trimmed', commonServing: '100g (palm-sized)' },
      'pork_ribs': { protein: 21, carbs: 0, fat: 24, calories: 321, category: 'protein', description: 'Roasted, back ribs', commonServing: '100g (2-3 ribs)' },
      'pork_belly': { protein: 9, carbs: 0, fat: 53, calories: 518, category: 'protein', description: 'Roasted', commonServing: '100g (palm-sized)' },
      'pork_ground': { protein: 26, carbs: 0, fat: 10, calories: 212, category: 'protein', description: 'Cooked, 90% lean', commonServing: '100g (palm-sized)' },
      'pork_sausage': { protein: 14, carbs: 2, fat: 28, calories: 301, category: 'protein', description: 'Cooked, Italian', commonServing: '100g (2 links)' },
      'pork_ham': { protein: 18, carbs: 1.5, fat: 5, calories: 145, category: 'protein', description: 'Cured, cooked', commonServing: '100g (3-4 slices)' },
      'pork_bacon': { protein: 37, carbs: 1.4, fat: 42, calories: 541, category: 'protein', description: 'Pan-fried', commonServing: '100g (8-10 strips)' },
      'pancetta': { protein: 19, carbs: 0, fat: 60, calories: 655, category: 'protein', description: 'Cured, raw', commonServing: '100g (1/2 cup diced)' },
      'prosciutto': { protein: 26, carbs: 0, fat: 18, calories: 263, category: 'protein', description: 'Cured, dry-cured', commonServing: '100g (5-6 slices)' },
      'pork_liver': { protein: 26, carbs: 4, fat: 4.4, calories: 165, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      
      // Lamb variations
      'lamb': { protein: 25, carbs: 0, fat: 21, calories: 294, category: 'protein', description: 'Leg, roasted', commonServing: '100g (palm-sized)' },
      'lamb_leg': { protein: 26, carbs: 0, fat: 14, calories: 258, category: 'protein', description: 'Roasted, trimmed', commonServing: '100g (palm-sized)' },
      'lamb_chop': { protein: 25, carbs: 0, fat: 23, calories: 313, category: 'protein', description: 'Grilled, rib chop', commonServing: '100g (1-2 chops)' },
      'lamb_shoulder': { protein: 24, carbs: 0, fat: 25, calories: 337, category: 'protein', description: 'Roasted, trimmed', commonServing: '100g (palm-sized)' },
      'lamb_ground': { protein: 25, carbs: 0, fat: 21, calories: 294, category: 'protein', description: 'Cooked', commonServing: '100g (palm-sized)' },
      'lamb_ribs': { protein: 20, carbs: 0, fat: 28, calories: 361, category: 'protein', description: 'Roasted', commonServing: '100g (2-3 ribs)' },
      
      // Fish variations
      'salmon': { protein: 25, carbs: 0, fat: 12, calories: 208, category: 'protein', description: 'Wild-caught, cooked', commonServing: '100g (deck of cards)' },
      'salmon_fillet': { protein: 25, carbs: 0, fat: 12, calories: 208, category: 'protein', description: 'Grilled, skin-on', commonServing: '100g (deck of cards)' },
      'salmon_canned': { protein: 20, carbs: 0, fat: 6, calories: 142, category: 'protein', description: 'Canned, pink', commonServing: '100g (1 small can)' },
      'salmon_smoked': { protein: 25, carbs: 0, fat: 4.3, calories: 117, category: 'protein', description: 'Cold-smoked', commonServing: '100g (3-4 slices)' },
      'tuna': { protein: 30, carbs: 0, fat: 1, calories: 132, category: 'protein', description: 'Canned in water', commonServing: '100g (1 small can)' },
      'tuna_steak': { protein: 30, carbs: 0, fat: 1, calories: 132, category: 'protein', description: 'Grilled, fresh', commonServing: '100g (deck of cards)' },
      'tuna_canned_oil': { protein: 26, carbs: 0, fat: 8, calories: 198, category: 'protein', description: 'Canned in oil', commonServing: '100g (1 small can)' },
      'tuna_ahi': { protein: 30, carbs: 0, fat: 1, calories: 132, category: 'protein', description: 'Sashimi grade, raw', commonServing: '100g (deck of cards)' },
      'eggs': { protein: 13, carbs: 1.1, fat: 11, calories: 155, category: 'protein', description: 'Whole eggs, large', commonServing: '100g (2 large eggs)' },
      'egg_whites': { protein: 11, carbs: 0.7, fat: 0.2, calories: 52, category: 'protein', description: 'Liquid, pasteurized', commonServing: '100g (3-4 whites)' },
      'greek_yogurt': { protein: 10, carbs: 3.6, fat: 0.4, calories: 59, category: 'protein', description: 'Non-fat, plain', commonServing: '100g (1/2 cup)' },
      'cottage_cheese': { protein: 11, carbs: 3.4, fat: 4.3, calories: 98, category: 'protein', description: 'Low-fat', commonServing: '100g (1/2 cup)' },
      'lean_beef': { protein: 26, carbs: 0, fat: 5, calories: 150, category: 'protein', description: '95% lean, cooked', commonServing: '100g (palm-sized)' },
      'pork_tenderloin': { protein: 27, carbs: 0, fat: 4, calories: 143, category: 'protein', description: 'Roasted', commonServing: '100g (palm-sized)' },
      'shrimp': { protein: 24, carbs: 0, fat: 0.3, calories: 99, category: 'protein', description: 'Cooked', commonServing: '100g (8-10 large)' },
      'cod': { protein: 18, carbs: 0, fat: 0.7, calories: 82, category: 'protein', description: 'Baked', commonServing: '100g (deck of cards)' },
      'halibut': { protein: 23, carbs: 0, fat: 2.3, calories: 111, category: 'protein', description: 'Cooked', commonServing: '100g (deck of cards)' },
      'tilapia': { protein: 26, carbs: 0, fat: 1.7, calories: 128, category: 'protein', description: 'Cooked', commonServing: '100g (deck of cards)' },
      'mackerel': { protein: 19, carbs: 0, fat: 18, calories: 262, category: 'protein', description: 'Cooked', commonServing: '100g (deck of cards)' },
      'sardines': { protein: 25, carbs: 0, fat: 11, calories: 208, category: 'protein', description: 'Canned in oil', commonServing: '100g (1 small can)' },
      'tofu': { protein: 17, carbs: 2.3, fat: 9, calories: 144, category: 'protein', description: 'Firm, raw', commonServing: '100g (1/2 block)' },
      'tempeh': { protein: 19, carbs: 9, fat: 11, calories: 193, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 block)' },
      'edamame': { protein: 11, carbs: 10, fat: 5, calories: 122, category: 'protein', description: 'Shelled, cooked', commonServing: '100g (1/2 cup)' },
      'lentils': { protein: 9, carbs: 20, fat: 0.4, calories: 116, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'chickpeas': { protein: 8.9, carbs: 27, fat: 2.6, calories: 164, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'black_beans': { protein: 8.9, carbs: 23, fat: 0.5, calories: 132, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'kidney_beans': { protein: 8.7, carbs: 22, fat: 0.5, calories: 127, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'pinto_beans': { protein: 9, carbs: 26, fat: 0.6, calories: 143, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'milk': { protein: 3.4, carbs: 5, fat: 1, calories: 42, category: 'protein', description: '2% reduced fat', commonServing: '100g (1/3 cup)' },
      'cheese': { protein: 25, carbs: 1.3, fat: 33, calories: 402, category: 'protein', description: 'Cheddar, shredded', commonServing: '100g (1 cup)' },
      'mozzarella': { protein: 22, carbs: 2.2, fat: 22, calories: 300, category: 'protein', description: 'Part-skim', commonServing: '100g (1 cup shredded)' },
      'protein_powder': { protein: 80, carbs: 5, fat: 3, calories: 370, category: 'protein', description: 'Whey isolate', commonServing: '30g (1 scoop)' },
      'seitan': { protein: 25, carbs: 4, fat: 1.2, calories: 120, category: 'protein', description: 'Wheat gluten, cooked', commonServing: '100g (palm-sized)' },
      'nutritional_yeast': { protein: 50, carbs: 38, fat: 5, calories: 325, category: 'protein', description: 'Flakes', commonServing: '100g (1 cup)' },
      'hemp_hearts': { protein: 33, carbs: 9, fat: 49, calories: 553, category: 'protein', description: 'Shelled hemp seeds', commonServing: '100g (10 tbsp)' },
      'spirulina': { protein: 57, carbs: 24, fat: 8, calories: 290, category: 'protein', description: 'Dried powder', commonServing: '100g (1 cup)' },
      'quorn': { protein: 14, carbs: 9, fat: 2, calories: 105, category: 'protein', description: 'Mycoprotein, pieces', commonServing: '100g (1/2 cup)' },
      'duck_breast': { protein: 19, carbs: 0, fat: 11, calories: 201, category: 'protein', description: 'Cooked, skinless', commonServing: '100g (palm-sized)' },
      'lamb': { protein: 25, carbs: 0, fat: 21, calories: 294, category: 'protein', description: 'Leg, roasted', commonServing: '100g (palm-sized)' },
      'venison': { protein: 30, carbs: 0, fat: 3, calories: 158, category: 'protein', description: 'Cooked', commonServing: '100g (palm-sized)' },
      'bison': { protein: 28, carbs: 0, fat: 2.4, calories: 143, category: 'protein', description: 'Ground, cooked', commonServing: '100g (palm-sized)' },
      'anchovies': { protein: 20, carbs: 0, fat: 4.8, calories: 131, category: 'protein', description: 'Canned in oil', commonServing: '100g (1 small can)' },
      'herring': { protein: 18, carbs: 0, fat: 9, calories: 158, category: 'protein', description: 'Cooked', commonServing: '100g (deck of cards)' },
      'trout': { protein: 22, carbs: 0, fat: 7, calories: 168, category: 'protein', description: 'Cooked', commonServing: '100g (deck of cards)' },
      'sea_bass': { protein: 24, carbs: 0, fat: 2, calories: 124, category: 'protein', description: 'Cooked', commonServing: '100g (deck of cards)' },
      'scallops': { protein: 20, carbs: 5, fat: 0.8, calories: 111, category: 'protein', description: 'Cooked', commonServing: '100g (6-8 large)' },
      'crab': { protein: 19, carbs: 0, fat: 1.5, calories: 97, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup meat)' },
      'lobster': { protein: 19, carbs: 0.5, fat: 0.5, calories: 89, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup meat)' },
      'mussels': { protein: 24, carbs: 7, fat: 2.2, calories: 172, category: 'protein', description: 'Cooked', commonServing: '100g (10-12 mussels)' },
      'oysters': { protein: 9, carbs: 4.2, fat: 2.5, calories: 81, category: 'protein', description: 'Raw', commonServing: '100g (6-8 medium)' },
      'crab_sticks': { protein: 15, carbs: 7, fat: 1, calories: 99, category: 'protein', description: 'Surimi', commonServing: '100g (4-5 sticks)' },
      'soy_chunks': { protein: 52, carbs: 33, fat: 0.4, calories: 345, category: 'protein', description: 'Textured vegetable protein', commonServing: '100g (dry, 1 cup)' },
      'peanut_powder': { protein: 50, carbs: 25, fat: 12, calories: 428, category: 'protein', description: 'Defatted', commonServing: '100g (1 cup)' },
      'bone_broth': { protein: 6, carbs: 0, fat: 0.2, calories: 27, category: 'protein', description: 'Homemade', commonServing: '100g (1/2 cup)' },
      'collagen_peptides': { protein: 90, carbs: 0, fat: 0, calories: 360, category: 'protein', description: 'Powder', commonServing: '100g (3-4 scoops)' },
      'whey_protein': { protein: 80, carbs: 5, fat: 3, calories: 370, category: 'protein', description: 'Concentrate powder', commonServing: '100g (3 scoops)' },
      'casein_protein': { protein: 80, carbs: 4, fat: 1, calories: 350, category: 'protein', description: 'Powder', commonServing: '100g (3 scoops)' },
      'pea_protein': { protein: 80, carbs: 4, fat: 2, calories: 360, category: 'protein', description: 'Isolate powder', commonServing: '100g (3 scoops)' },
      'rice_protein': { protein: 80, carbs: 4, fat: 2, calories: 360, category: 'protein', description: 'Isolate powder', commonServing: '100g (3 scoops)' },
      'hemp_protein': { protein: 50, carbs: 20, fat: 10, calories: 370, category: 'protein', description: 'Powder', commonServing: '100g (3 scoops)' },
      'soy_protein': { protein: 88, carbs: 0, fat: 0, calories: 350, category: 'protein', description: 'Isolate powder', commonServing: '100g (3 scoops)' },
      'pumpkin_seeds': { protein: 30, carbs: 10, fat: 49, calories: 559, category: 'protein', description: 'Roasted, shelled', commonServing: '100g (3/4 cup)' },
      'sunflower_seeds': { protein: 21, carbs: 20, fat: 51, calories: 584, category: 'protein', description: 'Roasted, shelled', commonServing: '100g (3/4 cup)' },
      'hemp_seeds': { protein: 31, carbs: 8.7, fat: 48, calories: 553, category: 'protein', description: 'Hulled', commonServing: '100g (10 tbsp)' },
      'chia_seeds': { protein: 17, carbs: 42, fat: 31, calories: 486, category: 'protein', description: 'Dried', commonServing: '100g (10 tbsp)' },
      'flax_seeds': { protein: 18, carbs: 29, fat: 42, calories: 534, category: 'protein', description: 'Ground', commonServing: '100g (10 tbsp)' },
      'quinoa': { protein: 4.4, carbs: 22, fat: 1.9, calories: 120, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'amaranth': { protein: 3.8, carbs: 19, fat: 1.6, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'buckwheat': { protein: 3.4, carbs: 20, fat: 0.6, calories: 92, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'spelt': { protein: 5.5, carbs: 22, fat: 0.9, calories: 127, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'kamut': { protein: 5.7, carbs: 23, fat: 0.8, calories: 132, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'teff': { protein: 3.9, carbs: 20, fat: 0.7, calories: 101, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'millet': { protein: 3.5, carbs: 23, fat: 1, calories: 119, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'navy_beans': { protein: 8.2, carbs: 26, fat: 0.6, calories: 140, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'lima_beans': { protein: 7.8, carbs: 21, fat: 0.4, calories: 115, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'fava_beans': { protein: 7.6, carbs: 19, fat: 0.4, calories: 110, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'cannellini_beans': { protein: 8.7, carbs: 25, fat: 0.4, calories: 139, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'great_northern_beans': { protein: 8.3, carbs: 25, fat: 0.5, calories: 139, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'adzuki_beans': { protein: 7.5, carbs: 25, fat: 0.1, calories: 128, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'mung_beans': { protein: 7, carbs: 19, fat: 0.4, calories: 105, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'split_peas': { protein: 8.3, carbs: 21, fat: 0.4, calories: 118, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'black_eyed_peas': { protein: 8.2, carbs: 21, fat: 0.6, calories: 116, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'soybeans': { protein: 17, carbs: 9, fat: 9, calories: 173, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'white_beans': { protein: 9.7, carbs: 25, fat: 0.4, calories: 139, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'red_beans': { protein: 8.7, carbs: 22, fat: 0.5, calories: 127, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'butter_beans': { protein: 7.8, carbs: 21, fat: 0.4, calories: 115, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'garbanzo_beans': { protein: 8.9, carbs: 27, fat: 2.6, calories: 164, category: 'protein', description: 'Cooked, chickpeas', commonServing: '100g (1/2 cup)' },
      'hummus': { protein: 8, carbs: 14, fat: 9.6, calories: 166, category: 'protein', description: 'Classic', commonServing: '100g (1/3 cup)' },
      'refried_beans': { protein: 7, carbs: 26, fat: 1.5, calories: 142, category: 'protein', description: 'Canned', commonServing: '100g (1/3 cup)' },
      'baked_beans': { protein: 5.2, carbs: 22, fat: 0.4, calories: 106, category: 'protein', description: 'Canned, in sauce', commonServing: '100g (1/3 cup)' },
      'green_peas': { protein: 5.4, carbs: 14, fat: 0.4, calories: 81, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'snap_peas': { protein: 2.8, carbs: 7, fat: 0.2, calories: 42, category: 'protein', description: 'Raw', commonServing: '100g (1 cup)' },
      'snow_peas': { protein: 2.8, carbs: 7, fat: 0.2, calories: 42, category: 'protein', description: 'Raw', commonServing: '100g (1 cup)' },
      'broccoli': { protein: 2.8, carbs: 7, fat: 0.4, calories: 34, category: 'protein', description: 'Cooked', commonServing: '100g (1 cup chopped)' },
      'spinach': { protein: 2.9, carbs: 3.6, fat: 0.4, calories: 23, category: 'protein', description: 'Cooked', commonServing: '100g (1 cup)' },
      'kale': { protein: 2.9, carbs: 4.4, fat: 0.6, calories: 28, category: 'protein', description: 'Cooked', commonServing: '100g (1 cup)' },
      'brussels_sprouts': { protein: 3.4, carbs: 9, fat: 0.3, calories: 36, category: 'protein', description: 'Cooked', commonServing: '100g (1 cup)' },
      'asparagus': { protein: 2.2, carbs: 4, fat: 0.1, calories: 22, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'artichoke': { protein: 3.3, carbs: 11, fat: 0.2, calories: 47, category: 'protein', description: 'Cooked', commonServing: '100g (1 medium)' },
      'mushrooms': { protein: 3.1, carbs: 3.3, fat: 0.3, calories: 22, category: 'protein', description: 'Cooked', commonServing: '100g (1 cup sliced)' },
      'portobello_mushrooms': { protein: 3.9, carbs: 3.9, fat: 0.4, calories: 29, category: 'protein', description: 'Grilled', commonServing: '100g (1 large cap)' },
      'shiitake_mushrooms': { protein: 2.2, carbs: 7, fat: 0.2, calories: 34, category: 'protein', description: 'Cooked', commonServing: '100g (1 cup)' },
      'oyster_mushrooms': { protein: 3.3, carbs: 6, fat: 0.4, calories: 33, category: 'protein', description: 'Cooked', commonServing: '100g (1 cup)' },
      'nutritional_yeast': { protein: 50, carbs: 38, fat: 5, calories: 325, category: 'protein', description: 'Flakes', commonServing: '100g (1 cup)' },
      'spirulina': { protein: 57, carbs: 24, fat: 8, calories: 290, category: 'protein', description: 'Dried powder', commonServing: '100g (1 cup)' },
      'chlorella': { protein: 58, carbs: 23, fat: 9, calories: 410, category: 'protein', description: 'Dried powder', commonServing: '100g (1 cup)' },
      'nori': { protein: 6, carbs: 5, fat: 0.3, calories: 35, category: 'protein', description: 'Dried seaweed', commonServing: '100g (10 sheets)' },
      'wakame': { protein: 3, carbs: 9, fat: 0.6, calories: 45, category: 'protein', description: 'Dried seaweed', commonServing: '100g (1 cup rehydrated)' },
      'kombu': { protein: 6, carbs: 8, fat: 0.6, calories: 43, category: 'protein', description: 'Dried kelp', commonServing: '100g (1 cup rehydrated)' },
      'dulse': { protein: 22, carbs: 5, fat: 0.2, calories: 49, category: 'protein', description: 'Dried seaweed', commonServing: '100g (1 cup)' },
      'seaweed_snacks': { protein: 2, carbs: 1, fat: 0.5, calories: 15, category: 'protein', description: 'Roasted', commonServing: '100g (10 sheets)' },
      'quorn': { protein: 14, carbs: 9, fat: 2, calories: 105, category: 'protein', description: 'Mycoprotein, pieces', commonServing: '100g (1/2 cup)' },
      'seitan': { protein: 25, carbs: 4, fat: 1.2, calories: 120, category: 'protein', description: 'Wheat gluten, cooked', commonServing: '100g (palm-sized)' },
      'tofu_silken': { protein: 6, carbs: 1.2, fat: 2.7, calories: 55, category: 'protein', description: 'Soft, raw', commonServing: '100g (1/2 block)' },
      'tofu_extra_firm': { protein: 17, carbs: 2.3, fat: 9, calories: 144, category: 'protein', description: 'Extra firm, raw', commonServing: '100g (1/2 block)' },
      'tofu_smoked': { protein: 18, carbs: 1.2, fat: 8, calories: 141, category: 'protein', description: 'Smoked', commonServing: '100g (1/2 block)' },
      'tempeh': { protein: 19, carbs: 9, fat: 11, calories: 193, category: 'protein', description: 'Cooked', commonServing: '100g (1/2 block)' },
      'edamame': { protein: 11, carbs: 10, fat: 5, calories: 122, category: 'protein', description: 'Shelled, cooked', commonServing: '100g (1/2 cup)' },
      'soy_nuts': { protein: 47, carbs: 30, fat: 25, calories: 469, category: 'protein', description: 'Roasted', commonServing: '100g (1 cup)' },
      'soy_milk': { protein: 3.3, carbs: 4, fat: 1.8, calories: 33, category: 'protein', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'almond_milk': { protein: 1, carbs: 1.5, fat: 2.5, calories: 17, category: 'protein', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'oat_milk': { protein: 1.3, carbs: 6.5, fat: 1.3, calories: 43, category: 'protein', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'coconut_milk_drink': { protein: 0.2, carbs: 2.5, fat: 1.2, calories: 19, category: 'protein', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'rice_milk': { protein: 0.3, carbs: 9, fat: 1, calories: 47, category: 'protein', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'hemp_milk': { protein: 2, carbs: 1.3, fat: 3, calories: 35, category: 'protein', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'cashew_milk': { protein: 0.5, carbs: 1.5, fat: 2, calories: 23, category: 'protein', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'kefir': { protein: 3.3, carbs: 4.5, fat: 1, calories: 41, category: 'protein', description: 'Fermented milk', commonServing: '100g (1/3 cup)' },
      'buttermilk': { protein: 3.3, carbs: 4.8, fat: 0.6, calories: 40, category: 'protein', description: 'Cultured', commonServing: '100g (1/3 cup)' },
      'yogurt_greek': { protein: 10, carbs: 3.6, fat: 0.4, calories: 59, category: 'protein', description: 'Non-fat, plain', commonServing: '100g (1/2 cup)' },
      'yogurt_regular': { protein: 5, carbs: 9, fat: 1.5, calories: 59, category: 'protein', description: 'Low-fat, plain', commonServing: '100g (1/2 cup)' },
      'yogurt_icelandic': { protein: 11, carbs: 4, fat: 0.2, calories: 59, category: 'protein', description: 'Skyr, plain', commonServing: '100g (1/2 cup)' },
      'cottage_cheese': { protein: 11, carbs: 3.4, fat: 4.3, calories: 98, category: 'protein', description: 'Low-fat', commonServing: '100g (1/2 cup)' },
      'ricotta': { protein: 11, carbs: 3, fat: 13, calories: 174, category: 'protein', description: 'Whole milk', commonServing: '100g (1/2 cup)' },
      'paneer': { protein: 18, carbs: 2.6, fat: 20, calories: 260, category: 'protein', description: 'Indian cottage cheese', commonServing: '100g (1/2 cup)' },
      'halloumi': { protein: 22, carbs: 1.8, fat: 26, calories: 320, category: 'protein', description: 'Grilling cheese', commonServing: '100g (1/2 block)' },
      'feta': { protein: 14, carbs: 4.1, fat: 21, calories: 264, category: 'protein', description: 'Greek, in brine', commonServing: '100g (1/2 cup crumbled)' },
      'goat_cheese': { protein: 22, carbs: 2.5, fat: 30, calories: 364, category: 'protein', description: 'Soft', commonServing: '100g (1/2 cup)' },
      'parmesan': { protein: 38, carbs: 4.1, fat: 30, calories: 431, category: 'protein', description: 'Grated', commonServing: '100g (1 cup)' },
      'cheddar': { protein: 25, carbs: 1.3, fat: 33, calories: 402, category: 'protein', description: 'Aged, shredded', commonServing: '100g (1 cup)' },
      'mozzarella': { protein: 22, carbs: 2.2, fat: 22, calories: 300, category: 'protein', description: 'Part-skim', commonServing: '100g (1 cup shredded)' },
      'swiss_cheese': { protein: 27, carbs: 1.4, fat: 28, calories: 380, category: 'protein', description: 'Emmental', commonServing: '100g (1 cup shredded)' },
      'gouda': { protein: 25, carbs: 2.2, fat: 28, calories: 356, category: 'protein', description: 'Aged', commonServing: '100g (1 cup shredded)' },
      'provolone': { protein: 26, carbs: 2.1, fat: 27, calories: 351, category: 'protein', description: 'Aged', commonServing: '100g (1 cup shredded)' },
      'monterey_jack': { protein: 24, carbs: 0.7, fat: 30, calories: 373, category: 'protein', description: 'Semi-soft', commonServing: '100g (1 cup shredded)' },
      'pepper_jack': { protein: 24, carbs: 0.7, fat: 30, calories: 373, category: 'protein', description: 'Spicy', commonServing: '100g (1 cup shredded)' },
      'string_cheese': { protein: 22, carbs: 1, fat: 17, calories: 250, category: 'protein', description: 'Mozzarella sticks', commonServing: '100g (3-4 sticks)' },
      'cheese_curds': { protein: 25, carbs: 1, fat: 33, calories: 371, category: 'protein', description: 'Fresh', commonServing: '100g (1/2 cup)' },
      'queso_fresco': { protein: 19, carbs: 2.5, fat: 20, calories: 260, category: 'protein', description: 'Mexican fresh cheese', commonServing: '100g (1/2 cup crumbled)' },
      'burrata': { protein: 17, carbs: 2.2, fat: 25, calories: 300, category: 'protein', description: 'Fresh mozzarella', commonServing: '100g (1/2 ball)' },
      'stracciatella': { protein: 12, carbs: 3, fat: 18, calories: 220, category: 'protein', description: 'Fresh cheese', commonServing: '100g (1/2 cup)' },
      'boursin': { protein: 7, carbs: 2, fat: 35, calories: 345, category: 'protein', description: 'Herb cream cheese', commonServing: '100g (1/2 cup)' },
      'cream_cheese': { protein: 6.2, carbs: 4.1, fat: 35, calories: 342, category: 'protein', description: 'Regular', commonServing: '100g (1/2 cup)' },
      'philadelphia': { protein: 6.2, carbs: 4.1, fat: 35, calories: 342, category: 'protein', description: 'Cream cheese', commonServing: '100g (1/2 cup)' },
      'labneh': { protein: 10, carbs: 4, fat: 20, calories: 220, category: 'protein', description: 'Strained yogurt', commonServing: '100g (1/2 cup)' },
      'mascarpone': { protein: 4.6, carbs: 4.6, fat: 47, calories: 429, category: 'protein', description: 'Italian cream cheese', commonServing: '100g (1/2 cup)' },
      'brie': { protein: 21, carbs: 0.5, fat: 28, calories: 334, category: 'protein', description: 'Soft-ripened', commonServing: '100g (1/2 wheel)' },
      'camembert': { protein: 20, carbs: 0.5, fat: 24, calories: 300, category: 'protein', description: 'Soft-ripened', commonServing: '100g (1/2 wheel)' },
      'blue_cheese': { protein: 21, carbs: 2.3, fat: 29, calories: 353, category: 'protein', description: 'Roquefort style', commonServing: '100g (1/2 cup crumbled)' },
      'gorgonzola': { protein: 19, carbs: 0.5, fat: 28, calories: 330, category: 'protein', description: 'Italian blue', commonServing: '100g (1/2 cup crumbled)' },
      'pecorino': { protein: 32, carbs: 0, fat: 32, calories: 387, category: 'protein', description: 'Romano, grated', commonServing: '100g (1 cup)' },
      'manchego': { protein: 31, carbs: 0, fat: 30, calories: 364, category: 'protein', description: 'Spanish, aged', commonServing: '100g (1 cup shredded)' },
      'gruyere': { protein: 27, carbs: 0.4, fat: 32, calories: 413, category: 'protein', description: 'Swiss, aged', commonServing: '100g (1 cup shredded)' },
      'havarti': { protein: 20, carbs: 0.5, fat: 28, calories: 334, category: 'protein', description: 'Creamy', commonServing: '100g (1 cup shredded)' },
      'muenster': { protein: 23, carbs: 1.1, fat: 30, calories: 368, category: 'protein', description: 'Semi-soft', commonServing: '100g (1 cup shredded)' },
      'colby': { protein: 23, carbs: 2.6, fat: 32, calories: 394, category: 'protein', description: 'Mild', commonServing: '100g (1 cup shredded)' },
      'cheddar_aged': { protein: 25, carbs: 1.3, fat: 33, calories: 402, category: 'protein', description: 'Sharp, aged', commonServing: '100g (1 cup shredded)' },
      'swiss_cheese': { protein: 27, carbs: 1.4, fat: 28, calories: 380, category: 'protein', description: 'Emmental', commonServing: '100g (1 cup shredded)' },
      'gouda': { protein: 25, carbs: 2.2, fat: 28, calories: 356, category: 'protein', description: 'Aged', commonServing: '100g (1 cup shredded)' },
      'provolone': { protein: 26, carbs: 2.1, fat: 27, calories: 351, category: 'protein', description: 'Aged', commonServing: '100g (1 cup shredded)' },
      'monterey_jack': { protein: 24, carbs: 0.7, fat: 30, calories: 373, category: 'protein', description: 'Semi-soft', commonServing: '100g (1 cup shredded)' },
      'pepper_jack': { protein: 24, carbs: 0.7, fat: 30, calories: 373, category: 'protein', description: 'Spicy', commonServing: '100g (1 cup shredded)' },
      'string_cheese': { protein: 22, carbs: 1, fat: 17, calories: 250, category: 'protein', description: 'Mozzarella sticks', commonServing: '100g (3-4 sticks)' },
      'cheese_curds': { protein: 25, carbs: 1, fat: 33, calories: 371, category: 'protein', description: 'Fresh', commonServing: '100g (1/2 cup)' },
      'queso_fresco': { protein: 19, carbs: 2.5, fat: 20, calories: 260, category: 'protein', description: 'Mexican fresh cheese', commonServing: '100g (1/2 cup crumbled)' },
      'burrata': { protein: 17, carbs: 2.2, fat: 25, calories: 300, category: 'protein', description: 'Fresh mozzarella', commonServing: '100g (1/2 ball)' },
      'stracciatella': { protein: 12, carbs: 3, fat: 18, calories: 220, category: 'protein', description: 'Fresh cheese', commonServing: '100g (1/2 cup)' },
      'boursin': { protein: 7, carbs: 2, fat: 35, calories: 345, category: 'protein', description: 'Herb cream cheese', commonServing: '100g (1/2 cup)' },
      'cream_cheese': { protein: 6.2, carbs: 4.1, fat: 35, calories: 342, category: 'protein', description: 'Regular', commonServing: '100g (1/2 cup)' },
      'philadelphia': { protein: 6.2, carbs: 4.1, fat: 35, calories: 342, category: 'protein', description: 'Cream cheese', commonServing: '100g (1/2 cup)' },
      'labneh': { protein: 10, carbs: 4, fat: 20, calories: 220, category: 'protein', description: 'Strained yogurt', commonServing: '100g (1/2 cup)' },
      'mascarpone': { protein: 4.6, carbs: 4.6, fat: 47, calories: 429, category: 'protein', description: 'Italian cream cheese', commonServing: '100g (1/2 cup)' },
      'brie': { protein: 21, carbs: 0.5, fat: 28, calories: 334, category: 'protein', description: 'Soft-ripened', commonServing: '100g (1/2 wheel)' },
      'camembert': { protein: 20, carbs: 0.5, fat: 24, calories: 300, category: 'protein', description: 'Soft-ripened', commonServing: '100g (1/2 wheel)' },
      'blue_cheese': { protein: 21, carbs: 2.3, fat: 29, calories: 353, category: 'protein', description: 'Roquefort style', commonServing: '100g (1/2 cup crumbled)' },
      'gorgonzola': { protein: 19, carbs: 0.5, fat: 28, calories: 330, category: 'protein', description: 'Italian blue', commonServing: '100g (1/2 cup crumbled)' },
      'pecorino': { protein: 32, carbs: 0, fat: 32, calories: 387, category: 'protein', description: 'Romano, grated', commonServing: '100g (1 cup)' },
      'manchego': { protein: 31, carbs: 0, fat: 30, calories: 364, category: 'protein', description: 'Spanish, aged', commonServing: '100g (1 cup shredded)' },
      'gruyere': { protein: 27, carbs: 0.4, fat: 32, calories: 413, category: 'protein', description: 'Swiss, aged', commonServing: '100g (1 cup shredded)' },
      'havarti': { protein: 20, carbs: 0.5, fat: 28, calories: 334, category: 'protein', description: 'Creamy', commonServing: '100g (1 cup shredded)' },
      'muenster': { protein: 23, carbs: 1.1, fat: 30, calories: 368, category: 'protein', description: 'Semi-soft', commonServing: '100g (1 cup shredded)' },
      'colby': { protein: 23, carbs: 2.6, fat: 32, calories: 394, category: 'protein', description: 'Mild', commonServing: '100g (1 cup shredded)' },
      
      // Carb sources
      'rice': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'White rice, cooked', commonServing: '100g (1/2 cup cooked)' },
      'brown_rice': { protein: 2.6, carbs: 23, fat: 0.9, calories: 111, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'wild_rice': { protein: 4, carbs: 21, fat: 0.3, calories: 101, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'quinoa': { protein: 4.4, carbs: 22, fat: 1.9, calories: 120, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'barley': { protein: 3.5, carbs: 28, fat: 0.8, calories: 123, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'couscous': { protein: 3.8, carbs: 23, fat: 0.2, calories: 112, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'bulgur': { protein: 3.1, carbs: 19, fat: 0.2, calories: 83, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'farro': { protein: 3.7, carbs: 25, fat: 0.5, calories: 127, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'oats': { protein: 17, carbs: 66, fat: 7, calories: 389, category: 'carbs', description: 'Dry, rolled oats', commonServing: '100g (1 cup dry)' },
      'sweet_potato': { protein: 1.6, carbs: 20, fat: 0.1, calories: 86, category: 'carbs', description: 'Baked, with skin', commonServing: '100g (1 small potato)' },
      'potato': { protein: 2, carbs: 17, fat: 0.1, calories: 77, category: 'carbs', description: 'Baked, with skin', commonServing: '100g (1 small potato)' },
      'pasta': { protein: 5, carbs: 25, fat: 1.1, calories: 131, category: 'carbs', description: 'Cooked, whole wheat', commonServing: '100g (1/2 cup cooked)' },
      'bread': { protein: 9, carbs: 49, fat: 3.2, calories: 265, category: 'carbs', description: 'Whole wheat', commonServing: '100g (2-3 slices)' },
      'wheat_bread': { protein: 12, carbs: 48, fat: 3.2, calories: 247, category: 'carbs', description: 'Whole grain', commonServing: '100g (3-4 slices)' },
      'bagel': { protein: 11, carbs: 56, fat: 1.7, calories: 275, category: 'carbs', description: 'Plain, medium', commonServing: '100g (1 medium bagel)' },
      'pita_bread': { protein: 9.1, carbs: 56, fat: 1.2, calories: 275, category: 'carbs', description: 'Whole wheat', commonServing: '100g (2 medium pitas)' },
      'english_muffin': { protein: 8, carbs: 46, fat: 1.8, calories: 235, category: 'carbs', description: 'Whole wheat', commonServing: '100g (2 muffins)' },
      'tortilla': { protein: 8.2, carbs: 49, fat: 3.2, calories: 237, category: 'carbs', description: 'Whole wheat, medium', commonServing: '100g (2-3 tortillas)' },
      'crackers': { protein: 10, carbs: 65, fat: 12, calories: 445, category: 'carbs', description: 'Whole wheat', commonServing: '100g (15-20 crackers)' },
      'corn': { protein: 3.4, carbs: 21, fat: 1.2, calories: 96, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'peas': { protein: 5.4, carbs: 14, fat: 0.4, calories: 81, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'banana': { protein: 1.1, carbs: 23, fat: 0.3, calories: 89, category: 'carbs', description: 'Medium-sized', commonServing: '100g (1 medium banana)' },
      'apple': { protein: 0.3, carbs: 14, fat: 0.2, calories: 52, category: 'carbs', description: 'Medium-sized', commonServing: '100g (1 medium apple)' },
      'orange': { protein: 0.9, carbs: 12, fat: 0.1, calories: 47, category: 'carbs', description: 'Medium-sized', commonServing: '100g (1 medium orange)' },
      'berries': { protein: 0.7, carbs: 14, fat: 0.3, calories: 57, category: 'carbs', description: 'Mixed, fresh', commonServing: '100g (3/4 cup)' },
      'mango': { protein: 0.8, carbs: 15, fat: 0.4, calories: 60, category: 'carbs', description: 'Fresh, sliced', commonServing: '100g (2/3 cup)' },
      'pineapple': { protein: 0.5, carbs: 13, fat: 0.1, calories: 50, category: 'carbs', description: 'Fresh, chunks', commonServing: '100g (2/3 cup)' },
      'grapes': { protein: 0.7, carbs: 18, fat: 0.2, calories: 69, category: 'carbs', description: 'Red or green', commonServing: '100g (3/4 cup)' },
      'watermelon': { protein: 0.6, carbs: 8, fat: 0.2, calories: 30, category: 'carbs', description: 'Fresh, cubed', commonServing: '100g (2/3 cup)' },
      'dates': { protein: 2.5, carbs: 75, fat: 0.4, calories: 277, category: 'carbs', description: 'Dried, pitted', commonServing: '100g (10-12 dates)' },
      'pear': { protein: 0.4, carbs: 15, fat: 0.1, calories: 57, category: 'carbs', description: 'Medium-sized', commonServing: '100g (1 medium pear)' },
      'peach': { protein: 0.9, carbs: 10, fat: 0.3, calories: 39, category: 'carbs', description: 'Fresh', commonServing: '100g (1 medium peach)' },
      'plum': { protein: 0.7, carbs: 11, fat: 0.3, calories: 46, category: 'carbs', description: 'Fresh', commonServing: '100g (2-3 plums)' },
      'cherries': { protein: 1, carbs: 16, fat: 0.2, calories: 63, category: 'carbs', description: 'Sweet, fresh', commonServing: '100g (1 cup)' },
      'strawberries': { protein: 0.7, carbs: 8, fat: 0.3, calories: 32, category: 'carbs', description: 'Fresh', commonServing: '100g (1 cup sliced)' },
      'blueberries': { protein: 0.7, carbs: 14, fat: 0.3, calories: 57, category: 'carbs', description: 'Fresh', commonServing: '100g (3/4 cup)' },
      'raspberries': { protein: 1.2, carbs: 12, fat: 0.7, calories: 52, category: 'carbs', description: 'Fresh', commonServing: '100g (1 cup)' },
      'blackberries': { protein: 1.4, carbs: 10, fat: 0.5, calories: 43, category: 'carbs', description: 'Fresh', commonServing: '100g (1 cup)' },
      'kiwi': { protein: 1.1, carbs: 15, fat: 0.5, calories: 61, category: 'carbs', description: 'Fresh', commonServing: '100g (1 medium kiwi)' },
      'papaya': { protein: 0.5, carbs: 11, fat: 0.1, calories: 43, category: 'carbs', description: 'Fresh, cubed', commonServing: '100g (2/3 cup)' },
      'cantaloupe': { protein: 0.8, carbs: 8, fat: 0.2, calories: 34, category: 'carbs', description: 'Fresh, cubed', commonServing: '100g (2/3 cup)' },
      'honeydew': { protein: 0.5, carbs: 9, fat: 0.1, calories: 36, category: 'carbs', description: 'Fresh, cubed', commonServing: '100g (2/3 cup)' },
      'coconut': { protein: 3.3, carbs: 15, fat: 33, calories: 354, category: 'carbs', description: 'Fresh, shredded', commonServing: '100g (1 cup)' },
      'raisins': { protein: 3.1, carbs: 79, fat: 0.5, calories: 299, category: 'carbs', description: 'Dried', commonServing: '100g (2/3 cup)' },
      'prunes': { protein: 2.2, carbs: 64, fat: 0.4, calories: 240, category: 'carbs', description: 'Dried, pitted', commonServing: '100g (10-12 prunes)' },
      'apricots_dried': { protein: 3.4, carbs: 63, fat: 0.5, calories: 241, category: 'carbs', description: 'Dried', commonServing: '100g (1 cup halves)' },
      'figs_dried': { protein: 3.3, carbs: 64, fat: 0.9, calories: 249, category: 'carbs', description: 'Dried', commonServing: '100g (5-6 figs)' },
      'cranberries_dried': { protein: 0.1, carbs: 82, fat: 1.4, calories: 308, category: 'carbs', description: 'Sweetened, dried', commonServing: '100g (1 cup)' },
      'millet': { protein: 3.5, carbs: 23, fat: 1, calories: 119, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'amaranth': { protein: 3.8, carbs: 19, fat: 1.6, calories: 102, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'teff': { protein: 3.9, carbs: 20, fat: 0.7, calories: 101, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'spelt': { protein: 5.5, carbs: 22, fat: 0.9, calories: 127, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'kamut': { protein: 5.7, carbs: 23, fat: 0.8, calories: 132, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'freekeh': { protein: 4.7, carbs: 25, fat: 0.5, calories: 125, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'sorghum': { protein: 3.3, carbs: 24, fat: 1.2, calories: 123, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'buckwheat': { protein: 3.4, carbs: 20, fat: 0.6, calories: 92, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'rice_noodles': { protein: 1.8, carbs: 24, fat: 0.2, calories: 109, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'soba_noodles': { protein: 5.1, carbs: 21, fat: 0.1, calories: 99, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'udon_noodles': { protein: 2.6, carbs: 22, fat: 0.1, calories: 105, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'ramen_noodles': { protein: 4.5, carbs: 28, fat: 1.1, calories: 138, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'gnocchi': { protein: 3.5, carbs: 32, fat: 0.2, calories: 131, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'polenta': { protein: 1.7, carbs: 18, fat: 0.3, calories: 85, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'grits': { protein: 1.4, carbs: 19, fat: 0.2, calories: 71, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'cornbread': { protein: 6.6, carbs: 33, fat: 4.5, calories: 198, category: 'carbs', description: 'Baked', commonServing: '100g (1 slice)' },
      'naan': { protein: 6.3, carbs: 46, fat: 2.5, calories: 262, category: 'carbs', description: 'Plain', commonServing: '100g (1 medium piece)' },
      'flatbread': { protein: 7.9, carbs: 46, fat: 2.2, calories: 259, category: 'carbs', description: 'Whole wheat', commonServing: '100g (2 pieces)' },
      'rye_bread': { protein: 8.5, carbs: 48, fat: 3.3, calories: 259, category: 'carbs', description: 'Dark rye', commonServing: '100g (3-4 slices)' },
      'sourdough_bread': { protein: 9.1, carbs: 46, fat: 1.3, calories: 289, category: 'carbs', description: 'White', commonServing: '100g (3-4 slices)' },
      'focaccia': { protein: 8.8, carbs: 36, fat: 18, calories: 249, category: 'carbs', description: 'Plain', commonServing: '100g (1 slice)' },
      'pretzel': { protein: 10, carbs: 79, fat: 3.1, calories: 384, category: 'carbs', description: 'Soft', commonServing: '100g (1 large pretzel)' },
      'croissant': { protein: 8.2, carbs: 46, fat: 21, calories: 406, category: 'carbs', description: 'Butter', commonServing: '100g (1 medium croissant)' },
      'pancake': { protein: 5.9, carbs: 28, fat: 5.2, calories: 227, category: 'carbs', description: 'Plain', commonServing: '100g (1 medium pancake)' },
      'waffle': { protein: 7.9, carbs: 38, fat: 11, calories: 291, category: 'carbs', description: 'Plain', commonServing: '100g (1 medium waffle)' },
      'french_toast': { protein: 7.7, carbs: 25, fat: 11, calories: 229, category: 'carbs', description: 'Plain', commonServing: '100g (1 slice)' },
      'muffin': { protein: 4.5, carbs: 44, fat: 11, calories: 265, category: 'carbs', description: 'Blueberry', commonServing: '100g (1 medium muffin)' },
      'scone': { protein: 6.2, carbs: 45, fat: 13, calories: 339, category: 'carbs', description: 'Plain', commonServing: '100g (1 medium scone)' },
      'doughnut': { protein: 4.3, carbs: 48, fat: 23, calories: 452, category: 'carbs', description: 'Glazed', commonServing: '100g (1 medium doughnut)' },
      'beetroot': { protein: 1.6, carbs: 10, fat: 0.2, calories: 43, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'parsnip': { protein: 1.2, carbs: 18, fat: 0.3, calories: 75, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'turnip': { protein: 0.9, carbs: 6, fat: 0.1, calories: 28, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'rutabaga': { protein: 1.1, carbs: 9, fat: 0.2, calories: 36, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'plantain': { protein: 1.3, carbs: 32, fat: 0.4, calories: 122, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'yucca': { protein: 1.4, carbs: 38, fat: 0.3, calories: 160, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'taro': { protein: 1.5, carbs: 27, fat: 0.2, calories: 112, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'jicama': { protein: 0.7, carbs: 9, fat: 0.1, calories: 38, category: 'carbs', description: 'Raw', commonServing: '100g (1 cup sliced)' },
      'acorn_squash': { protein: 1.1, carbs: 15, fat: 0.1, calories: 56, category: 'carbs', description: 'Baked', commonServing: '100g (1/2 cup)' },
      'butternut_squash': { protein: 1, carbs: 12, fat: 0.1, calories: 45, category: 'carbs', description: 'Baked', commonServing: '100g (1/2 cup)' },
      'pumpkin': { protein: 1, carbs: 7, fat: 0.1, calories: 26, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'zucchini': { protein: 1.2, carbs: 3, fat: 0.2, calories: 17, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup)' },
      'winter_squash': { protein: 1, carbs: 10, fat: 0.1, calories: 40, category: 'carbs', description: 'Baked', commonServing: '100g (1/2 cup)' },
      'rice_jasmine': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'rice_basmati': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'rice_arborio': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked, risotto', commonServing: '100g (1/2 cup cooked)' },
      'rice_sticky': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked, glutinous', commonServing: '100g (1/2 cup cooked)' },
      'rice_cakes': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Plain', commonServing: '100g (10-12 cakes)' },
      'rice_paper': { protein: 1.4, carbs: 87, fat: 0.1, calories: 351, category: 'carbs', description: 'Dried, for spring rolls', commonServing: '100g (20-25 sheets)' },
      'rice_flour': { protein: 5.9, carbs: 80, fat: 1.4, calories: 366, category: 'carbs', description: 'White', commonServing: '100g (3/4 cup)' },
      'rice_pudding': { protein: 3.2, carbs: 20, fat: 2, calories: 118, calories: 118, category: 'carbs', description: 'Cooked, with milk', commonServing: '100g (1/2 cup)' },
      'rice_cereal': { protein: 6.3, carbs: 85, fat: 0.4, calories: 370, category: 'carbs', description: 'Puffed', commonServing: '100g (3 cups)' },
      'rice_crackers': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Plain', commonServing: '100g (15-20 crackers)' },
      'rice_noodles': { protein: 1.8, carbs: 24, fat: 0.2, calories: 109, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'rice_vermicelli': { protein: 1.8, carbs: 24, fat: 0.2, calories: 109, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'rice_sticks': { protein: 1.8, carbs: 24, fat: 0.2, calories: 109, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'rice_paper_wrappers': { protein: 1.4, carbs: 87, fat: 0.1, calories: 351, category: 'carbs', description: 'Dried', commonServing: '100g (20-25 sheets)' },
      'rice_milk': { protein: 0.3, carbs: 9, fat: 1, calories: 47, category: 'carbs', description: 'Unsweetened', commonServing: '100g (1/3 cup)' },
      'rice_syrup': { protein: 0, carbs: 82, fat: 0, calories: 304, category: 'carbs', description: 'Brown rice syrup', commonServing: '100g (5 tbsp)' },
      'rice_bran': { protein: 13, carbs: 49, fat: 20, calories: 316, category: 'carbs', description: 'Raw', commonServing: '100g (1 cup)' },
      'rice_germ': { protein: 13, carbs: 49, fat: 20, calories: 316, category: 'carbs', description: 'Raw', commonServing: '100g (1 cup)' },
      'rice_hulls': { protein: 2.8, carbs: 22, fat: 0.9, calories: 111, category: 'carbs', description: 'Cooked', commonServing: '100g (1/2 cup cooked)' },
      'rice_pilaf': { protein: 3.5, carbs: 28, fat: 2, calories: 150, category: 'carbs', description: 'Cooked, with vegetables', commonServing: '100g (1/2 cup cooked)' },
      'rice_stuffing': { protein: 3.5, carbs: 28, fat: 2, calories: 150, category: 'carbs', description: 'Cooked, with herbs', commonServing: '100g (1/2 cup cooked)' },
      'rice_salad': { protein: 3.5, carbs: 28, fat: 2, calories: 150, category: 'carbs', description: 'Cooked, cold', commonServing: '100g (1/2 cup)' },
      'rice_sushi': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked, seasoned', commonServing: '100g (1/2 cup)' },
      'rice_porridge': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Congee, cooked', commonServing: '100g (1/2 cup)' },
      'rice_congee': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked, watery', commonServing: '100g (1/2 cup)' },
      'rice_cake': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Plain, puffed', commonServing: '100g (10-12 cakes)' },
      'rice_crispies': { protein: 6.3, carbs: 85, fat: 0.4, calories: 370, category: 'carbs', description: 'Cereal', commonServing: '100g (3 cups)' },
      'rice_flakes': { protein: 6.3, carbs: 85, fat: 0.4, calories: 370, category: 'carbs', description: 'Dried', commonServing: '100g (1 cup)' },
      'rice_puffs': { protein: 6.3, carbs: 85, fat: 0.4, calories: 370, category: 'carbs', description: 'Puffed', commonServing: '100g (3 cups)' },
      'rice_bubbles': { protein: 6.3, carbs: 85, fat: 0.4, calories: 370, category: 'carbs', description: 'Cereal', commonServing: '100g (3 cups)' },
      'rice_krispies': { protein: 6.3, carbs: 85, fat: 0.4, calories: 370, category: 'carbs', description: 'Cereal', commonServing: '100g (3 cups)' },
      'rice_chex': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Cereal', commonServing: '100g (2 cups)' },
      'rice_cheerios': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Cereal', commonServing: '100g (2 cups)' },
      'rice_krispie_treats': { protein: 3.5, carbs: 75, fat: 8, calories: 414, category: 'carbs', description: 'Marshmallow treats', commonServing: '100g (2 bars)' },
      'rice_mochi': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked, sticky', commonServing: '100g (1/2 cup)' },
      'rice_dumplings': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Cooked', commonServing: '100g (2-3 dumplings)' },
      'rice_balls': { protein: 2.7, carbs: 28, fat: 0.3, calories: 130, category: 'carbs', description: 'Onigiri, cooked', commonServing: '100g (1-2 balls)' },
      'rice_wraps': { protein: 1.4, carbs: 87, fat: 0.1, calories: 351, category: 'carbs', description: 'Spring roll wrappers', commonServing: '100g (20-25 wraps)' },
      'rice_sheets': { protein: 1.4, carbs: 87, fat: 0.1, calories: 351, category: 'carbs', description: 'Dried', commonServing: '100g (20-25 sheets)' },
      'rice_wrappers': { protein: 1.4, carbs: 87, fat: 0.1, calories: 351, category: 'carbs', description: 'Dried', commonServing: '100g (20-25 wrappers)' },
      'rice_paper_rolls': { protein: 1.4, carbs: 87, fat: 0.1, calories: 351, category: 'carbs', description: 'Dried', commonServing: '100g (20-25 sheets)' },
      'rice_cake_snacks': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Plain', commonServing: '100g (10-12 cakes)' },
      'rice_crackers_snacks': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Plain', commonServing: '100g (15-20 crackers)' },
      'rice_chips': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Baked', commonServing: '100g (15-20 chips)' },
      'rice_thins': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Crackers', commonServing: '100g (15-20 thins)' },
      'rice_crisps': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Crackers', commonServing: '100g (15-20 crisps)' },
      'rice_snacks': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Plain', commonServing: '100g (15-20 pieces)' },
      'rice_bars': { protein: 3.5, carbs: 75, fat: 8, calories: 414, category: 'carbs', description: 'Energy bars', commonServing: '100g (2 bars)' },
      'rice_cakes_plain': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Plain', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_flavored': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Flavored', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_mini': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Mini size', commonServing: '100g (20-25 mini cakes)' },
      'rice_cakes_large': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Large size', commonServing: '100g (5-6 large cakes)' },
      'rice_cakes_round': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Round', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_square': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Square', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_rectangular': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Rectangular', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_triangular': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Triangular', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_oval': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Oval', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_heart': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Heart-shaped', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_star': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Star-shaped', commonServing: '100g (10-12 cakes)' },
      'rice_cakes_circle': { protein: 7.2, carbs: 81, fat: 0.9, calories: 387, category: 'carbs', description: 'Circular', commonServing: '100g (10-12 cakes)' },
      
      // Fat sources
      'avocado': { protein: 2, carbs: 9, fat: 15, calories: 160, category: 'fat', description: 'Raw, Hass', commonServing: '100g (1/2 medium avocado)' },
      'almonds': { protein: 21, carbs: 22, fat: 50, calories: 579, category: 'fat', description: 'Raw', commonServing: '100g (3/4 cup)' },
      'cashews': { protein: 18, carbs: 30, fat: 44, calories: 553, category: 'fat', description: 'Raw', commonServing: '100g (3/4 cup)' },
      'peanuts': { protein: 26, carbs: 16, fat: 49, calories: 567, category: 'fat', description: 'Raw', commonServing: '100g (3/4 cup)' },
      'peanut_butter': { protein: 25, carbs: 20, fat: 50, calories: 588, category: 'fat', description: 'Natural, smooth', commonServing: '100g (6 tbsp)' },
      'almond_butter': { protein: 21, carbs: 18, fat: 55, calories: 614, category: 'fat', description: 'Natural', commonServing: '100g (6 tbsp)' },
      'olive_oil': { protein: 0, carbs: 0, fat: 100, calories: 884, category: 'fat', description: 'Extra virgin', commonServing: '100g (7 tbsp)' },
      'coconut_oil': { protein: 0, carbs: 0, fat: 100, calories: 862, category: 'fat', description: 'Unrefined', commonServing: '100g (7 tbsp)' },
      'mct_oil': { protein: 0, carbs: 0, fat: 100, calories: 862, category: 'fat', description: 'Medium-chain triglycerides', commonServing: '100g (7 tbsp)' },
      'ghee': { protein: 0, carbs: 0, fat: 100, calories: 900, category: 'fat', description: 'Clarified butter', commonServing: '100g (7 tbsp)' },
      'butter': { protein: 0.9, carbs: 0.1, fat: 81, calories: 717, category: 'fat', description: 'Unsalted', commonServing: '100g (7 tbsp)' },
      'walnuts': { protein: 15, carbs: 14, fat: 65, calories: 654, category: 'fat', description: 'Raw', commonServing: '100g (3/4 cup)' },
      'pecans': { protein: 9, carbs: 14, fat: 72, calories: 691, category: 'fat', description: 'Raw', commonServing: '100g (1 cup halves)' },
      'pistachios': { protein: 20, carbs: 28, fat: 45, calories: 560, category: 'fat', description: 'Raw, shelled', commonServing: '100g (3/4 cup)' },
      'macadamia_nuts': { protein: 8, carbs: 14, fat: 76, calories: 718, category: 'fat', description: 'Raw', commonServing: '100g (3/4 cup)' },
      'brazil_nuts': { protein: 14, carbs: 12, fat: 67, calories: 659, category: 'fat', description: 'Raw', commonServing: '100g (3/4 cup)' },
      'hazelnuts': { protein: 15, carbs: 17, fat: 61, calories: 628, category: 'fat', description: 'Raw', commonServing: '100g (3/4 cup)' },
      'pine_nuts': { protein: 14, carbs: 13, fat: 68, calories: 673, category: 'fat', description: 'Dried', commonServing: '100g (3/4 cup)' },
      'sunflower_seeds': { protein: 21, carbs: 20, fat: 51, calories: 584, category: 'fat', description: 'Dried, shelled', commonServing: '100g (3/4 cup)' },
      'pumpkin_seeds': { protein: 30, carbs: 10, fat: 49, calories: 559, category: 'fat', description: 'Dried, shelled', commonServing: '100g (3/4 cup)' },
      'sesame_seeds': { protein: 18, carbs: 23, fat: 50, calories: 573, category: 'fat', description: 'Dried', commonServing: '100g (10 tbsp)' },
      'tahini': { protein: 17, carbs: 21, fat: 54, calories: 595, category: 'fat', description: 'Sesame seed paste', commonServing: '100g (6 tbsp)' },
      'chia_seeds': { protein: 17, carbs: 42, fat: 31, calories: 486, category: 'fat', description: 'Dried', commonServing: '100g (10 tbsp)' },
      'flax_seeds': { protein: 18, carbs: 29, fat: 42, calories: 534, category: 'fat', description: 'Ground', commonServing: '100g (10 tbsp)' },
      'hemp_seeds': { protein: 31, carbs: 8.7, fat: 48, calories: 553, category: 'fat', description: 'Hulled', commonServing: '100g (10 tbsp)' },
      'mayonnaise': { protein: 1, carbs: 0.6, fat: 75, calories: 680, category: 'fat', description: 'Regular', commonServing: '100g (7 tbsp)' },
      'cream_cheese': { protein: 6.2, carbs: 4.1, fat: 35, calories: 342, category: 'fat', description: 'Regular', commonServing: '100g (1/2 cup)' },
      'sour_cream': { protein: 2.3, carbs: 4.6, fat: 20, calories: 198, category: 'fat', description: 'Regular', commonServing: '100g (1/2 cup)' },
      'coconut_milk': { protein: 2.3, carbs: 6, fat: 24, calories: 230, category: 'fat', description: 'Canned, full-fat', commonServing: '100g (1/3 cup)' },
      'dark_chocolate': { protein: 7.8, carbs: 46, fat: 43, calories: 546, category: 'fat', description: '70-85% cacao', commonServing: '100g (1 bar)' },
    };
  }

  /**
   * Calculate food servings to meet specific macronutrient targets
   * Returns food options with calculated serving sizes
   */
  static calculateFoodServingsForMacro(
    macroType: 'protein' | 'carbs' | 'fat',
    targetAmount: number, // in grams
    options?: {
      dietaryPreferences?: string[];
      maxOptions?: number;
    }
  ): Array<{
    food: string;
    servingSize: string;
    amount: number; // in grams
    macros: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    description?: string;
  }> {
    // Food database with macronutrient content per 100g
    // Use the shared database to avoid duplication
    const foodDatabase = this.getFoodDatabaseInternal();

    // Filter foods by category and dietary preferences
    let availableFoods = Object.entries(foodDatabase)
      .filter(([_, food]) => food.category === macroType);

    // Apply dietary filters
    if (options?.dietaryPreferences) {
      const nonVeganFoods = [
        // Chicken variations
        'chicken_breast', 'chicken_thigh', 'chicken_leg', 'chicken_drumstick', 'chicken_wing',
        'chicken_thigh_with_skin', 'chicken_leg_with_skin', 'chicken_whole', 'chicken_ground',
        'chicken_liver', 'chicken_heart',
        // Turkey variations
        'turkey_breast', 'turkey_thigh', 'turkey_leg', 'turkey_wing', 'turkey_ground', 'turkey_deli',
        // Beef variations
        'lean_beef', 'beef_sirloin', 'beef_ribeye', 'beef_tenderloin', 'beef_ground_90', 'beef_ground_85',
        'beef_ground_80', 'beef_brisket', 'beef_chuck', 'beef_round', 'beef_flank', 'beef_short_ribs',
        'beef_liver', 'beef_heart', 'beef_tongue', 'corned_beef', 'beef_jerky',
        // Pork variations
        'pork_tenderloin', 'pork_chop', 'pork_shoulder', 'pork_loin', 'pork_ribs', 'pork_belly',
        'pork_ground', 'pork_sausage', 'pork_ham', 'pork_bacon', 'pancetta', 'prosciutto', 'pork_liver',
        // Lamb variations
        'lamb', 'lamb_leg', 'lamb_chop', 'lamb_shoulder', 'lamb_ground', 'lamb_ribs',
        // Duck, venison, bison
        'duck_breast', 'venison', 'bison',
        // Fish and seafood
        'salmon', 'salmon_fillet', 'salmon_canned', 'salmon_smoked', 'tuna', 'tuna_steak', 'tuna_canned_oil',
        'tuna_ahi', 'cod', 'halibut', 'tilapia', 'mackerel', 'sardines', 'shrimp', 'anchovies', 'herring',
        'trout', 'sea_bass', 'scallops', 'crab', 'lobster', 'mussels', 'oysters', 'crab_sticks',
        // Eggs and dairy
        'eggs', 'egg_whites', 'greek_yogurt', 'cottage_cheese', 'milk', 'cheese', 'mozzarella',
        'mayonnaise', 'cream_cheese', 'sour_cream', 'butter', 'ghee', 'protein_powder'
      ];
      const nonVegetarianFoods = [
        // All chicken
        'chicken_breast', 'chicken_thigh', 'chicken_leg', 'chicken_drumstick', 'chicken_wing',
        'chicken_thigh_with_skin', 'chicken_leg_with_skin', 'chicken_whole', 'chicken_ground',
        'chicken_liver', 'chicken_heart',
        // All turkey
        'turkey_breast', 'turkey_thigh', 'turkey_leg', 'turkey_wing', 'turkey_ground', 'turkey_deli',
        // All beef
        'lean_beef', 'beef_sirloin', 'beef_ribeye', 'beef_tenderloin', 'beef_ground_90', 'beef_ground_85',
        'beef_ground_80', 'beef_brisket', 'beef_chuck', 'beef_round', 'beef_flank', 'beef_short_ribs',
        'beef_liver', 'beef_heart', 'beef_tongue', 'corned_beef', 'beef_jerky',
        // All pork
        'pork_tenderloin', 'pork_chop', 'pork_shoulder', 'pork_loin', 'pork_ribs', 'pork_belly',
        'pork_ground', 'pork_sausage', 'pork_ham', 'pork_bacon', 'pancetta', 'prosciutto', 'pork_liver',
        // All lamb
        'lamb', 'lamb_leg', 'lamb_chop', 'lamb_shoulder', 'lamb_ground', 'lamb_ribs',
        // Duck, venison, bison
        'duck_breast', 'venison', 'bison',
        // All fish and seafood
        'salmon', 'salmon_fillet', 'salmon_canned', 'salmon_smoked', 'tuna', 'tuna_steak', 'tuna_canned_oil',
        'tuna_ahi', 'cod', 'halibut', 'tilapia', 'mackerel', 'sardines', 'shrimp', 'anchovies', 'herring',
        'trout', 'sea_bass', 'scallops', 'crab', 'lobster', 'mussels', 'oysters', 'crab_sticks'
      ];
      
      if (options.dietaryPreferences.includes('vegan')) {
        availableFoods = availableFoods.filter(([key, _]) => 
          !nonVeganFoods.includes(key)
        );
      } else if (options.dietaryPreferences.includes('vegetarian')) {
        availableFoods = availableFoods.filter(([key, _]) => 
          !nonVegetarianFoods.includes(key)
        );
      }
    }

    // Calculate serving sizes for each food
    const suggestions = availableFoods.map(([key, food]) => {
      const macroValue = food[macroType];
      if (macroValue === 0) {
        return null; // Skip foods with 0 of the target macro
      }

      // Calculate amount needed (in grams) to meet target
      const amountNeeded = (targetAmount / macroValue) * 100;
      
      // Calculate resulting macros for this serving
      const servingMacros = {
        protein: (food.protein * amountNeeded) / 100,
        carbs: (food.carbs * amountNeeded) / 100,
        fat: (food.fat * amountNeeded) / 100,
        calories: (food.calories * amountNeeded) / 100,
      };

      // Format serving size description
      let servingSize = '';
      if (food.commonServing) {
        // Calculate how many common servings
        const commonServingGrams = 100; // Base is per 100g
        const servings = amountNeeded / commonServingGrams;
        
        if (servings <= 0.5) {
          servingSize = `${Math.round(amountNeeded)}g`;
        } else if (servings <= 2) {
          servingSize = servings < 1 
            ? `${Math.round(amountNeeded)}g (${(servings * 100).toFixed(0)}% of ${food.commonServing})`
            : servings === 1 
              ? `${Math.round(amountNeeded)}g (${food.commonServing})`
              : `${Math.round(amountNeeded)}g (${servings.toFixed(1)}x ${food.commonServing})`;
        } else {
          servingSize = `${Math.round(amountNeeded)}g (${servings.toFixed(1)} servings)`;
        }
      } else {
        servingSize = `${Math.round(amountNeeded)}g`;
      }

      // Format food name
      const foodName = key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      return {
        food: foodName,
        servingSize,
        amount: Math.round(amountNeeded),
        macros: {
          protein: Math.round(servingMacros.protein * 10) / 10,
          carbs: Math.round(servingMacros.carbs * 10) / 10,
          fat: Math.round(servingMacros.fat * 10) / 10,
          calories: Math.round(servingMacros.calories),
        },
        description: food.description,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.amount - b.amount); // Sort by amount needed (ascending)

    // Limit results
    const maxOptions = options?.maxOptions || 5;
    return suggestions.slice(0, maxOptions);
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

      // Save to database first
      try {
        // Archive any existing active plans for this user
        try {
          await supabase
            .from('nutrition_plans')
            .update({ status: 'archived' })
            .eq('user_id', userId)
            .eq('status', 'active');
          console.log('[NUTRITION] Archived existing active plans');
        } catch (archiveError) {
          console.warn('[NUTRITION] Could not archive existing plans:', archiveError);
        }

        // Save to database
        const planData = {
          user_id: userId,
          plan_name: planName,
          goal_type: options.goal,
          plan_type: 'manual',
          status: 'active',
          daily_targets: compatibleDailyTargets,
          preferences: planToStore.preferences || {
            dietary: options.dietaryPreferences || [],
            intolerances: options.intolerances || [],
          },
        };

        console.log('[NUTRITION] Inserting manual plan data:', {
          user_id: planData.user_id,
          plan_name: planData.plan_name,
          goal_type: planData.goal_type,
          plan_type: planData.plan_type,
          status: planData.status,
          daily_targets: planData.daily_targets
        });

        const { data: savedPlan, error: saveError } = await supabase
          .from('nutrition_plans')
          .insert(planData)
          .select()
          .single();

        if (saveError) {
          console.error('[NUTRITION] Error saving manual plan to database:', saveError);
          throw saveError;
        }

        if (savedPlan) {
          console.log('[NUTRITION] ✅ Manual plan saved to database:', savedPlan.id);
          // Update the plan ID with the database ID
          planToStore.id = savedPlan.id;
          manualPlan.id = savedPlan.id;
          
          // Verify the plan was saved
          const { data: verifyPlan } = await supabase
            .from('nutrition_plans')
            .select('id, plan_name, status, plan_type')
            .eq('id', savedPlan.id)
            .single();
          
          if (verifyPlan) {
            console.log('[NUTRITION] ✅ Verified manual plan in database:', verifyPlan);
          }
        }
      } catch (dbError) {
        console.error('[NUTRITION] Database save error (continuing with local storage):', dbError);
        // Continue with local storage even if database save fails
      }

      // Add to mock store
      mockPlansStore.plans.unshift(planToStore);
      console.log('[NUTRITION] ✅ Added manual plan to mock store');

      // Save to persistent storage
      await this.savePlansToStorage();

      // Set as selected plan
      await this.setSelectedNutritionPlanForTargets(userId, manualPlan.id);
      console.log('[NUTRITION] ✅ Set manual plan as selected plan');

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

  /**
   * Set a specific nutrition plan as the selected plan for daily targets
   */
  static async setSelectedNutritionPlanForTargets(userId: string, planId: string): Promise<boolean> {
    try {
      console.log(`[NutritionService] Setting nutrition plan ${planId} as selected for daily targets for user ${userId}`);

      // Store the selected plan ID in AsyncStorage
      const storageKey = `selected_nutrition_plan_${userId}`;
      await AsyncStorage.setItem(storageKey, planId);
      console.log('[NutritionService] Successfully stored selected plan ID in AsyncStorage');

      return true;
    } catch (error) {
      console.error('[NutritionService] Error setting selected nutrition plan:', error);
      return false;
    }
  }

  /**
   * Get the selected nutrition plan ID for daily targets
   */
  static async getSelectedNutritionPlanId(userId: string): Promise<string | null> {
    try {
      const storageKey = `selected_nutrition_plan_${userId}`;
      const planId = await AsyncStorage.getItem(storageKey);
      return planId;
    } catch (error) {
      console.error('[NutritionService] Error getting selected nutrition plan ID:', error);
      return null;
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

  /**
   * Get food history for a specific date
   */
  static async getFoodHistoryForDate(userId: string, date: string): Promise<any[]> {
    try {
      const storageKey = `nutrition_log_${userId}_${date}`;
      const entries = await this.readPersisted<any[]>(storageKey) || [];
      console.log(`[NUTRITION] Retrieved ${entries.length} food entries for ${date}`);
      return entries;
    } catch (error) {
      console.error('[NUTRITION] Error fetching food history for date:', error);
      return [];
    }
  }

  /**
   * Get food history for a date range (last N days)
   */
  static async getFoodHistoryRange(userId: string, days: number = 7): Promise<{ [date: string]: any[] }> {
    try {
      const history: { [date: string]: any[] } = {};
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const entries = await this.getFoodHistoryForDate(userId, dateString);
        if (entries.length > 0) {
          history[dateString] = entries;
        }
      }
      
      console.log(`[NUTRITION] Retrieved food history for ${Object.keys(history).length} days out of ${days} requested`);
      return history;
    } catch (error) {
      console.error('[NUTRITION] Error fetching food history range:', error);
      return {};
    }
  }

  /**
   * Get all available food history dates for a user
   */
  static async getAllFoodHistoryDates(userId: string): Promise<string[]> {
    try {
      // Since we're using AsyncStorage, we need to check for keys that match our pattern
      // This is a simplified approach - in a real app, you might want to maintain an index
      const dates: string[] = [];
      const today = new Date();
      
      // Check the last 30 days for any stored data
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const entries = await this.getFoodHistoryForDate(userId, dateString);
        if (entries.length > 0) {
          dates.push(dateString);
        }
      }
      
      console.log(`[NUTRITION] Found food history for ${dates.length} dates`);
      return dates.sort((a, b) => b.localeCompare(a)); // Sort newest first
    } catch (error) {
      console.error('[NUTRITION] Error fetching food history dates:', error);
      return [];
    }
  }

  /**
   * Delete a specific food entry
   */
  static async deleteFoodEntry(userId: string, date: string, entryId: string): Promise<boolean> {
    try {
      const storageKey = `nutrition_log_${userId}_${date}`;
      let entries = await this.readPersisted<any[]>(storageKey) || [];
      
      const initialLength = entries.length;
      entries = entries.filter(entry => entry.id !== entryId);
      
      if (entries.length < initialLength) {
        await this.writePersisted(storageKey, entries);
        console.log(`[NUTRITION] Deleted food entry ${entryId} from ${date}`);
        return true;
      } else {
        console.log(`[NUTRITION] Food entry ${entryId} not found for ${date}`);
        return false;
      }
    } catch (error) {
      console.error('[NUTRITION] Error deleting food entry:', error);
      return false;
    }
  }

  /**
   * Get nutrition summary for a specific date
   */
  static async getNutritionSummaryForDate(userId: string, date: string): Promise<{
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    entryCount: number;
  }> {
    try {
      const entries = await this.getFoodHistoryForDate(userId, date);
      
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      entries.forEach((entry: any) => {
        totalCalories += entry.calories || 0;
        totalProtein += entry.protein_grams || 0;
        totalCarbs += entry.carbs_grams || 0;
        totalFat += entry.fat_grams || 0;
      });

      return {
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        entryCount: entries.length
      };
    } catch (error) {
      console.error('[NUTRITION] Error calculating nutrition summary:', error);
      return {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        entryCount: 0
      };
    }
  }

  static async analyzeFoodImage(imageUri: string, additionalInfo?: string): Promise<any> {
    console.log('[FOOD ANALYZE] Starting food photo analysis');
    console.log('[FOOD ANALYZE] Image URI:', imageUri);
    console.log('[FOOD ANALYZE] Additional info:', additionalInfo);
    
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
      
      // Add additional context if provided
      if (additionalInfo && additionalInfo.trim()) {
        formData.append('additionalInfo', additionalInfo.trim());
      }
      
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
    cuisinePreference?: string,
    regenerationToken?: string
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
        cuisinePreference,
        regenerationToken
      );
      
      // Handle successful response (even if it's a fallback)
      if (result.success && result.mealPlan) {
        console.log('[NUTRITION] Successfully generated AI meal plan with', result.mealPlan.meals.length, 'meals');
        console.log('[NUTRITION] Cuisines used:', result.mealPlan.cuisine_variety);
        // Check if AI was actually used - be more explicit about what counts as "AI used"
        // AI is considered "used" if: usedAi/used_ai is true, method is gemini_ai, or aiProvider is gemini
        const usedAi = result.usedAi !== undefined ? result.usedAi : (result as any).used_ai;
        const isAIGenerated = usedAi === true || 
                              result.method === 'gemini_ai' || 
                              result.aiProvider === 'gemini';
        const fallbackUsed = !isAIGenerated && (
          result.fallback === true || 
          result.method === 'mathematical_fallback' || 
          result.aiProvider === 'fallback' || 
          usedAi === false
        );
        
        console.log('[NUTRITION] AI status check:', {
          usedAi,
          method: result.method,
          aiProvider: result.aiProvider,
          fallback: result.fallback,
          isAIGenerated,
          fallbackUsed
        });
        
        return {
          success: true,
          mealPlan: result.mealPlan.meals,
          totalNutrition: result.mealPlan.total_nutrition,
          cuisineVariety: result.mealPlan.cuisine_variety,
          cookingTips: result.mealPlan.cooking_tips,
          method: result.method || (fallbackUsed ? 'mathematical_fallback' : 'gemini_ai'),
          aiProvider: result.aiProvider || (fallbackUsed ? 'fallback' : 'gemini'),
          fallback: fallbackUsed,
          message: fallbackUsed
            ? 'AI meal plan temporarily unavailable. Showing fallback meals.'
            : 'Daily meal plan generated successfully with AI-powered recipes and cooking instructions'
        };
      }
      
      // Handle fallback case - when all bases failed but we have a fallback response
      if (result.fallback && !result.success) {
        console.log('[NUTRITION] All AI bases failed, using mathematical fallback');
        // Generate a mathematical fallback meal plan
        const fallbackMealPlan = this.generateMathematicalMealPlan({
          daily_calories: dailyCalories,
          protein_grams: proteinGrams,
          carbs_grams: carbsGrams,
          fat_grams: fatGrams
        }, dietaryPreferences);
        
        return {
          success: true,
          mealPlan: fallbackMealPlan,
          totalNutrition: fallbackMealPlan.reduce((total: any, meal: any) => ({
            calories: total.calories + (meal.macros?.calories || 0),
            protein_grams: total.protein_grams + (meal.macros?.protein_grams || meal.macros?.protein || 0),
            carbs_grams: total.carbs_grams + (meal.macros?.carbs_grams || meal.macros?.carbs || 0),
            fat_grams: total.fat_grams + (meal.macros?.fat_grams || meal.macros?.fat || 0)
          }), { calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0 }),
          cuisineVariety: [],
          cookingTips: [],
          method: 'mathematical_fallback',
          aiProvider: 'fallback',
          fallback: true,
          message: 'AI meal plan temporarily unavailable. Showing fallback meals.'
        };
      }
      
      // Only throw if it's a real error (not a fallback)
      throw new Error(result.error || 'Failed to generate AI meal plan');
      
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
