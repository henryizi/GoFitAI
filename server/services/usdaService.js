/**
 * USDA FoodData Central API Service
 * Provides access to comprehensive nutritional data for food items
 */

const axios = require('axios');

class USDAService {
  constructor() {
    this.apiKey = process.env.USDA_FDC_API_KEY;
    this.baseUrl = 'https://api.nal.usda.gov/fdc/v1';
    
    if (!this.apiKey) {
      console.warn('[USDA] API key not configured. USDA features will be unavailable.');
    }
  }

  /**
   * Search for foods in the USDA database
   * @param {string} query - Food search term
   * @param {number} pageSize - Number of results to return (default: 10)
   * @param {Array<string>} dataType - Types of food data to include
   * @returns {Promise<Object>} Search results
   */
  async searchFoods(query, pageSize = 10, dataType = ['Foundation', 'SR Legacy', 'Branded']) {
    if (!this.apiKey) {
      throw new Error('USDA API key not configured');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/foods/search`, {
        query: query.trim(),
        pageSize,
        dataType,
        sortBy: 'dataType.keyword',
        sortOrder: 'asc'
      }, {
        params: {
          api_key: this.apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('[USDA] Search error:', error.response?.data || error.message);
      throw new Error(`USDA search failed: ${error.message}`);
    }
  }

  /**
   * Get detailed nutritional information for a specific food item
   * @param {number} fdcId - USDA Food Data Central ID
   * @returns {Promise<Object>} Detailed food information
   */
  async getFoodDetails(fdcId) {
    if (!this.apiKey) {
      throw new Error('USDA API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/food/${fdcId}`, {
        params: {
          api_key: this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('[USDA] Food details error:', error.response?.data || error.message);
      throw new Error(`USDA food details failed: ${error.message}`);
    }
  }

  /**
   * Find the best matching food from USDA database
   * @param {string} foodName - Name of the food to match
   * @param {number} confidence - Minimum confidence threshold (0-1)
   * @returns {Promise<Object|null>} Best matching food or null
   */
  async findBestMatch(foodName, confidence = 0.7) {
    try {
      // Clean and normalize the food name
      const cleanedName = this.cleanFoodName(foodName);
      
      // Search for the food
      const searchResults = await this.searchFoods(cleanedName, 5);
      
      if (!searchResults.foods || searchResults.foods.length === 0) {
        return null;
      }

      // Find the best match based on name similarity
      let bestMatch = null;
      let bestScore = 0;

      for (const food of searchResults.foods) {
        const score = this.calculateSimilarity(cleanedName.toLowerCase(), food.description.toLowerCase());
        
        if (score > bestScore && score >= confidence) {
          bestScore = score;
          bestMatch = {
            ...food,
            matchScore: score
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('[USDA] Best match error:', error.message);
      return null;
    }
  }

  /**
   * Extract standardized nutrition data from USDA food details
   * @param {Object} foodDetails - USDA food details response
   * @param {number} servingSize - Serving size in grams (default: 100g)
   * @returns {Object} Standardized nutrition data
   */
  extractNutritionData(foodDetails, servingSize = 100) {
    const nutrients = foodDetails.foodNutrients || [];
    
    // Map USDA nutrient IDs to our standard format
    const nutrientMap = {
      1008: 'calories',      // Energy (kcal)
      1003: 'protein',       // Protein (g)
      1005: 'carbs',         // Carbohydrate (g)
      1004: 'fat',           // Total lipid (fat) (g)
      1079: 'fiber',         // Fiber, total dietary (g)
      2000: 'sugar',         // Total sugars (g)
      1093: 'sodium'         // Sodium (mg)
    };

    const nutrition = {
      name: foodDetails.description,
      fdcId: foodDetails.fdcId,
      dataType: foodDetails.dataType,
      servingSize,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      source: 'USDA FoodData Central'
    };

    // Extract nutrient values
    nutrients.forEach(nutrient => {
      const key = nutrientMap[nutrient.nutrient.id];
      if (key && nutrient.amount !== undefined) {
        // Scale the amount based on serving size (USDA data is per 100g)
        const scaledAmount = (nutrient.amount * servingSize) / 100;
        nutrition[key] = Math.round(scaledAmount * 100) / 100; // Round to 2 decimal places
      }
    });

    return nutrition;
  }

  /**
   * Get nutrition data for a food item by name
   * @param {string} foodName - Name of the food
   * @param {number} servingSize - Serving size in grams
   * @returns {Promise<Object|null>} Nutrition data or null if not found
   */
  async getNutritionByName(foodName, servingSize = 100) {
    try {
      const match = await this.findBestMatch(foodName);
      
      if (!match) {
        return null;
      }

      const details = await this.getFoodDetails(match.fdcId);
      return this.extractNutritionData(details, servingSize);
    } catch (error) {
      console.error('[USDA] Nutrition by name error:', error.message);
      return null;
    }
  }

  /**
   * Clean and normalize food names for better matching
   * @param {string} foodName - Raw food name
   * @returns {string} Cleaned food name
   */
  cleanFoodName(foodName) {
    return foodName
      .toLowerCase()
      .replace(/\b(raw|cooked|grilled|baked|fried|steamed|boiled)\b/g, '')
      .replace(/\b(with|and|&)\b/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len2][len1];
    return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
  }

  /**
   * Test USDA API connectivity
   * @returns {Promise<boolean>} True if API is accessible
   */
  async testConnection() {
    try {
      await this.searchFoods('apple', 1);
      return true;
    } catch (error) {
      console.error('[USDA] Connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = USDAService;

