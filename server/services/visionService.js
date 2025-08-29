// Enhanced Cloudflare Workers AI Vision API Service with Fallback Support
const axios = require('axios');
const crypto = require('crypto');

class VisionService {
    constructor() {
        this.accountId = process.env.CF_ACCOUNT_ID;
        this.apiToken = process.env.CF_API_TOKEN;
        this.baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;

        // Vision models in order of preference (best to fallback)
        this.visionModels = [
            '@cf/llava-hf/llava-1.5-7b-hf',           // Primary: LLaVA model (most reliable)
            '@cf/meta/llama-3.2-11b-vision-instruct', // Fallback: Meta LLaMA 11B
            '@cf/meta/llama-3.2-90b-vision-instruct', // Fallback: Meta LLaMA 90B
            '@cf/unum/uform-gen2-qwen-500m',          // Last fallback: UForm model
        ];

        // Start with preferred model or environment setting
        this.model = process.env.CF_VISION_MODEL || this.visionModels[0];
        this.workingModels = new Set();    // Track models that work
        this.failedModels = new Set();     // Track models that failed

        // Optimization configurations
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
        this.requestTimeout = 60000; // 60 seconds (match server expectation)
        this.cacheTTL = 3600000; // 1 hour cache
        this.maxImageSize = 1024 * 1024; // 1MB max image size
        this.compressionQuality = 0.8; // Image compression quality

        // Initialize caches and monitoring
        this.responseCache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            modelSwitches: 0
        };

        // Rate limiting
        this.requestsPerMinute = 0;
        this.rateLimitWindow = Date.now();
        this.maxRequestsPerMinute = 50; // Cloudflare free tier limit

        console.log('[CF VISION] Enhanced VisionService initialized');
        console.log(`[CF VISION] Primary model: ${this.model}`);
        console.log(`[CF VISION] Fallback models: ${this.visionModels.join(', ')}`);
    }

    async analyzeImage(base64Image, prompt = "Describe this food image in detail, including the type of food, ingredients, and nutritional information if possible.") {
        console.log('[CF VISION] Starting image analysis with Cloudflare Workers AI');

        // Check if Cloudflare credentials are configured
        if (!this.apiToken || !this.accountId) {
            console.log('[CF VISION] ⚠️  Cloudflare credentials not configured, skipping Cloudflare analysis');
            throw new Error('CLOUDFLARE_NOT_CONFIGURED');
        }

        // Try models in order of preference
        for (const modelToTry of this.visionModels) {
            // Skip models that have failed before
            if (this.failedModels.has(modelToTry)) {
                console.log(`[CF VISION] Skipping previously failed model: ${modelToTry}`);
                continue;
            }

            try {
                console.log(`[CF VISION] Attempting with model: ${modelToTry}`);

                const result = await this.tryModel(modelToTry, base64Image, prompt);

                // Mark this model as working
                this.workingModels.add(modelToTry);
                this.metrics.successfulRequests++;

                console.log(`[CF VISION] ✅ Success with model: ${modelToTry}`);

                return {
                    success: true,
                    model: modelToTry,
                    analysis: result.analysis,
                    rawResponse: result.rawResponse,
                    modelSwitched: modelToTry !== this.model
                };

            } catch (error) {
                const errorCode = error.response?.data?.errors?.[0]?.code;
                const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;

                console.log(`[CF VISION] ❌ Model ${modelToTry} failed (${errorCode}): ${errorMessage}`);

                // Mark model as failed
                this.failedModels.add(modelToTry);
                this.metrics.failedRequests++;

                // If this is error 7000 (No route) or other model availability issues, try next model
                if (errorCode === 7000 || errorCode === 9109 || errorCode === 1101 || errorCode === 10013) {
                    console.log(`[CF VISION] Model ${modelToTry} not available (${errorCode}), trying next model...`);
                    continue;
                }

                // For other errors, don't retry with other models
                break;
            }
        }

        // All models failed
        const errorMsg = `All Cloudflare vision models failed. Last error: ${this.failedModels.size} models unavailable.`;
        console.log(`[CF VISION] ${errorMsg}`);

        throw new Error(`${errorMsg} Please check your Cloudflare Workers AI configuration.`);
    }

    async tryModel(modelName, base64Image, prompt) {
        const startTime = Date.now();

        // Cloudflare Workers AI expects image and prompt format
        const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

        const payload = {
            image: imageDataUrl,
            prompt: prompt,
            max_tokens: 1000
        };

        const response = await axios.post(
            `${this.baseURL}/${modelName}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.requestTimeout
            }
        );

        const responseTime = Date.now() - startTime;
        this.updateResponseTime(responseTime);

        // Parse Cloudflare response
        const analysis = this.parseCloudflareResponse(response.data);

        return {
            analysis: analysis,
            rawResponse: response.data,
            responseTime: responseTime
        };
    }

    parseCloudflareResponse(data) {
        try {
            // Cloudflare returns response in data.result
            const response = data.result || data.response || '';

            // Extract food description from the response
            const description = typeof response === 'string' ? response : JSON.stringify(response);

            // Try to extract food items from the description
            const foodItems = this.extractFoodItems(description);

            return {
                type: 'vision_analysis',
                description: description,
                detectedItems: foodItems,
                confidence: this.estimateConfidence(description),
                rawResponse: data
            };
        } catch (error) {
            console.log('[CF VISION] Error parsing response:', error);
            return {
                type: 'vision_analysis',
                description: 'Unable to analyze image',
                detectedItems: [],
                confidence: 0,
                rawResponse: data
            };
        }
    }

    extractFoodItems(description) {
        // Simple extraction of food-related terms from description
        const foodKeywords = [
            'apple', 'banana', 'orange', 'pizza', 'burger', 'sandwich', 'pasta', 'rice',
            'chicken', 'beef', 'fish', 'salad', 'soup', 'bread', 'cake', 'cookie',
            'ice cream', 'steak', 'fries', 'noodles', 'sushi', 'tacos', 'burrito'
        ];

        const detectedFoods = [];
        const lowerDesc = description.toLowerCase();

        foodKeywords.forEach(food => {
            if (lowerDesc.includes(food)) {
                detectedFoods.push({
                    item: food,
                    confidence: 80, // Default confidence for detected items
                    category: this.categorizeFood(food)
                });
            }
        });

        return detectedFoods;
    }

    categorizeFood(foodItem) {
        const categories = {
            fruit: ['apple', 'banana', 'orange'],
            protein: ['chicken', 'beef', 'fish', 'steak'],
            grain: ['pasta', 'rice', 'bread', 'noodles'],
            dessert: ['cake', 'cookie', 'ice cream'],
            fast_food: ['pizza', 'burger', 'fries', 'tacos', 'burrito']
        };

        for (const [category, items] of Object.entries(categories)) {
            if (items.includes(foodItem)) {
                return category;
            }
        }
        return 'other';
    }

    estimateConfidence(description) {
        // Estimate confidence based on description quality
        if (description.length > 100) return 85;
        if (description.length > 50) return 70;
        return 60;
    }

    async analyzeFoodImage(base64Image) {
        console.log('[CF VISION] Analyzing food image');

        try {
            const result = await this.analyzeImage(base64Image);

            // Extract analysis information
            const analysis = result.analysis;

            // Create food analysis response
            const foodAnalysis = {
                success: true,
                model: result.model,
                analysisType: 'cloudflare_vision',
                imageDescription: analysis.description,
                detectedItems: analysis.detectedItems || [],
                confidence: analysis.confidence,
                analysis: analysis,
                modelSwitched: result.modelSwitched || false
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

            // Log model switching if it occurred
            if (result.modelSwitched) {
                console.log(`[CF VISION] 🔄 Automatically switched to working model: ${result.model}`);
                this.metrics.modelSwitches++;
            }

            return foodAnalysis;

        } catch (error) {
            console.log('[CF VISION] Food analysis failed:', error.message);

            // Handle different types of errors
            if (error.message === 'CLOUDFLARE_NOT_CONFIGURED') {
                throw new Error('CLOUDFLARE_NOT_CONFIGURED');
            }

            if (error.message.includes('7000') || error.message.includes('No route')) {
                throw new Error('Cloudflare Workers AI model not available. Please check your account has Workers AI enabled and try updating to a different vision model.');
            }

            throw error;
        }
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
            workingModels: Array.from(this.workingModels),
            failedModels: Array.from(this.failedModels),
            currentModel: this.model
        };
    }

    // Method to reset failed models (useful for testing)
    resetFailedModels() {
        this.failedModels.clear();
        console.log('[CF VISION] Reset failed models cache');
    }


}

module.exports = VisionService;