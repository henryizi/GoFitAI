/**
 * DeepSeek AI Service for Recipe Generation
 * Provides recipe generation using DeepSeek API
 */

const axios = require('axios');

class DeepSeekService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    this.model = 'deepseek-chat';
  }

  /**
   * Generate a recipe using DeepSeek AI
   */
  async generateRecipe(mealType, targets, ingredients, strict = false) {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }

    const prompt = this.composeRecipePrompt(mealType, targets, ingredients, strict);
    
    try {
      console.log(`[DEEPSEEK] Generating recipe for ${mealType} with ${ingredients.length} ingredients`);
      
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional chef and nutritionist. Create detailed, realistic recipes with accurate nutritional information. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from DeepSeek API');
      }

      // Parse the JSON response
      const recipe = this.parseRecipeResponse(content);
      
      // Validate the recipe structure
      if (!this.validateRecipe(recipe)) {
        throw new Error('Invalid recipe structure received from AI');
      }

      // Attach per-ingredient macros if missing
      const enhancedRecipe = this.attachPerIngredientMacros(recipe);
      
      console.log(`[DEEPSEEK] ✅ Recipe generated successfully: ${enhancedRecipe.recipe_name}`);
      return enhancedRecipe;

    } catch (error) {
      console.error('[DEEPSEEK] Recipe generation failed:', error.message);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('DeepSeek API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 503) {
          throw new Error('DeepSeek API is temporarily unavailable. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('DeepSeek API request timed out. Please try again.');
        }
      }
      
      throw new Error(`DeepSeek recipe generation failed: ${error.message}`);
    }
  }

  /**
   * Compose the recipe generation prompt
   */
  composeRecipePrompt(mealType, targets, ingredients, strict) {
    const strictMode = strict ? 
      'STRICT MODE: Use ONLY the ingredients listed below. Do NOT add any other ingredients including basic seasonings.' :
      'You may add basic seasonings and cooking essentials (salt, pepper, oil) if needed for the recipe.';

    return `
You are a professional chef. Create ONE detailed recipe for ${mealType} using the provided ingredients. You must compute realistic quantities and write meticulous, professional instructions.

MEAL TYPE: ${mealType}
NUTRITIONAL TARGETS: Calories ${targets.calories} kcal, Protein ${targets.protein}g, Carbs ${targets.carbs}g, Fat ${targets.fat}g
AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

${strictMode}

CRITICAL RULES:
1) Use realistic quantities (e.g., "120g chicken breast", "100g cooked rice", "1 tbsp olive oil"). Avoid absurd amounts.
2) Instructions must be step-by-step and professional.
3) Calculate nutrition to approximately match the targets.
4) Ensure the recipe is practical and cookable.

RETURN ONLY VALID JSON in this exact format:
{
  "recipe_name": "Name of the dish",
  "meal_type": "${mealType.toLowerCase()}",
  "prep_time": 15,
  "cook_time": 20,
  "servings": 1,
  "ingredients": [
    {"name": "ingredient1", "quantity": "amount", "calories": 100, "protein": 5, "carbs": 10, "fat": 3},
    {"name": "ingredient2", "quantity": "amount", "calories": 150, "protein": 8, "carbs": 15, "fat": 5}
  ],
  "instructions": [
    "Step 1: Detailed instruction",
    "Step 2: Another detailed instruction"
  ],
  "nutrition": {
    "calories": ${targets.calories},
    "protein": ${targets.protein},
    "carbs": ${targets.carbs},
    "fat": ${targets.fat},
    "fiber": 5,
    "sugar": 8
  }
}`;
  }

  /**
   * Parse the recipe response from AI
   */
  parseRecipeResponse(content) {
    try {
      // First, try to parse the entire content as JSON
      return JSON.parse(content);
    } catch (e) {
      console.log('[DEEPSEEK] Full content parse failed, trying to extract JSON...');
      
      // Try to find JSON in the content
      const jsonPatterns = [
        /\{[\s\S]*\}/,  // Find anything that looks like a JSON object
        /\[[\s\S]*\]/,  // Find anything that looks like a JSON array
      ];
      
      for (const pattern of jsonPatterns) {
        const match = content.match(pattern);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            console.log('[DEEPSEEK] Successfully extracted JSON from content');
            return parsed;
          } catch (parseError) {
            console.log('[DEEPSEEK] Failed to parse extracted JSON:', parseError.message);
          }
        }
      }
      
      throw new Error('Could not find valid JSON in DeepSeek response');
    }
  }

  /**
   * Validate recipe structure
   */
  validateRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') return false;
    
    const required = ['recipe_name', 'meal_type', 'prep_time', 'cook_time', 'servings', 'ingredients', 'instructions', 'nutrition'];
    
    for (const field of required) {
      if (!(field in recipe)) {
        console.error(`[DEEPSEEK] Missing required field: ${field}`);
        return false;
      }
    }
    
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      console.error('[DEEPSEEK] Invalid ingredients array');
      return false;
    }
    
    if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
      console.error('[DEEPSEEK] Invalid instructions array');
      return false;
    }
    
    return true;
  }

  /**
   * Attach per-ingredient macros if missing
   */
  attachPerIngredientMacros(recipe) {
    if (!recipe || !recipe.ingredients) {
      return recipe;
    }

    recipe.ingredients = recipe.ingredients.map(ingredient => {
      if (!ingredient.calories) {
        // Estimate macros if missing
        ingredient.calories = 50;
        ingredient.protein = 2;
        ingredient.carbs = 8;
        ingredient.fat = 2;
      }
      return ingredient;
    });

    return recipe;
  }
}

module.exports = DeepSeekService;
























