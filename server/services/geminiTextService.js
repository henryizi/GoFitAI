
/**
 * Gemini Text Service for Recipe Generation and Workout Plans
 * Provides AI-powered content generation using Google's Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiTextService {
  constructor(apiKeyManager) {
    if (!apiKeyManager) {
      throw new Error('API key manager is required');
    }

    this.apiKeyManager = apiKeyManager;
    this.currentKey = null;
    this.genAI = null;
    this.model = null;

    this.initializeWithBestKey();

    console.log('[GEMINI TEXT] Service initialized with model:', this.modelName);
    console.log('[GEMINI TEXT] API Key rotation enabled: ✅ Yes');
  }

  /**
   * Initialize with the best available API key
   */
  initializeWithBestKey() {
    try {
      const bestKey = this.apiKeyManager.getBestAvailableKey();
      this.currentKey = bestKey;
      this.genAI = new GoogleGenerativeAI(bestKey);
      
      // Try models in order of preference (working models first!)
      const modelPriority = [
        process.env.GEMINI_MODEL || process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash',
        'gemini-1.5-flash',            // Gemini 1.5 Flash (STABLE MODEL)
        'gemini-1.5-pro',              // Pro version fallback
        'gemini-pro'                   // Original fallback
      ].filter(Boolean); // Remove undefined values
      
      this.modelName = modelPriority[0];
      this.modelFallbacks = modelPriority.slice(1);
      
    this.model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 16000  // Increased for complex workout plans
      }
    });
    
      console.log('[GEMINI TEXT] Using primary model:', this.modelName);
      console.log('[GEMINI TEXT] Fallback models available:', this.modelFallbacks);
      console.log('[GEMINI TEXT] Using key with best quota availability');
    } catch (error) {
      console.error('[GEMINI TEXT] Failed to initialize with best key:', error.message);
      throw error;
    }
  }

  /**
   * Rotate to next available API key
   */
  rotateToNextKey() {
    try {
      const nextKey = this.apiKeyManager.getNextKey();
      this.currentKey = nextKey;
      this.genAI = new GoogleGenerativeAI(nextKey);
      this.model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 16000  // Increased for complex workout plans
        }
      });

      console.log('[GEMINI TEXT] Rotated to next API key');
    } catch (error) {
      console.error('[GEMINI TEXT] Failed to rotate API key:', error.message);
      throw error;
    }
  }

  /**
   * Record API usage and rotate if needed
   */
  recordUsage() {
    const usage = this.apiKeyManager.recordUsage(this.currentKey);

    // If current key is near quota limit, rotate to next key
    if (usage.remaining <= 2) {
      console.log('[GEMINI TEXT] Current key near quota limit, rotating...');
      this.rotateToNextKey();
    }

    return usage;
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
      console.log('[GEMINI TEXT] User profile keys:', Object.keys(userProfile));
      console.log('[GEMINI TEXT] Full user profile:', JSON.stringify(userProfile, null, 2));

      const startTime = Date.now();

      const prompt = this.createWorkoutPrompt(userProfile, preferences);
      console.log('[GEMINI TEXT] About to call generateContentWithRetry with prompt length:', prompt.length);
      console.log('[GEMINI TEXT] Prompt preview:', prompt.substring(0, 300) + '...');

      // Use longer timeout and more retries for workout plan generation
      const maxRetries = 3; // Workout plans need more retries due to complexity
      const result = await this.generateContentWithRetry([prompt], maxRetries);
      console.log('[GEMINI TEXT] generateContentWithRetry returned:', !!result);

      const response = await result.response;
      console.log('[GEMINI TEXT] Response object:', !!response);

      const text = response.text();
      console.log('[GEMINI TEXT] Response text:', !!text, 'length:', text?.length || 0);

      const generationTime = Date.now() - startTime;
      console.log(`[GEMINI TEXT] Workout plan generated in ${generationTime}ms`);

      // Parse the JSON response using enhanced parsing with fallbacks
      let workoutData;
      try {
        workoutData = this.parseJsonWithFallbacks(text, 'workout', userProfile);
        console.log('[GEMINI TEXT] Successfully parsed workout data');
        console.log('[GEMINI TEXT] Plan name:', workoutData.plan_name);
      } catch (parseError) {
        console.error('[GEMINI TEXT] All JSON parsing strategies failed:', parseError.message);
        console.log('[GEMINI TEXT] Raw response for debugging:', text.substring(0, 1000));
        throw new Error('Failed to parse workout response');
      }

      // Validate and normalize the workout plan
      const validatedPlan = this.validateWorkoutPlan(workoutData, userProfile);
      
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

    // Create example recipe structure based on meal type
    const exampleIngredients = ingredients.slice(0, 3).map(ingredient => ({
      name: ingredient,
      quantity: "1 serving",
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 3
    }));

    return `You are a professional chef and nutritionist. Create ONE detailed recipe for ${mealType} as valid JSON ONLY.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no text, explanations, or markdown
2. Start response immediately with { and end with }
3. Use double quotes for all strings and property names
4. Ensure all numbers are complete (e.g., 4.0, not 4.)
5. All arrays and objects must be properly closed
6. No trailing commas
7. Escape any quotes within strings

MEAL TYPE: ${mealType}
NUTRITIONAL TARGETS: 
- Calories: ${targets.calories} kcal
- Protein: ${targets.protein}g
- Carbohydrates: ${targets.carbs}g
- Fat: ${targets.fat}g

AVAILABLE INGREDIENTS: ${ingredients.join(', ')}

INGREDIENT RULES: ${strictnessNote}

EXAMPLE RECIPE STRUCTURE (copy this format):
{
  "recipe_name": "${mealType} with ${ingredients.slice(0, 2).join(' and ')}",
  "meal_type": "${mealType.toLowerCase()}",
  "prep_time": 15,
  "cook_time": 20,
  "total_time": 35,
  "servings": 1,
  "difficulty": "medium",
  "ingredients": ${JSON.stringify(exampleIngredients, null, 2)},
  "instructions": [
    "Step 1: Prepare all ingredients",
    "Step 2: Cook the main components",
    "Step 3: Combine and serve"
  ],
  "nutrition": {
    "calories": ${targets.calories},
    "protein": ${targets.protein},
    "carbs": ${targets.carbs},
    "fat": ${targets.fat},
    "fiber": 5.0,
    "sugar": 8.0,
    "sodium": 500
  },
  "tips": [
    "Season to taste",
    "Serve immediately for best results"
  ],
  "tags": ["${mealType.toLowerCase()}", "healthy", "balanced"]
}

REQUIREMENTS:
- Create a realistic recipe using the available ingredients
- Match nutritional targets as closely as possible
- Provide 4-6 clear step-by-step instructions
- Calculate accurate nutritional values
- Use proper ingredient quantities with units
- Ensure recipe serves 1 person

IMPORTANT: Return complete, valid JSON with no syntax errors. Use the example structure above as a template.`;
  }

  /**
   * Creates a detailed prompt for workout plan generation with comprehensive user profile data
   */
  createWorkoutPrompt(userProfile, preferences) {
    // Enhanced customization based on user profile (support both formats)
    const fitnessLevel = userProfile.fitnessLevel || userProfile.training_level || 'intermediate';
    const primaryGoal = userProfile.primaryGoal || userProfile.primary_goal || 'general_fitness';
    const age = userProfile.age || 25;
    const fullName = userProfile.fullName || userProfile.full_name || 'User';
    const gender = (userProfile.gender || 'unspecified').toLowerCase();
    const height = userProfile.height_cm || userProfile.height || null;
    const weight = userProfile.weight_kg || userProfile.weight || null;
    const bodyFat = userProfile.body_fat || null;
    const activityLevel = userProfile.activity_level || null;
    const fitnessStrategy = userProfile.fitness_strategy || null;
    const goalFatReduction = userProfile.goal_fat_reduction || null;
    const goalMuscleGain = userProfile.goal_muscle_gain || null;
    
    console.log('[GEMINI TEXT] Enhanced Profile data:', {
      fitnessLevel,
      primaryGoal,
      age,
      gender,
      fullName,
      height,
      weight,
      bodyFat,
      activityLevel,
      fitnessStrategy,
      goalFatReduction,
      goalMuscleGain
    });

    // Use workout frequency from userProfile (support both camelCase and snake_case)
    const workoutFreq = userProfile.workoutFrequency || userProfile.workout_frequency;
    let daysPerWeek;
    
    console.log('[GEMINI TEXT] Workout frequency from profile:', workoutFreq);
    
    if (workoutFreq) {
      // Convert workout frequency format to number of days
      if (workoutFreq === '1') {
        daysPerWeek = 1;
      } else if (workoutFreq === '2_3') {
        // For 2-3 times per week, choose 3 days for better results
        daysPerWeek = 3;
      } else if (workoutFreq === '4_5') {
        // For 4-5 times per week, choose 5 days for maximum results
        daysPerWeek = 5;
      } else if (workoutFreq === '6') {
        daysPerWeek = 6;
      } else if (workoutFreq === '7') {
        daysPerWeek = 7;
      } else {
        daysPerWeek = parseInt(workoutFreq) || 4;
      }
    } else {
      daysPerWeek = preferences?.daysPerWeek || 4;
    }
    
    console.log('[GEMINI TEXT] Calculated daysPerWeek:', daysPerWeek);
    
    const sessionDuration = preferences?.sessionDuration || 45;
    
    // Extract user preferences for personalization (with safe defaults)
    const workoutTypes = (preferences && preferences.workoutTypes) ? preferences.workoutTypes : ['strength_training'];
    const intensity = (preferences && preferences.intensity) ? preferences.intensity : 'medium';
    const equipment = (preferences && preferences.equipment) ? preferences.equipment : ['dumbbells'];
    
    console.log('[GEMINI TEXT] User preferences:', {
      workoutTypes,
      intensity,
      equipment,
      sessionDuration
    });
    
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
      weight_loss: {
        focus: 'calorie burn and metabolic conditioning',
        repRange: '12-20 reps',
        restTime: '30-60 seconds',
        exercises: 'full body circuits and HIIT',
        volume: 'high intensity with shorter rest periods',
        nutrition: 'caloric deficit, high protein'
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
      },
      flexibility: {
        focus: 'flexibility, mobility, and range of motion',
        repRange: '30-60 seconds holds',
        restTime: '15-30 seconds between stretches',
        exercises: 'yoga poses, static stretches, dynamic movements, mobility work',
        volume: 'gentle progression with focus on form and breathing',
        nutrition: 'anti-inflammatory foods, adequate hydration'
      }
    };

    const goalConfig = goalSpecific[primaryGoal] || goalSpecific.general_fitness;

    // Generate appropriate workout split based on frequency
    const workoutSplit = this.generateWorkoutSplit(daysPerWeek, primaryGoal, fitnessLevel);

    // Create personalized equipment constraints
    const equipmentConstraints = (Array.isArray(equipment) && equipment.length > 0) ? 
      `EQUIPMENT AVAILABLE: ${equipment.join(', ')}. ONLY use exercises that can be performed with this equipment.` :
      'Use bodyweight exercises and basic equipment.';
    
    // Create personalized workout type focus
    const workoutTypeFocus = (Array.isArray(workoutTypes) && workoutTypes.length > 0) ?
      `WORKOUT TYPES PREFERRED: ${workoutTypes.join(', ')}. Focus on these types of training.` :
      'Use a balanced mix of training types.';
    
    // Create age-appropriate modifications
    const ageConsiderations = age < 18 ? 
      'Focus on bodyweight exercises and proper form. Avoid heavy weights.' :
      age > 50 ? 
      'Include mobility work and joint-friendly exercises. Emphasize recovery.' :
      'Standard adult training protocols apply.';
    
    // Create gender-specific considerations (optional, based on preferences)
    const genderConsiderations = gender === 'female' ?
      'Consider exercises that are popular with female fitness goals. Include glute and core focus if appropriate.' :
      gender === 'male' ?
      'Consider exercises that align with typical male fitness goals. Include upper body and strength focus if appropriate.' :
      'Use gender-neutral exercise selection.';
      
    console.log('[GEMINI TEXT] Personalization factors:', {
      equipmentConstraints: Array.isArray(equipment) ? equipment.join(', ') : 'basic equipment',
      workoutTypeFocus: Array.isArray(workoutTypes) ? workoutTypes.join(', ') : 'strength training',
      ageConsiderations: age,
      genderConsiderations: gender
    });

    // Calculate BMI if height and weight are available
    const bmi = (height && weight) ? (weight / ((height / 100) ** 2)).toFixed(1) : null;
    
    // Create comprehensive user profile summary
    const physicalStats = [];
    if (age) physicalStats.push(`Age: ${age} years`);
    if (gender !== 'unspecified') physicalStats.push(`Gender: ${gender}`);
    if (height) physicalStats.push(`Height: ${height} cm`);
    if (weight) physicalStats.push(`Weight: ${weight} kg`);
    if (bmi) physicalStats.push(`BMI: ${bmi}`);
    if (bodyFat) physicalStats.push(`Body Fat: ${bodyFat}%`);
    if (activityLevel) physicalStats.push(`Activity Level: ${activityLevel}`);
    if (fitnessStrategy) physicalStats.push(`Fitness Strategy: ${fitnessStrategy}`);
    
    const goals = [];
    if (goalFatReduction) goals.push(`Fat Loss Goal: ${goalFatReduction}%`);
    if (goalMuscleGain) goals.push(`Muscle Gain Goal: ${goalMuscleGain}%`);

    return `You are a world-class personal trainer and exercise physiologist creating a HIGHLY PERSONALIZED workout plan for ${fullName}. Analyze their complete profile and create a scientifically-backed, individualized training program as valid JSON ONLY.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no text, explanations, or markdown
2. Start response immediately with { and end with }
3. Use double quotes for all strings and property names
4. Ensure all numbers are complete (e.g., 4.0, not 4.)
5. All arrays and objects must be properly closed
6. No trailing commas
7. Escape any quotes within strings
8. Keep instruction texts SHORT (max 50 characters) to avoid truncation

COMPREHENSIVE CLIENT PROFILE - PERSONALIZE EVERYTHING FOR THIS SPECIFIC USER:
=== BASIC INFORMATION ===
- Name: ${fullName}
- Training Level: ${fitnessLevel}
- Primary Goal: ${primaryGoal}
- Preferred Workout Frequency: ${daysPerWeek} days per week
- Session Duration: ${sessionDuration} minutes

=== PHYSICAL CHARACTERISTICS ===
${physicalStats.length > 0 ? physicalStats.join('\n') : 'Physical stats not provided'}

=== SPECIFIC GOALS ===
${goals.length > 0 ? goals.join('\n') : 'Using primary goal for guidance'}

=== PERSONALIZATION REQUIREMENTS ===
${equipmentConstraints}
${workoutTypeFocus}
${ageConsiderations}
${genderConsiderations}

=== TRAINING SPECIFICATIONS FOR THIS USER ===
- Rep Range: ${goalConfig.repRange}
- Rest Periods: ${goalConfig.restTime}
- Intensity: ${levelConfig.intensity}
- Focus: ${goalConfig.focus}
- Training Volume: ${goalConfig.volume}

ADVANCED PERSONALIZATION INSTRUCTIONS:
1. Consider their BMI (${bmi || 'unknown'}) for exercise selection and intensity
2. Factor in their activity level (${activityLevel || 'not specified'}) for recovery needs
3. Align with their fitness strategy (${fitnessStrategy || 'general approach'})
4. Target specific fat loss (${goalFatReduction || 0}%) and muscle gain (${goalMuscleGain || 0}%) goals
5. Adapt exercises for their training level and physical characteristics
6. Create progressive overload suitable for their experience level

IMPORTANT: Generate UNIQUE exercises specifically tailored to this user's complete profile, physical characteristics, goals, equipment, and preferences. DO NOT use generic templates.

RESPONSE FORMAT - CUSTOMIZE FOR THIS SPECIFIC USER:
{
  "plan_name": "Personalized ${fitnessLevel} ${primaryGoal} Plan for ${fullName}",
  "duration_weeks": 4,
  "sessions_per_week": ${daysPerWeek},
  "target_level": "${fitnessLevel}",
  "primary_goal": "${primaryGoal}",
  "workout_split": "${workoutSplit}",
  "user_profile_summary": {
    "name": "${fullName}",
    "training_level": "${fitnessLevel}",
    "primary_goal": "${primaryGoal}",
    "bmi": ${bmi || 'null'},
    "activity_level": "${activityLevel || 'not_specified'}",
    "fitness_strategy": "${fitnessStrategy || 'general'}"
  },
  "weeklySchedule": [
    {
      "day": 1,
      "day_name": "Monday",
      "focus": "CUSTOMIZE based on user's goals and split (e.g., Upper Body, Lower Body, Push, Pull, Legs, Full Body)",
      "workout_type": "CUSTOMIZE based on preferred workout types (e.g., Strength Training, HIIT, Circuit)",
      "duration_minutes": ${sessionDuration},
      "warm_up": [
        {
          "exercise": "GENERATE appropriate warm-up exercise",
          "duration": "2-3 minutes",
          "instructions": "Brief warm-up instructions"
        }
      ],
      "main_workout": [
        {
          "exercise": "GENERATE exercise appropriate for user's equipment and level",
          "sets": "CUSTOMIZE based on fitness level (2-3 for beginners, 3-4 for intermediate, 4-5 for advanced)",
          "reps": "CUSTOMIZE based on goal and level (${goalConfig.repRange})",
          "rest": "CUSTOMIZE based on goal and intensity (${goalConfig.restTime})",
          "instructions": "BRIEF form cues and safety tips (max 50 chars)"
        }
      ],
      "cool_down": [
        {
          "exercise": "GENERATE appropriate cool-down/stretch",
          "duration": "2-3 minutes",
          "instructions": "Brief stretching instructions"
        }
      ]
    }
  ],
  "progression": {
    "mesocycleWeeks": 4,
    "guidance": "CUSTOMIZE progression advice for this user's level and goals"
  },
  "estimatedTimePerSession": "${sessionDuration} minutes",
  "nutrition_tips": "BRIEF nutrition advice aligned with their goals (${goalConfig.nutrition})"
}

CRITICAL PERSONALIZATION INSTRUCTIONS:
1. Create EXACTLY ${daysPerWeek} training days in the weeklySchedule array (NO MORE, NO LESS)
2. Use day names: "Monday", "Tuesday", "Wednesday", etc.
3. For rest days, use: {"day": "Tuesday", "focus": "Rest Day", "exercises": []}
4. PERSONALIZE exercises based on:
   - Available equipment: ${Array.isArray(equipment) ? equipment.join(', ') : 'basic equipment'}
   - Fitness level: ${fitnessLevel}
   - Primary goal: ${primaryGoal}
   - Preferred workout types: ${Array.isArray(workoutTypes) ? workoutTypes.join(', ') : 'strength training'}
   - Age considerations: ${age} years old
   - Gender considerations: ${gender}
5. Generate 4-6 exercises per training day
6. Ensure exercises match the user's equipment constraints
7. Vary exercises between days to prevent boredom
8. Keep ALL instruction texts under 50 characters
9. Make each workout day focus on different muscle groups or movement patterns
10. CRITICAL: Generate EXACTLY ${daysPerWeek} workout sessions, not ${daysPerWeek - 1} or any other number

PERSONALIZATION EXAMPLES:
- If equipment includes "dumbbells": Use dumbbell exercises
- If goal is "weight_loss": Include high-intensity, calorie-burning exercises
- If level is "beginner": Use simpler, foundational movements
- If age > 50: Include mobility and joint-friendly exercises
- If workout types include "cardio": Incorporate cardio intervals

IMPORTANT: Generate a UNIQUE workout plan specifically for ${fullName}. No two users should get identical plans.`;
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
        athletic_performance: "Full Body Athletic (2x per week)",
        flexibility: "Full Body Flexibility & Mobility (2x per week)"
      },
      3: {
        hypertrophy: "Push/Pull/Legs or Full Body (3x per week)",
        fat_loss: "Full Body Circuits (3x per week)",
        strength: "Full Body Strength (3x per week)",
        endurance: "Full Body Endurance (3x per week)",
        general_fitness: "Full Body Fitness (3x per week)",
        athletic_performance: "Full Body Athletic (3x per week)",
        flexibility: "Upper/Lower/Full Body Flexibility (3x per week)"
      },
      4: {
        hypertrophy: "Upper/Lower Split (4x per week)",
        fat_loss: "Full Body + Cardio (4x per week)",
        strength: "Upper/Lower Strength (4x per week)",
        endurance: "Full Body + Cardio (4x per week)",
        general_fitness: "Upper/Lower Fitness (4x per week)",
        athletic_performance: "Upper/Lower Athletic (4x per week)",
        flexibility: "Upper/Lower/Core/Full Body Flexibility (4x per week)"
      },
      5: {
        hypertrophy: "Push/Pull/Legs/Upper/Lower (5x per week)",
        fat_loss: "Full Body + Cardio + HIIT (5x per week)",
        strength: "Push/Pull/Legs/Upper/Lower (5x per week)",
        endurance: "Full Body + Cardio + Endurance (5x per week)",
        general_fitness: "Push/Pull/Legs/Upper/Lower (5x per week)",
        athletic_performance: "Push/Pull/Legs/Upper/Lower Athletic (5x per week)",
        flexibility: "Upper/Lower/Core/Hips/Full Body Flexibility (5x per week)"
      },
      6: {
        hypertrophy: "Push/Pull/Legs/Upper/Lower/Cardio (6x per week)",
        fat_loss: "Full Body + Cardio + HIIT + Recovery (6x per week)",
        strength: "Push/Pull/Legs/Upper/Lower/Recovery (6x per week)",
        endurance: "Full Body + Cardio + Endurance + Recovery (6x per week)",
        general_fitness: "Push/Pull/Legs/Upper/Lower/Cardio (6x per week)",
        athletic_performance: "Push/Pull/Legs/Upper/Lower/Cardio Athletic (6x per week)",
        flexibility: "Upper/Lower/Core/Hips/Spine/Full Body Flexibility (6x per week)"
      }
    };

    return splits[daysPerWeek]?.[primaryGoal] || splits[daysPerWeek]?.general_fitness || "Custom Split";
  }

  /**
   * Generate text content using Gemini AI
   * @param {string} prompt - The text prompt to send to Gemini
   * @returns {Promise<string>} Generated text response
   */
  async generateText(prompt) {
    console.log('[GEMINI TEXT] Generating text content');
    console.log('[GEMINI TEXT] Prompt length:', prompt.length);
    
    try {
      // For simple text prompts, Gemini expects either a string or array format
      // Let's use the string format for simplicity
      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('[GEMINI TEXT] ✅ Text generation successful');
      console.log('[GEMINI TEXT] Response length:', text.length);
      
      return text;
      
    } catch (error) {
      console.error('[GEMINI TEXT] ❌ Text generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Try fallback models when primary model fails
   */
  async tryFallbackModel(content, currentError) {
    if (!this.modelFallbacks || this.modelFallbacks.length === 0) {
      console.log('[GEMINI TEXT] No fallback models available');
      return null;
    }

    console.log('[GEMINI TEXT] 🔄 Trying fallback models due to:', currentError.message.slice(0, 100));
    
    for (const fallbackModel of this.modelFallbacks) {
      try {
        console.log('[GEMINI TEXT] 🧪 Testing fallback model:', fallbackModel);
        
        const fallbackModelInstance = this.genAI.getGenerativeModel({
          model: fallbackModel,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 16000  // Increased for complex workout plans
          }
        });

        const result = await fallbackModelInstance.generateContent(content);
        if (result && result.response) {
          const response = await result.response;
          const text = response.text();
          if (text && text.trim().length > 0) {
            console.log('[GEMINI TEXT] ✅ Fallback model success:', fallbackModel);
            // Update current model to working one
            this.model = fallbackModelInstance;
            this.modelName = fallbackModel;
            return result;
          }
        }
      } catch (fallbackError) {
        console.log('[GEMINI TEXT] ❌ Fallback model failed:', fallbackModel, '-', fallbackError.message.slice(0, 80));
      }
    }
    
    console.log('[GEMINI TEXT] 💥 All fallback models failed');
    return null;
  }

  /**
   * Generates content with retry logic for 503 Service Unavailable errors
   */
  async generateContentWithRetry(content, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GEMINI TEXT] Attempt ${attempt}/${maxRetries}`);
        
        // Add timeout to prevent hanging requests - reasonable timeout for AI generation
        // Complex requests need more time for AI to generate comprehensive content
        const contentString = Array.isArray(content) ? content.join(' ') : content;
        console.log(`[GEMINI TEXT] Content string preview:`, contentString.substring(0, 200));
        console.log(`[GEMINI TEXT] Content string length:`, contentString.length);
        const hasWorkoutPlan = contentString.includes('workout plan');
        const hasExercise = contentString.includes('exercise');
        const hasFitness = contentString.includes('fitness');
        const hasClientProfile = contentString.includes('CLIENT PROFILE');
        const isLongContent = contentString.length > 2000;
        console.log(`[GEMINI TEXT] Detection checks: workout_plan=${hasWorkoutPlan}, exercise=${hasExercise}, fitness=${hasFitness}, client_profile=${hasClientProfile}, long_content=${isLongContent}`);
        
        const isComplexRequest = contentString.includes('meal plan') || contentString.includes('recipe') ||
                                hasWorkoutPlan || hasExercise || contentString.includes('nutrition') || 
                                hasFitness || contentString.includes('personalized workout') || 
                                hasClientProfile || isLongContent;
        const timeoutDuration = isComplexRequest ? 90000 : 30000; // 90s for complex, 30s for simple - allows AI generation
        console.log(`[GEMINI TEXT] Complex request detected: ${isComplexRequest}, timeout: ${timeoutDuration/1000}s`);

        // Add exponential backoff delay for retries
        if (attempt > 1) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 2), 5000); // 1s, 2s, 4s max
          console.log(`[GEMINI TEXT] Applying exponential backoff delay: ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Gemini request timeout after ${timeoutDuration/1000} seconds`)), timeoutDuration);
        });
        
        console.log('[GEMINI TEXT] About to call this.model.generateContent');
        console.log('[GEMINI TEXT] Model object:', !!this.model);
        console.log('[GEMINI TEXT] Content type:', Array.isArray(content) ? 'array' : typeof content);
        console.log('[GEMINI TEXT] Content length:', Array.isArray(content) ? content.length : content.length);
        
        const result = await Promise.race([
          this.model.generateContent(content),
          timeoutPromise
        ]);

        console.log('[GEMINI TEXT] Model.generateContent completed successfully');
        
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
          
          // For empty responses, only retry on the first attempt
          // This prevents infinite retry loops for prompts that consistently return empty responses
          if (attempt === 1) {
            throw new Error('Empty response from Gemini - retryable');
          } else {
            throw new Error('Empty response from Gemini - non-retryable');
          }
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
        // Log errors more selectively to reduce noise
        if (attempt === 1) {
          console.error('[GEMINI TEXT] Error in generateContentWithRetry attempt', attempt, ':', error.message);
        } else {
          console.warn('[GEMINI TEXT] Retry attempt', attempt, 'failed:', error.message);
        }

        // Try fallback models on first attempt if it's a model-specific error
        if (attempt === 1 && (
          error.message.includes('location is not supported') || 
          error.message.includes('not found') ||
          error.message.includes('not supported for generateContent')
        )) {
          console.log('[GEMINI TEXT] 🔄 Model-specific error detected, trying fallback models...');
          const fallbackResult = await this.tryFallbackModel(content, error);
          if (fallbackResult) {
            return fallbackResult;
          }
        }

        const isServiceUnavailable = error.message.includes('503') || 
                                   error.message.includes('Service Unavailable') ||
                                   error.message.includes('overloaded') ||
                                   error.message.includes('quota') ||
                                   error.message.includes('rate limit');
        
        const isRetryable = isServiceUnavailable || 
                           error.message.includes('network') ||
                           error.message.includes('timeout') ||
                           error.message.includes('fetch failed') ||
                           error.message.includes('ENOTFOUND') ||
                           error.message.includes('ECONNREFUSED') ||
                           error.message.includes('ETIMEDOUT') ||
                           error.message.includes('Gemini request timeout') ||
                           error.message.includes('Empty response from Gemini - retryable') ||
                           error.message.includes('Invalid response structure');
        
        const isNetworkError = error.message.includes('fetch failed') || 
                             error.message.includes('ENOTFOUND') ||
                             error.message.includes('ECONNREFUSED') ||
                             error.message.includes('network');
        
        // If network error on first attempt, skip retries to fail fast and allow fallback
        if (isNetworkError && attempt === 1) {
          console.log(`[GEMINI TEXT] ❌ Network error on first attempt, failing fast for fallback: ${error.message}`);
          throw error;
        }
        
        if (isRetryable && attempt < maxRetries) {
          // Exponential backoff with jitter to prevent thundering herd
          const baseDelay = 1000; // 1 second base
          const exponentialDelay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          const jitter = Math.random() * 500; // Add up to 500ms jitter
          const delay = Math.min(exponentialDelay + jitter, 8000); // Max 8s to prevent excessive delays

          console.log(`[GEMINI TEXT] ⚠️ Retryable error (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms...`);
          console.log(`[GEMINI TEXT] Error type:`, error.constructor.name);
          console.log(`[GEMINI TEXT] Error message:`, error.message);
          console.log(`[GEMINI TEXT] Network error detected:`, isNetworkError);
          console.log(`[GEMINI TEXT] Backoff delay: ${Math.round(delay)}ms (exponential + jitter)`);
          
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
  validateWorkoutPlan(plan, userProfile = null) {
    // Calculate expected sessions based on user profile
    let expectedSessions = 4; // default fallback
    if (userProfile) {
      const workoutFreq = userProfile.workoutFrequency || userProfile.workout_frequency;
      if (workoutFreq === '4_5') {
        expectedSessions = 5; // Use 5 for 4-5 times per week range
      } else if (workoutFreq === '2_3') {
        expectedSessions = 3;
      } else if (workoutFreq === '6') {
        expectedSessions = 6;
      } else if (workoutFreq === '7') {
        expectedSessions = 7;
      } else if (workoutFreq === '1') {
        expectedSessions = 1;
      } else {
        expectedSessions = parseInt(workoutFreq) || 4;
      }
    }

    const validated = {
      plan_name: plan.plan_name || "Custom Workout Plan",
      duration_weeks: Math.max(plan.duration_weeks || 4, 1),
      sessions_per_week: Math.max(plan.sessions_per_week || expectedSessions, 1),
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
      const sessions = validated.sessions_per_week || expectedSessions;
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
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      apiKeyConfigured: !!this.apiKey,
      capabilities: ['recipe_generation', 'workout_plans'],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract workout sessions from malformed JSON text
   */
  extractWorkoutSessions(text) {
    const sessions = [];
    
    // Look for workout session patterns in the text
    // Pattern 1: Look for objects with "focus" and workout-related properties
    const sessionPattern = /\{\s*"day":\s*\d+[^}]*"focus":\s*"([^"]+)"[^}]*\}/g;
    let match;
    
    while ((match = sessionPattern.exec(text)) !== null) {
      try {
        const sessionText = match[0];
        console.log(`[GEMINI TEXT] 🔍 Found potential workout session:`, sessionText.substring(0, 100) + '...');
        
        // Try to parse this individual session
        const cleanedSession = this.cleanJsonString(sessionText);
        const session = JSON.parse(cleanedSession);
        
        if (session.focus) {
          sessions.push(session);
          console.log(`[GEMINI TEXT] ✅ Successfully extracted session with focus: "${session.focus}"`);
        }
      } catch (sessionError) {
        console.log(`[GEMINI TEXT] ⚠️ Failed to parse individual session:`, sessionError.message);
      }
    }
    
    // Pattern 2: Look for focus values directly in the text
    if (sessions.length === 0) {
      const focusPattern = /"focus":\s*"([^"]+)"/g;
      const focuses = [];
      
      while ((match = focusPattern.exec(text)) !== null) {
        focuses.push(match[1]);
      }
      
      if (focuses.length > 0) {
        console.log(`[GEMINI TEXT] 🔍 Found ${focuses.length} focus values:`, focuses);
        
        // Create basic workout sessions with the found focuses
        focuses.forEach((focus, index) => {
          sessions.push({
            day: index + 1,
            day_name: `Day ${index + 1}`,
            focus: focus,
            workout_type: focus,
            duration_minutes: 45,
            warm_up: [],
            main_workout: [],
            cool_down: []
          });
        });
      }
    }
    
    console.log(`[GEMINI TEXT] 📊 Extracted ${sessions.length} workout sessions total`);
    return sessions;
  }

  /**
   * Attempt aggressive JSON repair for severely malformed responses
   */
  attemptAggressiveJsonRepair(malformedJson) {
    console.log('[GEMINI TEXT] 🔧 Starting aggressive JSON repair');

    // Try to extract all complete workout sessions first
    const sessionMatches = malformedJson.match(/\{\s*"day":\s*\d+[^}]*"focus":\s*"[^"]*"[^}]*\}/g);
    if (sessionMatches && sessionMatches.length > 0) {
      console.log(`[GEMINI TEXT] 📋 Found ${sessionMatches.length} complete workout sessions in malformed JSON`);

      // Create a new valid JSON structure using the extracted sessions
      const planNameMatch = malformedJson.match(/"plan_name":\s*"([^"]+)"/);
      const planName = planNameMatch ? planNameMatch[1] : "Repaired Workout Plan";

      const sessionsPerWeekMatch = malformedJson.match(/"sessions_per_week":\s*(\d+)/);
      const sessionsPerWeek = sessionsPerWeekMatch ? parseInt(sessionsPerWeekMatch[1]) : Math.max(3, sessionMatches.length);

      return `{
        "plan_name": "${planName}",
        "duration_weeks": 4,
        "sessions_per_week": ${sessionsPerWeek},
        "target_level": "intermediate",
        "primary_goal": "muscle_gain",
        "workout_split": "Custom Split",
        "weekly_schedule": [${sessionMatches.join(',')}]
      }`;
    }

    // If no complete sessions found, try to fix basic structure
    let repaired = malformedJson;

    // Add missing opening quote for plan_name if detected
    if (repaired.includes('"plan_name":') && !repaired.includes('"plan_name": "')) {
      repaired = repaired.replace('"plan_name":', '"plan_name": "Repaired Workout Plan",');
    }

    // Ensure basic structure exists
    if (!repaired.includes('"weekly_schedule"')) {
      repaired = repaired.replace(/,\s*$/, ',"weekly_schedule": []');
    }

    if (!repaired.includes('"sessions_per_week"')) {
      repaired = repaired.replace(/,\s*$/, ',"sessions_per_week": 4');
    }

    return repaired;
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
    
    // Fix truncated decimal numbers - comprehensive approach
    console.log(`[GEMINI TEXT] 🔧 Starting decimal repair on text length: ${cleaned.length}`);
    const beforeDecimalFix = cleaned.substring(300, 400);
    console.log(`[GEMINI TEXT] 🔧 Text around 300-400 before fixes:`, beforeDecimalFix);
    
    // First, fix the most common case: "5." -> "5.0"
    cleaned = cleaned.replace(/(\d+\.)(?!\d)/g, '$10');
    
    // Fix specific patterns that commonly appear in JSON
    cleaned = cleaned.replace(/(\d+\.)\s*([",}\]\s])/g, '$10$2');
    cleaned = cleaned.replace(/(\d+\.)\s*$/g, '$10');
    
    // More aggressive pattern - any number followed by . and then a non-digit
    cleaned = cleaned.replace(/(\d+\.)([^0-9])/g, '$10$2');
    
    // Extra safety: fix any remaining standalone periods after numbers
    cleaned = cleaned.replace(/(\d)\.(\s*[^0-9])/g, '$1.0$2');
    
    // Additional comprehensive fix for fractional numbers
    // Fix patterns like "4.," -> "4.0,"
    cleaned = cleaned.replace(/(\d+\.)([,}\]\s])/g, '$10$2');
    
    // Fix patterns where decimal is at end of string
    cleaned = cleaned.replace(/(\d+\.)$/, '$10');
    
    // Fix patterns where decimal is followed by whitespace and special chars
    cleaned = cleaned.replace(/(\d+\.)\s*([,}\]\n\r])/g, '$10$2');
    
    // Final safety net: look for any digit followed by period not followed by digit
    cleaned = cleaned.replace(/(\d)\.(?!\d)/g, '$1.0');
    
    // Ultra-specific fix for the recurring issue at position ~334
    // Look for patterns like "fat": 4.} or "fat": 4." and fix them
    console.log(`[GEMINI TEXT] 🔧 Before ultra-specific fixes`);
    const beforeUltraFixes = cleaned.substring(300, 400);
    console.log(`[GEMINI TEXT] 🔧 Text sample before ultra-fixes:`, beforeUltraFixes);
    
    // Using function replacements for more reliable decimal fixing
    cleaned = cleaned.replace(/"fat":\s*(\d+\.)([^0-9])/g, (match, digits, following) => `"fat": ${digits}0${following}`);
    cleaned = cleaned.replace(/"protein":\s*(\d+\.)([^0-9])/g, (match, digits, following) => `"protein": ${digits}0${following}`);
    cleaned = cleaned.replace(/"carbs":\s*(\d+\.)([^0-9])/g, (match, digits, following) => `"carbs": ${digits}0${following}`);
    cleaned = cleaned.replace(/"calories":\s*(\d+\.)([^0-9])/g, (match, digits, following) => `"calories": ${digits}0${following}`);
    
    // Even more specific: catch patterns like 4."} and other malformed decimals
    cleaned = cleaned.replace(/(\d+\.)"/g, '$10');
    cleaned = cleaned.replace(/(\d+\.)\}/g, '$10}');
    cleaned = cleaned.replace(/(\d+\.),/g, '$10,');
    cleaned = cleaned.replace(/(\d+\.)\]/g, '$10]');
    cleaned = cleaned.replace(/(\d+\.)\s/g, '$10 ');
    
    // More comprehensive decimal fixes - handle any non-digit after decimal
    cleaned = cleaned.replace(/(\d+\.)([^0-9])/g, (match, digits, following) => {
      console.log(`[GEMINI TEXT] 🔧 Fixed decimal: "${match}" -> "${digits}0${following}"`);
      return `${digits}0${following}`;
    });
    
    // Specific fix for the position 334 error pattern - "fat": 4."
    cleaned = cleaned.replace(/"fat":\s*(\d+\.)"/g, (match, digits) => {
      console.log(`[GEMINI TEXT] 🔧 Fixed fat decimal at end: "${match}" -> "fat": ${digits}0"`);
      return `"fat": ${digits}0`;
    });
    
    // Handle any field ending with decimal and quote
    cleaned = cleaned.replace(/("[\w_]+"):\s*(\d+\.)"/g, (match, field, digits) => {
      console.log(`[GEMINI TEXT] 🔧 Fixed field decimal quote: "${match}" -> ${field}: ${digits}0"`);
      return `${field}: ${digits}0`;
    });
    
    // General pattern for any numeric field ending with period
    cleaned = cleaned.replace(/("[\w_]+"):\s*(\d+\.)([^0-9])/g, (match, field, digits, following) => `${field}: ${digits}0${following}`);
    
    const afterUltraFixes = cleaned.substring(300, 400);
    console.log(`[GEMINI TEXT] 🔧 Text sample after ultra-fixes:`, afterUltraFixes);
    
    // Add detailed character analysis around common error positions
    [330, 334, 335, 340].forEach(pos => {
      if (pos < cleaned.length) {
        const start = Math.max(0, pos - 10);
        const end = Math.min(cleaned.length, pos + 10);
        const segment = cleaned.substring(start, end);
        const charAtPos = cleaned.charAt(pos);
        console.log(`[GEMINI TEXT] 🔍 Position ${pos}: char='${charAtPos}' (${charAtPos.charCodeAt(0)}) context: "${segment}"`);
      }
    });
    
    // Log the result after all decimal fixes
    const afterDecimalFix = cleaned.substring(300, 400);
    console.log(`[GEMINI TEXT] 🔧 Text around 300-400 after fixes:`, afterDecimalFix);
    
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
    
    // Check for truncated decimal numbers that would cause parsing errors
    const truncatedDecimals = trimmed.match(/\d+\.\s*[",}\]]/g);
    if (truncatedDecimals) {
      return { valid: false, error: `Contains truncated decimal numbers: ${truncatedDecimals.slice(0, 3).join(', ')}` };
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
  parseJsonWithFallbacks(text, context = 'unknown', userProfile = null) {
    console.log(`[GEMINI TEXT] Attempting to parse JSON for ${context}`);
    console.log(`[GEMINI TEXT] Raw text length: ${text.length}`);

    // Enhanced preview logging to debug JSON issues
    const preview = text.replace(/\s+/g, ' ');
    console.log(`[GEMINI TEXT] Enhanced cleaned JSON preview:`, preview.substring(0, 500) + '...');
    
    // Debug specific positions where errors occur
    if (preview.length > 350) {
      console.log(`[GEMINI TEXT] Characters around position 334:`, preview.substring(320, 350));
    }

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
    
    // Strategy 5: Try to fix truncated JSON with enhanced recovery
    try {
      const partialMatch = text.match(/\{[\s\S]*$/);
      if (partialMatch) {
        console.log(`[GEMINI TEXT] 🔧 Attempting to fix truncated JSON for ${context}`);
        let partialJson = partialMatch[0];
        
        // Enhanced truncation fixing for workout context
        if (context === 'workout') {
          // Fix common truncation patterns with better detection
          if (!partialJson.includes('"plan_name"')) {
            partialJson = partialJson.replace(/^\{/, '{"plan_name": "Generated Workout Plan",');
          }

          // Enhanced weekly_schedule fixing
          const weeklyScheduleMatch = partialJson.match(/"weekly_?schedule":?\s*\[/);
          if (weeklyScheduleMatch) {
            const scheduleStart = weeklyScheduleMatch.index;
            const remainingText = partialJson.substring(scheduleStart);

            // If array is started but not closed, try to close it properly
            if (!remainingText.includes(']')) {
              // Look for the last complete session or close the array
              const lastBrace = partialJson.lastIndexOf('}');
              if (lastBrace > scheduleStart) {
                partialJson = partialJson.substring(0, lastBrace + 1) + ']}';
              } else {
                partialJson = partialJson.replace(/,\s*$/, '') + ']}';
              }
            }
          } else {
            // Add missing weekly_schedule if not present
            partialJson = partialJson.replace(/,\s*$/, ',"weekly_schedule": []');
          }

          // Fix incomplete exercise arrays within sessions with better detection
          partialJson = partialJson.replace(/"exercises":\s*\[\s*$/g, '"exercises": []');
          partialJson = partialJson.replace(/"warm_up":\s*\[\s*$/g, '"warm_up": []');
          partialJson = partialJson.replace(/"main_workout":\s*\[\s*$/g, '"main_workout": []');
          partialJson = partialJson.replace(/"cool_down":\s*\[\s*$/g, '"cool_down": []');

          // Enhanced sessions_per_week detection and insertion
          if (!partialJson.includes('"sessions_per_week"')) {
            // Try to infer from the text or use intelligent default
            const sessionCount = (partialJson.match(/"day":\s*\d+/g) || []).length;
            const defaultSessions = Math.max(3, Math.min(sessionCount, 5));
            partialJson = partialJson.replace(/,\s*$/, `,"sessions_per_week": ${defaultSessions}`);
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

        // Enhanced brace balancing
        const openBraces = (partialJson.match(/\{/g) || []).length;
        const closeBraces = (partialJson.match(/\}/g) || []).length;

        if (openBraces > closeBraces) {
          partialJson += '}'.repeat(openBraces - closeBraces);
        }
        
        // Ensure it ends with }
        if (!partialJson.endsWith('}')) {
          partialJson += '}';
        }
        
        console.log(`[GEMINI TEXT] 🔧 Attempting to parse fixed JSON for ${context}:`, partialJson.substring(0, 200) + '...');

        // Validate fixed JSON with enhanced validation
        const fixedValidation = this.validateJsonStructure(partialJson);
        if (!fixedValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Fixed JSON validation failed:`, fixedValidation.error);

          // Try more aggressive cleaning for severely malformed JSON
          if (context === 'workout') {
            partialJson = this.attemptAggressiveJsonRepair(partialJson);
          }
        }

        const cleaned = this.cleanJsonString(partialJson);
        const parsed = JSON.parse(cleaned);
        console.log(`[GEMINI TEXT] ✅ Truncated JSON fix successful for ${context}`);
        return parsed;
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ Truncated JSON fix failed for ${context}:`, error.message);
    }
    
    // Strategy 6: Enhanced workout JSON reconstruction
    if (context === 'workout') {
      try {
        console.log(`[GEMINI TEXT] 🔧 Attempting enhanced workout JSON reconstruction`);
        
        // Try to extract key workout information even from malformed JSON
        const planNameMatch = text.match(/"plan_name":\s*"([^"]+)"/);
        const planName = planNameMatch ? planNameMatch[1] : "Generated Workout Plan";
        
        const sessionsPerWeekMatch = text.match(/"sessions_per_week":\s*(\d+)/);
        const sessionsPerWeek = sessionsPerWeekMatch ? parseInt(sessionsPerWeekMatch[1]) : 4;
        
        const workoutSessions = this.extractWorkoutSessions(text);
        if (workoutSessions && workoutSessions.length > 0) {
          console.log(`[GEMINI TEXT] ✅ Successfully extracted ${workoutSessions.length} workout sessions`);
          
          // Reconstruct a valid workout plan JSON
          const reconstructedPlan = {
            plan_name: planName,
            name: planName,
            sessions_per_week: sessionsPerWeek,
            training_level: "intermediate",
            primary_goal: "muscle_gain",
            mesocycle_length_weeks: 8,
            estimated_time_per_session: "45-60 min",
            weekly_schedule: workoutSessions,
            weeklySchedule: workoutSessions,
            status: "active",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source: "gemini_reconstructed"
          };
          
          console.log(`[GEMINI TEXT] ✅ Successfully reconstructed workout plan: ${planName}`);
          return reconstructedPlan;
        }
      } catch (extractError) {
        console.log(`[GEMINI TEXT] ❌ Workout session extraction failed:`, extractError.message);
      }
    }
    
    // Strategy 7: Last resort - try to extract workout sessions from raw text, then create minimal JSON
    console.log(`[GEMINI TEXT] 🚨 All parsing strategies failed for ${context}, attempting to extract workout sessions from raw text`);
    
    if (context === 'workout') {
      // Try to extract workout sessions from the malformed JSON text
      console.log(`[GEMINI TEXT] 🔍 Attempting to extract workout sessions from malformed JSON text`);
      const extractedSessions = this.extractWorkoutSessions(text);
      
      // Use user profile data for better fallback if available
      const fitnessLevel = userProfile?.training_level || userProfile?.fitnessLevel || 'intermediate';
      const primaryGoal = userProfile?.primary_goal || userProfile?.primaryGoal || 'general_fitness';
      const planName = extractedSessions.length > 0 ? 
        `AI-Generated ${fitnessLevel} ${primaryGoal} Plan` : 
        `Personalized ${fitnessLevel} ${primaryGoal} Plan`;
      
      console.log(`[GEMINI TEXT] 📊 Created minimal JSON with ${extractedSessions.length} extracted sessions`);
      
      return {
        plan_name: planName,
        duration_weeks: 4,
        sessions_per_week: 4, // Better default than 3 for most users
        target_level: fitnessLevel,
        primary_goal: primaryGoal,
        weekly_schedule: extractedSessions,
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


