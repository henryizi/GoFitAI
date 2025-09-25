import { useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RevenueCatService, SubscriptionInfo } from '../services/subscription/RevenueCatService';
import { router } from 'expo-router';

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

const FREE_RECIPES_PER_DAY = 5; // Reduced for non-premium users
const FREE_CHAT_PER_DAY = 10; // Reduced for non-premium users // Unlimited for development

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

export function useSubscription(): SubscriptionState {
  const [isPremium, setIsPremium] = useState(false);
  const [remainingRecipes, setRemainingRecipes] = useState(FREE_RECIPES_PER_DAY);
  const [remainingChatMessages, setRemainingChatMessages] = useState(FREE_CHAT_PER_DAY);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Development bypass: treat user as premium in development
  const isDevelopment = __DEV__;
  const bypassPaywall = isDevelopment;

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

      // Initialize RevenueCat if not already done
      // Note: RevenueCat should already be initialized by useAuth when user logs in
      await RevenueCatService.ensureInitialized();

      // Check premium status
      const premium = await RevenueCatService.isPremiumActive();
      setIsPremium(premium);

      // Get detailed subscription info
      const subInfo = await RevenueCatService.getSubscriptionInfo();
      setSubscriptionInfo(subInfo);

      console.log('[Subscription] Premium status:', premium);

    } catch (error) {
      console.error('[Subscription] Failed to initialize:', error);
      // Default to free tier on error
      setIsPremium(false);
      setSubscriptionInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [bypassPaywall]);

  useEffect(() => {
    // Initialize subscription on mount
    initializeSubscription();
    
    // Load usage data
    const key = getDayKey();
    (async () => {
      const saved = await readUsage();
      if (saved?.key === key) {
        setRemainingRecipes(saved.recipes ?? FREE_RECIPES_PER_DAY);
        setRemainingChatMessages(saved.chat ?? FREE_CHAT_PER_DAY);
      } else {
        persist(key, FREE_RECIPES_PER_DAY, FREE_CHAT_PER_DAY);
      }
    })();
  }, [initializeSubscription]);

  // Helper function to persist usage data
  const persist = async (key: string, recipes: number, chat: number) => {
    await writeUsage({ key, recipes, chat });
  };

  // Use a recipe (decrements count for free users)
  const useRecipe = (): boolean => {
    if (isPremium || bypassPaywall) return true;

    if (remainingRecipes <= 0) return false;

    const newCount = remainingRecipes - 1;
    setRemainingRecipes(newCount);

    // Persist the updated count
    const key = getDayKey();
    persist(key, newCount, remainingChatMessages);

    return true;
  };

  // Use a chat message (decrements count for free users)
  const useChatMessage = (): boolean => {
    if (isPremium || bypassPaywall) return true;

    if (remainingChatMessages <= 0) return false;

    const newCount = remainingChatMessages - 1;
    setRemainingChatMessages(newCount);

    // Persist the updated count
    const key = getDayKey();
    persist(key, remainingRecipes, newCount);

    return true;
  };

  // Open the paywall screen
  const openPaywall = () => {
    router.push('/paywall');
  };

  // Refresh subscription status
  const refreshSubscription = async () => {
    await initializeSubscription();
  };

  // Restore purchases
  const restorePurchases = async () => {
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
  };

  return {
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
} 