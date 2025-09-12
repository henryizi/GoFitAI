// Basic Food Analyzer - Fallback when AI providers are unavailable
class BasicFoodAnalyzer {
    constructor() {
        // Common food patterns and their nutritional info
        this.foodPatterns = {
            // Fruits
            'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2 },
            'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 },
            'orange': { calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sugar: 12, sodium: 0 },
            'grape': { calories: 62, protein: 0.6, carbs: 16, fat: 0.3, fiber: 0.9, sugar: 15, sodium: 2 },
            'strawberry': { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, sugar: 4.9, sodium: 1 },

            // Vegetables
            'carrot': { calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69 },
            'broccoli': { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium: 33 },
            'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79 },

            // Proteins
            'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
            'beef': { calories: 250, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0, sodium: 79 },
            'fish': { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 61 },
            'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 0.6, sodium: 124 },

            // Grains
            'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1 },
            'bread': { calories: 79, protein: 2.7, carbs: 14, fat: 1, fiber: 1.9, sugar: 1.4, sodium: 146 },
            'pasta': { calories: 157, protein: 5.8, carbs: 31, fat: 0.9, fiber: 2.1, sugar: 0.6, sodium: 1 },

            // Dairy
            'milk': { calories: 61, protein: 3.3, carbs: 4.8, fat: 3.3, fiber: 0, sugar: 4.8, sodium: 43 },
            'cheese': { calories: 113, protein: 7, carbs: 1.3, fat: 9.4, fiber: 0, sugar: 0.5, sodium: 181 },
            'yogurt': { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, sugar: 4.7, sodium: 46 },

            // Common meals
            'pizza': { calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2.5, sugar: 3.8, sodium: 640 },
            'burger': { calories: 295, protein: 17, carbs: 30, fat: 12, fiber: 1.5, sugar: 6, sodium: 505 },
            'sandwich': { calories: 250, protein: 15, carbs: 30, fat: 8, fiber: 3, sugar: 4, sodium: 480 },
            'salad': { calories: 150, protein: 8, carbs: 12, fat: 10, fiber: 4, sugar: 6, sodium: 200 }
        };

        this.portionMultipliers = {
            'small': 0.5,
            'medium': 1.0,
            'large': 1.5,
            'extra large': 2.0
        };
    }

    analyzeFood(description) {
        console.log('[BASIC ANALYZER] Analyzing food description:', description);

        const lowerDesc = description.toLowerCase();

        // Extract food items from description
        const detectedFoods = [];
        let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

        for (const [foodName, nutrition] of Object.entries(this.foodPatterns)) {
            if (lowerDesc.includes(foodName)) {
                const portion = this.extractPortion(lowerDesc, foodName);
                const multiplier = this.portionMultipliers[portion] || 1.0;

                const scaledNutrition = {
                    name: foodName,
                    quantity: portion,
                    calories: Math.round(nutrition.calories * multiplier),
                    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
                    carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
                    fat: Math.round(nutrition.fat * multiplier * 10) / 10,
                    fiber: Math.round(nutrition.fiber * multiplier * 10) / 10,
                    sugar: Math.round(nutrition.sugar * multiplier * 10) / 10,
                    sodium: Math.round(nutrition.sodium * multiplier)
                };

                detectedFoods.push(scaledNutrition);

                // Add to totals
                totalNutrition.calories += scaledNutrition.calories;
                totalNutrition.protein += scaledNutrition.protein;
                totalNutrition.carbs += scaledNutrition.carbs;
                totalNutrition.fat += scaledNutrition.fat;
                totalNutrition.fiber += scaledNutrition.fiber;
                totalNutrition.sugar += scaledNutrition.sugar;
                totalNutrition.sodium += scaledNutrition.sodium;
            }
        }

        // If no foods detected, provide a generic response
        if (detectedFoods.length === 0) {
            return {
                foodName: "Unknown Food", // ✅ Add foodName for API response consistency
                dishName: "Unknown Food",
                cuisineType: "Unknown",
                cookingMethod: "Unknown",
                foodItems: [{
                    name: "Unknown Food Item",
                    quantity: "1 serving",
                    calories: 200,
                    protein: 10,
                    carbs: 25,
                    fat: 8,
                    fiber: 2,
                    sugar: 5,
                    sodium: 300
                }],
                totalNutrition: {
                    calories: 200,
                    protein: 10,
                    carbs: 25,
                    fat: 8,
                    fiber: 2,
                    sugar: 5,
                    sodium: 300
                },
                confidence: "low",
                notes: "Food recognition unavailable - using generic nutritional estimate"
            };
        }

        // Determine dish name and cuisine
        const dishInfo = this.categorizeDish(detectedFoods, lowerDesc);

        return {
            foodName: dishInfo.dishName, // ✅ Use foodName to match expected API response structure
            dishName: dishInfo.dishName, // Keep dishName for backward compatibility
            cuisineType: dishInfo.cuisineType,
            cookingMethod: dishInfo.cookingMethod,
            foodItems: detectedFoods,
            totalNutrition: totalNutrition,
            confidence: detectedFoods.length > 2 ? "medium" : "low",
            notes: `Basic analysis detected ${detectedFoods.length} food items`
        };
    }

    extractPortion(description, foodName) {
        const portionKeywords = {
            'small': ['small', 'little', 'tiny'],
            'large': ['large', 'big', 'huge', 'extra'],
            'extra large': ['extra large', 'very large']
        };

        for (const [portion, keywords] of Object.entries(portionKeywords)) {
            if (keywords.some(keyword => description.includes(keyword))) {
                return portion;
            }
        }

        return 'medium';
    }

    categorizeDish(foods, description) {
        const foodNames = foods.map(f => f.name);

        // Simple dish categorization based on detected foods
        if (foodNames.includes('pizza')) {
            return { dishName: "Pizza", cuisineType: "Italian", cookingMethod: "Baked" };
        }
        if (foodNames.includes('burger') || foodNames.includes('bread')) {
            return { dishName: "Sandwich/Burger", cuisineType: "American", cookingMethod: "Assembled" };
        }
        if (foodNames.includes('chicken') || foodNames.includes('beef') || foodNames.includes('fish')) {
            return { dishName: "Protein Dish", cuisineType: "Mixed", cookingMethod: "Various" };
        }
        if (foodNames.some(name => ['apple', 'banana', 'orange', 'grape'].includes(name))) {
            return { dishName: "Fruit", cuisineType: "Fresh Produce", cookingMethod: "Raw" };
        }
        if (foodNames.some(name => ['carrot', 'broccoli', 'spinach'].includes(name))) {
            return { dishName: "Vegetables", cuisineType: "Fresh Produce", cookingMethod: "Raw" };
        }

        return { dishName: "Mixed Foods", cuisineType: "Various", cookingMethod: "Unknown" };
    }
}

module.exports = BasicFoodAnalyzer;
