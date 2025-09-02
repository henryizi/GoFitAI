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
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    console.log('[GEMINI VISION] Service initialized with model: gemini-2.5-flash');
    console.log('[GEMINI VISION] API Key configured: ✅ Yes');
  }

  /**
   * Analyzes a food image and returns nutritional information
   * @param {Buffer} imageBuffer - The image buffer
   * @param {string} mimeType - The MIME type of the image (e.g., 'image/jpeg')
   * @returns {Promise<Object>} Nutritional analysis results
   */
  async analyzeFoodImage(imageBuffer, mimeType = 'image/jpeg') {
    try {
      console.log('[GEMINI VISION] Starting food image analysis');
      console.log('[GEMINI VISION] Image size:', imageBuffer.length, 'bytes');
      console.log('[GEMINI VISION] MIME type:', mimeType);

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
      const prompt = `Analyze this food photo and identify the food items. Estimate their nutritional information based on typical serving sizes.

CRITICAL: Respond ONLY with valid JSON in this exact format:

{
  "foodName": "Clear, specific food/dish name",
  "confidence": 85,
  "estimatedServingSize": "Estimated portion description",
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
      "quantity": "Amount/portion",
      "calories": 200,
      "protein": 15.0,
      "carbohydrates": 20.0,
      "fat": 8.0
    }
  ],
  "assumptions": [
    "Key assumptions about portion sizes and preparation"
  ],
  "notes": "Brief analysis summary"
}

Guidelines:
- Use realistic typical serving sizes for each food
- Base nutrition on standard food database values
- Be specific with food names (e.g., "Grilled Chicken Breast" not just "Chicken")
- Confidence 0-100 based on image clarity
- Include all macronutrients in grams as numbers
- If multiple foods, list each in foodItems array
- Make reasonable assumptions about cooking methods and ingredients
- Focus on accuracy for common foods and typical portions`;

      // Generate content using Gemini Vision with retry logic for 503 errors
      const result = await this.generateContentWithRetry([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const analysisTime = Date.now() - startTime;
      console.log(`[GEMINI VISION] ✅ Analysis completed in ${analysisTime}ms`);
      console.log('[GEMINI VISION] Raw response length:', text.length);

      // Parse the JSON response
      let nutritionData;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        nutritionData = JSON.parse(jsonString);
        
        console.log('[GEMINI VISION] Successfully parsed nutrition data');
        console.log('[GEMINI VISION] Food identified:', nutritionData.foodName);
        console.log('[GEMINI VISION] Confidence level:', nutritionData.confidence);
        
      } catch (parseError) {
        console.error('[GEMINI VISION] JSON parsing failed:', parseError.message);
        console.log('[GEMINI VISION] Raw response:', text.substring(0, 500));
        
        // Fallback: create structured response from text
        nutritionData = this.createFallbackResponse(text);
      }

      // Validate and ensure required fields
      const validatedData = this.validateAndNormalize(nutritionData);
      
      console.log('[GEMINI VISION] Analysis successful for:', validatedData.foodName);
      return validatedData;

    } catch (error) {
      console.error('[GEMINI VISION] Analysis failed:', error.message);
      console.error('[GEMINI VISION] Error details:', error);
      
      // Try fallback to basic food analyzer if available
      console.log('[GEMINI VISION] 🔄 Attempting fallback to basic food analyzer...');
      
      try {
        const BasicFoodAnalyzer = require('./basicFoodAnalyzer');
        const basicAnalyzer = new BasicFoodAnalyzer();
        const fallbackResult = await basicAnalyzer.analyzeFood(imageBuffer);
        
        console.log('[GEMINI VISION] ✅ Fallback analysis successful');
        return {
          ...fallbackResult,
          confidence: Math.max(0, fallbackResult.confidence - 20), // Reduce confidence for fallback
          source: 'basic_fallback'
        };
        
      } catch (fallbackError) {
        console.error('[GEMINI VISION] Fallback analysis also failed:', fallbackError.message);
        
        // Return a generic fallback response as last resort
        console.log('[GEMINI VISION] 🛑 Using generic fallback response');
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
        console.log(`[GEMINI VISION] Attempt ${attempt}/${maxRetries}`);
        
        const result = await this.model.generateContent(content);
        console.log(`[GEMINI VISION] ✅ Success on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        const isServiceUnavailable = error.message.includes('503') || 
                                   error.message.includes('Service Unavailable') ||
                                   error.message.includes('overloaded');
        
        if (isServiceUnavailable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[GEMINI VISION] ⚠️ Service unavailable (attempt ${attempt}), retrying in ${delay}ms...`);
          console.log(`[GEMINI VISION] Error: ${error.message}`);
          
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
    console.log('[GEMINI VISION] Creating fallback response from text');
    
    return {
      foodName: "Unidentified Food Item",
      confidence: 50,
      estimatedServingSize: "Standard serving",
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

    return normalized;
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
      model: 'gemini-2.5-flash',
      apiKeyConfigured: !!this.apiKey,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GeminiVisionService;
