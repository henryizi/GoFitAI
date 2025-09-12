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
  // Store daily meal plan for a specific date
  static async storeDailyMealPlan(userId: string, dateString: string, mealPlan: any[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('daily_meal_plans')
        .upsert({
          user_id: userId,
          date: dateString,
          meal_plan: mealPlan,
          created_at: new Date().toISOString(),
        });

      return !error;
    } catch (error) {
      console.error('Error storing daily meal plan:', error);
      return false;
    }
  }

  // Get daily meal plan for a specific date
  static async getDailyMealPlan(userId: string, dateString: string): Promise<any[] | null> {
    try {
      const { data, error } = await supabase
        .from('daily_meal_plans')
        .select('meal_plan')
        .eq('user_id', userId)
        .eq('date', dateString)
        .single();

      if (error || !data) return null;
      return data.meal_plan;
    } catch (error) {
      console.error('Error getting daily meal plan:', error);
      return null;
    }
  }

  // Get meal rating for a specific meal
  static async getMealRating(mealId: string, userId: string): Promise<'liked' | 'disliked' | null> {
    try {
      const { data, error } = await supabase
        .from('meal_ratings')
        .select('rating')
        .eq('meal_id', mealId)
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return data.rating as 'liked' | 'disliked';
    } catch (error) {
      console.error('Error getting meal rating:', error);
      return null;
    }
  }

  // Rate a meal
  static async rateMeal(
    mealId: string,
    mealDescription: string,
    mealType: string,
    rating: 'liked' | 'disliked',
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_ratings')
        .upsert({
          meal_id: mealId,
          user_id: userId,
          meal_description: mealDescription,
          meal_type: mealType,
          rating: rating,
          created_at: new Date().toISOString(),
        });

      return !error;
    } catch (error) {
      console.error('Error rating meal:', error);
      return false;
    }
  }

  // Remove meal rating
  static async removeRating(mealId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_ratings')
        .delete()
        .eq('meal_id', mealId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error removing meal rating:', error);
      return false;
    }
  }
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
