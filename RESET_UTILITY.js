// TEMPORARY RESET UTILITY
// Add this to your app temporarily to clear all data
// Remove after testing is complete

import AsyncStorage from '@react-native-async-async-storage/async-storage';
import { Alert } from 'react-native';

export const ResetUtility = {
  /**
   * Clear all app data and reset to default state
   */
  async clearAllData() {
    try {
      console.log('[RESET] Starting complete app reset...');
      
      // Clear all AsyncStorage data
      await AsyncStorage.clear();
      console.log('[RESET] AsyncStorage cleared');
      
      // Clear any cached data
      if (global.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        global.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.clear();
      }
      
      console.log('[RESET] All data cleared successfully');
      
      // Show success message
      Alert.alert(
        'Reset Complete',
        'All app data has been cleared. The app will now show default state.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reload the app
              if (global.reload) {
                global.reload();
              }
            }
          }
        ]
      );
      
      return true;
    } catch (error) {
      console.error('[RESET] Error clearing data:', error);
      Alert.alert('Reset Failed', 'There was an error clearing the data.');
      return false;
    }
  },

  /**
   * Show reset confirmation dialog
   */
  showResetConfirmation() {
    Alert.alert(
      'Reset App to Default',
      'This will delete ALL your data including:\n\n• Workout plans\n• Weight logs\n• Body fat data\n• Progress photos\n• User settings\n\nThis action cannot be undone. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => this.clearAllData()
        }
      ]
    );
  },

  /**
   * Quick reset for development testing
   */
  async quickReset() {
    try {
      // Clear specific keys that might contain user data
      const keysToRemove = [
        '@user_profile',
        '@workout_plans',
        '@weight_logs',
        '@body_fat_logs',
        '@progress_photos',
        '@user_settings',
        '@analytics_data',
        '@recent_activities'
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('[QUICK RESET] User data cleared');
      
      Alert.alert('Quick Reset Complete', 'User data has been cleared.');
      return true;
    } catch (error) {
      console.error('[QUICK RESET] Error:', error);
      return false;
    }
  },

  /**
   * Comprehensive reset that clears ALL data sources
   * - AsyncStorage (local data)
   * - Supabase Database (workout plans, nutrition, progress, etc.)
   * - Supabase Storage (body photos)
   */
  async comprehensiveReset(userId) {
    try {
      console.log('[RESET] Starting comprehensive reset for user:', userId);
      
      // 1. Clear AsyncStorage
      await AsyncStorage.clear();
      console.log('[RESET] AsyncStorage cleared');
      
      // 2. Clear Supabase Database (if available)
      if (typeof supabase !== 'undefined' && supabase) {
        console.log('[RESET] Clearing Supabase database...');
        
        // Delete workout plans and related data
        await supabase.from('workout_sessions').delete().eq('plan_id', 'any');
        await supabase.from('training_splits').delete().eq('plan_id', 'any');
        await supabase.from('exercises').delete().eq('plan_id', 'any');
        await supabase.from('workout_plans').delete().eq('user_id', userId);
        console.log('[RESET] Workout plans deleted');
        
        // Delete nutrition plans
        await supabase.from('nutrition_plans').delete().eq('user_id', userId);
        console.log('[RESET] Nutrition plans deleted');
        
        // Delete progress entries and photos
        await supabase.from('progress_entries').delete().eq('user_id', userId);
        await supabase.from('body_photos').delete().eq('user_id', userId);
        await supabase.from('body_analysis').delete().eq('user_id', userId);
        console.log('[RESET] Progress data deleted');
        
        // Delete daily metrics
        await supabase.from('daily_user_metrics').delete().eq('user_id', userId);
        console.log('[RESET] Daily metrics deleted');
        
        // Delete food entries
        await supabase.from('food_entries').delete().eq('user_id', userId);
        console.log('[RESET] Food entries deleted');
        
        // Delete meal plan suggestions
        await supabase.from('meal_plan_suggestions').delete().eq('user_id', userId);
        console.log('[RESET] Meal plan suggestions deleted');
      }
      
      // 3. Clear Supabase Storage (body photos)
      if (typeof supabase !== 'undefined' && supabase) {
        try {
          console.log('[RESET] Clearing Supabase storage...');
          const { data: photos } = await supabase.storage
            .from('body-photos')
            .list(userId);
          
          if (photos && photos.length > 0) {
            const filesToDelete = photos.map(photo => `${userId}/${photo.name}`);
            await supabase.storage
              .from('body-photos')
              .remove(filesToDelete);
            console.log('[RESET] Storage photos deleted');
          }
        } catch (storageError) {
          console.warn('[RESET] Storage clear error (may be empty):', storageError);
        }
      }
      
      console.log('[RESET] Comprehensive reset completed successfully');
      
      Alert.alert(
        'Reset Complete',
        'All app data has been cleared from:\n\n• Local storage\n• Database\n• Photo storage\n\nThe app will now show default state.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reload the app
              if (global.reload) {
                global.reload();
              }
            }
          }
        ]
      );
      
      return true;
    } catch (error) {
      console.error('[RESET] Error in comprehensive reset:', error);
      Alert.alert('Reset Failed', 'There was an error clearing the data. Please try again.');
      return false;
    }
  }
};

// Usage examples:
// 
// 1. Add a reset button to your settings screen:
// <Button title="Reset App" onPress={() => ResetUtility.showResetConfirmation()} />
//
// 2. Quick reset for development:
// ResetUtility.quickReset();
//
// 3. Complete reset:
// ResetUtility.clearAllData();
//
// 4. Comprehensive reset (includes database):
// ResetUtility.comprehensiveReset(userId);
