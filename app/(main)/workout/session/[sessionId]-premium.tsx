import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Dimensions, ImageBackground } from 'react-native';
import { Text, Button, ActivityIndicator, TextInput, Divider, IconButton, Avatar, ProgressBar } from 'react-native-paper';
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

const { width, height } = Dimensions.get('window');

// Helper function to check if an exercise is cardio
const isCardioExercise = (exerciseName: string): boolean => {
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
        
        // Get exercise logs for these sets
        const { data: logsData, error: logsError } = await supabase
          .from('exercise_logs')
          .select('id, actual_reps, actual_weight, actual_rpe, completed_at, set_id')
          .in('set_id', setIds)
          .order('completed_at', { ascending: false })
          .limit(50);
        
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
    
    // Take only the most recent 10 sets
    const recentSets = allSets.slice(0, 10);
    
    console.log('[Session] Total sets found:', allSets.length, '| Showing most recent:', recentSets.length);
    
    // Format the data
    return {
      exerciseName,
      lastPerformed: recentSets[0].completed_at,
      sets: recentSets,
      topSet: {
        weight: Math.max(...recentSets.map(s => s.weight || 0)),
        reps: recentSets.find(s => s.weight === Math.max(...recentSets.map(set => set.weight || 0)))?.reps || 0
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
  const { user } = useAuth();

  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [actualReps, setActualReps] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(user?.profile?.weight_unit_preference || 'kg');
  const [sessionWeightUnit, setSessionWeightUnit] = useState<'kg' | 'lbs' | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Record<string, { name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [resting, setResting] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, Array<{
    reps: number;
    weight: number | null;
    weight_unit: 'kg' | 'lbs';
    original_weight: number | null;
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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const sessionStartTime = useRef(Date.now()).current;

  // Update weight unit when user profile changes
  useEffect(() => {
    if (user?.profile?.weight_unit_preference) {
      setWeightUnit(user.profile.weight_unit_preference);
    }
  }, [user?.profile?.weight_unit_preference]);

  // Set weight unit to session preference when starting new exercises
  useEffect(() => {
    if (sessionWeightUnit !== null) {
      setWeightUnit(sessionWeightUnit);
    }
  }, [currentIndex, sessionWeightUnit]);

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
      const userWeight = user?.profile?.weight || 70;
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
      const userWeight = user?.profile?.weight || 70;
      const { totalCalories } = calculateWorkoutCalories(remainingExerciseData, userWeight);
      projectedCalories = totalCalories;
    }
    
    // Total calories = completed + projected remaining
    const totalCalories = completedCalories + projectedCalories;
    
    // Adjust based on user profile if available
    const fitnessLevel = user?.profile?.fitness_level || 'intermediate';
    const age = user?.profile?.age;
    const gender = user?.profile?.gender;
    
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
        
        // Check if this is a quick workout
        if (String(sessionId).startsWith('quick-')) {
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
              .select('id, name')
              .in('id', exerciseIds);
            
            if (!exerciseError && exerciseData) {
              const map: Record<string, { name: string }> = {};
              exerciseData.forEach(ex => {
                if (ex.id) map[ex.id] = { name: ex.name || 'Exercise' };
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

      // Get unique exercise IDs
      const exerciseIds = sets
        .map(set => set.exercise_id)
        .filter((id, index, self) => self.indexOf(id) === index && !id.startsWith('ex-id-')); // Skip synthetic IDs

      if (exerciseIds.length === 0) {
        console.log('[Session] No valid exercise IDs to fetch previous data for');
        return;
      }

      try {
        const previousData = await PreviousExerciseService.getLastPerformedExercises(user.id, exerciseIds);
        setPreviousExerciseData(previousData);
        console.log(`[Session] Loaded previous exercise data for ${previousData.size} exercises`);
      } catch (error) {
        console.error('[Session] Error fetching previous exercise data:', error);
      }
    };

    fetchPreviousExerciseData();
  }, [sets, user?.id]);

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
    
    // Add to sets array
    setSets(prevSets => [...prevSets, newExerciseSet]);
    
    // Add to exercise map
    setExerciseMap(prevMap => ({
      ...prevMap,
      [exercise.id]: { name: exercise.name }
    }));
    
    // Close the picker
    setShowExercisePicker(false);
    
    // Move to the newly added exercise and reset set number
    setCurrentIndex(sets.length); // Move to the new exercise (current length will be the new index)
    setSetNumber(1);
    setActualReps('');
    setActualWeight('');
    console.log('[Session] Moved to newly added exercise at index:', sets.length);
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

    // Insert log only if this is a real set (skip synthetic fallback ids)
    if (!String(currentSet.id).toString().startsWith('fallback-') && !String(currentSet.id).toString().startsWith('ex-')) {
      try {
        console.log(`[Session] Logging set for exercise: ${currentSet.id}, reps: ${repsNum}, weight: ${weightNum}`);
        
        const log = {
          set_id: currentSet.id,
          actual_reps: repsNum,
          actual_weight: weightNum,
          actual_rpe: null,
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
                session_name: sessionTitle || splitName || 'Custom Session',
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
                    actual_rpe: null,
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
                session_name: sessionTitle || splitName || 'Custom Session',
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
      // Always start rest timer after completing a set (unlimited sets)
      setResting(true);
      console.log('[Session] Rest started');
    }
  };

  const handleRestFinish = () => {
    console.log('[Session] Rest finished');
    setResting(false); // Hide the timer first

    const currentSet = sets[currentIndex];
    if (!currentSet) return;

    // Check if we're about to exceed the planned sets
    if (setNumber >= currentSet.target_sets) {
      // Automatically move to next exercise without alert
      console.log('[Session] All sets completed, moving to next exercise');
      handleFinishExercise();
    } else {
      // Normal case: continue to next set
      setSetNumber(prev => prev + 1);
      console.log('[Session] Moving to next set');
    }
  };

  // Function to finish current exercise and move to next
  const handleFinishExercise = () => {
    console.log('[Session] Finishing current exercise');
    
      if (currentIndex + 1 < sets.length) {
      // Move to next exercise
        setCurrentIndex(prev => prev + 1);
      setSetNumber(1);
      setActualReps('');
      setActualWeight('');
      console.log('[Session] Moving to next exercise');
      } else {
      // This was the last exercise - automatically finish the workout
      console.log('[Session] ✅ Last exercise completed! Auto-finishing workout...');
      setTimeout(() => {
        handleFinishWorkout();
      }, 1000); // Small delay to let user see completion before dialog
    }
  };

  // Function to finish the entire workout
  const handleFinishWorkout = async () => {
    console.log('[Session] Finishing entire workout');
    console.log('[Session] DEBUG: Current completedSets state:', completedSets);
    console.log('[Session] DEBUG: Number of exercises in completedSets:', Object.keys(completedSets).length);
    Object.entries(completedSets).forEach(([exerciseId, sets]) => {
      console.log(`[Session] DEBUG: Exercise ${exerciseId} has ${sets.length} completed sets:`, sets);
    });
    
    // Always save workout history for completed workouts
    try {
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
            const workoutHistoryData = {
              user_id: user.id,
              workout_name: sessionTitle || 'Custom Workout',
              completed_exercises: completedExercises,
              total_duration_minutes: Math.round((Date.now() - sessionStartTime) / 60000),
              calories_burned: realTimeCalories,
              workout_date: new Date().toISOString().split('T')[0],
              split_name: splitName
            };

            console.log('[Session] Saving custom workout history');
            
            try {
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/workout-history/custom`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(workoutHistoryData),
              });

              if (!response.ok) {
                const errorText = await response.text();
                console.error('[Session] Failed to save custom workout history:', response.status, errorText);
              } else {
                const result = await response.json();
                console.log('[Session] Custom workout history saved successfully:', result);
              }
            } catch (fetchError) {
              console.error('[Session] Network error saving custom workout history:', fetchError);
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
              const durationMinutes = Math.round((Date.now() - sessionStartTime) / 60000);
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
                notes: `${sessionTitle || splitName || 'Standalone'} workout: ${totalExercises} exercises with ${totalSets} total sets`,
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
              const durationMinutes = Math.round((Date.now() - sessionStartTime) / 60000);
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
                  sets: completedSetsList.length,
                  reps: completedSetsList.map(set => set.reps || 0),
                  weights: completedSetsList.map(set => set.weight || 0)
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
                session_name: sessionTitle || splitName || 'Standalone Session',
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
                notes: `${sessionTitle || splitName || 'Standalone'} workout: ${totalExercises} exercises with ${totalSets} total sets`,
                plan_name: splitName || 'Custom Workout',
                session_name: sessionTitle || splitName || 'Standalone Session',
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

  const getExerciseImage = (exerciseName: string) => {
    const name = exerciseName.toLowerCase();
    
    if (name.includes('bench') || name.includes('chest')) {
      return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2000&auto=format&fit=crop';
    } else if (name.includes('squat') || name.includes('leg')) {
      return 'https://images.unsplash.com/photo-1434596922112-19c563067271?q=80&w=2000&auto=format&fit=crop';
    } else if (name.includes('deadlift') || name.includes('back')) {
      return 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=2000&auto=format&fit=crop';
    } else if (name.includes('shoulder') || name.includes('press')) {
      return 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?q=80&w=2000&auto=format&fit=crop';
    } else if (name.includes('bicep') || name.includes('curl') || name.includes('arm')) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2000&auto=format&fit=crop';
    }
    
    // Default image
    return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop';
  };

  const renderExerciseContent = () => {
    if (!currentSet) {
      return null;
    }
    
    const exerciseName = exerciseMap[currentSet.exercise_id]?.name || 'Exercise';
    const exerciseImage = getExerciseImage(exerciseName);
    
    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              })
            }
          ]
        }}>
          {/* Continue with existing exercise card */}
          <View style={styles.exerciseCard}>
            <ImageBackground
              source={{ uri: exerciseImage }}
              style={styles.exerciseImageBackground}
              imageStyle={styles.exerciseImage}
            >
              <BlurView intensity={20} tint="dark" style={styles.exerciseBlurOverlay}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                  style={styles.exerciseImageOverlay}
                >
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseInfo}>
                      <View style={styles.exerciseOrderContainer}>
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          style={styles.exerciseOrderGradient}
                        >
                          <Text style={styles.exerciseOrder}>{currentSet.order_in_session}</Text>
                        </LinearGradient>
                      </View>
                      <View>
                        <Text style={styles.exerciseName}>
                          {exerciseName}
                        </Text>
                        <Text style={styles.setProgress}>
                          Set {setNumber} of {currentSet.target_sets}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.infoButton}
                      onPress={handleShowLastPerformance}
                    >
                      <Icon name="history" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </BlurView>
            </ImageBackground>
            
            <View style={styles.targetContainer}>
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Target Reps</Text>
                <Text style={styles.targetValue}>{currentSet.target_reps}</Text>
              </View>
              <View style={styles.targetDivider} />
              <View style={styles.targetItem}>
                <Text style={styles.targetLabel}>Rest Time</Text>
                <Text style={styles.targetValue}>{currentSet.rest_period}</Text>
              </View>
            </View>
          </View>
          
          {/* Previous Workout Data */}
          {(() => {
            const previousData = previousExerciseData.get(currentSet.exercise_id);
            if (previousData && previousData.sets.length > 0) {
              const formatDate = (dateString: string) => {
                const date = new Date(dateString);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                if (diffDays < 7) return `${diffDays} days ago`;
                if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
                return date.toLocaleDateString();
              };

              const formatWeightDisplay = (weight: number | null, unit: 'kg' | 'lbs') => {
                if (weight === null) return 'Bodyweight';
                // Convert to user's preferred unit
                const displayWeight = unit === weightUnit ? weight : 
                  (weightUnit === 'kg' ? weight * 0.453592 : weight * 2.20462);
                return `${formatWeight(displayWeight, weightUnit)} ${weightUnit}`;
              };

              return (
                <View style={styles.previousWorkoutSection}>
                  <LinearGradient
                    colors={['rgba(28, 28, 30, 0.8)', 'rgba(18, 18, 18, 0.9)']}
                    style={styles.previousWorkoutGradient}
                  >
                    <View style={styles.previousWorkoutHeader}>
                      <Icon name="history" size={18} color={colors.primary} style={styles.previousWorkoutIcon} />
                      <Text style={styles.previousWorkoutTitle}>Last Performance</Text>
                      <Text style={styles.previousWorkoutDate}>{formatDate(previousData.lastPerformed || '')}</Text>
                    </View>
                    
                    <View style={styles.previousSetsList}>
                      {previousData.sets.map((set, idx) => (
                        <View key={idx} style={styles.previousSetRow}>
                          <Text style={styles.previousSetNumber}>Set {idx + 1}</Text>
                          <Text style={styles.previousSetReps}>{set.reps} reps</Text>
                          <Text style={styles.previousSetWeight}>{formatWeightDisplay(set.weight, set.weightUnit)}</Text>
                        </View>
                      ))}
                    </View>
                    
                    {previousData.totalVolume > 0 && (
                      <View style={styles.previousWorkoutStats}>
                        <View style={styles.previousStatItem}>
                          <Text style={styles.previousStatLabel}>Total Volume</Text>
                          <Text style={styles.previousStatValue}>
                            {formatWeightDisplay(previousData.totalVolume, 'kg')}
                          </Text>
                        </View>
                        {previousData.topSetWeight && (
                          <View style={styles.previousStatItem}>
                            <Text style={styles.previousStatLabel}>Top Set</Text>
                            <Text style={styles.previousStatValue}>
                              {formatWeightDisplay(previousData.topSetWeight, 'kg')}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </LinearGradient>
                </View>
              );
            }
            return null;
          })()}

          <View style={styles.recordSection}>
            <LinearGradient
              colors={['rgba(28, 28, 30, 0.9)', 'rgba(18, 18, 18, 0.95)']}
              style={styles.recordGradient}
            >
              <View style={styles.recordTitleContainer}>
                <Icon name="pencil" size={20} color={colors.primary} style={styles.recordIcon} />
                <Text style={styles.recordTitle}>Record Your Performance</Text>
              </View>
              
              <View style={styles.inputsContainer}>
                {(() => {
                  const exerciseName = exerciseMap[currentSet.exercise_id]?.name || '';
                  const isCardio = isCardioExercise(exerciseName);
                  
                  if (isCardio) {
                    // Cardio exercises: show Time (minutes) only
                    return (
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Time (minutes)</Text>
                        <TextInput
                          mode="outlined"
                          value={actualReps}
                          onChangeText={(value) => {
                            // Remove 'm' suffix and any non-numeric characters
                            const numericOnly = value.replace(/[^0-9]/g, '');
                            setActualReps(numericOnly);
                          }}
                          keyboardType="numeric"
                          style={styles.input}
                          outlineColor={colors.border}
                          activeOutlineColor={colors.primary}
                          placeholder="Enter minutes"
                          theme={{
                            colors: {
                              primary: colors.primary,
                              outline: colors.border,
                              onSurfaceVariant: colors.textSecondary,
                              surface: colors.surface,
                              onSurface: colors.text
                            }
                          }}
                        />
                      </View>
                    );
                  }
                  
                  // Strength exercises: show Reps and Weight
                  return (
                    <>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Actual Reps</Text>
                        <TextInput
                          mode="outlined"
                          value={actualReps}
                          onChangeText={setActualReps}
                          keyboardType="numeric"
                          style={styles.input}
                          outlineColor={colors.border}
                          activeOutlineColor={colors.primary}
                          placeholder="Enter reps"
                          theme={{
                            colors: {
                              primary: colors.primary,
                              outline: colors.border,
                              onSurfaceVariant: colors.textSecondary,
                              surface: colors.surface,
                              onSurface: colors.text
                            }
                          }}
                        />
                      </View>
                      
                      <View style={styles.inputContainer}>
                        {(() => {
                          const isBodyweight = isBodyweightExercise(exerciseName);
                          const canAddWeight = canUseOptionalWeight(exerciseName);
                    
                    if (isBodyweight) {
                      return (
                        <>
                          <Text style={styles.inputLabel}>
                            {canAddWeight ? `Additional Weight (${weightUnit}) - Optional` : 'Bodyweight Exercise'}
                          </Text>
                          {canAddWeight ? (
                            <>
                              <View style={styles.weightInputContainer}>
                              <TextInput
                                mode="outlined"
                                value={actualWeight}
                                onChangeText={setActualWeight}
                                keyboardType="numeric"
                                  style={[styles.input, styles.weightInput]}
                                outlineColor={colors.border}
                                activeOutlineColor={colors.primary}
                                placeholder="0 (bodyweight only)"
                                theme={{
                                  colors: {
                                    primary: colors.primary,
                                    outline: colors.border,
                                    onSurfaceVariant: colors.textSecondary,
                                    surface: colors.surface,
                                    onSurface: colors.text
                                  }
                                }}
                              />
                                <View style={styles.unitSelector}>
                                  <TouchableOpacity
                                    style={[
                                      styles.unitButton,
                                      weightUnit === 'kg' && styles.unitButtonActive
                                    ]}
                                    onPress={() => setWeightUnit('kg')}
                                  >
                                    <Text style={[
                                      styles.unitButtonText,
                                      weightUnit === 'kg' && styles.unitButtonTextActive
                                    ]}>kg</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      styles.unitButton,
                                      weightUnit === 'lbs' && styles.unitButtonActive
                                    ]}
                                    onPress={() => setWeightUnit('lbs')}
                                  >
                                    <Text style={[
                                      styles.unitButtonText,
                                      weightUnit === 'lbs' && styles.unitButtonTextActive
                                    ]}>lbs</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <Text style={styles.weightHelpText}>
                                💡 Leave empty for bodyweight only. Add weight if using a belt, vest, or holding weights.
                                {sessionWeightUnit && (
                                  <Text style={styles.sessionUnitHint}>
                                    {'\n'}📌 Session preference: {sessionWeightUnit}
                                  </Text>
                                )}
                              </Text>
                            </>
                          ) : (
                            <View style={styles.bodyweightInfo}>
                              <Icon name="account" size={20} color={colors.primary} />
                              <Text style={styles.bodyweightText}>
                                Using your bodyweight only
                              </Text>
                            </View>
                          )}
                        </>
                      );
                    } else {
                      return (
                        <>
                          <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
                          <View style={styles.weightInputContainer}>
                          <TextInput
                            mode="outlined"
                            value={actualWeight}
                            onChangeText={setActualWeight}
                            keyboardType="numeric"
                              style={[styles.input, styles.weightInput]}
                            outlineColor={colors.border}
                            activeOutlineColor={colors.primary}
                            placeholder="Enter weight"
                            theme={{
                              colors: {
                                primary: colors.primary,
                                outline: colors.border,
                                onSurfaceVariant: colors.textSecondary,
                                surface: colors.surface,
                                onSurface: colors.text
                              }
                            }}
                          />
                            <View style={styles.unitSelector}>
                              <TouchableOpacity
                                style={[
                                  styles.unitButton,
                                  weightUnit === 'kg' && styles.unitButtonActive,
                                  // Disable if session has different unit and user has logged sets
                                  sessionWeightUnit && sessionWeightUnit !== 'kg' && Object.keys(completedSets).length > 0 && styles.unitButtonDisabled
                                ]}
                                onPress={() => {
                                  // Check if switching would cause inconsistency
                                  if (sessionWeightUnit && sessionWeightUnit !== 'kg' && Object.keys(completedSets).length > 0) {
                                    Alert.alert(
                                      "Weight Unit Consistency",
                                      `You've already logged sets for this exercise using ${sessionWeightUnit.toUpperCase()}. Please continue using the same unit to keep your data consistent.\n\nIf you need to change units, you can do so when starting a new exercise.`,
                                      [{ text: "OK", style: "default" }]
                                    );
                                    return;
                                  }
                                  setWeightUnit('kg');
                                }}
                              >
                                <Text style={[
                                  styles.unitButtonText,
                                  weightUnit === 'kg' && styles.unitButtonTextActive,
                                  sessionWeightUnit && sessionWeightUnit !== 'kg' && Object.keys(completedSets).length > 0 && styles.unitButtonTextDisabled
                                ]}>kg</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.unitButton,
                                  weightUnit === 'lbs' && styles.unitButtonActive,
                                  // Disable if session has different unit and user has logged sets
                                  sessionWeightUnit && sessionWeightUnit !== 'lbs' && Object.keys(completedSets).length > 0 && styles.unitButtonDisabled
                                ]}
                                onPress={() => {
                                  // Check if switching would cause inconsistency
                                  if (sessionWeightUnit && sessionWeightUnit !== 'lbs' && Object.keys(completedSets).length > 0) {
                                    Alert.alert(
                                      "Weight Unit Consistency",
                                      `You've already logged sets for this exercise using ${sessionWeightUnit.toUpperCase()}. Please continue using the same unit to keep your data consistent.\n\nIf you need to change units, you can do so when starting a new exercise.`,
                                      [{ text: "OK", style: "default" }]
                                    );
                                    return;
                                  }
                                  setWeightUnit('lbs');
                                }}
                              >
                                <Text style={[
                                  styles.unitButtonText,
                                  weightUnit === 'lbs' && styles.unitButtonTextActive,
                                  sessionWeightUnit && sessionWeightUnit !== 'lbs' && Object.keys(completedSets).length > 0 && styles.unitButtonTextDisabled
                                ]}>lbs</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          {sessionWeightUnit && (
                            <View style={styles.sessionUnitIndicatorContainer}>
                              <Text style={styles.sessionUnitIndicator}>
                                📌 Session preference: {sessionWeightUnit.toUpperCase()}
                              </Text>
                              <Text style={styles.sessionUnitIndicatorSubtext}>
                                Keep using {sessionWeightUnit} for consistency
                              </Text>
                            </View>
                          )}
                        </>
                      );
                    }
                  })()}
                      </View>
                    </>
                  );
                })()}
              </View>
              
              {/* Complete Set button - alert will handle set limit */}
              {(
              <TouchableOpacity
                style={styles.doneButtonContainer}
                onPress={handleSetDone}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doneButton}
                >
                  <View style={styles.doneButtonContent}>
                    <Icon name="check" size={20} color={colors.text} style={styles.doneButtonIcon} />
                    <Text style={styles.doneButtonText}>Complete Set</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              )}

            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
    );
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
            
            <Text style={styles.headerTitle}>{splitName || sessionTitle || 'Workout'}</Text>
            
            <TouchableOpacity style={styles.menuButton}>
              <Icon name="dots-vertical" size={24} color={colors.text} />
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
                {currentIndex + 1}/{sets.length} Exercises
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
          <View style={styles.centered}>
            <View style={styles.loadingContainer}>
              <LinearGradient
                colors={['rgba(28, 28, 30, 0.8)', 'rgba(18, 18, 18, 0.9)']}
                style={styles.loadingGradient}
              >
                <Icon name="dumbbell" size={64} color={colors.primary} />
                <Text style={styles.loadingText}>
                  {isQuickWorkout ? 'Ready to Start!' : 'No exercises found'}
                </Text>
                <Text style={styles.loadingTip}>
                  {isQuickWorkout 
                    ? 'Add exercises as you go. Choose what feels right for today!'
                    : 'This workout session doesn\'t have any exercises configured.'
                  }
                </Text>
                
                {isQuickWorkout ? (
                  <TouchableOpacity
                    style={styles.doneButtonContainer}
                    onPress={() => setShowExercisePicker(true)}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.doneButton}
                    >
                      <Icon name="plus-circle" size={20} color={colors.text} style={{ marginRight: 8 }} />
                      <Text style={styles.doneButtonText}>Add First Exercise</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.doneButtonContainer}
                    onPress={() => router.back()}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.doneButton}
                    >
                      <Text style={styles.doneButtonText}>Go Back</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
          </View>
        ) : resting ? (
          renderRestTimer()
        ) : (
          renderExerciseContent()
        )}
        
        {/* Floating Action Buttons */}
        {!loading && !resting && sets.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => Alert.alert('Tip', 'Focus on proper form for maximum results and to prevent injuries.')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.fabGradient}
            >
              <Icon name="lightbulb-on" size={24} color={colors.text} />
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        {/* Add Exercise FAB for Quick Workouts */}
        {!loading && !resting && isQuickWorkout && (
          <TouchableOpacity
            style={[styles.fab, styles.addExerciseFab]}
            onPress={() => setShowExercisePicker(true)}
          >
            <LinearGradient
              colors={[colors.purple, colors.pink]}
              style={styles.fabGradient}
            >
              <Icon name="plus" size={28} color={colors.text} />
            </LinearGradient>
          </TouchableOpacity>
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
        
        {/* Exercise Picker Modal */}
        <ExercisePicker
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelectExercise={handleAddExercise}
          excludeExerciseIds={sets.map(s => s.exercise_id)}
        />
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
    padding: 8,
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
  exerciseImageBackground: {
    height: 200,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseOrder: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  setProgress: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 8,
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
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  doneButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneButtonIcon: {
    marginRight: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
  finishWorkoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '50',
    gap: 8,
  },
  finishWorkoutButtonText: {
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
    bottom: 0,
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
    maxHeight: height * 0.8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalGradient: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    paddingBottom: 100, // Extra padding to prevent content from being hidden by tab bar
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
  setNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
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
}); 