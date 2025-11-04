import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility function to clear cached workout and nutrition data for a specific user
 * Useful for testing with fresh user accounts
 */
export const clearUserData = async (userId: string) => {
  try {
    console.log(`[ClearUserData] Clearing cached data for user: ${userId}`);
    
    // Clear workout plans for this user
    const workoutKey = `workoutPlans:${userId}`;
    await AsyncStorage.removeItem(workoutKey);
    console.log(`[ClearUserData] Cleared workout plans: ${workoutKey}`);
    
    // Clear nutrition plans for this user
    const nutritionKey = `nutritionPlans:${userId}`;
    await AsyncStorage.removeItem(nutritionKey);
    console.log(`[ClearUserData] Cleared nutrition plans: ${nutritionKey}`);
    
    // Clear any other user-specific cached data
    const userKeys = [
      `user_profile:${userId}`,
      `user_preferences:${userId}`,
      `workout_history:${userId}`,
      `nutrition_history:${userId}`
    ];
    
    for (const key of userKeys) {
      await AsyncStorage.removeItem(key);
      console.log(`[ClearUserData] Cleared: ${key}`);
    }
    
    console.log(`[ClearUserData] Successfully cleared all cached data for user: ${userId}`);
  } catch (error) {
    console.error(`[ClearUserData] Error clearing data for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Clear ALL cached data (useful for complete app reset during development)
 */
export const clearAllCachedData = async () => {
  try {
    console.log('[ClearUserData] Clearing ALL cached data...');
    
    // Get all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter for app-specific keys (avoid clearing system keys)
    const appKeys = allKeys.filter(key => 
      key.startsWith('workoutPlans:') ||
      key.startsWith('nutritionPlans:') ||
      key.startsWith('user_profile:') ||
      key.startsWith('user_preferences:') ||
      key.startsWith('workout_history:') ||
      key.startsWith('nutrition_history:')
    );
    
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
      console.log(`[ClearUserData] Cleared ${appKeys.length} cached items:`, appKeys);
    } else {
      console.log('[ClearUserData] No app-specific cached data found');
    }
    
    console.log('[ClearUserData] Successfully cleared all cached data');
  } catch (error) {
    console.error('[ClearUserData] Error clearing all cached data:', error);
    throw error;
  }
};




