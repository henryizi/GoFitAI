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
2) Recipe name must be COMPREHENSIVE and include ALL ingredients in an appetizing way (e.g., "Grilled Chicken with Roasted Broccoli, Rice & Sweet Potato" NOT just "Chicken Dinner").
3) Instructions must be step-by-step and professional.
4) Calculate nutrition to approximately match the targets.
5) Ensure the recipe is practical and cookable.

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

  /**
   * Generate a complete daily meal plan using DeepSeek AI
   */
  async generateMealPlan(targets, dietaryPreferences = []) {
    console.log('[DEEPSEEK MEAL PLAN] Starting AI generation with targets:', targets);
    console.log('[DEEPSEEK MEAL PLAN] Dietary preferences:', dietaryPreferences);

    if (!this.apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }

    try {
      // Create a comprehensive prompt for creative meal plan generation
      const prompt = `You are a world-class chef and nutritionist. Create a complete, creative daily meal plan that meets these nutritional targets. Be innovative and create delicious, varied meals from global cuisines without being restricted to specific ingredients.

DAILY NUTRITIONAL TARGETS:
- Total Calories: ${targets.daily_calories} kcal
- Protein: ${targets.protein_grams}g
- Carbohydrates: ${targets.carbs_grams}g
- Fat: ${targets.fat_grams}g

DIETARY PREFERENCES: ${dietaryPreferences.length > 0 ? dietaryPreferences.join(', ') : 'No specific restrictions'}

CREATIVITY GUIDELINES:
- Draw inspiration from global cuisines (Italian, Asian, Mediterranean, Mexican, Indian, etc.)
- Create restaurant-quality meals that people actually want to eat
- Use fresh, whole foods and interesting flavor combinations
- Don't limit yourself to basic ingredients - be creative and diverse
- Each meal should be unique and exciting
- Focus on nutrition density and taste appeal

MEAL DISTRIBUTION:
- Breakfast: ~25% of daily calories (${Math.round(targets.daily_calories * 0.25)} kcal)
- Lunch: ~35% of daily calories (${Math.round(targets.daily_calories * 0.35)} kcal)
- Dinner: ~30% of daily calories (${Math.round(targets.daily_calories * 0.30)} kcal)
- Snack: ~10% of daily calories (${Math.round(targets.daily_calories * 0.10)} kcal)

Create 4 diverse, delicious meals that together meet the exact nutritional targets above.

Respond with a JSON array in this exact format:
[
  {
    "meal_type": "breakfast",
    "recipe_name": "Creative meal name",
    "prep_time": 15,
    "cook_time": 10,
    "servings": 1,
    "ingredients": [
      "1 cup oats",
      "1/2 cup blueberries",
      "1 tbsp almond butter"
    ],
    "instructions": [
      "Cook oats with water",
      "Add blueberries and almond butter",
      "Mix well and serve"
    ],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.25)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.25)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.30)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.25)}
    }
  },
  {
    "meal_type": "lunch",
    "recipe_name": "Creative lunch name",
    "prep_time": 20,
    "cook_time": 25,
    "servings": 1,
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.35)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.35)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.35)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.30)}
    }
  },
  {
    "meal_type": "dinner",
    "recipe_name": "Creative dinner name",
    "prep_time": 25,
    "cook_time": 30,
    "servings": 1,
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.30)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.30)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.25)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.35)}
    }
  },
  {
    "meal_type": "snack",
    "recipe_name": "Creative snack name",
    "prep_time": 5,
    "cook_time": 0,
    "servings": 1,
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "macros": {
      "calories": ${Math.round(targets.daily_calories * 0.10)},
      "protein_grams": ${Math.round(targets.protein_grams * 0.10)},
      "carbs_grams": ${Math.round(targets.carbs_grams * 0.10)},
      "fat_grams": ${Math.round(targets.fat_grams * 0.10)}
    }
  }
]

REQUIREMENTS:
1. Create EXCITING, restaurant-quality meals from diverse global cuisines
2. Use creative ingredients and flavor combinations - don't be boring!
3. Each meal should be completely different in style and cuisine
4. Ensure nutritional targets are met as closely as possible
5. Provide realistic but interesting ingredients and detailed cooking instructions
6. Consider dietary preferences: ${dietaryPreferences.join(', ') || 'none'}
7. Make meals practical for home cooking but impressive in taste
8. Focus on meals that are Instagram-worthy and crave-able
9. Respond ONLY with valid JSON, no additional text

INSPIRATION EXAMPLES:
- Breakfast: Korean-style avocado toast, Mediterranean shakshuka, Japanese tamago bowl
- Lunch: Thai curry bowl, Mexican quinoa salad, Italian grain bowl
- Dinner: Moroccan tagine, Indian curry, Mediterranean fish, Asian stir-fry
- Snack: Greek yogurt parfait, energy balls, hummus plate, fruit and nut mix
`;

      console.log('[DEEPSEEK MEAL PLAN] Sending request to DeepSeek API...');
      
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a world-class chef and nutritionist. Create innovative, restaurant-quality meal plans with accurate nutritional information. Always return valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8, // Higher creativity for meal planning
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000 // 45 second timeout for meal plans
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from DeepSeek API');
      }

      console.log('[DEEPSEEK MEAL PLAN] Raw response length:', content.length);
      console.log('[DEEPSEEK MEAL PLAN] Response preview:', content.substring(0, 200) + '...');

      // Parse the JSON response
      let mealPlan;
      try {
        // Clean up the response and try to extract array
        let cleanResponse = content.trim();
        
        // Remove markdown code blocks if present
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // If response is wrapped in an object, extract the array
        const parsed = JSON.parse(cleanResponse);
        if (Array.isArray(parsed)) {
          mealPlan = parsed;
        } else if (parsed.meals && Array.isArray(parsed.meals)) {
          mealPlan = parsed.meals;
        } else if (parsed.meal_plan && Array.isArray(parsed.meal_plan)) {
          mealPlan = parsed.meal_plan;
        } else {
          // Try to find an array in the object
          const keys = Object.keys(parsed);
          for (const key of keys) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
              mealPlan = parsed[key];
              break;
            }
          }
        }
        
        if (!mealPlan) {
          throw new Error('No valid meal plan array found in response');
        }

      } catch (parseError) {
        console.error('[DEEPSEEK MEAL PLAN] JSON parsing failed:', parseError.message);
        throw new Error('Invalid JSON response from DeepSeek API');
      }

      // Validate meal plan structure
      if (!Array.isArray(mealPlan) || mealPlan.length === 0) {
        throw new Error('Invalid meal plan structure - expected non-empty array');
      }

      // Validate each meal
      for (const meal of mealPlan) {
        if (!this.validateMealPlanItem(meal)) {
          console.error('[DEEPSEEK MEAL PLAN] Invalid meal structure:', meal);
          throw new Error('Invalid meal structure in meal plan');
        }
      }

      console.log('[DEEPSEEK MEAL PLAN] ✅ Successfully generated meal plan with', mealPlan.length, 'meals');
      return mealPlan;

    } catch (error) {
      console.error('[DEEPSEEK MEAL PLAN] Meal plan generation failed:', error.message);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('DeepSeek API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 503) {
          throw new Error('DeepSeek API is temporarily unavailable. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('DeepSeek API request timed out. Please try again.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Validate individual meal plan item structure
   */
  validateMealPlanItem(meal) {
    if (!meal || typeof meal !== 'object') return false;
    
    const required = ['meal_type', 'recipe_name', 'prep_time', 'cook_time', 'servings', 'ingredients', 'instructions', 'macros'];
    
    for (const field of required) {
      if (!(field in meal)) {
        console.error(`[DEEPSEEK MEAL PLAN] Missing required field: ${field}`);
        return false;
      }
    }
    
    if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
      console.error('[DEEPSEEK MEAL PLAN] Invalid ingredients array');
      return false;
    }
    
    if (!Array.isArray(meal.instructions) || meal.instructions.length === 0) {
      console.error('[DEEPSEEK MEAL PLAN] Invalid instructions array');
      return false;
    }

    if (!meal.macros || typeof meal.macros !== 'object') {
      console.error('[DEEPSEEK MEAL PLAN] Invalid macros object');
      return false;
    }

    const requiredMacros = ['calories', 'protein_grams', 'carbs_grams', 'fat_grams'];
    for (const macro of requiredMacros) {
      if (!(macro in meal.macros) || typeof meal.macros[macro] !== 'number') {
        console.error(`[DEEPSEEK MEAL PLAN] Missing or invalid macro: ${macro}`);
        return false;
      }
    }
    
    return true;
  }
}

module.exports = DeepSeekService;




























































