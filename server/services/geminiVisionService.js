// Enhanced Google Gemini Vision API Service for Food Photo Analysis
const axios = require('axios');
const crypto = require('crypto');

class GeminiVisionService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.model = 'gemini-2.0-flash-exp'; // Latest experimental model for vision analysis
        
        // Configuration
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.requestTimeout = 60000; // 60 seconds
        this.maxImageSize = 4 * 1024 * 1024; // 4MB max (Gemini limit)
        
        // Metrics and monitoring
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        // Rate limiting (Gemini free tier: 15 requests per minute)
        this.requestsPerMinute = 0;
        this.rateLimitWindow = Date.now();
        this.maxRequestsPerMinute = 15;

        console.log('[GEMINI VISION] Enhanced GeminiVisionService initialized');
        console.log(`[GEMINI VISION] Using model: ${this.model}`);
        console.log(`[GEMINI VISION] API Key configured: ${this.apiKey ? '✅ Yes' : '❌ No'}`);
    }

    async analyzeImage(base64Image, prompt = null) {
        console.log('[GEMINI VISION] Starting image analysis with Gemini Vision API');

        // Check if Gemini API key is configured
        if (!this.apiKey) {
            console.log('[GEMINI VISION] ⚠️  Gemini API key not configured');
            throw new Error('GEMINI_NOT_CONFIGURED');
        }

        // Check rate limiting
        if (this.isRateLimited()) {
            console.log('[GEMINI VISION] ⚠️  Rate limit reached, waiting...');
            await this.waitForRateLimit();
        }

        try {
            const startTime = Date.now();
            
            // Use default food analysis prompt if none provided
            const analysisPrompt = prompt || this.getDefaultFoodPrompt();
            
            const result = await this.callGeminiAPI(base64Image, analysisPrompt);
            
            const responseTime = Date.now() - startTime;
            this.updateResponseTime(responseTime);
            this.metrics.successfulRequests++;

            console.log(`[GEMINI VISION] ✅ Analysis completed in ${responseTime}ms`);

            return {
                success: true,
                model: this.model,
                analysis: result.analysis,
                rawResponse: result.rawResponse,
                responseTime: responseTime
            };

        } catch (error) {
            this.metrics.failedRequests++;
            console.log('[GEMINI VISION] ❌ Analysis failed:', error.message);
            throw error;
        }
    }

    async callGeminiAPI(base64Image, prompt) {
        const url = `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`;
        
        // Gemini expects specific format for vision analysis
        const payload = {
            contents: [{
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent food analysis
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            }
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: this.requestTimeout
        });

        // Parse Gemini response
        const analysis = this.parseGeminiResponse(response.data);
        
        return {
            analysis: analysis,
            rawResponse: response.data
        };
    }

    parseGeminiResponse(data) {
        try {
            // Extract the generated text from Gemini response
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (!generatedText) {
                throw new Error('No response text from Gemini API');
            }

            // Try to parse as JSON first (if it's structured)
            let parsedData = null;
            try {
                parsedData = JSON.parse(generatedText);
            } catch (parseError) {
                // If not JSON, treat as plain text
                parsedData = null;
            }

            // Extract food items and create analysis
            const foodItems = this.extractFoodItems(generatedText);
            const confidence = this.estimateConfidence(generatedText);

            return {
                type: 'gemini_vision_analysis',
                description: generatedText,
                detectedItems: foodItems,
                confidence: confidence,
                structuredData: parsedData,
                rawResponse: data
            };

        } catch (error) {
            console.log('[GEMINI VISION] Error parsing Gemini response:', error);
            return {
                type: 'gemini_vision_analysis',
                description: 'Unable to analyze image with Gemini',
                detectedItems: [],
                confidence: 0,
                rawResponse: data
            };
        }
    }

    getDefaultFoodPrompt() {
        return `You are an expert nutritionist and culinary AI specialist. Analyze this food image and provide detailed nutritional information.

CRITICAL INSTRUCTIONS:
1. FIRST identify the SPECIFIC DISH NAME (e.g., "French Toast", "Pad Thai", "Sushi Roll")
2. Identify the CUISINE TYPE (e.g., "American Breakfast", "Thai", "Japanese")
3. Recognize COOKING METHODS (e.g., "grilled", "fried", "baked")
4. Identify ALL visible food items and ingredients
5. Estimate portion sizes accurately
6. Provide detailed nutritional breakdown

Return ONLY a valid JSON object with this structure:
{
  "dishName": "Specific dish name",
  "cuisineType": "Cuisine category",
  "cookingMethod": "How it was prepared",
  "foodItems": [
    {
      "name": "ingredient name",
      "quantity": "estimated amount",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "fiber": 0
    }
  ],
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0,
    "sugar": 0,
    "sodium": 0
  },
  "portionSize": "description",
  "confidence": 0.85
}

Be as specific and accurate as possible. If you cannot identify certain aspects, use reasonable estimates based on typical serving sizes.`;
    }

    extractFoodItems(description) {
        // Enhanced food keyword detection
        const foodKeywords = [
            // Fruits
            'apple', 'banana', 'orange', 'strawberry', 'blueberry', 'grape', 'pineapple', 'mango',
            // Proteins
            'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'egg',
            // Grains
            'rice', 'pasta', 'bread', 'noodle', 'quinoa', 'oatmeal', 'cereal',
            // Vegetables
            'lettuce', 'tomato', 'onion', 'carrot', 'broccoli', 'spinach', 'kale',
            // Dairy
            'milk', 'cheese', 'yogurt', 'butter', 'cream',
            // Common dishes
            'pizza', 'burger', 'sandwich', 'salad', 'soup', 'stew', 'curry',
            // Desserts
            'cake', 'cookie', 'ice cream', 'pie', 'chocolate', 'candy'
        ];

        const detectedFoods = [];
        const lowerDesc = description.toLowerCase();

        foodKeywords.forEach(food => {
            if (lowerDesc.includes(food)) {
                detectedFoods.push({
                    item: food,
                    confidence: 85, // Higher confidence for Gemini
                    category: this.categorizeFood(food)
                });
            }
        });

        return detectedFoods;
    }

    categorizeFood(foodItem) {
        const categories = {
            fruit: ['apple', 'banana', 'orange', 'strawberry', 'blueberry', 'grape', 'pineapple', 'mango'],
            protein: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'tofu', 'egg'],
            grain: ['rice', 'pasta', 'bread', 'noodle', 'quinoa', 'oatmeal', 'cereal'],
            vegetable: ['lettuce', 'tomato', 'onion', 'carrot', 'broccoli', 'spinach', 'kale'],
            dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
            dessert: ['cake', 'cookie', 'ice cream', 'pie', 'chocolate', 'candy'],
            fast_food: ['pizza', 'burger', 'sandwich', 'fries', 'tacos', 'burrito']
        };

        for (const [category, items] of Object.entries(categories)) {
            if (items.includes(foodItem)) {
                return category;
            }
        }
        return 'other';
    }

    estimateConfidence(description) {
        // Estimate confidence based on description quality and length
        if (description.length > 200 && description.includes('{') && description.includes('}')) return 95;
        if (description.length > 150) return 90;
        if (description.length > 100) return 85;
        if (description.length > 50) return 75;
        return 65;
    }

    async analyzeFoodImage(base64Image) {
        console.log('[GEMINI VISION] Analyzing food image with Gemini');

        try {
            const result = await this.analyzeImage(base64Image);

            // Extract analysis information
            const analysis = result.analysis;

            // Create food analysis response
            const foodAnalysis = {
                success: true,
                model: result.model,
                analysisType: 'gemini_vision',
                imageDescription: analysis.description,
                detectedItems: analysis.detectedItems || [],
                confidence: analysis.confidence,
                analysis: analysis,
                structuredData: analysis.structuredData
            };

            // Add food-specific information
            if (analysis.detectedItems && analysis.detectedItems.length > 0) {
                foodAnalysis.foodCategories = analysis.detectedItems.map(item => ({
                    category: item.category,
                    item: item.item,
                    confidence: item.confidence,
                    isLikelyFood: true
                }));
            }

            // If we have structured data, use it for better nutrition info
            if (analysis.structuredData) {
                foodAnalysis.structuredNutrition = analysis.structuredData;
            }

            return foodAnalysis;

        } catch (error) {
            console.log('[GEMINI VISION] Food analysis failed:', error.message);

            // Handle different types of errors
            if (error.message === 'GEMINI_NOT_CONFIGURED') {
                throw new Error('GEMINI_NOT_CONFIGURED');
            }

            if (error.response?.status === 429) {
                throw new Error('Gemini API rate limit exceeded. Please try again in a minute.');
            }

            if (error.response?.status === 400) {
                throw new Error('Invalid request to Gemini API. Please check the image format.');
            }

            throw error;
        }
    }

    // Rate limiting methods
    isRateLimited() {
        const now = Date.now();
        if (now - this.rateLimitWindow > 60000) {
            // Reset counter after 1 minute
            this.requestsPerMinute = 0;
            this.rateLimitWindow = now;
        }
        return this.requestsPerMinute >= this.maxRequestsPerMinute;
    }

    async waitForRateLimit() {
        const waitTime = 60000 - (Date.now() - this.rateLimitWindow);
        if (waitTime > 0) {
            console.log(`[GEMINI VISION] Waiting ${Math.ceil(waitTime / 1000)} seconds for rate limit reset...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.requestsPerMinute = 0;
        this.rateLimitWindow = Date.now();
    }

    // Utility method to update response time metrics
    updateResponseTime(responseTime) {
        this.metrics.totalRequests++;
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests;
    }

    // Method to get current metrics
    getMetrics() {
        return {
            ...this.metrics,
            currentModel: this.model,
            rateLimitStatus: {
                requestsThisMinute: this.requestsPerMinute,
                maxRequestsPerMinute: this.maxRequestsPerMinute,
                timeUntilReset: Math.max(0, 60000 - (Date.now() - this.rateLimitWindow))
            }
        };
    }

    // Method to test API connectivity
    async testConnection() {
        try {
            if (!this.apiKey) {
                return { success: false, error: 'API key not configured' };
            }

            // Test with a simple text prompt (no image)
            const url = `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`;
            const payload = {
                contents: [{
                    parts: [{ text: "Hello, this is a test message." }]
                }]
            };

            const response = await axios.post(url, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            return { success: true, message: 'Gemini API connection successful' };

        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                status: error.response?.status
            };
        }
    }
}

module.exports = GeminiVisionService;

