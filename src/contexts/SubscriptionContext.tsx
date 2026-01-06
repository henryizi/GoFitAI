import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RevenueCatService, SubscriptionInfo } from '../services/subscription/RevenueCatService';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export type SubscriptionState = {
  isPremium: boolean;
  remainingRecipes: number;
  remainingChatMessages: number;
  subscriptionInfo: SubscriptionInfo | null;
  isLoading: boolean;
  useRecipe: () => boolean;
  useChatMessage: () => boolean;
  openPaywall: () => void;
  refreshSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionState | null>(null);

// No free tier - paid users only

function getDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function readUsage(): Promise<any | null> {
  try {
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      const raw = (globalThis as any).localStorage.getItem('sb_usage');
      return raw ? JSON.parse(raw) : null;
    }
    const raw = await AsyncStorage.getItem('sb_usage');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeUsage(value: any): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem('sb_usage', serialized);
      return;
    }
    await AsyncStorage.setItem('sb_usage', serialized);
  } catch {}
}

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [remainingRecipes, setRemainingRecipes] = useState(0); // Not used - paid users only
  const [remainingChatMessages, setRemainingChatMessages] = useState(0); // Not used - paid users only
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start as false to not block UI

  // Development bypass: treat user as premium in development
  const isDevelopment = __DEV__;
  const bypassPaywall = false; // DISABLED FOR REAL PREMIUM CHECKING

  // Helper function to add timeout to async operations
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  };

  // Initialize RevenueCat and load subscription status
  const initializeSubscription = useCallback(async () => {
    try {
      setIsLoading(true);

      // Development bypass: automatically set as premium in development
      if (bypassPaywall) {
        console.log('[Subscription] 🚀 DEVELOPMENT MODE: User set as premium');
        setIsPremium(true);
        setRemainingRecipes(Infinity); // Unlimited recipes
        setRemainingChatMessages(Infinity); // Unlimited chat
        setSubscriptionInfo({
          isPremium: true,
          productId: 'dev_premium',
          expirationDate: null, // Never expires in dev mode
          willRenew: false,
          periodType: 'lifetime',
        });
        setIsLoading(false);
        return;
      }

      // Initialize RevenueCat if not already done (with shorter timeout)
      try {
        await withTimeout(
          RevenueCatService.ensureInitialized(),
          2000, // Reduced to 2 seconds
          'RevenueCat initialization timed out'
        );
      } catch (initError) {
        console.warn('[Subscription] RevenueCat initialization failed or timed out:', initError);
        // Continue anyway - user can still use the app without premium features
      }

      // If user is logged in, ensure RevenueCat has identified them before checking premium
      if (user?.id) {
        console.log('[Subscription] User logged in, ensuring RevenueCat user identification...');
        try {
          await withTimeout(
            RevenueCatService.setUserId(user.id),
            3000, // Give it 3 seconds to identify user
            'RevenueCat user identification timed out'
          );
          // Wait a bit for RevenueCat to sync after user identification
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (userIdError) {
          console.warn('[Subscription] RevenueCat user identification failed or timed out:', userIdError);
          // Continue anyway - might still work
        }
      }

      // Check premium status (with shorter timeout)
      try {
        const premium = await withTimeout(
          RevenueCatService.isPremiumActive(),
          3000, // Increased to 3 seconds to allow RevenueCat to sync
          'Premium status check timed out'
        );
        console.log('[Subscription] Premium check result:', premium);
        setIsPremium(premium);

        // Get detailed subscription info (non-blocking, don't wait if it fails)
        RevenueCatService.getSubscriptionInfo()
          .then(subInfo => {
            setSubscriptionInfo(subInfo);
          })
          .catch(infoError => {
            console.warn('[Subscription] Failed to get subscription info:', infoError);
            // Continue with default values
          });

        console.log('[Subscription] Premium status:', premium);
      } catch (premiumError) {
        console.warn('[Subscription] Failed to check premium status:', premiumError);
        // Default to non-premium on error
        setIsPremium(false);
        setSubscriptionInfo(null);
      }

    } catch (error) {
      console.error('[Subscription] Failed to initialize:', error);
      // Default to non-premium on error
      setIsPremium(false);
      setSubscriptionInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [bypassPaywall]);

  useEffect(() => {
    let isMounted = true;
    let safetyTimer: NodeJS.Timeout | null = null;
    
    // Initialize subscription on mount
    initializeSubscription().catch((error) => {
      console.error('[Subscription] Unhandled error in initialization:', error);
      if (isMounted) {
        setIsLoading(false);
        setIsPremium(false);
        setSubscriptionInfo(null);
      }
    });
    
    // Safety timeout: Ensure loading always clears after 8 seconds max
    safetyTimer = setTimeout(() => {
      if (isMounted) {
        // Use a function to get the latest state
        setIsLoading((currentLoading) => {
          if (currentLoading) {
            console.warn('[Subscription] Safety timeout: Clearing loading state after 8 seconds');
            return false;
          }
          return currentLoading;
        });
      }
    }, 8000);
    
      // No usage tracking needed - paid users only
    
    return () => {
      isMounted = false;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
      }
    };
  }, [initializeSubscription]);

  // Re-check premium status when user changes (e.g., after login)
  useEffect(() => {
    if (user?.id) {
      console.log('[Subscription] User changed, re-checking premium status for user:', user.id);
      // Wait a bit for RevenueCat to identify the user, then re-check
      const timer = setTimeout(async () => {
        try {
          // Ensure user is identified in RevenueCat
          await RevenueCatService.setUserId(user.id);
          // Wait for sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Re-check premium status
          const premium = await RevenueCatService.isPremiumActive();
          console.log('[Subscription] Re-checked premium status after user change:', premium);
          setIsPremium(premium);
          
          // Also update subscription info
          const subInfo = await RevenueCatService.getSubscriptionInfo();
          setSubscriptionInfo(subInfo);
        } catch (error) {
          console.warn('[Subscription] Failed to re-check premium status after user change:', error);
        }
      }, 2000); // Wait 2 seconds after user change
      
      return () => clearTimeout(timer);
    } else {
      // User logged out, reset premium status
      setIsPremium(false);
      setSubscriptionInfo(null);
    }
  }, [user?.id]);

  // Helper function to persist usage data
  const persist = async (key: string, recipes: number, chat: number) => {
    await writeUsage({ key, recipes, chat });
  };

  // Use a recipe (paid users only - unlimited)
  const useRecipe = useCallback((): boolean => {
    // Only premium users can use recipes
    if (isPremium || bypassPaywall) return true;
    return false;
  }, [isPremium, bypassPaywall]);

  // Use a chat message (paid users only - unlimited)
  const useChatMessage = useCallback((): boolean => {
    // Only premium users can use chat
    if (isPremium || bypassPaywall) return true;
    return false;
  }, [isPremium, bypassPaywall]);

  // Open the paywall screen
  const openPaywall = useCallback(() => {
    router.push('/paywall');
  }, []);

  // Refresh subscription status
  const refreshSubscription = useCallback(async () => {
    await initializeSubscription();
  }, [initializeSubscription]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await RevenueCatService.restorePurchases();
      
      if (result.success) {
        // Refresh subscription status after restore
        await initializeSubscription();
        Alert.alert('Success', 'Purchases restored successfully!');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      console.error('[Subscription] Restore purchases failed:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [initializeSubscription]);

  const value = {
    isPremium,
    remainingRecipes,
    remainingChatMessages,
    subscriptionInfo,
    isLoading,
    useRecipe,
    useChatMessage,
    openPaywall,
    refreshSubscription,
    restorePurchases,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};























