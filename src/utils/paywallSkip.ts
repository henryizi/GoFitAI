import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if user has skipped the paywall
 */
export async function hasSkippedPaywall(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const skipKey = `paywall_skipped_${userId}`;
    let skipData: string | null = null;
    
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      skipData = (globalThis as any).localStorage.getItem(skipKey);
    } else {
      skipData = await AsyncStorage.getItem(skipKey);
    }
    
    if (!skipData) return false;
    
    const parsed = JSON.parse(skipData);
    return parsed.skipped === true && parsed.userId === userId;
  } catch (error) {
    console.warn('⚠️ Failed to check skipped paywall state:', error);
    return false;
  }
}

/**
 * Clear skipped paywall state (e.g., on logout)
 */
export async function clearSkippedPaywall(userId: string | undefined): Promise<void> {
  if (!userId) return;
  
  try {
    const skipKey = `paywall_skipped_${userId}`;
    
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.removeItem(skipKey);
    } else {
      await AsyncStorage.removeItem(skipKey);
    }
  } catch (error) {
    console.warn('⚠️ Failed to clear skipped paywall state:', error);
  }
}


