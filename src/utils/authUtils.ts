import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility functions for auth troubleshooting
 */

export const clearAuthStorage = async () => {
  try {
    console.log('🧹 Clearing all auth-related storage...');
    
    // Clear Supabase auth tokens
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session') ||
      key.includes('token')
    );
    
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log('✅ Cleared auth keys:', authKeys);
    } else {
      console.log('ℹ️ No auth keys found in storage');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing auth storage:', error);
    return false;
  }
};

export const debugAuthStorage = async () => {
  try {
    console.log('🔍 Debugging auth storage...');
    
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session') ||
      key.includes('token')
    );
    
    console.log('Auth-related keys found:', authKeys);
    
    for (const key of authKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`${key}:`, value ? 'has value' : 'empty');
    }
    
    return authKeys;
  } catch (error) {
    console.error('❌ Error debugging auth storage:', error);
    return [];
  }
};




