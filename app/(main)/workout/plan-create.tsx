import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';
import { formatHeightWithUnit, formatWeightWithUnit } from '../../../src/utils/unitConversions';
import HealthDisclaimer from '../../../src/components/legal/HealthDisclaimer';

import { WorkoutLocalStore } from '../../../src/services/workout/WorkoutLocalStore';
import { track as analyticsTrack } from '../../../src/services/analytics/analytics';
import { environment } from '../../../src/config/environment';


// Local dependencies
const { width } = Dimensions.get('window');

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  white: '#FFFFFF',
  purple: '#AF52DE',
};

// Keep existing mock data, services, etc.



// End Local Dependencies

// Plan types
const planTypes = [
  {
    id: 'ai-custom',
    name: 'AI Custom Plan',
    description: 'Generate a personalized workout plan powered by Gemini AI',
    icon: 'robot-outline',
    route: '/workout/ai-custom-plan'
  },
  {
    id: 'bodybuilder',
    name: 'Famous Bodybuilder',
    description: 'Follow a workout plan inspired by famous bodybuilders',
    icon: 'weight-lifter'
  },
  {
    id: 'build-your-own',
    name: 'Build Your Own',
    description: 'Create your own fully customized workout plan using our exercise library',
    icon: 'hammer-wrench'
  }
];

// Famous bodybuilders and their authentic training styles
const famousBodybuilders = [
  { 
    id: 'cbum', 
    name: 'Chris Bumstead', 
    style: 'Classic Physique', 
    description: '6-day split, 12-15 sets per muscle group, focus on symmetry and classic aesthetics',
    icon: 'weight-lifter',
    image_url: 'https://cdn.jackedgorilla.com/wp-content/uploads/2020/08/Chris-Bumstead-Workout-Routine-Diet.jpg'
  },
  { 
    id: 'arnold', 
    name: 'Arnold Schwarzenegger', 
    style: 'Golden Era', 
    description: '6-day split, 15-20 sets per muscle group, supersets and giant sets',
    icon: 'arm-flex',
    image_url: 'https://www.thebarbell.com/wp-content/uploads/2023/05/arnold-s-chest.jpg'
  },
  { 
    id: 'ronnie', 
    name: 'Ronnie Coleman', 
    style: 'Mass Monster', 
    description: '5-day body part split, 12-15 sets per muscle group, heavy weights and basic movements',
    icon: 'dumbbell',
    image_url: 'https://www.muscleandfitness.com/wp-content/uploads/2019/04/ronnie-coleman-1109.jpg?quality=86&strip=all'
  },
  { 
    id: 'dorian', 
    name: 'Dorian Yates', 
    style: 'HIT (High Intensity Training)', 
    description: '4-day split, 6-9 sets per muscle group, maximum intensity to absolute failure',
    icon: 'lightning-bolt',
    image_url: 'https://www.muscleandfitness.com/wp-content/uploads/2019/01/dorian-yates-gasp-1.jpg?quality=86&strip=all'
  },
  { 
    id: 'jay', 
    name: 'Jay Cutler', 
    style: 'Mass & Symmetry', 
    description: '5-day body part split, 15-20 sets per muscle group, FST-7 technique and weak point focus',
    icon: 'weight-lifter',
    image_url: 'https://generationiron.com/wp-content/uploads/2023/04/Jay-Cutler-shares-his-top-3-bicep-exercises-for-optimal-growth.jpg'
  },
  { 
    id: 'phil', 
    name: 'Phil Heath', 
    style: 'Precision Training', 
    description: '5-day split, 10-12 sets per muscle group, perfect form and muscle isolation focus',
    icon: 'arm-flex',
    image_url: 'https://www.muscleandfitness.com/wp-content/uploads/2019/07/1109-Phil-Heath.jpg?quality=86&strip=all'
  },
  { 
    id: 'kai', 
    name: 'Kai Greene', 
    style: 'Mind-Muscle Connection', 
    description: '5-day split, 15-20 sets per muscle group, extreme mind-muscle connection and tempo manipulation',
    icon: 'meditation',
    image_url: 'https://generationiron.com/wp-content/uploads/2014/06/kai-greene-header-1.png'
  },
  { 
    id: 'franco', 
    name: 'Franco Columbu', 
    style: 'Strength & Power', 
    description: '4-day split, 8-12 sets per muscle group, powerlifting influence and explosive training',
    icon: 'weight',
    image_url: 'https://fitnessvolt.com/wp-content/uploads/2019/08/franco-columbu-1.jpg'
  },
  { 
    id: 'frank', 
    name: 'Frank Zane', 
    style: 'Aesthetic Perfection', 
    description: '3-day split repeated twice, 10-15 sets per muscle group, precision training for aesthetics',
    icon: 'human',
    image_url: 'https://fitnessvolt.com/wp-content/uploads/2021/08/Frank-Zane.jpg'
  },
  { 
    id: 'lee', 
    name: 'Lee Haney', 
    style: 'Stimulate, Don\'t Annihilate', 
    description: '4-day split, 10-15 sets per muscle group, recovery focus and pre-exhaustion techniques',
    icon: 'refresh',
    image_url: 'https://www.muscleandfitness.com/wp-content/uploads/2019/08/lee-haney-1.jpg?quality=86&strip=all'
  },

  {
    id: 'nick',
    name: 'Nick Walker',
    style: 'Mass Monster',
    description: '6-day split, 12-15 sets per muscle group, extreme mass focus and heavy compound movements',
    icon: 'dumbbell',
    image_url: 'https://generationiron.com/wp-content/uploads/2023/09/Nick-Walker-8.jpg'
  },
  {
    id: 'platz',
    name: 'Tom Platz',
    style: 'Golden Era Legs',
    description: '4-day split with leg emphasis, 15-20 sets for legs, legendary high-rep squats and leg specialization',
    icon: 'human-handsdown',
    image_url: 'https://www.muscleandfitness.com/wp-content/uploads/2013/10/tom-platz-sitting-on-bench.jpg?quality=86&strip=all'
  },

];

export default function PlanCreateScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Tab bar height is 60px + bottom safe area (matches the layout tabBarStyle height)
  const tabBarHeight = 60 + insets.bottom;

  console.log('[PlanCreate] User from useAuth:', { id: user?.id, email: user?.email });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [selectedBodybuilder, setSelectedBodybuilder] = useState('');
  const [apiKeyAvailable] = useState<boolean | null>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    if (!selectedPlanType) {
      message = "Let's create your perfect workout plan. Choose your preferred approach below.";
    } else if (selectedPlanType === 'bodybuilder' && !selectedBodybuilder) {
      message = "Select a legendary bodybuilder to train like a champion.";
    } else if (selectedPlanType === 'bodybuilder' && selectedBodybuilder) {
      const bb = famousBodybuilders.find(b => b.id === selectedBodybuilder);
      message = `Great choice! ${bb?.name}'s training style will push your limits.`;
    } else if (selectedPlanType === 'build-your-own') {
      message = "Build your custom plan with our exercise library.";
    } else {
      message = "Ready to generate your personalized AI workout plan.";
    }
    
    return { greeting, message };
  }, [selectedPlanType, selectedBodybuilder]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset selections
    setSelectedPlanType('');
    setSelectedBodybuilder('');
    setError(null);
    setTimeout(() => setRefreshing(false), 500);
  }, []);
  
  // Create a default profile for guest mode
  const effectiveProfile = useMemo(() => {
    // If we have a real profile, use it
    if (profile) return profile;
    
    // If we're in guest mode (user?.id === 'guest'), create a default profile
    if (user?.id === 'guest') {
      return {
        id: 'guest',
        height: 175,
        weight: 75,
        height_cm: 175,
        weight_kg: 75,
        height_unit_preference: 'cm' as const,
        weight_unit_preference: 'kg' as const,
        training_level: 'intermediate' as const,
        gender: 'male' as const,
        birthday: '1995-01-01',
        goal_fat_reduction: 5,
        goal_muscle_gain: 5,
        full_name: 'Guest User',
        primary_goal: 'general_fitness' as const,
        workout_frequency: '4_5' as const,
        // Add more fields that might be needed
        body_fat: 15,
        activity_level: 'moderately_active' as const,
        exercise_frequency: '4-6' as const,
        weight_trend: 'stable' as const,
        onboarding_completed: true
      };
    }
    
    // Otherwise return null
    return null;
  }, [profile, user]);
  
  // Log the profile data to help with debugging
  useEffect(() => {
    console.log('[PlanCreate] Profile status:', { 
      hasProfile: !!profile,
      hasEffectiveProfile: !!effectiveProfile,
      isGuest: user?.id === 'guest'
    });
    
    if (effectiveProfile) {
      console.log('[PlanCreate] Using profile data:', {
        height: effectiveProfile.height,
        weight: effectiveProfile.weight,
        level: effectiveProfile.training_level,
        gender: effectiveProfile.gender
      });
    }
  }, [profile, effectiveProfile, user]);

  // Use effectiveProfile instead of profile in the component
 
   // REMOVED: checkServerStatus function
  
  const resolvedPrimaryGoal = useMemo(() => {
    if (!effectiveProfile) return null as
      | 'general_fitness'
      | 'fat_loss'
      | 'muscle_gain'
      | 'athletic_performance'
      | null;
    const explicit = (effectiveProfile as any).primary_goal as
      | 'general_fitness'
      | 'fat_loss'
      | 'muscle_gain'
      | 'athletic_performance'
      | undefined;
    if (explicit) return explicit;
    const fat = Number((effectiveProfile as any).goal_fat_reduction || 0);
    const muscle = Number((effectiveProfile as any).goal_muscle_gain || 0);
    if (fat === 0 && muscle === 0) return 'general_fitness';
    if (muscle > fat) return 'muscle_gain';
    if (fat > muscle) return 'fat_loss';
    return 'general_fitness';
  }, [effectiveProfile]);

  const handleGeneratePlan = async () => {
    console.log('handleGeneratePlan started');
    try {
      if (!user || !effectiveProfile) {
        console.log('Error: User profile not available');
        setError('User profile not available.');
        return;
      }
      
      console.log('Checking existing plan count...');
      // Note: Removed the 3-plan limitation - users can now create unlimited workout plans
      const planCount = await WorkoutService.getPlanCountForUser(user.id);
      console.log('Current plan count:', planCount);

      // Extract required data from the profile
      const {
        height_cm,
        weight_kg,
        training_level,
        birthday,
      } = effectiveProfile;

      // Handle goal properties that may not exist in the type
      const goal_fat_reduction = (effectiveProfile as any).goal_fat_reduction || 0;
      const goal_muscle_gain = (effectiveProfile as any).goal_muscle_gain || 0;

      console.log('Profile data:', {
        height_cm,
        weight_kg,
        training_level,
        goal_fat_reduction,
        goal_muscle_gain,
        birthday,
      });

      // Validate required fields and compute age
      if (!height_cm || !weight_kg || !training_level || !birthday || !effectiveProfile.gender) {
        console.log('Error: Incomplete profile');
        setError('Your profile is incomplete. Please complete onboarding first.');
        return;
      }
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred this year yet
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      const h = Number(height_cm);
      const w = Number(weight_kg);
      const trLevel = training_level as 'beginner' | 'intermediate' | 'advanced';
      const gender = effectiveProfile.gender as 'male' | 'female';

      const convertFatLossToPriority = (kg: number): number => {
        if (kg <= 2) return 1;
        if (kg <= 4) return 2;
        if (kg <= 6) return 3;
        if (kg <= 8) return 4;
        return 5;
      };

      const convertMuscleGainToPriority = (kg: number): number => {
        if (kg <= 3) return 1;
        if (kg <= 6) return 2;
        if (kg <= 9) return 3;
        if (kg <= 12) return 4;
        return 5;
      };

      const fatLossPriority = convertFatLossToPriority(goal_fat_reduction || 0);
      const muscleGainPriority = convertMuscleGainToPriority(goal_muscle_gain || 0);

      // Compute and persist primary goal to profile before plan generation
      const computedPrimaryGoal = (
        effectiveProfile.primary_goal ||
        (selectedPlanType === 'bodybuilder'
          ? 'muscle_gain'
          : fatLossPriority > muscleGainPriority
            ? 'fat_loss'
            : muscleGainPriority > fatLossPriority
              ? 'muscle_gain'
              : 'general_fitness')
      ) as 'general_fitness' | 'fat_loss' | 'muscle_gain' | 'athletic_performance';

      try {
        if (user?.id && user.id !== 'guest' && computedPrimaryGoal !== effectiveProfile.primary_goal) {
          await fetch(`${environment.apiUrl}/api/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              updates: { primary_goal: computedPrimaryGoal }
            })
          });
        }
      } catch (e) {
        console.warn('[PlanCreate] Failed to persist primary goal (continuing):', e);
      }

      analyticsTrack('ai_plan_create_clicked', { user_id: user.id, plan_type: selectedPlanType, emulate: selectedPlanType === 'bodybuilder' ? selectedBodybuilder : null });
      console.log('Setting isSubmitting to true');
      setIsSubmitting(true);
      setError(null);
      setStatusMessage('Generating your plan. This usually takes 10-30 seconds...');
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => {
        setStatusMessage('Still generating... this can take up to a minute on slower networks. Please keep the app open.');
      }, 15000);

      console.log('Calling WorkoutService.createAIPlan with:', {
        userId: user.id,
        height: h,
        weight: w,
        age,
        gender,
        trainingLevel: trLevel,
        fatLossGoal: fatLossPriority,
        muscleGainGoal: muscleGainPriority,
        emulateBodybuilder: selectedPlanType === 'bodybuilder' ? selectedBodybuilder : undefined,
      });

      console.log('[PlanCreate] About to call createAIPlan with user ID:', user.id, 'bodybuilder:', selectedBodybuilder);

      // DEBUG: Log the workout frequency value
      console.log('[PlanCreate] DEBUG - Workout frequency data:', {
        workout_frequency: effectiveProfile.workout_frequency,
        type: typeof effectiveProfile.workout_frequency,
        hasValue: !!effectiveProfile.workout_frequency,
        fullProfile: {
          id: effectiveProfile.id,
          workout_frequency: effectiveProfile.workout_frequency,
          training_level: effectiveProfile.training_level,
          primary_goal: effectiveProfile.primary_goal
        }
      });

      analyticsTrack('ai_plan_create_start', { user_id: user.id, emulate: selectedPlanType === 'bodybuilder' ? selectedBodybuilder : null, level: trLevel });
      const plan = await WorkoutService.createAIPlan({
        userId: user.id,
        height: h,
        weight: w,
        age,
        gender,
        fullName: effectiveProfile.full_name || 'My',
        trainingLevel: trLevel,
        primaryGoal: computedPrimaryGoal,
        fatLossGoal: fatLossPriority,
        muscleGainGoal: muscleGainPriority,
        workoutFrequency: effectiveProfile.workout_frequency || undefined,
        emulateBodybuilder: selectedPlanType === 'bodybuilder' ? selectedBodybuilder : undefined,
      });

      console.log('Plan creation result:', plan);

      if (plan) {
        analyticsTrack('ai_plan_create_success', { user_id: user.id, plan_id: (plan as any)?.id, days: (plan as any)?.weeklySchedule?.length || 0 });

        // Only save to local storage if this is NOT a bodybuilder plan
        // Bodybuilder plans are already saved in createBodybuilderPlanOffline
        const isBodybuilderPlan = selectedPlanType === 'bodybuilder' && selectedBodybuilder;

        if (!isBodybuilderPlan) {
          try {
            const planWithDefaults = {
              ...plan,
              is_active: true,
              image_url: (plan as any).image_url || 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2000&auto=format&fit=crop'
            } as any;

            if (user?.id) {
              await WorkoutLocalStore.addPlan(user.id, planWithDefaults);
            }
          } catch (e) {
            console.log('[PlanCreate] Failed to add plan to local store:', e);
          }
        } else {
          console.log('[PlanCreate] Skipping local storage save for bodybuilder plan - already saved in offline creation');
        }

        // Ensure the newly created plan is set as active (and others archived)
        try {
          if (user?.id && (plan as any)?.id) {
            await WorkoutService.setActivePlan(user.id, (plan as any).id);
          }
        } catch (e) {
          console.warn('[PlanCreate] setActivePlan failed (continuing):', e);
        }
        console.log('Plan created successfully, navigating with plan data:', plan);
        // Add a small delay to ensure plan is fully saved before navigation
        setTimeout(() => {
          const isOfflinePlan = (plan as any)?.source === 'offline_fallback';
          const systemMeta = (plan as any)?.system_metadata;
          
          let successMessage = 'Workout plan generated successfully!';
          let successTitle = 'Success';
          
          // Enhanced messaging based on system metadata
          if (systemMeta?.fallback_used) {
            switch (systemMeta.fallback_reason) {
              case 'regional_restriction':
                successTitle = 'Plan Generated';
                successMessage = '🌍 Your personalized workout plan is ready! We used our enhanced rule-based system to create a detailed plan tailored specifically for your goals and fitness level.';
                break;
              case 'quota_exceeded':
                successTitle = 'Plan Generated';
                successMessage = '📊 Your personalized workout plan is ready! We used our enhanced rule-based system to create a detailed plan while our AI services are at capacity.';
                break;
              case 'ai_unavailable':
                successTitle = 'Plan Generated';
                successMessage = '🔧 Your personalized workout plan is ready! We used our enhanced rule-based system to ensure you get a great workout plan right away.';
                break;
              default:
                successMessage = '💪 Your personalized workout plan is ready! Created using our enhanced rule-based system for optimal results.';
            }
          } else if (systemMeta?.ai_available) {
            successTitle = '🤖 AI Plan Ready';
            successMessage = 'Your AI-powered workout plan has been generated! This plan is fully personalized using advanced AI technology.';
          } else if (isOfflinePlan) {
            successMessage = 'Offline workout plan generated successfully! This plan works great without internet connection.';
          }
            
          // Navigate directly to the generated plan
          router.replace({
            pathname: '/(main)/workout/plan/[planId]',
            params: { planId: String((plan as any).id), planObject: JSON.stringify(plan) }
          });
        }, 500);
      } else {
        console.log('Error: Plan creation failed');
        analyticsTrack('ai_plan_create_failure', { user_id: user.id, reason: 'no_plan_returned' });
        setError('Failed to generate workout plan. Please try again.');
      }
    } catch (err) {
      console.error('[PlanCreate] Error generating plan:', err);
      analyticsTrack('ai_plan_create_failure', { user_id: user?.id, error: String((err as any)?.message || err) });
      setStatusMessage(null);
      const message = err instanceof Error ? err.message : String(err);
      const isTimeout = /timeout|ECONNABORTED|\[Timeout\]/i.test(message);
      const isNetworkError = /Network request failed|fetch/i.test(message);
      
      if (isNetworkError) {
        setError('Network connection unavailable. Don\'t worry - we\'ll generate an offline workout plan for you! Tap "Try Again" to continue.');
      } else {
        setError(isTimeout ? 'The AI request timed out. Please try again.' : (err instanceof Error ? err.message : 'An unexpected error occurred'));
      }
    } finally {
      console.log('Setting isSubmitting to false');
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setStatusMessage(null);
      setIsSubmitting(false);
    }
  };
  
  // Modify the showConfirmation function to bypass profile check in guest mode
  const showConfirmation = () => {
    console.log('showConfirmation called');
    
    // Handle "Build Your Own" option - navigate to custom workout builder
    if (selectedPlanType === 'build-your-own') {
      console.log('Navigating to custom workout builder');
      analyticsTrack('custom_workout_builder_clicked', { user_id: user?.id });
      router.push('/workout/custom-builder');
      return;
    }
    
    // Validate selection if bodybuilder type is selected
    if (selectedPlanType === 'bodybuilder' && !selectedBodybuilder) {
      console.log('Validation failed: No bodybuilder selected');
      Alert.alert(
        "Selection Required",
        "Please select a bodybuilder to emulate their training style.",
        [{ text: "OK" }]
      );
      return;
    }
    
    let planDescription = "personalized workout plan based on your profile data";
    
    if (selectedPlanType === 'bodybuilder' && selectedBodybuilder) {
      const bodybuilder = famousBodybuilders.find(b => b.id === selectedBodybuilder);
      planDescription = `workout plan inspired by ${bodybuilder?.name}'s training style`;
    }
      
    console.log('Showing confirmation alert');
    Alert.alert(
      "Generate Workout Plan",
      `This will create a ${planDescription}. Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", onPress: () => {
          console.log('Generate button pressed');
          analyticsTrack('ai_plan_generate_confirmed', { user_id: user?.id, plan_type: selectedPlanType, emulate: selectedPlanType === 'bodybuilder' ? selectedBodybuilder : null });
          handleGeneratePlan();
        }, style: "destructive" }
      ]
    );
  };
  
  // Add a function to force generate plan in guest mode
  const forceGeneratePlan = async () => {
    if (user?.id !== 'guest') return;
    
    // Force a plan generation with default values
    const defaultPlan = {
      id: `plan-${Date.now()}`,
      name: selectedPlanType === 'bodybuilder' && selectedBodybuilder ?
        `${famousBodybuilders.find(b => b.id === selectedBodybuilder)?.name} Inspired Plan` :
        "Custom Workout Plan",
      training_level: "intermediate" as const,
      goal_fat_loss: 2,
      goal_muscle_gain: 3,
      mesocycle_length_weeks: 4,
      estimated_time_per_session: "45-60 min",
      status: "active" as const,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: "guest",
      weeklySchedule: [
        {
          day: "Monday",
          focus: "Chest & Triceps",
          exercises: [
            { name: "Bench Press", sets: 4, reps: "8-10", rest: "90s" },
            { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: "60s" },
            { name: "Cable Flyes", sets: 3, reps: "12-15", rest: "60s" },
            { name: "Tricep Pushdowns", sets: 3, reps: "12-15", rest: "60s" },
            { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", rest: "60s" }
          ]
        },
        {
          day: "Wednesday",
          focus: "Back & Biceps",
          exercises: [
            { name: "Pull-Ups", sets: 4, reps: "8-10", rest: "90s" },
            { name: "Bent Over Rows", sets: 3, reps: "10-12", rest: "60s" },
            { name: "Lat Pulldowns", sets: 3, reps: "12-15", rest: "60s" },
            { name: "Barbell Curls", sets: 3, reps: "10-12", rest: "60s" },
            { name: "Hammer Curls", sets: 3, reps: "12-15", rest: "60s" }
          ]
        },
        {
          day: "Friday",
          focus: "Legs & Shoulders",
          exercises: [
            { name: "Squats", sets: 4, reps: "8-10", rest: "120s" },
            { name: "Romanian Deadlifts", sets: 3, reps: "10-12", rest: "90s" },
            { name: "Leg Press", sets: 3, reps: "12-15", rest: "60s" },
            { name: "Military Press", sets: 3, reps: "8-10", rest: "90s" },
            { name: "Lateral Raises", sets: 3, reps: "12-15", rest: "60s" }
          ]
        }
      ],
      image_url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2000&auto=format&fit=crop"
    };
    
    try {
      if (user?.id) {
        await WorkoutLocalStore.addPlan(user.id, defaultPlan);
      }
      
      Alert.alert('Success', 'Workout plan generated successfully!', [
        {
          text: 'View Plan',
          onPress: () => router.replace({
            pathname: '/(main)/workout/plan/[planId]',
            params: { planId: String(defaultPlan.id), planObject: JSON.stringify(defaultPlan) }
          }),
        },
      ]);
    } catch (e) {
      console.error('[PlanCreate] Error creating default plan:', e);
      setError('Failed to generate workout plan. Please try again.');
    }
  };

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
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

          {/* Quick Actions Grid */}
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 69, 58, 0.12)' }]}>
                <Icon name="arrow-left" size={22} color="#FF453A" />
              </View>
              <Text style={styles.quickActionLabel}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/workout/plans')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Icon name="dumbbell" size={22} color="#22C55E" />
              </View>
              <Text style={styles.quickActionLabel}>Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/workout/history')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Icon name="history" size={22} color="#6366F1" />
              </View>
              <Text style={styles.quickActionLabel}>History</Text>
            </TouchableOpacity>

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
          </View>

          {/* Plan Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Plan Type</Text>
            
            {planTypes.map((planType) => (
              <TouchableOpacity
                key={planType.id}
                style={[
                  styles.optionCard,
                  selectedPlanType === planType.id && styles.optionCardSelected
                ]}
                onPress={() => {
                  // If planType has a route, navigate directly
                  if ((planType as any).route) {
                    router.push((planType as any).route);
                  } else {
                    console.log('[DEBUG] Setting selectedPlanType to:', planType.id);
                    setSelectedPlanType(planType.id);
                    if (planType.id === 'custom') {
                      setSelectedBodybuilder('');
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionIconContainer,
                    selectedPlanType === planType.id && styles.optionIconContainerSelected
                  ]}>
                    <Icon 
                      name={planType.icon} 
                      size={24} 
                      color={selectedPlanType === planType.id ? colors.primary : colors.white} 
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[
                      styles.optionTitle,
                      selectedPlanType === planType.id && styles.optionTitleSelected
                    ]}>
                      {planType.name}
                    </Text>
                    <Text style={styles.optionDescription}>{planType.description}</Text>
                  </View>
                  {selectedPlanType === planType.id && (
                    <View style={styles.checkmarkSelected}>
                      <Icon name="check" size={16} color={colors.white} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bodybuilder Selection */}
          {selectedPlanType === 'bodybuilder' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose Training Style</Text>
              
              <View style={styles.bodybuilderGrid}>
                {famousBodybuilders.map((bodybuilder) => (
                  <TouchableOpacity
                    key={bodybuilder.id}
                    style={[
                      styles.bodybuilderTile,
                      selectedBodybuilder === bodybuilder.id && styles.bodybuilderTileSelected
                    ]}
                    onPress={() => setSelectedBodybuilder(bodybuilder.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bodybuilderContent}>
                      <View style={styles.bodybuilderHeader}>
                        <View style={[
                          styles.bodybuilderIconContainer,
                          selectedBodybuilder === bodybuilder.id && styles.bodybuilderIconContainerSelected
                        ]}>
                          <Icon 
                            name={bodybuilder.icon} 
                            size={20} 
                            color={selectedBodybuilder === bodybuilder.id ? colors.primary : colors.textSecondary} 
                          />
                        </View>
                        {selectedBodybuilder === bodybuilder.id && (
                          <View style={styles.bodybuilderSelectedIndicator}>
                            <Icon name="check" size={14} color={colors.white} />
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.bodybuilderTextContainer}>
                        <Text style={[
                          styles.bodybuilderName,
                          selectedBodybuilder === bodybuilder.id && styles.bodybuilderNameSelected
                        ]}>
                          {bodybuilder.name}
                        </Text>
                        <Text style={[
                          styles.bodybuilderStyle,
                          selectedBodybuilder === bodybuilder.id && styles.bodybuilderStyleSelected
                        ]}>
                          {bodybuilder.style}
                        </Text>
                        <Text style={[
                          styles.bodybuilderDescription,
                          selectedBodybuilder === bodybuilder.id && styles.bodybuilderDescriptionSelected
                        ]}>
                          {bodybuilder.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Profile Summary */}
          {selectedPlanType === 'custom' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Profile</Text>
              
              <View style={styles.profileCard}>
                {effectiveProfile && effectiveProfile.height_cm && effectiveProfile.weight_kg && effectiveProfile.training_level ? (
                  <>
                    <View style={styles.profileMetrics}>
                      <View style={styles.profileMetric}>
                        <Text style={styles.metricValue}>{effectiveProfile?.training_level || '--'}</Text>
                        <Text style={styles.metricLabel}>Level</Text>
                      </View>
                      <View style={styles.profileMetric}>
                        <Text style={styles.metricValue}>{effectiveProfile?.height_cm ? formatHeightWithUnit(effectiveProfile.height_cm, effectiveProfile?.height_unit_preference) : '--'}</Text>
                        <Text style={styles.metricLabel}>Height</Text>
                      </View>
                      <View style={styles.profileMetric}>
                        <Text style={styles.metricValue}>{effectiveProfile?.weight_kg ? formatWeightWithUnit(effectiveProfile.weight_kg, effectiveProfile?.weight_unit_preference) : '--'}</Text>
                        <Text style={styles.metricLabel}>Weight</Text>
                      </View>
                      <View style={styles.profileMetric}>
                        <Text style={styles.metricValue}>
                          {effectiveProfile?.workout_frequency ?
                            effectiveProfile.workout_frequency.replace('_', '-') + 'x/week' :
                            '--'
                          }
                        </Text>
                        <Text style={styles.metricLabel}>Frequency</Text>
                      </View>
                    </View>

                    {/* Primary goal centered below */}
                    <View style={styles.profileMetrics}>
                      <View style={[styles.profileMetric, styles.profileMetricFull]}>
                        <Text style={styles.metricValue} numberOfLines={1}>
                          {resolvedPrimaryGoal ? resolvedPrimaryGoal.replace(/_/g, '\u00A0') : '--'}
                        </Text>
                        <Text style={styles.metricLabel}>Primary Goal</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.incompleteProfileContainer}>
                    <Icon name="alert-circle-outline" size={36} color={colors.warning} style={styles.incompleteProfileIcon} />
                    <Text style={styles.incompleteProfileTitle}>Incomplete Profile</Text>
                    <Text style={styles.incompleteProfileText}>
                      Your profile is missing required information. Please complete your profile data first.
                    </Text>
                    {user?.id === 'guest' ? (
                      <View style={styles.guestButtonsContainer}>
                        <TouchableOpacity 
                          style={styles.completeProfileButton}
                          onPress={() => router.push('/(main)/profile/edit')}
                        >
                          <Text style={styles.completeProfileButtonText}>Complete Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.completeProfileButton, { backgroundColor: colors.accent, marginTop: 12 }]}
                          onPress={forceGeneratePlan}
                        >
                          <Text style={styles.completeProfileButtonText}>Generate Demo Plan</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.completeProfileButton}
                        onPress={() => router.push('/(main)/profile/edit')}
                      >
                        <Text style={styles.completeProfileButtonText}>Complete Profile</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Status/Error message */}
          {error && (
            <View style={styles.errorCard}>
              <Icon name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {(isSubmitting || statusMessage) && (
            <View style={styles.statusCard}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.statusText}>{statusMessage || 'Working...'}</Text>
            </View>
          )}
        </ScrollView>

        {/* Action Button */}
        {selectedPlanType && selectedPlanType !== 'ai-custom' && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, tabBarHeight) }]}>
            <TouchableOpacity
              style={[
                styles.actionButton, 
                (selectedPlanType === 'bodybuilder' && !selectedBodybuilder) && styles.actionButtonDisabled
              ]}
              onPress={showConfirmation}
              disabled={(selectedPlanType === 'bodybuilder' && !selectedBodybuilder) || isSubmitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  (selectedPlanType === 'bodybuilder' && !selectedBodybuilder) || isSubmitting
                    ? ['#666', '#555'] 
                    : [colors.primary, colors.primaryDark]
                }
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.actionButtonText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Icon 
                      name={selectedPlanType === 'build-your-own' ? 'arrow-right' : 'check'} 
                      size={20} 
                      color={colors.white} 
                    />
                    <Text style={styles.actionButtonText}>
                      {selectedPlanType === 'build-your-own' ? 'Continue to Builder' : 'Generate Plan'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
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

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionCard: {
    width: (width - 40 - 24) / 4,
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

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  // Option Cards
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionCardSelected: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionIconContainerSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: colors.primary,
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  checkmarkSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bodybuilder Selection
  bodybuilderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bodybuilderTile: {
    width: (width - 40 - 12) / 2,
    minHeight: 140,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bodybuilderTileSelected: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  bodybuilderContent: {
    flex: 1,
  },
  bodybuilderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bodybuilderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodybuilderIconContainerSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  bodybuilderSelectedIndicator: {
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodybuilderTextContainer: {
    flex: 1,
  },
  bodybuilderName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bodybuilderNameSelected: {
    color: colors.primary,
  },
  bodybuilderStyle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  bodybuilderStyleSelected: {
    color: colors.accent,
  },
  bodybuilderDescription: {
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 15,
  },
  bodybuilderDescriptionSelected: {
    color: colors.textSecondary,
  },
  // Profile Card
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  profileMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  profileMetric: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
  },
  profileMetricFull: {
    width: '100%',
  },
  metricValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Status/Error Cards
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
  },
  statusText: {
    color: colors.white,
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.15)',
    gap: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
  },
  // Incomplete Profile
  incompleteProfileContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  incompleteProfileIcon: {
    marginBottom: 12,
  },
  incompleteProfileTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  incompleteProfileText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  completeProfileButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  completeProfileButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  guestButtonsContainer: {
    width: '100%',
    alignItems: 'center',
  },

  // Footer
  footer: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonDisabled: {
    shadowOpacity: 0.1,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
}); 