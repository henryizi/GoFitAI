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

export class GeminiService {
  
  private static getApiUrl(): string {
    // Use the same API URL as other services
    return Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
  }

  /**
   * Generate a recipe using Gemini AI
   */
  static async generateRecipe(
    mealType: string,
    targets: RecipeTarget,
    ingredients: string[]
  ): Promise<GeneratedRecipe> {
    try {
      console.log('[GEMINI SERVICE] Generating recipe via server API');
      console.log('[GEMINI SERVICE] Meal type:', mealType);
      console.log('[GEMINI SERVICE] Targets:', targets);
      console.log('[GEMINI SERVICE] Ingredients:', ingredients);

      const apiUrl = this.getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/generate-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealType,
          targets,
          ingredients
        })
      });

      if (!response.ok) {
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
      console.error('[GEMINI SERVICE] Error generating recipe:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to generate recipe with Gemini AI',
        fallback: true
      };
    }
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





