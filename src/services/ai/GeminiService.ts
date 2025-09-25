import Constants from 'expo-constants';
import {
  SUPPORTED_EXERCISES,
  getExerciseNamesForPrompt,
  getExercisesByEquipment,
  isSupportedExercise,
  getExerciseInfo,
  ExerciseInfo
} from '../../constants/exerciseNames';
import { bodybuilderWorkouts, BodybuilderWorkout } from '../../data/bodybuilder-workouts';
import { WorkoutPlan as AppWorkoutPlan, WorkoutDay as AppWorkoutDay, ExerciseItem } from '../../types/chat';

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

export class GeminiService {
  
  private static getBaseUrls(): string[] {
    const railwayUrl = 'https://gofitai-production.up.railway.app';
    const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;

    console.log('[GEMINI SERVICE] Available URLs:');
    console.log('[GEMINI SERVICE] Railway URL:', railwayUrl);
    console.log('[GEMINI SERVICE] Environment URL:', envUrl);
    console.log('[GEMINI SERVICE] Using URLs:', [railwayUrl, envUrl].filter(Boolean));

    return [
      railwayUrl, // Railway server first (always available)
      envUrl, // Configured URL from environment
    ].filter(Boolean) as string[];
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
        const timeoutMs = 45000; // 45 seconds timeout for Gemini API (faster than server timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[GEMINI SERVICE] Request timed out for ${base}, trying next...`);
          controller.abort();
        }, timeoutMs);
        
        const response = await fetch(`${base}/api/generate-recipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

    // Filter out rest days and abs-only days from main schedule
    let mainWorkoutDays = weeklySchedule.filter(day =>
      !day.day.toLowerCase().includes('rest') &&
      !day.focus.toLowerCase().includes('abs only')
    );

    // ADAPT FOR USER'S WORKOUT FREQUENCY PREFERENCE
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

    return {
      name: `${bodybuilderWorkout.name}'s Training Plan (Adapted for ${input.workoutFrequency ? input.workoutFrequency.replace('_', '-') : '6'} days/week)`,
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

        // Create timeout promise - longer timeout for workout plan generation
        const timeoutMs = 60000; // 60 seconds timeout for comprehensive workout plan generation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[GEMINI SERVICE] Request timed out for ${base}, trying next...`);
          controller.abort();
        }, timeoutMs);

        const response = await fetch(`${base}/api/generate-workout-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userProfile: input }),
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

        console.log('[GEMINI SERVICE] Received workout plan response from server');

        if (data.success && data.workoutPlan) {
          return data.workoutPlan;
        } else {
          throw new Error(data.error || 'Failed to generate workout plan');
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

    // All bases failed, throw the last error
    console.error('[GEMINI SERVICE] All bases failed for workout plan generation');
    throw lastError instanceof Error ? lastError : new Error('Failed to generate workout plan with Gemini AI');
  }
}





