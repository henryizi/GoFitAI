import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ImageBackground, Dimensions, TouchableOpacity, Alert, FlatList } from 'react-native';
import { Text, ActivityIndicator, Divider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Modern, premium colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
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

const { width } = Dimensions.get('window');

const PlansScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<any[]>([]); // Changed type to any[] as NutritionPlan is removed
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestInsight, setLatestInsight] = useState<any | null>(null);
  const [currentDate] = useState(new Date());
  const [activePlan, setActivePlan] = useState<any | null>(null); // Changed type to any
  const [latestTargets, setLatestTargets] = useState<any | null>(null); // Latest historical targets
  const [todayIntake, setTodayIntake] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  // Get the correct calorie target (prioritize goal-adjusted calories)
  const getCalorieTarget = () => {
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
  };
 
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
 
  const getTodayKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD (local)
  };
 
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
    const uid = user?.id || 'guest';
    
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);
    try {
      const fetchedPlans = await NutritionService.getAllNutritionPlans(uid);
      let insight: any = null;
      if (user) {
        try { insight = await NutritionService.getLatestInsight(uid); } catch { insight = null; }
      }
      setPlans(fetchedPlans);
      setLatestInsight(insight);
      
      // Get active nutrition plan
      const latestPlan = await NutritionService.getLatestNutritionPlan(uid);
      console.log('[NUTRITION] Latest plan:', latestPlan);
      
      // Set active plan (can be null for new users)
      if (latestPlan) {
        setActivePlan(latestPlan);

        // Fetch latest historical targets for the active plan
        if (latestPlan?.id) {
          try {
            const targets = await NutritionService.getHistoricalNutritionTargets(latestPlan.id);
            if (targets && targets.length > 0) {
              console.log('[NUTRITION] Latest targets:', targets[0]);
              setLatestTargets(targets[0]);
            }
          } catch (err) {
            console.error('[NUTRITION] Error fetching historical targets:', err);
          }
        }
      } else {
        // No plan found - new users should create their own plan
        console.log('[NUTRITION] No active plan found - user needs to create one');
        setActivePlan(null);
      }

      // Also fetch food entries to update progress
      await fetchFoodEntries();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      Alert.alert('Error', 'Could not load your nutrition data.');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [user, fetchFoodEntries]);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      console.log('[NUTRITION] Screen focused, fetching fresh data');
      fetchData();
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
  
  // Add the reset button to the summary header
  const renderPlanItem = ({ item }: { item: any }) => ( // Changed type to any
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
          <Icon name="chevron-right" size={24} color={colors.primary} />
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Full-screen background */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(18,18,18,0.9)', 'rgba(18,18,18,0.7)', '#121212']}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* App header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLine} />
        <Text style={styles.appName}>NUTRITION<Text style={{ color: colors.primary }}>HUB</Text></Text>
        <View style={styles.headerLine} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading nutrition data...</Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          renderItem={renderPlanItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Today's Date and Title */}
              <View style={styles.titleSection}>
                <Text style={styles.titleDate}>{formattedDate.toUpperCase()}</Text>
                <Text style={styles.titleMain}>DAILY NUTRITION</Text>
                <Text style={styles.titleDescription}>
                  Track your food intake and stay on target with your goals
                </Text>
              </View>
              
              {/* Daily Nutrition Overview Card */}
              <View style={styles.summaryCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.summaryCardGradient}
                >
                  <View style={styles.summaryHeader}>
                    <View style={styles.summaryTitleContainer}>
                      <Text style={styles.summaryTitle}>TODAY'S PROGRESS</Text>
                    </View>
                    <View style={styles.summaryActions}>
                      <TouchableOpacity
                        onPress={resetTodayIntake}
                        style={styles.iconButtonContainer}
                      >
                        <Icon name="refresh" size={16} color={colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Log Food button pressed');
                          router.push({
                            pathname: '/nutrition/log-food'
                          });
                        }}
                        style={styles.logFoodButton}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          style={styles.logFoodButtonGradient}
                        >
                          <Icon name="plus" size={16} color={colors.white} style={styles.logFoodButtonIcon} />
                          <Text style={styles.logFoodButtonText}>LOG FOOD</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {activePlan ? (
                    <View style={styles.progressContainer}>
                      <View style={styles.calorieProgress}>
                        <View style={styles.calorieHeader}>
                          <Text style={styles.calorieCount}>{todayIntake.calories}</Text>
                          <Text style={styles.calorieTotal}>/ {getCalorieTarget()} kcal</Text>
                                                      <Text style={styles.caloriePercentage}>
                              ({Math.round((todayIntake.calories / Math.max(getCalorieTarget(), 1)) * 100)}%)
                          </Text>
                        </View>
                        <View style={styles.circularProgressContainer}>
                          {Array.from({ length: 10 }, (_, index) => {
                            const targetCalories = getCalorieTarget();
                            const calorieProgress = targetCalories > 0 ? (todayIntake.calories / targetCalories) * 100 : 0;
                            const isActive = calorieProgress >= (index + 1) * 10;
                            
                            // Debug logging for the first few dots
                            if (index < 3) {
                              console.log(`[NUTRITION] Dot ${index}: progress=${calorieProgress.toFixed(1)}%, threshold=${(index + 1) * 10}%, isActive=${isActive}`);
                            }
                            
                            return (
                              <View 
                                key={index}
                                style={[
                                  styles.circularProgressDot,
                                  { 
                                    backgroundColor: isActive 
                                      ? colors.primary 
                                      : 'rgba(255, 255, 255, 0.15)',
                                    transform: isActive ? [{ scale: 1.1 }] : [{ scale: 1 }],
                                    shadowOpacity: isActive ? 0.8 : 0.3,
                                  }
                                ]}
                              />
                            );
                          })}
                        </View>
                      </View>
                      
                      <View style={styles.macrosRow}>
                        <View style={styles.macroProgress}>
                          <View style={styles.macroProgressHeader}>
                            <Text style={styles.macroProgressLabel}>PROTEIN</Text>
                            <Text style={styles.macroProgressValue}>{todayIntake.protein}g / {(activePlan?.daily_targets?.protein_grams ?? activePlan?.daily_targets?.protein ?? 0)}g</Text>
                          </View>
                          <View style={styles.miniProgressBarContainer}>
                            <View style={[styles.miniProgressBar, { 
                              width: `${Math.min(100, (todayIntake.protein / (activePlan?.daily_targets?.protein_grams ?? activePlan?.daily_targets?.protein ?? 0)) * 100)}%`, 
                              backgroundColor: colors.primary 
                            }]} />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.macrosRow}>
                        <View style={styles.macroProgress}>
                          <View style={styles.macroProgressHeader}>
                            <Text style={styles.macroProgressLabel}>CARBS</Text>
                            <Text style={styles.macroProgressValue}>{todayIntake.carbs}g / {(activePlan?.daily_targets?.carbs_grams ?? activePlan?.daily_targets?.carbs ?? 0)}g</Text>
                          </View>
                          <View style={styles.miniProgressBarContainer}>
                            <View style={[styles.miniProgressBar, { 
                              width: `${Math.min(100, (todayIntake.carbs / (activePlan?.daily_targets?.carbs_grams ?? activePlan?.daily_targets?.carbs ?? 0)) * 100)}%`, 
                              backgroundColor: colors.accent 
                            }]} />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.macrosRow}>
                        <View style={styles.macroProgress}>
                          <View style={styles.macroProgressHeader}>
                            <Text style={styles.macroProgressLabel}>FAT</Text>
                            <Text style={styles.macroProgressValue}>{todayIntake.fat}g / {(activePlan?.daily_targets?.fat_grams ?? activePlan?.daily_targets?.fat ?? 0)}g</Text>
                          </View>
                          <View style={styles.miniProgressBarContainer}>
                            <View style={[styles.miniProgressBar, { 
                              width: `${Math.min(100, (todayIntake.fat / (activePlan?.daily_targets?.fat_grams ?? activePlan?.daily_targets?.fat ?? 0)) * 100)}%`, 
                              backgroundColor: colors.secondary 
                            }]} />
                          </View>
                        </View>
                      </View>
                      

                    </View>
                  ) : (
                    <View style={styles.noActivePlanContainer}>
                      <View style={styles.noActivePlanIconContainer}>
                        <Icon name="food-apple-outline" size={32} color={colors.primary} />
                      </View>
                      <Text style={styles.noActivePlanText}>No active nutrition plan</Text>
                      <Text style={styles.noActivePlanSubText}>Create a plan to track your daily nutrition</Text>
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Create Plan button pressed');
                          router.push({
                            pathname: '/(main)/nutrition/plan-create'
                          });
                        }}
                        style={styles.createPlanButtonSmallContainer}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          style={styles.createPlanButtonSmall}
                        >
                          <Text style={styles.createPlanButtonText}>Create Plan</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </LinearGradient>
              </View>
              
              {/* Nutrition Insight Card */}
              <View style={styles.insightCard}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.insightGradient}
                >
                  <View style={styles.insightIconContainer}>
                    <Icon name="lightbulb-on" size={24} color="white" />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>NUTRITION INSIGHT</Text>
                    <Text style={styles.insightText}>
                      Try increasing your protein intake by 10-15g per day to support your muscle recovery goals.
                    </Text>
                  </View>
                </LinearGradient>
              </View>
              
              {/* Quick Actions */}
              <Text style={styles.sectionTitle}>01 <Text style={styles.sectionTitleText}>QUICK ACTIONS</Text></Text>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => {
                    console.log('Create Plan quick action pressed');
                    router.push({
                      pathname: '/(main)/nutrition/plan-create'
                    });
                  }}
                >
                  <LinearGradient
                    colors={['rgba(0,102,255,0.2)', 'rgba(0,102,255,0.1)']}
                    style={styles.quickActionGradient}
                  >
                    <View style={styles.quickActionContent}>
                      <Icon name="clipboard-text-outline" size={28} color={colors.primary} />
                      <Text style={styles.quickActionText}>Create Plan</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

              </View>
              
              <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>YOUR NUTRITION PLANS</Text></Text>
              {plans.length === 0 && (
                <View style={styles.emptyCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                    style={styles.emptyCardGradient}
                  >
                    <View style={styles.emptyCardContent}>
                      <View style={styles.emptyIconContainer}>
                        <Icon name="food-apple-outline" size={48} color={colors.primary} />
                      </View>
                      <Text style={styles.emptyText}>No nutrition plans yet</Text>
                      <Text style={styles.emptySubText}>Create your first personalized nutrition plan</Text>
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Create New Plan button pressed');
                          router.push({
                            pathname: '/(main)/nutrition/plan-create'
                          });
                        }}
                        style={styles.createButtonContainer}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          style={styles.createButton}
                        >
                          <Text style={styles.createButtonText}>Create New Plan</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </>
          }
          ListEmptyComponent={null}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  appName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  titleSection: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleDate: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  titleMain: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 8,
  },
  titleDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.white,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  summaryCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 4, // Add padding to prevent button clipping
  },
  summaryTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0, // Prevent shrinking
  },
  logButtonContainer: {
    overflow: 'hidden',
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  logButtonIcon: {
    marginRight: 6,
  },
  logButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginBottom: 8,
  },
  calorieProgress: {
    marginBottom: 20,
  },
  calorieHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  calorieCount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  calorieTotal: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    marginLeft: 4,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  circularProgressContainer: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  circularProgressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 1,
    shadowColor: 'rgba(255, 107, 53, 0.6)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  macrosRow: {
    marginBottom: 12,
  },
  macroProgress: {
    flex: 1,
  },
  macroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  macroProgressValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  miniProgressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  insightCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  insightGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
    letterSpacing: 1,
  },
  insightText: {
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
  sectionTitle: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitleText: {
    color: colors.white,
    marginLeft: 8,
    letterSpacing: 1,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionButton: {
    width: 160,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 100,
  },
  quickActionGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionContent: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginTop: 12,
  },
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
    fontWeight: '600',
    color: colors.white,
  },
  planDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
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
    fontWeight: '700',
    color: colors.white,
  },
  macroLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  emptyCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyCardContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,102,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createButtonContainer: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyListContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyListSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createPlanButtonContainer: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  createPlanButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  createPlanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  noActivePlanContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noActivePlanIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,102,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noActivePlanText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  noActivePlanSubText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
    textAlign: 'center',
  },
  createPlanButtonSmallContainer: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  createPlanButtonSmall: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  testButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  testButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  caloriePercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 4,
  },
  iconButtonContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logFoodButton: {
    borderRadius: 26,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    maxWidth: 120, // Responsive width
  },
  logFoodButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    maxWidth: 120,
  },
  logFoodButtonIcon: {
    marginRight: 6,
  },
  logFoodButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.6,
    flexShrink: 1, // Allow text to shrink if needed
  },
});

export default PlansScreen; 