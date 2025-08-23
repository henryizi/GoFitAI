import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Modal, RefreshControl, ImageBackground, Dimensions, Animated } from 'react-native';
import { Text, IconButton, Card, ActivityIndicator, Appbar, Portal, TextInput, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// Remove mock data import - using real WorkoutService only
import { WorkoutService as RealWorkoutService } from '../../../../src/services/workout/WorkoutService';
import { WorkoutLocalStore } from '../../../../src/services/workout/WorkoutLocalStore';
import { useAuth } from '../../../../src/hooks/useAuth';

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

// Use the real WorkoutService instead of mock data
const WorkoutService = RealWorkoutService;

type WorkoutPlan = { 
    id: string;
    name: string;
    weekly_schedule?: { day: string, focus: string, exercises: { name: string, sets: number, reps: string, rest: string }[] }[];
};
type TrainingSplit = { name: string };
type WorkoutSession = { id: string; day: string; focus: string; exercises: ExerciseSet[] };
type ExerciseSet = { id: string, name: string, sets: number, reps: string, rest: string };

export default function PlanDetailScreen() {
  const { planId, planObject, refresh } = useLocalSearchParams<{ planId: string, planObject?: string, refresh?: string }>();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingNewPlan, setPendingNewPlan] = useState<any>(null);

  const [chatVisible, setChatVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: 'Hi! I can help you refine your workout plan. What would you like to change or ask?' }
  ]);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editedSets, setEditedSets] = useState<number | null>(null);
  const [editedReps, setEditedReps] = useState<string | null>(null);
  const [editedRest, setEditedRest] = useState<string | null>(null);
  const [scrollY] = useState(new Animated.Value(0));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [inputFocused, setInputFocused] = useState(false);

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
      // Remove from mock store immediately for UI
      try {
        const before = mockWorkoutPlansStore.plans.length;
        mockWorkoutPlansStore.plans = mockWorkoutPlansStore.plans.filter((p: any) => p.id !== plan.id);
        const after = mockWorkoutPlansStore.plans.length;
        console.log(`[PlanDetail] Removed from mock store: ${before} -> ${after}`);
      } catch (e) {
        console.log('[PlanDetail] Failed to update mock store on delete:', e);
      }

      // Best-effort real deletion
      try {
        await RealWorkoutService.deletePlan(plan.id);
      } catch (e) {
        console.log('[PlanDetail] Real deletion failed (continuing):', e);
      }

      try {
        // New signature only needs planId; fallback to name-based deletion if id is missing
        if (plan?.id) {
          await WorkoutLocalStore.deletePlan(plan.id);
        } else {
          await WorkoutLocalStore.deletePlansByName(plan?.name);
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

  // Key for AsyncStorage
  const chatKey = `chatHistory_${plan?.id || 'unknown'}_${user?.id || 'unknown'}`;

  // Load chat history when chat modal opens
  useEffect(() => {
    if (chatVisible) {
      (async () => {
        try {
          const saved = await AsyncStorage.getItem(chatKey);
          if (saved) {
            setChatHistory(JSON.parse(saved));
          }
        } catch (e) {
          // Ignore
        }
      })();
    }
  }, [chatVisible, chatKey]);

  // Save chat history whenever it changes
  useEffect(() => {
    if (chatVisible) {
      AsyncStorage.setItem(chatKey, JSON.stringify(chatHistory)).catch(() => {});
    }
    // Auto-scroll to bottom
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chatHistory, chatVisible, chatKey]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const currentChatInput = chatInput;
    const fullChatHistory = [...chatHistory, { sender: 'user', text: currentChatInput }];

    setChatHistory(fullChatHistory);
    setChatInput('');
    setChatLoading(true);

    // Local helper to support fetch timeout via AbortController
    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(id);
      }
    };

    const CHAT_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_CHAT_TIMEOUT_MS) || 90000; // Increased to 90 seconds for AI processing

    try {
      console.log('--- SENDING CHAT TO AI ---');
      console.log('[STEP 1] Sending chat history to backend:', JSON.stringify(fullChatHistory, null, 2));

      // Resolve API base: prefer working global, then env, then production default
      const resolveApiBase = () => {
        const candidates = [
          (global as any)?.API_URL,
          process.env.EXPO_PUBLIC_API_URL,
          'https://gofitai-production.up.railway.app',
        ].filter(Boolean) as string[];
        const chosen = candidates[0];
        console.log('[WORKOUT CHAT] Resolved API base:', chosen);
        return chosen;
      };
      const apiBase = resolveApiBase();
      // const url = `${apiBase}/api/ai-chat`; // Unused variable

      let res: Response | null = null;
      let lastError: unknown = null;
      // Reduced retry logic to save API credits - only try primary base with single timeout
      const attemptTimeouts = [CHAT_TIMEOUT_MS] as const;
      const baseCandidates = [
        apiBase,
        'https://gofitai-production.up.railway.app',
      ].filter(Boolean) as string[];

      for (let attemptIndex = 0; attemptIndex < attemptTimeouts.length; attemptIndex++) {
        const timeoutMs = attemptTimeouts[attemptIndex];
        const basesToTry = attemptIndex === 0 ? [apiBase] : baseCandidates;
        for (const base of basesToTry) {
          const attemptUrl = `${base}/api/ai-chat`;
          try {
            console.log(`[WORKOUT CHAT] Attempt ${attemptIndex + 1} using base: ${base}`);
            res = await fetchWithTimeout(
              attemptUrl,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  planId: planId,
                  message: fullChatHistory[fullChatHistory.length - 1]?.text || '',
                  currentPlan: plan,
                }),
              },
              timeoutMs
            );
            console.log(`[STEP 2] Received response from backend with status:`, res.status, `(base ${base})`);
            if (base && base !== (global as any)?.API_URL) {
              (global as any).API_URL = base;
            }
            break;
          } catch (err) {
            lastError = err;
            const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.toLowerCase?.().includes('timeout'));
            console.warn(`[SEND CHAT] Attempt ${attemptIndex + 1} failed on base ${base}${isAbort ? ' due to timeout' : ''}.`, err);
            continue;
          }
        }
        if (res) break;
      }

      if (!res) throw lastError ?? new Error('Network request failed');

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[SEND CHAT] Server error (${res.status}):`, errorText);
        throw new Error(`Server error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      console.log('[STEP 3] Parsed response data:', JSON.stringify(data, null, 2));

      if (!data.success) {
        throw new Error(data.error || 'AI chat failed');
      }

      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: data.message },
      ]);
      if (data.newPlan) {
        console.log('[INFO] AI suggested a new plan.');
        setPendingNewPlan(data.newPlan);
      }
    } catch (err) {
      console.error('--- SEND CHAT FAILED ---');
      console.error('Full error object:', err);
      const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('Network request timed out') || err.message?.toLowerCase?.().includes('timeout'));
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: isTimeout ? 'Connection timed out. Ensure the server is reachable and try again.' : 'Sorry, there was a problem contacting the AI.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const [isApplyingPlan, setIsApplyingPlan] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleApplyNewPlan = async () => {

    
    if (!pendingNewPlan || isApplyingPlan) {
      console.log('[APPLY PLAN] Already applying or no plan to apply - pendingNewPlan:', !!pendingNewPlan, 'isApplyingPlan:', isApplyingPlan);
      return;
    }

    setIsApplyingPlan(true);
    
    try {
      console.log('--- APPLYING NEW PLAN ---');
      console.log('[STEP 1] Sending new plan to backend:', JSON.stringify(pendingNewPlan, null, 2));
      
      const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/save-plan`;
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: pendingNewPlan, user }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      
      console.log('[STEP 2] Received response from backend with status:', res.status);
      
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('[STEP 3] Parsed response data:', JSON.stringify(data, null, 2));

              if (data.success && data.newPlanId) {
          // Save the plan to local storage so it can be accessed immediately
          try {
            const planToSave = {
              ...pendingNewPlan,
              id: data.newPlanId,
              user_id: user?.id,
              is_active: true,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            
            await WorkoutLocalStore.savePlan(user?.id || 'unknown', planToSave);
            console.log('[APPLY PLAN] Successfully saved plan to local storage');
          } catch (localError) {
            console.error('[APPLY PLAN] Error saving to local storage:', localError);
            // Continue anyway - the plan was saved to the server
          }
          
          // Clear states first
          setPendingNewPlan(null);
          setPreviewVisible(false);
          setChatVisible(false);
          
          // Show success message first
          Alert.alert('Success!', 'Your new workout plan has been created.', [
            {
              text: 'OK',
              onPress: () => {
                // Navigate after user acknowledges the alert
                console.log('[APPLY PLAN] Navigating to new plan:', data.newPlanId);
                // Force a complete navigation to the new plan with refresh
                router.replace({
                  pathname: `/(main)/workout/plan/${data.newPlanId}`,
                  params: { refresh: Date.now().toString() }
                });
              }
            }
          ]);
        } else {
          Alert.alert('Error', data.error || 'Failed to save the new plan.');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw fetchError;
      }
    } catch (e) {
      console.error('--- APPLY PLAN FAILED ---');
      console.error('Full error object:', e);
      Alert.alert('Error', 'An unexpected error occurred while saving the plan. Please try again.');
    } finally {
      setIsApplyingPlan(false);
    }
  };

  const handleEditExercise = (sessionId: string, exerciseId: string, sets: number, reps: string, rest: string) => {
    setEditingSession(sessionId);
    setEditingExercise(exerciseId);
    setEditedSets(sets);
    setEditedReps(reps);
    setEditedRest(rest);
  };

  const handleSaveExerciseChanges = async () => {
    if (!editingSession || !editingExercise || !editedSets || !editedReps || !editedRest) return;

    const updatedSessions = sessions.map(session => {
      if (session.id === editingSession) {
        return {
          ...session,
          exercises: session.exercises.map(exercise => {
            if (exercise.id === editingExercise) {
              return {
                ...exercise,
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

    Alert.alert("Updated", "Exercise details have been updated successfully.");
  };

  const cancelEdit = () => {
    setEditingSession(null);
    setEditingExercise(null);
    setEditedSets(null);
    setEditedReps(null);
    setEditedRest(null);
  };

  const loadPlanDetails = useCallback(async () => {
    if (planObject) {
        try {
            const parsedPlan = JSON.parse(planObject);
            setPlan(parsedPlan);
        
        // Map the weekly schedule to sessions with proper typing
        const mappedSessions = Array.isArray(parsedPlan.weekly_schedule || parsedPlan.weeklySchedule)
          ? (parsedPlan.weekly_schedule || parsedPlan.weeklySchedule).map((daySchedule, index) => {
              // Ensure each session has a unique ID and exercises array
              const exercises = Array.isArray(daySchedule.exercises) 
                ? daySchedule.exercises.map((ex: any, exIndex: number) => ({
                    id: ex.id || `ex-${index}-${exIndex}`,
                    name: ex.name || ex.exercise || 'Exercise',
                    sets: typeof ex.sets === 'number' ? ex.sets : Number(ex.sets) || 3,
                    reps: typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '8-12'),
                    rest: ex.rest || ex.restBetweenSets || ex.rest_period || '60s',
                    restBetweenSets: ex.restBetweenSets || ex.rest || '60s'
                  }))
                : [];
              
              return {
                id: daySchedule.id || `session-${index}`,
                day: daySchedule.day || `Day ${index + 1}`,
                focus: daySchedule.focus || 'Workout',
                exercises
              };
            })
              : [];

            if (mappedSessions.length > 0) {
              setSessions(mappedSessions);
              return;
            }
        
            // Fallback: if weekly_schedule is missing or empty, fetch sessions by plan id
            try {
          const realSessions = await RealWorkoutService.getSessionsForPlan(parsedPlan.id || planId as string);
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
        const realPlanData = await RealWorkoutService.getPlanById(planId as string);
        if (realPlanData) {
          console.log('[PlanDetail] Found plan with RealWorkoutService:', realPlanData.id);
          setPlan(realPlanData);
          
          // Always attempt to load sessions from DB first (prefer real UUID sessions)
          try {
            const realSessionData = await RealWorkoutService.getSessionsForPlan(realPlanData.id);
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
                    const sets = await RealWorkoutService.getExerciseSetsForSession(s.id);
                    
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
              // This ensures consistency between the plan and sessions
              const updatedPlan = {
                ...realPlanData,
                weekly_schedule: normalizedSessions,
                weeklySchedule: normalizedSessions
              };
              setPlan(updatedPlan);
              
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
                day: day.day || `Day ${index + 1}`,
                focus: day.focus || 'Workout',
                exercises
              };
            }).filter((session): session is WorkoutSession => session !== null);
            
            setSessions(processedSessions);
          } else {
            console.log('[PlanDetail] No weekly schedule found in plan');
            setSessions([]);
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
        const fetchedPlan = await RealWorkoutService.getPlanById(planId as string);
        if (fetchedPlan) {
          console.log('[PlanDetail] Found plan with RealWorkoutService:', fetchedPlan.id);
          setPlan(fetchedPlan);
          setIsLoading(false);
          return;
        }
        
        // Fall back to the mock service if needed
        const mockPlan = await WorkoutService.getPlanById(planId as string);
        if (mockPlan) {
          console.log('[PlanDetail] Found plan with mock service:', mockPlan.id);
          setPlan(mockPlan);
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const initialLoad = async () => {
        setIsLoading(true);
        await loadPlanDetails();
        if (isActive) {
          setIsLoading(false);
        }
      };
      initialLoad();
      return () => { isActive = false; };
    }, [loadPlanDetails])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPlanDetails();
    setIsRefreshing(false);
  }, [loadPlanDetails]);

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  function renderPlanSummary(plan) {
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
              {Array.isArray(plan.splits) && plan.splits.map((split, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={[styles.previewText, { fontWeight: 'bold' }]}>
                    - {split.split || 'Workout'}: {split.focus || 'General'}
                  </Text>
                  {Array.isArray(split.exercises) && split.exercises.map((ex, j) => (
                    <Text key={j} style={[styles.previewText, { marginLeft: 12, fontSize: 14 }]}>
                      • {ex.name || 'Exercise'} ({ex.sets || 0}x{ex.reps || '0'}, Rest: {ex.restBetweenSets || 'Not specified'})
                    </Text>
                  ))}
                </View>
              ))}
              
              {Array.isArray(plan.weeklySchedule) && plan.weeklySchedule.map((day, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={[styles.previewText, { fontWeight: 'bold' }]}>
                    - {day.day || 'Day'}: {day.focus || 'General'}
                  </Text>
                  {Array.isArray(day.exercises) && day.exercises.map((ex, j) => (
                    <Text key={j} style={[styles.previewText, { marginLeft: 12, fontSize: 14 }]}>
                      • {ex.name || 'Exercise'} ({ex.sets || 0}x{ex.reps || '0'})
                    </Text>
                  ))}
                </View>
              ))}
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
    return "dumbbell";
  };

  const getSplitImage = (name) => {
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
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
                pathname: '/(main)/workout/plans'
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
              <IconButton
                icon="pencil"
                iconColor={colors.primary}
                size={24}
                onPress={() => console.log('Edit plan')}
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 120 }]}
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
          {/* AI Chat Button */}
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => setChatVisible(true)}
            activeOpacity={0.8}
          >
            <BlurView intensity={60} style={styles.aiButtonBlur}>
              <LinearGradient
                colors={[colors.glassStrong, colors.glass]}
                style={styles.aiButtonGradient}
        >
          <Icon name="robot-outline" size={22} color={colors.primary} style={styles.aiIcon} />
          <Text style={styles.aiButtonText}>Ask AI to Refine This Plan</Text>
                <Icon name="chevron-right" size={16} color={colors.primary} />
              </LinearGradient>
            </BlurView>
        </TouchableOpacity>
        
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
        
          {/* Workout Sessions */}
        {sessions.map((session, index) => (
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
                      name={getSplitIcon(session.focus || "")} 
                      size={22} 
                      color={colors.primary} 
                    />
                  </View>
                  
                                            <Text style={styles.sessionName}>
                        {session.focus || `Split ${index + 1}`}
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
                    {session.exercises?.map((exercise, idx) => (
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
                                  exercise.rest
                                )}
                              />
                            )}
                          </View>
                          
                          {editingExercise === exercise.id ? (
                            <View style={styles.editContainer}>
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
                          )}
                        </View>
                      </View>
                    ))}
                    
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
                    </LinearGradient>
                  </BlurView>
                  </View>
                )}
            </Animated.View>
        ))}
        </Animated.View>
      </Animated.ScrollView>

      {/* AI Chat Modal */}
      <Portal>
        <Modal
          transparent={true}
          visible={chatVisible}
          onDismiss={() => setChatVisible(false)}
          animationType="slide"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContainer, { paddingBottom: insets.bottom }]}
          >
            <View style={styles.chatWrapper}>
              <BlurView intensity={100} style={styles.chatWrapperBlur}>
                <LinearGradient
                  colors={[colors.surface, colors.surfaceLight]}
                  style={styles.chatWrapperGradient}
                >
              <View style={styles.chatHeader}>
                <Text style={styles.chatHeaderTitle}>Ask AI</Text>
                <IconButton 
                  icon="close" 
                  size={24}
                  onPress={() => setChatVisible(false)} 
                  iconColor={colors.text}
                />
              </View>

              <ScrollView
                style={styles.chatHistory}
                contentContainerStyle={styles.chatHistoryContent}
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {chatHistory.map((msg, idx) => (
                  <View key={idx} style={msg.sender === 'user' ? styles.userMsg : styles.aiMsg}>
                    <Text style={msg.sender === 'user' ? styles.userMsgText : styles.aiMsgText}>{msg.text}</Text>
                  </View>
                ))}
                {chatLoading && (
                  <View style={styles.aiMsg}>
                    <View style={styles.loadingMessageContainer}>
                      <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMessageSpinner} />
                      <Text style={styles.aiMsgText}>AI is thinking...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {pendingNewPlan && (
                  <View style={styles.previewBanner}>
                    <Text style={styles.previewBannerText}>AI has suggested a new plan!</Text>
                        <TouchableOpacity
                      onPress={() => {
                        if (pendingNewPlan) {
                          setPreviewLoading(true);
                          
                          // Navigate to preview page with the plan data
                          router.push({
                            pathname: '/workout/preview-plan',
                            params: {
                              planObject: JSON.stringify(pendingNewPlan),
                              originalPlanId: planId
                            }
                          });
                          
                          setPreviewLoading(false);
                        } else {
                          Alert.alert('Error', 'No plan available to preview.');
                        }
                      }}
                          style={styles.previewBannerButtonContainer}
                          disabled={previewLoading}
                        >
                          <LinearGradient
                            colors={previewLoading ? [colors.textSecondary, colors.textSecondary] : [colors.primary, colors.primaryDark]}
                      style={styles.previewBannerButton}
                    >
                            <Text style={styles.previewBannerButtonText}>
                              {previewLoading ? 'Loading...' : 'Preview & Apply'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                  </View>
                )}
                <View style={styles.chatInputRow}>
                  <View style={[
                    styles.chatInputContainer,
                    inputFocused && styles.chatInputContainerFocused
                  ]}>
                    <View style={styles.chatInputHeader}>
                      <Icon name="robot" size={16} color={colors.primary} />
                      <Text style={styles.chatInputLabel}>Ask AI Assistant</Text>
                    </View>
                    <TextInput
                      value={chatInput}
                      onChangeText={setChatInput}
                      placeholder="Type your request here... (e.g., 'Make it harder', 'Add more cardio', 'Change exercises')"
                      style={styles.chatInput}
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                    />
                  </View>
                  {chatLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : (
                    <IconButton
                      icon="send-circle"
                      iconColor={colors.primary}
                      size={32}
                      onPress={handleSendChat}
                      disabled={!chatInput.trim()}
                    />
                  )}
                </View>
              </View>
                </LinearGradient>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>


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
  aiButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  aiButtonBlur: {
    borderRadius: 16,
  },
  aiButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  aiIcon: {
    marginRight: 8,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginHorizontal: 12,
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  chatWrapper: {
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  chatWrapperBlur: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  chatWrapperGradient: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  chatHistory: {
    flex: 1,
  },
  chatHistoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  bottomContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 20,
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  aiMsg: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  userMsgText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  aiMsgText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  chatInputContainer: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    paddingBottom: 12,
    paddingTop: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 24,
    fontSize: 16,
    maxHeight: 180,
    minHeight: 80,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    color: colors.text,
    fontWeight: '500',
    textAlignVertical: 'top',
    includeFontPadding: false,
    textAlign: 'left',
    lineHeight: 24,
  },
  chatInputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingMessageSpinner: {
    marginRight: 4,
  },
  chatInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  chatInputLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

  previewText: {
    color: colors.text,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '500',
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
}); 