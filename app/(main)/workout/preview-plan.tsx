import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ImageBackground, Dimensions } from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { mockWorkoutPlansStore } from '../../../src/mock-data';
import { WorkoutService as RealWorkoutService } from '../../../src/services/workout/WorkoutService';
import { WorkoutLocalStore } from '../../../src/services/workout/WorkoutLocalStore';
import { useAuth } from '../../../src/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../../../src/config/environment';

// Modern Dark Design System
const { width } = Dimensions.get('window');

// Premium dark colors matching your other pages
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
};

// Helper function to check if an exercise is cardio-based
const isCardioExercise = (exercise: any): boolean => {
  // Explicitly exclude strength exercises that should never be treated as cardio
  const strengthExerciseNames = ['face pull', 'cable face pull', 'reverse fly', 'rear delt fly', 'rope pushdown', 'tricep rope', 'tricep pushdown'];
  if (exercise.name && strengthExerciseNames.some(name => 
    exercise.name.toLowerCase().includes(name)
  )) {
    return false;
  }
  
  const cardioCategories = ['cardio', 'cardiovascular'];
  const cardioMuscleGroups = ['cardio', 'cardiovascular', 'full body'];
  const cardioKeywords = ['jump', 'burpee', 'running', 'sprint', 'hiit', 'interval', 'rope', 'mountain', 'climber', 
                          'jack', 'knee', 'kicker', 'bound', 'crawl', 'star', 'battle', 'swing', 'slam', 'shuttle', 
                          'fartlek', 'swimming', 'dance', 'dancing', 'step', 'stair', 'climb', 'cardio'];
  
  // Check category
  if (exercise.category && cardioCategories.some(cat => exercise.category.toLowerCase().includes(cat))) {
    return true;
  }
  
  // Check muscle groups
  if (exercise.muscle_groups?.some(mg => 
    cardioMuscleGroups.some(cardio => mg.toLowerCase().includes(cardio))
  )) {
    return true;
  }
  
  // Check exercise name for cardio keywords
  if (exercise.name && cardioKeywords.some(keyword => 
    exercise.name.toLowerCase().includes(keyword)
  )) {
    return true;
  }
  
  return false;
};

export default function PreviewPlanScreen() {
  const { planObject, originalPlanId } = useLocalSearchParams<{ planObject: string; originalPlanId: string }>();
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Helper: wrap a partial/single exercise response into a minimal valid plan
  const coerceToPlan = (maybePlan: any) => {
    // If it already looks like a plan, return as-is
    if (maybePlan && (maybePlan.weeklySchedule || maybePlan.weekly_schedule)) {
      return maybePlan;
    }

    // If it looks like a single exercise suggestion, wrap it
    const candidate = maybePlan?.newPlan || maybePlan;
    const looksLikeExercise = candidate && (
      typeof candidate.name === 'string' &&
      (candidate.sets != null || candidate.reps != null || candidate.rest != null || candidate.restBetweenSets != null)
    );

    if (looksLikeExercise) {
      const exercise = {
        name: candidate.name || 'Exercise',
        sets: typeof candidate.sets === 'number' ? candidate.sets : 3,
        reps: candidate.reps || '8-12',
        rest: candidate.rest || candidate.restBetweenSets || '60s',
      };

      const wrapped = {
        id: candidate.id || `preview-${Date.now()}`,
        name: candidate.plan_name || 'AI Suggested Update',
        training_level: candidate.training_level || 'intermediate',
        weekly_schedule: [
          {
            day: 'Day 1',
            focus: 'Updated Session',
            exercises: [exercise],
          },
        ],
      } as any;

      // Maintain both snake_case and camelCase for downstream compatibility
      wrapped.weeklySchedule = wrapped.weekly_schedule;
      return wrapped;
    }

    // Unknown structure → return as-is, validation will handle
    return maybePlan;
  };

  // Update the useEffect to better handle planObject parsing and logging
  useEffect(() => {
    try {
      console.log('[PREVIEW] Attempting to process planObject');
      
      if (!planObject) {
        console.error('[PREVIEW] No planObject provided');
        setPlan(createEmergencyPlan());
        setIsLoading(false);
        return;
      }
      
      console.log('[PREVIEW] Received planObject type:', typeof planObject);
      
      // Handle both string and object formats
      let parsedPlan;
      try {
        if (typeof planObject === 'string') {
          parsedPlan = JSON.parse(planObject);
        } else {
          // If it's already an object, use it directly
          parsedPlan = planObject;
        }
      } catch (parseError) {
        console.error('[PREVIEW] Failed to parse planObject:', parseError);
        setPlan(createEmergencyPlan());
        setIsLoading(false);
        return;
      }
      
      if (!parsedPlan) {
        console.error('[PREVIEW] Parsed plan is null or undefined');
        setPlan(createEmergencyPlan());
        setIsLoading(false);
        return;
      }
      
      // Coerce partial structures into a valid plan
      const normalized = coerceToPlan(parsedPlan);
      console.log('[PREVIEW] Successfully parsed plan:', normalized?.name || 'unnamed plan');
      
      // Validate the plan structure
      if (!normalized || (!normalized.weeklySchedule && !normalized.weekly_schedule)) {
        console.error('[PREVIEW] Invalid plan structure, creating emergency plan');
        setPlan(createEmergencyPlan());
        setIsLoading(false);
        return;
      }
      
      // Check if weekly schedule exists and has items
      const schedule = normalized.weeklySchedule || normalized.weekly_schedule;
      if (!Array.isArray(schedule) || schedule.length === 0) {
        console.error('[PREVIEW] Plan has empty weekly schedule, creating emergency plan');
        setPlan(createEmergencyPlan());
        setIsLoading(false);
        return;
      }
      
      // All validations passed, set the plan
      setPlan(normalized);
      setIsLoading(false);
    } catch (e) {
      console.error("[PREVIEW] Unexpected error processing planObject:", e);
      setPlan(createEmergencyPlan());
      setIsLoading(false);
    }
  }, [planObject]);

  // Add a function to create an emergency plan
  const createEmergencyPlan = () => {
    console.log('[PREVIEW] Creating emergency plan');
    return {
      name: "Emergency Workout Plan",
      training_level: "intermediate",
      weekly_schedule: [
        {
          day: "Day 1",
          focus: "Full Body",
          exercises: [
            { name: "Squats", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Push-Ups", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Deadlifts", sets: 3, reps: "8-12", rest: "60s" }
          ]
        },
        {
          day: "Day 2",
          focus: "Rest",
          exercises: []
        },
        {
          day: "Day 3",
          focus: "Upper Body",
          exercises: [
            { name: "Bench Press", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Pull-Ups", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Shoulder Press", sets: 3, reps: "8-12", rest: "60s" }
          ]
        }
      ],
      weeklySchedule: [
        {
          day: "Day 1",
          focus: "Full Body",
          exercises: [
            { name: "Squats", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Push-Ups", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Deadlifts", sets: 3, reps: "8-12", rest: "60s" }
          ]
        },
        {
          day: "Day 2",
          focus: "Rest",
          exercises: []
        },
        {
          day: "Day 3",
          focus: "Upper Body",
          exercises: [
            { name: "Bench Press", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Pull-Ups", sets: 3, reps: "8-12", rest: "60s" },
            { name: "Shoulder Press", sets: 3, reps: "8-12", rest: "60s" }
          ]
        }
      ]
    };
  };

  const handleApplyPlan = async () => {
    try {
      setIsApplying(true);
      console.log('--- APPLYING NEW PLAN ---');
      console.log('[STEP 1] Plan to apply:', JSON.stringify(plan, null, 2));
      
      if (!plan) {
        console.error('[APPLY PLAN] No plan to apply');
        Alert.alert('Error', 'No plan to apply.');
        return;
      }
      
      // Normalize the plan structure - ensure both weekly_schedule and weeklySchedule are set
      const weeklySchedule = plan.weeklySchedule || plan.weekly_schedule || [];
      const normalizedPlan = {
        ...plan,
        weekly_schedule: weeklySchedule,
        weeklySchedule: weeklySchedule, // Ensure both properties exist
        is_active: true // Explicitly set as active
      };
      
      console.log('[STEP 2] Normalized plan:', JSON.stringify(normalizedPlan, null, 2));
      
      // Clear chat history in AsyncStorage
      try {
        // Create the chat history key using the same format as in [planId].tsx
        const initialAIMessage = { 
          sender: 'ai', 
          text: 'Hi! I can help you refine your workout plan. What would you like to change or ask?' 
        };
        
        // We need to use the same key format as in [planId].tsx
        const planId = normalizedPlan.id || 'unknown';
        const userId = user?.id || 'unknown';
        const chatKey = `chatHistory_${planId}_${userId}`;
        
        await AsyncStorage.setItem(chatKey, JSON.stringify([initialAIMessage]));
        console.log('[APPLY PLAN] Chat history cleared for future plan');
      } catch (storageError) {
        console.error('[APPLY PLAN] Error clearing chat history in storage:', storageError);
      }
      
      let newPlanId = '';
      let apiSuccess = false;
      
      try {
        // Try multiple API URLs in sequence
        const API_URLS = [
          'https://gofitai-production.up.railway.app',
          environment.apiUrl
        ].filter(Boolean);
        
        for (const apiUrl of API_URLS) {
          try {
            console.log(`[STEP 3] Trying to send plan to API: ${apiUrl}/api/save-plan`);
            
            const res = await fetch(`${apiUrl}/api/save-plan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                plan: normalizedPlan, 
                user 
              }),
            });
            
            console.log('[STEP 4] Received response with status:', res.status);
            
            if (res.ok) {
              const data = await res.json();
              console.log('[STEP 5] Parsed response data:', JSON.stringify(data, null, 2));

              if (data.success && data.newPlanId) {
                apiSuccess = true;
                newPlanId = data.newPlanId;
                console.log('[STEP 6] Plan saved successfully with ID:', newPlanId);
                
                // Working URL detected
                break; // Exit the loop on success
              }
            }
          } catch (apiError) {
            console.error(`[APPLY PLAN] API call error for ${apiUrl}:`, apiError);
            // Continue to next URL
          }
        }
      } catch (error) {
        console.error('[APPLY PLAN] Error in API calls:', error);
      }
      
      if (!apiSuccess) {
        // Fallback: Generate a local ID and use the mock store
        newPlanId = `ai-${Date.now().toString(36)}`;
        console.log('[APPLY PLAN] Using fallback ID:', newPlanId);
        
        // Create a plan object with the fallback ID
        const newPlan = {
          ...normalizedPlan,
          id: newPlanId,
          user_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        };
        
        // Add to mock store
        try {
          // First deactivate any existing active plans
          mockWorkoutPlansStore.plans.forEach(p => {
            if (p.user_id === user?.id && p.is_active) {
              console.log('[APPLY PLAN] Deactivating existing plan:', p.id);
              p.is_active = false;
            }
          });
          
          mockWorkoutPlansStore.plans.unshift(newPlan);
          console.log('[APPLY PLAN] Added plan to mock store');
        } catch (mockError) {
          console.error('[APPLY PLAN] Error adding to mock store:', mockError);
        }
        
        // Add to local store
        try {
          if (user?.id) {
            await WorkoutLocalStore.addPlan(user.id, newPlan);
            console.log('[APPLY PLAN] Added plan to local store');
          }
        } catch (localError) {
          console.error('[APPLY PLAN] Error adding to local store:', localError);
        }
      }
      
      // Explicitly set this plan as active using the WorkoutService
      if (user?.id && newPlanId) {
        console.log(`[APPLY PLAN] Setting plan ${newPlanId} as active for user ${user.id}`);
        try {
          await RealWorkoutService.setActivePlan(user.id, newPlanId);
          console.log('[APPLY PLAN] Successfully set plan as active');
        } catch (activeError) {
          console.error('[APPLY PLAN] Error setting plan as active:', activeError);
        }
      }
      
      // Add a small delay to ensure all async operations complete
      setTimeout(() => {
        // Navigate back to the original plan with the new plan ID and refresh
        if (originalPlanId) {
          router.replace({
            pathname: `/workout/plan/${newPlanId}`,
            params: { 
              refresh: Date.now().toString(),
              applied: 'true'
            }
          });
        } else {
          // Fallback to plans list if no original plan ID
          router.replace({
            pathname: '/workout/plans',
            params: { refresh: Date.now().toString() }
          });
        }
        
        Alert.alert('Success!', 'Your new workout plan has been applied and set as active.');
      }, 500);
      
    } catch (e) {
      console.error('--- APPLY PLAN FAILED ---');
      console.error('Full error object:', e);
      Alert.alert('Error', 'An unexpected error occurred while saving the plan.');
    } finally {
      setIsApplying(false);
    }
  };

  const getSplitIcon = (name) => {
    const nameLower = (name || "").toLowerCase();
    if (nameLower.includes("upper")) return "arm-flex";
    if (nameLower.includes("lower")) return "human-handsdown";
    if (nameLower.includes("push")) return "weight-lifter";
    if (nameLower.includes("pull")) return "arm-flex";
    if (nameLower.includes("leg")) return "human-handsdown";
    if (nameLower.includes("core")) return "stomach";
    if (nameLower.includes("cardio")) return "run-fast";
    if (nameLower.includes("full")) return "human-male";
    if (nameLower.includes("rest")) return "sleep";
    return "dumbbell";
  };

  const getSplitImage = (name) => {
    const nameLower = (name || "").toLowerCase();
    
    if (nameLower.includes("rest")) {
      return 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=2000&auto=format&fit=crop'; // Rest day
    }
    
    // Upper body focused workouts
    if (nameLower.includes("upper")) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2000&auto=format&fit=crop'; // Upper body workout
    }
    
    // Lower body focused workouts
    if (nameLower.includes("lower")) {
      return 'https://images.unsplash.com/photo-1434596922112-19c563067271?q=80&w=2000&auto=format&fit=crop'; // Leg/squat workout
    }
    
    // Push workouts
    if (nameLower.includes("push")) {
      return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2000&auto=format&fit=crop'; // Bench press
    }
    
    // Pull workouts
    if (nameLower.includes("pull")) {
      return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=2000&auto=format&fit=crop'; // Pull-ups/rows
    }
    
    // Leg workouts
    if (nameLower.includes("leg")) {
      return 'https://images.unsplash.com/photo-1434596922112-19c563067271?q=80&w=2000&auto=format&fit=crop'; // Leg workout
    }
    
    // Core workouts
    if (nameLower.includes("core")) {
      return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2000&auto=format&fit=crop'; // Core/abs workout
    }
    
    // Cardio workouts
    if (nameLower.includes("cardio")) {
      return 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?q=80&w=2000&auto=format&fit=crop'; // Running/cardio
    }
    
    // Full body workouts
    if (nameLower.includes("full")) {
      return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop'; // Full body gym
    }
    
    // Chest workouts
    if (nameLower.includes("chest")) {
      return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2000&auto=format&fit=crop'; // Bench press
    }
    
    // Back workouts
    if (nameLower.includes("back")) {
      return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=2000&auto=format&fit=crop'; // Back workout
    }
    
    // Arms/biceps/triceps
    if (nameLower.includes("arm") || nameLower.includes("bicep") || nameLower.includes("tricep")) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2000&auto=format&fit=crop'; // Arm workout
    }
    
    // Shoulders
    if (nameLower.includes("shoulder")) {
      return 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?q=80&w=2000&auto=format&fit=crop'; // Shoulder workout
    }
    
    // Default fallback
    return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop'; // General gym
  };

  if (isLoading) {
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
              <Text style={styles.loadingText}>Loading plan preview...</Text>
              <Text style={styles.loadingSubText}>Preparing your workout details</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.centered}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Plan preview not available.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.backButtonGradient}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // Update the weekly schedule normalization with better error handling
  // Normalize the plan structure
  const weeklySchedule = plan?.weeklySchedule || plan?.weekly_schedule || [];

  // Add a check to ensure we have a valid weekly schedule
  if (!weeklySchedule || !Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
    console.warn('[PREVIEW] No valid weekly schedule found in plan:', plan);
    return (
      <View style={styles.centered}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Plan details not available.</Text>
        <Text style={styles.loadingSubText}>The workout plan appears to be empty or invalid.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.backButtonGradient}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced dynamic background */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.4)', 
            'rgba(18,18,18,0.6)', 
            'rgba(18,18,18,0.8)', 
            '#121212'
          ]}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <IconButton
          icon="arrow-left"
          iconColor={colors.white}
          size={24}
          onPress={() => {
            // Store the current modified plan for AI context
            if (plan && originalPlanId) {
              AsyncStorage.setItem(`modified_plan_${originalPlanId}`, JSON.stringify(plan))
                .catch(err => console.error('Error storing modified plan:', err));
            }
            router.back();
          }}
        />
        <Text style={styles.headerTitle}>Preview Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleGlow}>
            <View style={styles.titleDateContainer}>
              <Icon name="calendar-check" size={18} color={colors.primary} />
              <Text style={styles.titleDate}>PREVIEW YOUR NEW PLAN</Text>
            </View>
            <Text style={styles.titleMain}>{plan.name || 'New Workout Plan'}</Text>
            <Text style={styles.titleDescription}>
              Training level: {plan.training_level || 'Intermediate'}
            </Text>
            <View style={styles.titleAccent} />
          </View>
        </View>
        
        {/* Workout Days */}
        {weeklySchedule.map((day, dayIndex) => (
          <View key={`day-${dayIndex}`} style={styles.dayCard}>
            <ImageBackground
              source={{ uri: getSplitImage(day.focus || "") }}
              style={styles.dayCardBackground}
              imageStyle={styles.dayCardImage}
            >
              <LinearGradient
                colors={[
                  'rgba(0,0,0,0.2)',
                  'rgba(0,0,0,0.4)',
                  'rgba(0,0,0,0.7)'
                ]}
                style={styles.cardOverlay}
              />
              
              <View style={styles.dayHeader}>
                <View style={styles.dayIconContainer}>
                  <Icon 
                    name={getSplitIcon(day.focus || "")} 
                    size={22} 
                    color={colors.primary} 
                  />
                </View>
                
                <Text style={styles.dayName}>
                  {day.day}: {day.focus || `Day ${dayIndex + 1}`}
                </Text>
              </View>
            </ImageBackground>
            
            {/* Exercises */}
            <View style={styles.exercisesContainer}>
              {day.exercises && day.exercises.length > 0 ? (
                day.exercises.map((exercise, exIndex) => (
                  <View key={`exercise-${dayIndex}-${exIndex}`} style={styles.exerciseItem}>
                    <View style={styles.exerciseIconContainer}>
                      <Text style={styles.exerciseNumber}>{exIndex + 1}</Text>
                    </View>
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.exerciseName}>{exercise.name || 'Exercise'}</Text>
                      <View style={styles.exerciseMetrics}>
                        {isCardioExercise(exercise) ? (
                          // Cardio exercises: show timing-based parameters
                          <>
                            <View style={styles.metric}>
                              <Icon name="timer" size={14} color={colors.primary} />
                              <Text style={styles.metricText}>
                                {exercise.duration ? `${exercise.duration}s` : exercise.reps || '30s'} duration
                              </Text>
                            </View>
                            <View style={styles.metric}>
                              <Icon name="timer-outline" size={14} color={colors.primary} />
                              <Text style={styles.metricText}>
                                {exercise.restSeconds ? `${exercise.restSeconds}s` : exercise.rest || '30s'} rest
                              </Text>
                            </View>
                          </>
                        ) : (
                          // Strength exercises: show traditional sets/reps parameters
                          <>
                            <View style={styles.metric}>
                              <Icon name="repeat" size={14} color={colors.primary} />
                              <Text style={styles.metricText}>
                                {typeof exercise.sets === 'number' ? exercise.sets : 3} sets
                              </Text>
                            </View>
                            <View style={styles.metric}>
                              <Icon name="sync" size={14} color={colors.primary} />
                              <Text style={styles.metricText}>
                                {exercise.reps || '8-12'} reps
                              </Text>
                            </View>
                            <View style={styles.metric}>
                              <Icon name="timer-outline" size={14} color={colors.primary} />
                              <Text style={styles.metricText}>
                                {exercise.rest || exercise.restBetweenSets || '60s'} rest
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.restDayContainer}>
                  <Icon name="sleep" size={40} color={colors.primary} style={styles.restIcon} />
                  <Text style={styles.restText}>Rest Day</Text>
                  <Text style={styles.restSubText}>Take time to recover and recharge</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      
      {/* Apply Button */}
      <View style={[styles.applyButtonContainer, { paddingBottom: insets.bottom + 60 }]}>
        <TouchableOpacity 
          style={[styles.applyButton, isApplying && styles.applyButtonDisabled]}
          onPress={handleApplyPlan}
          activeOpacity={0.8}
          disabled={isApplying}
        >
          <LinearGradient
            colors={isApplying ? [colors.textSecondary, colors.textSecondary] : [colors.primary, colors.primaryDark]}
            style={styles.applyButtonGradient}
          >
            <Text style={styles.applyButtonText}>
              {isApplying ? 'Applying Plan...' : 'Apply This Plan'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  backButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  backButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  titleSection: {
    marginBottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    marginHorizontal: -8,
    paddingHorizontal: 8,
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
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
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
  dayCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dayCardBackground: {
    height: 100,
    justifyContent: 'center',
  },
  dayCardImage: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dayIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  exercisesContainer: {
    padding: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseNumber: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  exerciseMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  metricText: {
    color: colors.white,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  restDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  restIcon: {
    marginBottom: 12,
  },
  restText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  restSubText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  applyButtonContainer: {
    position: 'absolute',
    bottom: 20, // Move it 20 points up from the bottom
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  applyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8, // Add some margin at the top
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonGradient: {
    paddingVertical: 18, // Increase vertical padding to make button taller
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  noExercisesText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
}); 