import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionState = {
  isPremium: boolean;
  remainingRecipes: number;
  remainingChatMessages: number;
  useRecipe: () => boolean;
  useChatMessage: () => boolean;
  openPaywall: () => void;
};

const FREE_RECIPES_PER_DAY = 999; // Unlimited for development
const FREE_CHAT_PER_DAY = 999; // Unlimited for development

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
  const [isPremium, setIsPremium] = useState(true); // Enable premium for development
  const [remainingRecipes, setRemainingRecipes] = useState(FREE_RECIPES_PER_DAY);
  const [remainingChatMessages, setRemainingChatMessages] = useState(FREE_CHAT_PER_DAY);

  useEffect(() => {
    // TODO: load from user profile in Supabase; default false for now
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
  }, []);

  const persist = (key: string, recipes: number, chat: number) => {
    writeUsage({ key, recipes, chat });
  };

  const useRecipe = () => {
    if (isPremium) return true;
    const key = getDayKey();
    if (remainingRecipes <= 0) return false;
    const next = remainingRecipes - 1;
    setRemainingRecipes(next);
    persist(key, next, remainingChatMessages);
    return true;
  };

  const useChatMessage = () => {
    if (isPremium) return true;
    const key = getDayKey();
    if (remainingChatMessages <= 0) return false;
    const next = remainingChatMessages - 1;
    setRemainingChatMessages(next);
    persist(key, remainingRecipes, next);
    return true;
  };

  const openPaywall = () => {
    // placeholder
    alert('Upgrade to Premium for unlimited AI');
  };

  return { isPremium, remainingRecipes, remainingChatMessages, useRecipe, useChatMessage, openPaywall };
} 