import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ImageBackground, Dimensions, Animated, Alert } from 'react-native';
import { Text, Button, FAB } from 'react-native-paper';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { mockWorkoutPlansStore } from '../../../src/mock-data';
import { WorkoutLocalStore } from '../../../src/services/workout/WorkoutLocalStore';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';
import { track as analyticsTrack } from '../../../src/services/analytics/analytics';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';

// MARK: - Enhanced Design System
const { width } = Dimensions.get('window');

// Modern, premium colors with enhanced palette
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F65',
  accent: '#FF8F65',
  secondary: '#34C759',
  background: '#121212',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  cardLight: 'rgba(44, 44, 46, 0.9)',
  border: 'rgba(84, 84, 88, 0.6)',
  borderLight: 'rgba(84, 84, 88, 0.3)',
  white: '#FFFFFF',
  dark: '#121212',
  glass: 'rgba(255, 255, 255, 0.1)',
  glassStrong: 'rgba(255, 255, 255, 0.15)',
  blue: '#007AFF',
  purple: '#AF52DE',
  pink: '#FF2D92',
  cyan: '#5AC8FA',
};

const typography = {
  h4: { fontSize: 32, fontWeight: '800' as const, color: colors.text },
  h5: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  h6: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  subtitle1: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body1: { fontSize: 16, color: colors.textSecondary },
  body2: { fontSize: 14, color: colors.textSecondary },
  caption: { fontSize: 12, color: colors.textSecondary },
  button: { fontSize: 14, fontWeight: '700' as const, color: colors.white },
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
    weekly_schedule?: any; // Added for navigation
}

// MARK: - Screen Component
const WorkoutPlansScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  useEffect(() => {
    analyticsTrack('screen_view', { screen: 'workout_plans' });
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Add a useEffect to refresh when the refresh param changes
  const { refresh } = useLocalSearchParams<{ refresh: string }>();

  // Fix the fetchPlans function to ensure unique IDs
  const fetchPlans = useCallback(async () => {
    if (user?.id) {
      setLoading(true);
      try {
        console.log('[WorkoutPlans] Fetching plans for user:', user.id);
        
        // Load from local storage first for immediate display
        let localPlans: any[] = [];
        try {
          const rawPlans = await WorkoutLocalStore.getPlans(user.id);
                  console.log('[WorkoutPlans] Raw plans from storage:', {
          type: typeof rawPlans,
          isArray: Array.isArray(rawPlans),
          length: rawPlans?.length,
          sample: rawPlans?.slice?.(0, 1)?.map(p => ({
            id: p?.id,
            name: p?.name,
            type: typeof p,
            isArray: Array.isArray(p),
            keys: p ? Object.keys(p).slice(0, 5) : []
          }))
        });
          
          // Ensure we have an array
          if (Array.isArray(rawPlans)) {
            localPlans = rawPlans;
          } else if (rawPlans && typeof rawPlans === 'object') {
            // If it's an object, try to extract array from it
            localPlans = rawPlans.plans || rawPlans.data || [rawPlans];
          } else {
            console.warn('[WorkoutPlans] Invalid plans data from storage:', rawPlans);
            localPlans = [];
          }
        } catch (error) {
          console.error('[WorkoutPlans] Error loading plans from storage:', error);
          localPlans = [];
        }
        
        // Validate and deduplicate plans
        const validPlans = removeDuplicatePlans(localPlans);
        console.log(`[WorkoutPlans] Successfully processed ${validPlans.length} valid plans`);
        setPlans(validPlans);

        // Fetch the active plan to ensure it's correctly set
        try {
          const activePlan = await WorkoutService.getActivePlan(user.id);
          if (activePlan) {
            console.log('[WorkoutPlans] Found active plan:', { id: activePlan.id, name: activePlan.name, type: typeof activePlan });
            
            // Validate the active plan
            const validatedActivePlan = validatePlan(activePlan);
            if (validatedActivePlan) {
              setActivePlanId(validatedActivePlan.id);
              
              // Ensure the active plan is marked as active
              validatedActivePlan.is_active = true;
              validatedActivePlan.status = 'active';
              
              // Update the plans list to include the active plan
              const updatedPlans = [...validPlans];
              const existingIndex = updatedPlans.findIndex(p => p.id === validatedActivePlan.id);
              
              if (existingIndex !== -1) {
                // Update existing plan
                updatedPlans[existingIndex] = validatedActivePlan;
              } else {
                // Add new active plan
                updatedPlans.unshift(validatedActivePlan);
              }
              
              // Mark all other plans as inactive
              const finalPlans = updatedPlans.map(p => ({
                ...p,
                is_active: p.id === validatedActivePlan.id,
                status: p.id === validatedActivePlan.id ? 'active' : 'inactive'
              }));
              
              setPlans(finalPlans);
            } else {
              console.warn('[WorkoutPlans] Active plan validation failed');
            }
          } else {
            console.log('[WorkoutPlans] No active plan found');
            setActivePlanId(null);
          }
        } catch (error) {
          console.error('[WorkoutPlans] Error fetching active plan:', error);
          setActivePlanId(null);
        }
        
        // Also try to fetch all plans from the service
        try {
          if (!supabase) {
            console.error('[WorkoutPlans] Supabase client not initialized. Check environment variables.');
            return;
          }
          
          const { data: allPlans } = await supabase
            .from('workout_plans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (allPlans && allPlans.length > 0) {
            console.log('[WorkoutPlans] Fetched', allPlans.length, 'plans from database');
            
            // Fetch weekly schedules for each plan to ensure complete data
            const enrichedPlans = await Promise.all(
              allPlans.map(async (plan) => {
                // If this is a UUID plan, try to fetch its sessions and weekly schedule
                if (WorkoutService.isValidUUID(plan.id)) {
                  try {
                    // First try to get sessions
                    const sessions = await WorkoutService.getSessionsForPlan(plan.id);
                    
                    if (sessions && sessions.length > 0) {
                      // Fetch exercise sets for each session
                      const sessionsWithExercises = await Promise.all(
                        sessions.map(async (session) => {
                          try {
                            const sets = await WorkoutService.getExerciseSetsForSession(session.id);
                            if (sets && sets.length > 0) {
                              // Map exercise sets to exercises
                              return {
                                ...session,
                                exercises: sets.map((set) => ({
                                  name: set.exercise?.name || 'Exercise',
                                  sets: set.target_sets || 3,
                                  reps: set.target_reps || '8-12',
                                  restBetweenSets: set.rest_period || '60s'
                                }))
                              };
                            }
                            return session;
                          } catch (error) {
                            console.error(`[WorkoutPlans] Error fetching exercise sets for session ${session.id}:`, error);
                            return session;
                          }
                        })
                      );
                      
                      // Add the sessions to the plan as weekly_schedule
                      return {
                        ...plan,
                        weekly_schedule: sessionsWithExercises,
                        weeklySchedule: sessionsWithExercises
                      };
                    }
                  } catch (error) {
                    console.error(`[WorkoutPlans] Error fetching sessions for plan ${plan.id}:`, error);
                  }
                }
                
                // If we couldn't fetch sessions, or this isn't a UUID plan, return as is
                return plan;
              })
            );
            
            const uniqueDbPlans = removeDuplicatePlans(enrichedPlans);
            setPlans(uniqueDbPlans as any);
            
            // Also update local storage with these plans
            await WorkoutLocalStore.savePlans(user.id, uniqueDbPlans as any);
          }
        } catch (dbError) {
          console.error('[WorkoutPlans] Error fetching plans from database:', dbError);
        }
      } catch (error) {
        console.error('[WorkoutPlans] Failed to fetch workout plans:', error);
        // Still try to show whatever local has
        const fallbackLocal = user?.id ? await WorkoutLocalStore.getPlans(user.id) : [];
        const uniqueFallback = removeDuplicatePlans(fallbackLocal as any);
        setPlans(uniqueFallback as any);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id]);

  // Fetch active plan
  const fetchActivePlan = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const activePlan = await WorkoutService.getActivePlan(user.id);
      
      if (activePlan) {
        console.log('[WorkoutPlans] Found active plan:', activePlan.id);
        setActivePlanId(activePlan.id);
      } else {
        console.log('[WorkoutPlans] No active plan found');
        setActivePlanId(null);
      }
    } catch (error) {
      console.error('[WorkoutPlans] Error fetching active plan:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to validate and normalize a plan object
  const validatePlan = (plan: any): Plan | null => {
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
  };

  // Add this helper function to remove duplicate plans
  const removeDuplicatePlans = (plans: any[]): Plan[] => {
    if (!Array.isArray(plans)) {
      console.warn('[WorkoutPlans] Plans is not an array:', typeof plans, plans);
      return [];
    }

    // Validate and normalize all plans
    const validPlans: Plan[] = [];
    for (const plan of plans) {
      const validatedPlan = validatePlan(plan);
      if (validatedPlan) {
        validPlans.push(validatedPlan);
      }
    }

    console.log(`[WorkoutPlans] Validated ${validPlans.length} out of ${plans.length} plans`);

    if (validPlans.length === 0) {
      return [];
    }
    
    // Remove duplicates by ID first, then by name
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const uniquePlans: Plan[] = [];

    // Sort by creation date (newest first) to prefer newer duplicates
    const sortedPlans = [...validPlans].sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });

    for (const plan of sortedPlans) {
      const planId = plan.id;
      const planName = (plan.name || '').trim().toLowerCase();

      // Skip if we've seen this ID
      if (seenIds.has(planId)) {
        console.log(`[WorkoutPlans] Skipping duplicate ID: ${planId}`);
        continue;
      }

      // Skip if we've seen this name (unless it's an empty name)
      if (planName && seenNames.has(planName)) {
        console.log(`[WorkoutPlans] Skipping duplicate name: ${planName}`);
        continue;
      }

      seenIds.add(planId);
      if (planName) {
        seenNames.add(planName);
      }
      uniquePlans.push(plan);
    }

    // Sort final result - active plans first, then by creation date (newer first)
    uniquePlans.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return bDate - aDate;
    });
    
    console.log(`[WorkoutPlans] Final unique plans: ${uniquePlans.length}`);
    return uniquePlans;
  };

  useEffect(() => {
    // Check if the refresh param exists
    if (refresh) {
      console.log('[WorkoutPlans] Detected refresh param, reloading plans');
      fetchPlans();
    }
  }, [refresh, fetchPlans]);

  useFocusEffect(
    useCallback(() => {
      console.log('[WorkoutPlans] Screen focused, refreshing data');
      
      // Force a refresh when the screen is focused
      fetchPlans();
      
      // Also set up a timer to refresh again after a short delay
      // This helps when returning from the preview screen
      const refreshTimer = setTimeout(() => {
        console.log('[WorkoutPlans] Delayed refresh to catch any recent changes');
        fetchPlans();
      }, 1000);
      
      return () => {
        clearTimeout(refreshTimer);
      };
    }, [fetchPlans])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlans();
  }, [fetchPlans]);

  const onPressPlan = useCallback((plan: Plan) => {
    analyticsTrack('workout_plan_open', { plan_id: plan.id });
    router.push({ pathname: '/(main)/workout/plan/[planId]', params: { planId: String(plan.id), name: plan.name } as any });
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
    const planName = plan?.name || plan?.title || 'Unknown Plan';
    const planId = plan?.id || plan?.planId || plan?.plan_id;
    
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
              
              // Try multiple approaches to delete the plan
              let success = false;
              
              if (planId) {
                console.log('[WorkoutPlans] Attempting deletion by ID');
                success = await WorkoutLocalStore.deletePlan(planId);
              }
              
              if (!success && planName && planName !== 'Unknown Plan') {
                console.log('[WorkoutPlans] Attempting deletion by name');
                success = await WorkoutLocalStore.deletePlansByName(planName);
              }
              
              // Fallback: try to find and delete by any available property
              if (!success) {
                console.log('[WorkoutPlans] Fallback: attempting to delete by object comparison');
                // Get all plans and try to find a match
                const allStoredPlans = await WorkoutLocalStore.getAllPlans();
                console.log('[WorkoutPlans] All stored plans:', allStoredPlans.map(p => ({ id: p.id, name: p.name })));
                
                // Try to match by any available properties
                const matchingPlan = allStoredPlans.find(storedPlan => {
                  return (
                    (planId && storedPlan.id === planId) ||
                    (planName !== 'Unknown Plan' && storedPlan.name === planName) ||
                    (plan?.description && storedPlan.description === plan.description) ||
                    (plan?.training_level && storedPlan.training_level === plan.training_level)
                  );
                });
                
                if (matchingPlan) {
                  console.log('[WorkoutPlans] Found matching plan:', matchingPlan);
                  success = await WorkoutLocalStore.deletePlan(matchingPlan.id);
                }
              }
              
              if (success) {
                // Also try to delete from database if it's a real UUID
                if (planId && WorkoutService.isValidUUID(planId)) {
                  try {
                    await WorkoutService.deletePlan(planId);
                    console.log(`[WorkoutPlans] Successfully deleted plan from database: ${planId}`);
                  } catch (dbError) {
                    console.error(`[WorkoutPlans] Error deleting plan from database: ${dbError}`);
                    // Continue even if database delete fails
                  }
                }
                
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
          status: p.id === plan.id ? 'active' : 'inactive'
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

  const renderPlanCard = ({ item, index }: { item: Plan; index: number }) => {
    // Create a unique key for each plan item
    const uniqueKey = `plan-${item.id}-${index}`;
    
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [
        {
          translateY: slideAnim,
        },
        {
          scale: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    };

    return (
      <Animated.View 
        style={[animatedStyle, { marginBottom: 20 }]}
        key={uniqueKey}
      >
        <TouchableOpacity 
          onPress={() => onPressPlan(item)}
          activeOpacity={0.8}
        >
          <View style={[styles.planCard, item.is_active && styles.activePlanCard]}>
            <ImageBackground
              source={{ uri: item.image_url }}
              style={styles.planCardBackground}
              imageStyle={styles.planCardImage}
            >
              {/* Enhanced gradient overlay */}
              <LinearGradient
                colors={[
                  'rgba(0,0,0,0.3)',
                  'rgba(0,0,0,0.5)',
                  'rgba(0,0,0,0.8)'
                ]}
                style={styles.cardOverlay}
              />
              
              {/* Active plan badge */}
              {item.is_active && (
                <View style={styles.activeChip}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    style={styles.activeChipGradient}
                  >
                    <Icon name="star" color={colors.white} size={14} />
                    <Text style={styles.activeChipText}>ACTIVE PLAN</Text>
                  </LinearGradient>
                </View>
              )}
              
              {/* Delete button - top right */}
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeletePlan(item)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.error, 'rgba(255, 69, 58, 0.8)']}
                  style={styles.deleteButtonGradient}
                >
                  <Icon name="delete" color={colors.white} size={16} />
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Card content */}
              <View style={styles.cardContent}>
                <Text style={styles.planTitle}>{item.name}</Text>
                <View style={styles.planDetails}>
                  <View style={styles.detailItem}>
                    <Icon name="trending-up" size={14} color={colors.primary} />
                    <Text style={styles.detailText}>{item.training_level}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Icon name="calendar-clock" size={14} color={colors.primary} />
                    <Text style={styles.detailText}>{item.mesocycle_length_weeks} Weeks</Text>
                  </View>
                </View>
                
                {/* Select Plan Button */}
                {!item.is_active && (
                  <TouchableOpacity 
                    style={styles.selectButton}
                    onPress={() => handleSelectPlan(item)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.selectButtonGradient}
                    >
                      <Icon name="check" color={colors.white} size={16} />
                      <Text style={styles.selectButtonText}>SELECT PLAN</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Glow effect for active plan */}
              {item.is_active && <View style={styles.activeGlow} />}
            </ImageBackground>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ListHeader = () => (
    <Animated.View style={[
      styles.header,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      {/* Enhanced app header */}
      <View style={styles.appHeader}>
        <View style={styles.headerLine} />
        <Text style={styles.appName}>WORKOUT<Text style={{ color: colors.primary }}>HUB</Text></Text>
        <View style={styles.headerLine} />
      </View>

      {/* Title section */}
      <View style={styles.titleSection}>
        <View style={styles.titleGlow}>
          <View style={styles.titleDateContainer}>
            <Icon name="dumbbell" size={18} color={colors.primary} />
            <Text style={styles.titleDate}>TRAINING PLANS</Text>
          </View>
          <Text style={styles.titleMain}>YOUR FITNESS JOURNEY</Text>
          <Text style={styles.titleDescription}>
            Powerful, personalized workout plans designed for your transformation
          </Text>
          <View style={styles.titleAccent} />
        </View>
      </View>

      {/* Enhanced View History Action */}
      <View style={styles.historyButtonContainer}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/(main)/workout/history')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.historyButtonGradient}
          >
            <View style={styles.historyButtonContent}>
              <Icon name="trending-up" size={20} color={colors.white} />
              <View style={styles.historyButtonTextContainer}>
                <Text style={styles.historyButtonTitle}>Track Progress</Text>
                <Text style={styles.historyButtonSubtitle}>View workout history & gains</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.white} />
            </View>
          </LinearGradient>
          
          {/* Subtle glow effect */}
          <View style={styles.historyButtonGlow} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <BlurView intensity={60} style={styles.statsBlur}>
          <LinearGradient
            colors={[colors.glassStrong, colors.glass]}
            style={styles.statsGradient}
          >
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{plans.length}</Text>
              <Text style={styles.statLabel}>PLANS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{plans.filter(p => p.is_active).length}</Text>
              <Text style={styles.statLabel}>ACTIVE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>WEEKS</Text>
            </View>
          </LinearGradient>
        </BlurView>
      </View>


    </Animated.View>
  );

  const EmptyState = () => (
    <Animated.View style={[
      styles.emptyContainer,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <View style={styles.emptyCard}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' }}
          style={styles.emptyImageBackground}
          imageStyle={styles.emptyImageStyle}
        >
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.6)',
              'rgba(0,0,0,0.8)',
              'rgba(0,0,0,0.9)'
            ]}
            style={styles.emptyOverlay}
          />
          
          {/* Enhanced empty state content */}
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.emptyIconGradient}
              >
                <Icon name="creation" size={32} color={colors.white} />
              </LinearGradient>
            </View>
            
            <Text style={styles.emptyTitle}>Your Journey Starts Now</Text>
            <Text style={styles.emptySubtitle}>
              Create a powerful, personalized workout plan to begin your transformation.
            </Text>
            
            <TouchableOpacity
              onPress={() => router.push('/(main)/workout/plan-create')}
              style={styles.createButtonContainer}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.createButton}
              >
                <Icon name="plus" size={16} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.createButtonText}>Create First Plan</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    </Animated.View>
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.background, colors.surface]}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingCard}>
            <LinearGradient
              colors={[colors.glass, colors.glassStrong]}
              style={styles.loadingCardGradient}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading Plans...</Text>
              <Text style={styles.loadingSubText}>Preparing your fitness journey</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced dynamic background */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.7)', 
            'rgba(18,18,18,0.85)', 
            'rgba(18,18,18,0.95)', 
            '#121212'
          ]}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Animated header blur */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={100} style={styles.blurHeader}>
          <View style={[styles.quickHeader, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLine} />
            <Text style={styles.appName}>WORKOUT<Text style={{ color: colors.primary }}>HUB</Text></Text>
            <View style={styles.headerLine} />
          </View>
        </BlurView>
      </Animated.View>

      <Animated.FlatList
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        data={plans}
        renderItem={renderPlanCard}
        keyExtractor={(item, index) => `plan-${item.id}-${index}`}
        ListHeaderComponent={plans.length > 0 ? <ListHeader /> : null}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary}
            progressBackgroundColor="rgba(255,255,255,0.1)"
          />
        }
      />
      
      {/* Enhanced floating action button */}
      {plans.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingActionButton}
          onPress={() => router.push('/(main)/workout/plan-create')}
          activeOpacity={0.8}
        >
          <View style={styles.fabShadow} />
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.fabGradient}
          >
            <Icon name="plus" size={28} color={colors.white} />
          </LinearGradient>
          <View style={styles.fabPulse} />
          <View style={styles.fabRing} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// MARK: - Enhanced Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  overlay: {
    flex: 1,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
  },
  appNameGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingCard: {
    width: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingCardGradient: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  loadingSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 145,
  },
  header: {
    marginBottom: 32,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    marginBottom: 24,
  },
  titleSection: {
    paddingHorizontal: 0,
    marginBottom: 24,
  },
  titleGlow: {
    position: 'relative',
    paddingVertical: 20,
    alignItems: 'flex-start',
  },
  titleDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleDate: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  titleMain: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textShadowColor: 'rgba(255, 255, 255, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    fontWeight: '500',
  },
  titleAccent: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    transform: [{ translateX: -10 }],
    width: 20,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
    zIndex: -1,
  },
  statsRow: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsBlur: {
    borderRadius: 16,
  },
  statsGradient: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  planCard: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  activePlanCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowOpacity: 0.3,
  },
  planCardBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  planCardImage: {
    borderRadius: 20,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  activeChip: {
    position: 'absolute',
    top: 20,
    left: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  activeChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  activeChipText: {
    color: colors.white,
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 11,
    letterSpacing: 1,
  },
  activeGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: colors.primary,
    opacity: 0.1,
    borderRadius: 30,
    zIndex: -1,
  },
  cardContent: {
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  planDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  detailText: {
    color: colors.white,
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyImageBackground: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyImageStyle: {
    borderRadius: 20,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  createButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 120,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabShadow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    opacity: 0.3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,107,53,0.2)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
  fabRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,107,53,0.05)',
    top: -20,
    left: -20,
    zIndex: -2,
  },
  deleteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Enhanced History Button Styles
  historyButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  historyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  historyButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  historyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  historyButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  historyButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  historyButtonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    backgroundColor: colors.primary,
    opacity: 0.1,
    zIndex: -1,
  },

  // Select Button Styles
  selectButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  selectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  selectButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },

});

export default WorkoutPlansScreen; 