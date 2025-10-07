import Constants from 'expo-constants';
import {
  SUPPORTED_EXERCISES,
  getExerciseNamesForPrompt,
  getExercisesByEquipment,
  isSupportedExercise,
  getExerciseInfo,
  ExerciseInfo
} from '../../constants/exerciseNames';
import { generateWeeklyWorkoutPrompt } from './exercisePrompts';
import { bodybuilderWorkouts, BodybuilderWorkout } from '../../data/bodybuilder-workouts';
import { WorkoutPlan as AppWorkoutPlan, WorkoutDay as AppWorkoutDay, ExerciseItem } from '../../types/chat';

// Exercise data structure for offline fallback
const BASE_EXERCISES = {
  muscle_gain: {
    full_body: SUPPORTED_EXERCISES
      .filter(ex => ex.category === 'Push' || ex.category === 'Pull' || ex.category === 'Legs')
      .filter(ex => ex.equipment === 'Bodyweight' || ex.equipment === 'Dumbbell' || ex.equipment === 'Barbell')
      .slice(0, 12),
    compound: SUPPORTED_EXERCISES
      .filter(ex => ex.difficulty === 'Intermediate' || ex.difficulty === 'Advanced')
      .filter(ex => ex.category === 'Push' || ex.category === 'Pull' || ex.category === 'Legs')
      .slice(0, 8)
  },
  fat_loss: {
    hiit: SUPPORTED_EXERCISES
      .filter(ex => ex.category === 'Cardio' || ex.category === 'Core')
      .slice(0, 8),
    strength: SUPPORTED_EXERCISES
      .filter(ex => ex.category === 'Push' || ex.category === 'Pull' || ex.category === 'Legs')
      .filter(ex => ex.difficulty === 'Beginner' || ex.difficulty === 'Intermediate')
      .slice(0, 8)
  },
  general_fitness: {
    full_body: SUPPORTED_EXERCISES
      .filter(ex => ex.category === 'Push' || ex.category === 'Pull' || ex.category === 'Legs' || ex.category === 'Core')
      .slice(0, 10)
  }
};

interface RecipeTarget {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface RecipeIngredient {
  ingredient: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GeneratedRecipe {
  success: boolean;
  recipe?: {
    name: string;
    meal_type: string;
    prep_time: number;
    cook_time: number;
    servings: number;
    ingredients: RecipeIngredient[];
    instructions: string[];
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar: number;
    };
  };
  fallback?: boolean;
  error?: string;
}

interface MealWithRecipe {
  meal_type: string;
  name: string;
  cuisine: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
}

interface DailyMealPlan {
  total_nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  meals: MealWithRecipe[];
  cuisine_variety: string[];
  cooking_tips: string[];
}

interface WorkoutPlanInput {
  fullName?: string;    // Client's full name
  height: number;       // in cm
  weight: number;       // in kg
  age: number;
  gender: 'male' | 'female';
  fatLossGoal: number; // scale 1-5
  muscleGainGoal: number; // scale 1-5
  trainingLevel: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal?: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain'; // Primary fitness goal
  availableEquipment?: ('Dumbbell' | 'Barbell' | 'Kettlebell' | 'Resistance Band' | 'Cable Machine' | 'Plate')[];
  emulateBodybuilder?: string; // Optional parameter to emulate a famous bodybuilder's workout style

  // Enhanced onboarding data
  bodyFat?: number; // Body fat percentage
  weightTrend?: 'losing' | 'gaining' | 'stable' | 'unsure'; // Current weight trend
  exerciseFrequency?: '1' | '2-3' | '4-5' | '6-7'; // Current exercise frequency
  workoutFrequency?: '2_3' | '4_5' | '6'; // Preferred workout frequency per week
  activityLevel?: 'sedentary' | 'moderately_active' | 'very_active'; // Daily activity level
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

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  restBetweenSets: string;
  duration?: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
  notes?: string;
  estimatedCaloriesBurned?: number;
}

interface WorkoutPlan {
  weeklySchedule: WorkoutDay[];
  recommendations: Record<string, string | string[]>;
  estimatedTimePerSession: string;
}

interface AppWorkoutPlan {
  id?: string;
  name?: string;
  plan_name?: string;
  description?: string;
  trainingLevel?: string;
  training_level?: string;
  primaryGoal?: string;
  primary_goal?: string;
  workoutFrequency?: string;
  workout_frequency?: string;
  weeklySchedule?: WorkoutDay[];
  weekly_schedule?: WorkoutDay[];
  mesocycleLength?: number;
  mesocycle_length?: number;
  estimatedTimePerSession?: string;
  estimated_time_per_session?: string;
  specialNotes?: string;
  special_notes?: string;
  isBodybuilder?: boolean;
  is_bodybuilder?: boolean;
  source?: string;
  created_at?: string;
}

export class GeminiService {
  
  private static getBaseUrls(): string[] {
    const railwayUrl = 'https://gofitai-production.up.railway.app';
    const localhostUrl = 'http://localhost:4000';
    const localIpUrl = 'http://192.168.0.174:4000'; // Local network IP from server startup
    const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;

    console.log('[GEMINI SERVICE] Available URLs:');
    console.log('[GEMINI SERVICE] Railway URL:', railwayUrl);
    console.log('[GEMINI SERVICE] Localhost URL:', localhostUrl);
    console.log('[GEMINI SERVICE] Local IP URL:', localIpUrl);
    console.log('[GEMINI SERVICE] Environment URL:', envUrl);

    // Priority order: production endpoints first, then local development fallbacks
    const urls = [
      railwayUrl,   // Production default
      envUrl,       // Environment override (if provided)
      localIpUrl,   // Local network IP (for development)
      localhostUrl, // Localhost fallback (for simulator)
    ].filter(Boolean) as string[];

    console.log('[GEMINI SERVICE] Using URLs in order:', urls);
    return urls;
  }

  /**
   * Generate a recipe using Gemini AI
   */
  static async generateRecipe(
    mealType: string,
    targets: RecipeTarget,
    ingredients: string[]
  ): Promise<GeneratedRecipe> {
    console.log('[GEMINI SERVICE] Generating recipe via server API');
    console.log('[GEMINI SERVICE] Meal type:', mealType);
    console.log('[GEMINI SERVICE] Targets:', targets);
    console.log('[GEMINI SERVICE] Ingredients:', ingredients);

    const bases = this.getBaseUrls();
    let lastError: unknown = null;

    if (bases.length === 0) {
      console.error('[GEMINI SERVICE] No base URLs available! Check environment configuration.');
      return {
        success: false,
        error: 'No API endpoints available. Check EXPO_PUBLIC_API_URL configuration.',
        fallback: true
      };
    }

    for (const base of bases) {
      try {
        console.log(`[GEMINI SERVICE] Trying base: ${base}`);

        // Validate the base URL
        if (!base || base === 'null' || base === 'undefined') {
          console.warn(`[GEMINI SERVICE] Invalid base URL: ${base}, skipping...`);
          continue;
        }
        
        // Create timeout promise - optimized for meal generation
        // Use shorter timeout for local servers, longer for remote
        const isLocal = base.includes('localhost') || base.includes('192.168.') || base.includes('127.0.0.1');
        const timeoutMs = isLocal ? 15000 : 45000; // 15s for local, 45s for remote
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[GEMINI SERVICE] Request timed out after ${timeoutMs}ms for ${base}, trying next...`);
          controller.abort();
        }, timeoutMs);
        
        const response = await fetch(`${base}/api/generate-recipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'GoFitAI-Mobile/1.0',
          },
          body: JSON.stringify({
            mealType,
            targets,
            ingredients
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle 404 specifically - might be missing endpoint
          if (response.status === 404) {
            console.warn(`[GEMINI SERVICE] 404 from ${base}, trying next...`);
            continue;
          }
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('[GEMINI SERVICE] Received response from server');
        
        if (data.success && data.recipe) {
          return {
            success: true,
            recipe: data.recipe,
            fallback: false
          };
        } else {
          throw new Error(data.error || 'Failed to generate recipe');
        }
        
      } catch (error: any) {
        lastError = error;
        console.error(`[GEMINI SERVICE] Failed with base ${base}:`, error.message);
        
        // If it's an abort error (timeout), try next base
        if (error.name === 'AbortError') {
          console.log(`[GEMINI SERVICE] Request timed out for ${base}, trying next...`);
          continue;
        }
        
        // If it's a network error, try next base
        if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
          console.log(`[GEMINI SERVICE] Network error for ${base}, trying next...`);
          continue;
        }
        
        // For other errors, still try next base
        continue;
      }
    }

    // All bases failed, return fallback
    console.error('[GEMINI SERVICE] All bases failed, returning fallback');
    console.log('[GEMINI SERVICE] 🔄 Using mathematical fallback for recipe generation');
    return {
      success: false,
      error: (lastError as Error)?.message || 'Failed to generate recipe with Gemini AI',
      fallback: true
    };
  }

  private static buildRecipePrompt(
    mealType: string,
    targets: RecipeTarget,
    ingredients: string[]
  ): string {
    const ingredientsList = ingredients.join(', ');
    
    return `Generate a detailed ${mealType.toLowerCase()} recipe using the following ingredients: ${ingredientsList}.

The recipe should meet these nutritional targets (approximately):
- Calories: ${targets.calories || 'flexible'}
- Protein: ${targets.protein || 'balanced'}g
- Carbs: ${targets.carbs || 'balanced'}g
- Fat: ${targets.fat || 'balanced'}g

Please respond with a JSON object in this exact format:
{
  "name": "Creative recipe name",
  "meal_type": "${mealType.toLowerCase()}",
  "prep_time": 15,
  "cook_time": 20,
  "servings": 1,
  "ingredients": [
    {
      "ingredient": "ingredient name",
      "amount": "amount with unit",
      "calories": estimated_calories,
      "protein": estimated_protein,
      "carbs": estimated_carbs,
      "fat": estimated_fat
    }
  ],
  "instructions": [
    "Step 1 detailed instruction",
    "Step 2 detailed instruction"
  ],
  "nutrition": {
    "calories": total_calories,
    "protein": total_protein,
    "carbs": total_carbs,
    "fat": total_fat,
    "fiber": estimated_fiber,
    "sugar": estimated_sugar
  }
}

Requirements:
1. Create a creative, appetizing recipe name
2. Include detailed cooking instructions (at least 4-6 steps)
3. Provide accurate nutritional estimates for each ingredient
4. Ensure the total nutrition approximately matches the targets
5. Make the recipe practical and achievable
6. Include proper amounts and measurements
7. Respond ONLY with valid JSON, no additional text

Make this a delicious and nutritious ${mealType.toLowerCase()} recipe!`;
  }

  private static parseRecipeResponse(response: string, mealType: string): any {
    try {
      // Clean up the response - remove any markdown or extra text
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON within the response
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      const recipe = JSON.parse(cleanResponse);
      
      // Validate required fields
      if (!recipe.name || !recipe.ingredients || !recipe.instructions || !recipe.nutrition) {
        throw new Error('Invalid recipe format - missing required fields');
      }
      
      return recipe;
      
    } catch (error) {
      console.error('[GEMINI SERVICE] Error parsing recipe response:', error);
      console.error('[GEMINI SERVICE] Raw response:', response);
      
      // Return a fallback structure if parsing fails
      throw new Error(`Failed to parse Gemini response: ${error}`);
    }
  }

  /**
   * Generate a complete daily meal plan with recipes using Gemini AI
   */
  static async generateDailyMealPlan(
    dailyCalories: number,
    proteinGrams: number,
    carbsGrams: number,
    fatGrams: number,
    dietaryPreferences: string[] = [],
    cuisinePreference?: string
  ): Promise<{
    success: boolean;
    mealPlan?: DailyMealPlan;
    fallback?: boolean;
    error?: string;
  }> {
    console.log('[GEMINI SERVICE] Generating daily meal plan via server API');
    console.log('[GEMINI SERVICE] Daily targets:', { dailyCalories, proteinGrams, carbsGrams, fatGrams });
    console.log('[GEMINI SERVICE] Dietary preferences:', dietaryPreferences);
    console.log('[GEMINI SERVICE] Cuisine preference:', cuisinePreference);

    const bases = this.getBaseUrls();
    let lastError: unknown = null;

    for (const base of bases) {
      try {
        console.log(`[GEMINI SERVICE] Trying base: ${base}`);
        
        // Create timeout promise - longer timeout for complete meal plan generation
        const timeoutMs = 60000; // 60 seconds timeout for full meal plan generation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[GEMINI SERVICE] Request timed out for ${base}, trying next...`);
          controller.abort();
        }, timeoutMs);
        
        const response = await fetch(`${base}/api/generate-daily-meal-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'guest-user', // Use guest user for meal plan generation
            dailyCalories,
            proteinGrams,
            carbsGrams,
            fatGrams,
            dietaryPreferences,
            cuisinePreference
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle 404 specifically - might be missing endpoint
          if (response.status === 404) {
            console.warn(`[GEMINI SERVICE] 404 from ${base}, trying next...`);
            continue;
          }
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('[GEMINI SERVICE] Received daily meal plan response from server');
        
        if (data.success && data.meal_plan) {
          // Transform the response to match expected format
          const transformedMealPlan = {
            meals: data.meal_plan,
            total_nutrition: data.meal_plan.reduce((total: any, meal: any) => {
              // Handle both AI format (protein_grams) and mathematical format (protein)
              const macros = meal.macros || {};
              const calories = macros.calories || 0;
              const protein = macros.protein_grams || macros.protein || 0;
              const carbs = macros.carbs_grams || macros.carbs || 0;
              const fat = macros.fat_grams || macros.fat || 0;
              
              return {
                calories: (total.calories || 0) + calories,
                protein_grams: (total.protein_grams || 0) + protein,
                carbs_grams: (total.carbs_grams || 0) + carbs,
                fat_grams: (total.fat_grams || 0) + fat
              };
            }, { calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0 }),
            cuisine_variety: ['Mixed'],
            cooking_tips: ['Follow the recipe instructions', 'Adjust portions as needed']
          };
          
          return {
            success: true,
            mealPlan: transformedMealPlan,
            fallback: data.used_ai === false
          };
        } else {
          throw new Error(data.error || 'Failed to generate daily meal plan');
        }
        
      } catch (error: any) {
        lastError = error;
        console.error(`[GEMINI SERVICE] Failed with base ${base}:`, error.message);
        
        // If it's an abort error (timeout), try next base
        if (error.name === 'AbortError') {
          console.log(`[GEMINI SERVICE] Request timed out for ${base}, trying next...`);
          continue;
        }
        
        // If it's a network error, try next base
        if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
          console.log(`[GEMINI SERVICE] Network error for ${base}, trying next...`);
          continue;
        }
        
        // For other errors, still try next base
        continue;
      }
    }

    // All bases failed, return fallback
    console.error('[GEMINI SERVICE] All bases failed, returning fallback');
    console.log('[GEMINI SERVICE] 🔄 Using mathematical fallback for daily meal plan generation');
    return {
      success: false,
      error: (lastError as Error)?.message || 'Failed to generate daily meal plan with Gemini AI',
      fallback: true
    };
  }

  private static getApiUrl(): string {
    const bases = this.getBaseUrls();
    return bases[0] || 'https://gofitai-production.up.railway.app';
  }

  /**
   * Test if server API is available and working
   */
  static async testConnection(): Promise<boolean> {
    try {
      const apiUrl = this.getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/test-gemini`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('[GEMINI SERVICE] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Converts static bodybuilder workout template to AppWorkoutPlan format
   */
  private static convertBodybuilderWorkoutToAppWorkoutPlan(
    bodybuilderWorkout: BodybuilderWorkout,
    input: WorkoutPlanInput
  ): AppWorkoutPlan {
    // Convert bodybuilder exercises to app format
    const weeklySchedule: AppWorkoutDay[] = bodybuilderWorkout.weeklySchedule.map(day => ({
      day: day.day,
      focus: day.bodyParts.join(' + '), // Convert bodyParts array to focus string
      exercises: day.exercises.map(exercise => ({
        name: exercise.name,
        sets: typeof exercise.sets === 'string' ?
          (exercise.sets.includes('-') ? parseInt(exercise.sets.split('-')[1]) : parseInt(exercise.sets)) :
          exercise.sets,
        reps: exercise.reps,
        restBetweenSets: exercise.restTime || '60-90 seconds'
      } as ExerciseItem))
    }));

    // 🏆 FOR BODYBUILDER EMULATION: PRESERVE AUTHENTIC TRAINING SPLIT INCLUDING REST DAYS
    // When emulating a famous bodybuilder, we want to show their authentic training methodology
    // rather than adapting it to user preferences. This preserves the historical accuracy
    // and lets users experience how legends actually trained.
    
    let mainWorkoutDays: any[];
    
    if (input.emulateBodybuilder) {
      // For bodybuilder plans: Include rest days to show the complete authentic split
      console.log(`[GEMINI] 🏆 BODYBUILDER EMULATION MODE: Preserving authentic ${bodybuilderWorkout.name} training split`);
      
      // Add explicit rest days from the bodybuilder's rest day schedule
      const completeSchedule = [...weeklySchedule];
      const restDays = bodybuilderWorkout.restDays || [];
      
      // Add rest days that aren't already in the schedule
      restDays.forEach(restDayName => {
        const existingRestDay = completeSchedule.find(day => day.day === restDayName);
        if (!existingRestDay) {
          completeSchedule.push({
            day: restDayName,
            focus: 'Rest Day',
            exercises: [],
            specialNotes: 'Strategic rest day for optimal recovery and muscle growth'
          });
        }
      });
      
      // Sort by day number for proper order (Day 1, Day 2, etc.)
      completeSchedule.sort((a, b) => {
        const extractDayNumber = (dayStr: string) => {
          const match = dayStr.match(/Day (\d+)/i) || dayStr.match(/(\d+)/);
          return match ? parseInt(match[1]) : 999;
        };
        return extractDayNumber(a.day) - extractDayNumber(b.day);
      });
      
      mainWorkoutDays = completeSchedule;
      
      console.log(`[GEMINI] 🏆 Complete authentic split: ${mainWorkoutDays.length} total days (including rest days)`);
      console.log(`[GEMINI] 🏆 This is how ${bodybuilderWorkout.name.split(' - ')[0]} actually trained!`);
      
      // Don't adapt - keep the authentic split as-is
    } else {
      // For non-bodybuilder plans: Filter out rest days and abs-only days from main schedule
      mainWorkoutDays = weeklySchedule.filter(day =>
        !day.day.toLowerCase().includes('rest') &&
        !day.focus.toLowerCase().includes('abs only')
      );
      
      // ADAPT FOR USER'S WORKOUT FREQUENCY PREFERENCE (only for non-bodybuilder plans)
      if (input.workoutFrequency && input.workoutFrequency !== '6') {
        const targetFrequency = input.workoutFrequency === '2_3' ? 2.5 : input.workoutFrequency === '4_5' ? 4.5 : parseInt(input.workoutFrequency);
        const currentTrainingDays = mainWorkoutDays.length;

        console.log(`[GEMINI] Adapting ${bodybuilderWorkout.name} from ${currentTrainingDays} days to ${targetFrequency} days (user preference)`);

        if (targetFrequency < currentTrainingDays) {
          // Need to reduce training days - select the most important ones
          if (targetFrequency <= 3) {
            // For 2-3 days: Prioritize compound movements and major muscle groups
            const priorityOrder = [
              'chest', 'back', 'legs', 'shoulders', 'arms',
              'chest and back', 'upper body', 'lower body', 'full body'
            ];

            mainWorkoutDays = mainWorkoutDays
              .sort((a, b) => {
                const aPriority = priorityOrder.findIndex(p =>
                  a.focus.toLowerCase().includes(p)
                );
                const bPriority = priorityOrder.findIndex(p =>
                  b.focus.toLowerCase().includes(p)
                );
                return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
              })
              .slice(0, Math.floor(targetFrequency));
          } else {
            // For 4-5 days: Keep most days but combine some sessions
            mainWorkoutDays = mainWorkoutDays.slice(0, Math.floor(targetFrequency));
          }
        } else if (targetFrequency > currentTrainingDays) {
          // Need to add training days - this is less common but could happen
          console.log(`[GEMINI] User requested more days (${targetFrequency}) than template has (${currentTrainingDays}). Keeping all available days.`);
        }

        console.log(`[GEMINI] ✅ Adapted schedule: ${mainWorkoutDays.length} training days`);
      }
    }

    return {
      name: input.emulateBodybuilder 
        ? `${bodybuilderWorkout.name} (Authentic Training Split)` 
        : `${bodybuilderWorkout.name}'s Training Plan (Adapted for ${input.workoutFrequency ? input.workoutFrequency.replace('_', '-') : '6'} days/week)`,
      training_level: input.trainingLevel as 'beginner' | 'intermediate' | 'advanced',
      goal_fat_loss: input.fatLossGoal,
      goal_muscle_gain: input.muscleGainGoal,
      mesocycle_length_weeks: 8, // Standard 8-week cycle
      weeklySchedule: mainWorkoutDays
    };
  }

  /**
   * Generates a personalized workout plan using Gemini AI via server API
   */
  static async generateWorkoutPlan(input: WorkoutPlanInput): Promise<AppWorkoutPlan> {
    console.log('[GEMINI SERVICE] Generating workout plan via server API');
    console.log('[GEMINI SERVICE] Input:', input);

    // 🎯 CHECK FOR STATIC BODYBUILDER EMULATION FIRST
    if (input.emulateBodybuilder) {
      console.log(`[GEMINI SERVICE] 🔍 Checking for static bodybuilder template: '${input.emulateBodybuilder}'`);
      
      // Use the exact bodybuilder key as provided (no transformation)
      const bodybuilderKey = input.emulateBodybuilder;
      const staticWorkout = bodybuilderWorkouts[bodybuilderKey];
      
      if (staticWorkout) {
        console.log(`[GEMINI SERVICE] ✅ FOUND static template for bodybuilder: ${bodybuilderKey}`);
        console.log(`[GEMINI SERVICE] 🚀 Using STATIC data instead of calling Railway API!`);
        console.log(`[GEMINI SERVICE] Template: ${staticWorkout.name}`);
        
        // Convert the static bodybuilder workout to the expected app format
        const convertedPlan = this.convertBodybuilderWorkoutToAppWorkoutPlan(staticWorkout, input);
        
        console.log(`[GEMINI SERVICE] ✅ Successfully converted static template to app format`);
        console.log(`[GEMINI SERVICE] Plan name: ${convertedPlan.name}`);
        console.log(`[GEMINI SERVICE] Training days: ${convertedPlan.weeklySchedule.length}`);
        console.log(`[GEMINI SERVICE] 🎯 RETURNING STATIC DATA - NO API CALL MADE!`);
        
        return convertedPlan;
      } else {
        console.log(`[GEMINI SERVICE] ❌ No static template found for bodybuilder: ${bodybuilderKey}`);
        console.log(`[GEMINI SERVICE] Available bodybuilder keys:`, Object.keys(bodybuilderWorkouts));
        console.log(`[GEMINI SERVICE] 🔄 Falling back to Gemini AI generation...`);
      }
    }

    const bases = this.getBaseUrls();
    let lastError: unknown = null;

    if (bases.length === 0) {
      console.error('[GEMINI SERVICE] No base URLs available for workout generation! Check environment configuration.');
      throw new Error('No API endpoints available. Check EXPO_PUBLIC_API_URL configuration.');
    }

    for (const base of bases) {
      try {
        console.log(`[GEMINI SERVICE] Trying base: ${base}`);

        // Validate the base URL
        if (!base || base === 'null' || base === 'undefined') {
          console.warn(`[GEMINI SERVICE] Invalid base URL: ${base}, skipping...`);
          continue;
        }

        // Quick health check first (only for non-localhost URLs to avoid delays)
        if (!base.includes('localhost')) {
          try {
            const healthController = new AbortController();
            const healthTimeout = setTimeout(() => healthController.abort(), 5000);
            
            const healthCheck = await fetch(`${base}/api/health`, {
              method: 'GET',
              signal: healthController.signal,
            });
            
            clearTimeout(healthTimeout);
            
            if (!healthCheck.ok) {
              console.warn(`[GEMINI SERVICE] Health check failed for ${base}, skipping...`);
              continue;
            }
            console.log(`[GEMINI SERVICE] ✅ Health check passed for ${base}`);
          } catch (healthError) {
            console.warn(`[GEMINI SERVICE] Health check error for ${base}:`, (healthError as Error).message);
            continue;
          }
        }

        // Create timeout promise - optimized timeout for better reliability
        // Use shorter timeout for local servers, longer for remote
        // Workout plans need significantly more time (server has 120s timeout for Gemini)
        const isLocal = base.includes('localhost') || base.includes('192.168.') || base.includes('127.0.0.1');
        const timeoutMs = isLocal ? 30000 : 150000; // 30s for local, 150s for remote (server has 120s Gemini timeout + overhead)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[GEMINI SERVICE] Request timed out after ${timeoutMs}ms for ${base}, trying next...`);
          controller.abort();
        }, timeoutMs);

        // Transform input to match server API expectations with comprehensive profile data
        const profileForAPI = {
          full_name: input.fullName || 'User',
          gender: input.gender || 'male',
          age: input.age || 30,
          height_cm: input.height || null,
          weight_kg: input.weight || null,
          training_level: input.trainingLevel || 'intermediate',
          primary_goal: input.primaryGoal || 'general_fitness',
          workout_frequency: input.workoutFrequency || '4_5',
          body_fat: input.bodyFat || null,
          activity_level: input.activityLevel || null,
          fitness_strategy: input.bodyAnalysis?.ai_feedback ? 'personalized' : 'general',
          goal_fat_reduction: input.fatLossGoal || null,
          goal_muscle_gain: input.muscleGainGoal || null,
          exercise_frequency: input.exerciseFrequency || null,
          weight_trend: input.weightTrend || null
        };

        const response = await fetch(`${base}/api/generate-workout-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'GoFitAI-Mobile/1.0',
          },
          body: JSON.stringify({ profile: profileForAPI }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle 404 specifically - might be missing endpoint
          if (response.status === 404) {
            console.warn(`[GEMINI SERVICE] 404 from ${base}, trying next...`);
            continue;
          }
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log('[GEMINI SERVICE] Received workout plan response from server:', {
          success: data.success,
          hasWorkoutPlan: !!data.workoutPlan,
          planName: data.workoutPlan?.name || data.workoutPlan?.plan_name,
          provider: data.provider,
          usedAI: data.used_ai,
          systemInfo: data.system_info
        });

        if (data.success && data.workoutPlan) {
          // Transform server response to match app expectations
          const serverPlan = data.workoutPlan;
          
          // DEBUG: Log the raw server plan structure
          console.log('[GEMINI SERVICE] 🔍 Raw server plan structure:', {
            hasWeeklySchedule: !!serverPlan.weekly_schedule,
            hasWeeklyScheduleCamel: !!serverPlan.weeklySchedule,
            weeklyScheduleType: Array.isArray(serverPlan.weekly_schedule) ? 'array' : typeof serverPlan.weekly_schedule,
            weeklyScheduleLength: serverPlan.weekly_schedule?.length || serverPlan.weeklySchedule?.length || 0,
            firstDay: serverPlan.weekly_schedule?.[0] || serverPlan.weeklySchedule?.[0]
          });
          
          const appPlan: AppWorkoutPlan = {
            id: `server-${Date.now()}`, // Generate client ID
            name: serverPlan.name || serverPlan.plan_name || 'AI Generated Plan',
            weeklySchedule: serverPlan.weekly_schedule || serverPlan.weeklySchedule || [],
            training_level: serverPlan.training_level,
            goal_fat_loss: serverPlan.goal_fat_loss,
            goal_muscle_gain: serverPlan.goal_muscle_gain,
            mesocycle_length_weeks: serverPlan.mesocycle_length_weeks,
            estimated_time_per_session: serverPlan.estimated_time_per_session,
            primary_goal: serverPlan.primary_goal,
            workout_frequency: serverPlan.workout_frequency,
            source: data.used_ai ? 'ai_generated' : 'enhanced_rule_based',
            // Add production metadata for user messaging
            system_metadata: {
              ai_available: data.used_ai,
              fallback_used: data.system_info?.fallback_used || false,
              fallback_reason: data.system_info?.fallback_reason || null,
              provider: data.provider || 'unknown'
            }
          };
          
          console.log('[GEMINI SERVICE] ✅ Successfully transformed server plan:', {
            name: appPlan.name,
            weeklyScheduleLength: appPlan.weeklySchedule?.length || 0,
            weeklyScheduleIsArray: Array.isArray(appPlan.weeklySchedule),
            firstDayExercises: appPlan.weeklySchedule?.[0] ? 
              (appPlan.weeklySchedule[0].exercises?.length || 0) + 
              (appPlan.weeklySchedule[0].warm_up?.length || 0) + 
              (appPlan.weeklySchedule[0].main_workout?.length || 0) + 
              (appPlan.weeklySchedule[0].cool_down?.length || 0) : 0,
            firstDayStructure: appPlan.weeklySchedule?.[0] ? {
              day: appPlan.weeklySchedule[0].day,
              focus: appPlan.weeklySchedule[0].focus,
              hasExercises: !!appPlan.weeklySchedule[0].exercises,
              exercisesLength: appPlan.weeklySchedule[0].exercises?.length || 0,
              exerciseNames: appPlan.weeklySchedule[0].exercises?.slice(0, 3)?.map(ex => ex.name) || []
            } : null,
            firstWorkoutDay: appPlan.weeklySchedule?.find(d => 
              (d.exercises && d.exercises.length > 0) || 
              (d.warm_up && d.warm_up.length > 0) || 
              (d.main_workout && d.main_workout.length > 0) || 
              (d.cool_down && d.cool_down.length > 0)
            )
          });
          
          // Log full weekly schedule details for debugging
          console.log('[GEMINI SERVICE] Full weekly schedule details:');
          console.log('[GEMINI SERVICE] 🔍 RAW SERVER PLAN WEEKLY_SCHEDULE:', JSON.stringify(serverPlan.weekly_schedule, null, 2));
          console.log('[GEMINI SERVICE] 🔍 APP PLAN WEEKLY_SCHEDULE LENGTH:', appPlan.weeklySchedule?.length);
          appPlan.weeklySchedule?.forEach((day, idx) => {
            console.log(`  Day ${idx + 1}:`, {
              day: day.day,
              day_name: day.day_name,
              focus: day.focus,
              type: day.type || day.workout_type,
              exercisesCount: day.exercises?.length || 0,
              warmUpCount: day.warm_up?.length || 0,
              mainWorkoutCount: day.main_workout?.length || 0,
              coolDownCount: day.cool_down?.length || 0,
              firstExercise: day.exercises?.[0] || null
            });
          });
          
          // CRITICAL CHECK: Ensure weeklySchedule is not empty
          if (!appPlan.weeklySchedule || appPlan.weeklySchedule.length === 0) {
            console.error('[GEMINI SERVICE] ❌ WARNING: weeklySchedule is empty or undefined!');
            console.error('[GEMINI SERVICE] Server plan keys:', Object.keys(serverPlan));
            console.error('[GEMINI SERVICE] Full server plan:', JSON.stringify(serverPlan, null, 2));
          }
          
          return appPlan;
        } else {
          throw new Error(data.error || 'Failed to generate workout plan');
        }

      } catch (error: any) {
        lastError = error;
        console.error(`[GEMINI SERVICE] Failed with base ${base}:`, error.message);
        console.error(`[GEMINI SERVICE] Error name: ${error.name}, Error code: ${error.code || 'undefined'}`);

        // If it's an abort error (timeout), try next base
        if (error.name === 'AbortError' || error.message.includes('Aborted')) {
          console.log(`[GEMINI SERVICE] ⏱️ Request aborted/timed out for ${base}, trying next base...`);
          continue;
        }

        // If it's a network error, try next base
        if (error.message.includes('Network request failed') || 
            error.message.includes('fetch') ||
            error.message.includes('TypeError') ||
            error.code === 'NETWORK_ERROR') {
          console.log(`[GEMINI SERVICE] 🌐 Network error for ${base}, trying next base...`);
          continue;
        }

        // If it's a connection refused or timeout error
        if (error.message.includes('ECONNREFUSED') || 
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('Connection refused')) {
          console.log(`[GEMINI SERVICE] 🔌 Connection error for ${base}, trying next base...`);
          continue;
        }

        // For other errors, still try next base
        console.log(`[GEMINI SERVICE] 🔄 Unknown error for ${base}, trying next base...`);
        continue;
      }
    }

    // All bases failed - return offline fallback workout plan
    console.error('[GEMINI SERVICE] All bases failed for workout plan generation');
    console.log('[GEMINI SERVICE] 🔄 Using offline fallback workout plan generation');
    
    try {
      const fallbackPlan = this.generateOfflineFallbackWorkoutPlan(input);
      console.log('[GEMINI SERVICE] ✅ Successfully generated offline fallback plan');
      return fallbackPlan;
    } catch (fallbackError) {
      console.error('[GEMINI SERVICE] ❌ Failed to generate offline fallback plan:', fallbackError);
      throw new Error(`All servers failed and offline fallback failed: ${(lastError as Error)?.message || 'Unknown error'}`);
    }
  }

  /**
   * Generate an offline fallback workout plan when network fails
   */
  private static generateOfflineFallbackWorkoutPlan(input: WorkoutPlanInput): AppWorkoutPlan {
    console.log('[GEMINI SERVICE] 🔄 Generating offline fallback workout plan');
    
    const primaryGoal = input.primaryGoal || 'general_fitness';
    const trainingLevel = input.trainingLevel || 'intermediate';
    const workoutFrequency = input.workoutFrequency || '4_5';
    
    // Generate a basic but effective workout plan based on user goals
    const baseExercises = {
      muscle_gain: {
        push: [
          { name: "Push-ups", sets: 4, reps: "8-12", restBetweenSets: "90 seconds" },
          { name: "Dumbbell Bench Press", sets: 4, reps: "8-12", restBetweenSets: "90 seconds" },
          { name: "Overhead Press", sets: 3, reps: "8-10", restBetweenSets: "90 seconds" },
          { name: "Tricep Dips", sets: 3, reps: "10-15", restBetweenSets: "60 seconds" }
        ],
        pull: [
          { name: "Pull-ups", sets: 4, reps: "6-10", restBetweenSets: "90 seconds" },
          { name: "Dumbbell Rows", sets: 4, reps: "8-12", restBetweenSets: "90 seconds" },
          { name: "Bicep Curls", sets: 3, reps: "10-15", restBetweenSets: "60 seconds" },
          { name: "Face Pulls", sets: 3, reps: "12-15", restBetweenSets: "60 seconds" }
        ],
        legs: [
          { name: "Squats", sets: 4, reps: "8-12", restBetweenSets: "2 minutes" },
          { name: "Deadlifts", sets: 4, reps: "6-8", restBetweenSets: "2 minutes" },
          { name: "Lunges", sets: 3, reps: "12-15", restBetweenSets: "90 seconds" },
          { name: "Calf Raises", sets: 3, reps: "15-20", restBetweenSets: "60 seconds" }
        ]
      },
      fat_loss: {
        hiit: [
          { name: "Burpees", sets: 4, reps: "30 seconds", restBetweenSets: "30 seconds" },
          { name: "Mountain Climbers", sets: 4, reps: "30 seconds", restBetweenSets: "30 seconds" },
          { name: "Jump Squats", sets: 4, reps: "30 seconds", restBetweenSets: "30 seconds" },
          { name: "High Knees", sets: 4, reps: "30 seconds", restBetweenSets: "30 seconds" }
        ],
        strength: [
          { name: "Push-ups", sets: 3, reps: "12-15", restBetweenSets: "60 seconds" },
          { name: "Squats", sets: 3, reps: "15-20", restBetweenSets: "60 seconds" },
          { name: "Plank", sets: 3, reps: "45-60 seconds", restBetweenSets: "60 seconds" },
          { name: "Lunges", sets: 3, reps: "12-15", restBetweenSets: "60 seconds" }
        ]
      },
      general_fitness: {
        full_body: [
          { name: "Push-ups", sets: 3, reps: "10-15", restBetweenSets: "60 seconds" },
          { name: "Squats", sets: 3, reps: "12-15", restBetweenSets: "60 seconds" },
          { name: "Plank", sets: 3, reps: "30-60 seconds", restBetweenSets: "60 seconds" },
          { name: "Lunges", sets: 3, reps: "10-12", restBetweenSets: "60 seconds" },
          { name: "Mountain Climbers", sets: 3, reps: "20-30", restBetweenSets: "60 seconds" }
        ]
      }
    };

    // Create workout schedule based on frequency and goal
    let weeklySchedule: any[] = [];
    
    if (primaryGoal === 'muscle_gain') {
      weeklySchedule = [
        { day: "Day 1", focus: "Upper Body - Push", exercises: baseExercises.muscle_gain.push },
        { day: "Day 2", focus: "Lower Body - Legs", exercises: baseExercises.muscle_gain.legs },
        { day: "Day 3", focus: "Rest Day", exercises: [], specialNotes: "Active recovery - light walking or stretching" },
        { day: "Day 4", focus: "Upper Body - Pull", exercises: baseExercises.muscle_gain.pull },
        { day: "Day 5", focus: "Core & Conditioning", exercises: [
          { name: "Plank", sets: 3, reps: "45-90 seconds", restBetweenSets: "60 seconds" },
          { name: "Russian Twists", sets: 3, reps: "20-30", restBetweenSets: "45 seconds" },
          { name: "Mountain Climbers", sets: 3, reps: "30 seconds", restBetweenSets: "60 seconds" },
          { name: "Dead Bug", sets: 3, reps: "10-15", restBetweenSets: "60 seconds" }
        ]},
        { day: "Day 6", focus: "Rest Day", exercises: [], specialNotes: "Complete rest or light yoga" },
        { day: "Day 7", focus: "Rest Day", exercises: [], specialNotes: "Prepare for next week" }
      ];
    } else {
      // Generate personalized offline fallback based on user profile
      weeklySchedule = this.generatePersonalizedOfflinePlan(input);
    }

    // Create the workout plan in the same format as the server response
    const fallbackPlan: AppWorkoutPlan = {
      plan_name: `${primaryGoal.replace(/_/g, ' ').toUpperCase()} Workout Plan (Offline)`,
      weekly_schedule: weeklySchedule,
      primary_goal: primaryGoal,
      workout_frequency: workoutFrequency,
      created_at: new Date().toISOString(),
      source: 'offline_fallback'
    };

    console.log('[GEMINI SERVICE] ✅ Generated offline fallback workout plan');
    console.log(`[GEMINI SERVICE] Plan: ${fallbackPlan.plan_name}`);
    console.log(`[GEMINI SERVICE] Training days: ${weeklySchedule.filter(day => day.exercises.length > 0).length}`);
    
    return fallbackPlan;
  }

  /**
   * Generate a personalized offline workout plan based on user profile
   */
  static generatePersonalizedOfflinePlan = (input: WorkoutPlanInput): WorkoutDay[] => {
    const { primaryGoal, trainingLevel, workoutFrequency = '4_5' } = input;

    // Determine workout frequency based on user preference and fitness level
    const getWorkoutDays = (): number => {
      if (trainingLevel === 'Beginner') {
        return workoutFrequency === '2_3' ? 2 : 3;
      } else if (trainingLevel === 'Intermediate') {
        // For intermediate users, default to more frequent training unless specifically requested otherwise
        return workoutFrequency === '2_3' ? 3 : workoutFrequency === '4_5' ? 5 : 5; // Favor 5 days for 4_5 preference
      } else { // Advanced
        return workoutFrequency === '2_3' ? 4 : workoutFrequency === '4_5' ? 6 : 6; // Favor higher frequency for advanced
      }
    };

    const workoutDays = getWorkoutDays();

    // Create a 7-day schedule with dynamic rest days
    const schedule: WorkoutDay[] = [];
    const restDays = 7 - workoutDays;

    // Distribute workout days and rest days intelligently
    const workoutPattern = this.generateWorkoutPattern(workoutDays, primaryGoal as any);

    for (let day = 1; day <= 7; day++) {
      const dayType = workoutPattern[day - 1];

      if (dayType === 'workout') {
        schedule.push(this.createWorkoutDay(day, primaryGoal as any, trainingLevel as any));
      } else if (dayType === 'active_recovery') {
        schedule.push(this.createActiveRecoveryDay(day));
      } else {
        schedule.push(this.createRestDay(day));
      }
    }

    return schedule;
  };

  /**
   * Generate workout pattern based on frequency and goal
   */
  private static generateWorkoutPattern = (workoutDays: number, goal: string): string[] => {
    const pattern: string[] = new Array(7).fill('rest');

    // Distribute workout days based on goal and frequency
    if (goal === 'muscle_gain') {
      // For muscle gain, space out training days for recovery
      if (workoutDays >= 4) {
        pattern[0] = 'workout'; // Monday
        pattern[2] = 'workout'; // Wednesday
        pattern[4] = 'workout'; // Friday
        if (workoutDays >= 5) pattern[6] = 'workout'; // Sunday
        if (workoutDays >= 6) pattern[1] = 'active_recovery'; // Tuesday
      } else {
        pattern[0] = 'workout';
        pattern[3] = 'workout';
        if (workoutDays >= 3) pattern[5] = 'workout';
      }
    } else if (goal === 'fat_loss') {
      // For fat loss, more frequent but shorter sessions
      if (workoutDays >= 4) {
        pattern[0] = 'workout';
        pattern[1] = 'active_recovery';
        pattern[2] = 'workout';
        pattern[3] = 'workout';
        pattern[4] = 'active_recovery';
        if (workoutDays >= 5) pattern[5] = 'workout';
      } else {
        pattern[0] = 'workout';
        pattern[2] = 'workout';
        if (workoutDays >= 3) pattern[4] = 'workout';
      }
    } else {
      // General fitness - balanced approach
      if (workoutDays >= 4) {
        pattern[0] = 'workout';
        pattern[2] = 'workout';
        pattern[4] = 'workout';
        if (workoutDays >= 5) pattern[1] = 'active_recovery';
        if (workoutDays >= 6) pattern[5] = 'workout';
      } else {
        pattern[0] = 'workout';
        pattern[3] = 'workout';
        if (workoutDays >= 3) pattern[5] = 'workout';
      }
    }

    return pattern;
  };

  /**
   * Create a workout day based on goal and fitness level
   */
  private static createWorkoutDay = (day: number, goal: string, level: string): WorkoutDay => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Helper function to convert ExerciseInfo to ExerciseItem format
    const convertToExerciseItem = (exercise: ExerciseInfo): ExerciseItem => ({
      name: exercise.name,
      sets: level === 'Beginner' ? 3 : level === 'Intermediate' ? 4 : 4,
      reps: level === 'Beginner' ? '10-12' : level === 'Intermediate' ? '8-10' : '6-8',
      restBetweenSets: level === 'Beginner' ? '60-90 seconds' : '90-120 seconds',
      notes: `${exercise.equipment} exercise targeting ${exercise.muscleGroups.join(', ')}`
    });

    if (goal === 'muscle_gain') {
      const exercises = level === 'Beginner' ?
        BASE_EXERCISES.muscle_gain.full_body.slice(0, 4).map(convertToExerciseItem) :
        BASE_EXERCISES.muscle_gain.compound.slice(0, 5).map(convertToExerciseItem);

      return {
        day: `Day ${day}`,
        focus: level === 'Beginner' ? 'Full Body Strength' : 'Compound Movements',
        exercises,
        notes: `${level} level muscle building focus`,
        estimatedCaloriesBurned: level === 'Beginner' ? 300 : 400
      };
    } else if (goal === 'fat_loss') {
      const exercises = day % 2 === 1 ?
        BASE_EXERCISES.fat_loss.hiit.slice(0, 4).map(convertToExerciseItem) :
        BASE_EXERCISES.fat_loss.strength.slice(0, 4).map(convertToExerciseItem);

      return {
        day: `Day ${day}`,
        focus: day % 2 === 1 ? 'HIIT Cardio' : 'Strength Training',
        exercises,
        notes: 'Combined cardio and strength for fat loss',
        estimatedCaloriesBurned: 400
      };
    } else {
      const exercises = BASE_EXERCISES.general_fitness.full_body.slice(0, 5).map(convertToExerciseItem);

      return {
        day: `Day ${day}`,
        focus: 'Full Body Workout',
        exercises,
        notes: 'Balanced full body training',
        estimatedCaloriesBurned: 350
      };
    }
  };

  /**
   * Create an active recovery day
   */
  private static createActiveRecoveryDay = (day: number): WorkoutDay => {
    return {
      day: `Day ${day}`,
      focus: 'Active Recovery',
      exercises: [
        { name: "Walking", sets: 1, reps: "30 minutes", restBetweenSets: "N/A" },
        { name: "Stretching", sets: 1, reps: "15-20 minutes", restBetweenSets: "N/A" },
        { name: "Light Yoga", sets: 1, reps: "20 minutes", restBetweenSets: "N/A" }
      ],
      notes: 'Light activity to promote recovery',
      estimatedCaloriesBurned: 150
    };
  };

  /**
   * Create a rest day
   */
  private static createRestDay = (day: number): WorkoutDay => {
    return {
      day: `Day ${day}`,
      focus: 'Rest Day',
      exercises: [],
      notes: 'Complete rest for recovery and muscle growth',
      estimatedCaloriesBurned: 0
    };
  };
}





