
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Alert, Text, ActivityIndicator, Image } from 'react-native';
import { Divider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as globalColors } from '../../../src/styles/colors';
import { normalizeMealPlan } from '../../../src/utils/nutrition/mealNormalization';
import { TutorialWrapper } from '../../../src/components/tutorial/TutorialWrapper';
import { useTutorial } from '../../../src/contexts/TutorialContext';

// Modern, premium colors
const colors = {
  ...globalColors,
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  // Overriding textSecondary for this screen's specific look if needed, 
  // or we can remove these to use global. 
  // But 'rgba(235, 235, 245, 0.6)' is specific here.
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
};

const FOOD_SUGGESTIONS_LIBRARY = [
  {
    id: 'protein_power',
    title: 'Protein Power Bowl',
    description: 'Ideal when you still need a big protein boost without blowing up carbs.',
    foods: [
      '150g grilled chicken breast',
      '1 cup cooked quinoa',
      '1 cup roasted broccoli',
      '1 tbsp olive oil drizzle'
    ],
    macros: { calories: 520, protein: 45, carbs: 42, fat: 18 }
  },
  {
    id: 'carb_recharge',
    title: 'Clean Carb Recharge',
    description: 'Refill glycogen to fuel your next workout while keeping fat moderate.',
    foods: [
      '1 medium sweet potato',
      '120g baked salmon',
      '1 cup steamed green beans',
      '1 tbsp pumpkin seeds'
    ],
    macros: { calories: 480, protein: 32, carbs: 50, fat: 16 }
  },
  {
    id: 'healthy_fats',
    title: 'Healthy Fats Plate',
    description: 'Balances hormones and satiety when fat is the missing macro.',
    foods: [
      '2 whole eggs + 2 egg whites',
      '1/2 avocado',
      '30g mixed nuts',
      'Handful of cherry tomatoes'
    ],
    macros: { calories: 430, protein: 24, carbs: 16, fat: 30 }
  },
  {
    id: 'plant_power',
    title: 'Plant-Based Macro Pack',
    description: 'High-protein vegetarian option with slow carbs and fiber.',
    foods: [
      '1 cup lentil curry',
      '1 cup basmati rice',
      '1 cup roasted cauliflower',
      '1 tbsp tahini sauce'
    ],
    macros: { calories: 520, protein: 32, carbs: 72, fat: 14 }
  },
  {
    id: 'balanced_plate',
    title: 'Balanced Recovery Plate',
    description: 'Even split of macros for days when everything is slightly behind.',
    foods: [
      '120g turkey breast',
      '1 cup brown rice',
      '1 cup mixed veggies',
      '1 tbsp olive oil'
    ],
    macros: { calories: 500, protein: 38, carbs: 52, fat: 14 }
  },
];

type MacroKey = 'protein' | 'carbs' | 'fat';

const { width } = Dimensions.get('window');

const PlansScreen = () => {
  const { user } = useAuth();
  const { state: tutorialState } = useTutorial();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<any[]>([]); // Changed type to any[] as NutritionPlan is removed
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate] = useState(new Date());
  const [activePlan, setActivePlan] = useState<any | null>(null); // Changed type to any
  const [latestTargets, setLatestTargets] = useState<any | null>(null); // Latest historical targets
  const [showAllPlans, setShowAllPlans] = useState(false);
  
  // Cache refs to prevent unnecessary refetches
  const lastFetchTime = useRef<number>(0);
  const cachedPlans = useRef<any[]>([]);
  const cachedActivePlan = useRef<any | null>(null);
  const isFetching = useRef<boolean>(false);
  const CACHE_DURATION = 5000; // 5 seconds cache
  const [todayIntake, setTodayIntake] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [aiMeals, setAiMeals] = useState<any[]>([]);
  const [aiMealsMeta, setAiMealsMeta] = useState<{ cuisineVariety: string[]; cookingTips: string[]; provider?: string; fallback?: boolean }>({
    cuisineVariety: [],
    cookingTips: [],
    provider: undefined,
    fallback: undefined
  });
  const [regenRequestToken, setRegenRequestToken] = useState<string>('initial');
  const [lastAiMealsSignature, setLastAiMealsSignature] = useState<string | null>(null);
  
  // Use ref to track the last fetch key to prevent infinite loops
  const lastFetchKeyRef = useRef<string | null>(null);
  // Track if we loaded saved meals to prevent unnecessary fetch
  const loadedSavedMealsRef = useRef<boolean>(false);

  const normalizePreferenceList = useCallback((value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
    if (typeof value === 'object') {
      if (Array.isArray(value.dietary)) {
        return value.dietary
          .map((item: any) => (typeof item === 'string' ? item.trim() : String(item).trim()))
          .filter(Boolean);
      }
      if (typeof value.dietary === 'string') {
        return value.dietary
          .split(',')
          .map((item: any) => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  }, []);

  const getCuisinePreference = useCallback((preferences: any): string | undefined => {
    if (!preferences) return undefined;
    if (typeof preferences === 'object') {
      if (Array.isArray(preferences.favorite_cuisines) && preferences.favorite_cuisines.length > 0) {
        return preferences.favorite_cuisines[0];
      }
      if (typeof preferences.favorite_cuisine === 'string') {
        return preferences.favorite_cuisine;
      }
      if (typeof preferences.cuisine === 'string') {
        return preferences.cuisine;
      }
      if (typeof preferences.cuisine_preference === 'string') {
        return preferences.cuisine_preference;
      }
    }
    return undefined;
  }, []);

  const computeMealSignature = useCallback((meals: any[]): string => {
    if (!Array.isArray(meals) || meals.length === 0) return '';
    return meals
      .map((meal) => {
        const type = meal?.meal_type || '';
        const name = meal?.recipe_name || meal?.name || '';
        const desc = meal?.description || '';
        return `${type}|${name}|${desc}`;
      })
      .join('||');
  }, []);
  const [aiMealsLoading, setAiMealsLoading] = useState(false);
  const [aiMealsError, setAiMealsError] = useState<string | null>(null);
  const [aiMealsFetchKey, setAiMealsFetchKey] = useState<string | null>(null);
  const [aiMealsRefreshCounter, setAiMealsRefreshCounter] = useState(0);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);

  // Get the correct calorie target (prioritize goal-adjusted calories)
  const calorieTarget = useMemo(() => {
    // First priority: Latest historical targets (goal-adjusted calories)
    if (latestTargets?.daily_calories) {
      console.log('[NUTRITION] Using goal-adjusted calories from historical targets:', latestTargets.daily_calories);
      return latestTargets.daily_calories;
    }
    
    // Second priority: Metabolic calculations from active plan
    if (activePlan?.metabolic_calculations?.goal_calories) {
      console.log('[NUTRITION] Using goal-adjusted calories from metabolic calculations:', activePlan.metabolic_calculations.goal_calories);
      return activePlan.metabolic_calculations.goal_calories;
    }
    
    // Third priority: Adjusted calories (backward compatibility)
    if (activePlan?.metabolic_calculations?.adjusted_calories) {
      console.log('[NUTRITION] Using adjusted calories from metabolic calculations:', activePlan.metabolic_calculations.adjusted_calories);
      return activePlan.metabolic_calculations.adjusted_calories;
    }
    
    // Fallback: Daily targets calories (base calories)
    const fallbackCalories = activePlan?.daily_targets?.calories ?? 0;
    console.log('[NUTRITION] Falling back to base daily targets calories:', fallbackCalories);
    return fallbackCalories;
  }, [latestTargets, activePlan]);
 
  // If no user (auth disabled), still fetch using a guest id so created guest plans appear
  useEffect(() => {
    if (!user) {
      setIsLoading(true);
      fetchData();
    }
  }, [user]);
 
  // Persist and auto-reset today's intake based on date
  const INTAKE_STORAGE_KEY = 'nutrition_today_intake';
  const DATE_STORAGE_KEY = 'nutrition_today_date';
 
  const getTodayKey = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD (local)
  }, []);
 
  const scheduleMidnightReset = useCallback(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // next midnight
    const msUntilMidnight = midnight.getTime() - now.getTime();
 
    // Safety: cap at 24h
    const delay = Math.max(1000, Math.min(msUntilMidnight, 24 * 60 * 60 * 1000));
 
    const timer = setTimeout(async () => {
      // At midnight, reset intake and store new date
      const newDateKey = getTodayKey();
      await AsyncStorage.setItem(DATE_STORAGE_KEY, newDateKey);
      await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify({ calories: 0, protein: 0, carbs: 0, fat: 0 }));
      setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      // Reschedule for the following midnight
      scheduleMidnightReset();
    }, delay);
 
    return timer;
  }, []);
 
  // Load from storage on mount/focus and auto-reset if date changed
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;
 
    const loadOrResetIntake = async () => {
      try {
        const storedDate = await AsyncStorage.getItem(DATE_STORAGE_KEY);
        const todayKey = getTodayKey();
        if (storedDate !== todayKey) {
          // New day or first run → reset
          await AsyncStorage.setItem(DATE_STORAGE_KEY, todayKey);
          await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify({ calories: 0, protein: 0, carbs: 0, fat: 0 }));
          setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        } else {
          const saved = await AsyncStorage.getItem(INTAKE_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (
              typeof parsed?.calories === 'number' &&
              typeof parsed?.protein === 'number' &&
              typeof parsed?.carbs === 'number' &&
              typeof parsed?.fat === 'number'
            ) {
              setTodayIntake(parsed);
            } else {
              setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
            }
          } else {
            setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
          }
        }
      } catch (e) {
        setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
    };
 
    loadOrResetIntake();
    midnightTimer = scheduleMidnightReset();
 
    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [scheduleMidnightReset]);
 
  // Persist intake changes for today
  useEffect(() => {
    const persist = async () => {
      try {
        const todayKey = getTodayKey();
        const storedDate = await AsyncStorage.getItem(DATE_STORAGE_KEY);
        if (storedDate !== todayKey) return; // avoid writing across days
        await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(todayIntake));
      } catch {}
    };
    persist();
  }, [todayIntake]);

  // Fetch food entries from local storage
  const fetchFoodEntries = useCallback(async () => {
    try {
      const uid = user?.id || 'guest';
      const todayDate = new Date().toISOString().split('T')[0];
      const storageKey = `nutrition_log_${uid}_${todayDate}`;
      
      // Get existing entries for today
      const savedEntries = await AsyncStorage.getItem(storageKey);
      
      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        
        // Calculate totals from entries
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        entries.forEach((entry: any) => {
          totalCalories += entry.calories || 0;
          totalProtein += entry.protein_grams || 0;
          totalCarbs += entry.carbs_grams || 0;
          totalFat += entry.fat_grams || 0;
        });

        setTodayIntake({
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat
        });
        
        console.log('[NUTRITION] Loaded food entries:', entries.length, 'entries, total calories:', totalCalories);
      } else {
        // No entries for today, set to 0
        setTodayIntake({
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        });
        console.log('[NUTRITION] No food entries found for today');
      }
    } catch (error) {
      console.error('[NUTRITION] Error fetching food entries:', error);
      // Fallback to 0 if there's an error
      setTodayIntake({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      });
    }
  }, [user]);
  
  // Fetch food entries on focus
  useFocusEffect(
    useCallback(() => {
      console.log('[NUTRITION] Screen focused, fetching food entries');
      fetchFoodEntries();
    }, [fetchFoodEntries])
  );

  // Format the current date
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    // If tutorial is active, use instant mock data to avoid loading delays
    if (tutorialState.isActive) {
      console.log('[Nutrition] Tutorial active, using mock data');
      setPlans([{
        id: 'mock-plan-1',
        name: 'Muscle Gain Plan',
        created_at: new Date().toISOString(),
        plan_type: 'bulking',
        metabolic_calculations: {
          bmr: 1850,
          tdee: 2800,
          goal_calories: 3050,
          activity_level: 'moderately_active',
          goal_adjustment: 250
        },
        daily_targets: {
          calories: 3050,
          protein: 220,
          carbs: 350,
          fat: 85
        }
      }]);
      setActivePlan({
        id: 'mock-plan-1',
        name: 'Muscle Gain Plan',
        created_at: new Date().toISOString(),
        plan_type: 'bulking',
        metabolic_calculations: {
          bmr: 1850,
          tdee: 2800,
          goal_calories: 3050,
          activity_level: 'moderately_active',
          goal_adjustment: 250
        },
        daily_targets: {
          calories: 3050,
          protein: 220,
          carbs: 350,
          fat: 85
        }
      });
      setTodayIntake({
        calories: 1450,
        protein: 110,
        carbs: 180,
        fat: 45
      });
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const uid = user?.id || 'guest';
    
    // Check cache to prevent unnecessary refetches
    const now = Date.now();
    if (!isRefresh && cachedPlans.current.length > 0 && (now - lastFetchTime.current) < CACHE_DURATION) {
      setPlans(cachedPlans.current);
      if (cachedActivePlan.current) {
        setActivePlan(cachedActivePlan.current);
      }
      setIsLoading(false);
      // Still fetch food entries in background
      fetchFoodEntries().catch(() => {});
      return;
    }

    // Show cached data immediately while fetching (optimized UX)
    if (cachedPlans.current.length > 0) {
      setPlans(cachedPlans.current);
      if (cachedActivePlan.current) {
        setActivePlan(cachedActivePlan.current);
      }
      setIsLoading(false);
      // Fetch in background without blocking UI
    } else {
      // Only show loading if we have no cached data
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
    }
    
    if (isFetching.current) return;
    isFetching.current = true;
    
    setError(null);
    try {
      // Parallelize all data fetching operations
      const [plansResult, latestPlanResult] = await Promise.allSettled([
        NutritionService.getAllNutritionPlans(uid),
        NutritionService.getLatestNutritionPlan(uid)
      ]);
      
      const fetchedPlans = plansResult.status === 'fulfilled' ? plansResult.value : [];
      const latestPlan = latestPlanResult.status === 'fulfilled' ? latestPlanResult.value : null;
      
      console.log('[NUTRITION] 📋 Fetched plans count:', fetchedPlans.length);
      console.log('[NUTRITION] 📋 Fetched plans:', fetchedPlans.map(p => ({ 
        id: p.id, 
        name: p.plan_name || p.name, 
        type: p.plan_type, 
        status: p.status 
      })));
      console.log('[NUTRITION] 📋 Latest plan:', latestPlan ? { 
        id: latestPlan.id, 
        name: latestPlan.plan_name || latestPlan.name,
        type: latestPlan.plan_type,
        status: latestPlan.status 
      } : null);
      
      // Set active plan (can be null for new users)
      if (latestPlan) {
        setActivePlan(latestPlan);
        cachedActivePlan.current = latestPlan;
        
        // Sort plans so the active one is at the top
        const sortedPlans = [...fetchedPlans].sort((a, b) => {
          if (a.id === latestPlan.id) return -1;
          if (b.id === latestPlan.id) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        console.log('[NUTRITION] 📋 Setting plans in state:', sortedPlans.length);
        console.log('[NUTRITION] 📋 Plans being set:', sortedPlans.map(p => ({ 
          id: p.id, 
          name: p.plan_name || p.name,
          type: p.plan_type 
        })));
        setPlans(sortedPlans);
        cachedPlans.current = sortedPlans;
        lastFetchTime.current = now;

        // Fetch latest historical targets in background (non-blocking)
        if (latestPlan?.id) {
          NutritionService.getHistoricalNutritionTargets(latestPlan.id)
            .then(targets => {
              if (targets && targets.length > 0) {
                console.log('[NUTRITION] Latest targets:', targets[0]);
                setLatestTargets(targets[0]);
              }
            })
            .catch(err => {
              console.error('[NUTRITION] Error fetching historical targets:', err);
            });
        }
      } else {
        // No plan found - new users should create their own plan
        console.log('[NUTRITION] No active plan found - user needs to create one');
        setActivePlan(null);
        cachedActivePlan.current = null;
        console.log('[NUTRITION] 📋 No latest plan, setting all fetched plans:', fetchedPlans.length);
        setPlans(fetchedPlans);
        cachedPlans.current = fetchedPlans;
        lastFetchTime.current = now;
      }

      // Also fetch food entries to update progress (non-blocking)
      fetchFoodEntries().catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      // Don't show alert on every error - just log it
      console.error('[NUTRITION] Error loading data:', err);
      
      // Fallback to cached data if available
      if (cachedPlans.current.length > 0) {
        setPlans(cachedPlans.current);
        if (cachedActivePlan.current) {
          setActivePlan(cachedActivePlan.current);
        }
      }
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
      isFetching.current = false;
    }
  }, [user, fetchFoodEntries]);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      // Optimized: Only refresh if cache is stale (more than 2 seconds) to improve performance
      // This balances showing new plans quickly while avoiding unnecessary fetches
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      // Show cached data immediately if available
      if (cachedPlans.current.length > 0 && timeSinceLastFetch < 2000) {
        setPlans(cachedPlans.current);
        if (cachedActivePlan.current) {
          setActivePlan(cachedActivePlan.current);
        }
        setIsLoading(false);
        // Still refresh in background if cache is getting stale
        if (timeSinceLastFetch >= 1000) {
          fetchData(false);
        }
        return;
      }
      
      // Only clear cache and refresh if cache is stale or empty
      if (timeSinceLastFetch >= 2000 || cachedPlans.current.length === 0) {
        fetchData(false);
      }
    }, [fetchData])
  );

  // On focus, ensure the date hasn't changed; if it has, reset intake
  useFocusEffect(
    useCallback(() => {
      const ensureTodayIntakeIsCurrent = async () => {
        try {
          const todayKey = getTodayKey();
          const storedDate = await AsyncStorage.getItem(DATE_STORAGE_KEY);
          if (storedDate !== todayKey) {
            await AsyncStorage.setItem(DATE_STORAGE_KEY, todayKey);
            await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify({ calories: 0, protein: 0, carbs: 0, fat: 0 }));
            setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
          } else {
            const saved = await AsyncStorage.getItem(INTAKE_STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (
                typeof parsed?.calories === 'number' &&
                typeof parsed?.protein === 'number' &&
                typeof parsed?.carbs === 'number' &&
                typeof parsed?.fat === 'number'
              ) {
                setTodayIntake(parsed);
              }
            }
          }
        } catch {}
      };
      ensureTodayIntakeIsCurrent();
    }, [])
  );

  // Add a function to reset today's nutrition intake to zero
  const resetTodayIntake = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      // Reset the intake in state
      setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      
      // Clear the AsyncStorage entries
      await AsyncStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify({ calories: 0, protein: 0, carbs: 0, fat: 0 }));
      
      // Clear the food entries for today
      const userId = user?.id || 'guest';
      const storageKey = `nutrition_log_${userId}_${todayKey}`;
      await AsyncStorage.removeItem(storageKey);
      
      console.log('[NUTRITION] Reset today\'s intake to zero');
      Alert.alert('Reset Complete', 'Today\'s nutrition progress has been reset to zero.');
    } catch (error) {
      console.error('[NUTRITION] Error resetting intake:', error);
      Alert.alert('Error', 'Failed to reset nutrition progress.');
    }
  }, [user, getTodayKey]);
 
  const handleRegenerateAIMeals = useCallback(async () => {
    // Clear all state first
    setAiMeals([]);
    setAiMealsMeta({ cuisineVariety: [], cookingTips: [], provider: undefined, fallback: undefined });
    setAiMealsError(null);
    setAiMealsLoading(false);
    
    // Clear saved meal plan for today to force regeneration
    try {
      const todayKey = getTodayKey();
      const storageKey = `ai_meal_plan_${user?.id || 'guest'}_${todayKey}`;
      await AsyncStorage.removeItem(storageKey);
      console.log('[NUTRITION] Cleared saved meal plan for regeneration');
    } catch (error) {
      console.error('[NUTRITION] Error clearing saved meal plan:', error);
    }
    
    // Reset refs to allow new fetch
    loadedSavedMealsRef.current = false;
    lastFetchKeyRef.current = null;
    
    // Generate a unique token for this regeneration
    const newToken = `regen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Reset fetch key and signature to force a new fetch
    setAiMealsFetchKey(null);
    setLastAiMealsSignature(null);
    
    // Update token and counter - this will trigger the useEffect
    setRegenRequestToken(newToken);
    setAiMealsRefreshCounter(prev => prev + 1);
  }, [user?.id, getTodayKey]);

  const macroTargets = useMemo(() => {
    const proteinTarget = activePlan?.daily_targets?.protein_grams ?? activePlan?.daily_targets?.protein ?? 0;
    const carbsTarget = activePlan?.daily_targets?.carbs_grams ?? activePlan?.daily_targets?.carbs ?? 0;
    const fatTarget = activePlan?.daily_targets?.fat_grams ?? activePlan?.daily_targets?.fat ?? 0;

    return {
      calories: calorieTarget || 0,
      protein: proteinTarget || 0,
      carbs: carbsTarget || 0,
      fat: fatTarget || 0,
    };
  }, [activePlan, calorieTarget]);

  const macroRemaining = useMemo(() => ({
    calories: Math.max(0, (macroTargets.calories || 0) - (todayIntake.calories || 0)),
    protein: Math.max(0, (macroTargets.protein || 0) - (todayIntake.protein || 0)),
    carbs: Math.max(0, (macroTargets.carbs || 0) - (todayIntake.carbs || 0)),
    fat: Math.max(0, (macroTargets.fat || 0) - (todayIntake.fat || 0)),
  }), [macroTargets, todayIntake]);

  const planSourceLabel = useMemo(() => {
    if (activePlan?.plan_type === 'ai_generated') return 'AI nutrition plan';
    if (activePlan?.metabolic_calculations?.calculation_method) {
      return `${activePlan.metabolic_calculations.calculation_method} plan`;
    }
    if (activePlan?.plan_type) return `${activePlan.plan_type} plan`;
    return 'nutrition plan';
  }, [activePlan]);

  // Load saved meal plan for today on mount
  useEffect(() => {
    const loadTodayMealPlan = async () => {
      if (!activePlan) {
        loadedSavedMealsRef.current = false;
        return;
      }
      
      try {
        const todayKey = getTodayKey();
        const storageKey = `ai_meal_plan_${user?.id || 'guest'}_${todayKey}`;
        const saved = await AsyncStorage.getItem(storageKey);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          // Check if saved plan is for today and matches current plan
          if (parsed.date === todayKey && parsed.planId === activePlan.id && parsed.meals && parsed.meals.length > 0) {
            console.log('[NUTRITION] Loading saved meal plan for today');
            const normalizedMeals = normalizeMealPlan(parsed.meals || []);
            setAiMeals(normalizedMeals);
            setAiMealsMeta(parsed.meta || { cuisineVariety: [], cookingTips: [], provider: undefined, fallback: undefined });
            setLastAiMealsSignature(parsed.signature || null);
            setAiMealsFetchKey(parsed.fetchKey || null);
            lastFetchKeyRef.current = parsed.fetchKey || null;
            loadedSavedMealsRef.current = true;
            return;
          }
        }
      } catch (error) {
        console.error('[NUTRITION] Error loading saved meal plan:', error);
      }
      loadedSavedMealsRef.current = false;
    };
    
    loadTodayMealPlan();
  }, [activePlan?.id, user?.id, getTodayKey]);

  useEffect(() => {
    if (!activePlan) {
      // Only reset if we actually have meals or meta data to avoid unnecessary re-renders
      if (aiMeals.length > 0 || aiMealsMeta.provider || aiMealsFetchKey) {
        setAiMeals([]);
        setAiMealsMeta({ cuisineVariety: [], cookingTips: [], provider: undefined, fallback: undefined });
        setAiMealsFetchKey(null);
        setLastAiMealsSignature(null);
        setRegenRequestToken('initial');
        lastFetchKeyRef.current = null;
        loadedSavedMealsRef.current = false;
      }
      return;
    }

    // Skip fetch if we already loaded saved meals for today
    if (loadedSavedMealsRef.current && aiMeals.length > 0) {
      return;
    }

    const hasMacroTargets =
      macroTargets.calories > 0 &&
      macroTargets.protein > 0 &&
      macroTargets.carbs > 0 &&
      macroTargets.fat > 0;

    if (!hasMacroTargets) {
      return;
    }

    const todayKey = getTodayKey();
    const effectiveToken = regenRequestToken || 'initial';
    const fetchKey = `${activePlan.id || 'plan'}_${macroTargets.calories}_${macroTargets.protein}_${macroTargets.carbs}_${macroTargets.fat}_${todayKey}_${effectiveToken}`;

    // Skip if we already have this exact fetch key (same data, same token)
    // Use ref to check to avoid dependency on state that might cause re-renders
    if (lastFetchKeyRef.current === fetchKey && aiMeals.length > 0) {
      return;
    }
    
    // Update ref immediately to prevent duplicate fetches
    lastFetchKeyRef.current = fetchKey;

    let isCancelled = false;
    let currentFetchId: string | null = null;

    const fetchAiMeals = async () => {
      // Generate a unique ID for this fetch to prevent race conditions
      const fetchId = `fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentFetchId = fetchId;
      
      try {
        setAiMealsLoading(true);
        setAiMealsError(null);

        const dietaryPreferences = normalizePreferenceList(activePlan.preferences?.dietary || activePlan.preferences);
        const cuisinePreferenceId = getCuisinePreference(activePlan.preferences);
        
        // Convert cuisine ID to readable label for AI (capitalize first letter if it's an ID)
        const cuisinePreference = cuisinePreferenceId 
          ? cuisinePreferenceId.charAt(0).toUpperCase() + cuisinePreferenceId.slice(1)
          : undefined;

        console.log('[NUTRITION] Fetching AI meals with token:', effectiveToken.substring(0, 20) + '...');
        console.log('[NUTRITION] Cuisine preference:', cuisinePreference);

        const response = await NutritionService.generateAIDailyMealPlan(
          macroTargets.calories,
          macroTargets.protein,
          macroTargets.carbs,
          macroTargets.fat,
          dietaryPreferences,
          cuisinePreference,
          effectiveToken
        );

        // Check if this fetch is still the current one (not cancelled or superseded)
        if (isCancelled || currentFetchId !== fetchId) {
          console.log('[NUTRITION] Fetch cancelled or superseded, ignoring response');
          return;
        }

        if (response.success && response.fallback) {
          setAiMeals([]);
          setAiMealsMeta({
            cuisineVariety: [],
            cookingTips: [],
            provider: response.aiProvider || response.method,
            fallback: true
          });
          setAiMealsError(response.message || 'AI meal service is temporarily unavailable. Showing fallback builder instead.');
          setAiMealsFetchKey(null);
          setLastAiMealsSignature(null);
          lastFetchKeyRef.current = null;
          return;
        }

        if (response.success && response.mealPlan) {
          const signature = computeMealSignature(response.mealPlan);
          if (lastAiMealsSignature && signature === lastAiMealsSignature) {
            setAiMealsError('Generated meals were similar to the previous set. Tap regenerate again for more variety.');
          } else {
            setAiMealsError(null);
          }

          const normalizedMeals = normalizeMealPlan(response.mealPlan);
          const mealMeta = {
            cuisineVariety: response.cuisineVariety || [],
            cookingTips: response.cookingTips || [],
            provider: response.aiProvider || response.method,
            fallback: false
          };

          setAiMeals(normalizedMeals);
          setAiMealsMeta(mealMeta);
          setLastAiMealsSignature(signature);
          setAiMealsFetchKey(fetchKey);
          lastFetchKeyRef.current = fetchKey;
          loadedSavedMealsRef.current = false; // Mark as newly generated, not loaded

          // Save meal plan to AsyncStorage for today
          try {
            const todayKey = getTodayKey();
            const storageKey = `ai_meal_plan_${user?.id || 'guest'}_${todayKey}`;
            const mealPlanData = {
              date: todayKey,
              planId: activePlan.id,
              meals: normalizedMeals,
              meta: mealMeta,
              signature: signature,
              fetchKey: fetchKey,
              savedAt: new Date().toISOString()
            };
            await AsyncStorage.setItem(storageKey, JSON.stringify(mealPlanData));
            console.log('[NUTRITION] Saved meal plan for today');
          } catch (storageError) {
            console.error('[NUTRITION] Error saving meal plan:', storageError);
          }
        } else {
          setAiMeals([]);
          setAiMealsMeta({ cuisineVariety: [], cookingTips: [], provider: undefined, fallback: undefined });
          setAiMealsError(response.error || response.message || 'Unable to generate AI meal plan right now.');
          setAiMealsFetchKey(null);
          setLastAiMealsSignature(null);
          lastFetchKeyRef.current = null;
        }
      } catch (error: any) {
        // Only handle error if this is still the current fetch
        if (isCancelled || currentFetchId !== fetchId) {
          console.log('[NUTRITION] Error in cancelled/superseded fetch, ignoring');
          return;
        }
        
        console.error('[NUTRITION] Error fetching AI meals:', error);
        setAiMeals([]);
        setAiMealsMeta({ cuisineVariety: [], cookingTips: [], provider: undefined, fallback: undefined });
        setAiMealsError(error?.message || 'Unable to generate AI meal plan right now.');
        setAiMealsFetchKey(null);
        setLastAiMealsSignature(null);
        lastFetchKeyRef.current = null;
      } finally {
        // Only update loading state if this is still the current fetch
        if (!isCancelled && currentFetchId === fetchId) {
          setAiMealsLoading(false);
        }
      }
    };

    fetchAiMeals();

    return () => {
      isCancelled = true;
      currentFetchId = null;
    };
  }, [
    activePlan,
    macroTargets.calories,
    macroTargets.protein,
    macroTargets.carbs,
    macroTargets.fat,
    regenRequestToken,
    aiMealsRefreshCounter,
    getTodayKey,
    normalizePreferenceList,
    getCuisinePreference,
    computeMealSignature
  ]);

  const foodSuggestions = useMemo(() => {
    if (!activePlan) return [];
    const totalMacroTarget = macroTargets.protein + macroTargets.carbs + macroTargets.fat;
    if ((macroTargets.calories || 0) === 0 && totalMacroTarget === 0) return [];

    return FOOD_SUGGESTIONS_LIBRARY.map((suggestion) => {
      const macroScore = (['protein', 'carbs', 'fat'] as MacroKey[]).reduce((sum, macro) => {
        const target = macroTargets[macro] || 1;
        const remaining = macroRemaining[macro];
        const value = suggestion.macros[macro];
        const diff = Math.abs((remaining - value) / target);
        const overshoot = value > remaining ? (value - remaining) / target : 0;
        return sum + diff + overshoot * 0.5;
      }, 0);

      const caloriePenalty = Math.abs((macroRemaining.calories - suggestion.macros.calories) / Math.max(macroTargets.calories || 1, 1));
      const score = macroScore + caloriePenalty;

      return { ...suggestion, score };
    })
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [activePlan, macroTargets, macroRemaining]);

  const aiMealsAvailable = aiMeals.length > 0 && !aiMealsMeta.fallback;
  const aiProviderLabel = aiMealsMeta.fallback ? 'OFFLINE' : (aiMealsMeta.provider || 'AI').toUpperCase();
  const showFallbackSuggestions = Boolean(activePlan && !aiMealsLoading && !aiMealsAvailable && foodSuggestions.length > 0);
  
  // Add the reset button to the summary header
  const renderPlanItem = ({ item }: { item: any }) => { // Changed type to any
    const isSelected = activePlan?.id === item.id;
    
    const handleSelectForTargets = async (e: any) => {
      e.stopPropagation();
      if (!user?.id) return;
      
      try {
        // Optimistically update the UI immediately
        setActivePlan(item);
        
        // Also update in background
        const success = await NutritionService.setSelectedNutritionPlanForTargets(user.id, item.id);
        if (!success) {
          // Revert on error
          const selectedPlanId = await NutritionService.getSelectedNutritionPlanId(user.id);
          if (selectedPlanId) {
            const correctPlan = plans.find(p => p.id === selectedPlanId) || await NutritionService.getLatestNutritionPlan(user.id);
            if (correctPlan) setActivePlan(correctPlan);
          }
        }
      } catch (error) {
        console.error('[NUTRITION] Error setting selected plan:', error);
        // Revert on error
        const selectedPlanId = await NutritionService.getSelectedNutritionPlanId(user.id);
        if (selectedPlanId) {
          const correctPlan = plans.find(p => p.id === selectedPlanId) || await NutritionService.getLatestNutritionPlan(user.id);
          if (correctPlan) setActivePlan(correctPlan);
        }
      }
    };
    
    return (
      <TouchableOpacity
        onPress={() => {
          console.log('Plan item pressed:', item.id);
          router.push({ 
            pathname: '/(main)/nutrition/plan', 
            params: { planId: item.id } 
          });
        }}
        style={styles.planCard}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
          style={styles.planCardGradient}
        >
          <View style={styles.planCardHeader}>
            <View style={styles.planTypeContainer}>
              <View style={[styles.planTypeIcon, { backgroundColor: getPlanColor(item.plan_type || item.goal_type) }]}>
                <Icon 
                  name={getPlanIcon(item.plan_type || item.goal_type)} 
                  size={20} 
                  color={colors.white} 
                />
              </View>
              <View style={styles.planHeaderInfo}>
                <Text style={styles.planName}>{item.name || item.plan_name || 'Nutrition Plan'}</Text>
                <Text style={styles.planDate}>Created {formatDate(item.created_at)}</Text>
              </View>
            </View>
            {!isSelected && (
              <TouchableOpacity
                onPress={handleSelectForTargets}
                style={styles.setActiveButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.setActiveButtonText}>Use for Daily Targets</Text>
              </TouchableOpacity>
            )}
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Icon name="check-circle" size={24} color={colors.primary} />
                <Text style={styles.selectedText}>Selected</Text>
              </View>
            )}
          </View>
        
        <Divider style={styles.planDivider} />
        
        <View style={styles.macroContainer}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {item.metabolic_calculations?.goal_calories || 
               item.metabolic_calculations?.adjusted_calories || 
               item.daily_calories || 
               item.daily_targets?.calories || 
               'N/A'}
            </Text>
            <Text style={styles.macroLabel}>CALORIES</Text>
          </View>
          <View style={styles.macroSeparator} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {(item.protein_target_g || item.daily_targets?.protein || item.daily_targets?.protein_grams || 'N/A') + 'g'}
            </Text>
            <Text style={styles.macroLabel}>PROTEIN</Text>
          </View>
          <View style={styles.macroSeparator} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {(item.carbs_target_g || item.daily_targets?.carbs || item.daily_targets?.carbs_grams || 'N/A') + 'g'}
            </Text>
            <Text style={styles.macroLabel}>CARBS</Text>
          </View>
          <View style={styles.macroSeparator} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>
              {(item.fat_target_g || item.daily_targets?.fat || item.daily_targets?.fat_grams || 'N/A') + 'g'}
            </Text>
            <Text style={styles.macroLabel}>FAT</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
    );
  };

  const getPlanIcon = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'maintenance':
        return 'scale-balance';
      case 'cutting':
        return 'arrow-down-bold';
      case 'bulking':
        return 'arrow-up-bold';
      default:
        return 'food-apple';
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'maintenance':
        return colors.primary;
      case 'cutting':
        return colors.accent;
      case 'bulking':
        return colors.secondary;
      default:
        return colors.primary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  };

  // AI Coach greeting based on time and progress
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const progressPercent = calorieTarget > 0 ? Math.round((todayIntake.calories / calorieTarget) * 100) : 0;
    const proteinPercent = macroTargets.protein > 0 ? Math.round((todayIntake.protein / macroTargets.protein) * 100) : 0;
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    if (!activePlan) {
      message = "Let's set up your personalized nutrition plan to get started.";
    } else if (progressPercent === 0) {
      message = "Ready to fuel your day? Log your first meal to begin tracking.";
    } else if (progressPercent < 30) {
      message = "Great start! Keep logging to stay on track with your goals.";
    } else if (progressPercent < 60) {
      message = `You're doing well! ${100 - progressPercent}% of your calories remaining.`;
    } else if (progressPercent < 85) {
      message = proteinPercent < 70 
        ? "Consider a protein-rich meal for your remaining calories."
        : "Excellent progress! You're almost at your daily target.";
    } else if (progressPercent < 100) {
      message = "Almost there! Just a light snack away from your goal.";
    } else {
      message = "You've reached your calorie goal for today. Well done!";
    }
    
    return { greeting, message };
  }, [todayIntake, calorieTarget, macroTargets, activePlan]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAvatarContainer}>
            <Icon name="robot-happy-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.loadingText}>Analyzing your nutrition...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* AI Coach Header */}
          <View style={styles.coachHeader}>
            <View style={styles.coachAvatarContainer}>
              <Image
                source={require('../../../assets/mascot.png')}
                style={styles.coachAvatar}
              />
              <View style={styles.coachOnlineIndicator} />
            </View>
            <View style={styles.coachTextContainer}>
              <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
              <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
            </View>
          </View>

          {/* Main Progress Card */}
          {activePlan ? (
            <View style={styles.mainProgressCard}>
              {/* Calorie Circle */}
              <View style={styles.calorieCircleContainer}>
                <View style={styles.calorieCircle}>
                  <View style={styles.calorieCircleInner}>
                    <Text style={styles.calorieMainValue}>{todayIntake.calories}</Text>
                    <Text style={styles.calorieMainLabel}>of {calorieTarget}</Text>
                    <Text style={styles.calorieUnit}>kcal</Text>
                  </View>
                  {/* Progress ring visual */}
                  <View style={[styles.progressRing, { 
                    borderColor: colors.primary,
                    opacity: Math.min(1, (todayIntake.calories / Math.max(calorieTarget, 1)))
                  }]} />
                </View>
                <Text style={styles.remainingText}>
                  {Math.max(0, calorieTarget - todayIntake.calories)} kcal remaining
                </Text>
              </View>

              {/* Macro Pills */}
              <View style={styles.macroPillsContainer}>
                <View style={[styles.macroPill, { borderLeftColor: colors.primary }]}>
                  <Text style={styles.macroPillValue}>{todayIntake.protein}g</Text>
                  <Text style={styles.macroPillLabel}>Protein</Text>
                  <View style={styles.macroPillProgress}>
                    <View style={[styles.macroPillBar, { 
                      width: `${Math.min(100, (todayIntake.protein / Math.max(macroTargets.protein, 1)) * 100)}%`,
                      backgroundColor: colors.primary 
                    }]} />
                  </View>
                  <Text style={styles.macroPillTarget}>/ {macroTargets.protein}g</Text>
                </View>

                <View style={[styles.macroPill, { borderLeftColor: colors.accent }]}>
                  <Text style={styles.macroPillValue}>{todayIntake.carbs}g</Text>
                  <Text style={styles.macroPillLabel}>Carbs</Text>
                  <View style={styles.macroPillProgress}>
                    <View style={[styles.macroPillBar, { 
                      width: `${Math.min(100, (todayIntake.carbs / Math.max(macroTargets.carbs, 1)) * 100)}%`,
                      backgroundColor: colors.accent 
                    }]} />
                  </View>
                  <Text style={styles.macroPillTarget}>/ {macroTargets.carbs}g</Text>
                </View>

                <View style={[styles.macroPill, { borderLeftColor: colors.secondary }]}>
                  <Text style={styles.macroPillValue}>{todayIntake.fat}g</Text>
                  <Text style={styles.macroPillLabel}>Fat</Text>
                  <View style={styles.macroPillProgress}>
                    <View style={[styles.macroPillBar, { 
                      width: `${Math.min(100, (todayIntake.fat / Math.max(macroTargets.fat, 1)) * 100)}%`,
                      backgroundColor: colors.secondary 
                    }]} />
                  </View>
                  <Text style={styles.macroPillTarget}>/ {macroTargets.fat}g</Text>
                </View>
              </View>

              {/* Log Food Button */}
              <TutorialWrapper tutorialId="log-food-button">
                <TouchableOpacity
                  onPress={() => router.push('/(main)/nutrition/log-food')}
                  style={styles.primaryActionButton}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.primaryActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon name="plus-circle" size={20} color={colors.white} />
                    <Text style={styles.primaryActionText}>Log Food</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </TutorialWrapper>
            </View>
          ) : (
            /* No Plan State */
            <View style={styles.noPlanCard}>
              <View style={styles.noPlanIconContainer}>
                <Icon name="chart-donut" size={48} color={colors.primary} />
              </View>
              <Text style={styles.noPlanTitle}>No Nutrition Plan Yet</Text>
              <Text style={styles.noPlanDescription}>
                I'll calculate your personalized macros based on your goals and activity level.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(main)/nutrition/plan-create')}
                style={styles.createPlanButton}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.createPlanGradient}
                >
                  <Icon name="plus" size={18} color={colors.white} />
                  <Text style={styles.createPlanText}>Create My Plan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Actions Grid */}
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/nutrition/food-history')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Icon name="history" size={22} color="#22C55E" />
              </View>
              <Text style={styles.quickActionLabel}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/nutrition/food-library')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                <Icon name="lightbulb-on-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Suggestions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/nutrition/plan-create')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Icon name="clipboard-edit-outline" size={22} color="#6366F1" />
              </View>
              <Text style={styles.quickActionLabel}>New Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={resetTodayIntake}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Icon name="refresh" size={22} color="#EF4444" />
              </View>
              <Text style={styles.quickActionLabel}>Reset Day</Text>
            </TouchableOpacity>
          </View>
              
          {/* AI Insight Card - Only show if there's a plan */}
          {activePlan && macroRemaining.calories > 0 && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={styles.insightIconContainer}>
                  <Icon name="lightbulb-on" size={18} color={colors.primary} />
                </View>
                <Text style={styles.insightTitle}>AI Insight</Text>
              </View>
              <Text style={styles.insightText}>
                {macroRemaining.protein > macroRemaining.carbs && macroRemaining.protein > macroRemaining.fat
                  ? `Focus on protein-rich foods. You need ${Math.round(macroRemaining.protein)}g more protein today.`
                  : macroRemaining.carbs > macroRemaining.fat
                    ? `Consider adding complex carbs. You have ${Math.round(macroRemaining.carbs)}g remaining.`
                    : `Healthy fats can help you reach your target. ${Math.round(macroRemaining.fat)}g remaining.`
                }
              </Text>
            </View>
          )}

          {/* Active Plan Section */}
          {activePlan && (
            <View style={styles.activePlanSection}>
              <Text style={styles.plansSectionTitle}>Active Plan</Text>
              <TouchableOpacity
                style={styles.activePlanCard}
                onPress={() => router.push({ 
                  pathname: '/(main)/nutrition/plan', 
                  params: { planId: activePlan.id } 
                })}
                activeOpacity={0.8}
              >
                <View style={styles.activePlanHeader}>
                  <View style={styles.activePlanIconContainer}>
                    <Icon name="star" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.activePlanInfo}>
                    <Text style={styles.activePlanName}>{activePlan.name || activePlan.plan_name || 'Nutrition Plan'}</Text>
                    <Text style={styles.activePlanMeta}>
                      {activePlan.plan_type || 'General'} • {activePlan.metabolic_calculations?.calculation_method || 'Custom'} plan
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Saved Plans Section - Always show */}
          <View style={styles.plansSection}>
            <View style={styles.plansSectionHeader}>
              <Text style={styles.plansSectionTitle}>Your Plans</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('[NUTRITION] Manual refresh triggered');
                    lastFetchTime.current = 0;
                    cachedPlans.current = [];
                    cachedActivePlan.current = null;
                    fetchData(true);
                  }}
                  style={[styles.addPlanButton, { marginRight: 4 }]}
                >
                  <Icon name="refresh" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => router.push('/(main)/nutrition/plan-create')}
                  style={styles.addPlanButton}
                >
                  <Icon name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {plans.length === 0 ? (
              <View style={styles.emptyPlansContainer}>
                <Icon name="clipboard-text-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyPlansText}>No nutrition plans yet</Text>
                <Text style={styles.emptyPlansSubtext}>Create your first plan to get started</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(main)/nutrition/plan-create')}
                  style={styles.createFirstPlanButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.createFirstPlanGradient}
                  >
                    <Icon name="plus" size={16} color={colors.white} />
                    <Text style={styles.createFirstPlanText}>Create Plan</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
              {plans.slice(0, showAllPlans ? plans.length : 2).map((plan) => {
                const isSelected = activePlan?.id === plan.id;
                
                const handleSelectForTargets = async (e: any) => {
                  e.stopPropagation();
                  if (!user?.id) return;
                  
                  try {
                    // Optimistically update the UI immediately
                    setActivePlan(plan);
                    
                    // Re-sort plans optimistically to move active to top
                    setPlans(prevPlans => {
                      const updatedPlans = [...prevPlans];
                      return updatedPlans.sort((a, b) => {
                        if (a.id === plan.id) return -1;
                        if (b.id === plan.id) return 1;
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      });
                    });
                    
                    // Also update in background
                    const success = await NutritionService.setSelectedNutritionPlanForTargets(user.id, plan.id);
                    if (!success) {
                      // Revert on error
                      const selectedPlanId = await NutritionService.getSelectedNutritionPlanId(user.id);
                      if (selectedPlanId) {
                        const correctPlan = plans.find(p => p.id === selectedPlanId) || await NutritionService.getLatestNutritionPlan(user.id);
                        if (correctPlan) setActivePlan(correctPlan);
                      }
                    } else {
                      Alert.alert('Success', `${plan.name || plan.plan_name || 'Plan'} is now your active nutrition plan.`);
                    }
                  } catch (error) {
                    console.error('[NUTRITION] Error setting selected plan:', error);
                  }
                };

                const handleDeletePlan = async (e: any) => {
                  e.stopPropagation();
                  if (!user?.id) return;
                  
                  Alert.alert(
                    'Delete Plan',
                    `Are you sure you want to delete "${plan.name || plan.plan_name || 'this plan'}"? This action cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await NutritionService.deleteNutritionPlan(plan.id);
                            // Remove from local state
                            setPlans(prevPlans => prevPlans.filter(p => p.id !== plan.id));
                            // If this was the active plan, clear it
                            if (activePlan?.id === plan.id) {
                              setActivePlan(null);
                            }
                            Alert.alert('Success', 'Plan deleted successfully');
                          } catch (error) {
                            console.error('[NUTRITION] Error deleting plan:', error);
                            Alert.alert('Error', 'Failed to delete plan. Please try again.');
                          }
                        }
                      }
                    ]
                  );
                };

                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planListItem,
                      isSelected && styles.planListItemActive
                    ]}
                    onPress={() => router.push({ pathname: '/(main)/nutrition/plan', params: { planId: plan.id } })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.planListItemLeft}>
                      <View style={[styles.planListIcon, { backgroundColor: getPlanColor(plan.plan_type || plan.goal_type) }]}>
                        <Icon name={getPlanIcon(plan.plan_type || plan.goal_type)} size={16} color={colors.white} />
                      </View>
                      <View style={styles.planListInfo}>
                        <Text style={styles.planListName}>{plan.name || plan.plan_name || 'Nutrition Plan'}</Text>
                        <Text style={styles.planListMeta}>
                          {plan.metabolic_calculations?.goal_calories || plan.daily_targets?.calories || 0} kcal
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.planListActions}>
                      {!isSelected && (
                        <TouchableOpacity
                          onPress={handleSelectForTargets}
                          style={styles.setActiveSmallButton}
                        >
                          <Text style={styles.setActiveSmallText}>Activate</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={handleDeletePlan}
                        style={styles.deleteSmallButton}
                      >
                        <Icon name="trash-can-outline" size={16} color="rgba(255, 69, 58, 0.7)" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              {plans.length > 2 && (
                <TouchableOpacity 
                  onPress={() => setShowAllPlans(!showAllPlans)}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreText}>
                    {showAllPlans ? 'Show Less' : `Show ${plans.length - 2} More`}
                  </Text>
                  <Icon 
                    name={showAllPlans ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              )}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  coachAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  coachAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Main Progress Card
  mainProgressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  calorieCircleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  calorieCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 3,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  calorieCircleInner: {
    alignItems: 'center',
  },
  calorieMainValue: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
  },
  calorieMainLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -2,
  },
  calorieUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
  progressRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 83,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  remainingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },

  // Macro Pills
  macroPillsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  macroPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
  },
  macroPillValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  macroPillLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  macroPillProgress: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  macroPillBar: {
    height: '100%',
    borderRadius: 2,
  },
  macroPillTarget: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Primary Action Button
  primaryActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },

  // No Plan State
  noPlanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  noPlanIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noPlanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  noPlanDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  createPlanButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createPlanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  createPlanText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionCard: {
    width: (width - 40 - 24) / 4, // 40px padding, 24px for 3 gaps of 8px
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  // AI Insight Card
  insightCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 21,
  },

  // Plans Section
  plansSection: {
    marginBottom: 20,
  },
  plansSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  plansSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  activePlanSection: {
    marginBottom: 24,
  },
  activePlanCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  activePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePlanIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activePlanInfo: {
    flex: 1,
  },
  activePlanName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  activePlanMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  addPlanButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  planListItemActive: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  planListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planListIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planListInfo: {
    flex: 1,
  },
  planListName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  planListMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  planListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setActiveSmallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 8,
  },
  setActiveSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteSmallButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  setAsActiveButtonSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  setAsActiveButtonTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  showMoreText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyPlansContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyPlansText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPlansSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  createFirstPlanButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createFirstPlanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  createFirstPlanText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  // Plan card styles (kept for compatibility)
  planCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  planCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planHeaderInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  planDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planDivider: {
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 1,
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroSeparator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  macroLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  setActiveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  setActiveButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PlansScreen; 