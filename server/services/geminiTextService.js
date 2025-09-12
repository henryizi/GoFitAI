
/**
 * Gemini Text Service for Recipe Generation and Workout Plans
 * Provides AI-powered content generation using Google's Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiTextService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8000
      }
    });
    
    console.log('[GEMINI TEXT] Service initialized with model: gemini-2.5-flash');
    console.log('[GEMINI TEXT] API Key configured: ✅ Yes');
  }

  /**
   * Generates a recipe using Gemini AI
   * @param {string} mealType - Type of meal (breakfast, lunch, dinner, snack)
   * @param {Object} targets - Nutritional targets (calories, protein, carbs, fat)
   * @param {Array} ingredients - Available ingredients
   * @param {boolean} strict - Whether to strictly use only provided ingredients
   * @returns {Promise<Object>} Generated recipe
   */
  async generateRecipe(mealType, targets, ingredients, strict = false) {
    try {
      console.log('[GEMINI TEXT] Generating recipe for:', mealType);
      console.log('[GEMINI TEXT] Ingredients:', ingredients.length);
      console.log('[GEMINI TEXT] Strict mode:', strict);

      const startTime = Date.now();

      const prompt = this.createRecipePrompt(mealType, targets, ingredients, strict);
      
      const result = await this.generateContentWithRetry([prompt]);
      const response = await result.response;
      const text = response.text();

      const generationTime = Date.now() - startTime;
      console.log(`[GEMINI TEXT] Recipe generated in ${generationTime}ms`);
      console.log(`[GEMINI TEXT] Response length: ${text.length} characters`);
      console.log(`[GEMINI TEXT] Response preview: ${text ? text.substring(0, 200) + '...' : 'EMPTY'}`);

      // Enhanced response validation
      if (text === null || text === undefined) {
        console.error('[GEMINI TEXT] Response is null or undefined');
        throw new Error('Null response received from Gemini');
      }
      
      if (text.trim().length === 0) {
        console.error('[GEMINI TEXT] Response is empty after trimming');
        throw new Error('Empty response received from Gemini');
      }
      
      if (text.length < 10) {
        console.error('[GEMINI TEXT] Response too short:', text);
        throw new Error('Response too short from Gemini');
      }

      // Parse the JSON response using enhanced parsing with fallbacks
      let recipeData;
      try {
        recipeData = this.parseJsonWithFallbacks(text, 'recipe');
        console.log('[GEMINI TEXT] Successfully parsed recipe data');
        console.log('[GEMINI TEXT] Recipe name:', recipeData.recipe_name);
      } catch (parseError) {
        console.error('[GEMINI TEXT] All JSON parsing strategies failed:', parseError.message);
        console.log('[GEMINI TEXT] Raw response for debugging:', text.substring(0, 1000));
        
        // Create a fallback recipe as last resort
        console.log('[GEMINI TEXT] Creating emergency fallback recipe');
        recipeData = this.createFallbackRecipe(text, mealType, targets, ingredients);
      }

      // Validate and normalize the recipe
      const validatedRecipe = this.validateRecipe(recipeData);
      
      return {
        ...validatedRecipe,
        source: 'gemini_text',
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('[GEMINI TEXT] Recipe generation failed:', error.message);
      throw new Error(`Recipe generation failed: ${error.message}`);
    }
  }

  /**
   * Creates a fallback recipe when JSON parsing fails
   */
  createFallbackRecipe(text, mealType, targets, ingredients) {
    console.log('[GEMINI TEXT] Creating fallback recipe from text response');
    
    // Try to extract any useful information from the text
    const recipeName = this.extractRecipeName(text) || `${mealType} Recipe`;
    const extractedIngredients = this.extractIngredients(text, ingredients);
    const extractedInstructions = this.extractInstructions(text);
    
    return {
      recipe_name: recipeName,
      meal_type: mealType.toLowerCase(),
      prep_time: 15,
      cook_time: 20,
      total_time: 35,
      servings: 1,
      difficulty: "medium",
      ingredients: extractedIngredients,
      instructions: extractedInstructions,
      nutrition: {
        calories: targets.calories || 400,
        protein: targets.protein || 20,
        carbs: targets.carbs || 30,
        fat: targets.fat || 15,
        fiber: 5,
        sugar: 8,
        sodium: 500
      },
      tips: ["This recipe was generated as a fallback due to parsing issues"],
      tags: ["fallback", "generated"]
    };
  }

  /**
   * Extracts recipe name from text response
   */
  extractRecipeName(text) {
    // Look for common patterns in recipe names
    const namePatterns = [
      /recipe[:\s]+([^.\n]+)/i,
      /dish[:\s]+([^.\n]+)/i,
      /meal[:\s]+([^.\n]+)/i,
      /^([^.\n]+?)\s*recipe/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Extracts ingredients from text response
   */
  extractIngredients(text, availableIngredients) {
    const ingredients = [];
    
    // Look for ingredient patterns
    const ingredientPatterns = [
      /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cup|cups|tbsp|tsp|tablespoon|teaspoon|ounce|ounces|oz|pound|pounds|lb|slice|slices|piece|pieces|whole|wholes)\s+([^,\n]+)/gi,
      /([^,\n]+)\s+(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cup|cups|tbsp|tsp|tablespoon|teaspoon|ounce|ounces|oz|pound|pounds|lb|slice|slices|piece|pieces|whole|wholes)/gi
    ];
    
    for (const pattern of ingredientPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const ingredient = match[0].trim();
        if (ingredient && !ingredients.includes(ingredient)) {
          ingredients.push({
            name: ingredient,
            quantity: ingredient,
            calories: 100,
            protein: 5,
            carbs: 10,
            fat: 3
          });
        }
      }
    }
    
    // If no ingredients found, use available ingredients
    if (ingredients.length === 0 && availableIngredients.length > 0) {
      return availableIngredients.slice(0, 5).map(ingredient => ({
        name: ingredient,
        quantity: "as needed",
        calories: 100,
        protein: 5,
        carbs: 10,
        fat: 3
      }));
    }
    
    return ingredients.slice(0, 8); // Limit to 8 ingredients
  }

  /**
   * Extracts cooking instructions from text response
   */
  extractInstructions(text) {
    const instructions = [];
    
    // Look for numbered steps
    const stepPatterns = [
      /(\d+)\.\s*([^.\n]+)/g,
      /step\s+(\d+)[:\s]+([^.\n]+)/gi,
      /(\d+)\)\s*([^.\n]+)/g
    ];
    
    for (const pattern of stepPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const step = match[2].trim();
        if (step && !instructions.includes(step)) {
          instructions.push(step);
        }
      }
    }
    
    // If no numbered steps found, look for sentences that might be instructions
    if (instructions.length === 0) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const cookingKeywords = ['cook', 'heat', 'mix', 'stir', 'add', 'combine', 'preheat', 'bake', 'fry', 'boil', 'simmer'];
      
      for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase();
        if (cookingKeywords.some(keyword => lowerSentence.includes(keyword))) {
          instructions.push(sentence.trim());
        }
      }
    }
    
    // If still no instructions, create basic ones
    if (instructions.length === 0) {
      instructions.push(
        "Prepare all ingredients as listed",
        "Follow cooking instructions carefully",
        "Serve when ready"
      );
    }
    
    return instructions.slice(0, 6); // Limit to 6 instructions
  }

  /**
   * Generates a customized workout plan using Gemini AI
   * @param {Object} userProfile - User's fitness profile
   * @param {Object} preferences - Workout preferences
   * @returns {Promise<Object>} Generated workout plan
   */
  async generateWorkoutPlan(userProfile, preferences) {
    try {
      console.log('[GEMINI TEXT] Generating workout plan');
      console.log('[GEMINI TEXT] User level:', userProfile.fitnessLevel);
      console.log('[GEMINI TEXT] Goal:', userProfile.primaryGoal);

      const startTime = Date.now();

      const prompt = this.createWorkoutPrompt(userProfile, preferences);
      
      const result = await this.generateContentWithRetry([prompt]);
      const response = await result.response;
      const text = response.text();

      const generationTime = Date.now() - startTime;
      console.log(`[GEMINI TEXT] Workout plan generated in ${generationTime}ms`);

      // Parse the JSON response using enhanced parsing with fallbacks
      let workoutData;
      try {
        workoutData = this.parseJsonWithFallbacks(text, 'workout');
        console.log('[GEMINI TEXT] Successfully parsed workout data');
        console.log('[GEMINI TEXT] Plan name:', workoutData.plan_name);
      } catch (parseError) {
        console.error('[GEMINI TEXT] All JSON parsing strategies failed:', parseError.message);
        console.log('[GEMINI TEXT] Raw response for debugging:', text.substring(0, 1000));
        throw new Error('Failed to parse workout response');
      }

      // Validate and normalize the workout plan
      const validatedPlan = this.validateWorkoutPlan(workoutData);
      
      return {
        ...validatedPlan,
        source: 'gemini_text',
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('[GEMINI TEXT] Workout plan generation failed:', error.message);
      throw new Error(`Workout plan generation failed: ${error.message}`);
    }
  }

  /**
   * Creates a detailed prompt for recipe generation
   */
  createRecipePrompt(mealType, targets, ingredients, strict) {
    const strictnessNote = strict 
      ? "You MUST use ONLY the ingredients listed. Do not add any other ingredients, seasonings, or components."
      : "Use primarily the listed ingredients, but you may add basic seasonings (salt, pepper, herbs) if needed for flavor.";

    return `You are a professional chef and nutritionist. Create ONE detailed recipe for ${mealType} using the provided ingredients.

MEAL TYPE: ${mealType}
NUTRITIONAL TARGETS: 
- Calories: ${targets.calories} kcal
- Protein: ${targets.protein}g
- Carbohydrates: ${targets.carbs}g
- Fat: ${targets.fat}g

AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

INGREDIENT RULES: ${strictnessNote}

REQUIREMENTS:
1. Create a realistic, delicious recipe that matches the nutritional targets as closely as possible
2. Use appropriate quantities for each ingredient
3. Provide clear, step-by-step cooking instructions
4. Calculate accurate nutritional information for each ingredient
5. Ensure the recipe serves 1 person unless specified otherwise

CRITICAL: You must respond with ONLY valid JSON. Do not include any explanation, markdown, or extra text before or after the JSON. 

IMPORTANT JSON FORMATTING RULES:
1. Use ONLY double quotes (") for strings, never single quotes (')
2. Ensure all property names are quoted
3. Do not include trailing commas
4. Escape any quotes within strings with backslash (\")
5. Use proper JSON syntax - no JavaScript comments or syntax
6. Ensure all arrays and objects are properly closed
7. Do not truncate the response - provide complete JSON

Return ONLY the JSON object in this exact format:
{
  "recipe_name": "Descriptive name of the dish",
  "meal_type": "${mealType.toLowerCase()}",
  "prep_time": 15,
  "cook_time": 20,
  "total_time": 35,
  "servings": 1,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "amount with unit (e.g., 150g, 1 cup, 2 tbsp)",
      "calories": 120,
      "protein": 8.5,
      "carbs": 15.2,
      "fat": 4.1
    }
  ],
  "instructions": [
    "Step 1: Detailed instruction",
    "Step 2: Another detailed instruction",
    "Step 3: Continue with clear steps"
  ],
  "nutrition": {
    "calories": ${targets.calories},
    "protein": ${targets.protein},
    "carbs": ${targets.carbs},
    "fat": ${targets.fat},
    "fiber": 5.2,
    "sugar": 8.1,
    "sodium": 650
  },
  "tips": [
    "Helpful cooking tip 1",
    "Helpful cooking tip 2"
  ],
  "tags": ["quick", "healthy", "high-protein"]
}

IMPORTANT: Ensure your response is complete and properly formatted JSON. Do not truncate or leave incomplete JSON objects.`;
  }

  /**
   * Creates a detailed prompt for workout plan generation
   */
  createWorkoutPrompt(userProfile, preferences) {
    // Enhanced customization based on user profile
    const fitnessLevel = userProfile.fitnessLevel || 'intermediate';
    const primaryGoal = userProfile.primaryGoal || 'general_fitness';
    const age = userProfile.age || 25;
    
    // Use userProfile.workoutFrequency if available, otherwise fall back to preferences
    let daysPerWeek;
    if (userProfile.workoutFrequency) {
      // Convert workout frequency format to number of days
      if (userProfile.workoutFrequency === '2_3') {
        // For 2-3 times per week, randomly choose between 2 and 3 days
        daysPerWeek = Math.random() < 0.5 ? 2 : 3;
      } else if (userProfile.workoutFrequency === '4_5') {
        // For 4-5 times per week, randomly choose between 4 and 5 days
        daysPerWeek = Math.random() < 0.5 ? 4 : 5;
      } else if (userProfile.workoutFrequency === '6') {
        daysPerWeek = 6;
      } else {
        daysPerWeek = parseInt(userProfile.workoutFrequency) || 3;
      }
    } else {
      daysPerWeek = preferences?.daysPerWeek || 3;
    }
    
    const sessionDuration = preferences?.sessionDuration || 45;
    const gender = (userProfile.gender || 'unspecified').toLowerCase();
    
    // Customize based on fitness level
    const levelSpecific = {
      beginner: {
        intensity: 'low to moderate',
        restPeriods: '90-120 seconds',
        sets: '2-3 sets',
        reps: '10-15 reps',
        focus: 'form and technique',
        equipment: 'bodyweight and basic equipment',
        progression: 'gradual increase in repetitions'
      },
      intermediate: {
        intensity: 'moderate to high',
        restPeriods: '60-90 seconds',
        sets: '3-4 sets',
        reps: '8-12 reps',
        focus: 'strength and muscle building',
        equipment: 'dumbbells, resistance bands, gym equipment',
        progression: 'increase weight and complexity'
      },
      advanced: {
        intensity: 'high to very high',
        restPeriods: '45-75 seconds',
        sets: '4-5 sets',
        reps: '6-10 reps',
        focus: 'power and advanced techniques',
        equipment: 'barbells, advanced gym equipment',
        progression: 'supersets, drop sets, advanced techniques'
      }
    };

    const levelConfig = levelSpecific[fitnessLevel] || levelSpecific.intermediate;

    // Customize based on primary goal
    const goalSpecific = {
      muscle_gain: {
        focus: 'hypertrophy and strength',
        repRange: levelConfig.reps,
        restTime: levelConfig.restPeriods,
        exercises: 'compound movements with isolation exercises',
        volume: 'higher volume with moderate intensity',
        nutrition: 'high protein intake, caloric surplus'
      },
      fat_loss: {
        focus: 'calorie burn and metabolic conditioning',
        repRange: '12-20 reps',
        restTime: '30-60 seconds',
        exercises: 'full body circuits and HIIT',
        volume: 'high intensity with shorter rest periods',
        nutrition: 'caloric deficit, high protein'
      },
      strength: {
        focus: 'maximal strength development',
        repRange: '3-6 reps',
        restTime: '2-5 minutes',
        exercises: 'compound movements with progressive overload',
        volume: 'lower volume with high intensity',
        nutrition: 'adequate protein, progressive overload'
      },
      endurance: {
        focus: 'cardiovascular fitness and muscular endurance',
        repRange: '15-30 reps',
        restTime: '30-45 seconds',
        exercises: 'bodyweight and light resistance',
        volume: 'high repetition with low weight',
        nutrition: 'balanced macronutrients, hydration focus'
      },
      general_fitness: {
        focus: 'overall health and fitness',
        repRange: levelConfig.reps,
        restTime: levelConfig.restPeriods,
        exercises: 'balanced mix of cardio and strength',
        volume: 'moderate volume and intensity',
        nutrition: 'balanced nutrition, consistency'
      },
      hypertrophy: {
        focus: 'muscle building and hypertrophy',
        repRange: '8-12 reps',
        restTime: '60-90 seconds',
        exercises: 'compound and isolation movements',
        volume: 'higher volume with moderate intensity',
        nutrition: 'high protein, caloric surplus, progressive overload'
      },
      athletic_performance: {
        focus: 'sports-specific training and athletic development',
        repRange: '6-12 reps',
        restTime: '60-120 seconds',
        exercises: 'sport-specific movements and functional training',
        volume: 'moderate to high volume with sport-specific intensity',
        nutrition: 'performance-focused nutrition, adequate protein and carbs'
      }
    };

    const goalConfig = goalSpecific[primaryGoal] || goalSpecific.general_fitness;

    // Generate appropriate workout split based on frequency
    const workoutSplit = this.generateWorkoutSplit(daysPerWeek, primaryGoal, fitnessLevel);

    return `You are a certified personal trainer and fitness expert. Create a personalized workout plan.

USER DETAILS:
- Level: ${fitnessLevel}
- Goal: ${primaryGoal}
- Sessions: ${daysPerWeek} days/week
- Duration: ${sessionDuration} minutes/session
- Rest: ${goalConfig.restTime}
- Reps: ${goalConfig.repRange}

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations, no extra text.

JSON FORMATTING REQUIREMENTS:
1. Use ONLY double quotes (") for all strings
2. All property names MUST be quoted
3. NO trailing commas anywhere
4. NO single quotes (')
5. NO comments, NO markdown
6. Complete all arrays and objects
7. Ensure proper JSON structure

Return ONLY the JSON object in this exact format (no extra text, no markdown):
{
  "plan_name": "Personalized ${fitnessLevel} ${primaryGoal} Plan",
  "duration_weeks": 4,
  "sessions_per_week": ${daysPerWeek},
  "target_level": "${fitnessLevel}",
  "primary_goal": "${primaryGoal}",
  "workout_split": "${workoutSplit}",
  "weekly_schedule": [
    {
      "day": 1,
      "day_name": "Monday",
      "focus": "Upper Body Strength",
      "workout_type": "Strength Training",
      "duration_minutes": ${sessionDuration},
      "warm_up": [
        {
          "exercise": "Arm Circles",
          "duration": "2 minutes",
          "instructions": "Rotate arms forward and backward"
        }
      ],
      "main_workout": [
        {
          "exercise": "Bench Press",
          "sets": 3,
          "reps": "${goalConfig.repRange}",
          "rest_seconds": ${goalConfig.restTime.split('-')[0] * 60},
          "instructions": "Lie on bench, lower bar to chest, press up",
          "modifications": "Use lighter weight if needed"
        }
      ],
      "cool_down": [
        {
          "exercise": "Shoulder Stretch",
          "duration": "1 minute per side",
          "instructions": "Gently pull arm across body"
        }
      ]
    }
  ],
  "progression_plan": {
    "week_1": "Establish proper form and technique",
    "week_2": "Increase weight gradually",
    "week_3": "Add complexity to exercises",
    "week_4": "Peak performance with maximum effort"
  },
  "nutrition_tips": [
    "${goalConfig.nutrition}",
    "Stay hydrated throughout sessions",
    "Eat balanced meals before workouts",
    "Consume protein after workouts"
  ],
  "safety_guidelines": [
    "Warm up before exercising",
    "Stop if you feel pain",
    "Maintain proper form",
    "Listen to your body",
    "Consult healthcare provider if needed"
  ],
  "equipment_needed": ["${levelConfig.equipment}"],
  "estimated_results": "Improvements in 2-4 weeks with consistency"
}`;
  }

  /**
   * Generates appropriate workout split based on frequency and goals
   */
  generateWorkoutSplit(daysPerWeek, primaryGoal, fitnessLevel) {
    const splits = {
      2: {
        hypertrophy: "Full Body Split (2x per week)",
        fat_loss: "Full Body HIIT (2x per week)",
        strength: "Full Body Strength (2x per week)",
        endurance: "Full Body Endurance (2x per week)",
        general_fitness: "Full Body Fitness (2x per week)",
        athletic_performance: "Full Body Athletic (2x per week)"
      },
      3: {
        hypertrophy: "Push/Pull/Legs or Full Body (3x per week)",
        fat_loss: "Full Body Circuits (3x per week)",
        strength: "Full Body Strength (3x per week)",
        endurance: "Full Body Endurance (3x per week)",
        general_fitness: "Full Body Fitness (3x per week)",
        athletic_performance: "Full Body Athletic (3x per week)"
      },
      4: {
        hypertrophy: "Upper/Lower Split (4x per week)",
        fat_loss: "Full Body + Cardio (4x per week)",
        strength: "Upper/Lower Strength (4x per week)",
        endurance: "Full Body + Cardio (4x per week)",
        general_fitness: "Upper/Lower Fitness (4x per week)",
        athletic_performance: "Upper/Lower Athletic (4x per week)"
      },
      5: {
        hypertrophy: "Push/Pull/Legs/Upper/Lower (5x per week)",
        fat_loss: "Full Body + Cardio + HIIT (5x per week)",
        strength: "Push/Pull/Legs/Upper/Lower (5x per week)",
        endurance: "Full Body + Cardio + Endurance (5x per week)",
        general_fitness: "Push/Pull/Legs/Upper/Lower (5x per week)",
        athletic_performance: "Push/Pull/Legs/Upper/Lower Athletic (5x per week)"
      },
      6: {
        hypertrophy: "Push/Pull/Legs/Upper/Lower/Cardio (6x per week)",
        fat_loss: "Full Body + Cardio + HIIT + Recovery (6x per week)",
        strength: "Push/Pull/Legs/Upper/Lower/Recovery (6x per week)",
        endurance: "Full Body + Cardio + Endurance + Recovery (6x per week)",
        general_fitness: "Push/Pull/Legs/Upper/Lower/Cardio (6x per week)",
        athletic_performance: "Push/Pull/Legs/Upper/Lower/Cardio Athletic (6x per week)"
      }
    };

    return splits[daysPerWeek]?.[primaryGoal] || splits[daysPerWeek]?.general_fitness || "Custom Split";
  }

  /**
   * Generates content with retry logic for 503 Service Unavailable errors
   */
  async generateContentWithRetry(content, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GEMINI TEXT] Attempt ${attempt}/${maxRetries}`);
        
        const result = await this.model.generateContent(content);
        
        // Validate the response
        if (!result || !result.response) {
          console.error('[GEMINI TEXT] Invalid response structure:', { result: !!result, response: !!result?.response });
          throw new Error('Invalid response structure from Gemini');
        }
        
        const response = await result.response;
        const text = response.text();
        
        // Enhanced response validation with detailed logging
        console.log(`[GEMINI TEXT] Response validation:`, {
          textExists: !!text,
          textType: typeof text,
          textLength: text ? text.length : 0,
          textTrimmedLength: text ? text.trim().length : 0,
          textPreview: text ? text.substring(0, 100) + '...' : 'N/A'
        });
        
        // Validate response content
        if (!text || text.trim().length === 0) {
          console.error('[GEMINI TEXT] Empty response detected:', {
            text: text,
            textLength: text ? text.length : 0,
            trimmedLength: text ? text.trim().length : 0
          });
          throw new Error('Empty response from Gemini');
        }
        
        // Check for truncated responses (common with Gemini)
        if (text.length < 50) {
          console.warn('[GEMINI TEXT] Very short response detected, might be truncated');
        }
        
        // Check for incomplete JSON (common issue)
        const hasJsonStart = text.includes('{') || text.includes('[');
        const hasJsonEnd = text.includes('}') || text.includes(']');
        if (hasJsonStart && !hasJsonEnd) {
          console.warn('[GEMINI TEXT] Incomplete JSON detected - response may be truncated');
        }
        
        console.log(`[GEMINI TEXT] ✅ Success on attempt ${attempt}`);
        console.log(`[GEMINI TEXT] Response length: ${text.length} characters`);
        return result;
        
      } catch (error) {
        const isServiceUnavailable = error.message.includes('503') || 
                                   error.message.includes('Service Unavailable') ||
                                   error.message.includes('overloaded') ||
                                   error.message.includes('quota') ||
                                   error.message.includes('rate limit');
        
        const isRetryable = isServiceUnavailable || 
                           error.message.includes('network') ||
                           error.message.includes('timeout') ||
                           error.message.includes('Empty response') ||
                           error.message.includes('Invalid response structure');
        
        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[GEMINI TEXT] ⚠️ Retryable error (attempt ${attempt}), retrying in ${delay}ms...`);
          console.log(`[GEMINI TEXT] Error: ${error.message}`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's not a retryable error, or we've exhausted retries, throw the error
        throw error;
      }
    }
  }

  /**
   * Validates and normalizes recipe data
   */
  validateRecipe(recipe) {
    const validated = {
      recipe_name: recipe.recipe_name || "Generated Recipe",
      meal_type: recipe.meal_type || "meal",
      prep_time: Math.max(recipe.prep_time || 10, 5),
      cook_time: Math.max(recipe.cook_time || 15, 0),
      total_time: recipe.total_time || (recipe.prep_time || 10) + (recipe.cook_time || 15),
      servings: Math.max(recipe.servings || 1, 1),
      difficulty: recipe.difficulty || "medium",
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      nutrition: {
        calories: Math.max(recipe.nutrition?.calories || 400, 0),
        protein: Math.max(recipe.nutrition?.protein || 20, 0),
        carbs: Math.max(recipe.nutrition?.carbs || 30, 0),
        fat: Math.max(recipe.nutrition?.fat || 15, 0),
        fiber: Math.max(recipe.nutrition?.fiber || 5, 0),
        sugar: Math.max(recipe.nutrition?.sugar || 8, 0),
        sodium: Math.max(recipe.nutrition?.sodium || 500, 0)
      },
      tips: recipe.tips || [],
      tags: recipe.tags || []
    };

    // Ensure ingredients have required fields
    validated.ingredients = validated.ingredients.map(ingredient => ({
      name: ingredient.name || "Ingredient",
      quantity: ingredient.quantity || "1 serving",
      calories: Math.max(ingredient.calories || 0, 0),
      protein: Math.max(ingredient.protein || 0, 0),
      carbs: Math.max(ingredient.carbs || 0, 0),
      fat: Math.max(ingredient.fat || 0, 0)
    }));

    return validated;
  }

  /**
   * Validates and normalizes workout plan data
   */
  validateWorkoutPlan(plan) {
    const validated = {
      plan_name: plan.plan_name || "Custom Workout Plan",
      duration_weeks: Math.max(plan.duration_weeks || 4, 1),
      sessions_per_week: Math.max(plan.sessions_per_week || 3, 1),
      target_level: plan.target_level || "intermediate",
      primary_goal: plan.primary_goal || "general fitness",
      weekly_schedule: plan.weekly_schedule || [],
      progression_plan: plan.progression_plan || {},
      nutrition_tips: plan.nutrition_tips || [],
      safety_guidelines: plan.safety_guidelines || [],
      equipment_needed: plan.equipment_needed || [],
      estimated_results: plan.estimated_results || "Results vary by individual commitment and consistency"
    };

    // Ensure weekly schedule has proper structure
    validated.weekly_schedule = validated.weekly_schedule.map(day => ({
      day: day.day || 1,
      day_name: day.day_name || "Workout Day",
      workout_type: day.workout_type || "Training",
      duration_minutes: Math.max(day.duration_minutes || 45, 15),
      warm_up: day.warm_up || [],
      main_workout: day.main_workout || [],
      cool_down: day.cool_down || []
    }));

    // Fallback: if Gemini returned an empty schedule, synthesize a basic one
    if (!validated.weekly_schedule || validated.weekly_schedule.length === 0) {
      const sessions = validated.sessions_per_week || 3;
      const level = (validated.target_level || 'intermediate').toLowerCase();
      const goal = (validated.primary_goal || 'general_fitness').toLowerCase();

      const defaultRepsByGoal = {
        muscle_gain: '8-12',
        strength: '4-6',
        endurance: '15-20',
        fat_loss: '12-20',
        general_fitness: '10-15'
      };
      const repRange = defaultRepsByGoal[goal] || '10-15';
      const restSeconds = goal === 'strength' ? 120 : goal === 'muscle_gain' ? 90 : 60;

      const templates = [
        { day_name: 'Day 1', focus: 'Upper Body', exercises: ['Bench Press', 'Seated Row', 'Overhead Press', 'Lat Pulldown'] },
        { day_name: 'Day 2', focus: 'Lower Body', exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Calf Raise'] },
        { day_name: 'Day 3', focus: 'Full Body', exercises: ['Dumbbell Bench', 'Goblet Squat', 'One-arm Row', 'Plank'] },
        { day_name: 'Day 4', focus: 'Push', exercises: ['Bench Press', 'Incline DB Press', 'Overhead Press', 'Cable Fly'] },
        { day_name: 'Day 5', focus: 'Pull', exercises: ['Deadlift (light)', 'Lat Pulldown', 'Barbell Row', 'Face Pull'] },
        { day_name: 'Day 6', focus: 'Legs & Core', exercises: ['Front Squat', 'Leg Curl', 'Walking Lunge', 'Hanging Leg Raise'] }
      ];

      validated.weekly_schedule = Array.from({ length: Math.min(sessions, templates.length) }).map((_, idx) => {
        const t = templates[idx];
        return {
          day: idx + 1,
          day_name: t.day_name,
          focus: t.focus,
          workout_type: t.focus,
          duration_minutes: 45,
          warm_up: [
            { exercise: 'Light Cardio', duration: '5 minutes', instructions: 'Easy pace to elevate heart rate' }
          ],
          main_workout: t.exercises.map(name => ({
            exercise: name,
            sets: level === 'beginner' ? 3 : level === 'advanced' ? 5 : 4,
            reps: repRange,
            rest_seconds: restSeconds,
            instructions: 'Controlled tempo, full range of motion',
            modifications: level === 'beginner' ? 'Use machines or lighter dumbbells as needed' : 'Increase load week to week'
          })),
          cool_down: [
            { exercise: 'Stretching', duration: '5 minutes', instructions: 'Focus on muscles trained today' }
          ]
        };
      });
    }

    return validated;
  }

  /**
   * Health check for the service
   */
  getHealthStatus() {
    return {
      service: 'GeminiTextService',
      status: 'healthy',
      model: 'gemini-2.5-flash',
      apiKeyConfigured: !!this.apiKey,
      capabilities: ['recipe_generation', 'workout_plans'],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Enhanced JSON cleaning with better error handling and fallback mechanisms
   */
  cleanJsonString(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid JSON string provided');
    }

    // Remove markdown code block markers (handle variations like ```json, ```JSON, ```)
    let cleaned = jsonString
      .replace(/^```\s*json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/i, '');
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Handle empty or whitespace-only strings
    if (!cleaned || cleaned.length === 0) {
      throw new Error('Empty JSON string after cleaning');
    }
    
    // Fix common JSON syntax errors
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing quotes around property names (but be careful not to over-escape)
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix single quotes to double quotes (but preserve escaped quotes)
    cleaned = cleaned.replace(/(?<!\\)'/g, '"');
    
    // Fix common array/object syntax issues
    cleaned = cleaned.replace(/,\s*}/g, '}');
    cleaned = cleaned.replace(/,\s*]/g, ']');
    
    // Fix missing commas between array elements
    cleaned = cleaned.replace(/}\s*{/g, '},{');
    cleaned = cleaned.replace(/]\s*\[/g, '],[');
    
    // Fix invalid characters that might break JSON
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Fix common newline issues in strings
    cleaned = cleaned.replace(/\\n/g, '\\n');
    cleaned = cleaned.replace(/\\t/g, '\\t');
    
    // Fix common unicode issues
    cleaned = cleaned.replace(/[\u2028\u2029]/g, '');
    
    // Fix common Gemini-specific issues
    // Remove any text before the first {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const firstJsonChar = Math.min(
      firstBrace !== -1 ? firstBrace : Infinity,
      firstBracket !== -1 ? firstBracket : Infinity
    );
    
    if (firstJsonChar !== Infinity && firstJsonChar > 0) {
      cleaned = cleaned.substring(firstJsonChar);
    }
    
    // Remove any text after the last } or ]
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const lastJsonChar = Math.max(lastBrace, lastBracket);
    
    if (lastJsonChar !== -1) {
      cleaned = cleaned.substring(0, lastJsonChar + 1);
    }
    
    // Fix common missing closing braces/brackets
    let braceCount = (cleaned.match(/\{/g) || []).length;
    let bracketCount = (cleaned.match(/\[/g) || []).length;
    let closeBraceCount = (cleaned.match(/\}/g) || []).length;
    let closeBracketCount = (cleaned.match(/\]/g) || []).length;
    
    // Add missing closing braces
    while (braceCount > closeBraceCount) {
      cleaned += '}';
      closeBraceCount++;
    }
    
    // Add missing closing brackets
    while (bracketCount > closeBracketCount) {
      cleaned += ']';
      closeBracketCount++;
    }
    
    // Ensure the string starts and ends with proper JSON structure
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      // Try to find the start of JSON
      const jsonStart = cleaned.search(/[{\[]/);
      if (jsonStart !== -1) {
        cleaned = cleaned.substring(jsonStart);
      }
    }
    
    // Ensure the string ends with proper JSON structure
    if (!cleaned.endsWith('}') && !cleaned.endsWith(']')) {
      // Try to find the end of JSON
      const jsonEnd = cleaned.lastIndexOf('}');
      const arrayEnd = cleaned.lastIndexOf(']');
      const endIndex = Math.max(jsonEnd, arrayEnd);
      if (endIndex !== -1) {
        cleaned = cleaned.substring(0, endIndex + 1);
      }
    }
    
    // Additional fixes for common JSON issues
    // Do NOT try to blindly escape quotes inside strings; this often corrupts valid JSON
    // Instead, only quote obviously bareword values that look like identifiers (letters, numbers, underscores, hyphens, spaces)
    cleaned = cleaned.replace(/:\s*([A-Za-z_][A-Za-z0-9_\-\s]*)\s*([,}])/g, ':"$1"$2');

    // Fix common array syntax issues
    cleaned = cleaned.replace(/,\s*,\s*/g, ',');
    cleaned = cleaned.replace(/\[\s*,/g, '[');
    cleaned = cleaned.replace(/,\s*\]/g, ']');

    // Fix common object syntax issues
    cleaned = cleaned.replace(/{\s*,/g, '{');
    cleaned = cleaned.replace(/,\s*}/g, '}');

    // Fix common string escape issues
    cleaned = cleaned.replace(/\\"/g, '\\"');
    cleaned = cleaned.replace(/\\\\/g, '\\\\');

    // Enhanced fixes for complex JSON syntax errors

    // Fix nested object/array syntax issues
    cleaned = cleaned.replace(/{\s*}/g, '{}');
    cleaned = cleaned.replace(/\[\s*\]/g, '[]');

    // Fix missing commas between object properties
    cleaned = cleaned.replace(/"\s*}/g, '"}');
    cleaned = cleaned.replace(/\w\s*}/g, '"}');

    // Fix malformed property values (common Gemini issue)
    // Handle cases where values are not properly quoted
    cleaned = cleaned.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s]*)\s*,/g, ':"$1",');
    cleaned = cleaned.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s]*)\s*}/g, ':"$1"}');

    // Fix broken string values that span multiple lines incorrectly
    cleaned = cleaned.replace(/([^\\])"[^"]*\n[^"]*"([^,}\]]*)/g, '$1"$2');

    // Fix common Gemini formatting issues
    // Remove extra whitespace and newlines that break JSON
    cleaned = cleaned.replace(/\n\s*\n/g, '\n');
    cleaned = cleaned.replace(/,\s*\n\s*,/g, ',');

    // Fix incomplete property definitions
    cleaned = cleaned.replace(/{\s*"/g, '{"');
    cleaned = cleaned.replace(/\[\s*"/g, '["');

    // Fix malformed numbers (ensure they're valid)
    cleaned = cleaned.replace(/:\s*(\d+\.\d*)\s*,/g, ':$1,');
    cleaned = cleaned.replace(/:\s*(\d+)\s*,/g, ':$1,');

    // Fix boolean values that might be malformed
    cleaned = cleaned.replace(/:\s*(true|false)\s*,/gi, ':$1,');
    cleaned = cleaned.replace(/:\s*(true|false)\s*}/gi, ':$1}');

    // Remove any remaining problematic characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

    // Final validation and cleanup
    // Ensure balanced braces and brackets
    let openBraces = (cleaned.match(/\{/g) || []).length;
    let closeBraces = (cleaned.match(/\}/g) || []).length;
    let openBrackets = (cleaned.match(/\[/g) || []).length;
    let closeBrackets = (cleaned.match(/\]/g) || []).length;

    // Add missing closing braces
    while (openBraces > closeBraces) {
      cleaned += '}';
      closeBraces++;
    }

    // Add missing closing brackets
    while (openBrackets > closeBrackets) {
      cleaned += ']';
      closeBrackets++;
    }

    console.log('[GEMINI TEXT] Enhanced cleaned JSON preview:', cleaned.substring(0, 200) + '...');
    return cleaned;
  }

  /**
   * Comprehensive JSON validation before parsing
   */
  validateJsonStructure(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return { valid: false, error: 'Invalid input: not a string' };
    }

    const trimmed = jsonString.trim();

    // Check for basic structure
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { valid: false, error: 'JSON must start with { or [' };
    }

    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
      return { valid: false, error: 'JSON must end with } or ]' };
    }

    // Check for balanced braces and brackets
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;

    if (openBraces !== closeBraces) {
      return { valid: false, error: `Unbalanced braces: ${openBraces} open, ${closeBraces} close` };
    }

    if (openBrackets !== closeBrackets) {
      return { valid: false, error: `Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close` };
    }

    // Check for basic syntax issues
    const issues = [];

    // Check for unclosed strings
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
      } else if (!inString && (char === '{' || char === '}' || char === '[' || char === ']' || char === ',' || char === ':')) {
        // Valid JSON characters outside strings
        continue;
      } else if (!inString && !/\s/.test(char) && !/[a-zA-Z0-9._-]/.test(char)) {
        // Invalid character outside string
        issues.push(`Invalid character '${char}' at position ${i}`);
      }
    }

    if (inString) {
      issues.push('Unclosed string detected');
    }

    // Check for trailing commas
    const trailingCommaRegex = /,(\s*[}\]])/g;
    if (trailingCommaRegex.test(trimmed)) {
      issues.push('Trailing commas detected');
    }

    // Check for missing commas between properties
    const missingCommaRegex = /"(\s*)"(\s*)"([^"]*)"(\s*):/g;
    if (missingCommaRegex.test(trimmed)) {
      issues.push('Possible missing commas between properties');
    }

    // Check for malformed property names (should be quoted)
    const unquotedPropertyRegex = /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
    if (unquotedPropertyRegex.test(trimmed)) {
      issues.push('Unquoted property names detected');
    }

    return {
      valid: issues.length === 0,
      error: issues.length > 0 ? issues.join('; ') : null,
      issues: issues
    };
  }

  /**
   * Enhanced JSON parsing with multiple fallback strategies
   */
  parseJsonWithFallbacks(text, context = 'unknown') {
    console.log(`[GEMINI TEXT] Attempting to parse JSON for ${context}`);
    console.log(`[GEMINI TEXT] Raw text length: ${text.length}`);

    // First, validate the JSON structure
    const validation = this.validateJsonStructure(text);
    if (validation.valid) {
      console.log(`[GEMINI TEXT] ✅ JSON structure validation passed for ${context}`);
    } else {
      console.log(`[GEMINI TEXT] ⚠️ JSON structure validation failed for ${context}:`, validation.error);
      console.log(`[GEMINI TEXT] Issues found:`, validation.issues);
    }

    // Strategy 1: Direct JSON parsing
    try {
      const parsed = JSON.parse(text);
      console.log(`[GEMINI TEXT] ✅ Direct JSON parsing successful for ${context}`);
      return parsed;
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ Direct JSON parsing failed for ${context}:`, error.message);
      if (!validation.valid) {
        console.log(`[GEMINI TEXT] 🔧 Validation confirmed issues, will attempt cleaning strategies`);
      }
    }
    
    // Strategy 2: Extract from markdown code blocks
    try {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        let jsonContent = codeBlockMatch[1].trim();
        console.log(`[GEMINI TEXT] 📦 Extracted from code block for ${context}:`, jsonContent.substring(0, 200) + '...');

        // Validate extracted content
        const codeBlockValidation = this.validateJsonStructure(jsonContent);
        if (!codeBlockValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Code block content validation failed:`, codeBlockValidation.error);
        }

        const cleaned = this.cleanJsonString(jsonContent);
        const parsed = JSON.parse(cleaned);
        console.log(`[GEMINI TEXT] ✅ Code block extraction successful for ${context}`);
        return parsed;
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ Code block extraction failed for ${context}:`, error.message);
    }
    
    // Strategy 3: Find JSON object in text
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        console.log(`[GEMINI TEXT] 🔍 Found JSON object for ${context}:`, jsonString.substring(0, 200) + '...');

        // Validate found JSON
        const jsonValidation = this.validateJsonStructure(jsonString);
        if (!jsonValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Found JSON validation failed:`, jsonValidation.error);
        }

        const cleaned = this.cleanJsonString(jsonString);
        const parsed = JSON.parse(cleaned);
        console.log(`[GEMINI TEXT] ✅ JSON object extraction successful for ${context}`);
        return parsed;
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ JSON object extraction failed for ${context}:`, error.message);
    }
    
    // Strategy 4: Find JSON array in text
    try {
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        let jsonString = arrayMatch[0];
        console.log(`[GEMINI TEXT] 📋 Found JSON array for ${context}:`, jsonString.substring(0, 200) + '...');

        // Validate found JSON array
        const arrayValidation = this.validateJsonStructure(jsonString);
        if (!arrayValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Found JSON array validation failed:`, arrayValidation.error);
        }

        const cleaned = this.cleanJsonString(jsonString);
        const parsed = JSON.parse(cleaned);
        console.log(`[GEMINI TEXT] ✅ JSON array extraction successful for ${context}`);
        return parsed;
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ JSON array extraction failed for ${context}:`, error.message);
    }
    
    // Strategy 5: Try to fix truncated JSON
    try {
      const partialMatch = text.match(/\{[\s\S]*$/);
      if (partialMatch) {
        console.log(`[GEMINI TEXT] 🔧 Attempting to fix truncated JSON for ${context}`);
        let partialJson = partialMatch[0];
        
        // Try to complete common missing parts based on context
        if (context === 'workout') {
          if (!partialJson.includes('"plan_name"')) {
            partialJson = partialJson.replace(/^\{/, '{"plan_name": "Generated Workout Plan",');
          }
          if (!partialJson.includes('"weekly_schedule"')) {
            partialJson = partialJson.replace(/,\s*$/, ',"weekly_schedule": []');
          }
          if (!partialJson.includes('"sessions_per_week"')) {
            partialJson = partialJson.replace(/,\s*$/, ',"sessions_per_week": 3');
          }
        } else if (context === 'recipe') {
          if (!partialJson.includes('"recipe_name"')) {
            partialJson = partialJson.replace(/^\{/, '{"recipe_name": "Generated Recipe",');
          }
          if (!partialJson.includes('"ingredients"')) {
            partialJson = partialJson.replace(/,\s*$/, ',"ingredients": []');
          }
          if (!partialJson.includes('"instructions"')) {
            partialJson = partialJson.replace(/,\s*$/, ',"instructions": []');
          }
        }
        
        // Ensure it ends with }
        if (!partialJson.endsWith('}')) {
          partialJson += '}';
        }
        
        console.log(`[GEMINI TEXT] 🔧 Attempting to parse fixed JSON for ${context}:`, partialJson.substring(0, 200) + '...');

        // Validate fixed JSON
        const fixedValidation = this.validateJsonStructure(partialJson);
        if (!fixedValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Fixed JSON validation failed:`, fixedValidation.error);
        }

        const cleaned = this.cleanJsonString(partialJson);
        const parsed = JSON.parse(cleaned);
        console.log(`[GEMINI TEXT] ✅ Truncated JSON fix successful for ${context}`);
        return parsed;
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ Truncated JSON fix failed for ${context}:`, error.message);
    }
    
    // Strategy 6: Last resort - create minimal valid JSON
    console.log(`[GEMINI TEXT] 🚨 All parsing strategies failed for ${context}, creating minimal JSON`);
    
    if (context === 'workout') {
      return {
        plan_name: "Fallback Workout Plan",
        duration_weeks: 4,
        sessions_per_week: 3,
        target_level: "intermediate",
        primary_goal: "general_fitness",
        weekly_schedule: [],
        progression_plan: {},
        nutrition_tips: ["Stay hydrated", "Eat balanced meals"],
        safety_guidelines: ["Warm up properly", "Listen to your body"],
        equipment_needed: ["Basic equipment"],
        estimated_results: "Consistent training will show results"
      };
    } else if (context === 'recipe') {
      return {
        recipe_name: "Fallback Recipe",
        meal_type: "meal",
        prep_time: 15,
        cook_time: 20,
        total_time: 35,
        servings: 1,
        difficulty: "easy",
        ingredients: [],
        instructions: ["Follow basic cooking instructions"],
        nutrition: { calories: 400, protein: 20, carbs: 30, fat: 15 },
        tips: ["Season to taste"],
        tags: ["fallback"]
      };
    }
    
    throw new Error(`Failed to parse JSON for ${context} after all fallback strategies`);
  }
}

module.exports = GeminiTextService;


