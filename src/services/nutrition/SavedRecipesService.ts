import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedRecipe {
  id: string;
  recipe_name: string;
  meal_type: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  macros: {
    calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
  };
  description?: string;
  saved_at: string;
  userId?: string;
}

export class SavedRecipesService {
  private static readonly STORAGE_KEY = 'saved_recipes';

  /**
   * Get all saved recipes for a user
   */
  static async getSavedRecipes(userId?: string): Promise<SavedRecipe[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return [];
      }

      const recipes: SavedRecipe[] = JSON.parse(data);
      
      // Filter by userId if provided
      if (userId) {
        return recipes.filter(r => !r.userId || r.userId === userId);
      }
      
      return recipes;
    } catch (error) {
      console.error('[SavedRecipesService] Error getting saved recipes:', error);
      return [];
    }
  }

  /**
   * Save a recipe
   */
  static async saveRecipe(meal: any, userId?: string): Promise<boolean> {
    try {
      const recipes = await this.getSavedRecipes();
      
      // Check if recipe already exists (by recipe name and meal type)
      const existingIndex = recipes.findIndex(
        r => r.recipe_name === meal.recipe_name && 
             r.meal_type === meal.meal_type
      );

      const savedRecipe: SavedRecipe = {
        id: meal.id || `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        recipe_name: meal.recipe_name || meal.name || 'Unnamed Recipe',
        meal_type: meal.meal_type || 'meal',
        prep_time: meal.prep_time,
        cook_time: meal.cook_time,
        servings: meal.servings || 1,
        ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
        instructions: Array.isArray(meal.instructions) ? meal.instructions : [],
        macros: {
          calories: meal.macros?.calories ?? meal.calories ?? 0,
          protein_grams: meal.macros?.protein_grams ?? meal.macros?.protein ?? meal.protein_grams ?? meal.protein ?? 0,
          carbs_grams: meal.macros?.carbs_grams ?? meal.macros?.carbs ?? meal.carbs_grams ?? meal.carbs ?? 0,
          fat_grams: meal.macros?.fat_grams ?? meal.macros?.fat ?? meal.fat_grams ?? meal.fat ?? 0,
        },
        description: meal.description,
        saved_at: new Date().toISOString(),
        userId
      };

      if (existingIndex !== -1) {
        // Update existing recipe
        recipes[existingIndex] = savedRecipe;
      } else {
        // Add new recipe
        recipes.push(savedRecipe);
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(recipes));
      console.log(`[SavedRecipesService] Recipe "${savedRecipe.recipe_name}" saved`);
      return true;
    } catch (error) {
      console.error('[SavedRecipesService] Error saving recipe:', error);
      return false;
    }
  }

  /**
   * Check if a recipe is saved
   */
  static async isRecipeSaved(recipeName: string, mealType: string, userId?: string): Promise<boolean> {
    try {
      const recipes = await this.getSavedRecipes(userId);
      return recipes.some(
        r => r.recipe_name === recipeName && r.meal_type === mealType
      );
    } catch (error) {
      console.error('[SavedRecipesService] Error checking if recipe is saved:', error);
      return false;
    }
  }

  /**
   * Remove a saved recipe
   */
  static async removeRecipe(recipeName: string, mealType: string, userId?: string): Promise<boolean> {
    try {
      const recipes = await this.getSavedRecipes();
      const filtered = recipes.filter(
        r => !(r.recipe_name === recipeName && r.meal_type === mealType && (!userId || r.userId === userId))
      );
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log(`[SavedRecipesService] Recipe "${recipeName}" removed`);
      return true;
    } catch (error) {
      console.error('[SavedRecipesService] Error removing recipe:', error);
      return false;
    }
  }
}


























