import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Dimensions, ImageBackground } from 'react-native';
import { Text, Button, ActivityIndicator, TextInput, Divider, IconButton, Avatar, ProgressBar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../../src/services/supabase/client';
import { Database } from '../../../../src/types/database';
import { ExerciseService } from '../../../../src/services/workout/ExerciseService';
import { WorkoutHistoryService } from '../../../../src/services/workout/WorkoutHistoryService';
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

const { width, height } = Dimensions.get('window');

export type ExerciseSet = Database['public']['Tables']['exercise_sets']['Row'];
export type ExerciseLogInsert = Database['public']['Tables']['exercise_logs']['Insert'];
export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];

export default function SessionExecutionScreen() {
  useEffect(() => {
    analyticsTrack('screen_view', { screen: 'workout_session' });
  }, []);

  const { sessionId, sessionTitle, fallbackExercises } = useLocalSearchParams<{ sessionId: string; sessionTitle: string; fallbackExercises?: string }>();
  const insets = useSafeAreaInsets();

  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [actualReps, setActualReps] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [exerciseMap, setExerciseMap] = useState<Record<string, { name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [resting, setResting] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const sessionStartTime = useRef(Date.now()).current;

  const handleBackButtonPress = () => {
    console.log('Back button pressed in session screen');
    Alert.alert(
      "Exit Workout?",
      "You haven't finished your workout. Are you sure you want to exit?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => {
          console.log('Exit confirmed, calling router.back()');
          try {
            router.back();
          } catch (error) {
            console.error('Navigation error:', error);
            router.push('/(main)/workout/plans');
          }
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
          // Fetch session details to get estimated calories
          const { data: sessionData, error: sessionError } = await supabase
            .from('workout_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
          
          if (!sessionError && sessionData) {
            console.log('[Session] Fetched session details:', sessionData);
            // Set estimated calories if available
            if (sessionData.estimated_calories) {
              setEstimatedCalories(sessionData.estimated_calories);
            }
          }
        } catch (e) {
          console.error('[Session] Error fetching session details:', e);
        }
      } else if (fallbackExercises) {
        // For fallback exercises, generate a random calorie estimate
        setEstimatedCalories(Math.floor(Math.random() * 200 + 200));
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
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, headerOpacity]);

  // Calculate session progress
  useEffect(() => {
    if (sets.length > 0) {
      const totalSets = sets.reduce((acc, set) => acc + set.target_sets, 0);
      const completedSets = (currentIndex > 0 ? 
        sets.slice(0, currentIndex).reduce((acc, set) => acc + set.target_sets, 0) : 0) + 
        (setNumber - 1);
      
      const newProgress = totalSets > 0 ? completedSets / totalSets : 0;
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
  }, [sets, currentIndex, setNumber, progressAnim]);

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

  const handleSetDone = async () => {
    if (!currentSet) return;
    console.log('[Session] Complete Set tapped for set', currentSet.id, 'index', currentIndex, 'setNumber', setNumber);

    // simple validation
    const repsNum = parseInt(actualReps, 10);
    const weightNum = actualWeight ? parseFloat(actualWeight) : null;

    if (isNaN(repsNum) || repsNum <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid number of reps");
      return;
    }

    // Insert log only if this is a real set (skip synthetic fallback ids)
    if (!String(currentSet.id).toString().startsWith('fallback-')) {
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
      console.log('[Session] Skipping database log for fallback exercise');
    }

    // Reset inputs
    setActualReps('');
    setActualWeight('');
    
    // Check if this is the last set of the last exercise
    const isLastSetOfLastExercise = (setNumber >= currentSet.target_sets) && (currentIndex + 1 >= sets.length);
    
    if (isLastSetOfLastExercise) {
      // Skip rest timer and go directly to workout completion
      console.log('[Session] Last set completed - finishing workout');
      
      // Mark session as completed if it's not a fallback exercise
      if (!String(currentSet.id).startsWith('fallback-')) {
        try {
          console.log(`[Session] Marking session ${sessionId} as completed`);
          
          const completedAt = new Date().toISOString();
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
            console.log('[Session] Session marked as completed successfully');
            
            // Save workout history to Supabase
            try {
              // Get user ID from session data
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
                  // Calculate workout statistics
                  const totalSets = sets.length;
                  const totalExercises = new Set(sets.map(set => set.exercise_id)).size;
                  const durationMinutes = Math.round((Date.now() - sessionStartTime.current) / 60000);
                  
                  // Save workout history entry
                  const historySaved = await WorkoutHistoryService.saveWorkoutHistory({
                    user_id: planData.user_id,
                    plan_id: sessionData.plan_id,
                    session_id: sessionId,
                    completed_at: completedAt,
                    duration_minutes: durationMinutes,
                    total_sets: totalSets,
                    total_exercises: totalExercises,
                    notes: `Completed ${totalExercises} exercises with ${totalSets} total sets`
                  });
                  
                  if (historySaved) {
                    console.log('[Session] Workout history saved successfully');
                  } else {
                    console.warn('[Session] Failed to save workout history');
                  }
                }
              }
            } catch (historyError) {
              console.error('[Session] Error saving workout history:', historyError);
            }
          }
        } catch (err) {
          console.error('[Session] Exception while updating session status:', err);
        }
      }
      
      // Show completion dialog instead of navigating to non-existent route
      showCompletionDialog();
    } else {
      // Start rest timer for non-final sets
      setResting(true);
      console.log('[Session] Rest started');
    }
  };

  const handleRestFinish = () => {
    console.log('[Session] Rest finished');
    setResting(false); // Hide the timer first

    // Advance the state - this should never reach the last set since that's handled in handleSetDone
    if (setNumber < currentSet.target_sets) {
      // Go to the next set of the same exercise
      setSetNumber(prev => prev + 1);
    } else {
      // Finished all sets for this exercise, move to the next one
      if (currentIndex + 1 < sets.length) {
        setCurrentIndex(prev => prev + 1);
        setSetNumber(1); // Reset set counter for the new exercise
      } else {
        // This should not happen anymore since last sets are handled in handleSetDone
        console.warn('[Session] Unexpected: reached last set in handleRestFinish - this should be handled in handleSetDone');
      }
    }
  };

  // Helper function to show completion dialog
  const showCompletionDialog = () => {
    Alert.alert(
      "Training Complete!", 
      `Congratulations! You have completed your workout today!\n\nEstimated calories burned: ${estimatedCalories || Math.round((sessionProgress * 100) * 2.5)}`,
      [
        { 
          text: "View History", 
          onPress: () => {
            // Force a refresh of the workout history when navigating there
            router.push({ pathname: '/(main)/workout/history', params: { refresh: 'true' } });
          },
          style: 'default'
        },
        { 
          text: "Return", 
          onPress: () => router.back(),
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
                      onPress={() => Alert.alert(
                        exerciseName,
                        "Tap to see exercise video and detailed instructions"
                      )}
                    >
                      <Icon name="information-outline" size={24} color={colors.text} />
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
                    const exerciseName = exerciseMap[currentSet.exercise_id]?.name || '';
                    const isBodyweight = isBodyweightExercise(exerciseName);
                    const canAddWeight = canUseOptionalWeight(exerciseName);
                    
                    if (isBodyweight) {
                      return (
                        <>
                          <Text style={styles.inputLabel}>
                            {canAddWeight ? 'Additional Weight (kg) - Optional' : 'Bodyweight Exercise'}
                          </Text>
                          {canAddWeight ? (
                            <>
                              <TextInput
                                mode="outlined"
                                value={actualWeight}
                                onChangeText={setActualWeight}
                                keyboardType="numeric"
                                style={styles.input}
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
                              <Text style={styles.weightHelpText}>
                                💡 Leave empty for bodyweight only. Add weight if using a belt, vest, or holding weights.
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
                          <Text style={styles.inputLabel}>Weight (kg)</Text>
                          <TextInput
                            mode="outlined"
                            value={actualWeight}
                            onChangeText={setActualWeight}
                            keyboardType="numeric"
                            style={styles.input}
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
                        </>
                      );
                    }
                  })()}
                </View>
              </View>
              
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
            
            <Text style={styles.headerTitle}>{sessionTitle || 'Workout'}</Text>
            
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
                {estimatedCalories 
                  ? `${estimatedCalories} cal` 
                  : `~${Math.round((sessionProgress * 100) * 2.5)} cal`}
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
                <Icon name="alert-circle-outline" size={48} color={colors.primary} />
                <Text style={styles.loadingText}>No exercises found</Text>
                <Text style={styles.loadingTip}>
                  This workout session doesn't have any exercises configured.
                </Text>
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
              </LinearGradient>
            </View>
          </View>
        ) : resting ? (
          renderRestTimer()
        ) : (
          renderExerciseContent()
        )}
        
        {/* Floating Action Button */}
        {!loading && !resting && (
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
    padding: 8,
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
}); 