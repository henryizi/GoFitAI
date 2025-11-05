import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ImageBackground, Dimensions, Animated } from 'react-native';
import { Text, IconButton, ActivityIndicator, TextInput } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
// Remove mock data import - using real WorkoutService only
import { WorkoutService } from '../../../../src/services/workout/WorkoutService';
import { WorkoutLocalStore } from '../../../../src/services/workout/WorkoutLocalStore';
import { useAuth } from '../../../../src/hooks/useAuth';
// environment import removed; no longer used here

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
  blue: '#007AFF',
  purple: '#AF52DE',
  pink: '#FF2D92',
  cyan: '#5AC8FA',
};

// Using real WorkoutService directly

type WorkoutPlan = { 
    id: string;
    name: string;
    weekly_schedule?: { day: string, focus: string, exercises: { name: string, sets: number, reps: string, rest: string }[] }[];
};
type TrainingSplit = { name: string };
type WorkoutSession = { id: string; day: string; focus: string; exercises: ExerciseSet[] };
type ExerciseSet = { id: string, name: string, sets: number, reps: string, rest: string };

// Helper function to check if an exercise is cardio-based
const isCardioExercise = (exercise: any): boolean => {
  // Explicitly exclude strength exercises that should never be treated as cardio
  const strengthExerciseNames = ['face pull', 'cable face pull', 'reverse fly', 'rear delt fly'];
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

export default function PlanDetailScreen() {
  const { planId, planObject, refresh } = useLocalSearchParams<{ planId: string, planObject?: string, refresh?: string }>();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editedSets, setEditedSets] = useState<number | null>(null);
  const [editedReps, setEditedReps] = useState<string | null>(null);
  const [editedRest, setEditedRest] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [scrollY] = useState(new Animated.Value(0));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const confirmDeletePlan = () => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this workout plan? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deletePlan },
      ]
    );
  };

  const deletePlan = async () => {
    try {
      if (!plan) return;

      // Best-effort database deletion
      if (plan.id && WorkoutService.isValidUUID(plan.id)) {
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/delete-workout-plan/${plan.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            console.log(`[PlanDetail] Successfully deleted plan from database: ${plan.id}`);
          } else {
            console.warn('[PlanDetail] Database deletion failed:', await response.text());
          }
        } catch (e) {
          console.log('[PlanDetail] Database deletion failed (continuing):', e);
        }
      }

      try {
        // Use improved deletion methods with userId
        if (plan?.id) {
          await WorkoutLocalStore.deletePlan(plan.id, user?.id);
        } else {
          await WorkoutLocalStore.deletePlansByName(plan?.name, user?.id);
        }
      } catch (e) {
        console.log('[PlanDetail] Local store deletion failed (continuing):', e);
      }

      Alert.alert('Deleted', 'Workout plan has been deleted.');
      router.replace('/(main)/workout/plans');
    } catch (e) {
      console.error('[PlanDetail] Delete plan error:', e);
      Alert.alert('Error', 'Failed to delete the plan. Please try again.');
    }
  };

  const handleActivatePlan = async () => {
    try {
      if (!plan || !user?.id) return;

      console.log(`[PlanDetail] Setting plan ${plan.id} as active`);
      
      // Set the plan as active using WorkoutService
      const success = await WorkoutService.setActivePlan(user.id, plan.id);
      
      if (success) {
        // Update local state to reflect the change
        setPlan(prev => prev ? { ...prev, is_active: true, status: 'active' } : null);
        
        // Show success message
        Alert.alert(
          'Plan Activated', 
          `"${plan.name}" is now your active workout plan.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to activate the plan. Please try again.');
      }
    } catch (error) {
      console.error('[PlanDetail] Error activating plan:', error);
      Alert.alert('Error', 'An unexpected error occurred while activating the plan.');
    }
  };

  useEffect(() => {
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

  

  const handleEditExercise = (sessionId: string, exerciseId: string, sets: number, reps: string, rest: string, name: string) => {
    setEditingSession(sessionId);
    setEditingExercise(exerciseId);
    setEditedSets(sets);
    setEditedReps(reps);
    setEditedRest(rest);
    setEditedName(name);
  };

  const handleSaveExerciseChanges = async () => {
    if (!editingSession || !editingExercise || !editedSets || !editedReps || !editedRest || !editedName) return;

    const updatedSessions = sessions.map(session => {
      if (session.id === editingSession) {
        return {
          ...session,
          exercises: session.exercises.map(exercise => {
            if (exercise.id === editingExercise) {
              return {
                ...exercise,
                name: editedName,
                sets: editedSets,
                reps: editedReps,
                rest: editedRest
              };
            }
            return exercise;
          })
        };
      }
      return session;
    });

    setSessions(updatedSessions);

    setEditingSession(null);
    setEditingExercise(null);
    setEditedSets(null);
    setEditedReps(null);
    setEditedRest(null);
    setEditedName(null);

    Alert.alert("Updated", "Exercise details have been updated successfully.");
  };

  const cancelEdit = () => {
    setEditingSession(null);
    setEditingExercise(null);
    setEditedSets(null);
    setEditedReps(null);
    setEditedRest(null);
    setEditedName(null);
  };


  const loadPlanDetails = useCallback(async () => {
    if (planObject) {
        try {
            const parsedPlan = JSON.parse(planObject);
            setPlan(parsedPlan);
        
        // Map the weekly schedule to sessions with proper typing
        const mappedSessions = Array.isArray(parsedPlan.weekly_schedule || parsedPlan.weeklySchedule)
          ? (parsedPlan.weekly_schedule || parsedPlan.weeklySchedule).map((daySchedule: any, index: number) => {
              // Handle both old and new data structures
              let exercises = [];
              
              console.log(`[PLAN DETAIL] Processing day ${index}:`, {
                day: daySchedule.day,
                focus: daySchedule.focus,
                hasExercises: !!daySchedule.exercises,
                exercisesLength: daySchedule.exercises?.length || 0,
                exercisesType: typeof daySchedule.exercises,
                isArray: Array.isArray(daySchedule.exercises),
                firstExercise: daySchedule.exercises?.[0]
              });
              
              // Priority 1: Use exercises array if it has items
              if (Array.isArray(daySchedule.exercises) && daySchedule.exercises.length > 0) {
                exercises = daySchedule.exercises.map((ex: any, exIndex: number) => ({
                  id: ex.id || `ex-${index}-${exIndex}`,
                  name: ex.name || ex.exercise || 'Exercise',
                  sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                  reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                  rest: ex.rest || ex.restBetweenSets || ex.rest_period || '60s',
                  restBetweenSets: ex.restBetweenSets || ex.rest || ex.rest_period || '60s'
                }));
                console.log(`[PLAN DETAIL] Mapped ${exercises.length} exercises for day ${index}`);
              } 
              // Priority 2: Try main_workout structure if exercises is empty
              else if (daySchedule.main_workout && Array.isArray(daySchedule.main_workout) && daySchedule.main_workout.length > 0) {
                // New structure: separated warm_up, main_workout, cool_down arrays
                const allExercises = [
                  ...(daySchedule.warm_up || []),
                  ...(daySchedule.main_workout || []),
                  ...(daySchedule.cool_down || [])
                ];
                
                exercises = allExercises.map((ex: any, exIndex: number) => ({
                  id: ex.id || `ex-${index}-${exIndex}`,
                  name: ex.name || ex.exercise || 'Exercise',
                  sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                  reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                  rest: ex.rest || ex.restBetweenSets || ex.rest_period || ex.rest_seconds || '60s',
                  restBetweenSets: ex.restBetweenSets || ex.rest || ex.rest_period || ex.rest_seconds || '60s',
                  type: ex.type || 'main_workout'
                }));
                console.log(`[PLAN DETAIL] Mapped ${exercises.length} exercises from main_workout for day ${index}`);
              }
              // Priority 3: Check if it's explicitly a rest day
              else if (daySchedule.focus && typeof daySchedule.focus === 'string' && daySchedule.focus.toLowerCase().includes('rest')) {
                console.log(`[PLAN DETAIL] Day ${index} is explicitly a rest day`);
                exercises = [];
              }
              // Priority 4: If no exercises found but not a rest day, log warning
              else {
                console.warn(`[PLAN DETAIL] Day ${index} has no exercises but is not marked as rest day:`, {
                  focus: daySchedule.focus,
                  hasExercises: !!daySchedule.exercises,
                  hasMainWorkout: !!daySchedule.main_workout
                });
                exercises = [];
              }
              
              const session = {
                id: daySchedule.id || `session-${index}`,
                day: daySchedule.day_name || daySchedule.day || daySchedule.dayName || `Day ${index + 1}`,
                focus: daySchedule.focus || daySchedule.workout_type || 'Workout',
                exercises
              };
              
              console.log(`[PLAN DETAIL] Final session ${index}:`, {
                day: session.day,
                focus: session.focus,
                exerciseCount: session.exercises.length
              });
              
              return session;
            })
              : [];

            if (mappedSessions.length > 0) {
              setSessions(mappedSessions);
              return;
            }
        
            // Fallback: if weekly_schedule is missing or empty, fetch sessions by plan id
            try {
          const realSessions = await WorkoutService.getSessionsForPlan(parsedPlan.id || planId as string);
              if (realSessions && realSessions.length > 0) {
                setSessions(realSessions);
                return;
              }
            } catch (err) {
              console.error("Failed to get sessions from real service:", err);
            }
        } catch (e) {
            console.error("Failed to parse planObject:", e);
        }
    }
    
    if (!planId) return;
    try {
      // First try to get the plan from the real service
      try {
        const realPlanData = await WorkoutService.getPlanById(planId as string);
        if (realPlanData) {
          console.log('[PlanDetail] Found plan with WorkoutService:', realPlanData.id);
          console.log('[PlanDetail] 🔍 Plan data check:', {
            hasWeeklySchedule: !!realPlanData.weekly_schedule,
            hasWeeklyScheduleCamel: !!realPlanData.weeklySchedule,
            weeklyScheduleLength: realPlanData.weekly_schedule?.length || realPlanData.weeklySchedule?.length || 0,
            firstDayExercises: realPlanData.weekly_schedule?.[0]?.exercises?.length || realPlanData.weeklySchedule?.[0]?.exercises?.length || 0
          });
          setPlan(realPlanData);
          
          // Always attempt to load sessions from DB first (prefer real UUID sessions)
          try {
            const realSessionData = await WorkoutService.getSessionsForPlan(realPlanData.id);
            if (realSessionData && realSessionData.length > 0) {
              console.log(`[PlanDetail] Found ${realSessionData.length} sessions from database`);
              
              // Normalize sessions from DB format
              const normalizedSessions = await Promise.all(realSessionData.map(async (s: any) => {
                const sessionObj = {
                  id: s.id,
                  day: typeof s.day === 'string' ? s.day : `Day ${s.day_number ?? ''}`,
                  focus: s.training_splits?.name || (Array.isArray(s.training_splits?.focus_areas) ? s.training_splits?.focus_areas.join(', ') : 'Workout'),
                  exercises: [] as ExerciseSet[]
                };
                
                try {
                  // Fetch exercise sets for this session
                  console.log(`[PlanDetail] Fetching exercise sets for session ${s.id}`);
                  
                  // Check if this is a valid UUID session ID
                  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id);
                  
                  if (!isValidUUID) {
                    console.log(`[PlanDetail] Session ID ${s.id} is not a valid UUID, will use fallback approach`);
                    // For non-UUID sessions, we'll try to find exercises directly in the plan's weekly_schedule
                    const weeklySchedule = realPlanData.weekly_schedule || realPlanData.weeklySchedule;
                    if (weeklySchedule && Array.isArray(weeklySchedule)) {
                      // Find the matching session in the weekly schedule
                      const matchingDay = weeklySchedule.find(day => day.id === s.id);
                      // Handle both data structures for weekly schedule
                      let exercises = [];
                      
                      if (matchingDay && matchingDay.exercises && Array.isArray(matchingDay.exercises)) {
                        // Old structure: direct exercises array
                        exercises = matchingDay.exercises;
                      } else if (matchingDay && (matchingDay.warm_up || matchingDay.main_workout || matchingDay.cool_down)) {
                        // New structure: separated arrays
                        exercises = [
                          ...(matchingDay.warm_up || []),
                          ...(matchingDay.main_workout || []),
                          ...(matchingDay.cool_down || [])
                        ];
                      }
                      
                      if (exercises.length > 0) {
                        console.log(`[PlanDetail] Found ${exercises.length} exercises in weekly schedule for session ${s.id}`);
                        sessionObj.exercises = exercises.map((ex: any, exIndex: number) => ({
                          id: ex.id || `ex-${s.id}-${exIndex}`,
                          name: ex.name || ex.exercise || 'Exercise',
                          sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                          reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                          rest: ex.rest || ex.restBetweenSets || '60s',
                          restBetweenSets: ex.restBetweenSets || ex.rest || '60s',
                          type: ex.type || 'main_workout'
                        }));
                      }
                    }
                  } else {
                    // For valid UUID sessions, fetch from database
                    const sets = await WorkoutService.getExerciseSetsForSession(s.id);
                    
                    if (sets && sets.length > 0) {
                      console.log(`[PlanDetail] Found ${sets.length} exercise sets for session ${s.id}`);
                      // Map exercise sets to exercises
                      sessionObj.exercises = sets.map((set: any) => ({
                        id: set.id,
                        name: set.exercise?.name || 'Exercise',
                        sets: set.target_sets || 3,
                        reps: set.target_reps || '8-12',
                        rest: set.rest_period || '60s',
                        restBetweenSets: set.rest_period || '60s'
                      }));
                    } else {
                      console.log(`[PlanDetail] No exercise sets found for session ${s.id}`);
          }
        }
                } catch (error) {
                  console.error(`[PlanDetail] Error fetching exercise sets for session ${s.id}:`, error);
      }
      
                return sessionObj;
              }));
              
              console.log(`[PlanDetail] Loaded ${normalizedSessions.length} sessions with exercises`);
              setSessions(normalizedSessions);

              // Only update the plan's weekly schedule if we don't already have a proper one
              // or if the database sessions have MORE data than the current weekly schedule
              const currentWeeklySchedule = realPlanData.weekly_schedule || realPlanData.weeklySchedule || [];
              const shouldUpdateSchedule = !currentWeeklySchedule.length ||
                (normalizedSessions.length > currentWeeklySchedule.length);

              if (shouldUpdateSchedule) {
                console.log(`[PlanDetail] Updating plan's weekly schedule (${normalizedSessions.length} sessions vs ${currentWeeklySchedule.length} current)`);
                const updatedPlan = {
                  ...realPlanData,
                  weekly_schedule: normalizedSessions,
                  weeklySchedule: normalizedSessions
                };
                setPlan(updatedPlan);
              } else {
                console.log(`[PlanDetail] Keeping existing weekly schedule (${currentWeeklySchedule.length} days) - not overwriting with ${normalizedSessions.length} sessions`);
              }
              
              // No need to load from weekly_schedule if we have real sessions
              return;
            } else {
              console.log('[PlanDetail] No sessions found in database for plan:', realPlanData.id);
      }
    } catch (error) {
            console.error('[PlanDetail] Error fetching sessions from database:', error);
          }
          
          // If we couldn't get sessions from the database, try to use the weekly schedule
          const weeklySchedule = realPlanData.weekly_schedule || realPlanData.weeklySchedule;
          if (weeklySchedule && Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
            console.log('[PlanDetail] Using weekly schedule from plan:', weeklySchedule.length, 'days');
            console.log('[PlanDetail] Weekly schedule sample:', weeklySchedule.slice(0, 3).map(day => ({
              day: day.day,
              focus: day.focus,
              exercises: day.exercises?.length || 0
            })));
            
            // Ensure each session has a unique ID and exercises array
            console.log('[PlanDetail] 🔍 RAW WEEKLY_SCHEDULE BEFORE PROCESSING:', JSON.stringify(weeklySchedule, null, 2));
            const processedSessions = weeklySchedule.map((day: any, index: number) => {
              if (!day) return null;
              
              // Handle both data structures
              let exercises = [];
              
              if (Array.isArray(day.exercises)) {
                // Old structure: direct exercises array
                exercises = day.exercises.map((ex: any, exIndex: number) => ({
                  id: ex.id || `ex-${index}-${exIndex}`,
                  name: ex.name || ex.exercise || 'Exercise',
                  sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                  reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                  rest: ex.rest || ex.restBetweenSets || '60s',
                  restBetweenSets: ex.restBetweenSets || ex.rest || '60s'
                }));
              } else if (day.warm_up || day.main_workout || day.cool_down) {
                // New structure: separated arrays
                const allExercises = [
                  ...(day.warm_up || []),
                  ...(day.main_workout || []),
                  ...(day.cool_down || [])
                ];
                
                exercises = allExercises.map((ex: any, exIndex: number) => ({
                  id: ex.id || `ex-${index}-${exIndex}`,
                  name: ex.name || ex.exercise || 'Exercise',
                  sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                  reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                  rest: ex.rest || ex.restBetweenSets || '60s',
                  restBetweenSets: ex.restBetweenSets || ex.rest || '60s',
                  type: ex.type || 'main_workout'
                }));
              }
              
              return {
                id: day.id || `session-${index + 1}`,
                day: day.day || day.dayName || `Day ${index + 1}`,
                focus: day.focus || day.dayName || 'Workout',
                exercises
              };
            }).filter((session): session is WorkoutSession => session !== null);
            
            console.log('[PlanDetail] 🔍 PROCESSED SESSIONS LENGTH:', processedSessions.length);
            console.log('[PlanDetail] 🔍 PROCESSED SESSIONS:', JSON.stringify(processedSessions.map(s => ({ day: s.day, focus: s.focus, exercisesCount: s.exercises?.length || 0 })), null, 2));
            
            setSessions(processedSessions);
            
            // Also update the plan's weekly schedule to match the sessions for consistency
            const updatedPlan = {
              ...realPlanData,
              weekly_schedule: processedSessions,
              weeklySchedule: processedSessions
            };
            setPlan(updatedPlan);
          } else {
            console.log('[PlanDetail] No weekly schedule found in plan, attempting to reconstruct from database');
            
            // Try to reconstruct weekly schedule from database sessions
            try {
              const reconstructedSessions = await WorkoutService.getSessionsForPlan(realPlanData.id);
              if (reconstructedSessions && reconstructedSessions.length > 0) {
                console.log('[PlanDetail] Reconstructed weekly schedule from database sessions:', reconstructedSessions.length);
                
                // Convert database sessions back to weekly schedule format
                const weeklyScheduleFromDB = reconstructedSessions.map((session: any, index: number) => ({
                  id: session.id,
                  day: session.day || session.dayName || `Day ${index + 1}`,
                  focus: session.training_splits?.name || 'Workout',
                  exercises: [] // Will be populated when session is expanded
                }));
                
                // Update plan with reconstructed weekly schedule
                const updatedPlan = {
                  ...realPlanData,
                  weekly_schedule: weeklyScheduleFromDB,
                  weeklySchedule: weeklyScheduleFromDB
                };
                setPlan(updatedPlan);
                setSessions(weeklyScheduleFromDB);
              } else {
                console.log('[PlanDetail] No sessions found in database either');
                setSessions([]);
              }
            } catch (reconstructError) {
              console.error('[PlanDetail] Error reconstructing weekly schedule:', reconstructError);
              setSessions([]);
            }
          }
        }
      } catch (error) {
        console.error('[PlanDetail] Error fetching plan details:', error);
      }
    } catch (error) {
      console.error('[PlanDetail] Error in loadPlanDetails:', error);
    } finally {
      setIsLoading(false);
    }
  }, [planId, planObject]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!planId) return;
      
      try {
        setIsLoading(true);
        
        // First try to get the plan from the real service
        const fetchedPlan = await WorkoutService.getPlanById(planId as string);
        if (fetchedPlan) {
          console.log('[PlanDetail] Found plan with WorkoutService:', fetchedPlan.id);
          setPlan(fetchedPlan);
          
          // Load sessions for this plan
          try {
            const realSessionData = await WorkoutService.getSessionsForPlan(fetchedPlan.id);
            if (realSessionData && realSessionData.length > 0) {
              console.log(`[PlanDetail] Found ${realSessionData.length} sessions from database`);
              
              // Normalize sessions from DB format
              const normalizedSessions = await Promise.all(realSessionData.map(async (s: any) => {
                const sessionObj = {
                  id: s.id,
                  day: typeof s.day === 'string' ? s.day : `Day ${s.day_number ?? ''}`,
                  focus: s.training_splits?.name || (Array.isArray(s.training_splits?.focus_areas) ? s.training_splits?.focus_areas.join(', ') : 'Workout'),
                  exercises: [] as ExerciseSet[]
                };
                
                try {
                  // Fetch exercise sets for this session
                  console.log(`[PlanDetail] Fetching exercise sets for session ${s.id}`);
                  
                  // Check if this is a valid UUID session ID
                  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id);
                  
                  if (!isValidUUID) {
                    console.log(`[PlanDetail] Session ID ${s.id} is not a valid UUID, will use fallback approach`);
                    // For non-UUID sessions, we'll try to find exercises directly in the plan's weekly_schedule
                    const weeklySchedule = fetchedPlan.weekly_schedule || fetchedPlan.weeklySchedule;
                    if (weeklySchedule && Array.isArray(weeklySchedule)) {
                      // Find the matching session in the weekly schedule
                      const matchingDay = weeklySchedule.find(day => day.id === s.id);
                      if (matchingDay && matchingDay.exercises && Array.isArray(matchingDay.exercises)) {
                        console.log(`[PlanDetail] Found ${matchingDay.exercises.length} exercises in weekly schedule for session ${s.id}`);
                        sessionObj.exercises = matchingDay.exercises.map((ex: any, exIndex: number) => ({
                          id: ex.id || `ex-${s.id}-${exIndex}`,
                          name: ex.name || 'Exercise',
                          sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                          reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                          rest: ex.rest || ex.restBetweenSets || '60s',
                          restBetweenSets: ex.restBetweenSets || ex.rest || '60s'
                        }));
                      }
                    }
                  } else {
                    // For valid UUID sessions, fetch from database
                    const sets = await WorkoutService.getExerciseSetsForSession(s.id);
                    
                    if (sets && sets.length > 0) {
                      console.log(`[PlanDetail] Found ${sets.length} exercise sets for session ${s.id}`);
                      // Map exercise sets to exercises
                      sessionObj.exercises = sets.map((set: any) => ({
                        id: set.id,
                        name: set.exercise?.name || 'Exercise',
                        sets: set.target_sets || 3,
                        reps: set.target_reps || '8-12',
                        rest: set.rest_period || '60s',
                        restBetweenSets: set.rest_period || '60s'
                      }));
                    } else {
                      console.log(`[PlanDetail] No exercise sets found for session ${s.id}`);
                    }
                  }
                } catch (error) {
                  console.error(`[PlanDetail] Error fetching exercise sets for session ${s.id}:`, error);
                }
                
                return sessionObj;
              }));
              
              console.log(`[PlanDetail] Loaded ${normalizedSessions.length} sessions with exercises`);
              setSessions(normalizedSessions);
              
              // Also update the plan's weekly schedule to match the sessions
              const updatedPlan = {
                ...fetchedPlan,
                weekly_schedule: normalizedSessions,
                weeklySchedule: normalizedSessions
              };
              setPlan(updatedPlan);
            } else {
              console.log('[PlanDetail] No sessions found in database for plan:', fetchedPlan.id);
              
              // If no sessions in database, try to use the weekly schedule from the plan
              const weeklySchedule = fetchedPlan.weekly_schedule || fetchedPlan.weeklySchedule;
              console.log('[PlanDetail] 🔍 DEBUG: Plan structure:', {
                id: fetchedPlan.id,
                name: fetchedPlan.name,
                source: fetchedPlan.source,
                hasWeeklySchedule: !!fetchedPlan.weekly_schedule,
                hasWeeklyScheduleCamel: !!fetchedPlan.weeklySchedule,
                weeklyScheduleLength: weeklySchedule?.length || 0,
                weeklyScheduleType: Array.isArray(weeklySchedule) ? 'array' : typeof weeklySchedule,
                firstDayStructure: weeklySchedule?.[0] ? {
                  day: weeklySchedule[0].day,
                  focus: weeklySchedule[0].focus,
                  exercisesCount: (
                    (weeklySchedule[0].exercises?.length || 0) + 
                    (weeklySchedule[0].warm_up?.length || 0) + 
                    (weeklySchedule[0].main_workout?.length || 0) + 
                    (weeklySchedule[0].cool_down?.length || 0)
                  ),
                  hasExercises: !!(weeklySchedule[0].exercises || weeklySchedule[0].warm_up || weeklySchedule[0].main_workout || weeklySchedule[0].cool_down),
                  firstExerciseName: (
                    weeklySchedule[0].exercises?.[0]?.name || 
                    weeklySchedule[0].warm_up?.[0]?.name || weeklySchedule[0].warm_up?.[0]?.exercise ||
                    weeklySchedule[0].main_workout?.[0]?.name || weeklySchedule[0].main_workout?.[0]?.exercise ||
                    weeklySchedule[0].cool_down?.[0]?.name || weeklySchedule[0].cool_down?.[0]?.exercise
                  )
                } : 'no first day'
              });
              
              // Check if this is a corrupted plan (has schedule but no exercises)
              const hasScheduleButNoExercises = weeklySchedule && Array.isArray(weeklySchedule) && 
                weeklySchedule.length > 0 && 
                weeklySchedule.filter(d => 
                  (d.exercises && d.exercises.length > 0) ||
                  (d.warm_up && d.warm_up.length > 0) ||
                  (d.main_workout && d.main_workout.length > 0) ||
                  (d.cool_down && d.cool_down.length > 0)
                ).length === 0;
              
              if (hasScheduleButNoExercises) {
                console.log('[PlanDetail] ⚠️ Detected corrupted plan - has schedule but no exercises.');
                console.log('[PlanDetail] Full plan data:', JSON.stringify(fetchedPlan, null, 2));
                
                // Show alert to user regardless of source
                Alert.alert(
                  'Corrupted Plan Data',
                  'This workout plan has corrupted data (all exercises are empty). This may be caused by a bug in an older version.\n\nPlease delete this plan and generate a new one.',
                  [
                    { 
                      text: 'Delete & Create New', 
                      onPress: async () => {
                        // Delete the corrupted plan
                        try {
                          await WorkoutService.deletePlan(fetchedPlan.id);
                          console.log('[PlanDetail] Deleted corrupted plan:', fetchedPlan.id);
                        } catch (error) {
                          console.error('[PlanDetail] Error deleting corrupted plan:', error);
                        }
                        // Navigate to plan creation
                        router.replace('/(main)/workout/plan-create');
                      }
                    },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
                setIsLoading(false);
                return;
              }
              
              if (weeklySchedule && Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
                console.log('[PlanDetail] Using weekly schedule from plan:', weeklySchedule.length, 'days');
                
                // Ensure each session has a unique ID and exercises array
                const processedSessions = weeklySchedule.map((day: any, index: number) => {
                  if (!day) return null;
                  
                  // Ensure day has exercises array
                  const exercises = Array.isArray(day.exercises) 
                    ? day.exercises.map((ex: any, exIndex: number) => ({
                        id: ex.id || `ex-${index}-${exIndex}`,
                        name: ex.name || 'Exercise',
                        sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                        reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                        rest: ex.rest || ex.restBetweenSets || '60s',
                        restBetweenSets: ex.restBetweenSets || ex.rest || '60s'
                      }))
                    : [];
                  
                  return {
                    id: day.id || `session-${index + 1}`,
                    day: day.day || day.dayName || `Day ${index + 1}`,
                    focus: day.focus || day.dayName || 'Workout',
                    exercises
                  };
                }).filter((session): session is WorkoutSession => session !== null);
                
                setSessions(processedSessions);
              } else {
                console.log('[PlanDetail] No weekly schedule found in plan, attempting to reconstruct from database');
                
                // Try to reconstruct weekly schedule from database sessions
                try {
                  const reconstructedSessions = await WorkoutService.getSessionsForPlan(fetchedPlan.id);
                  if (reconstructedSessions && reconstructedSessions.length > 0) {
                    console.log('[PlanDetail] Reconstructed weekly schedule from database sessions:', reconstructedSessions.length);
                    
                    // Convert database sessions back to weekly schedule format
                    const weeklyScheduleFromDB = reconstructedSessions.map((session: any, index: number) => ({
                      id: session.id,
                      day: session.day || session.dayName || `Day ${index + 1}`,
                      focus: session.training_splits?.name || 'Workout',
                      exercises: [] // Will be populated when session is expanded
                    }));
                    
                    // Update plan with reconstructed weekly schedule
                    const updatedPlan = {
                      ...fetchedPlan,
                      weekly_schedule: weeklyScheduleFromDB,
                      weeklySchedule: weeklyScheduleFromDB
                    };
                    setPlan(updatedPlan);
                    setSessions(weeklyScheduleFromDB);
                  } else {
                    console.log('[PlanDetail] No sessions found in database either');
                    setSessions([]);
                  }
                } catch (reconstructError) {
                  console.error('[PlanDetail] Error reconstructing weekly schedule:', reconstructError);
                  setSessions([]);
                }
              }
            }
          } catch (error) {
            console.error('[PlanDetail] Error fetching sessions:', error);
            setSessions([]);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Fall back to the mock service if needed
        const mockPlan = await WorkoutService.getPlanById(planId as string);
        if (mockPlan) {
          console.log('[PlanDetail] Found plan with mock service:', mockPlan.id);
          setPlan(mockPlan);
          
          // Try to load sessions from the mock plan
          const weeklySchedule = mockPlan.weekly_schedule || mockPlan.weeklySchedule;
          if (weeklySchedule && Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
            const processedSessions = weeklySchedule.map((day: any, index: number) => {
              if (!day) return null;
              
              const exercises = Array.isArray(day.exercises) 
                ? day.exercises.map((ex: any, exIndex: number) => ({
                    id: ex.id || `ex-${index}-${exIndex}`,
                    name: ex.name || 'Exercise',
                    sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                    reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                    rest: ex.rest || ex.restBetweenSets || '60s',
                    restBetweenSets: ex.restBetweenSets || ex.rest || '60s'
                  }))
                : [];
              
              return {
                id: day.id || `session-${index + 1}`,
                day: day.day || day.dayName || `Day ${index + 1}`,
                focus: day.focus || day.dayName || 'Workout',
                exercises
              };
            }).filter((session): session is WorkoutSession => session !== null);
            
            setSessions(processedSessions);
          }
        } else {
          console.error('[PlanDetail] Plan not found:', planId);
          Alert.alert('Error', 'Could not find the workout plan.');
          router.back();
        }
      } catch (error) {
        console.error('[PlanDetail] Error loading plan:', error);
        Alert.alert('Error', 'There was a problem loading the workout plan.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPlan();
  }, [planId, router, refresh]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Reload the plan and sessions
    const loadPlan = async () => {
      if (!planId) return;
      
      try {
        setIsLoading(true);
        
        // First try to get the plan from the real service
        const fetchedPlan = await WorkoutService.getPlanById(planId as string);
        if (fetchedPlan) {
          console.log('[PlanDetail] Refreshing plan with WorkoutService:', fetchedPlan.id);
          setPlan(fetchedPlan);
          
          // Load sessions for this plan
          try {
            const realSessionData = await WorkoutService.getSessionsForPlan(fetchedPlan.id);
            if (realSessionData && realSessionData.length > 0) {
              console.log(`[PlanDetail] Refreshed ${realSessionData.length} sessions from database`);
              
              // Normalize sessions from DB format
              const normalizedSessions = await Promise.all(realSessionData.map(async (s: any) => {
                const sessionObj = {
                  id: s.id,
                  day: typeof s.day === 'string' ? s.day : `Day ${s.day_number ?? ''}`,
                  focus: s.training_splits?.name || (Array.isArray(s.training_splits?.focus_areas) ? s.training_splits?.focus_areas.join(', ') : 'Workout'),
                  exercises: [] as ExerciseSet[]
                };
                
                try {
                  // Fetch exercise sets for this session
                  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id);
                  
                  if (!isValidUUID) {
                    // For non-UUID sessions, use weekly schedule
                    const weeklySchedule = fetchedPlan.weekly_schedule || fetchedPlan.weeklySchedule;
                    if (weeklySchedule && Array.isArray(weeklySchedule)) {
                      const matchingDay = weeklySchedule.find(day => day.id === s.id);
                      if (matchingDay && matchingDay.exercises && Array.isArray(matchingDay.exercises)) {
                        sessionObj.exercises = matchingDay.exercises.map((ex: any, exIndex: number) => ({
                          id: ex.id || `ex-${s.id}-${exIndex}`,
                          name: ex.name || 'Exercise',
                          sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                          reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                          rest: ex.rest || ex.restBetweenSets || '60s',
                          restBetweenSets: ex.restBetweenSets || ex.rest || '60s'
                        }));
                      }
                    }
                  } else {
                    // For valid UUID sessions, fetch from database
                    const sets = await WorkoutService.getExerciseSetsForSession(s.id);
                    
                    if (sets && sets.length > 0) {
                      sessionObj.exercises = sets.map((set: any) => ({
                        id: set.id,
                        name: set.exercise?.name || 'Exercise',
                        sets: set.target_sets || 3,
                        reps: set.target_reps || '8-12',
                        rest: set.rest_period || '60s',
                        restBetweenSets: set.rest_period || '60s'
                      }));
                    }
                  }
                } catch (error) {
                  console.error(`[PlanDetail] Error fetching exercise sets for session ${s.id}:`, error);
                }
                
                return sessionObj;
              }));
              
              setSessions(normalizedSessions);
              
              // Update the plan's weekly schedule to match the sessions
              const updatedPlan = {
                ...fetchedPlan,
                weekly_schedule: normalizedSessions,
                weeklySchedule: normalizedSessions
              };
              setPlan(updatedPlan);
            } else {
              // If no sessions in database, try to use the weekly schedule from the plan
              const weeklySchedule = fetchedPlan.weekly_schedule || fetchedPlan.weeklySchedule;
              if (weeklySchedule && Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
                const processedSessions = weeklySchedule.map((day: any, index: number) => {
                  if (!day) return null;
                  
                  // Handle both old and new exercise structures
                  let exercises = [];
                  if (Array.isArray(day.exercises)) {
                    // Old structure: direct exercises array
                    exercises = day.exercises.map((ex: any, exIndex: number) => ({
                      id: ex.id || `ex-${index}-${exIndex}`,
                      name: ex.name || 'Exercise',
                      sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                      reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                      rest: ex.rest || ex.restBetweenSets || '60s',
                      restBetweenSets: ex.restBetweenSets || ex.rest || '60s'
                    }));
                  } else if (day.warm_up || day.main_workout || day.cool_down) {
                    // New Gemini 2.5 Flash structure: separated warm_up, main_workout, cool_down arrays
                    const allExercises = [
                      ...(day.warm_up || []),
                      ...(day.main_workout || []),
                      ...(day.cool_down || [])
                    ];
                    
                    exercises = allExercises.map((ex: any, exIndex: number) => ({
                      id: ex.id || `ex-${index}-${exIndex}`,
                      name: ex.name || ex.exercise || 'Exercise',
                      sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                      reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                      rest: ex.rest || ex.restBetweenSets || ex.rest_period || '60s',
                      restBetweenSets: ex.restBetweenSets || ex.rest || '60s',
                      type: ex.type || 'main_workout'
                    }));
                  }
                  
                  return {
                    id: day.id || `session-${index + 1}`,
                    day: day.day_name || day.day || day.dayName || `Day ${index + 1}`,
                    focus: day.focus || day.dayName || day.workout_type || 'Workout',
                    exercises
                  };
                }).filter((session): session is WorkoutSession => session !== null);
                
                setSessions(processedSessions);
              } else {
                setSessions([]);
              }
            }
          } catch (error) {
            console.error('[PlanDetail] Error refreshing sessions:', error);
            setSessions([]);
          }
        }
      } catch (error) {
        console.error('[PlanDetail] Error refreshing plan:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    await loadPlan();
    setIsRefreshing(false);
  }, [planId]);

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  function renderPlanSummary(plan: any) {
    if (!plan) return null;
    
    try {
      return (
        <ScrollView style={{ maxHeight: 300 }}>
          <Text style={styles.previewText}>Name: {plan.name || 'AI Plan'}</Text>
          <Text style={styles.previewText}>Level: {plan.training_level || 'Not specified'}</Text>
          <Text style={styles.previewText}>Fat Loss Goal: {plan.goal_fat_loss || 'Not specified'}</Text>
          <Text style={styles.previewText}>Muscle Gain Goal: {plan.goal_muscle_gain || 'Not specified'}</Text>
          <Text style={styles.previewText}>Weeks: {plan.mesocycle_length_weeks || 'Not specified'}</Text>
          
          {/* Handle both splits and weeklySchedule formats */}
          {(plan.splits || plan.weeklySchedule) && (
            <>
              <Text style={styles.previewText}>Workout Schedule:</Text>
              {Array.isArray(plan.splits) && plan.splits.map((split: any, i: number) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={[styles.previewText, { fontWeight: 'bold' }]}>
                    - {split.split || 'Workout'}: {split.focus || 'General'}
                  </Text>
                  {Array.isArray(split.exercises) && split.exercises.map((ex: any, j: number) => (
                    <Text key={j} style={[styles.previewText, { marginLeft: 12, fontSize: 14 }]}>
                      • {ex.name || 'Exercise'} ({ex.sets || 0}x{ex.reps || '0'}, Rest: {ex.restBetweenSets || 'Not specified'})
                    </Text>
                  ))}
                </View>
              ))}
              
              {Array.isArray(plan.weekly_schedule || plan.weeklySchedule) && (plan.weekly_schedule || plan.weeklySchedule).map((day: any, i: number) => {
                // Handle both data structures for preview
                console.log(`[PlanDetail] 🎯 Rendering day ${i + 1}:`, {
                  day: day.day,
                  focus: day.focus,
                  exercisesCount: day.exercises?.length || 0,
                  hasWarmUp: !!day.warm_up,
                  hasMainWorkout: !!day.main_workout,
                  hasCoolDown: !!day.cool_down
                });
                let allExercises = [];
                if (Array.isArray(day.exercises)) {
                  allExercises = day.exercises;
                } else if (day.warm_up || day.main_workout || day.cool_down) {
                  allExercises = [
                    ...(day.warm_up || []),
                    ...(day.main_workout || []),
                    ...(day.cool_down || [])
                  ];
                }
                
                return (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={[styles.previewText, { fontWeight: 'bold' }]}>
                      - {day.day || 'Day'}: {day.focus || 'General'}
                    </Text>
                    {allExercises.map((ex: any, j: number) => (
                      <Text key={j} style={[styles.previewText, { marginLeft: 12, fontSize: 14 }]}>
                        • {ex.name || ex.exercise || 'Exercise'} ({ex.sets || 0}x{ex.reps || '0'})
                      </Text>
                    ))}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      );
    } catch (error) {
      console.error('[PREVIEW] Error rendering plan summary:', error);
      return (
        <View style={{ padding: 16 }}>
          <Text style={styles.previewText}>Plan preview could not be loaded.</Text>
          <Text style={[styles.previewText, { fontSize: 12, color: colors.textSecondary }]}>
            The plan structure may be incomplete.
          </Text>
        </View>
      );
    }
  }

  const getSplitIcon = (name: string) => {
    const nameLower = (name || "").toLowerCase();
    if (nameLower.includes("upper")) return "arm-flex";
    if (nameLower.includes("lower")) return "human-handsdown";
    if (nameLower.includes("push")) return "weight-lifter";
    if (nameLower.includes("pull")) return "arm-flex";
    if (nameLower.includes("leg")) return "human-handsdown";
    if (nameLower.includes("core")) return "stomach";
    if (nameLower.includes("cardio")) return "run-fast";
    if (nameLower.includes("full")) return "human-male";
    return "dumbbell";
  };

  const getSplitImage = (name: string) => {
    const nameLower = (name || "").toLowerCase();
    
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
 
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 1],
    extrapolate: 'clamp',
  });

  // Compute rest days - handle bodybuilder authentic splits vs regular 7-day plans
  const restDaysCount = useMemo(() => {
    const weeklySource: any[] =
      (Array.isArray(sessions) && sessions.length > 0)
        ? sessions as any[]
        : (Array.isArray((plan as any)?.weekly_schedule) && (plan as any).weekly_schedule.length > 0)
          ? (plan as any).weekly_schedule
          : (Array.isArray((plan as any)?.weeklySchedule) ? (plan as any).weeklySchedule : []);

    console.log('[REST DAYS DEBUG] Weekly source:', {
      sourceName: Array.isArray(sessions) && sessions.length > 0 ? 'sessions' : 'weekly_schedule',
      sourceLength: weeklySource.length,
      fullSource: weeklySource.map(day => ({
        day: day.day,
        focus: day.focus,
        exercisesLength: day.exercises?.length || 0,
        dayObj: day
      }))
    });

    // 🏆 FOR BODYBUILDER AUTHENTIC SPLITS: Count explicit rest days
    const planName = (plan as any)?.name || '';
    const isBodybuilderPlan = planName.includes('(Authentic Training Split)');
    
    if (isBodybuilderPlan) {
      // For bodybuilder plans, count days that are explicitly marked as rest
      const restDaysInSchedule = weeklySource.reduce((count, day) => {
        const dayText = String(day?.day || '').toLowerCase();
        const focusText = String(day?.focus || '').toLowerCase();
        const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
        
        // A day is a rest day if it has no exercises OR is explicitly labeled as rest
        const isRestDay = exercises.length === 0 || 
                          dayText.includes('rest') || 
                          focusText.includes('rest') ||
                          focusText.includes('off');
        
        return count + (isRestDay ? 1 : 0);
      }, 0);
      
      console.log('[REST DAYS DEBUG] Bodybuilder plan - restDaysInSchedule:', restDaysInSchedule);
      return restDaysInSchedule;
    } else {
      // 📅 FOR REGULAR PLANS: Count actual rest days instead of assuming 7-day week
      const trainingDaysCount = weeklySource.reduce((count, day) => {
        const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
        const dayText = String(day?.day || '').toLowerCase();
        const focusText = String(day?.focus || '').toLowerCase();
        
        // A day is a training day ONLY if it has exercises AND is not explicitly marked as rest
        const isTraining = exercises.length > 0 && 
                          !dayText.includes('rest') && 
                          !focusText.includes('rest') &&
                          !focusText.includes('off');
        return count + (isTraining ? 1 : 0);
      }, 0);

      // Count actual rest days instead of using formula
      const restDaysInSchedule = weeklySource.reduce((count, day) => {
        const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
        const dayText = String(day?.day || '').toLowerCase();
        const focusText = String(day?.focus || '').toLowerCase();
        
        // A day is a rest day if it has no exercises OR is explicitly labeled as rest
        const isRestDay = exercises.length === 0 || 
                          dayText.includes('rest') || 
                          focusText.includes('rest') ||
                          focusText.includes('off');
        
        return count + (isRestDay ? 1 : 0);
      }, 0);

      // If the schedule has fewer than 7 days, add the missing days as rest days
      const missingDays = Math.max(0, 7 - weeklySource.length);

      console.log('[REST DAYS DEBUG] Regular plan - trainingDaysCount:', trainingDaysCount, 'restDaysInSchedule:', restDaysInSchedule, 'totalDays:', weeklySource.length, 'missingDays:', missingDays);
      return Math.max(0, restDaysInSchedule + missingDays);
    }
  }, [sessions, plan]);

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
              <Text style={styles.loadingText}>Loading your workout plan...</Text>
              <Text style={styles.loadingSubText}>Preparing your fitness journey</Text>
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
              <Text style={styles.loadingText}>Plan not found.</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(main)/workout/plans', params: { refresh: 'true' } })} style={styles.backButton}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.backButtonGradient}
                >
                  <Text style={styles.backButtonText}>Go Back</Text>
                </LinearGradient>
              </TouchableOpacity>
          </View>
      )
  }

  // Classic layout (previous frame) — keep simple header and cards list
  const USE_CLASSIC_LAYOUT = false;
  if (USE_CLASSIC_LAYOUT) {
    return (
      <View style={styles.classicContainer}>
        <StatusBar style="light" />
        <View style={[styles.classicHeader, { paddingTop: insets.top + 8 }]}>
          <IconButton
            icon="arrow-left"
            iconColor={colors.white}
            size={24}
            onPress={() => {
              try {
                router.push({ pathname: '/(main)/workout/plans', params: { refresh: 'true' } });
              } catch {
                router.back();
              }
            }}
          />
          <Text style={styles.classicTitle}>{plan?.name || 'Workout Plan'}</Text>
          <View style={{ flexDirection: 'row' }}>
            {!plan?.is_active && (
              <IconButton
                icon="star-outline"
                iconColor={colors.primary}
                size={22}
                onPress={handleActivatePlan}
              />
            )}
            <IconButton
              icon="delete-outline"
              iconColor={colors.error}
              size={22}
              onPress={confirmDeletePlan}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.classicContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            // Check if ALL sessions are empty (corrupted plan)
            const allSessionsEmpty = sessions.length > 0 && sessions.every(s => 
              !s.exercises || s.exercises.length === 0
            );
            
            if (sessions.length === 0 || allSessionsEmpty) {
              console.log('[PlanDetail] 🔴 CORRUPTED PLAN DETECTED in UI:', {
                sessionCount: sessions.length,
                allSessionsEmpty,
                sessionsSample: sessions.slice(0, 2).map(s => ({
                  id: s.id,
                  day: s.day,
                  exerciseCount: s.exercises?.length || 0
                }))
              });
              
              return (
                <View style={styles.emptyStateContainer}>
                  <Icon name="alert-circle-outline" size={64} color="#FF6B6B" />
                  <Text style={styles.emptyStateTitle}>Corrupted Plan Data</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    All exercises in this workout plan are empty. This may be caused by a bug in an older version.{'\n\n'}
                    Please delete this plan and generate a new AI plan.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.regenerateButton, { backgroundColor: '#FF6B6B', marginBottom: 12 }]}
                    onPress={async () => {
                      try {
                        await WorkoutService.deletePlan(plan?.id || planId as string);
                        router.replace('/(main)/workout/plans');
                      } catch (error) {
                        console.error('Error deleting plan:', error);
                        router.replace('/(main)/workout/plans');
                      }
                    }}
                  >
                    <Text style={styles.regenerateButtonText}>Delete This Plan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.regenerateButton}
                    onPress={() => router.replace('/(main)/workout/plan-create')}
                  >
                    <Text style={styles.regenerateButtonText}>Create New AI Plan</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            
            return sessions.map((session, index) => {
              const isRestDay = !session.exercises || session.exercises.length === 0 ||
                (session.day && typeof session.day === 'string' && session.day.toLowerCase().includes('rest'));
              return (
                <View key={session.id} style={styles.classicSessionCard}>
                  <View style={styles.classicSessionHeader}>
                    <Text style={styles.classicSessionTitle}>
                      {session.day || `Day ${index + 1}`} · {isRestDay ? 'Rest' : (session.focus || 'Workout')}
                    </Text>
                  </View>

                  {isRestDay ? (
                    <View style={styles.restDayContainer}>
                      <Icon name="sleep" size={28} color={colors.secondary} />
                      <Text style={styles.restDayTitleExpanded}>Rest Day</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 8 }}>
                      {session.exercises.map((exercise, idx) => (
                        <View key={exercise.id} style={styles.classicExerciseItem}>
                          <View style={styles.exerciseIconContainer}>
                            <Text style={styles.exerciseNumber}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                            <View style={styles.exerciseMetrics}>
                              <View style={styles.metric}>
                                <Icon name="repeat" size={14} color={colors.primary} />
                                <Text style={styles.metricText}>{exercise.sets} sets</Text>
                              </View>
                              <View style={styles.metric}>
                                <Icon name="sync" size={14} color={colors.primary} />
                                <Text style={styles.metricText}>{exercise.reps} reps</Text>
                              </View>
                              <View style={styles.metric}>
                                <Icon name="timer-outline" size={14} color={colors.primary} />
                                <Text style={styles.metricText}>{exercise.rest} rest</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {!isRestDay && (
                    <TouchableOpacity
                      style={[styles.startButtonContainer, { marginTop: 8 }]}
                      onPress={() => router.push({
                        pathname: `/(main)/workout/session/${session.id}`,
                        params: { sessionTitle: session.focus, fallbackExercises: JSON.stringify(session.exercises || []) }
                      })}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={styles.startButton}
                      >
                        <Icon name="play-circle-outline" size={20} color={colors.white} style={styles.startButtonIcon} />
                        <Text style={styles.startButtonText}>Start Workout</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              );
            });
          })()}
        </ScrollView>
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

      {/* Animated header blur */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={100} style={styles.blurHeader}>
          <View style={[styles.quickHeader, { paddingTop: insets.top + 16 }]}>
            <IconButton
              icon="arrow-left"
              iconColor={colors.white}
              size={24}
          onPress={() => {
            console.log('Back button pressed in workout plan detail');
            try {
              router.push({
                pathname: '/(main)/workout/plans',
                params: { refresh: 'true' }
              });
            } catch (error) {
              console.error('Error navigating back:', error);
              router.back();
            }
          }}
        />
            <Text style={styles.headerTitle}>{plan?.name || 'Workout Plan'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="delete-outline"
                iconColor={colors.error}
                size={24}
                onPress={confirmDeletePlan}
              />
            </View>
          </View>
        </BlurView>
      </Animated.View>

      <Animated.ScrollView 
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary}
            progressBackgroundColor="rgba(255,255,255,0.1)"
          />
        }
      >
        <Animated.View style={[
          {
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
          }
        ]}>
        
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.titleGlow}>
              <View style={styles.titleDateContainer}>
                <Icon name="calendar-check" size={18} color={colors.primary} />
                <Text style={styles.titleDate}>YOUR WEEKLY SPLITS</Text>
              </View>
              <Text style={styles.titleMain}>{plan?.name || 'Custom Plan'}</Text>
              <Text style={styles.titleDescription}>
                Your personalized workout schedule designed for maximum results
              </Text>
              <View style={styles.titleAccent} />
            </View>
          </View>

          {/* Rest Days Notice (orange) under plan name, above workout days */}
          {(restDaysCount ?? 0) >= 0 && (
            <View style={styles.restNoticeContainer}>
              <LinearGradient
                colors={[
                  'rgba(255, 107, 53, 0.25)',
                  'rgba(255, 107, 53, 0.15)'
                ]}
                style={styles.restNoticeGradient}
              >
                <View style={styles.restNoticeIconWrap}>
                  <Icon name="sleep" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.restNoticeTitle}>Rest days this week</Text>
                  <Text style={styles.restNoticeCount}><Text style={styles.restNoticeNumber}>{restDaysCount}</Text> day{restDaysCount === 1 ? '' : 's'}</Text>
                  <Text style={styles.restNoticeSub}>Recovery fuels progress. Keep them sacred.</Text>
                </View>
                <View style={styles.restNoticeBadge}>
                  <Icon name="calendar-week" size={16} color={colors.white} />
                </View>
              </LinearGradient>
            </View>
          )}
        
          {/* Workout Sessions */}
          {sessions.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle}>No sessions yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Your plan was created, but no sessions were loaded. Here is a quick preview:
              </Text>
              {renderPlanSummary(plan)}
            </View>
          )}
        {(() => {
          const restDaysSessions = sessions.filter(s => !s.exercises || s.exercises.length === 0 || (s.day && typeof s.day === 'string' && s.day.toLowerCase().includes('rest')));
          console.log('[REST DAYS RENDER DEBUG]', {
            totalSessions: sessions.length,
            restDaysInSessions: restDaysSessions.length,
            calculatedRestDaysCount: restDaysCount,
            restDaysSessions: restDaysSessions.map(s => ({ day: s.day, focus: s.focus, exercisesLength: s.exercises?.length || 0 }))
          });
          return sessions.map((session, index) => {
            // Check if this is a rest day
            const isRestDay = !session.exercises || session.exercises.length === 0 ||
                            (session.day && typeof session.day === 'string' && session.day.toLowerCase().includes('rest'));

            return (
              <Animated.View
              key={session.id}
                style={[
                  {
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
                  },
                  { marginBottom: 20 }
                ]}
              >
                <TouchableOpacity
              onPress={() => toggleSession(session.id)}
                  activeOpacity={0.8}
                >
                                   <View style={styles.sessionCard}>
                     <ImageBackground
                       source={{ uri: getSplitImage(session.focus || "") }}
                       style={styles.sessionCardBackground}
                       imageStyle={styles.sessionCardImage}
                     >
                                           <LinearGradient
                         colors={[
                           'rgba(0,0,0,0.2)',
                           'rgba(0,0,0,0.4)',
                           'rgba(0,0,0,0.7)'
                         ]}
                         style={styles.cardOverlay}
                       />

                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionIconContainer}>
                      <Icon
                        name={isRestDay ? 'sleep' : getSplitIcon(session.focus || "")}
                        size={22}
                        color={isRestDay ? colors.secondary : colors.primary}
                      />
                    </View>

                                              <Text style={styles.sessionName}>
                          {isRestDay ? 'Rest Day' : (session.focus || `Split ${index + 1}`)}
                        </Text>

                    <IconButton
                      icon={expandedSession === session.id ? 'chevron-up' : 'chevron-down'}
                      size={22}
                          iconColor={colors.white}
                          style={styles.sessionToggle}
                    />
                  </View>
                    </ImageBackground>
                  </View>
                </TouchableOpacity>

                {expandedSession === session.id && (
                  <View style={styles.exerciseContainer}>
                  <BlurView intensity={60} style={styles.exerciseBlur}>
                    <LinearGradient
                      colors={[colors.card, colors.cardLight]}
                      style={styles.exerciseGradient}
                    >
                    {isRestDay ? (
                      <View style={styles.restDayContainer}>
                        <View style={styles.restDayContent}>
                          <Icon name="sleep" size={32} color={colors.secondary} />
                          <Text style={styles.restDayTitleExpanded}>Rest Day</Text>
                          <Text style={styles.restDayDescription}>
                            Take today to recover, relax, and let your muscles rebuild stronger.
                          </Text>
                          <Text style={styles.restDayTip}>
                            💡 Tip: Light walking or stretching is okay, but avoid intense exercise.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      session.exercises?.map((exercise, idx) => (
                        <View key={exercise.id} style={styles.exerciseItem}>
                          <View style={styles.exerciseIconContainer}>
                            <Text style={styles.exerciseNumber}>{idx + 1}</Text>
                          </View>

                          <View style={styles.exerciseDetails}>
                            <View style={styles.exerciseNameRow}>
                              <Text style={styles.exerciseName}>{exercise.name}</Text>

                              {editingExercise !== exercise.id && (
                                <IconButton
                                  icon="pencil"
                                  size={16}
                                  iconColor={colors.primary}
                                  onPress={() => handleEditExercise(
                                    session.id,
                                    exercise.id,
                                    exercise.sets,
                                    exercise.reps,
                                    exercise.rest,
                                    exercise.name
                                  )}
                                />
                              )}
                            </View>

                            {editingExercise === exercise.id ? (
                              <View style={styles.editContainer}>
                                <View style={styles.editRow}>
                                  <Text style={styles.editLabel}>Name:</Text>
                                  <TextInput
                                    value={editedName || ''}
                                    onChangeText={setEditedName}
                                    style={styles.editInput}
                                    mode="outlined"
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
                                <View style={styles.editRow}>
                                  <Text style={styles.editLabel}>Sets:</Text>
                                  <TextInput
                                    value={editedSets?.toString() || ''}
                                    onChangeText={(text) => setEditedSets(parseInt(text) || 0)}
                                    keyboardType="numeric"
                                    style={styles.editInput}
                                    mode="outlined"
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
                                <View style={styles.editRow}>
                                  <Text style={styles.editLabel}>Reps:</Text>
                                  <TextInput
                                    value={editedReps || ''}
                                    onChangeText={setEditedReps}
                                    style={styles.editInput}
                                    mode="outlined"
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
                                <View style={styles.editRow}>
                                  <Text style={styles.editLabel}>Rest:</Text>
                                  <TextInput
                                    value={editedRest || ''}
                                    onChangeText={setEditedRest}
                                    style={styles.editInput}
                                    mode="outlined"
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
                                <View style={styles.editButtons}>
                                    <TouchableOpacity
                                    onPress={cancelEdit}
                                    style={styles.cancelButton}
                                    >
                                      <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                    onPress={handleSaveExerciseChanges}
                                      style={styles.saveButtonContainer}
                                    >
                                      <LinearGradient
                                        colors={[colors.primary, colors.primaryDark]}
                                    style={styles.saveButton}
                                  >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                      </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                              </View>
                            ) : (
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
                                      <Text style={styles.metricText}>{exercise.sets} sets</Text>
                                    </View>
                                    <View style={styles.metric}>
                                      <Icon name="sync" size={14} color={colors.primary} />
                                      <Text style={styles.metricText}>{exercise.reps} reps</Text>
                                    </View>
                                    <View style={styles.metric}>
                                      <Icon name="timer-outline" size={14} color={colors.primary} />
                                      <Text style={styles.metricText}>{exercise.rest} rest</Text>
                                    </View>
                                  </>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      ))
                    )}

                      {!isRestDay && (
                        <TouchableOpacity
                          style={styles.startButtonContainer}
                        onPress={() => router.push({
                          pathname: `/(main)/workout/session/${session.id}`,
                          params: { sessionTitle: session.focus, fallbackExercises: JSON.stringify(session.exercises || []) }
                        })}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.primaryDark]}
                            style={styles.startButton}
                          >
                            <Icon name="play-circle-outline" size={20} color={colors.white} style={styles.startButtonIcon} />
                            <Text style={styles.startButtonText}>Start Workout</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </LinearGradient>
                  </BlurView>
                  </View>
                )}


            </Animated.View>
        );
        });
        })()}
        </Animated.View>
      </Animated.ScrollView>

      


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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    flex: 1,
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
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
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
  restNoticeContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  restNoticeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12
  },
  restNoticeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4
  },
  restNoticeTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  restNoticeCount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2
  },
  restNoticeNumber: {
    color: colors.primary,
  },
  restNoticeSub: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2
  },
  restNoticeBadge: {
    marginLeft: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.35)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyStateContainer: {
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  regenerateButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  regenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionCard: {
    height: 80,
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
  sessionCardBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  sessionCardImage: {
    borderRadius: 20,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sessionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sessionToggle: {
    margin: 0,
  },
  exerciseContainer: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  exerciseBlur: {
    borderRadius: 16,
  },
  exerciseGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
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
  exerciseNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  exerciseMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
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
  startButtonContainer: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButtonIcon: {
    marginRight: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  editContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  editLabel: {
    width: 50,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  editInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelButton: {
    marginRight: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  previewBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  previewBannerText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  previewBannerButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewBannerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  previewBannerButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  previewButtonInline: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  previewButtonInlineGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  previewButtonInlineText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  previewText: {
    color: colors.text,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '500',
  },
  restDayContainer: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  restDayBlur: {
    borderRadius: 16,
  },
  restDayGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  restDayContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  restDayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    marginTop: 12,
    marginBottom: 8,
  },
  restDayTitleExpanded: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  restDayDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  restDayTip: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  classicContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  classicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  classicTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textAlign: 'center'
  },
  classicContent: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  classicSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16
  },
  classicSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  classicSessionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  classicExerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12
  },
  applyBtnContainer: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  stickyNoticeWrapper: {
    backgroundColor: 'rgba(18,18,18,0.95)',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
}); 