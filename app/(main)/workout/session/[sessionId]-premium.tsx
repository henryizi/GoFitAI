import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Dimensions, ImageBackground, AppState, Text, Image } from 'react-native';
import { Button, ActivityIndicator, TextInput, Divider, IconButton, Avatar, ProgressBar, Dialog, Portal } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../../src/services/supabase/client';
import { Database } from '../../../../src/types/database';
import { ExerciseService } from '../../../../src/services/workout/ExerciseService';
import * as WorkoutHistoryServiceModule from '../../../../src/services/workout/WorkoutHistoryService';
const { WorkoutHistoryService } = WorkoutHistoryServiceModule;
import { PreviousExerciseService, PreviousExerciseData } from '../../../../src/services/workout/PreviousExerciseService';
import { colors } from '../../../../src/styles/colors';
import { theme } from '../../../../src/styles/theme';
import RestTimer from '../../../../src/components/workout/RestTimer';
import { Header } from '../../../../src/components/ui/Header';
import { Card } from '../../../../src/components/ui/Card';
import { Section } from '../../../../src/components/ui/Section';
import { LinearGradient } from 'expo-linear-gradient';
import { track as analyticsTrack } from '../../../../src/services/analytics/analytics';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { isBodyweightExercise, canUseOptionalWeight } from '../../../../src/constants/exerciseNames';
import { useAuth } from '../../../../src/hooks/useAuth';
import { calculateWorkoutCalories, adjustCaloriesForUserProfile } from '../../../../src/utils/calorieCalculation';
import ExercisePicker from '../../../../src/components/workout/ExercisePicker';
import { RecentExercisesService, RecentExercise } from '../../../../src/services/workout/RecentExercisesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Helper function to check if an exercise is cardio
const isCardioExercise = (exerciseName: string): boolean => {
  // Explicitly exclude strength exercises that should never be treated as cardio
  const strengthExerciseNames = ['face pull', 'cable face pull', 'reverse fly', 'rear delt fly', 'rope pushdown', 'tricep rope', 'tricep pushdown'];
  if (exerciseName && strengthExerciseNames.some(name => 
    exerciseName.toLowerCase().includes(name)
  )) {
    return false;
  }

  const cardioKeywords = ['jump', 'burpee', 'running', 'sprint', 'hiit', 'interval', 'rope', 'mountain', 'climber', 
                          'jack', 'knee', 'kicker', 'bound', 'crawl', 'star', 'battle', 'swing', 'slam', 'shuttle', 
                          'fartlek', 'swimming', 'dance', 'dancing', 'step', 'stair', 'climb', 'cardio'];
  
  return cardioKeywords.some(keyword => exerciseName?.toLowerCase().includes(keyword));
};

// Weight conversion utilities
const convertLbsToKg = (lbs: number): number => lbs * 0.453592;
const convertKgToLbs = (kg: number): number => kg * 2.20462;
const formatWeight = (weight: number, unit: 'kg' | 'lbs'): string => {
  return unit === 'kg' ? weight.toFixed(1) : weight.toFixed(0);
};

export type ExerciseSet = Database['public']['Tables']['exercise_sets']['Row'];
export type ExerciseLogInsert = Database['public']['Tables']['exercise_logs']['Insert'];
export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];

// Function to fetch last performance for an exercise
async function fetchLastExercisePerformance(exerciseName: string, userId: string) {
  try {
    console.log('[Session] ===== Fetching last performance for:', exerciseName, '=====');
    
    // Array to collect all sets from both sources
    const allSets: Array<{
      reps: number;
      weight: number | null;
      rpe?: number | null;
      completed_at: string;
    }> = [];
    
    // METHOD 1: Query workout_history for custom/quick workouts (exercises_data JSONB field)
    console.log('[Session] Querying workout_history for custom workouts...');
    const { data: historyData, error: historyError } = await supabase
      .from('workout_history')
      .select('exercises_data, completed_at')
      .eq('user_id', userId)
      .not('exercises_data', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50); // Get recent history
    
    if (historyError) {
      console.error('[Session] Error fetching workout history:', historyError);
    } else if (historyData && historyData.length > 0) {
      console.log('[Session] Found', historyData.length, 'workout history records');
      
      // Parse exercises_data and look for matching exercise names
      historyData.forEach((history: any, historyIndex: number) => {
        console.log(`[Session] History record ${historyIndex + 1}:`, {
          plan_name: history.plan_name,
          session_name: history.session_name,
          completed_at: history.completed_at,
          exercises_data_type: typeof history.exercises_data,
          exercises_data_is_array: Array.isArray(history.exercises_data),
          exercises_data_length: history.exercises_data?.length
        });
        
        if (history.exercises_data && Array.isArray(history.exercises_data)) {
          history.exercises_data.forEach((exerciseData: any, exIndex: number) => {
            console.log(`[Session]   Exercise ${exIndex + 1}:`, {
              all_keys: Object.keys(exerciseData),
              exercise_id: exerciseData.exercise_id,
              exercise_name: exerciseData.exercise_name,
              name: exerciseData.name,
              has_logs: !!exerciseData.logs,
              logs_length: exerciseData.logs?.length,
              has_sets: !!exerciseData.sets,
              sets_length: exerciseData.sets?.length,
              full_data: JSON.stringify(exerciseData).substring(0, 200)
            });
            
            // Case-insensitive match - check both 'exercise_name' and 'name' fields
            const savedExerciseName = exerciseData.exercise_name || exerciseData.name;
            if (savedExerciseName?.toLowerCase() === exerciseName.toLowerCase()) {
              console.log('[Session] ✓ Found matching exercise in history:', savedExerciseName);
              
              // Handle different data structures:
              // 1. Array of set objects: [{reps, weight}, {reps, weight}]
              // 2. Arrays for each property: {reps: [10,10,10], weights: [25,25,25]}
              
              if (exerciseData.logs && Array.isArray(exerciseData.logs)) {
                // Structure 1: logs array with set objects
                console.log('[Session]   Processing logs array:', exerciseData.logs.length, 'sets');
                exerciseData.logs.forEach((set: any) => {
                  allSets.push({
                    reps: set.actual_reps || set.reps || 0,
                    weight: set.actual_weight || set.weight || null,
                    rpe: set.actual_rpe || set.rpe || null,
                    completed_at: set.completed_at || history.completed_at
                  });
                });
              } else if (exerciseData.reps && Array.isArray(exerciseData.reps)) {
                // Structure 2: separate arrays for reps and weights
                const repsArray = exerciseData.reps;
                const weightsArray = exerciseData.weights || [];
                console.log('[Session]   Processing arrays - reps:', repsArray.length, 'weights:', weightsArray.length);
                
                repsArray.forEach((reps: number, index: number) => {
                  allSets.push({
                    reps: reps || 0,
                    weight: weightsArray[index] || null,
                    rpe: null,
                    completed_at: history.completed_at
                  });
                });
              } else if (exerciseData.sets && Array.isArray(exerciseData.sets)) {
                // Structure 3: sets array (fallback)
                console.log('[Session]   Processing sets array:', exerciseData.sets.length, 'sets');
                exerciseData.sets.forEach((set: any) => {
                  allSets.push({
                    reps: set.actual_reps || set.reps || 0,
                    weight: set.actual_weight || set.weight || null,
                    rpe: set.actual_rpe || set.rpe || null,
                    completed_at: set.completed_at || history.completed_at
                  });
                });
              }
              
              console.log('[Session]   Extracted', allSets.length, 'total sets so far');
            }
          });
        }
      });
      
      console.log('[Session] Found', allSets.length, 'sets from workout_history');
    }
    
    // METHOD 2: Query exercise_logs for planned workouts (traditional method)
    console.log('[Session] Querying exercise_logs for planned workouts...');
    
    // First, get ALL exercise IDs with this name (across all plans)
    const { data: exercisesData, error: exerciseError } = await supabase
      .from('exercises')
      .select('id, name, plan_id')
      .ilike('name', exerciseName);
    
    if (exerciseError) {
      console.error('[Session] Error fetching exercises:', exerciseError);
    } else if (exercisesData && exercisesData.length > 0) {
      const exerciseIds = exercisesData.map(ex => ex.id);
      console.log('[Session] Found', exerciseIds.length, 'exercise(s) with matching name in exercises table');
      
      // Find all exercise_sets for these exercises
      const { data: setsData, error: setsError } = await supabase
        .from('exercise_sets')
        .select('id, exercise_id, session_id')
        .in('exercise_id', exerciseIds);
      
      if (setsError) {
        console.error('[Session] Error fetching exercise sets:', setsError);
      } else if (setsData && setsData.length > 0) {
        console.log('[Session] Found', setsData.length, 'exercise sets');
        const setIds = setsData.map(s => s.id);
        
        // Get ALL exercise logs for these sets (no limit to find true personal best)
        const { data: logsData, error: logsError } = await supabase
          .from('exercise_logs')
          .select('id, actual_reps, actual_weight, actual_rpe, completed_at, set_id')
          .in('set_id', setIds)
          .order('completed_at', { ascending: false });
        
        if (logsError) {
          console.error('[Session] Error fetching exercise logs:', logsError);
        } else if (logsData && logsData.length > 0) {
          console.log('[Session] Found', logsData.length, 'exercise logs from planned workouts');
          
          logsData.forEach((log: any) => {
            allSets.push({
              reps: log.actual_reps,
              weight: log.actual_weight,
              rpe: log.actual_rpe,
              completed_at: log.completed_at
            });
          });
        }
      }
    }
    
    // Check if we found any sets from either method
    if (allSets.length === 0) {
      console.log('[Session] No previous performance data found for', exerciseName);
      return null;
    }
    
    // Sort all sets by completion time (most recent first)
    allSets.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    
    // Take only the most recent 10 sets for display
    const recentSets = allSets.slice(0, 10);
    
    console.log('[Session] Total sets found:', allSets.length, '| Showing most recent:', recentSets.length);
    
    // Find TRUE personal best across ALL historical sets (not just recent 10)
    let topSetWeight: number | null = null;
    let topSetReps: number = 0;
    
    allSets.forEach((set) => {
      if (set.weight !== null && set.weight > 0) {
        // Update personal best if this weight is higher
        if (topSetWeight === null || set.weight > topSetWeight) {
          topSetWeight = set.weight;
          topSetReps = set.reps;
        }
      }
    });
    
    console.log('[Session] 🏆 Personal Best found:', {
      weight: topSetWeight,
      reps: topSetReps,
      fromTotalSets: allSets.length
    });
    
    // Format the data
    return {
      exerciseName,
      lastPerformed: recentSets[0]?.completed_at || null,
      sets: recentSets, // Show recent sets for display
      topSet: {
        weight: topSetWeight || 0,
        reps: topSetReps
      }
    };
  } catch (error) {
    console.error('[Session] Error fetching last performance:', error);
    return null;
  }
}

export default function SessionExecutionScreen() {
  useEffect(() => {
    analyticsTrack('screen_view', { screen: 'workout_session' });
  }, []);

  const { sessionId, sessionTitle, fallbackExercises } = useLocalSearchParams<{ sessionId: string; sessionTitle: string; fallbackExercises?: string }>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); // Keep for backward compatibility but not used for navigation
  const [setNumber, setSetNumber] = useState(1); // Keep for backward compatibility
  const [actualReps, setActualReps] = useState(''); // Keep for backward compatibility
  const [actualWeight, setActualWeight] = useState(''); // Keep for backward compatibility
  const [actualRPE, setActualRPE] = useState(''); // Keep for backward compatibility
  // Table view state: track inputs for each set per exercise (keyed by "exerciseId_setNumber")
  const [setInputs, setSetInputs] = useState<Record<string, { reps: string; weight: string; rpe: string }>>({});
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(profile?.weight_unit_preference || 'kg');
  const [sessionWeightUnit, setSessionWeightUnit] = useState<'kg' | 'lbs' | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Record<string, { name: string; image?: string | null; muscleGroups?: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [resting, setResting] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, Array<{
    reps: number;
    weight: number | null;
    weight_unit: 'kg' | 'lbs';
    original_weight: number | null;
    rpe: number | null;
    completed_at: string;
    set_number: number;
  }>>>({});
  const [sessionProgress, setSessionProgress] = useState(0);
  const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null);
  const [realTimeCalories, setRealTimeCalories] = useState<number>(0);
  const [splitName, setSplitName] = useState<string | null>(null);
  const [previousExerciseData, setPreviousExerciseData] = useState<Map<string, PreviousExerciseData>>(new Map());
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isQuickWorkout, setIsQuickWorkout] = useState(false);
  const [showLastPerformance, setShowLastPerformance] = useState(false);
  const [lastPerformanceData, setLastPerformanceData] = useState<any>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [workoutName, setWorkoutName] = useState(sessionTitle || 'Quick Workout');
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [preloadedExercises, setPreloadedExercises] = useState<any[]>([]);
  const [preloadedRecentExercises, setPreloadedRecentExercises] = useState<RecentExercise[]>([]);

  // Reset image error when exercise changes
  useEffect(() => {
    setImageLoadError(false);
  }, [currentIndex]);

  // Load last used weight unit across workouts as a warm default
  useEffect(() => {
    const loadLastUnit = async () => {
      try {
        const stored = await AsyncStorage.getItem('last_weight_unit');
        if (stored === 'kg' || stored === 'lbs') {
          setWeightUnit(stored);
        }
      } catch (err) {
        console.warn('[Session] Failed to load last weight unit:', err);
      }
    };

    loadLastUnit();
  }, []);

  const handleRPEChange = (text: string) => {
    if (text === '') {
      setActualRPE('');
      return;
    }
    // Only allow integers 1-10
    if (/^([1-9]|10)$/.test(text)) {
      setActualRPE(text);
    }
  };
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  // Track session start time - use ref so it doesn't change on re-renders
  const sessionStartTime = useRef<number>(Date.now());

  // Storage key for persisting session state
  const SESSION_STORAGE_KEY = `workout_session_${sessionId}`;

  // Save session state to AsyncStorage
  const saveSessionState = async () => {
    try {
      const stateToSave = {
        completedSets,
        currentIndex,
        setNumber,
        setInputs,
        workoutName,
        sessionStartTime: sessionStartTime.current,
        savedAt: Date.now()
      };
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
      console.log('[Session] 💾 Saved session state to storage');
    } catch (error) {
      console.warn('[Session] Failed to save session state:', error);
    }
  };

  // Load session state from AsyncStorage
  const loadSessionState = async () => {
    try {
      const saved = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Only restore if saved within last 24 hours (prevent stale data)
        const hoursSinceSave = (Date.now() - state.savedAt) / (1000 * 60 * 60);
        if (hoursSinceSave < 24) {
          console.log('[Session] 📂 Restoring session state from storage');
          if (state.completedSets) {
            setCompletedSets(state.completedSets);
          }
          if (typeof state.currentIndex === 'number') {
            setCurrentIndex(state.currentIndex);
          }
          if (typeof state.setNumber === 'number') {
            setSetNumber(state.setNumber);
          }
          if (state.setInputs) {
            setSetInputs(state.setInputs);
          }
          if (state.workoutName) {
            setWorkoutName(state.workoutName);
          }
          if (state.sessionStartTime) {
            sessionStartTime.current = state.sessionStartTime;
          }
        } else {
          console.log('[Session] ⏰ Saved state is too old, clearing');
          await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('[Session] Failed to load session state:', error);
    }
  };

  // Clear saved session state (when workout is completed)
  const clearSessionState = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      console.log('[Session] 🗑️ Cleared saved session state');
    } catch (error) {
      console.warn('[Session] Failed to clear session state:', error);
    }
  };

  // Save state whenever completedSets changes (debounced to avoid too frequent saves)
  useEffect(() => {
    if (Object.keys(completedSets).length > 0) {
      const timer = setTimeout(() => {
        saveSessionState();
      }, 500); // Debounce by 500ms
      return () => clearTimeout(timer);
    }
  }, [completedSets]);

  // Save state when currentIndex or setNumber changes
  useEffect(() => {
    if (sets.length > 0) {
      const timer = setTimeout(() => {
        saveSessionState();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, setNumber]);

  // Save state when workoutName changes
  useEffect(() => {
    if (workoutName) {
      saveSessionState();
    }
  }, [workoutName]);

  // Load saved state on mount
  useEffect(() => {
    loadSessionState();
  }, []);

  // Save state when app goes to background - use refs to get latest state
  const completedSetsRef = useRef(completedSets);
  const currentIndexRef = useRef(currentIndex);
  const setNumberRef = useRef(setNumber);
  const workoutNameRef = useRef(workoutName);
  const setInputsRef = useRef(setInputs);

  // Update refs when state changes
  useEffect(() => {
    completedSetsRef.current = completedSets;
  }, [completedSets]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    setNumberRef.current = setNumber;
  }, [setNumber]);
  useEffect(() => {
    workoutNameRef.current = workoutName;
  }, [workoutName]);
  useEffect(() => {
    setInputsRef.current = setInputs;
  }, [setInputs]);

  // Save state when app goes to background
  useEffect(() => {
    const saveStateOnBackground = async () => {
      try {
        const stateToSave = {
          completedSets: completedSetsRef.current,
          currentIndex: currentIndexRef.current,
          setNumber: setNumberRef.current,
          setInputs: setInputsRef.current,
          workoutName: workoutNameRef.current,
          sessionStartTime: sessionStartTime.current,
          savedAt: Date.now()
        };
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
        console.log('[Session] 💾 Saved session state on background');
      } catch (error) {
        console.warn('[Session] Failed to save session state on background:', error);
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[Session] 📱 App going to background, saving state...');
        saveStateOnBackground();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Update weight unit when user profile changes
  useEffect(() => {
    if (profile?.weight_unit_preference) {
      setWeightUnit(profile.weight_unit_preference);
    }
  }, [profile?.weight_unit_preference]);

  // Set weight unit to session preference when starting new exercises
  useEffect(() => {
    if (sessionWeightUnit !== null) {
      setWeightUnit(sessionWeightUnit);
    }
  }, [currentIndex, sessionWeightUnit]);

  // Persist session weight unit as the last used unit across workouts
  useEffect(() => {
    const persistUnit = async () => {
      if (!sessionWeightUnit) return;
      try {
        await AsyncStorage.setItem('last_weight_unit', sessionWeightUnit);
      } catch (err) {
        console.warn('[Session] Failed to save last weight unit:', err);
      }
    };

    persistUnit();
  }, [sessionWeightUnit]);

  // Calculate real-time calories based on actual exercises performed + projected remaining
  const calculateRealTimeCalories = () => {
    if (!sets || sets.length === 0) return 0;
    
    let completedCalories = 0;
    let projectedCalories = 0;
    
    // 1. Calculate calories from completed sets
    const completedExerciseData: Array<{ name: string; sets: number; reps: number }> = [];
    
    Object.entries(completedSets).forEach(([exerciseId, completedSetsList]) => {
      const exercise = sets.find(s => s.id === exerciseId);
      
      // Check if we have exercise data in exerciseMap directly (for custom workouts)
      if (exerciseMap[exerciseId]) {
        const totalSets = completedSetsList.length;
        const avgReps = completedSetsList.reduce((sum, set) => sum + set.reps, 0) / totalSets;
        
        completedExerciseData.push({
          name: exerciseMap[exerciseId].name,
          sets: totalSets,
          reps: Math.round(avgReps)
        });
      } else if (exercise && exerciseMap[exercise.exercise_id]) {
        const totalSets = completedSetsList.length;
        const avgReps = completedSetsList.reduce((sum, set) => sum + set.reps, 0) / totalSets;
        
        completedExerciseData.push({
          name: exerciseMap[exercise.exercise_id].name,
          sets: totalSets,
          reps: Math.round(avgReps)
        });
      }
    });
    
    // Calculate completed calories
    if (completedExerciseData.length > 0) {
      const userWeight = profile?.weight || 70;
      const { totalCalories } = calculateWorkoutCalories(completedExerciseData, userWeight);
      completedCalories = totalCalories;
    }
    
    // 2. Calculate projected calories for remaining exercises (including current incomplete exercise)
    const remainingExerciseData: Array<{ name: string; sets: number; reps: number }> = [];
    
    sets.forEach((exercise) => {
      if (!exerciseMap[exercise.exercise_id]) return;
      
      const completedSetsForExercise = completedSets[exercise.id] || [];
      const remainingSets = exercise.target_sets - completedSetsForExercise.length;
      
      if (remainingSets > 0) {
        // Use target reps for projection
        const targetReps = parseInt(exercise.target_reps?.split('-')[0] || '10', 10);
        
        remainingExerciseData.push({
          name: exerciseMap[exercise.exercise_id].name,
          sets: remainingSets,
          reps: targetReps
        });
      }
    });
    
    // Calculate projected calories for remaining work
    if (remainingExerciseData.length > 0) {
      const userWeight = profile?.weight || 70;
      const { totalCalories } = calculateWorkoutCalories(remainingExerciseData, userWeight);
      projectedCalories = totalCalories;
    }
    
    // Total calories = completed + projected remaining
    const totalCalories = completedCalories + projectedCalories;
    
    // Adjust based on user profile if available
    const fitnessLevel = profile?.fitness_level || 'intermediate';
    const age = profile?.age;
    const gender = profile?.gender;
    
    const adjustedCalories = adjustCaloriesForUserProfile(totalCalories, {
      fitnessLevel: fitnessLevel as 'beginner' | 'intermediate' | 'advanced',
      age: age,
      gender: gender as 'male' | 'female',
      intensity: 'moderate' // Default to moderate intensity for session
    });
    
    return adjustedCalories;
  };

  const handleBackButtonPress = () => {
    console.log('Back button pressed in session screen');
    Alert.alert(
      "Exit Workout?",
      "You haven't finished your workout. Are you sure you want to exit?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => {
          console.log('Exit confirmed - navigating to workout plans');
          // Always navigate to workout plans instead of using router.back()
          router.replace('/(main)/workout/plans');
        }}
      ]
    );
  };

  useEffect(() => {
    const fetchSets = async () => {
      setLoading(true);
      console.log('[Session] Opening session screen with ID:', sessionId);
      
      // Check if sessionId is a valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(sessionId));
      
      let fetchedSets: ExerciseSet[] = [];
      
      if (isValidUUID) {
        // For valid UUID session IDs, fetch from database
        const { data, error } = await supabase
          .from('exercise_sets')
          .select('*')
          .eq('session_id', sessionId)
          .order('order_in_session', { ascending: true });

        if (error) {
          console.warn('[Session] Error fetching sets for session:', sessionId, error);
        }
        console.log('[Session] DB returned sets:', (data || []).length);
        fetchedSets = (!error && data ? (data as ExerciseSet[]) : []);
      } else {
        console.log('[Session] Session ID is not a valid UUID, using fallback exercises');
        // For non-UUID sessions, use the fallbackExercises from the route params
        if (fallbackExercises) {
          try {
            const parsedExercises = JSON.parse(fallbackExercises);
            console.log('[Session] Parsed fallback exercises:', parsedExercises.length);
            
            // Convert fallback exercises to the expected format
            fetchedSets = parsedExercises.map((ex: any, index: number) => ({
              id: `ex-${sessionId}-${index}`,
              session_id: sessionId as string,
              exercise_id: `ex-id-${index}`,
              order_in_session: index,
              target_sets: ex.sets || 3,
              target_reps: ex.reps || '8-12',
              rest_period: ex.rest || ex.restBetweenSets || '60s',
              target_rpe: null,
              progression_scheme: 'double_progression',
              notes: null
            }));
            
            // Build exercise name map from fallback
            const map: Record<string, { name: string }> = {};
            parsedExercises.forEach((ex: any, idx: number) => {
              map[`ex-id-${idx}`] = { name: ex.name || 'Exercise' };
            });
            setExerciseMap(map);
          } catch (e) {
            console.error('[Session] Error parsing fallback exercises:', e);
          }
        }
      }

      // Set the fetched sets
      setSets(fetchedSets);
      
      // If we have a valid UUID, also fetch the session details
      if (isValidUUID) {
        try {
          // Fetch session details to get estimated calories and split info
          const { data: sessionData, error: sessionError } = await supabase
            .from('workout_sessions')
            .select(`
              *,
              training_splits (
                name,
                focus_areas
              )
            `)
            .eq('id', sessionId)
            .single();
          
          if (!sessionError && sessionData) {
            console.log('[Session] Fetched session details:', sessionData);
            // Set estimated calories if available
            if (sessionData.estimated_calories) {
              setEstimatedCalories(sessionData.estimated_calories);
            }
            
            // Set split name from the training split
            if (sessionData.training_splits && sessionData.training_splits.name) {
              setSplitName(sessionData.training_splits.name);
              console.log('[Session] Set split name:', sessionData.training_splits.name);
            }
          }
        } catch (e) {
          console.error('[Session] Error fetching session details:', e);
        }
      } else if (fallbackExercises) {
        // For fallback exercises, generate a random calorie estimate
        setEstimatedCalories(Math.floor(Math.random() * 200 + 200));
        
        // Check if this is a quick workout (quick- or custom-)
        if (String(sessionId).startsWith('quick-') || String(sessionId).startsWith('custom-')) {
          setIsQuickWorkout(true);
        }
      }
      
      // Fetch exercise details for all sets
      if (fetchedSets.length > 0) {
        try {
          const exerciseIds = fetchedSets
            .map(set => set.exercise_id)
            .filter((id, index, self) => self.indexOf(id) === index);
          
          if (exerciseIds.length > 0 && exerciseIds[0] && !exerciseIds[0].startsWith('ex-id-')) {
            const { data: exerciseData, error: exerciseError } = await supabase
              .from('exercises')
              .select('id, name, animation_url, muscle_groups')
              .in('id', exerciseIds);
            
            if (!exerciseError && exerciseData) {
              const map: Record<string, { name: string; image?: string | null; muscleGroups?: string[] }> = {};
              exerciseData.forEach(ex => {
                if (ex.id) map[ex.id] = { 
                  name: ex.name || 'Exercise',
                  image: ex.animation_url,
                  muscleGroups: ex.muscle_groups
                };
              });
              setExerciseMap(map);
            }
          }
        } catch (e) {
          console.error('[Session] Error fetching exercise details:', e);
        }
      }
      
      setLoading(false);
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    };

    fetchSets();
  }, [sessionId, fallbackExercises, fadeAnim, slideAnim]);

  // Preload exercise library data immediately and eagerly for instant picker display
  useEffect(() => {
    const preloadExercises = async () => {
      try {
        // Load exercises and recent exercises in parallel - start immediately
        const exercisePromise = ExerciseService.getExercises(undefined, true);
        const recentPromise = user?.id 
          ? RecentExercisesService.getRecentExercises(user.id).catch(() => []) 
          : Promise.resolve([]);
        
        // Don't wait, set as soon as available
        exercisePromise.then(exerciseList => {
          setPreloadedExercises(exerciseList);
          console.log('[Session] Preloaded exercises:', exerciseList.length);
        }).catch(err => console.warn('[Session] Error preloading exercises:', err));
        
        recentPromise.then(recentList => {
          setPreloadedRecentExercises(recentList);
          console.log('[Session] Preloaded recent exercises:', recentList.length);
        }).catch(err => console.warn('[Session] Error preloading recent exercises:', err));
      } catch (err) {
        console.warn('[Session] Error preloading exercises:', err);
      }
    };
    
    // Preload immediately when component mounts - don't block
    preloadExercises();
  }, [user?.id]);

  useEffect(() => {
    // Start animations
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
  }, [fadeAnim, slideAnim, headerOpacity]);

  // Calculate session progress (now handles unlimited sets)
  useEffect(() => {
    if (sets.length > 0) {
      const totalTargetSets = sets.reduce((acc, set) => acc + set.target_sets, 0);
      
      // Calculate actual completed sets from the completedSets state
      const actualCompletedSets = Object.values(completedSets).reduce((acc, exerciseSets) => acc + exerciseSets.length, 0);
      
      // Progress is based on minimum target sets, but can exceed 100% if user does extra sets
      const newProgress = totalTargetSets > 0 ? Math.min(actualCompletedSets / totalTargetSets, 1.0) : 0;
      setSessionProgress(newProgress);
      
      // Animate progress
      Animated.timing(progressAnim, {
        toValue: newProgress,
        duration: 600,
        useNativeDriver: false, // Must be false when animating width
      }).start();
    } else {
      setSessionProgress(0);
    }
  }, [sets, completedSets, progressAnim]);

  // Update real-time calories when completed sets change or when initial data loads
  useEffect(() => {
    // Only calculate if we have sets and exercise map data
    if (sets.length > 0 && Object.keys(exerciseMap).length > 0) {
      const newRealTimeCalories = calculateRealTimeCalories();
      setRealTimeCalories(newRealTimeCalories);
    } else if (sets.length > 0 && Object.keys(exerciseMap).length === 0) {
      // Show 0 calories temporarily while exercise map is loading
      setRealTimeCalories(0);
    }
  }, [completedSets, currentIndex, setNumber, exerciseMap, sets, user]);

  // Fetch previous exercise data when exercises are loaded
  useEffect(() => {
    const fetchPreviousExerciseData = async () => {
      if (!user?.id || sets.length === 0) {
        return;
      }

      console.log('[Session] Fetching previous exercise data for user:', user.id);

      // Build exercise name map for ALL exercises (needed for name-based lookup)
      const exerciseNameMap = new Map<string, string>(); // exerciseId -> exerciseName
      sets.forEach(set => {
        const exerciseName = exerciseMap[set.exercise_id]?.name;
        if (exerciseName) {
          exerciseNameMap.set(set.exercise_id, exerciseName);
        }
      });

      // Check if this is a quick workout (has synthetic IDs or sessionId starts with 'quick-')
      const isQuickWorkout = sessionId?.startsWith('quick-') || sets.some(set => set.exercise_id?.startsWith('ex-id-'));
      
      if (isQuickWorkout) {
        // For quick workouts, always match by exercise name since IDs are synthetic
        console.log('[Session] Quick workout detected, fetching by exercise name');
        try {
          const exercisesByName = Array.from(exerciseNameMap.entries())
            .map(([id, name]) => ({ exerciseId: id, exerciseName: name }));
          
          if (exercisesByName.length > 0) {
            const previousDataByName = await PreviousExerciseService.getLastPerformedExercisesByName(
              user.id,
              exercisesByName
            );
            
            setPreviousExerciseData(previousDataByName);
            console.log(`[Session] Loaded previous exercise data for ${previousDataByName.size} exercises by name`);
          }
        } catch (error) {
          console.error('[Session] Error fetching previous exercise data by name:', error);
        }
      } else {
        // For regular workouts, try by ID first, then by name as fallback
        const exerciseIds = sets
          .map(set => set.exercise_id)
          .filter((id, index, self) => self.indexOf(id) === index && !id.startsWith('ex-id-'));

        if (exerciseIds.length > 0) {
          try {
            const previousData = await PreviousExerciseService.getLastPerformedExercises(user.id, exerciseIds);
            setPreviousExerciseData(previousData);
            console.log(`[Session] Loaded previous exercise data for ${previousData.size} exercises by ID`);
            
            // Also try by name for any exercises not found by ID
            const foundIds = new Set(Array.from(previousData.keys()));
            const missingExercises = Array.from(exerciseNameMap.entries())
              .filter(([id]) => !foundIds.has(id))
              .map(([id, name]) => ({ exerciseId: id, exerciseName: name }));
            
            if (missingExercises.length > 0) {
              console.log(`[Session] Trying to find ${missingExercises.length} missing exercises by name`);
              const previousDataByName = await PreviousExerciseService.getLastPerformedExercisesByName(
                user.id,
                missingExercises
              );
              
              // Merge with existing data
              setPreviousExerciseData(prev => {
                const merged = new Map(prev);
                previousDataByName.forEach((value, key) => {
                  merged.set(key, value);
                });
                return merged;
              });
              console.log(`[Session] Found ${previousDataByName.size} additional exercises by name`);
            }
          } catch (error) {
            console.error('[Session] Error fetching previous exercise data by ID:', error);
          }
        }
      }
    };

    fetchPreviousExerciseData();
  }, [sets, user?.id, exerciseMap]);

  useEffect(() => {
    // Fetch session details to get estimated calories
    const fetchSessionDetails = async () => {
      if (!sessionId) return;
      
      try {
        const { data, error } = await supabase
          .from('workout_sessions')
          .select('estimated_calories')
          .eq('id', sessionId)
          .single();
        
        if (!error && data) {
          setEstimatedCalories(data.estimated_calories);
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
      }
    };
    
    fetchSessionDetails();
  }, [sessionId]);

  const currentSet = sets[currentIndex];

  // Handler to fetch and show last performance
  const handleShowLastPerformance = async () => {
    if (!currentSet || !user?.id) return;
    
    console.log('[Session] Current set exercise_id:', currentSet.exercise_id);
    console.log('[Session] Exercise map keys:', Object.keys(exerciseMap));
    console.log('[Session] Exercise map:', exerciseMap);
    
    const exerciseName = exerciseMap[currentSet.exercise_id]?.name;
    console.log('[Session] Resolved exercise name:', exerciseName);
    
    if (!exerciseName) {
      console.log('[Session] No exercise name found for exercise_id:', currentSet.exercise_id);
      return;
    }
    
    setLastPerformanceData(null); // Reset previous data
    setShowLastPerformance(true); // Show modal with loading state
    
    const data = await fetchLastExercisePerformance(exerciseName, user.id);
    setLastPerformanceData(data);
  };

  // Handle adding a new exercise during the workout
  const handleAddExercise = (exercise: any, numberOfSets: number = 3) => {
    console.log('[Session] Adding exercise to quick workout:', exercise.name, 'with', numberOfSets, 'sets');
    analyticsTrack('quick_workout_exercise_added', { 
      exercise_name: exercise.name,
      sets: numberOfSets 
    });
    
    // Create a new exercise set
    const newOrder = sets.length;
    const newExerciseSet: ExerciseSet = {
      id: `ex-${sessionId}-${newOrder}`,
      session_id: sessionId as string,
      exercise_id: exercise.id,
      order_in_session: newOrder,
      target_sets: numberOfSets, // Use the selected number of sets
      target_reps: '8-12', // Default reps
      rest_period: '90s', // Default rest
      target_rpe: null,
      progression_scheme: 'double_progression',
      notes: null
    };
    
    // Add to sets array and move to the new exercise
    setSets(prevSets => {
      const newSets = [...prevSets, newExerciseSet];
      // Move to the newly added exercise (it will be at the last index)
      setCurrentIndex(newSets.length - 1);
      return newSets;
    });
    
    // Add to exercise map
    setExerciseMap(prevMap => ({
      ...prevMap,
      [exercise.id]: { name: exercise.name }
    }));
    
    // Close the picker
    setShowExercisePicker(false);
    
    // Reset set number and inputs for the new exercise
    setSetNumber(1);
    setActualReps('');
    setActualWeight('');
    console.log('[Session] Added exercise and moved to it');
  };

  const handleSetDone = async () => {
    if (!currentSet) return;
    console.log('[Session] Complete Set tapped for set', currentSet.id, 'index', currentIndex, 'setNumber', setNumber);

    // Allow unlimited sets - no restriction on going beyond target

    // Check if this is a cardio exercise
    const exerciseName = exerciseMap[currentSet.exercise_id]?.name || '';
    const isCardio = isCardioExercise(exerciseName);

    // simple validation
    const repsNum = parseInt(actualReps, 10);
    let weightNum = isCardio ? 0 : (actualWeight ? parseFloat(actualWeight) : null);

    // Set session weight unit on first weight entry (skip for cardio)
    if (!isCardio && weightNum !== null && sessionWeightUnit === null) {
      setSessionWeightUnit(weightUnit);
    }

    // Convert weight to kg if entered in lbs (skip for cardio)
    if (!isCardio && weightNum !== null && weightUnit === 'lbs') {
      weightNum = convertLbsToKg(weightNum);
    }

    if (isNaN(repsNum) || repsNum <= 0) {
      Alert.alert("Invalid Input", isCardio ? "Please enter a valid number of minutes" : "Please enter a valid number of reps");
      return;
    }

    // Track the completed set
    const completedSet = {
      reps: repsNum,
      weight: weightNum, // This is always in kg for database storage
      weight_unit: weightUnit,
      original_weight: actualWeight ? parseFloat(actualWeight) : null, // Original user input
      rpe: actualRPE ? parseFloat(actualRPE) : null,
      completed_at: new Date().toISOString(),
      set_number: setNumber
    };

    const exerciseId = currentSet.exercise_id;
    
    // Update completed sets state and get the updated state for immediate use
    const updatedCompletedSets = {
      ...completedSets,
      [exerciseId]: [...(completedSets[exerciseId] || []), completedSet]
    };
    setCompletedSets(updatedCompletedSets);

    // Clear input fields for next set
    setActualReps('');
    setActualWeight('');
    setActualRPE('');

    // Insert log only if this is a real set (skip synthetic fallback ids)
    if (!String(currentSet.id).toString().startsWith('fallback-') && !String(currentSet.id).toString().startsWith('ex-')) {
      try {
        console.log(`[Session] Logging set for exercise: ${currentSet.id}, reps: ${repsNum}, weight: ${weightNum}`);
        
        const log = {
          set_id: currentSet.id,
          actual_reps: repsNum,
          actual_weight: weightNum,
          actual_rpe: actualRPE ? parseFloat(actualRPE) : null,
          completed_at: new Date().toISOString(),
        };
        
        const { data, error } = await supabase
          .from('exercise_logs')
          .insert(log)
          .select();
        
        if (error) {
          console.error('[Session] Error logging exercise set:', error);
          Alert.alert('Error', 'Failed to save your set. Please try again.');
          return;
        }
        
        console.log('[Session] Successfully logged exercise set:', data);
      } catch (err) {
        console.error('[Session] Exception while logging exercise set:', err);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        return;
      }
    } else {
      console.log('[Session] Skipping database log for fallback/synthetic exercise');
    }

    // Reset inputs
    setActualReps('');
    setActualWeight('');
    
    console.log(`[Session] Set completion check - setNumber: ${setNumber}, target_sets: ${currentSet.target_sets}, currentIndex: ${currentIndex}, total sets: ${sets.length}`);
    console.log(`[Session] Updated completedSets for exercise ${exerciseId}:`, updatedCompletedSets[exerciseId]?.length || 0, 'sets');
    
    // Check if user has completed all planned sets for this exercise
    const completedSetsForExercise = updatedCompletedSets[exerciseId] || [];
    const hasCompletedAllSets = completedSetsForExercise.length >= currentSet.target_sets;
    
    // Auto-complete workout only when all exercises are done with their target sets
    const shouldAutoComplete = false; // Keep manual completion for now
    
    if (shouldAutoComplete) {
      // Skip rest timer and go directly to workout completion
      console.log('[Session] Last set completed - finishing workout');
      
      // Always save workout history for completed workouts
        try {
          const completedAt = new Date().toISOString();
        const totalSets = sets.length;
        const totalExercises = new Set(sets.map(set => set.exercise_id)).size;
        const durationMinutes = Math.round((Date.now() - sessionStartTime.current) / 60000);
        
        // Check if this is a custom/fallback workout or a regular database workout
        const isCustomWorkout = String(currentSet.id).startsWith('fallback-') || String(currentSet.id).startsWith('ex-');
        
        if (!isCustomWorkout) {
          // Regular database workout - update session status and save history normally
          console.log(`[Session] Marking database session ${sessionId} as completed`);
          
          const updateData = { 
            status: 'completed', 
            completed_at: completedAt
          };
          
          const { error: updateError } = await supabase
            .from('workout_sessions')
            .update(updateData)
            .eq('id', sessionId);
          
          if (updateError) {
            console.error('[Session] Error updating session status:', updateError);
          } else {
            console.log('[Session] Database session marked as completed successfully');
          }
            
          // Save workout history for database workouts
            try {
              const { data: sessionData } = await supabase
                .from('workout_sessions')
                .select('plan_id')
                .eq('id', sessionId)
                .single();
              
              if (sessionData?.plan_id) {
                const { data: planData } = await supabase
                  .from('workout_plans')
                  .select('user_id')
                  .eq('id', sessionData.plan_id)
                  .single();
                
                if (planData?.user_id) {
                // Calculate only actual completed calories (no projections) for history
                const completedExerciseData: Array<{ name: string; sets: number; reps: number }> = [];
                
                console.log('[Session] DEBUG: Building completed exercise data for history');
                console.log('[Session] DEBUG: completedSets keys:', Object.keys(updatedCompletedSets));
                console.log('[Session] DEBUG: exerciseMap keys:', Object.keys(exerciseMap));
                console.log('[Session] DEBUG: sets length:', sets.length);
                
                Object.entries(updatedCompletedSets).forEach(([exerciseId, completedSetsList]) => {
                  const exercise = sets.find(s => s.id === exerciseId);
                  console.log(`[Session] DEBUG: Processing exercise ${exerciseId}, found exercise:`, !!exercise);
                  
                  if (exercise) {
                    console.log(`[Session] DEBUG: Exercise.exercise_id: ${exercise.exercise_id}, has mapping:`, !!exerciseMap[exercise.exercise_id]);
                    if (exerciseMap[exercise.exercise_id]) {
                      const totalSets = completedSetsList.length;
                      const avgReps = completedSetsList.reduce((sum, set) => sum + set.reps, 0) / totalSets;
                      
                      const exerciseData = {
                        name: exerciseMap[exercise.exercise_id].name,
                        sets: totalSets,
                        reps: Math.round(avgReps)
                      };
                      
                      console.log(`[Session] DEBUG: Adding exercise to history:`, exerciseData);
                      completedExerciseData.push(exerciseData);
                    } else {
                      console.log(`[Session] DEBUG: Missing exercise mapping for ${exercise.exercise_id}`);
                    }
                  } else {
                    console.log(`[Session] DEBUG: Could not find exercise with id ${exerciseId} in sets`);
                  }
                });
                
                console.log('[Session] DEBUG: Final completedExerciseData:', completedExerciseData);
                
                // Use the real-time calories shown in the progress bar
                const actualCompletedCalories = realTimeCalories;

                console.log(`[Session] DEBUG: Saving to history with ${actualCompletedCalories} calories (from progress bar)`);
                console.log('[Session] DEBUG: Database workout history data being saved:', {
                  user_id: planData.user_id,
                  plan_id: sessionData.plan_id,
                  session_id: sessionId,
                  completed_at: completedAt,
                  duration_minutes: durationMinutes,
                  total_sets: totalSets,
                  total_exercises: totalExercises,
                  estimated_calories: actualCompletedCalories
                });
                
                  const historySaved = await WorkoutHistoryService.saveWorkoutHistory({
                    user_id: planData.user_id,
                    plan_id: sessionData.plan_id,
                    session_id: sessionId,
                    completed_at: completedAt,
                    duration_minutes: durationMinutes,
                    total_sets: totalSets,
                    total_exercises: totalExercises,
                    estimated_calories: actualCompletedCalories,
                    notes: `Completed ${totalExercises} exercises with ${totalSets} total sets`
                  });
                  
                  if (historySaved) {
                    console.log('[Session] ✅ Database workout history saved successfully');
                  } else {
                    console.error('[Session] ❌ Failed to save database workout history');
                  }
                }
              }
            } catch (historyError) {
            console.error('[Session] Error saving database workout history:', historyError);
          }
        } else {
          // Custom/fallback workout - save history with synthetic data
          console.log('[Session] Saving custom workout to history');
          
          try {
            if (user?.id) {
              // Calculate only actual completed calories (no projections) for custom workout history
              const completedExerciseData: Array<{ name: string; sets: number; reps: number }> = [];
              
              console.log('[Session] DEBUG CUSTOM: Building completed exercise data for custom workout history');
              console.log('[Session] DEBUG CUSTOM: completedSets keys:', Object.keys(updatedCompletedSets));
              console.log('[Session] DEBUG CUSTOM: exerciseMap keys:', Object.keys(exerciseMap));
              console.log('[Session] DEBUG CUSTOM: sets length:', sets.length);
              
              Object.entries(updatedCompletedSets).forEach(([exerciseId, completedSetsList]) => {
                const exercise = sets.find(s => s.id === exerciseId);
                console.log(`[Session] DEBUG CUSTOM: Processing exercise ${exerciseId}, found exercise:`, !!exercise);
                console.log(`[Session] DEBUG CUSTOM: Available set IDs:`, sets.map(s => s.id));
                
                // Check if we have exercise data in exerciseMap directly (for custom workouts)
                if (exerciseMap[exerciseId]) {
                  console.log(`[Session] DEBUG CUSTOM: Found exercise directly in exerciseMap for ${exerciseId}`);
                  const totalSets = completedSetsList.length;
                  const avgReps = completedSetsList.reduce((sum, set) => sum + set.reps, 0) / totalSets;
                  
                  const exerciseData = {
                    name: exerciseMap[exerciseId].name,
                    sets: totalSets,
                    reps: Math.round(avgReps)
                  };
                  
                  console.log(`[Session] DEBUG CUSTOM: Adding exercise to history:`, exerciseData);
                  completedExerciseData.push(exerciseData);
                } else if (exercise) {
                  console.log(`[Session] DEBUG CUSTOM: Exercise.exercise_id: ${exercise.exercise_id}, has mapping:`, !!exerciseMap[exercise.exercise_id]);
                  if (exerciseMap[exercise.exercise_id]) {
                    const totalSets = completedSetsList.length;
                    const avgReps = completedSetsList.reduce((sum, set) => sum + set.reps, 0) / totalSets;
                    
                    const exerciseData = {
                      name: exerciseMap[exercise.exercise_id].name,
                      sets: totalSets,
                      reps: Math.round(avgReps)
                    };
                    
                    console.log(`[Session] DEBUG CUSTOM: Adding exercise to history:`, exerciseData);
                    completedExerciseData.push(exerciseData);
                  } else {
                    console.log(`[Session] DEBUG CUSTOM: Missing exercise mapping for ${exercise.exercise_id}`);
                  }
                } else {
                  console.log(`[Session] DEBUG CUSTOM: Could not find exercise with id ${exerciseId} in exerciseMap or sets`);
                }
              });
              
              console.log('[Session] DEBUG CUSTOM: Final completedExerciseData:', completedExerciseData);
              
              // Use the real-time calories shown in the progress bar
              const actualCompletedCalories = realTimeCalories;
              
              console.log(`[Session] DEBUG CUSTOM: Saving to history with ${actualCompletedCalories} calories (from progress bar)`);
              console.log('[Session] DEBUG CUSTOM: Workout history data being saved:', {
                user_id: user.id,
                plan_name: 'Custom Workout',
                session_name: workoutName || splitName || 'Custom Session',
                completed_at: completedAt,
                duration_minutes: durationMinutes,
                total_sets: totalSets,
                total_exercises: totalExercises,
                estimated_calories: actualCompletedCalories,
                exercises_count: sets.length
              });
              
              // Create workout history entry for custom workouts
              const exercisesDataToSave = sets.map(set => {
                const exerciseCompletedSets = updatedCompletedSets[set.exercise_id] || [];
                const exerciseData = {
                  exercise_id: set.exercise_id,
                  exercise_name: exerciseMap[set.exercise_id]?.name || 'Unknown Exercise',
                  target_sets: set.target_sets,
                  target_reps: set.target_reps,
                  rest_period: set.rest_period,
                  order_in_session: sets.indexOf(set) + 1,
                  // Include actual performed sets
                  logs: exerciseCompletedSets.map((completedSet, index) => ({
                    id: `custom-log-${set.exercise_id}-${index}`,
                    actual_reps: completedSet.reps,
                    actual_weight: completedSet.weight,
                    actual_rpe: completedSet.rpe || null,
                    completed_at: completedSet.completed_at,
                    notes: null
                  }))
                };
                console.log('[Session] Saving exercise data:', exerciseData);
                return exerciseData;
              });
              
              console.log('[Session] 🔍 FULL exerciseMap before saving:', JSON.stringify(exerciseMap, null, 2));
              console.log('[Session] 🔍 FULL exercisesDataToSave:', JSON.stringify(exercisesDataToSave, null, 2));
              
              const customHistorySaved = await WorkoutHistoryService.saveCustomWorkoutHistory({
                user_id: user.id,
                plan_name: 'Custom Workout',
                session_name: workoutName || splitName || 'Custom Session',
                completed_at: completedAt,
                duration_minutes: durationMinutes,
                total_sets: totalSets,
                total_exercises: totalExercises,
                estimated_calories: actualCompletedCalories,
                notes: `Custom workout: ${totalExercises} exercises with ${totalSets} total sets`,
                exercises_data: exercisesDataToSave
              });
              
              if (customHistorySaved) {
                console.log('[Session] ✅ Custom workout history saved successfully');
              } else {
                console.error('[Session] ❌ Failed to save custom workout history');
              }
            } else {
              console.warn('[Session] No user ID available for saving custom workout history');
            }
          } catch (customHistoryError) {
            console.error('[Session] Error saving custom workout history:', customHistoryError);
          }
        }
      } catch (err) {
        console.error('[Session] Exception during workout completion:', err);
      }
      
      // Show completion dialog instead of navigating to non-existent route
      showCompletionDialog();
    } else {
      // In table view, we don't show rest timer - rest time is displayed as text below each set
      console.log('[Session] Set completed');
    }
  };

  // Rest timer removed - rest time is now shown as text below each set in table view

  // State to track if workout is technically finished but summary was closed
  const [workoutFinished, setWorkoutFinished] = useState(false);

  // Function to finish current exercise and move to next
  const handleFinishExercise = () => {
    console.log('[Session] Finishing current exercise');
    
    // Check if this is a quick workout (custom or quick)
    const isQuickOrCustom = sessionId.startsWith('custom-') || sessionId.startsWith('quick-') || isQuickWorkout;
    
      if (currentIndex + 1 < sets.length) {
      // There are more exercises - move to next
        setCurrentIndex(prev => prev + 1);
      setSetNumber(1);
      setActualReps('');
      setActualWeight('');
      setActualRPE('');
      // Clear table inputs for the new exercise
      setSetInputs({});
      console.log('[Session] Moving to next exercise');
      } else {
      // This was the last exercise
      // For quick workouts, buttons will appear at bottom - no popup needed
      // For regular workouts, automatically finish
      if (!isQuickOrCustom) {
      console.log('[Session] ✅ Last exercise completed! Auto-finishing workout...');
        setWorkoutFinished(true);
      setTimeout(() => {
        handleFinishWorkout();
        }, 1000);
      }
    }
  };

  const [showSummary, setShowSummary] = useState(false);
  const [editingSet, setEditingSet] = useState<{
    exerciseId: string;
    setIndex: number;
    reps: number;
    weight: number | null;
    rpe: number | null;
  } | null>(null);

  const handleFinishWorkout = async () => {
    if (!showSummary) {
      setShowSummary(true);
      return;
    }
    submitWorkout();
  };

  // Function to finish the entire workout
  const submitWorkout = async () => {
    console.log('[Session] Finishing entire workout');
    console.log('[Session] DEBUG: Current completedSets state:', completedSets);
    console.log('[Session] DEBUG: Number of exercises in completedSets:', Object.keys(completedSets).length);
    Object.entries(completedSets).forEach(([exerciseId, sets]) => {
      console.log(`[Session] DEBUG: Exercise ${exerciseId} has ${sets.length} completed sets:`, sets);
    });
    
    // For quick workouts, show name dialog first
    const isQuick = sessionId.startsWith('quick-') || isQuickWorkout;
    if (isQuick) {
      setPendingSubmit(true);
      setShowNameDialog(true);
      return;
    }
    
    // For regular workouts, proceed directly
    await saveWorkoutHistory();
  };

  // Function to actually save the workout history
  const saveWorkoutHistory = async () => {
    // Always save workout history for completed workouts
    try {
      // Clear saved session state since workout is being completed
      await clearSessionState();
      if (sessionId.startsWith('custom-')) {
        // Handle custom workout completion
        if (user?.id) {
          const completedExercises = [];
          
          Object.entries(completedSets).forEach(([exerciseId, completedSetsList]) => {
            const exercise = sets.find(s => s.id === exerciseId);
            // Check if we have exercise data in exerciseMap directly (for custom workouts)
            const exerciseData = exercise || exerciseMap[exerciseId];
            
            if (exerciseData && completedSetsList.length > 0) {
              completedExercises.push({
                exercise_name: exerciseData.name || `Exercise ${exerciseId}`,
                sets: completedSetsList,
                exercise_id: exerciseId
              });
            }
          });

          if (completedExercises.length > 0) {
            // Calculate workout metrics
            const completedAt = new Date().toISOString();
            const durationMinutes = Math.round((Date.now() - sessionStartTime.current) / 60000);
            const totalSets = Object.values(completedSets).reduce((sum, sets) => sum + sets.length, 0);
            const uniqueExercises = new Set(Object.keys(completedSets));
            const totalExercises = uniqueExercises.size;

            // Convert completedSets to exercises_data format for saving
            const exercisesData = Object.keys(completedSets).map(exerciseId => {
              const exerciseName = exerciseMap[exerciseId]?.name || 'Exercise';
              const sets = completedSets[exerciseId];
              
              return {
                exercise_id: exerciseId,
                exercise_name: exerciseName,
                sets: sets.map(set => ({
                  reps: set.reps,
                  weight: set.weight,
                  weight_unit: set.weight_unit,
                  original_weight: set.original_weight,
                  rpe: set.rpe,
                  completed_at: set.completed_at,
                  set_number: set.set_number
                }))
              };
            });

            console.log('[Session] Saving custom workout history with duration:', durationMinutes, 'minutes');
            
            const customHistorySaved = await WorkoutHistoryService.saveCustomWorkoutHistory({
              user_id: user.id,
              plan_name: 'Custom Workout',
              session_name: workoutName || 'Custom Session',
              completed_at: completedAt,
              duration_minutes: durationMinutes,
              total_sets: totalSets,
              total_exercises: totalExercises,
              estimated_calories: realTimeCalories,
              notes: `Custom workout: ${totalExercises} exercises with ${totalSets} total sets`,
              exercises_data: exercisesData
            });
            
            if (customHistorySaved) {
              console.log('[Session] ✅ Custom workout history saved successfully');
              } else {
              console.error('[Session] ❌ Failed to save custom workout history');
            }
          } else {
            console.warn('[Session] No completed exercises to save for custom workout');
          }
        } else {
          console.warn('[Session] No user ID available for saving custom workout history');
        }
      } else {
        // Handle regular workout completion (existing logic)
        console.log('[Session] Saving regular workout to history');
        
        try {
          // Fetch session and plan data for regular workout completion
          const { data: sessionData, error: sessionError } = await supabase
            .from('workout_sessions')
            .select('plan_id')
            .eq('id', sessionId)
            .single();
          
          if (!sessionError && sessionData?.plan_id) {
            console.log('[Session] Found session data, saving as planned workout');
            const { data: planData } = await supabase
              .from('workout_plans')
              .select('user_id')
              .eq('id', sessionData.plan_id)
              .single();
            
            if (planData?.user_id && user?.id) {
              // Calculate workout metrics
              const completedAt = new Date().toISOString();
              const durationMinutes = Math.round((Date.now() - sessionStartTime.current) / 60000);
              const totalSets = Object.values(completedSets).reduce((sum, sets) => sum + sets.length, 0);
              const uniqueExercises = new Set(Object.keys(completedSets));
              const totalExercises = uniqueExercises.size;

              // Use the real-time calories shown in the progress bar
              const actualCompletedCalories = realTimeCalories;

              // Convert completedSets to exercises_data format for saving
              const exercisesData = Object.keys(completedSets).map(exerciseId => {
                const exerciseName = exerciseMap[exerciseId]?.name || 'Exercise';
                const sets = completedSets[exerciseId];
                
                return {
                  exercise_id: exerciseId,
                  exercise_name: exerciseName,
                  sets: sets.map(set => ({
                    reps: set.reps,
                    weight: set.weight,
                    weight_unit: set.weight_unit,
                    original_weight: set.original_weight,
                    rpe: set.rpe,
                    completed_at: set.completed_at,
                    set_number: set.set_number
                  }))
                };
              });

              console.log(`[Session] DEBUG: Saving to history with ${actualCompletedCalories} calories (from progress bar)`);
              console.log('[Session] DEBUG: Workout history data being saved:', {
                user_id: planData.user_id,
                plan_id: sessionData.plan_id,
                session_id: sessionId,
                completed_at: completedAt,
                duration_minutes: durationMinutes,
                total_sets: totalSets,
                total_exercises: totalExercises,
                estimated_calories: actualCompletedCalories,
                exercises_data: exercisesData
              });
              
              const historySaved = await WorkoutHistoryService.saveWorkoutHistory({
                user_id: planData.user_id,
                plan_id: sessionData.plan_id,
                session_id: sessionId,
                completed_at: completedAt,
                duration_minutes: durationMinutes,
                total_sets: totalSets,
                total_exercises: totalExercises,
                estimated_calories: actualCompletedCalories,
                notes: `${workoutName || splitName || 'Standalone'} workout: ${totalExercises} exercises with ${totalSets} total sets`,
                exercises_data: exercisesData
              });
              
              if (historySaved) {
                console.log('[Session] ✅ Database workout history saved successfully');
              } else {
                console.error('[Session] ❌ Failed to save database workout history');
              }
            } else {
              console.warn('[Session] Missing required data for regular workout history:', {
                hasPlanData: !!planData,
                hasUserId: !!user?.id
              });
            }
          } else {
            // Fallback: Save as standalone workout (no plan_id/session_id)
            console.log('[Session] No session data found, saving as standalone workout');
            
            if (user?.id) {
              // Calculate workout metrics
              const completedAt = new Date().toISOString();
              const durationMinutes = Math.round((Date.now() - sessionStartTime.current) / 60000);
              const totalSets = Object.values(completedSets).reduce((sum, sets) => sum + sets.length, 0);
              const uniqueExercises = new Set(Object.keys(completedSets));
              const totalExercises = uniqueExercises.size;

              // Use the real-time calories shown in the progress bar
              const actualCompletedCalories = realTimeCalories;

              // Create exercises data for backup
              const exercisesData = Object.entries(completedSets).map(([exerciseId, completedSetsList]) => {
                // Get exercise name from exerciseMap first, then try to find the set data
                let exerciseName = `Exercise ${exerciseId}`;
                
                // Check if we have the exercise name in exerciseMap (direct mapping)
                if (exerciseMap[exerciseId]) {
                  exerciseName = exerciseMap[exerciseId].name;
                } else {
                  // Try to find the exercise by looking through sets
                  const matchingSet = sets.find(s => s.id === exerciseId || s.exercise_id === exerciseId);
                  if (matchingSet && exerciseMap[matchingSet.exercise_id]) {
                    exerciseName = exerciseMap[matchingSet.exercise_id].name;
                  }
                }
                
                return {
                  id: exerciseId,
                  name: exerciseName,
                  sets: completedSetsList.map(set => ({
                    reps: set.reps || 0,
                    weight: set.weight || 0,
                    rpe: set.rpe || null,
                    completed_at: set.completed_at || new Date().toISOString()
                  }))
                };
              });

              console.log(`[Session] DEBUG: Saving standalone workout with ${actualCompletedCalories} calories`);
              console.log('[Session] DEBUG: Standalone workout history data:', {
                user_id: user.id,
                plan_id: null,
                session_id: null,
                completed_at: completedAt,
                duration_minutes: durationMinutes,
                total_sets: totalSets,
                total_exercises: totalExercises,
                estimated_calories: actualCompletedCalories,
                plan_name: splitName || 'Custom Workout',
                session_name: workoutName || splitName || 'Standalone Session',
                exercises_data: exercisesData
              });
              
              const historySaved = await WorkoutHistoryService.saveWorkoutHistory({
                user_id: user.id,
                plan_id: null, // No plan for standalone workouts
                session_id: null, // No session for standalone workouts
                completed_at: completedAt,
                duration_minutes: durationMinutes,
                total_sets: totalSets,
                total_exercises: totalExercises,
                estimated_calories: actualCompletedCalories,
                notes: `${workoutName || splitName || 'Standalone'} workout: ${totalExercises} exercises with ${totalSets} total sets`,
                plan_name: splitName || 'Custom Workout',
                session_name: workoutName || splitName || 'Standalone Session',
                week_number: 1,
                day_number: 1,
                exercises_data: exercisesData
              });
              
              if (historySaved) {
                console.log('[Session] ✅ Standalone workout history saved successfully');
              } else {
                console.error('[Session] ❌ Failed to save standalone workout history');
              }
            } else {
              console.warn('[Session] No user ID available for saving standalone workout history');
            }
          }
        } catch (historyError) {
          console.error('[Session] Error saving database workout history:', historyError);
        }
      }
    } catch (err) {
      console.error('[Session] Exception during workout completion:', err);
    }
    
    // Show completion dialog
    showCompletionDialog();
  };

  // Helper function to show completion dialog
  const showCompletionDialog = () => {
    // Calculate real-time calories for the completion message
    const realTimeCalories = calculateRealTimeCalories();
    const finalCalories = realTimeCalories;
    Alert.alert(
      "Training Complete!", 
      `Congratulations! You have completed your workout today!\n\nEstimated calories burned: ${finalCalories}`,
      [
        { 
          text: "View History", 
          onPress: () => {
            // Navigate to history and replace current screen to prevent back navigation to session
            router.replace({ pathname: '/(main)/workout/history', params: { refresh: 'true' } });
          },
          style: 'default'
        },
        { 
          text: "Back to Workouts", 
          onPress: () => {
            // Navigate back to workout plans instead of the session screen
            router.replace('/(main)/workout/plans');
          },
          style: 'cancel' 
        }
      ]
    );
  };


  // Simple handler for rest timer (not used in new all-exercises view, but kept for compatibility)
  const handleRestFinish = () => {
    setResting(false);
  };

  const renderRestTimer = () => {
    if (!currentSet) return null;
    
    const seconds = parseInt((currentSet.rest_period || '').replace(/[^0-9]/g, ''), 10) || 90;
    return (
      <View style={styles.restContainer}>
        <BlurView intensity={40} tint="dark" style={styles.restBlur}>
          <LinearGradient
            colors={['rgba(28, 28, 30, 0.9)', 'rgba(18, 18, 18, 0.95)']}
            style={styles.restGradient}
          >
            <View style={styles.restHeader}>
              <View style={styles.restIconContainer}>
                <LinearGradient
                  colors={['rgba(255, 107, 53, 0.4)', 'rgba(229, 90, 43, 0.5)']}
                  style={styles.restIconGradient}
                >
                  <Icon name="timer-outline" size={40} color={colors.primary} />
                </LinearGradient>
              </View>
              <Text style={styles.restTitle}>Rest Time</Text>
              <Text style={styles.restSubtitle}>Prepare for the next set</Text>
              
            </View>
            
            <View style={styles.timerContainer}>
              <RestTimer
                key={`timer-${currentIndex}-${setNumber}`}
                duration={seconds}
                onFinish={handleRestFinish}
              />
            </View>
            
            <View style={styles.nextExerciseContainer}>
              <Text style={styles.nextExerciseLabel}>Next:</Text>
              <Text style={styles.nextExerciseText}>
                {currentIndex + 1 < sets.length ? 
                  (exerciseMap[sets[currentIndex + 1]?.exercise_id]?.name || 'Next Exercise') : 
                  'Workout Complete!'}
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={handleRestFinish}
              style={styles.skipButtonContainer}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.skipButton}
              >
                <Icon name="skip-next" size={20} color={colors.text} style={styles.skipButtonIcon} />
                <Text style={styles.skipButtonText}>Skip Rest</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </View>
    );
  };

  const getExerciseImage = (exerciseId: string, exerciseName: string) => {
    // 1. Check database image (if available)
    const exerciseData = exerciseMap[exerciseId];
    if (exerciseData?.image) return exerciseData.image;

    // 2. Fallback if error occurred
    const defaultImage = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop';
    if (imageLoadError) return defaultImage;

    if (!exerciseName) return defaultImage;
    
    const name = exerciseName.toLowerCase();
    const muscles = (exerciseData?.muscleGroups || []).map(m => m.toLowerCase());
    
    // Specific Compound Movements - Using VERY SPECIFIC high quality images
    if (name.includes('bench press')) {
      return 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=1000&auto=format&fit=crop'; // Alternative Bench Press
    }
    if (name.includes('incline')) {
      return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1000&auto=format&fit=crop'; // Incline/Dumbbell press
    }
    if (name.includes('squat') || name.includes('leg press')) {
      return 'https://images.unsplash.com/photo-1574680096141-1cddd32e04ca?q=80&w=1000&auto=format&fit=crop'; // Squat rack/legs
    }
    if (name.includes('deadlift')) {
      return 'https://images.unsplash.com/photo-1517963879466-cd116617a1e5?q=80&w=1000&auto=format&fit=crop'; // Deadlift setup
    }
    if (name.includes('overhead') || name.includes('military') || name.includes('shoulder press')) {
      return 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop'; // Overhead press
    }
    if (name.includes('pull up') || name.includes('chin up')) {
      return 'https://images.unsplash.com/photo-1598971639058-211a74a96aea?q=80&w=1000&auto=format&fit=crop'; // Pull up bar
    }
    if (name.includes('row')) {
      return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1000&auto=format&fit=crop'; // Barbell row/back
    }

    // Isolation / Specific Muscle Groups
    if (name.includes('bicep') || name.includes('curl') || muscles.includes('biceps')) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop'; // Bicep curl
    }
    if (name.includes('tricep') || name.includes('extension') || name.includes('pushdown') || muscles.includes('triceps')) {
      return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop'; // Gym/Cable machine context
    }
    if (name.includes('lateral raise') || name.includes('fly')) {
      return 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop'; // Dumbbells
    }
    
    // Muscle Groups / Types (Fallback if specific movement not found)
    if (name.includes('chest') || name.includes('push up') || name.includes('pectoral') || muscles.includes('chest')) {
      return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1000&auto=format&fit=crop';
    } 
    if (name.includes('leg') || name.includes('calf') || name.includes('lunge') || name.includes('quad') || name.includes('hamstring') || muscles.includes('legs') || muscles.includes('quadriceps') || muscles.includes('hamstrings') || muscles.includes('calves')) {
      return 'https://images.unsplash.com/photo-1434596922112-19c563067271?q=80&w=1000&auto=format&fit=crop';
    } 
    if (name.includes('back') || name.includes('pull') || name.includes('lat') || muscles.includes('back') || muscles.includes('lats')) {
      return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1000&auto=format&fit=crop';
    } 
    if (name.includes('shoulder') || name.includes('deltoid') || muscles.includes('shoulders')) {
      return 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop';
    } 
    if (name.includes('arm') || muscles.includes('arms')) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop';
    }
    if (name.includes('abs') || name.includes('core') || name.includes('crunch') || name.includes('plank') || muscles.includes('core') || muscles.includes('abs')) {
        return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1000&auto=format&fit=crop';
    }
    if (name.includes('cardio') || name.includes('run') || name.includes('treadmill') || name.includes('bike') || muscles.includes('cardio')) {
         return 'https://images.unsplash.com/photo-1538805060504-d14b84db1933?q=80&w=1000&auto=format&fit=crop';
    }
    
    // Default image (Gym atmosphere)
    return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop';
  };

  // Handle completing a set from the table view
  const handleCompleteSetFromTable = async (exerciseId: string, setNum: number) => {
    const exerciseSet = sets.find(s => s.exercise_id === exerciseId);
    if (!exerciseSet) return;
    
    const inputKey = `${exerciseId}_${setNum}`;
    const setInput = setInputs[inputKey] || { reps: '', weight: '', rpe: '' };
    const repsNum = parseInt(setInput.reps, 10);
    const exerciseName = exerciseMap[exerciseId]?.name || '';
    const isCardio = isCardioExercise(exerciseName);
    let weightNum = isCardio ? 0 : (setInput.weight ? parseFloat(setInput.weight) : null);
    
    if (isNaN(repsNum) || repsNum <= 0) {
      Alert.alert("Invalid Input", isCardio ? "Please enter a valid number of minutes" : "Please enter a valid number of reps");
      return;
    }
    
    // Convert weight to kg if entered in lbs
    if (!isCardio && weightNum !== null && weightUnit === 'lbs') {
      weightNum = convertLbsToKg(weightNum);
    }
    
    // Set session weight unit on first weight entry
    if (!isCardio && weightNum !== null && sessionWeightUnit === null) {
      setSessionWeightUnit(weightUnit);
    }
    
    // Track the completed set - use a precise timestamp
    const setCompletedAt = new Date().toISOString();
    const completedSet = {
      reps: repsNum,
      weight: weightNum,
      weight_unit: weightUnit,
      original_weight: setInput.weight ? parseFloat(setInput.weight) : null,
      rpe: setInput.rpe ? parseFloat(setInput.rpe) : null,
      completed_at: setCompletedAt,
      set_number: setNum
    };
    const updatedCompletedSets = {
      ...completedSets,
      [exerciseId]: [...(completedSets[exerciseId] || []), completedSet]
    };
    setCompletedSets(updatedCompletedSets);

    // Update recent exercises so the picker can show a \"Recently Logged\" section
    if (user?.id) {
      RecentExercisesService.addRecentExercise(user.id, {
        id: exerciseId,
        name: exerciseName || 'Exercise',
        muscle_groups: exerciseMap[exerciseId]?.muscleGroups,
      }).catch(err => {
        console.warn('[Session] Error adding recent exercise:', err);
      });
    }
    
    // Clear input for this set
    setSetInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[inputKey];
      return newInputs;
    });
    
    // Log to database if this is a real set - use the same timestamp
    if (!String(exerciseSet.id).toString().startsWith('fallback-') && !String(exerciseSet.id).toString().startsWith('ex-')) {
      try {
        const log = {
          set_id: exerciseSet.id,
          actual_reps: repsNum,
          actual_weight: weightNum || 0,
          actual_rpe: setInput.rpe ? parseFloat(setInput.rpe) : null,
          completed_at: setCompletedAt, // Use the same timestamp
        };
        
        const { error } = await supabase
          .from('exercise_logs')
          .insert(log);
        
        if (error) {
          console.error('[Session] Error logging exercise set:', error);
        }
      } catch (err) {
        console.error('[Session] Exception while logging exercise set:', err);
      }
    }
    
    // Update progress - progress is calculated in useEffect
  };
  
  // Add a new set to an exercise
  const handleAddSet = (exerciseId: string) => {
    const completedSetsForExercise = completedSets[exerciseId] || [];
    // Determine how many sets are currently visible/loggable based on completed sets and inputs,
    // not on the planned target sets. This lets the user freely add sets as they go.
    const inputSetNumbers = Object.keys(setInputs)
      .filter(k => k.startsWith(`${exerciseId}_`))
      .map(k => {
        const parts = k.split('_');
        return parseInt(parts[parts.length - 1], 10);
      })
      .filter(n => !isNaN(n));
    const highestInputSet = inputSetNumbers.length > 0 ? Math.max(...inputSetNumbers) : 0;
    const currentTotalSets = Math.max(completedSetsForExercise.length, highestInputSet);
    const newSetNumber = currentTotalSets + 1;
    // Initialize empty input for the new set
    const inputKey = `${exerciseId}_${newSetNumber}`;
    setSetInputs(prev => ({
      ...prev,
      [inputKey]: { reps: '', weight: '', rpe: '' }
    }));
  };

  // Remove an in-progress set row from the table view (does not affect completed logs)
  // If deleting the first set and exercise has no logged sets, delete the entire exercise
  const handleRemoveSetFromTable = (exerciseId: string, setNum: number) => {
    const completedSetsForExercise = completedSets[exerciseId] || [];
    const isFirstSet = setNum === 1;
    
    // Check if there are any other in-progress inputs for this exercise (besides the current one)
    const otherInputKeys = Object.keys(setInputs).filter(key => {
      if (key.startsWith(`${exerciseId}_`)) {
        const inputSetNum = parseInt(key.split('_').pop() || '0', 10);
        if (inputSetNum !== setNum) {
          const input = setInputs[key];
          // Check if there's any actual data entered
          return (input.weight && input.weight.trim() !== '') || 
                 (input.reps && input.reps.trim() !== '');
        }
      }
      return false;
    });
    
    const hasNoLoggedSets = completedSetsForExercise.length === 0;
    const hasNoOtherInputs = otherInputKeys.length === 0;
    
    // If deleting the first set and exercise has no logged sets or other inputs, delete the entire exercise
    if (isFirstSet && hasNoLoggedSets && hasNoOtherInputs) {
      // Remove the exercise from sets
      setSets(prev => prev.filter(set => set.exercise_id !== exerciseId));
      
      // Clean up all inputs for this exercise
      setSetInputs(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.startsWith(`${exerciseId}_`)) {
            delete next[key];
          }
        });
        return next;
      });
      
      // Clean up completed sets
      setCompletedSets(prev => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });
      
      return;
    }
    
    // Otherwise, just remove the specific set input
    const inputKey = `${exerciseId}_${setNum}`;
    setSetInputs(prev => {
      const next = { ...prev };
      delete next[inputKey];
      return next;
    });
  };


  // Render a single exercise card with its table
  const renderExerciseCard = (exerciseSet: ExerciseSet, index: number) => {
    const exerciseId = exerciseSet.exercise_id;
    const exerciseName = exerciseMap[exerciseId]?.name || 'Exercise';
    const exerciseImage = getExerciseImage(exerciseId, exerciseName);
    const isCardio = isCardioExercise(exerciseName);
    const previousData = previousExerciseData.get(exerciseId);
    const completedSetsForExercise = completedSets[exerciseId] || [];
    // Display unit for this exercise: lock to the first unit used in the session
    const displayWeightUnit = sessionWeightUnit || weightUnit;
    
    // Debug logging
    if (!previousData) {
      console.log(`[Session] No previous data found for exerciseId: ${exerciseId}, exerciseName: ${exerciseName}`);
      console.log(`[Session] Available previousExerciseData keys:`, Array.from(previousExerciseData.keys()));
    } else {
      console.log(`[Session] Found previous data for ${exerciseName}:`, {
        exerciseId,
        setsCount: previousData.sets?.length || 0,
        sets: previousData.sets
      });
    }
    
    // Get previous sets sorted chronologically (oldest first) to match by set number
    const previousSets = previousData?.sets ? [...previousData.sets].sort((a, b) => 
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    ) : [];
    // Total sets shown in the table are based on completed sets and any in-progress inputs.
    const inputSetNumbers = Object.keys(setInputs)
      .filter(k => k.startsWith(`${exerciseId}_`))
      .map(k => {
        const parts = k.split('_');
        return parseInt(parts[parts.length - 1], 10);
      })
      .filter(n => !isNaN(n));
    const highestInputSet = inputSetNumbers.length > 0 ? Math.max(...inputSetNumbers) : 0;
    const maxSetNumber = Math.max(completedSetsForExercise.length, highestInputSet, 1);
    const totalSets = maxSetNumber;
    
    // Get rest period in seconds for display
    const getRestSeconds = (restPeriod: string): number => {
      if (restPeriod.includes('min')) {
        const mins = parseInt(restPeriod.replace(/[^0-9]/g, ''), 10);
        return mins * 60;
      }
      const secs = parseInt(restPeriod.replace(/[^0-9]/g, ''), 10);
      return secs || 90;
    };
    
    const restSeconds = getRestSeconds(exerciseSet.rest_period);
    const formatRestTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:00`;
    };

    const handleShowLastPerformanceForExercise = async () => {
      if (!user?.id) return;
      const data = await fetchLastExercisePerformance(exerciseName, user.id);
      setLastPerformanceData(data);
      setShowLastPerformance(true);
    };
    
    return (
      <View key={exerciseId} style={styles.exerciseCardContainer}>
        {/* Exercise Header */}
        <View style={styles.exerciseCard}>
          <LinearGradient
            colors={['rgba(28, 28, 30, 0.9)', 'rgba(18, 18, 18, 0.95)']}
            style={styles.exerciseHeaderContainer}
          >
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseInfo}>
                <View style={styles.exerciseOrderContainer}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.exerciseOrderGradient}
                  >
                    <Text style={styles.exerciseOrder}>{exerciseSet.order_in_session + 1}</Text>
                  </LinearGradient>
                </View>
                <View>
                  <Text style={styles.exerciseName}>{exerciseName}</Text>
                  <Text style={styles.setProgress}>
                    {completedSetsForExercise.length} of {totalSets} sets completed
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={handleShowLastPerformanceForExercise}
              >
                <Icon name="history" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
          
          {/* Table View for Sets */}
          <View style={styles.tableSection}>
                  <LinearGradient
              colors={['rgba(28, 28, 30, 0.9)', 'rgba(18, 18, 18, 0.95)']}
              style={styles.tableGradient}
            >
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 0.12 }]}>Set</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.2 }]}>Last Time</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.2 }]}>
                  {displayWeightUnit.toUpperCase()}
                </Text>
                <Text style={[styles.tableHeaderText, { flex: 0.18 }]}>Reps</Text>
                <View style={{ flex: 0.3 }} />
                    </View>
                    
              {/* Table Rows */}
              {Array.from({ length: totalSets }, (_, setIndex) => {
                const setNum = setIndex + 1;
                const completedSet = completedSetsForExercise.find(s => s.set_number === setNum);
                const isCompleted = !!completedSet;
                const inputKey = `${exerciseId}_${setNum}`;
                const setInput = setInputs[inputKey] || { reps: '', weight: '', rpe: '' };

                return (
                  <View key={setNum}>
                    <View style={styles.tableRow}>
                      {/* Set Number */}
                      <View style={[styles.tableCell, { flex: 0.12 }]}>
                        <View style={[styles.setNumberBadge, isCompleted && styles.setNumberBadgeCompleted]}>
                          <Text style={[styles.setNumberText, isCompleted && styles.setNumberTextCompleted]}>
                            {setNum}
                          </Text>
                        </View>
                          </View>

                      {/* Last Time Column */}
                      <View style={[styles.tableCell, { flex: 0.2 }]}>
                        {(() => {
                          // Get the corresponding set from last time (by position: 1st set = index 0, 2nd set = index 1, etc.)
                          const lastTimeSet = previousSets[setNum - 1];
                          if (lastTimeSet) {
                            const lastWeight = lastTimeSet.weight;
                            const lastReps = lastTimeSet.reps;
                            // Convert weight to display unit if needed
                            let displayWeight = lastWeight;
                            if (lastWeight !== null && lastTimeSet.weightUnit !== displayWeightUnit) {
                              if (lastTimeSet.weightUnit === 'kg' && displayWeightUnit === 'lbs') {
                                displayWeight = convertKgToLbs(lastWeight);
                              } else if (lastTimeSet.weightUnit === 'lbs' && displayWeightUnit === 'kg') {
                                displayWeight = convertLbsToKg(lastWeight);
                              }
                            }
                            return (
                              <View style={styles.lastTimeValueContainer}>
                                <Text style={styles.lastTimeValue}>
                                  {lastWeight !== null 
                                    ? formatWeight(displayWeight, displayWeightUnit)
                                    : 'BW'}
                                </Text>
                                <Text style={styles.lastTimeValueSeparator}>×</Text>
                                <Text style={styles.lastTimeValue}>{lastReps}</Text>
                              </View>
                            );
                          } else {
                            return (
                              <Text style={styles.lastTimeValueNA}>—</Text>
                            );
                          }
                        })()}
                      </View>

                      {/* Weight Input */}
                      <View style={[styles.tableCell, { flex: 0.2, overflow: 'hidden', paddingHorizontal: 4 }]}>
                        {isCompleted ? (
                          <Text style={styles.completedValue}>
                            {completedSet.weight !== null && completedSet.weight !== undefined
                              ? `${formatWeight(completedSet.original_weight || completedSet.weight, weightUnit)}`
                              : 'BW'}
                          </Text>
                        ) : (
                        <TextInput
                            style={styles.tableInput}
                            value={setInput.weight}
                            onChangeText={(text) => {
                              setSetInputs(prev => ({
                                ...prev,
                                [inputKey]: { ...prev[inputKey] || { reps: '', weight: '', rpe: '' }, weight: text }
                              }));
                          }}
                          keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor={colors.textSecondary}
                            editable={!isCompleted}
                          />
                        )}
                      </View>

                      {/* Reps Input */}
                      <View style={[styles.tableCell, { flex: 0.18, overflow: 'hidden', paddingHorizontal: 4 }]}>
                        {isCompleted ? (
                          <Text style={styles.completedValue}>{completedSet.reps}</Text>
                        ) : (
                        <TextInput
                            style={styles.tableInput}
                            value={setInput.reps}
                            onChangeText={(text) => {
                              setSetInputs(prev => ({
                                ...prev,
                                [inputKey]: { ...prev[inputKey] || { reps: '', weight: '', rpe: '' }, reps: text }
                              }));
                            }}
                            keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor={colors.textSecondary}
                            editable={!isCompleted}
                          />
                        )}
                      </View>

                      {/* Complete / Remove Buttons */}
                      <View style={[styles.tableCell, { flex: 0.3, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingLeft: 8 }]}>
                        {isCompleted ? (
                          <View style={styles.completedCheckmark}>
                            <Icon name="check-circle" size={24} color={colors.success} />
                          </View>
                        ) : (
                          <>
                                  <TouchableOpacity
                              style={styles.completeButton}
                              onPress={() => handleCompleteSetFromTable(exerciseId, setNum)}
                            >
                              <Icon name="check" size={20} color={colors.text} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                              style={styles.removeSetButton}
                              onPress={() => handleRemoveSetFromTable(exerciseId, setNum)}
                            >
                              <Icon name="trash-can-outline" size={18} color={colors.textSecondary} />
                                  </TouchableOpacity>
                          </>
                        )}
                                </View>
                              </View>

                    {/* Rest Time Below Each Set */}
                    {!isCompleted && (
                      <View style={styles.restTimeRow}>
                        <Text style={styles.restTimeText}>{formatRestTime(restSeconds)}</Text>
                            </View>
                          )}
                  </View>
                );
              })}

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => handleAddSet(exerciseId)}
              >
                <Icon name="plus" size={18} color={colors.textSecondary} />
                <Text style={styles.addSetButtonText}>
                  Add Set ({formatRestTime(restSeconds)})
                </Text>
              </TouchableOpacity>

              {/* Weight Unit Selector */}
              {!isCardio && (
                <View style={styles.unitSelectorRow}>
                  <Text style={styles.unitLabel}>Weight Unit:</Text>
                            <View style={styles.unitSelector}>
                              <TouchableOpacity
                      style={[styles.unitButton, displayWeightUnit === 'kg' && styles.unitButtonActive]}
                                onPress={() => {
                        // Allow changing unit only before any set with weight is logged
                        if (!sessionWeightUnit) {
                                  setWeightUnit('kg');
                        }
                      }}
                    >
                      <Text style={[styles.unitButtonText, displayWeightUnit === 'kg' && styles.unitButtonTextActive]}>
                        kg
                      </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                      style={[styles.unitButton, displayWeightUnit === 'lbs' && styles.unitButtonActive]}
                                onPress={() => {
                        // Allow changing unit only before any set with weight is logged
                        if (!sessionWeightUnit) {
                                  setWeightUnit('lbs');
                        }
                      }}
                    >
                      <Text style={[styles.unitButtonText, displayWeightUnit === 'lbs' && styles.unitButtonTextActive]}>
                        lbs
                      </Text>
                              </TouchableOpacity>
                            </View>
                            </View>
                          )}

            </LinearGradient>
          </View>
          
          {/* Add Exercise Button */}
          <TouchableOpacity
            style={styles.addExerciseButtonSmall}
            onPress={() => {
              console.log('[Session] User chose to add another exercise');
              setShowExercisePicker(true);
            }}
          >
            <Icon name="plus" size={18} color={colors.textSecondary} />
            <Text style={styles.addExerciseButtonSmallText}>Add Exercise</Text>
          </TouchableOpacity>
      </View>
    );
  };

  // Render all exercises in a scrollable list
  const renderAllExercises = () => {
    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sets.map((exerciseSet, index) => renderExerciseCard(exerciseSet, index))}
        
      </ScrollView>
    );
  };

  const renderExerciseContent = () => {
    // Legacy function kept for backward compatibility, but now redirects to all exercises view
    return renderAllExercises();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <Animated.View style={{
          opacity: headerOpacity,
          transform: [
            { translateY: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }
          ]
        }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'rgba(28, 28, 30, 0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.header, { paddingTop: insets.top + 8 }]}
          >
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackButtonPress}
            >
              <Icon name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>{splitName || workoutName || sessionTitle || 'Workout'}</Text>
            
            <TouchableOpacity 
              style={styles.finishCheckbox}
              onPress={() => {
                console.log('[Session] ✅ User chose to finish workout');
                setWorkoutFinished(true);
                handleFinishWorkout();
              }}
            >
              <Icon name="check" size={20} color={colors.text} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
        
        {/* Progress Bar */}
        <LinearGradient
          colors={['rgba(28, 28, 30, 0.9)', 'rgba(18, 18, 18, 0.8)']}
          style={styles.progressContainer}
        >
          <View style={styles.progressTextContainer}>
            <View style={styles.progressLeftSection}>
              <Text style={styles.progressText}>
                {Math.round(sessionProgress * 100)}% Complete
              </Text>
              <Text style={styles.progressDetails}>
                {(() => {
                  // Count exercises with at least one completed set
                  const exercisesWithSets = sets.filter(set => {
                    const completedSetsForExercise = completedSets[set.exercise_id] || [];
                    return completedSetsForExercise.length > 0;
                  }).length;
                  return `${exercisesWithSets}/${sets.length} Exercises`;
                })()}
              </Text>
            </View>
            <View style={styles.progressRightSection}>
              <Icon name="fire" size={20} color={colors.primary} style={styles.fireIcon} />
              <Text style={styles.caloriesText}>
                {realTimeCalories} cal
              </Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </View>
        </LinearGradient>
        
        {/* Main Content */}
        {loading ? (
          <View style={styles.centered}>
            <View style={styles.loadingContainer}>
              <LinearGradient
                colors={['rgba(28, 28, 30, 0.8)', 'rgba(18, 18, 18, 0.9)']}
                style={styles.loadingGradient}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading your workout...</Text>
                <View style={styles.loadingBar}>
                  <View style={styles.loadingBarFill} />
                </View>
                <Text style={styles.loadingTip}>
                  Pro tip: Stay hydrated during your workout
                </Text>
              </LinearGradient>
            </View>
          </View>
        ) : sets.length === 0 ? (
          <ScrollView 
            contentContainerStyle={styles.emptyStateContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* AI Coach Header */}
            <View style={styles.coachHeader}>
              <View style={styles.coachAvatarContainer}>
                <Image
                  source={require('../../../../assets/mascot.png')}
                  style={styles.coachAvatar}
                />
                <View style={styles.coachOnlineIndicator} />
              </View>
              <View style={styles.coachTextContainer}>
                <Text style={styles.coachGreeting}>
                  {isQuickWorkout ? 'Ready to Start!' : 'No Exercises'}
                </Text>
                <Text style={styles.coachMessage}>
                  {isQuickWorkout 
                    ? 'Add exercises as you go. Choose what feels right for today!'
                    : 'This workout session doesn\'t have any exercises configured.'
                  }
                </Text>
              </View>
            </View>

            {/* Empty State Card */}
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconContainer}>
                <Icon name="dumbbell" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {isQuickWorkout ? 'Ready to Start!' : 'No Exercises Found'}
              </Text>
              <Text style={styles.emptyDescription}>
                {isQuickWorkout 
                  ? 'Add exercises as you go. Choose what feels right for today!'
                  : 'This workout session doesn\'t have any exercises configured.'
                }
              </Text>
              
              {isQuickWorkout ? (
                <TouchableOpacity
                  style={styles.emptyAddExerciseButton}
                  onPress={() => setShowExercisePicker(true)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.emptyAddExerciseButtonGradient}
                  >
                    <Icon name="plus" size={20} color={colors.text} />
                    <Text style={styles.emptyAddExerciseButtonText}>Add First Exercise</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.backButtonEmpty}
                  onPress={() => router.back()}
                  activeOpacity={0.9}
                >
                  <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        ) : (
          renderExerciseContent()
        )}
        
        {/* Last Performance Modal */}
        {showLastPerformance && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowLastPerformance(false)}
            />
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['rgba(28, 28, 30, 0.98)', 'rgba(18, 18, 18, 0.98)']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Icon name="history" size={24} color={colors.primary} />
                    <Text style={styles.modalTitle}>Last Performance</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowLastPerformance(false)}>
                    <Icon name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                {!lastPerformanceData ? (
                  <View style={styles.modalLoading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.modalLoadingText}>Loading history...</Text>
                  </View>
                ) : lastPerformanceData.sets && lastPerformanceData.sets.length > 0 ? (
                  <ScrollView 
                    style={styles.modalScrollView} 
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.performanceContainer}>
                      <Text style={styles.exerciseNameModal}>{lastPerformanceData.exerciseName}</Text>
                      <Text style={styles.lastPerformedDate}>
                        Last performed: {new Date(lastPerformanceData.lastPerformed).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </Text>
                      
                      <View style={styles.topSetCard}>
                        <LinearGradient
                          colors={[colors.primary + '20', colors.primaryDark + '20']}
                          style={styles.topSetGradient}
                        >
                          <Text style={styles.topSetLabel}>🏆 Personal Best</Text>
                          <Text style={styles.topSetValue}>
                            {lastPerformanceData.topSet.weight > 0 
                              ? `${formatWeight(lastPerformanceData.topSet.weight, weightUnit)} ${weightUnit}` 
                              : 'Bodyweight'} × {lastPerformanceData.topSet.reps} reps
                          </Text>
                        </LinearGradient>
                      </View>
                      
                      <Text style={styles.setsHistoryLabel}>Recent Sets ({lastPerformanceData.sets.length})</Text>
                      {lastPerformanceData.sets.map((set: any, index: number) => (
                        <View key={index} style={styles.historySetRow}>
                          <View style={styles.setNumberBadge}>
                            <Text style={styles.setNumberText}>{index + 1}</Text>
                          </View>
                          <View style={styles.setDetails}>
                            <Text style={styles.setDetailText}>
                              {set.weight > 0 
                                ? `${formatWeight(set.weight, weightUnit)} ${weightUnit}` 
                                : 'Bodyweight'}
                            </Text>
                            <Text style={styles.setDetailSeparator}>×</Text>
                            <Text style={styles.setDetailText}>{set.reps} reps</Text>
                          </View>
                          <Text style={styles.setDate}>
                            {new Date(set.completed_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <View style={styles.modalEmpty}>
                    <Icon name="information-outline" size={48} color={colors.textSecondary} />
                    <Text style={styles.modalEmptyText}>No previous performance found</Text>
                    <Text style={styles.modalEmptySubtext}>This is your first time doing this exercise!</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          </View>
        )}
        
        {/* Exercise Picker Modal - Only render when visible for instant display */}
        {showExercisePicker && (
          <ExercisePicker
            visible={true}
            onClose={() => setShowExercisePicker(false)}
            onSelectExercise={handleAddExercise}
            excludeExerciseIds={sets.map(s => s.exercise_id)}
            userId={user?.id}
            preloadedExercises={preloadedExercises}
            preloadedRecentExercises={preloadedRecentExercises}
          />
        )}

        {/* Workout Name Dialog for Quick Workouts */}
        <Portal>
          <Dialog 
            visible={showNameDialog} 
            onDismiss={() => {
              setShowNameDialog(false);
              setPendingSubmit(false);
            }}
            style={{ backgroundColor: colors.surface, borderRadius: 16 }}
          >
            <Dialog.Title style={{ color: colors.text }}>Name Your Workout</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Workout Name"
                value={workoutName}
                onChangeText={setWorkoutName}
                mode="outlined"
                style={{ backgroundColor: colors.background }}
                activeOutlineColor={colors.primary}
                placeholder="e.g., Morning Push, Leg Day, Full Body"
                autoFocus
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button 
                onPress={() => {
                  setShowNameDialog(false);
                  setPendingSubmit(false);
                }}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
              <Button 
                onPress={async () => {
                  setShowNameDialog(false);
                  await saveWorkoutHistory();
                  setPendingSubmit(false);
                }}
                mode="contained"
                icon="check"
                buttonColor={colors.primary}
                textColor="#FFFFFF"
              >
                Save
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Workout Summary Modal */}
        {showSummary && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowSummary(false)}
            />
            <View style={[styles.modalContent, { height: height * 0.85, maxHeight: height - insets.top - 100 }]}>
              <View style={[styles.modalGradient, { flex: 1, backgroundColor: '#000000' }]}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <View style={styles.modalIconContainer}>
                      <Icon name="check-circle" size={24} color={colors.success} />
                    </View>
                    <Text style={styles.modalTitle}>Workout Summary</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowSummary(false)}
                    style={styles.modalCloseButton}
                    activeOpacity={0.8}
                  >
                    <Icon name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <ScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20, paddingTop: 20 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {Object.entries(completedSets).map(([exerciseId, setsList], exerciseIndex) => {
                      const exerciseName = exerciseMap[exerciseId]?.name || `Exercise ${exerciseIndex + 1}`;
                      
                      return (
                        <View key={exerciseId} style={styles.summaryExerciseContainer}>
                          <Text style={styles.summaryExerciseName}>
                            {exerciseName}
                          </Text>
                          
                          {setsList.map((set, setIndex) => (
                            <View key={setIndex} style={styles.summarySetCard}>
                              <View style={styles.summarySetHeader}>
                                <Text style={styles.summarySetNumber}>Set {set.set_number}</Text>
                                <TouchableOpacity 
                                  onPress={() => {
                                    setEditingSet({
                                      exerciseId,
                                      setIndex,
                                      reps: set.reps,
                                      weight: set.original_weight !== null && set.original_weight !== undefined ? set.original_weight : set.weight,
                                      rpe: null
                                    });
                                  }}
                                  style={styles.summaryEditButton}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.summaryEditText}>Edit</Text>
                                </TouchableOpacity>
                              </View>

                              {editingSet?.exerciseId === exerciseId && editingSet?.setIndex === setIndex ? (
                                <View style={styles.summaryEditContainer}>
                                  <View style={styles.summaryEditRow}>
                                    <View style={styles.summaryEditField}>
                                      <Text style={styles.summaryEditLabel}>Reps</Text>
                                      <TextInput
                                        mode="outlined"
                                        value={editingSet.reps.toString()}
                                        onChangeText={(text) => setEditingSet({...editingSet, reps: parseInt(text) || 0})}
                                        keyboardType="numeric"
                                        style={styles.summaryEditInput}
                                        theme={{ colors: { text: colors.text, primary: colors.primary, outline: 'rgba(255, 255, 255, 0.1)' } }}
                                      />
                                    </View>
                                    <View style={styles.summaryEditField}>
                                      <Text style={styles.summaryEditLabel}>Weight ({set.weight_unit})</Text>
                                      <TextInput
                                        mode="outlined"
                                        value={(editingSet.weight || 0).toString()}
                                        onChangeText={(text) => setEditingSet({...editingSet, weight: parseFloat(text) || 0})}
                                        keyboardType="numeric"
                                        style={styles.summaryEditInput}
                                        theme={{ colors: { text: colors.text, primary: colors.primary, outline: 'rgba(255, 255, 255, 0.1)' } }}
                                      />
                                    </View>
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => {
                                      // Update local state
                                      const newCompletedSets = { ...completedSets };
                                      const updatedSets = [...newCompletedSets[exerciseId]];
                                      const currentSet = updatedSets[setIndex];
                                      const weightUnit = currentSet.weight_unit;
                                      
                                      // Convert to kg for database storage if needed
                                      let weightInKg = editingSet.weight;
                                      if (weightUnit === 'lbs' && editingSet.weight !== null) {
                                        weightInKg = convertLbsToKg(editingSet.weight);
                                      }
                                      
                                      updatedSets[setIndex] = {
                                        ...currentSet,
                                        reps: editingSet.reps,
                                        weight: weightInKg, // Store in kg for database
                                        original_weight: editingSet.weight, // Keep original user input
                                        rpe: null // RPE removed
                                      };
                                      newCompletedSets[exerciseId] = updatedSets;
                                      setCompletedSets(newCompletedSets);
                                      setEditingSet(null);
                                    }}
                                    style={styles.summarySaveChangesButton}
                                    activeOpacity={0.8}
                                  >
                                    <LinearGradient
                                      colors={[colors.primary, colors.primaryDark]}
                                      style={styles.summarySaveChangesGradient}
                                    >
                                      <Text style={styles.summarySaveChangesText}>Save Changes</Text>
                                    </LinearGradient>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <View style={styles.summarySetDetails}>
                                  <Text style={styles.summarySetReps}>{set.reps} reps</Text>
                                  <Text style={styles.summarySetWeight}>
                                    {set.weight !== null 
                                      ? `${set.original_weight !== null && set.original_weight !== undefined ? set.original_weight : set.weight} ${set.weight_unit}` 
                                      : 'Bodyweight'}
                                  </Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={[styles.summaryFooter, { paddingBottom: Math.max(insets.bottom, 20) + 60 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowSummary(false);
                      submitWorkout();
                    }}
                    style={styles.summarySaveButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.summarySaveButtonGradient}
                    >
                      <Text style={styles.summarySaveButtonText}>Save Workout</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuButton: {
    width: 40, // Maintain layout balance
  },
  finishCheckbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  progressDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140, // Increased padding to account for bottom navigation bar (60px + safe area) + extra space for comfort
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingText: {
    marginTop: 16,
    marginBottom: 24,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  loadingTip: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  exerciseCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseImageBackground: {
    height: 200,
    backgroundColor: colors.surface, // Fallback color
  },
  exerciseImage: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  exerciseImageOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  exerciseHeaderContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseOrderContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseOrder: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  setProgress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  deleteExerciseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
  },
  targetItem: {
    flex: 1,
    alignItems: 'center',
  },
  targetDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  targetLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  targetValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  previousWorkoutSection: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previousWorkoutGradient: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  previousWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previousWorkoutIcon: {
    marginRight: 8,
  },
  previousWorkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  previousWorkoutDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  previousSetsList: {
    marginBottom: 12,
  },
  previousSetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 6,
  },
  previousSetNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flex: 0.3,
  },
  previousSetReps: {
    fontSize: 13,
    color: colors.text,
    flex: 0.35,
  },
  previousSetWeight: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 0.35,
    textAlign: 'right',
  },
  previousWorkoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  previousStatItem: {
    alignItems: 'center',
  },
  previousStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previousStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  recordSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  recordGradient: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recordTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  recordIcon: {
    marginRight: 12,
  },
  recordTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  inputsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    minWidth: '45%', // Allows wrapping if needed, but keeps 2 per row mostly
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(28, 28, 30, 0.7)',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  doneButtonContainer: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 16,
    alignSelf: 'stretch',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderRadius: 999,
  },
  doneButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  doneButtonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  restContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 120, // Increased bottom padding to prevent overlap with bottom navigation (60px + safe area)
    justifyContent: 'center',
  },
  restBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  restGradient: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  restHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  restIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  restIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  restSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  timerContainer: {
    marginVertical: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 280,
  },
  nextExerciseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  nextExerciseLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: 8,
  },
  nextExerciseText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  skipButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  skipButtonIcon: {
    marginRight: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  progressLeftSection: {
    flex: 1,
  },
  progressRightSection: {
    alignItems: 'flex-end',
  },
  fireIcon: {
    marginBottom: 4,
  },
  caloriesText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 8,
  },
  exerciseBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  exerciseOrderGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundGradient: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 100, // Increased from 20 to avoid overlap with bottom navigation
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addExerciseFab: {
    bottom: 180, // Position above the tips FAB
  },
  caloriesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  caloriesGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  caloriesInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caloriesIcon: {
    padding: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 12,
    marginRight: 16,
  },
  caloriesTextContainer: {
    flexDirection: 'column',
  },
  caloriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  restCaloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  restCaloriesText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  weightHelpText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
  sessionUnitHint: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  bodyweightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  bodyweightText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  weightInputContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  weightInput: {
    width: '100%',
  },
  rpeContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rpeInput: {
    width: '100%',
    textAlign: 'center',
  },
  rpeHelpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitButtonTextActive: {
    color: colors.text,
  },
  unitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  unitButtonTextDisabled: {
    color: colors.textTertiary,
    opacity: 0.6,
  },
  sessionUnitIndicatorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  sessionUnitIndicator: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionUnitIndicatorSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  finishOptionsContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  finishOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  finishButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  finishExerciseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '50',
    gap: 8,
  },
  finishExerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  continueButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  // Last Performance Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    maxHeight: height * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalGradient: {
    flex: 1,
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 16,
  },
  modalLoadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalScrollView: {
    maxHeight: height * 0.6,
  },
  modalScrollContent: {
    paddingBottom: 150, // Extra padding to prevent content from being hidden by tab bar
  },
  performanceContainer: {
    gap: 12,
  },
  exerciseNameModal: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  lastPerformedDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  topSetCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  topSetGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  topSetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  topSetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  setsHistoryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  historySetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  setDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setDetailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  setDetailSeparator: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  setDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalEmpty: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryExerciseContainer: {
    marginBottom: 24,
  },
  summaryExerciseName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summarySetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summarySetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summarySetNumber: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  summaryEditButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  summaryEditText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  summarySetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summarySetReps: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  summarySetWeight: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  summaryFooter: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#000000',
    minHeight: 80,
  },
  summarySaveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  summarySaveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySaveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryEditContainer: {
    gap: 12,
    marginTop: 8,
  },
  summaryEditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryEditField: {
    flex: 1,
  },
  summaryEditLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryEditInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    height: 48,
  },
  summarySaveChangesButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  summarySaveChangesGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySaveChangesText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  // Table View Styles
  tableSection: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 2,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  lastTimeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  lastTimeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastTimeValueSeparator: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  lastTimeValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  lastTimeValueNA: {
    fontSize: 12,
    color: colors.textSecondary + '80',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tableInput: {
    backgroundColor: 'rgba(28, 28, 30, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    minHeight: 36,
    width: '100%',
    overflow: 'hidden',
    includeFontPadding: false,
    textAlignVertical: 'center',
    alignSelf: 'stretch',
  },
  completedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
  },
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCheckmark: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberBadgeCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  setNumberTextCompleted: {
    color: colors.success,
  },
  restTimeRow: {
    paddingLeft: 52, // Align with set number column
    paddingBottom: 8,
    paddingTop: 4,
  },
  restTimeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  addSetButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  unitSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  unitLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  exerciseCompleteActions: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  addExerciseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  addExerciseButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  finishWorkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  finishWorkoutButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishWorkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseCardContainer: {
    marginBottom: 16,
  },
  addExerciseButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    gap: 6,
  },
  addExerciseButtonSmallText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  finishWorkoutContainer: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  finishWorkoutButtonFull: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  addExerciseButtonFull: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  // AI Coach Header Styles
  emptyStateContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
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
    color: colors.text,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: colors.textSecondary || 'rgba(235, 235, 245, 0.6)',
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
    color: colors.textSecondary || 'rgba(235, 235, 245, 0.6)',
    letterSpacing: 0.3,
  },
  // Empty State Card
  emptyStateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary || 'rgba(235, 235, 245, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddExerciseButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  emptyAddExerciseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  emptyAddExerciseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  backButtonEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
}); 