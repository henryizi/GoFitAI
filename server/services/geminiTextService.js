
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
      
      // Model fallback chain - prefer stable models over preview/experimental
      const primaryModel = process.env.GEMINI_MODEL || process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
      this.modelName = primaryModel;
      
      // Define fallback models in order of preference
      this.modelFallbackChain = [
        primaryModel,
        'gemini-2.0-flash-001',  // Stable Gemini 2.0
        'gemini-flash-latest'     // Latest stable flash
      ];
      
      this.currentModelIndex = 0;
      
    this.model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 16384  // Increased for comprehensive workout plans
      }
    });
    
      console.log('[GEMINI TEXT] Using key with best quota availability');
      console.log('[GEMINI TEXT] Primary model:', this.modelName);
      console.log('[GEMINI TEXT] Fallback chain:', this.modelFallbackChain.join(' → '));
    } catch (error) {
      console.error('[GEMINI TEXT] Failed to initialize with best key:', error.message);
      throw error;
    }
  }
  
  /**
   * Switch to next available model in fallback chain
   */
  switchToFallbackModel() {
    if (this.currentModelIndex < this.modelFallbackChain.length - 1) {
      this.currentModelIndex++;
      const newModel = this.modelFallbackChain[this.currentModelIndex];
      this.modelName = newModel;
      
      this.model = this.genAI.getGenerativeModel({
        model: newModel,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 16384
        }
      });
      
      console.log(`[GEMINI TEXT] 🔄 Switched to fallback model: ${newModel}`);
      return true;
    }
    return false;
  }

  /**
   * Rotate to next available API key
   */
  rotateToNextKey() {
    try {
      const nextKey = this.apiKeyManager.getNextKey();
      this.currentKey = nextKey;
      this.genAI = new GoogleGenerativeAI(nextKey);
      
      // Reset to primary model when rotating keys
      this.currentModelIndex = 0;
      this.modelName = this.modelFallbackChain[0];
      
      this.model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 16384  // Increased for comprehensive workout plans
        }
      });

      console.log('[GEMINI TEXT] Rotated to next API key');
      console.log('[GEMINI TEXT] Reset to primary model:', this.modelName);
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
    // Try with model fallback chain if primary model fails with 503
    let lastError = null;
    
    for (let modelAttempt = 0; modelAttempt < this.modelFallbackChain.length; modelAttempt++) {
    try {
        console.log(`[GEMINI TEXT] Generating recipe for: ${mealType} (Model: ${this.modelName}, attempt ${modelAttempt + 1}/${this.modelFallbackChain.length})`);
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
          model: this.modelName,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
        lastError = error;
        console.error(`[GEMINI TEXT] Recipe generation failed with ${this.modelName}:`, error.message);
        
        // Check if it's a 503 overload error
        const is503 = error.message && (
          error.message.includes('503') || 
          error.message.includes('overloaded') ||
          error.message.includes('Service Unavailable')
        );
        
        // If 503 and we have more models to try, switch to fallback model
        if (is503 && modelAttempt < this.modelFallbackChain.length - 1) {
          console.log(`[GEMINI TEXT] Model ${this.modelName} is overloaded, trying fallback model...`);
          this.switchToFallbackModel();
          continue;
        }
        
        // Otherwise, throw the error
        break;
      }
    }
    
    // If we get here, all models failed
    throw new Error(`Recipe generation failed after trying ${this.modelFallbackChain.length} models: ${lastError.message}`);
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
   * @param {string} prompt - The workout generation prompt
   * @returns {Promise<Object>} Generated workout plan
   */
  async generateWorkoutPlan(prompt) {
    // Try with model fallback chain if primary model fails with 503
    let lastModelError = null;
    
    for (let modelAttempt = 0; modelAttempt < this.modelFallbackChain.length; modelAttempt++) {
      try {
        console.log('[GEMINI TEXT] ════════════════════════════════════════════════');
        console.log(`[GEMINI TEXT] 🚀 DEPLOYMENT VERSION: v1.0.2 - Model fallback enabled`);
        console.log('[GEMINI TEXT] ════════════════════════════════════════════════');
        console.log(`[GEMINI TEXT] Generating workout plan (Model: ${this.modelName}, attempt ${modelAttempt + 1}/${this.modelFallbackChain.length})`);
        console.log('[GEMINI TEXT] User level: N/A (using prompt-based generation)');
        console.log('[GEMINI TEXT] Goal: N/A (using prompt-based generation)');

      const startTime = Date.now();

        console.log('[GEMINI TEXT] Using dedicated workout model with extended timeout (240s)');
        console.log('[GEMINI TEXT] Prompt length:', prompt.length);

        // 🚀 OPTIMIZED: Use dedicated workout model configuration for faster generation
        const workoutModel = this.genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            temperature: 0.5,  // Lower temperature for faster, more consistent responses
            topP: 0.9,
            maxOutputTokens: 12000,  // Sufficient for workout plans without excessive detail
            candidateCount: 1  // Only generate one candidate for speed
          }
        });

        let lastError;
        const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[GEMINI TEXT] Attempt ${attempt}/${maxRetries}`);
          console.log('[GEMINI TEXT] Using optimized workout model config');
          console.log('[GEMINI TEXT] About to call workoutModel.generateContent');

          // Create timeout promise - increased to 240 seconds for complex workouts
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Gemini request timeout after 240 seconds')), 240000);
          });

          // Race between generation and timeout
          const result = await Promise.race([
            workoutModel.generateContent(prompt),
            timeoutPromise
          ]);

          console.log('[GEMINI TEXT] Model.generateContent completed successfully');
          console.log('[GEMINI TEXT] ✅ Success on attempt', attempt);

      const response = await result.response;
          console.log('[GEMINI TEXT] Response object:', !!response);

      const text = response.text();
          console.log('[GEMINI TEXT] Response text:', !!text, 'length:', text?.length || 0);
          console.log('[GEMINI TEXT] Raw response from Gemini (first 1000 chars):');
          console.log(text.substring(0, 1000));

      const generationTime = Date.now() - startTime;
      console.log(`[GEMINI TEXT] Workout plan generated in ${generationTime}ms`);

      // Parse the JSON response using enhanced parsing with fallbacks
      let workoutData;
      try {
        console.log('[GEMINI TEXT] Raw response preview:', text.substring(0, 500));
        workoutData = this.parseJsonWithFallbacks(text, 'workout');
        console.log('[GEMINI TEXT] Successfully parsed workout data');
        console.log('[GEMINI TEXT] Plan name:', workoutData.plan_name);
      } catch (parseError) {
        console.error('[GEMINI TEXT] All JSON parsing strategies failed:', parseError.message);
        console.log('[GEMINI TEXT] Raw response for debugging:', text.substring(0, 1000));
        throw new Error('Failed to parse workout response');
      }

      // Validate and normalize the workout plan
      console.log('[GEMINI TEXT] Starting workout plan validation...');
      const validatedPlan = this.validateWorkoutPlan(workoutData);
      console.log('[GEMINI TEXT] ✅ Validated plan with name:', validatedPlan.plan_name);
      
      return {
        ...validatedPlan,
        source: 'gemini_text',
        generated_at: new Date().toISOString()
      };

    } catch (error) {
          console.log(`[GEMINI TEXT] Error in generateContentWithRetry attempt ${attempt}:`, error.message);
          console.log('[GEMINI TEXT] Error stack:', error.stack);
          console.log('[GEMINI TEXT] Error constructor:', error.constructor.name);
          
          lastError = error;
          
          if (attempt < maxRetries) {
            console.log('[GEMINI TEXT] ⚠️ Retryable error (attempt ' + attempt + '), retrying in 500ms...');
            console.log('[GEMINI TEXT] Error type:', error.constructor.name);
            console.log('[GEMINI TEXT] Error message:', error.message);
            console.log('[GEMINI TEXT] Network error detected:', error.message?.includes('fetch'));
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

        // If all retries failed
        console.error('[GEMINI TEXT] All retry attempts failed for this model');
        throw lastError || new Error('All retry attempts failed');

      } catch (error) {
        lastModelError = error;
        console.error(`[GEMINI TEXT] Workout plan generation failed with ${this.modelName}:`, error.message);
        
        // Check if it's a 503 overload error
        const is503 = error.message && (
          error.message.includes('503') || 
          error.message.includes('overloaded') ||
          error.message.includes('Service Unavailable')
        );
        
        // If 503 and we have more models to try, switch to fallback model
        if (is503 && modelAttempt < this.modelFallbackChain.length - 1) {
          console.log(`[GEMINI TEXT] Model ${this.modelName} is overloaded, trying fallback model...`);
          this.switchToFallbackModel();
          continue;
        }
        
        // Otherwise, throw the error
        break;
      }
    }
    
    // If we get here, all models failed
    throw new Error(`Workout plan generation failed after trying ${this.modelFallbackChain.length} models: ${lastModelError.message}`);
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
   * Generates content with retry logic for 503 Service Unavailable errors
   */
  async generateContentWithRetry(content, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GEMINI TEXT] Attempt ${attempt}/${maxRetries}`);
        
        // Add timeout to prevent hanging requests - reasonable timeout for AI generation
        // Complex requests need more time for AI to generate comprehensive content
        // Convert content to string for checking (content might be array or string)
        const contentStr = Array.isArray(content) ? content.join(' ') : String(content);
        const isComplexRequest = contentStr.includes('meal plan') || contentStr.includes('recipe') ||
                                contentStr.includes('workout plan') || contentStr.includes('exercise') ||
                                contentStr.includes('nutrition') || contentStr.includes('fitness') ||
                                contentStr.includes('personalized workout') || contentStr.includes('CLIENT PROFILE') ||
                                contentStr.length > 2000; // Workout plans are typically 2.5-6k chars
        // Use environment variables for timeout configuration with fallbacks
        const complexTimeout = parseInt(process.env.AI_COMPLEX_TIMEOUT) || parseInt(process.env.GEMINI_TIMEOUT_MS) || 300000;
        const simpleTimeout = parseInt(process.env.AI_REQUEST_TIMEOUT) || 180000;
        const timeoutDuration = isComplexRequest ? complexTimeout : simpleTimeout;
        console.log(`[GEMINI TEXT] Complex request detected: ${isComplexRequest}, timeout: ${timeoutDuration/1000}s`);
        console.log(`[GEMINI TEXT] 🚀 UPDATED TIMEOUT LOGIC - Force deployment refresh`);

        // Add exponential backoff delay for retries
        if (attempt > 1) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 2), 5000); // 1s, 2s, 4s max
          console.log(`[GEMINI TEXT] Applying exponential backoff delay: ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          
          // Quick connectivity check before retry
          try {
            console.log('[GEMINI TEXT] Testing connectivity to Google API...');
            const testResponse = await fetch('https://generativelanguage.googleapis.com/', { 
              method: 'HEAD', 
              timeout: 5000 
            });
            console.log(`[GEMINI TEXT] Connectivity test result: ${testResponse.status}`);
          } catch (connectError) {
            console.log(`[GEMINI TEXT] Connectivity test failed: ${connectError.message}`);
            // Continue anyway - the test might fail but the actual request might work
          }
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
        console.error('[GEMINI TEXT] Error in generateContentWithRetry attempt', attempt, ':', error.message);
        console.error('[GEMINI TEXT] Error stack:', error.stack);
        console.error('[GEMINI TEXT] Error constructor:', error.constructor.name);
        
        // Enhanced error logging for fetch failures
        if (error.message.includes('fetch failed')) {
          console.error('[GEMINI TEXT] Fetch failure details:', {
            cause: error.cause,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall
          });
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
                           error.message.includes('ECONNRESET') ||
                           error.message.includes('socket hang up') ||
                           error.message.includes('Gemini request timeout') ||
                           error.message.includes('Empty response from Gemini - retryable') ||
                           error.message.includes('Invalid response structure') ||
                           error.message.includes('30 seconds'); // Handle legacy timeout errors
        
        const isNetworkError = error.message.includes('fetch failed') || 
                             error.message.includes('ENOTFOUND') ||
                             error.message.includes('ECONNREFUSED') ||
                             error.message.includes('network');
        
        // For transient network errors, allow at least 2 retries before failing
        // Only fail fast if it's a persistent connection error (ENOTFOUND, ECONNREFUSED)
        const isPersistentNetworkError = error.message.includes('ENOTFOUND') || 
                                         error.message.includes('ECONNREFUSED');
        
        if (isPersistentNetworkError && attempt === 1) {
          console.log(`[GEMINI TEXT] ❌ Persistent network error detected, failing fast: ${error.message}`);
          throw error;
        }
        
        if (isRetryable && attempt < maxRetries) {
          // Exponential backoff with jitter to prevent thundering herd
          // For 503 Service Unavailable (model overloaded), use much longer delays
          const baseDelay = isServiceUnavailable ? 10000 : 1000; // 10s base for 503, 1s for others
          const exponentialDelay = baseDelay * Math.pow(2, attempt - 1); // 10s, 20s for 503; 1s, 2s for others
          const jitter = Math.random() * 2000; // Add up to 2s jitter
          const delay = Math.min(exponentialDelay + jitter, isServiceUnavailable ? 30000 : 8000); // Max 30s for 503, 8s for others

          console.log(`[GEMINI TEXT] ⚠️ Retryable error (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms...`);
          console.log(`[GEMINI TEXT] Error type:`, error.constructor.name);
          console.log(`[GEMINI TEXT] Error message:`, error.message);
          console.log(`[GEMINI TEXT] Service unavailable (503):`, isServiceUnavailable);
          console.log(`[GEMINI TEXT] Network error detected:`, isNetworkError);
          console.log(`[GEMINI TEXT] Backoff delay: ${Math.round(delay)}ms (exponential + jitter)`);
          console.log(`[GEMINI TEXT] 🚀 IMPROVED 503 HANDLING: Longer delays for overloaded service`);
          
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
      weekly_schedule: plan.weekly_schedule || plan.weeklySchedule || [],
      progression_plan: plan.progression_plan || plan.progression || {},
      nutrition_tips: plan.nutrition_tips || [],
      safety_guidelines: plan.safety_guidelines || [],
      equipment_needed: plan.equipment_needed || [],
      estimated_results: plan.estimated_results || plan.estimatedTimePerSession || "Results vary by individual commitment and consistency"
    };

    // Ensure weekly schedule has proper structure - PRESERVE ORIGINAL EXERCISES
    // Safety check: ensure weekly_schedule is an array before mapping
    if (!Array.isArray(validated.weekly_schedule)) {
      console.error('[GEMINI TEXT] ❌ weekly_schedule is not an array:', typeof validated.weekly_schedule);
      validated.weekly_schedule = [];
    }
    
    validated.weekly_schedule = validated.weekly_schedule.map(day => ({
      day: day.day || 1,
      day_name: day.day_name || day.focus || "Workout Day",
      focus: day.focus || day.day_name || "Training",
      workout_type: day.workout_type || "Training",
      duration_minutes: Math.max(day.duration_minutes || 45, 15),
      // PRESERVE ORIGINAL EXERCISES ARRAY - This is what Gemini returns!
      exercises: day.exercises || [],
      // Also preserve structured format if it exists
      warm_up: day.warm_up || [],
      main_workout: day.main_workout || [],
      cool_down: day.cool_down || []
    }));

    // 🚨 CRITICAL VALIDATION: Check if ALL workout days have empty exercises
    const workoutDays = validated.weekly_schedule.filter(day => 
      !day.day_name?.toLowerCase().includes('rest') && 
      day.workout_type?.toLowerCase() !== 'rest'
    );
    
    const emptyDaysCount = workoutDays.filter(day => {
      // Check both formats: exercises array format and warm_up/main_workout/cool_down format
      const hasExercisesArray = day.exercises && day.exercises.length > 0;
      const hasStructuredWorkout = (
        (day.warm_up && day.warm_up.length > 0) ||
        (day.main_workout && day.main_workout.length > 0) ||
        (day.cool_down && day.cool_down.length > 0)
      );
      
      // DEBUG: Log what we're finding for each day
      console.log(`[GEMINI TEXT] 🔍 Day "${day.day_name}" validation:`, {
        hasExercisesArray,
        exercisesCount: day.exercises?.length || 0,
        hasStructuredWorkout,
        warmUpCount: day.warm_up?.length || 0,
        mainWorkoutCount: day.main_workout?.length || 0,
        coolDownCount: day.cool_down?.length || 0
      });
      
      // Day is empty if it has neither format with exercises
      return !hasExercisesArray && !hasStructuredWorkout;
    }).length;

    // If more than half of workout days have no exercises, the plan is invalid
    if (workoutDays.length > 0 && emptyDaysCount / workoutDays.length > 0.5) {
      console.error('[GEMINI TEXT] ❌ VALIDATION FAILED: Most workout days have empty exercises');
      console.error('[GEMINI TEXT] Workout days:', workoutDays.length, 'Empty days:', emptyDaysCount);
      console.error('[GEMINI TEXT] Sample day structure:', JSON.stringify(workoutDays[0], null, 2));
      throw new Error('Gemini returned invalid workout plan with empty exercises - triggering fallback');
    }

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
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
      apiKeyConfigured: !!this.apiKey,
      capabilities: ['recipe_generation', 'workout_plans'],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Minimal JSON cleaning that only fixes the most basic issues
   */
  minimalJsonClean(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid JSON string provided');
    }

    let cleaned = jsonString.trim();
    
    // Only fix the most basic issues that are definitely wrong
    // Remove markdown code block markers
    cleaned = cleaned.replace(/^```\s*json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '');
    
    // Fix smart quotes (common AI issue)
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"');
    cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");
    
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing quotes around property names
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix the specific problematic pattern we're seeing: "Push:"Chest", Shoulders & Triceps"
    // This is a very targeted fix for the exact error pattern
    cleaned = cleaned.replace(/"Push:"Chest", Shoulders & Triceps"/g, '"Push: Chest, Shoulders & Triceps"');
    cleaned = cleaned.replace(/"Pull:"Back", Biceps & Rear Delts"/g, '"Pull: Back, Biceps & Rear Delts"');
    cleaned = cleaned.replace(/"Legs:"Quads", Hamstrings & Glutes"/g, '"Legs: Quads, Hamstrings & Glutes"');
    
    // More general fix for similar patterns
    cleaned = cleaned.replace(/"([^"]*):\"([^"]*)\",?\s*([^"]*)"(\s*[,}\]])/g, '"$1: $2, $3"$4');
    
    return cleaned;
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
    
    // Fix curly quotes (smart quotes) - MUST BE FIRST
    // This is critical for Gemini responses which often use smart quotes
    // Remove curly single quotes entirely to avoid breaking JSON strings (possessives like "Smith's" become "Smiths")
    cleaned = cleaned.replace(/[\u2018\u2019]/g, ''); // Remove curly single quotes (apostrophes)
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"'); // Replace curly double quotes with straight double quote
    
    // Fix common JSON syntax errors
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing quotes around property names (but be careful not to over-escape)
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // CRITICAL FIX: Handle apostrophes and quotes more carefully
    // First, fix smart quotes that Gemini often uses
    cleaned = cleaned.replace(/[\u2018\u2019\u2032]/g, ''); // Remove curly single quotes and prime symbols
    
    // Remove apostrophes in possessive forms BEFORE any other quote processing
    // This must be done early to prevent JSON corruption
    cleaned = cleaned.replace(/([a-zA-Z])'s(\s|"|,|:)/g, '$1s$2'); // "User's " -> "Users "
    cleaned = cleaned.replace(/([a-zA-Z])'(\s|"|,|:)/g, '$1$2');   // "Users' " -> "Users "
    
    // Remove any remaining single quotes/apostrophes that could break JSON
    cleaned = cleaned.replace(/'/g, '');
    
    // Additional safety: remove any stray apostrophes that might have been missed
    cleaned = cleaned.replace(/'/g, '');
    
    // Now this line won't break anything since all single quotes are already removed
    // cleaned = cleaned.replace(/(?<!\\)'/g, '"');
    
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
    // Only match if preceded by : or , (actual JSON number context, not inside a string)
    const truncatedDecimals = trimmed.match(/[,:]\s*\d+\.\s*[",}\]]/g);
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
  parseJsonWithFallbacks(text, context = 'unknown') {
    console.log(`[GEMINI TEXT] Attempting to parse JSON for ${context}`);
    console.log(`[GEMINI TEXT] Raw text length: ${text.length}`);

    // Enhanced preview logging to debug JSON issues
    const preview = text.replace(/\s+/g, ' ');
    console.log(`[GEMINI TEXT] Enhanced cleaned JSON preview:`, preview.substring(0, 500) + '...');
    
    // Debug specific positions where errors occur
    if (preview.length > 350) {
      console.log(`[GEMINI TEXT] Characters around position 334:`, preview.substring(320, 350));
    }

    // Strategy 1: Extract from markdown code blocks FIRST (before validation)
    try {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        let jsonContent = codeBlockMatch[1].trim();
        console.log(`[GEMINI TEXT] 📦 Extracted from code block for ${context}:`, jsonContent.substring(0, 200) + '...');

        // Try parsing WITHOUT aggressive cleaning first
        try {
          const parsed = JSON.parse(jsonContent);
          console.log(`[GEMINI TEXT] ✅ Code block extraction successful WITHOUT cleaning for ${context}`);
          return parsed;
        } catch (directError) {
          console.log(`[GEMINI TEXT] Direct parsing failed, trying with minimal cleaning:`, directError.message);
          // Only do minimal cleaning if direct parsing fails
          const cleaned = this.minimalJsonClean(jsonContent);
          const parsed = JSON.parse(cleaned);
          console.log(`[GEMINI TEXT] ✅ Code block extraction successful with minimal cleaning for ${context}`);
          return parsed;
        }
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ Code block extraction failed for ${context}:`, error.message);
    }

    // Strategy 2: Validate the JSON structure (for non-code-block content)
    const validation = this.validateJsonStructure(text);
    if (validation.valid) {
      console.log(`[GEMINI TEXT] ✅ JSON structure validation passed for ${context}`);
    } else {
      console.log(`[GEMINI TEXT] ⚠️ JSON structure validation failed for ${context}:`, validation.error);
      console.log(`[GEMINI TEXT] Issues found:`, validation.issues);
    }

    // Strategy 3: Direct JSON parsing (try without cleaning first)
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
    
    // Strategy 4: Find JSON object in text
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        console.log(`[GEMINI TEXT] 🔍 Found JSON object for ${context}:`, jsonString.substring(0, 200) + '...');

        // Try direct parsing first
        try {
          const parsed = JSON.parse(jsonString);
          console.log(`[GEMINI TEXT] ✅ JSON object extraction successful WITHOUT cleaning for ${context}`);
          return parsed;
        } catch (directError) {
          console.log(`[GEMINI TEXT] Direct object parsing failed, trying with minimal cleaning:`, directError.message);

        // Validate found JSON
        const jsonValidation = this.validateJsonStructure(jsonString);
        if (!jsonValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Found JSON validation failed:`, jsonValidation.error);
        }

          const cleaned = this.minimalJsonClean(jsonString);
        const parsed = JSON.parse(cleaned);
          console.log(`[GEMINI TEXT] ✅ JSON object extraction successful with minimal cleaning for ${context}`);
        return parsed;
        }
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ JSON object extraction failed for ${context}:`, error.message);
    }
    
    // Strategy 5: Find JSON array in text
    try {
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        let jsonString = arrayMatch[0];
        console.log(`[GEMINI TEXT] 📋 Found JSON array for ${context}:`, jsonString.substring(0, 200) + '...');

        // Try direct parsing first
        try {
          const parsed = JSON.parse(jsonString);
          console.log(`[GEMINI TEXT] ✅ JSON array extraction successful WITHOUT cleaning for ${context}`);
          return parsed;
        } catch (directError) {
          console.log(`[GEMINI TEXT] Direct array parsing failed, trying with minimal cleaning:`, directError.message);

        // Validate found JSON array
        const arrayValidation = this.validateJsonStructure(jsonString);
        if (!arrayValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Found JSON array validation failed:`, arrayValidation.error);
        }

          const cleaned = this.minimalJsonClean(jsonString);
        const parsed = JSON.parse(cleaned);
          console.log(`[GEMINI TEXT] ✅ JSON array extraction successful with minimal cleaning for ${context}`);
        return parsed;
        }
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ JSON array extraction failed for ${context}:`, error.message);
    }
    
    // Strategy 6: Try to fix truncated JSON
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

        // Try direct parsing first
        try {
          const parsed = JSON.parse(partialJson);
          console.log(`[GEMINI TEXT] ✅ Truncated JSON fix successful WITHOUT cleaning for ${context}`);
          return parsed;
        } catch (directError) {
          console.log(`[GEMINI TEXT] Direct truncated parsing failed, trying with minimal cleaning:`, directError.message);

        // Validate fixed JSON
        const fixedValidation = this.validateJsonStructure(partialJson);
        if (!fixedValidation.valid) {
          console.log(`[GEMINI TEXT] ⚠️ Fixed JSON validation failed:`, fixedValidation.error);
        }

          const cleaned = this.minimalJsonClean(partialJson);
        const parsed = JSON.parse(cleaned);
          console.log(`[GEMINI TEXT] ✅ Truncated JSON fix successful with minimal cleaning for ${context}`);
        return parsed;
        }
      }
    } catch (error) {
      console.log(`[GEMINI TEXT] ❌ Truncated JSON fix failed for ${context}:`, error.message);
    }
    
    // Strategy 7: Last resort - create minimal valid JSON
    console.log(`[GEMINI TEXT] 🚨 All parsing strategies failed for ${context}, creating minimal JSON`);
    console.log(`[GEMINI TEXT] Raw text causing fallback:`, text.substring(0, 1000));
    
    if (context === 'workout') {
      return {
        plan_name: "Fallback Workout Plan",
        duration_weeks: 4,
        sessions_per_week: 3,
        target_level: "intermediate",
        primary_goal: "general_fitness",
        weekly_schedule: [
          {
            day: 1,
            day_name: "Day 1",
            focus: "Full Body",
            exercises: [
              {
                name: "Push-ups",
                sets: 3,
                reps: "8-12",
                rest: "60s",
                notes: "Basic bodyweight exercise"
              }
            ]
          }
        ],
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


