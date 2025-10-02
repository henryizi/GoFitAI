
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
        maxOutputTokens: 16000
      }
    });
    } catch (error) {
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
          maxOutputTokens: 16000
        }
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record API usage and rotate if needed
   */
  recordUsage() {
    const usage = this.apiKeyManager.recordUsage(this.currentKey);

    if (usage.remaining <= 2) {
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
      const prompt = this.createRecipePrompt(mealType, targets, ingredients, strict);
      const result = await this.generateContentWithRetry([prompt]);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length < 10) {
        throw new Error('Invalid response from Gemini');
      }

      let recipeData;
      try {
        recipeData = this.parseJsonWithFallbacks(text, 'recipe');
      } catch (parseError) {
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
      throw new Error(`Recipe generation failed: ${error.message}`);
    }
  }

  /**
   * Creates a fallback recipe when JSON parsing fails
   */
  createFallbackRecipe(text, mealType, targets, ingredients) {
    
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
      const startTime = Date.now();
      const prompt = this.createWorkoutPrompt(userProfile, preferences);
      
      const maxRetries = 1;
      const result = await this.generateContentWithRetry([prompt], maxRetries);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response using enhanced parsing with fallbacks
      let workoutData;
      try {
        workoutData = this.parseJsonWithFallbacks(text, 'workout', userProfile);
      } catch (parseError) {
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
    // SIMPLIFIED: Only use the 4 core parameters from Supabase profile table
    const fitnessLevel = userProfile.fitnessLevel || userProfile.training_level || 'intermediate';
    const primaryGoal = userProfile.primaryGoal || userProfile.primary_goal || 'general_fitness';
    const gender = (userProfile.gender || 'male').toLowerCase();

    // Use workout frequency from userProfile (support both camelCase and snake_case)
    const workoutFreq = userProfile.workoutFrequency || userProfile.workout_frequency || '4_5';
    let daysPerWeek;
    
    // Convert workout frequency format to number of days
    if (workoutFreq === '2_3') {
      daysPerWeek = 3; // Middle of 2-3 range
    } else if (workoutFreq === '4_5') {
      daysPerWeek = 4; // Middle of 4-5 range
    } else if (workoutFreq === '6') {
      daysPerWeek = 6;
    } else {
      daysPerWeek = 4; // Default fallback
    }
    
    const sessionDuration = 60; // Fixed 60 minute sessions
    
    // Use basic equipment defaults (can be customized later)
    const equipment = ['dumbbells', 'barbell', 'resistance_bands', 'bodyweight'];
    
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
    // Equipment constraints - use the standard equipment list
    const equipmentConstraints = `EQUIPMENT AVAILABLE: ${equipment.join(', ')}. Create workouts using these equipment options.`;

    // Exercise pools categorized by muscle groups and equipment
    const exercisesByType = {
      push: ['Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Dips', 'Push-ups', 'Cable Chest Fly', 'Tricep Pushdown', 'Close-grip Bench Press'],
      pull: ['Pull-ups', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row', 'Face Pulls', 'Bicep Curls', 'Hammer Curls', 'Cable Row'],
      legs: ['Back Squat', 'Front Squat', 'Romanian Deadlift', 'Leg Press', 'Lunges', 'Leg Curl', 'Leg Extension', 'Calf Raises'],
      core: ['Plank', 'Hanging Leg Raises', 'Ab Wheel', 'Russian Twists', 'Dead Bug', 'Bicycle Crunches', 'Mountain Climbers']
    };

    return `You are an expert fitness coach. Create a comprehensive ${daysPerWeek}-day workout plan.

USER PROFILE (from onboarding):
- Gender: ${gender}
- Fitness Level: ${fitnessLevel}
- Primary Goal: ${primaryGoal}
- Workout Frequency: ${daysPerWeek} days per week (${workoutFreq})

SESSION DETAILS:
- Session Duration: ${sessionDuration} minutes
- Equipment Available: ${equipment.join(', ')}

WORKOUT SPLIT: ${workoutSplit}

TRAINING PARAMETERS FOR ${fitnessLevel.toUpperCase()} LEVEL:
- Sets per exercise: ${levelConfig.sets}
- Rep range: ${levelConfig.reps}
- Rest periods: ${levelConfig.restPeriods}
- Intensity: ${levelConfig.intensity}
- Focus: ${levelConfig.focus}
- Progression: ${levelConfig.progression}

GOAL-SPECIFIC PARAMETERS FOR ${primaryGoal.toUpperCase()}:
- Training focus: ${goalConfig.focus}
- Rep range: ${goalConfig.repRange}
- Rest time: ${goalConfig.restTime}
- Exercise selection: ${goalConfig.exercises}
- Training volume: ${goalConfig.volume}
- Nutrition emphasis: ${goalConfig.nutrition}

EXERCISE EXAMPLES BY CATEGORY:
Push Exercises: ${exercisesByType.push.join(', ')}
Pull Exercises: ${exercisesByType.pull.join(', ')}
Leg Exercises: ${exercisesByType.legs.join(', ')}
Core Exercises: ${exercisesByType.core.join(', ')}

${equipmentConstraints}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no markdown, no explanations, no code blocks
2. Create exactly ${daysPerWeek} workout sessions in the weekly_schedule array
3. Each workout session MUST include:
   - At least 1-2 warm_up exercises (5-10 min cardio/dynamic stretches)
   - 4-6 main_workout exercises (compound and isolation movements)
   - At least 1-2 cool_down exercises (5-10 min stretching)
4. Every exercise MUST have: exercise name, sets, reps, rest_seconds, and instructions
5. Use only equipment available to the user: ${Array.isArray(equipment) ? equipment.join(', ') : 'bodyweight and basic equipment'}
6. Vary exercises across days - don't repeat the same exercise on consecutive days
7. Follow the workout split: ${workoutSplit}
8. Adjust difficulty based on ${fitnessLevel} level
9. Align exercises with ${primaryGoal} goal
10. Include proper warm-up, main workout, and cool-down for EVERY session

REQUIRED JSON STRUCTURE:
{
  "plan_name": "${fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1)} ${primaryGoal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Plan",
  "duration_weeks": 4,
  "sessions_per_week": ${daysPerWeek},
  "target_level": "${fitnessLevel}",
  "primary_goal": "${primaryGoal}",
  "workout_split": "${workoutSplit}",
  "weekly_schedule": [
    {
      "day": 1,
      "day_name": "Day 1",
      "focus": "Push (Chest, Shoulders, Triceps)",
      "workout_type": "Strength Training",
      "duration_minutes": ${sessionDuration},
      "warm_up": [
        {
          "exercise": "Light Cardio",
          "duration": "5 minutes",
          "instructions": "Treadmill, bike, or jumping jacks at easy pace to elevate heart rate"
        },
        {
          "exercise": "Arm Circles",
          "duration": "2 minutes",
          "instructions": "Dynamic shoulder mobility - forward and backward circles"
        }
      ],
      "main_workout": [
        {
          "exercise": "Bench Press",
          "sets": ${fitnessLevel === 'beginner' ? 3 : fitnessLevel === 'advanced' ? 5 : 4},
          "reps": "${goalConfig.repRange}",
          "rest_seconds": ${goalConfig.restTime.includes('minutes') ? 120 : 60},
          "instructions": "Lower bar to chest, press explosively. Keep core tight and feet flat.",
          "modifications": "${fitnessLevel === 'beginner' ? 'Start with lighter weight, use spotter' : 'Add progressive overload weekly'}"
        },
        {
          "exercise": "Incline Dumbbell Press",
          "sets": ${fitnessLevel === 'beginner' ? 3 : 4},
          "reps": "${goalConfig.repRange}",
          "rest_seconds": ${goalConfig.restTime.includes('minutes') ? 120 : 60},
          "instructions": "Press dumbbells at 30-45 degree angle. Control the descent.",
          "modifications": "Adjust bench angle for comfort"
        },
        {
          "exercise": "Overhead Press",
          "sets": ${fitnessLevel === 'beginner' ? 3 : 4},
          "reps": "${goalConfig.repRange}",
          "rest_seconds": 60,
          "instructions": "Press weight overhead from shoulder height. Keep core braced.",
          "modifications": "Use dumbbells or barbell based on equipment"
        },
        {
          "exercise": "Tricep Pushdown",
          "sets": 3,
          "reps": "${goalConfig.repRange}",
          "rest_seconds": 45,
          "instructions": "Keep elbows tucked, extend arms fully. Control the return.",
          "modifications": "Use rope, bar, or resistance band attachment"
        }
      ],
      "cool_down": [
        {
          "exercise": "Chest Stretch",
          "duration": "3 minutes",
          "instructions": "Doorway stretch - hold 30 seconds each side, repeat 3 times"
        },
        {
          "exercise": "Shoulder Stretch",
          "duration": "2 minutes",
          "instructions": "Cross-body arm stretch - hold 30 seconds each side"
        }
      ]
    }
  ],
  "progression_plan": {
    "week_1": "Establish baseline - focus on form and technique",
    "week_2": "Increase weight by 5% if form is solid",
    "week_3": "Increase weight by another 5% or add 1-2 reps",
    "week_4": "Deload week - reduce volume by 30% for recovery",
    "mesocycle_weeks": 4,
    "progression_guidance": "Progressive overload through weight, reps, or sets"
  },
  "nutrition_tips": [
    "${goalConfig.nutrition}",
    "Stay hydrated - drink water before, during, and after workouts",
    "Eat protein within 2 hours post-workout for muscle recovery"
  ],
  "safety_guidelines": [
    "Always warm up for 5-10 minutes before training",
    "Use proper form over heavy weight",
    "Rest 48 hours between training the same muscle groups",
    "Stop immediately if you feel sharp pain",
    "Get adequate sleep (7-9 hours) for recovery"
  ],
  "equipment_needed": ${JSON.stringify(equipment)},
  "estimated_results": "With consistent training and proper nutrition, expect visible progress in 4-6 weeks. Results vary by individual commitment.",
  "estimated_time_per_session": "${sessionDuration} minutes"
}

IMPORTANT: Create ${daysPerWeek} unique workout days with varied exercises. Each day must have complete warm_up (1-2 exercises), main_workout (4-6 exercises), and cool_down (1-2 exercises) arrays. DO NOT leave any arrays empty. Return ONLY the JSON object, starting with { and ending with }.`;
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
    
    try {
      // For simple text prompts, Gemini expects either a string or array format
      // Let's use the string format for simplicity
      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const text = response.text();
      
      
      return text;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Try fallback models when primary model fails
   */
  async tryFallbackModel(content, currentError) {
    if (!this.modelFallbacks || this.modelFallbacks.length === 0) {
      return null;
    }

    
    for (const fallbackModel of this.modelFallbacks) {
      try {
        
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
            // Update current model to working one
            this.model = fallbackModelInstance;
            this.modelName = fallbackModel;
            return result;
          }
        }
      } catch (fallbackError) {
      }
    }
    
    return null;
  }

  /**
   * Generates content with retry logic for 503 Service Unavailable errors
   */
  async generateContentWithRetry(content, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout to prevent hanging requests
        const contentString = Array.isArray(content) ? content.join(' ') : content;
        const isWorkoutRequest = contentString.includes('workout plan') || contentString.includes('personalized workout') || contentString.includes('CLIENT PROFILE');
        const isComplexRequest = contentString.includes('meal plan') || contentString.includes('recipe') ||
                                contentString.includes('exercise') || 
                                contentString.includes('nutrition') || contentString.includes('fitness') || 
                                contentString.length > 2000;
        // Workout plans need more time due to complexity - use 120 seconds
        // Other complex requests use 60 seconds, simple requests use 20 seconds
        const timeoutDuration = isWorkoutRequest ? 120000 : (isComplexRequest ? 60000 : 20000);

        if (attempt > 1) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 2), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Gemini request timeout after ${timeoutDuration/1000}s`)), timeoutDuration);
        });
        
        const result = await Promise.race([
          this.model.generateContent(content),
          timeoutPromise
        ]);
        
        if (!result || !result.response) {
          throw new Error('Invalid response structure from Gemini');
        }
        
        const response = await result.response;
        const text = response.text();
        
        if (!text || text.trim().length === 0) {
          if (attempt === 1) {
            throw new Error('Empty response from Gemini - retryable');
          } else {
            throw new Error('Empty response from Gemini - non-retryable');
          }
        }
        
        return result;
        
      } catch (error) {
        // Try fallback models on first attempt if it's a model-specific error
        if (attempt === 1 && (
          error.message.includes('location is not supported') || 
          error.message.includes('not found') ||
          error.message.includes('not supported for generateContent')
        )) {
          const fallbackResult = await this.tryFallbackModel(content, error);
          if (fallbackResult) {
            return fallbackResult;
          }
        }

        const isRetryable = error.message.includes('503') || 
                           error.message.includes('Service Unavailable') ||
                           error.message.includes('overloaded') ||
                           error.message.includes('quota') ||
                           error.message.includes('rate limit') ||
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
        
        // If network error on first attempt, skip retries to fail fast
        if (isNetworkError && attempt === 1) {
          throw error;
        }
        
        if (isRetryable && attempt < maxRetries) {
          const baseDelay = 1000;
          const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 500;
          const delay = Math.min(exponentialDelay + jitter, 8000);

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
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
        
        // Try to parse this individual session
        const cleanedSession = this.cleanJsonString(sessionText);
        const session = JSON.parse(cleanedSession);
        
        if (session.focus) {
          sessions.push(session);
        }
      } catch (sessionError) {
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
    
    return sessions;
  }

  /**
   * Attempt aggressive JSON repair for severely malformed responses
   */
  attemptAggressiveJsonRepair(malformedJson) {

    // Try to extract all complete workout sessions first
    const sessionMatches = malformedJson.match(/\{\s*"day":\s*\d+[^}]*"focus":\s*"[^"]*"[^}]*\}/g);
    if (sessionMatches && sessionMatches.length > 0) {

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
    const beforeDecimalFix = cleaned.substring(300, 400);
    
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
    const beforeUltraFixes = cleaned.substring(300, 400);
    
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
      return `${digits}0${following}`;
    });
    
    // Specific fix for the position 334 error pattern - "fat": 4."
    cleaned = cleaned.replace(/"fat":\s*(\d+\.)"/g, (match, digits) => {
      return `"fat": ${digits}0`;
    });
    
    // Handle any field ending with decimal and quote
    cleaned = cleaned.replace(/("[\w_]+"):\s*(\d+\.)"/g, (match, field, digits) => {
      return `${field}: ${digits}0`;
    });
    
    // General pattern for any numeric field ending with period
    cleaned = cleaned.replace(/("[\w_]+"):\s*(\d+\.)([^0-9])/g, (match, field, digits, following) => `${field}: ${digits}0${following}`);
    
    const afterUltraFixes = cleaned.substring(300, 400);
    
    // Add detailed character analysis around common error positions
    [330, 334, 335, 340].forEach(pos => {
      if (pos < cleaned.length) {
        const start = Math.max(0, pos - 10);
        const end = Math.min(cleaned.length, pos + 10);
        const segment = cleaned.substring(start, end);
        const charAtPos = cleaned.charAt(pos);
      }
    });
    
    // Log the result after all decimal fixes
    const afterDecimalFix = cleaned.substring(300, 400);
    
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
    const validation = this.validateJsonStructure(text);
    if (!validation.valid) {
    }

    // Strategy 1: Direct JSON parsing
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (error) {
      // Continue to fallback strategies
    }
    
    // Strategy 2: Extract from markdown code blocks
    try {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        const cleaned = this.cleanJsonString(codeBlockMatch[1].trim());
        return JSON.parse(cleaned);
      }
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 3: Find JSON object in text
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cleaned = this.cleanJsonString(jsonMatch[0]);
        return JSON.parse(cleaned);
      }
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 4: Find JSON array in text
    try {
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const cleaned = this.cleanJsonString(arrayMatch[0]);
        return JSON.parse(cleaned);
      }
    } catch (error) {
      // Continue to next strategy
    }
    
    // Strategy 5: Try to fix truncated JSON with enhanced recovery
    try {
      const partialMatch = text.match(/\{[\s\S]*$/);
      if (partialMatch) {
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
        

        // Validate fixed JSON with enhanced validation
        const fixedValidation = this.validateJsonStructure(partialJson);
        if (!fixedValidation.valid) {

          // Try more aggressive cleaning for severely malformed JSON
          if (context === 'workout') {
            partialJson = this.attemptAggressiveJsonRepair(partialJson);
          }
        }

        const cleaned = this.cleanJsonString(partialJson);
        const parsed = JSON.parse(cleaned);
        return parsed;
      }
    } catch (error) {
    }
    
    // Strategy 6: Enhanced workout JSON reconstruction
    if (context === 'workout') {
      try {
        
        // Try to extract key workout information even from malformed JSON
        const planNameMatch = text.match(/"plan_name":\s*"([^"]+)"/);
        const planName = planNameMatch ? planNameMatch[1] : "Generated Workout Plan";
        
        const sessionsPerWeekMatch = text.match(/"sessions_per_week":\s*(\d+)/);
        const sessionsPerWeek = sessionsPerWeekMatch ? parseInt(sessionsPerWeekMatch[1]) : 4;
        
        const workoutSessions = this.extractWorkoutSessions(text);
        if (workoutSessions && workoutSessions.length > 0) {
          
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
          
          return reconstructedPlan;
        }
      } catch (extractError) {
      }
    }
    
    // Strategy 7: Last resort - try to extract workout sessions from raw text, then create minimal JSON
    
    if (context === 'workout') {
      // Try to extract workout sessions from the malformed JSON text
      const extractedSessions = this.extractWorkoutSessions(text);
      
      // Use user profile data for better fallback if available
      const fitnessLevel = userProfile?.training_level || userProfile?.fitnessLevel || 'intermediate';
      const primaryGoal = userProfile?.primary_goal || userProfile?.primaryGoal || 'general_fitness';
      const planName = extractedSessions.length > 0 ? 
        `AI-Generated ${fitnessLevel} ${primaryGoal} Plan` : 
        `Personalized ${fitnessLevel} ${primaryGoal} Plan`;
      
      
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


