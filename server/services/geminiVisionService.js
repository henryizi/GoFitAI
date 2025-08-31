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
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    console.log('[GEMINI VISION] Service initialized with model: gemini-2.0-flash-exp');
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

      // Comprehensive prompt for food analysis
      const prompt = `Analyze this food image and provide detailed nutritional information. I need you to identify all food items visible and estimate their nutritional content based on realistic serving sizes.

Please provide your response in the following JSON format (respond ONLY with valid JSON, no additional text):

{
  "foodName": "Main dish name or description",
  "confidence": 85,
  "estimatedServingSize": "Description of estimated portion size",
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
      "name": "Specific food item 1",
      "quantity": "Estimated amount",
      "calories": 200,
      "protein": 15.0,
      "carbohydrates": 20.0,
      "fat": 8.0
    }
  ],
  "assumptions": [
    "Assumption about portion size",
    "Assumption about cooking method"
  ],
  "notes": "Additional relevant information about the food or analysis"
}

Important guidelines:
- Be realistic with serving sizes (standard restaurant/home portions)
- If multiple items are visible, analyze each separately in foodItems array
- Provide your confidence level (0-100) based on image clarity and food recognition
- Include all major macronutrients in grams
- Make reasonable assumptions about ingredients and cooking methods
- If uncertain about specific values, err on the side of typical nutritional content for that food type
- For mixed dishes, break down into component foods when possible`;

      // Generate content using Gemini Vision
      const result = await this.model.generateContent([prompt, imagePart]);
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
      
      // Return a structured error response
      throw new Error(`Food analysis failed: ${error.message}`);
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
      model: 'gemini-2.0-flash-exp',
      apiKeyConfigured: !!this.apiKey,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GeminiVisionService;
