import Constants from 'expo-constants';

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

export class GeminiService {
  
  private static getBaseUrls(): string[] {
    return [
      'https://gofitai-production.up.railway.app', // Railway server first (always available)
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL, // Configured URL from environment
      'http://192.168.0.152:4000', // Current local server IP
      'http://localhost:4000', // Localhost fallback
      'http://127.0.0.1:4000', // IP localhost fallback
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

    for (const base of bases) {
      try {
        console.log(`[GEMINI SERVICE] Trying base: ${base}`);
        
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
      error: lastError?.message || 'Failed to generate recipe with Gemini AI',
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
      error: lastError?.message || 'Failed to generate daily meal plan with Gemini AI',
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
}





