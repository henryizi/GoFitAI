import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MealRating {
  mealId: string;
  mealName: string;
  mealType: string;
  rating: 'liked' | 'disliked';
  timestamp: string;
  userId?: string;
}

export interface MealPreferences {
  ratings: MealRating[];
  likedMeals: string[];
  dislikedMeals: string[];
  lastUpdated: string;
}

export class MealPreferenceService {
  private static readonly STORAGE_KEY = 'meal_preferences';

  /**
   * Get all meal preferences for the current user
   */
  static async getMealPreferences(userId?: string): Promise<MealPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return {
          ratings: [],
          likedMeals: [],
          dislikedMeals: [],
          lastUpdated: new Date().toISOString()
        };
      }

      const preferences: MealPreferences = JSON.parse(stored);
      
      // Filter by userId if provided
      if (userId) {
        const userRatings = preferences.ratings.filter(r => r.userId === userId);
        return {
          ...preferences,
          ratings: userRatings,
          likedMeals: userRatings.filter(r => r.rating === 'liked').map(r => r.mealId),
          dislikedMeals: userRatings.filter(r => r.rating === 'disliked').map(r => r.mealId)
        };
      }

      return preferences;
    } catch (error) {
      console.error('[MealPreferenceService] Error getting preferences:', error);
      return {
        ratings: [],
        likedMeals: [],
        dislikedMeals: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Rate a meal as liked or disliked
   */
  static async rateMeal(
    mealId: string,
    mealName: string,
    mealType: string,
    rating: 'liked' | 'disliked',
    userId?: string
  ): Promise<boolean> {
    try {
      const preferences = await this.getMealPreferences();
      
      // Remove any existing rating for this meal
      const filteredRatings = preferences.ratings.filter(r => 
        !(r.mealId === mealId && r.userId === userId)
      );

      // Add new rating
      const newRating: MealRating = {
        mealId,
        mealName,
        mealType,
        rating,
        timestamp: new Date().toISOString(),
        userId
      };

      filteredRatings.push(newRating);

      // Update preferences
      const updatedPreferences: MealPreferences = {
        ratings: filteredRatings,
        likedMeals: filteredRatings.filter(r => r.rating === 'liked').map(r => r.mealId),
        dislikedMeals: filteredRatings.filter(r => r.rating === 'disliked').map(r => r.mealId),
        lastUpdated: new Date().toISOString()
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPreferences));
      console.log(`[MealPreferenceService] Meal ${mealName} rated as ${rating}`);
      return true;
    } catch (error) {
      console.error('[MealPreferenceService] Error rating meal:', error);
      return false;
    }
  }

  /**
   * Remove rating for a meal
   */
  static async removeRating(mealId: string, userId?: string): Promise<boolean> {
    try {
      const preferences = await this.getMealPreferences();
      
      const filteredRatings = preferences.ratings.filter(r => 
        !(r.mealId === mealId && r.userId === userId)
      );

      const updatedPreferences: MealPreferences = {
        ratings: filteredRatings,
        likedMeals: filteredRatings.filter(r => r.rating === 'liked').map(r => r.mealId),
        dislikedMeals: filteredRatings.filter(r => r.rating === 'disliked').map(r => r.mealId),
        lastUpdated: new Date().toISOString()
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPreferences));
      console.log(`[MealPreferenceService] Rating removed for meal ${mealId}`);
      return true;
    } catch (error) {
      console.error('[MealPreferenceService] Error removing rating:', error);
      return false;
    }
  }

  /**
   * Get meal rating for a specific meal
   */
  static async getMealRating(mealId: string, userId?: string): Promise<'liked' | 'disliked' | null> {
    try {
      const preferences = await this.getMealPreferences(userId);
      const rating = preferences.ratings.find(r => r.mealId === mealId);
      return rating ? rating.rating : null;
    } catch (error) {
      console.error('[MealPreferenceService] Error getting meal rating:', error);
      return null;
    }
  }

  /**
   * Get all liked meals for recommendations
   */
  static async getLikedMeals(userId?: string): Promise<MealRating[]> {
    try {
      const preferences = await this.getMealPreferences(userId);
      return preferences.ratings.filter(r => r.rating === 'liked');
    } catch (error) {
      console.error('[MealPreferenceService] Error getting liked meals:', error);
      return [];
    }
  }

  /**
   * Get all disliked meals to avoid in future recommendations
   */
  static async getDislikedMeals(userId?: string): Promise<MealRating[]> {
    try {
      const preferences = await this.getMealPreferences(userId);
      return preferences.ratings.filter(r => r.rating === 'disliked');
    } catch (error) {
      console.error('[MealPreferenceService] Error getting disliked meals:', error);
      return [];
    }
  }

  /**
   * Get meal preferences statistics
   */
  static async getPreferencesStats(userId?: string): Promise<{
    totalRatings: number;
    likedCount: number;
    dislikedCount: number;
    favoriteType: string | null;
  }> {
    try {
      const preferences = await this.getMealPreferences(userId);
      const likedCount = preferences.ratings.filter(r => r.rating === 'liked').length;
      const dislikedCount = preferences.ratings.filter(r => r.rating === 'disliked').length;
      
      // Find most liked meal type
      const mealTypeCounts = preferences.ratings
        .filter(r => r.rating === 'liked')
        .reduce((acc, rating) => {
          acc[rating.mealType] = (acc[rating.mealType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      const favoriteType = Object.keys(mealTypeCounts).length > 0 
        ? Object.entries(mealTypeCounts).sort(([,a], [,b]) => b - a)[0][0]
        : null;

      return {
        totalRatings: preferences.ratings.length,
        likedCount,
        dislikedCount,
        favoriteType
      };
    } catch (error) {
      console.error('[MealPreferenceService] Error getting stats:', error);
      return {
        totalRatings: 0,
        likedCount: 0,
        dislikedCount: 0,
        favoriteType: null
      };
    }
  }

  /**
   * Get daily meal plan from storage
   */
  static async getDailyMealPlan(userId: string, dateString: string): Promise<any[] | null> {
    try {
      const storageKey = `daily_meal_plan_${userId}_${dateString}`;
      const stored = await AsyncStorage.getItem(storageKey);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('[MealPreferenceService] Error getting daily meal plan:', error);
      return null;
    }
  }

  /**
   * Store daily meal plan to storage
   */
  static async storeDailyMealPlan(userId: string, dateString: string, mealPlan: any[]): Promise<boolean> {
    try {
      const storageKey = `daily_meal_plan_${userId}_${dateString}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(mealPlan));
      console.log(`[MealPreferenceService] Daily meal plan stored for ${dateString}`);
      return true;
    } catch (error) {
      console.error('[MealPreferenceService] Error storing daily meal plan:', error);
      return false;
    }
  }

  /**
   * Clear all meal preferences (for testing or user reset)
   */
  static async clearAllPreferences(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('[MealPreferenceService] All preferences cleared');
      return true;
    } catch (error) {
      console.error('[MealPreferenceService] Error clearing preferences:', error);
      return false;
    }
  }
}
