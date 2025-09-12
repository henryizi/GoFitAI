import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  Image, 
  ImageBackground, 
  Dimensions, 
  ActivityIndicator 
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';
import { formatHeightWithUnit, formatWeightWithUnit } from '../../../src/utils/unitConversions';

import { WorkoutLocalStore } from '../../../src/services/workout/WorkoutLocalStore';
import { track as analyticsTrack } from '../../../src/services/analytics/analytics';
import { environment } from '../../../src/config/environment';


// Local dependencies
const { width, height } = Dimensions.get('window');

// Modern, premium colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
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

// Keep existing mock data, services, etc.



// End Local Dependencies

// Plan types
const planTypes = [
  {
    id: 'custom',
    name: 'Custom Plan',
    description: 'Generate a personalized workout plan based on your profile data',
    icon: 'account-outline'
  },
  {
    id: 'bodybuilder',
    name: 'Famous Bodybuilder',
    description: 'Follow a workout plan inspired by famous bodybuilders',
    icon: 'weight-lifter'
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

  console.log('[PlanCreate] User from useAuth:', { id: user?.id, email: user?.email });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState('custom');
  const [selectedBodybuilder, setSelectedBodybuilder] = useState('');
  const [apiKeyAvailable] = useState<boolean | null>(true);
  const insets = useSafeAreaInsets();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
      // Check the number of existing plans
      const planCount = await WorkoutService.getPlanCountForUser(user.id);
      console.log('Current plan count:', planCount);
      if (planCount >= 3) {
        console.log('Error: Plan limit reached');
        Alert.alert(
          "Plan Limit Reached",
          "You can only have up to 3 workout plans. Please delete an existing plan to generate a new one."
        );
        return;
      }

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
          Alert.alert('Success', 'Workout plan generated successfully!', [
            {
              text: 'View Plan',
              onPress: () => router.replace({
                  pathname: '/(main)/workout/plan/[planId]',
                  params: { planId: String((plan as any).id), planObject: JSON.stringify(plan) }
              }),
            },
            {
              text: 'View Plans List',
              onPress: () => router.replace({
                pathname: '/(main)/workout/plans',
                params: { refresh: 'true' }
              }),
              style: 'default'
            },
          ]);
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
      setError(isTimeout ? 'The AI request timed out. Please try again.' : (err instanceof Error ? err.message : 'An unexpected error occurred'));
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
        {/* Full-screen background */}
        <ImageBackground
          source={{ 
            uri: 'https://images.unsplash.com/photo-1521805103424-d8f8430e8933?q=80&w=2070&auto=format&fit=crop' 
          }}
          style={[styles.backgroundImage, { marginTop: -insets.top }]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={[styles.overlay, { paddingTop: insets.top }]}
          />
        </ImageBackground>

        {/* App header */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <View style={styles.headerLine} />
          <Text style={styles.appName}>WORKOUT<Text style={{ color: colors.primary }}>HUB</Text></Text>
          <View style={styles.headerLine} />
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
          {/* Title section */}
          <View style={styles.titleSection}>
            <Text style={styles.titlePreheading}>PERSONALIZED</Text>
            <Text style={styles.titleMain}>WORKOUT PLAN</Text>
            <Text style={styles.titleDescription}>
              AI-powered training designed specifically for your body and goals
            </Text>
          </View>
          
          {apiKeyAvailable === false && (
            <View style={styles.alert}>
              <View style={styles.alertIconContainer}>
                <Icon name="alert-outline" size={18} color={colors.white} />
              </View>
              <Text style={styles.alertText}>API key missing - some features limited</Text>
            </View>
          )}

          {/* Plan Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>01 <Text style={styles.sectionTitleText}>SELECT PLAN TYPE</Text></Text>
            
            {planTypes.map((planType) => (
              <TouchableOpacity
                key={planType.id}
                style={[
                  styles.optionCard,
                  selectedPlanType === planType.id && styles.optionCardSelected
                ]}
                onPress={() => {
                  setSelectedPlanType(planType.id);
                  if (planType.id === 'custom') {
                    setSelectedBodybuilder('');
                  }
                }}
              >
                <LinearGradient
                  colors={selectedPlanType === planType.id ? 
                    ['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)'] : 
                    ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.optionCardGradient}
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
                      <Text style={styles.optionTitle}>{planType.name}</Text>
                      <Text style={styles.optionDescription}>{planType.description}</Text>
                    </View>
                    <View style={[
                      styles.checkmark,
                      selectedPlanType === planType.id ? styles.checkmarkSelected : {}
                    ]}>
                      {selectedPlanType === planType.id && (
                        <Icon name="check" size={16} color={colors.white} />
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bodybuilder Selection */}
          {selectedPlanType === 'bodybuilder' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>CHOOSE TRAINING STYLE</Text></Text>
              
              <View style={styles.bodybuilderGrid}>
                {famousBodybuilders.map((bodybuilder) => (
                  <TouchableOpacity
                    key={bodybuilder.id}
                    style={[
                      styles.bodybuilderTile,
                      selectedBodybuilder === bodybuilder.id && styles.bodybuilderTileSelected
                    ]}
                    onPress={() => setSelectedBodybuilder(bodybuilder.id)}
                  >
                    <LinearGradient
                      colors={selectedBodybuilder === bodybuilder.id 
                        ? ['rgba(255,107,53,0.2)', 'rgba(255,107,53,0.1)'] 
                        : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                      }
                      style={styles.bodybuilderCardGradient}
                    >
                      <View style={styles.bodybuilderContent}>
                        <View style={styles.bodybuilderHeader}>
                          <Icon 
                            name={bodybuilder.icon} 
                            size={24} 
                            color={selectedBodybuilder === bodybuilder.id ? colors.primary : colors.textSecondary} 
                          />
                          {selectedBodybuilder === bodybuilder.id && (
                            <View style={styles.bodybuilderSelectedIndicator}>
                              <Icon name="check" size={16} color={colors.white} />
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
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Profile Summary */}
          {selectedPlanType === 'custom' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>YOUR PROFILE</Text></Text>
              
              <View style={styles.profileCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.profileCardGradient}
                >
                  {effectiveProfile && effectiveProfile.height_cm && effectiveProfile.weight_kg && effectiveProfile.training_level ? (
                    <>
                      <View style={styles.profileMetrics}>
                        <View style={styles.profileMetric}>
                          <Text style={styles.metricValue}>{effectiveProfile?.training_level || '--'}</Text>
                          <Text style={styles.metricLabel}>LEVEL</Text>
                        </View>
                        <View style={styles.profileMetric}>
                          <Text style={styles.metricValue}>{effectiveProfile?.height_cm ? formatHeightWithUnit(effectiveProfile.height_cm, effectiveProfile?.height_unit_preference) : '--'}</Text>
                          <Text style={styles.metricLabel}>HEIGHT</Text>
                        </View>
                        <View style={styles.profileMetric}>
                          <Text style={styles.metricValue}>{effectiveProfile?.weight_kg ? formatWeightWithUnit(effectiveProfile.weight_kg, effectiveProfile?.weight_unit_preference) : '--'}</Text>
                          <Text style={styles.metricLabel}>WEIGHT</Text>
                        </View>
                        <View style={styles.profileMetric}>
                          <Text style={styles.metricValue}>
                            {effectiveProfile?.workout_frequency ?
                              effectiveProfile.workout_frequency.replace('_', '-') + 'x/week' :
                              '--'
                            }
                          </Text>
                          <Text style={styles.metricLabel}>WORKOUT FREQ</Text>
                        </View>
                      </View>

                      {/* Primary goal centered below weight & workout frequency */}
                      <View style={styles.profileMetrics}>
                        <View style={[styles.profileMetric, styles.profileMetricFull]}>
                          <Text style={styles.metricValue} numberOfLines={1}>
                            {resolvedPrimaryGoal ? resolvedPrimaryGoal.replace(/_/g, '\u00A0') : '--'}
                          </Text>
                          <Text style={styles.metricLabel}>PRIMARY GOAL</Text>
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
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Error message */}
          {(isSubmitting || statusMessage) && (
            <View style={styles.statusCard}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={styles.statusText}>{statusMessage || 'Working...'}</Text>
            </View>
          )}
          {error && (
            <View style={styles.errorCard}>
              <View style={styles.errorIconContainer}>
                <Icon name="close-circle" size={24} color={colors.error} />
              </View>
              <Text style={styles.errorText}>{error}</Text>
              <View style={styles.errorActions}>
                <TouchableOpacity
                  disabled={isSubmitting}
                  onPress={handleGeneratePlan}
                  style={[styles.retryButton, isSubmitting && styles.buttonDisabled]}
                >
                  <Text style={styles.retryButtonText}>{isSubmitting ? 'Please wait...' : 'Try Again'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Button */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={showConfirmation}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={isSubmitting ? 
                  ['rgba(255,107,53,0.5)', 'rgba(229,90,43,0.5)'] : 
                  [colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {isSubmitting ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color={colors.white} size="small" />
                    <Text style={styles.buttonText}>Generating...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Icon name="lightning-bolt" size={18} color={colors.white} />
                    <Text style={styles.buttonText}>Generate Plan</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>By generating, you agree to the AI usage policy.</Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statusText: {
    color: colors.white,
    fontSize: 14,
    marginLeft: 8,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  titleSection: {
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 40,
  },
  titlePreheading: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
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
    marginTop: 8,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
  },
  alertIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertText: {
    color: colors.white,
    fontSize: 14,
    flex: 1,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionTitleText: {
    color: colors.white,
    marginLeft: 8,
    letterSpacing: 1,
  },
  optionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionCardSelected: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  optionCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionIconContainerSelected: {
    backgroundColor: 'rgba(255,107,53,0.2)',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bodybuilderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bodybuilderTile: {
    width: (width - 56) / 2,
    height: 160,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bodybuilderTileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  bodybuilderCardGradient: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  bodybuilderContent: {
    flex: 1,
  },
  bodybuilderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bodybuilderSelectedIndicator: {
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodybuilderTextContainer: {
    flex: 1,
  },
  bodybuilderName: {
    color: colors.white,
    fontSize: 16,
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
    letterSpacing: 0.5,
  },
  bodybuilderStyleSelected: {
    color: colors.accent,
  },
  bodybuilderDescription: {
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 14,
    flex: 1,
  },
  bodybuilderDescriptionSelected: {
    color: colors.textSecondary,
  },
  profileCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  profileMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  profileMetric: {
    alignItems: 'center',
    width: '45%', // Allow for 2 metrics per row with some spacing
    marginBottom: 16,
  },
  profileMetricFull: {
    width: '100%',
  },
  metricValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorIconContainer: {
    marginRight: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    shadowOpacity: 0.2,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 30,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginHorizontal: 8,
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  incompleteProfileContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  incompleteProfileIcon: {
    marginBottom: 15,
  },
  incompleteProfileTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  incompleteProfileText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  completeProfileButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  completeProfileButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  guestButtonsContainer: {
    width: '100%',
    alignItems: 'center',
  }
}); 