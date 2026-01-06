import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Alert, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { WorkoutLocalStore } from '../../../src/services/workout/WorkoutLocalStore';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';
import { WorkoutHistoryService } from '../../../src/services/workout/WorkoutHistoryService';
import { track as analyticsTrack } from '../../../src/services/analytics/analytics';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';
import HealthDisclaimer from '../../../src/components/legal/HealthDisclaimer';
import { TutorialWrapper } from '../../../src/components/tutorial/TutorialWrapper';

// MARK: - Clean Design System
const { width } = Dimensions.get('window');

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#34C759',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  white: '#FFFFFF',
  purple: '#AF52DE',
};

interface Plan {
    id: string;
    name: string;
    description?: string;
    training_level?: string;
    mesocycle_length_weeks?: number;
    is_active?: boolean;
    status?: string;
    image_url?: string;
    created_at?: string;
    updated_at?: string;
    user_id?: string;
    current_week?: number;
    deload_week?: boolean;
    goal_muscle_gain?: number;
    goal_fat_loss?: number;
    weekly_schedule?: any; // Added for navigation
    weeklySchedule?: any; // Alternative naming
}

// MARK: - Screen Component
const WorkoutPlansScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({ workouts: 0, totalMinutes: 0, streak: 0 });

  // Cache refs to prevent unnecessary refetches
  const lastFetchTime = useRef<number>(0);
  const cachedPlans = useRef<Plan[]>([]);
  const isFetching = useRef<boolean>(false);
  const CACHE_DURATION = 5000; // 5 seconds cache

  // Fetch weekly stats (optimized - don't block UI)
  const fetchWeeklyStats = useCallback(async () => {
    if (!user?.id) return;
    // Fetch in background, don't block UI
    WorkoutHistoryService.getCompletedSessions(user.id)
      .then(sessions => {
      // Filter to last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentSessions = sessions?.filter(s => new Date(s.completed_at) >= oneWeekAgo) || [];
      const workoutCount = recentSessions.length;
      const totalMinutes = recentSessions.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
      setWeeklyStats({ workouts: workoutCount, totalMinutes, streak: workoutCount > 0 ? Math.min(workoutCount, 7) : 0 });
      })
      .catch(error => {
      console.error('[WorkoutPlans] Error fetching stats:', error);
      });
  }, [user?.id]);

  useEffect(() => {
    analyticsTrack('screen_view', { screen: 'workout_plans' });
    fetchWeeklyStats();
  }, [fetchWeeklyStats]);

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const activePlan = plans.find(p => p.id === activePlanId);
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    if (plans.length === 0) {
      message = "Let's create your personalized workout plan to start your fitness journey.";
    } else if (!activePlan) {
      message = "Select a workout plan to begin tracking your progress.";
    } else if (weeklyStats.workouts === 0) {
      message = "Ready to train? Your workout plan is waiting for you.";
    } else if (weeklyStats.workouts < 3) {
      message = `Great progress! You've completed ${weeklyStats.workouts} workout${weeklyStats.workouts > 1 ? 's' : ''} this week.`;
    } else if (weeklyStats.workouts < 5) {
      message = "You're on fire! Keep up the amazing consistency.";
    } else {
      message = "Outstanding dedication! You're crushing your fitness goals.";
    }
    
    return { greeting, message };
  }, [plans, activePlanId, weeklyStats]);



  // Add a useEffect to refresh when the refresh param changes
  const { refresh } = useLocalSearchParams<{ refresh: string }>();

  // Optimized fetchPlans function with caching and parallel operations
  const fetchPlans = useCallback(async (forceRefresh = false) => {
    if (!user?.id || isFetching.current) return;
    
    // Check cache to prevent unnecessary refetches
    const now = Date.now();
    if (!forceRefresh && cachedPlans.current.length > 0 && (now - lastFetchTime.current) < CACHE_DURATION) {
      setPlans(cachedPlans.current);
      setLoading(false);
      return;
    }

    // Show cached data immediately while fetching
    if (cachedPlans.current.length > 0) {
      setPlans(cachedPlans.current);
      setLoading(false);
    }

    isFetching.current = true;
    if (cachedPlans.current.length === 0) {
      setLoading(true);
    }
    
    try {
      // Only fetch essential fields for list view - exclude large JSON fields
      const essentialFields = 'id, name, description, training_level, mesocycle_length_weeks, is_active, status, image_url, created_at, updated_at, user_id, current_week, deload_week, goal_muscle_gain, goal_fat_loss';
      
      // First, quickly load from local storage to show something immediately
      let localPlans: any[] = [];
      try {
        const rawPlans = await WorkoutLocalStore.getPlans(user.id);
        if (Array.isArray(rawPlans)) {
          localPlans = rawPlans;
        } else if (rawPlans && typeof rawPlans === 'object') {
          const rawPlansObj = rawPlans as any;
          localPlans = rawPlansObj.plans || rawPlansObj.data || [rawPlans];
        }
        
        // Show local plans immediately if we have them and no cache
        if (localPlans.length > 0 && cachedPlans.current.length === 0) {
          const validLocalPlans = removeDuplicatePlans(localPlans);
          setPlans(validLocalPlans);
          setLoading(false);
        }
      } catch (localError) {
        console.error('[WorkoutPlans] Error loading local plans:', localError);
      }
      
      // Now fetch from database and active plan in parallel
      const [activePlanResult, dbPlansResult] = await Promise.allSettled([
        
        // Fetch active plan ID only (optimized query)
        supabase ? supabase
          .from('workout_plans')
          .select('id, is_active, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
          .then(({ data }) => data?.id || null)
          .catch(() => {
            // Fallback to local storage for active plan
            return WorkoutLocalStore.getActivePlanId(user.id);
          }) : WorkoutLocalStore.getActivePlanId(user.id),
        
        // Fetch from database - only essential fields, no large JSON, limit results
        supabase ? supabase
            .from('workout_plans')
          .select(essentialFields)
            .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50) // Limit to prevent fetching too many plans
          .then(({ data }) => data || [])
          .catch(() => []) : Promise.resolve([])
      ]);

      // Process local plans (already loaded above)
      const validLocalPlans = removeDuplicatePlans(localPlans);
      
      // Process database plans
      const dbPlans = dbPlansResult.status === 'fulfilled' ? dbPlansResult.value : [];
      const validDbPlans = removeDuplicatePlans(dbPlans);
      
      // Process active plan ID
      let currentActivePlanId = activePlanId;
      if (activePlanResult.status === 'fulfilled' && activePlanResult.value) {
        currentActivePlanId = activePlanResult.value;
        setActivePlanId(activePlanResult.value);
      } else {
        // Fallback: check local plans for active status
        const localActive = validLocalPlans.find(p => p.is_active || p.status === 'active');
        if (localActive) {
          currentActivePlanId = localActive.id;
          setActivePlanId(localActive.id);
        }
      }

      // Efficient merge using Map for O(1) lookups
      const plansMap = new Map<string, Plan>();
      
      // Add local plans first (preserves bodybuilder plans)
      for (const plan of validLocalPlans) {
        plansMap.set(plan.id, plan);
      }
      
      // Add database plans (only if not already present)
      for (const plan of validDbPlans) {
        if (!plansMap.has(plan.id)) {
          plansMap.set(plan.id, plan);
        }
      }
      
      // Convert map to array and set active status
      const mergedPlans = Array.from(plansMap.values()).map((plan: any) => ({
                ...plan,
        is_active: currentActivePlanId ? plan.id === currentActivePlanId : !!plan.is_active,
        status: (currentActivePlanId && plan.id === currentActivePlanId) ? 'active' : 'archived'
      }));

            // Sort: active plans first, then newest created
      mergedPlans.sort((a: any, b: any) => {
              if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1;
              const aDate = new Date(a.created_at || a.updated_at || 0).getTime();
              const bDate = new Date(b.created_at || b.updated_at || 0).getTime();
              return bDate - aDate;
            });

      // Update state and cache
      cachedPlans.current = mergedPlans;
      lastFetchTime.current = Date.now();
      setPlans(mergedPlans);
      
      // Update local storage in background (don't wait for it)
      if (mergedPlans.length > 0) {
        WorkoutLocalStore.savePlans(user.id, mergedPlans as any).catch(err => {
          console.error('[WorkoutPlans] Error saving plans to storage:', err);
        });
      }
      
      } catch (error) {
        console.error('[WorkoutPlans] Failed to fetch workout plans:', error);
      // Fallback to cached plans if available
      if (cachedPlans.current.length > 0) {
        setPlans(cachedPlans.current);
      } else {
        // Last resort: try to get local plans
        try {
          const fallbackLocal = await WorkoutLocalStore.getPlans(user.id);
        const uniqueFallback = removeDuplicatePlans(fallbackLocal as any);
        setPlans(uniqueFallback as any);
        } catch (fallbackError) {
          console.error('[WorkoutPlans] Fallback failed:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetching.current = false;
    }
  }, [user?.id, activePlanId, removeDuplicatePlans, validatePlan]);

  // Helper function to validate and normalize a plan object
  const validatePlan = useCallback((plan: any): Plan | null => {
    try {
      // Check if plan exists and is an object
      if (!plan || typeof plan !== 'object') {
        console.warn('[WorkoutPlans] Invalid plan: not an object', plan);
        return null;
      }

      // Check if it's an array (common data corruption issue)
      if (Array.isArray(plan)) {
        console.warn('[WorkoutPlans] Invalid plan: is an array, attempting to extract first valid plan', plan);
        // Try to extract the first valid plan from the array
        const firstPlan = plan.find((p: any) => p && typeof p === 'object' && !Array.isArray(p) && (p.id || p.name));
        if (firstPlan) {
          console.log('[WorkoutPlans] Extracted first valid plan from array:', firstPlan.id, firstPlan.name);
          return validatePlan(firstPlan); // Recursively validate the extracted plan
        }
        return null;
      }

      // Ensure required fields exist
      if (!plan.id && !plan.name) {
        console.warn('[WorkoutPlans] Invalid plan: missing id and name', plan);
        return null;
      }

      // Normalize the plan object
      const normalizedPlan: Plan = {
        id: plan.id || `temp-${Date.now()}-${Math.random()}`,
        name: plan.name || 'Untitled Plan',
        user_id: plan.user_id || '',
        status: plan.status || 'inactive',
        created_at: plan.created_at || new Date().toISOString(),
        updated_at: plan.updated_at || new Date().toISOString(),
        current_week: plan.current_week || 1,
        mesocycle_length_weeks: plan.mesocycle_length_weeks || 4,
        deload_week: plan.deload_week || false,
        training_level: plan.training_level || 'beginner',
        goal_muscle_gain: plan.goal_muscle_gain || 1,
        goal_fat_loss: plan.goal_fat_loss || 1,
        weekly_schedule: Array.isArray(plan.weekly_schedule) ? plan.weekly_schedule : [],
        is_active: plan.is_active || plan.status === 'active'
      };

      return normalizedPlan;
    } catch (error) {
      console.error('[WorkoutPlans] Error validating plan:', error, plan);
      return null;
    }
  }, []);

  // Optimized duplicate removal function - O(n) instead of O(n log n)
  const removeDuplicatePlans = useCallback((plans: any[]): Plan[] => {
    if (!Array.isArray(plans) || plans.length === 0) {
      return [];
    }

    // Use Map for O(1) lookups - key by ID first, then by name
    const plansById = new Map<string, Plan>();
    const plansByName = new Map<string, Plan>();
    const validPlans: Plan[] = [];

    // Single pass: validate and deduplicate
    for (const plan of plans) {
      const validatedPlan = validatePlan(plan);
      if (!validatedPlan) continue;

      const planId = validatedPlan.id;
      const planName = (validatedPlan.name || '').trim().toLowerCase();

      // Check for duplicate ID
      if (plansById.has(planId)) {
        // Keep the newer one
        const existing = plansById.get(planId)!;
        const existingDate = new Date(existing.created_at || 0).getTime();
        const newDate = new Date(validatedPlan.created_at || 0).getTime();
        if (newDate > existingDate) {
          plansById.set(planId, validatedPlan);
          if (planName) plansByName.set(planName, validatedPlan);
        }
        continue;
      }

      // Check for duplicate name (only if name exists)
      if (planName && plansByName.has(planName)) {
        // Keep the newer one
        const existing = plansByName.get(planName)!;
        const existingDate = new Date(existing.created_at || 0).getTime();
        const newDate = new Date(validatedPlan.created_at || 0).getTime();
        if (newDate > existingDate) {
          // Remove old entry and add new one
          plansById.delete(existing.id);
          plansById.set(planId, validatedPlan);
          plansByName.set(planName, validatedPlan);
        }
        continue;
      }

      // New unique plan
      plansById.set(planId, validatedPlan);
      if (planName) {
        plansByName.set(planName, validatedPlan);
      }
      validPlans.push(validatedPlan);
    }

    return validPlans;
  }, [validatePlan]);

  useEffect(() => {
    // Check if the refresh param exists
    if (refresh) {
      fetchPlans(true); // Force refresh when refresh param is present
    }
  }, [refresh, fetchPlans]);

  // Handle back button to go to dashboard
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      router.replace('/(main)/dashboard' as any);
    });

    return unsubscribe;
  }, [navigation, router]);

  useFocusEffect(
    useCallback(() => {
      // Only refresh if cache is stale or forced
      const now = Date.now();
      const shouldRefresh = (now - lastFetchTime.current) >= CACHE_DURATION;
      
      if (shouldRefresh) {
        fetchPlans(false);
      } else if (cachedPlans.current.length === 0) {
        // If no cache, fetch immediately
        fetchPlans(false);
      }
    }, [fetchPlans])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlans(true); // Force refresh on pull-to-refresh
    fetchWeeklyStats();
  }, [fetchPlans, fetchWeeklyStats]);

  const onPressPlan = useCallback((plan: Plan) => {
    analyticsTrack('workout_plan_open', { plan_id: plan.id });
    router.push({ 
      pathname: '/(main)/workout/plan/[planId]', 
      params: { 
        planId: String(plan.id), 
        name: plan.name,
        planObject: JSON.stringify(plan)
      } as any 
    });
  }, [router]);

  // Add direct delete function
  const handleDeletePlan = useCallback(async (plan: Plan) => {
    // Debug: Log the entire plan object to understand the data structure
    console.log('[WorkoutPlans] handleDeletePlan called with plan object:', JSON.stringify(plan, null, 2));
    console.log('[WorkoutPlans] plan.id:', plan?.id);
    console.log('[WorkoutPlans] plan.name:', plan?.name);
    console.log('[WorkoutPlans] typeof plan:', typeof plan);
    console.log('[WorkoutPlans] Object.keys(plan):', Object.keys(plan || {}));
    
    // Check if plan has any identifiable properties
    const planName = plan?.name || 'Unknown Plan';
    const planId = plan?.id;
    
    console.log('[WorkoutPlans] Extracted planName:', planName);
    console.log('[WorkoutPlans] Extracted planId:', planId);
    
    // Show confirmation dialog
    Alert.alert(
      'Delete Workout Plan',
      `Are you sure you want to delete "${planName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log(`[WorkoutPlans] Deleting plan: ${planId} (${planName})`);
              
              // Use the improved WorkoutService deletion methods
              let success = false;
              
              if (planId) {
                console.log('[WorkoutPlans] Attempting deletion by ID using WorkoutService');
                success = await WorkoutService.deletePlan(planId, user?.id);
              }
              
              if (!success && planName && planName !== 'Unknown Plan' && user?.id) {
                console.log('[WorkoutPlans] Attempting deletion by name using WorkoutService');
                success = await WorkoutService.deletePlanByName(planName, user.id);
              }
              
              if (success) {
                // Remove from local state - filter by multiple criteria to be safe
                setPlans(prev => prev.filter(p => {
                  const currentPlanName = p.name?.trim().toLowerCase();
                  const currentPlanId = p.id;
                  const targetPlanName = planName?.trim().toLowerCase();
                  
                  // Don't remove if names don't match and IDs don't match
                  return !(
                    (targetPlanName && targetPlanName !== 'unknown plan' && currentPlanName === targetPlanName) ||
                    (planId && currentPlanId === planId)
                  );
                }));
                
                // Show success message
                Alert.alert('Success', `"${planName}" has been deleted.`);
                
                // Don't refresh from database immediately - let the local deletion persist
                // The next natural refresh will sync with database
              } else {
                Alert.alert('Error', 'Failed to delete the workout plan. Please check the console for debugging info.');
              }
            } catch (error) {
              console.error(`[WorkoutPlans] Error deleting plan: ${error}`);
              Alert.alert('Error', 'An unexpected error occurred while deleting the plan.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, []);

  // Add select plan function
  const handleSelectPlan = useCallback(async (plan: Plan) => {
    try {
      setLoading(true);
      console.log(`[WorkoutPlans] Setting plan ${plan.id} as active`);
      
      // Set the plan as active using WorkoutService
      const success = await WorkoutService.setActivePlan(user?.id || '', plan.id);
      
      if (success) {
        // Update local state to reflect the change
        setPlans(prev => prev.map(p => ({
          ...p,
          is_active: p.id === plan.id,
          status: p.id === plan.id ? 'active' : 'archived'
        })));
        
        // Update active plan ID
        setActivePlanId(plan.id);
        
        // Show success message
        Alert.alert(
          'Plan Activated', 
          `"${plan.name}" is now your active workout plan. Your recent activities and metrics will be based on this plan.`,
          [{ text: 'OK' }]
        );
        
        // Track analytics
        analyticsTrack('workout_plan_activated', { plan_id: plan.id, plan_name: plan.name });
      } else {
        Alert.alert('Error', 'Failed to set the plan as active. Please try again.');
      }
    } catch (error) {
      console.error('[WorkoutPlans] Error setting plan as active:', error);
      Alert.alert('Error', 'An unexpected error occurred while setting the plan as active.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAvatarContainer}>
            <Icon name="dumbbell" size={32} color={colors.primary} />
          </View>
          <Text style={styles.loadingText}>Preparing your workout plans...</Text>
        </View>
      </View>
    );
  }

  const activePlan = plans.find(p => p.id === activePlanId);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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

        {/* Weekly Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyStats.workouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyStats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyStats.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TutorialWrapper tutorialId="workout-history-button">
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/workout/history')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Icon name="history" size={22} color="#22C55E" />
              </View>
              <Text style={styles.quickActionLabel}>History</Text>
            </TouchableOpacity>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="workout-overview-button">
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/workout/progression-insights')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                <Icon name="chart-line" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Progress</Text>
            </TouchableOpacity>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="workout-plan-approaches">
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/workout/plan-create')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Icon name="plus-circle-outline" size={22} color="#6366F1" />
              </View>
              <Text style={styles.quickActionLabel}>New Plan</Text>
            </TouchableOpacity>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="quick-workout-button">
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => {
                analyticsTrack('quick_workout_tapped', { source: 'quick_action' });
                router.push({
                  pathname: '/(main)/workout/session/[sessionId]-premium',
                  params: {
                    sessionId: `quick-${Date.now()}`,
                    sessionTitle: 'Quick Workout',
                    fallbackExercises: JSON.stringify([]),
                  },
                });
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(175, 82, 222, 0.12)' }]}>
                <Icon name="lightning-bolt" size={22} color={colors.purple} />
              </View>
              <Text style={styles.quickActionLabel}>Quick Start</Text>
            </TouchableOpacity>
          </TutorialWrapper>
        </View>

        {/* AI Insight Card */}
        {activePlan && (
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIconContainer}>
                <Icon name="lightbulb-on" size={18} color={colors.primary} />
              </View>
              <Text style={styles.insightTitle}>AI Coach Tip</Text>
            </View>
            <Text style={styles.insightText}>
              {weeklyStats.workouts < 2
                ? "Consistency is key! Aim for at least 3 workouts this week to see results."
                : weeklyStats.workouts < 4
                  ? "Great progress! Add one more session this week for optimal gains."
                  : "You're crushing it! Remember to prioritize recovery between sessions."
              }
            </Text>
          </View>
        )}

        {/* Active Plan Section */}
        {activePlan && (
          <View style={styles.activePlanSection}>
            <Text style={styles.sectionTitle}>Active Plan</Text>
            <TouchableOpacity
              style={styles.activePlanCard}
              onPress={() => onPressPlan(activePlan)}
              activeOpacity={0.8}
            >
              <View style={styles.activePlanHeader}>
                <View style={styles.activePlanIconContainer}>
                  <Icon name="star" size={20} color={colors.primary} />
                </View>
                <View style={styles.activePlanInfo}>
                  <Text style={styles.activePlanName}>{activePlan.name}</Text>
                  <Text style={styles.activePlanMeta}>
                    {activePlan.training_level || 'General'} • {activePlan.mesocycle_length_weeks || 8} weeks
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* All Plans Section */}
        {plans.length > 0 && (
          <View style={styles.plansSection}>
            <View style={styles.plansSectionHeader}>
              <Text style={styles.sectionTitle}>Your Plans</Text>
              <TouchableOpacity
                onPress={() => router.push('/(main)/workout/plan-create')}
                style={styles.addPlanButton}
              >
                <Icon name="plus" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {plans
              .filter(p => !showAllPlans ? !p.is_active : true)
              .slice(0, showAllPlans ? plans.length : 3)
              .map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planListItem, plan.is_active && styles.planListItemActive]}
                  onPress={() => onPressPlan(plan)}
                  activeOpacity={0.7}
                >
                  <View style={styles.planListItemLeft}>
                    <View style={styles.planListIcon}>
                      <Icon name="clipboard-text-outline" size={16} color={colors.white} />
                    </View>
                    <View style={styles.planListInfo}>
                      <Text style={styles.planListName}>{plan.name}</Text>
                      <Text style={styles.planListMeta}>
                        {plan.training_level || 'General'} • {plan.mesocycle_length_weeks || 8} weeks
                      </Text>
                    </View>
                  </View>
                  <View style={styles.planListActions}>
                    {!plan.is_active && (
                      <TouchableOpacity
                        onPress={() => handleSelectPlan(plan)}
                        style={styles.setActiveSmallButton}
                      >
                        <Text style={styles.setActiveSmallText}>Activate</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeletePlan(plan)}
                      style={styles.deleteSmallButton}
                    >
                      <Icon name="trash-can-outline" size={16} color="rgba(255, 69, 58, 0.7)" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}

            {plans.filter(p => !p.is_active).length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllPlans(!showAllPlans)}
                style={styles.showMoreButton}
              >
                <Text style={styles.showMoreText}>
                  {showAllPlans ? 'Show Less' : `Show ${plans.filter(p => !p.is_active).length - 3} More`}
                </Text>
                <Icon
                  name={showAllPlans ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty State */}
        {plans.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="dumbbell" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Workout Plans Yet</Text>
            <Text style={styles.emptyDescription}>
              I'll create a personalized workout plan based on your goals and fitness level.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(main)/workout/plan-create')}
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

        {/* Health Disclaimer */}
        <View style={styles.disclaimerSection}>
          <HealthDisclaimer variant="compact" />
        </View>
      </ScrollView>
    </View>
  );
};

// MARK: - Clean Styles
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

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
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

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  // Active Plan Section
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
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
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

  // Empty State
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  emptyDescription: {
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

  // Disclaimer
  disclaimerSection: {
    marginBottom: 20,
  },
});

export default WorkoutPlansScreen;
