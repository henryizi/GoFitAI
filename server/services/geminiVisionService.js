/**
 * Gemini Vision Service for Food Photo Analysis
 * Provides comprehensive food recognition and nutritional analysis
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiVisionService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    // ✅ Add temperature control for more consistent results
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1, // Lower temperature = more consistent, less random
        topP: 0.8,
        topK: 40
      }
    });
    
  }

  /**
   * Analyzes a food image and returns nutritional information
   * @param {Buffer} imageBuffer - The image buffer
   * @param {string} mimeType - The MIME type of the image (e.g., 'image/jpeg')
   * @returns {Promise<Object>} Nutritional analysis results
   */
  async analyzeFoodImage(imageBuffer, mimeType = 'image/jpeg') {
    try {

      const startTime = Date.now();

      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Create the image part for Gemini
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };

      // Focused prompt for direct food analysis and nutrition estimation
      const prompt = `Analyze this food photo and identify the dish or food items. 

CRITICAL PORTION SIZE ANALYSIS:
1. CAREFULLY assess the ACTUAL VISIBLE PORTION SIZE in the image
2. Look for visual cues: plate size, bowl fullness, food volume, comparison to utensils/hands if visible
3. Classify the portion as: "Small" (child-size/snack), "Medium" (half portion), "Regular" (standard meal), "Large" (1.5x normal), or "Extra Large" (2x+ normal)
4. Adjust calorie estimates based on the ACTUAL portion you see, NOT a standard serving
5. If the portion looks smaller than typical restaurant/home serving, reduce calories proportionally
6. If the portion looks larger, increase calories proportionally

PORTION SIZE EXAMPLES:
- Small bowl of rice (1/2 cup) = ~100 cal, not a full bowl (1 cup) = ~200 cal
- Small piece of chicken (2 oz) = ~100 cal, not regular piece (4 oz) = ~200 cal  
- Half sandwich = ~200 cal, not full sandwich = ~400 cal
- Small salad (side dish) = ~50 cal, not large salad (meal) = ~200 cal

CRITICAL: Respond ONLY with valid JSON in this exact format:

{
  "foodName": "Specific dish name if recognizable (e.g., 'Spaghetti Bolognese', 'Caesar Salad', 'Grilled Salmon'), or simple description if multiple separate items",
  "confidence": 85,
  "estimatedServingSize": "IMPORTANT: Specify actual portion size seen - e.g., 'Small portion (~1/2 cup)', 'Regular serving', 'Large portion (1.5x normal)'",
  "portionMultiplier": 1.0,
  "totalNutrition": {
    "calories": 450,
    "protein": 25.5,
    "carbohydrates": 35.2,
    "fat": 18.3,
    "fiber": 4.1,
    "sugar": 8.2,
    "sodium": 650
  },
  "foodItems": [
    {
      "name": "Specific food item",
      "quantity": "ACTUAL amount visible - e.g., '1/2 cup rice', '2 oz chicken', '1 small piece'",
      "calories": 200,
      "protein": 15.0,
      "carbohydrates": 20.0,
      "fat": 8.0
    }
  ],
  "assumptions": [
    "MUST include portion size assessment - e.g., 'Portion appears smaller than standard serving, calories adjusted to ~70% of typical'",
    "Other key assumptions about preparation"
  ],
  "notes": "Brief analysis summary including portion size observation"
}

DISH RECOGNITION PRIORITY - BE SMART AND RECOGNIZE CUISINE:
1. ALWAYS FIRST: Identify complete, recognized dishes with proper cuisine names
   - Chinese: "宫保鸡丁" (not "chicken, peanuts, vegetables"), "麻婆豆腐" (not "tofu, meat sauce")
   - Italian: "Spaghetti Bolognese" (not "spaghetti, meat sauce"), "Margherita Pizza" 
   - Japanese: "Chicken Teriyaki" (not "chicken, rice"), "Sushi Platter", "Ramen"
   - Thai: "Pad Thai", "Green Curry", "Tom Yum Soup"
   - Indian: "Butter Chicken", "Biryani", "Curry"
   - Western: "Fish and Chips", "Caesar Salad", "Hamburger"

2. If it's a recognizable cuisine dish, use the PROPER DISH NAME - don't break it down
   - Example: If you see dumplings → "Dumplings" or "Xiaolongbao" (not "flour wrapper, meat filling")
   - Example: If you see fried rice → "Fried Rice" or "Yangzhou Fried Rice" (not "rice, eggs, vegetables")
   - Example: If you see noodle soup → "Ramen" or "Pho" (not "noodles, broth, vegetables")

3. ONLY list separate items if they are clearly UNRELATED foods on same plate
   - Examples: "Apple and banana" (clearly separate fruits)
   - Examples: "Sandwich with side salad" (when obviously two separate items)

SMART RECOGNITION GUIDELINES:
- BE SMARTER: If you can recognize the cuisine and dish type, just name it directly
- DON'T OVER-ANALYZE: Don't list individual ingredients for known dishes
- CUISINE FIRST: Think "What cuisine is this?" then "What's the dish name?"
- COMMON NAMES: Use names people actually use in restaurants/menus
- Examples of SMART recognition:
  * See dumplings? → "Pork Dumplings" (not "wheat wrapper, ground pork, cabbage")
  * See fried noodles? → "Chow Mein" or "Lo Mein" (not "noodles, vegetables, sauce")
  * See rice bowl with meat? → "Teriyaki Bowl" or "Rice Bowl" (not "rice, chicken, sauce")
  * See pasta with red sauce? → "Spaghetti Marinara" (not "pasta, tomato sauce, herbs")
- Confidence 0-100 based on how clearly you can identify the dish
- Focus on what the dish IS, not what it's made of

BEVERAGE ANALYSIS GUIDELINES:
- For tea, coffee, and clear beverages: Default to UNSWEETENED unless you can clearly see:
  * Sugar crystals or granules
  * Honey being poured or visible
  * Obvious syrup or sweetening packets
  * Foam/froth indicating added sweeteners
- Plain tea (green tea, jasmine tea, black tea) should be analyzed as UNSWEETENED by default
- Only indicate "sweetened" if there's visual evidence of sweeteners being added
- For beverages in clear containers, look for sediment or color changes that indicate sweeteners
- When in doubt about sweetness, always default to the UNSWEETENED version
- Be CONSISTENT - same beverage should give same sweetness assessment unless clear visual differences`;

      // Generate content using Gemini Vision with retry logic for 503 errors
      const result = await this.generateContentWithRetry([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const analysisTime = Date.now() - startTime;

      // Parse the JSON response
      let nutritionData;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        nutritionData = JSON.parse(jsonString);
        
        
      } catch (parseError) {
        console.error('[GEMINI VISION] JSON parsing failed:', parseError.message);
        
        // Fallback: create structured response from text
        nutritionData = this.createFallbackResponse(text);
      }

      // Validate and ensure required fields
      const validatedData = this.validateAndNormalize(nutritionData);
      
      return validatedData;

    } catch (error) {
      console.error('[GEMINI VISION] Analysis failed:', error.message);
      console.error('[GEMINI VISION] Error details:', error);
      
      // Try fallback to basic food analyzer if available
      
      try {
        const BasicFoodAnalyzer = require('./basicFoodAnalyzer');
        const basicAnalyzer = new BasicFoodAnalyzer();
        const fallbackResult = await basicAnalyzer.analyzeFood(imageBuffer);
        
        return {
          ...fallbackResult,
          confidence: Math.max(0, fallbackResult.confidence - 20), // Reduce confidence for fallback
          source: 'basic_fallback'
        };
        
      } catch (fallbackError) {
        console.error('[GEMINI VISION] Fallback analysis also failed:', fallbackError.message);
        
        // Return a generic fallback response as last resort
        return this.createFallbackResponse();
      }
    }
  }

  /**
   * Generates content with retry logic for 503 Service Unavailable errors
   * @param {Array} content - Content array for Gemini (prompt + image)
   * @returns {Promise} Gemini response
   */
  async generateContentWithRetry(content, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        
        const result = await this.model.generateContent(content);
        return result;
        
      } catch (error) {
        const isServiceUnavailable = error.message.includes('503') || 
                                   error.message.includes('Service Unavailable') ||
                                   error.message.includes('overloaded');
        
        if (isServiceUnavailable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's not a 503 error, or we've exhausted retries, throw the error
        throw error;
      }
    }
  }

  /**
   * Creates a fallback response when JSON parsing fails
   * @param {string} text - Raw text response from Gemini
   * @returns {Object} Structured fallback response
   */
  createFallbackResponse() {
    
    return {
      foodName: "Unidentified Food Item",
      confidence: 50,
      estimatedServingSize: "Standard serving",
      portionMultiplier: 1.0,
      totalNutrition: {
        calories: 300,
        protein: 15.0,
        carbohydrates: 30.0,
        fat: 15.0,
        fiber: 3.0,
        sugar: 5.0,
        sodium: 400
      },
      foodItems: [{
        name: "Unidentified Food Item",
        quantity: "1 serving",
        calories: 300,
        protein: 15.0,
        carbohydrates: 30.0,
        fat: 15.0
      }],
      assumptions: [
        "Could not parse detailed analysis",
        "Using estimated average values"
      ],
      notes: "Analysis partially successful. Using estimated nutritional values. Raw response available for manual review."
    };
  }

  /**
   * Validates and normalizes the nutrition data
   * @param {Object} data - Raw nutrition data from Gemini
   * @returns {Object} Validated and normalized data
   */
  validateAndNormalize(data) {
    // Ensure required fields exist with defaults
    const normalized = {
      foodName: data.foodName || "Food Item",
      confidence: Math.min(Math.max(data.confidence || 75, 0), 100),
      estimatedServingSize: data.estimatedServingSize || "1 serving",
      portionMultiplier: data.portionMultiplier || 1.0,
      totalNutrition: {
        calories: this.roundToDecimal(data.totalNutrition?.calories || 250, 0),
        protein: this.roundToDecimal(data.totalNutrition?.protein || 12, 1),
        carbohydrates: this.roundToDecimal(data.totalNutrition?.carbohydrates || 25, 1),
        fat: this.roundToDecimal(data.totalNutrition?.fat || 10, 1),
        fiber: this.roundToDecimal(data.totalNutrition?.fiber || 2, 1),
        sugar: this.roundToDecimal(data.totalNutrition?.sugar || 5, 1),
        sodium: this.roundToDecimal(data.totalNutrition?.sodium || 300, 0)
      },
      foodItems: data.foodItems || [],
      assumptions: data.assumptions || [],
      notes: data.notes || "Nutritional analysis completed successfully"
    };

    // Validate food items array
    if (normalized.foodItems.length === 0) {
      normalized.foodItems = [{
        name: normalized.foodName,
        quantity: normalized.estimatedServingSize,
        calories: normalized.totalNutrition.calories,
        protein: normalized.totalNutrition.protein,
        carbohydrates: normalized.totalNutrition.carbohydrates,
        fat: normalized.totalNutrition.fat
      }];
    }

    // Ensure foodItems have required fields
    normalized.foodItems = normalized.foodItems.map(item => ({
      name: item.name || "Food Item",
      quantity: item.quantity || "1 serving",
      calories: this.roundToDecimal(item.calories || 0, 0),
      protein: this.roundToDecimal(item.protein || 0, 1),
      carbohydrates: this.roundToDecimal(item.carbohydrates || 0, 1),
      fat: this.roundToDecimal(item.fat || 0, 1)
    }));

    // ✅ SMART DISH NAME HANDLING: Only generate combined names when needed
    // The AI should now prioritize recognizing complete dishes (e.g., "Spaghetti Bolognese")
    // Only combine individual components if:
    // 1. foodName is generic/missing ("Food Item", "Unknown")
    // 2. OR foodName exactly matches just the first item (indicating AI didn't recognize the complete dish)
    
    const isGenericName = normalized.foodName === "Food Item" || 
                         normalized.foodName === "Unknown Food" || 
                         normalized.foodName === "Detected Food";
    
    const isJustFirstItem = normalized.foodItems.length > 1 && 
                           normalized.foodName === normalized.foodItems[0]?.name;
    
    const shouldGenerateCombinedName = isGenericName || isJustFirstItem;
      
    if (shouldGenerateCombinedName && normalized.foodItems.length > 0) {
      const generatedName = this.generateMealNameFromItems(normalized.foodItems);
      normalized.foodName = generatedName;
    }

    return normalized;
  }

  /**
   * Generates a meaningful meal name from food items array
   * @param {Array} foodItems - Array of food items with names
   * @returns {string} Generated meal name
   */
  generateMealNameFromItems(foodItems) {
    if (!foodItems || foodItems.length === 0) {
      return "Food Item";
    }

    if (foodItems.length === 1) {
      return foodItems[0].name;
    }

    if (foodItems.length === 2) {
      return `${foodItems[0].name} with ${foodItems[1].name}`;
    }

    if (foodItems.length === 3) {
      return `${foodItems[0].name}, ${foodItems[1].name} & ${foodItems[2].name}`;
    }

    // For 4+ items, list all items with commas and "&" before the last one
    if (foodItems.length >= 4) {
      const allButLast = foodItems.slice(0, -1).map(item => item.name).join(', ');
      const lastItem = foodItems[foodItems.length - 1].name;
      return `${allButLast} & ${lastItem}`;
    }

    return foodItems[0].name || "Food Item";
  }

  /**
   * Rounds a number to specified decimal places
   * @param {number} value - The value to round
   * @param {number} decimals - Number of decimal places
   * @returns {number} Rounded value
   */
  roundToDecimal(value, decimals) {
    const num = parseFloat(value) || 0;
    return Number(num.toFixed(decimals));
  }

  /**
   * Health check for the service
   * @returns {Object} Service health status
   */
  getHealthStatus() {
    return {
      service: 'GeminiVisionService',
      status: 'healthy',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      apiKeyConfigured: !!this.apiKey,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GeminiVisionService;
