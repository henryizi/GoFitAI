import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot from 'react-native-view-shot';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { WorkoutHistoryService, SessionDetails } from '../../../../src/services/workout/WorkoutHistoryService';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ContentSafetyWarning from '../../../../src/components/legal/ContentSafetyWarning';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../../src/hooks/useAuth';
import { typography } from '../../../../src/styles/fonts';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Weight conversion utilities
const convertKgToLbs = (kg: number): number => kg * 2.20462;
const formatWeightForDisplay = (weightKg: number | null, preferredUnit: 'kg' | 'lbs'): string => {
  if (weightKg === null) return '—';
  
  if (preferredUnit === 'lbs') {
    const lbs = convertKgToLbs(weightKg);
    return `${Math.round(lbs)} lbs`;
  } else {
    return `${weightKg.toFixed(1)} kg`;
  }
};

// Premium dark theme colors with proper typing for gradients
const colors = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  primaryDark: '#E55A2B',
  primaryGradient: ['#FF6B35', '#FF8F65'] as const,
  primaryAlpha: 'rgba(255, 107, 53, 0.15)',
  secondaryAlpha: 'rgba(255, 143, 101, 0.1)',
  background: '#121212',
  backgroundDark: '#0A0A0A',
  backgroundGradient: ['#000000', '#121212'] as const,
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  surfaceGradient: ['rgba(28, 28, 30, 0.8)', 'rgba(44, 44, 46, 0.9)'] as const,
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  border: 'rgba(84, 84, 88, 0.6)',
  borderLight: 'rgba(84, 84, 88, 0.3)',
  borderLighter: 'rgba(84, 84, 88, 0.15)',
  shadow: '#000000',
  success: '#34C759',
  warning: '#FFCC00',
  error: '#FF3B30',
  info: '#5AC8FA',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassStrong: 'rgba(255, 255, 255, 0.1)',
  cardGradient: ['rgba(28, 28, 30, 0.7)', 'rgba(44, 44, 46, 0.8)'] as const,
  cardGlow: 'rgba(255, 107, 53, 0.1)',
};

export default function WorkoutHistoryDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [showContentWarning, setShowContentWarning] = useState(false);
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<ViewShot>(null);
  const scrollY = new Animated.Value(0);
  const { user, profile } = useAuth();
  
  // Get user's preferred weight unit, default to kg
  const preferredWeightUnit = profile?.weight_unit_preference || 'kg';
  
  // Header animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const headerScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0.97, 1],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      setLoading(true);
      try {
        console.log(`[WorkoutHistoryDetail] Loading details for session: ${sessionId}`);
        const data = await WorkoutHistoryService.getSessionDetails(sessionId);
        
        if (data) {
          console.log(`[WorkoutHistoryDetail] Successfully loaded session with ${data.exercises?.length || 0} exercises`);
          console.log(`[WorkoutHistoryDetail] Loaded session details for ID: ${sessionId}`);
          setDetails(data);
        } else {
          console.error(`[WorkoutHistoryDetail] Failed to load session details`);
        }
      } catch (error) {
        console.error(`[WorkoutHistoryDetail] Error loading session details:`, error);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSplitGradient = (): readonly [string, string] => colors.cardGradient;

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  const getExerciseTypeIcon = (name?: string) => {
    if (!name) return 'dumbbell';
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bench') || lowerName.includes('chest') || lowerName.includes('fly')) return 'human-male';
    if (lowerName.includes('row') || lowerName.includes('pull') || lowerName.includes('back')) return 'human-handsdown';
    if (lowerName.includes('squat') || lowerName.includes('leg') || lowerName.includes('lunge')) return 'human-male';
    if (lowerName.includes('shoulder') || lowerName.includes('press')) return 'arm-flex';
    if (lowerName.includes('bicep') || lowerName.includes('curl')) return 'arm-flex';
    if (lowerName.includes('tricep') || lowerName.includes('extension')) return 'arm-flex';
    if (lowerName.includes('abs') || lowerName.includes('crunch')) return 'stomach';
    if (lowerName.includes('cardio') || lowerName.includes('run')) return 'run-fast';
    
    return 'dumbbell';
  };

  const generateWorkoutFilename = () => {
    if (!details?.completed_at) return 'GoFitAI-Workout.png';
    
    // Format date as YYYY-MM-DD
    const date = new Date(details.completed_at);
    const dateStr = date.toISOString().split('T')[0];
    
    // Get primary exercise name for context (first exercise)
    const primaryExercise = details.exercises[0]?.exercise_name;
    let exerciseContext = '';
    
    if (primaryExercise) {
      // Clean exercise name for filename (remove special characters)
      const cleanName = primaryExercise
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      exerciseContext = `-${cleanName}`;
    }
    
    return `GoFitAI-Workout-${dateStr}${exerciseContext}.png`;
  };

  const shareWorkout = async () => {
    // Show content safety warning first
    setShowContentWarning(true);
  };

  const proceedWithWorkoutSharing = async () => {
    setShowContentWarning(false);
    
    try {
      if (!viewShotRef.current) return;
      const uri = await viewShotRef.current.capture?.();
      if (!uri) return;
      
      const filename = generateWorkoutFilename();
      
      // Create a copy with the proper filename in the document directory
      const documentDirectory = FileSystem.documentDirectory || '';
      const newUri = `${documentDirectory}${filename}`;
      
      // Copy the file with the new name
      await FileSystem.copyAsync({
        from: uri,
        to: newUri
      });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Share the renamed file
        await Sharing.shareAsync(newUri, { 
          dialogTitle: 'Share your workout', 
          mimeType: 'image/png',
          UTI: 'public.png'
        });
        
        // Clean up the temporary file after sharing
        try {
          await FileSystem.deleteAsync(newUri, { idempotent: true });
        } catch (cleanupError) {
          console.log('[WorkoutHistoryDetail] Cleanup warning:', cleanupError);
        }
      } else {
        // Fallback: open the image or alert with location
        console.log('[WorkoutHistoryDetail] Sharing not available, image at:', newUri);
      }
    } catch (e) {
      console.error('[WorkoutHistoryDetail] Share failed', e);
    }
  };

  const cancelWorkoutSharing = () => {
    setShowContentWarning(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <LinearGradient
          colors={colors.backgroundGradient}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.loadingContent,
            { 
              opacity: new Animated.Value(1),
              transform: [{ scale: new Animated.Value(1) }]
            }
          ]}
        >
          <Icon 
            name="dumbbell" 
            size={80} 
            color={colors.primary} 
            style={styles.loadingLogo}
          />
          <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Loading workout details...</Text>
        </Animated.View>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar style="light" />
        <LinearGradient
          colors={colors.backgroundGradient}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.emptyContent,
            { 
              opacity: new Animated.Value(1),
              transform: [{ scale: new Animated.Value(1) }]
            }
          ]}
        >
          <View style={styles.emptyIconContainer}>
            <Icon name="alert-circle-outline" size={60} color={colors.primary} style={styles.emptyIcon} />
            <View style={styles.emptyIconGlow} />
          </View>
          <Text style={styles.emptyTitle}>Session Not Found</Text>
          <Text style={styles.emptyText}>The workout session details could not be loaded</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient & image */}
      <LinearGradient
        colors={colors.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={{uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'}}
        style={[
          styles.backgroundImage,
          {
            position: 'absolute',
            top: 0,
            left: 0,
          }
        ] as any}
        blurRadius={2}
      />
      <View style={styles.backgroundOverlay} />
      
      {/* Floating Header Background with Blur */}
      <Animated.View 
        style={[
          styles.headerBackground,
          { 
            opacity: headerOpacity, 
            transform: [{ scale: headerScale }],
            paddingTop: insets.top
          }
        ]}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.headerBackgroundGradient} />
      </Animated.View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => {
            console.log('[WorkoutHistoryDetail] Back button pressed - navigating to workout history list');
            router.push('/(main)/workout/history');
          }} 
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Hidden share card to capture as an image */}
        <View style={{ position: 'absolute', left: -10000 }}>
          <ViewShot ref={viewShotRef} style={styles.shareCardContainer}>
            <LinearGradient colors={getSplitGradient()} style={styles.shareCardContent}>
              {/* Accent orbs */}
              <LinearGradient
                colors={["rgba(255,107,53,0.18)", "rgba(255,107,53,0.06)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shareAccentOrbOne}
              />
              <LinearGradient
                colors={["rgba(90,200,250,0.16)", "rgba(90,200,250,0.04)"]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.shareAccentOrbTwo}
              />

              <View style={styles.shareHeaderRow}>
                <Text style={styles.shareTitle}>Workout Summary</Text>
              </View>
              <Text style={styles.shareSubtitle}>{formatDate(details.completed_at || '')}</Text>
              <View style={styles.shareStatsRow}>
                <View style={styles.shareStatBox}>
                  <View style={styles.shareStatIconCircle}>
                    <LinearGradient colors={["rgba(255,107,53,0.25)", "rgba(255,107,53,0.1)"]} style={styles.shareStatIconGradient}>
                      <Icon name="dumbbell" size={36} color={colors.primary} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.shareStatValue}>{details.exercises.length}</Text>
                  <Text style={styles.shareStatLabel}>Exercises</Text>
                </View>
                <View style={styles.shareStatBox}>
                  <View style={styles.shareStatIconCircle}>
                    <LinearGradient colors={["rgba(255,107,53,0.25)", "rgba(255,107,53,0.1)"]} style={styles.shareStatIconGradient}>
                      <Icon name="repeat" size={36} color={colors.primary} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.shareStatValue}>{details.exercises.reduce((t, ex) => t + ex.logs.length, 0)}</Text>
                  <Text style={styles.shareStatLabel}>Sets</Text>
                </View>
                <View style={styles.shareStatBox}>
                  <View style={styles.shareStatIconCircle}>
                    <LinearGradient colors={["rgba(255,107,53,0.25)", "rgba(255,107,53,0.1)"]} style={styles.shareStatIconGradient}>
                      <Icon name="chart-bar" size={36} color={colors.primary} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.shareStatValue}>{Math.round(details.exercises.reduce((t, ex) => t + ex.total_volume, 0))}</Text>
                  <Text style={styles.shareStatLabel}>Volume</Text>
                </View>
              </View>
              <View style={styles.shareExercisesList}>
                {details.exercises.map((ex, index) => (
                  <View 
                    key={ex.exercise_set_id} 
                    style={[
                      styles.shareExerciseRow,
                      index === details.exercises.length - 1 && styles.shareExerciseRowLast
                    ]}
                  >
                    <Text style={styles.shareExerciseName} numberOfLines={2} ellipsizeMode="tail">{ex.exercise_name}</Text>
                    <View style={styles.shareExerciseChips}>
                      <View style={styles.shareChip}>
                        <Icon name="repeat" size={26} color={colors.text} style={styles.shareChipIcon} />
                        <Text style={styles.shareChipText}>{ex.logs.length} sets</Text>
                      </View>
                      <View style={styles.shareChip}>
                        <Icon name="chart-bar" size={26} color={colors.text} style={styles.shareChipIcon} />
                        <Text style={styles.shareChipText}>{Math.round(ex.total_volume)} vol</Text>
                      </View>
                      {ex.top_set_weight != null && (
                        <View style={styles.shareChip}>
                          <Icon name="weight" size={26} color={colors.text} style={styles.shareChipIcon} />
                          <Text style={styles.shareChipText}>top {formatWeightForDisplay(ex.top_set_weight, preferredWeightUnit)}</Text>
                        </View>
                      )}
                      {ex.comparison && (
                        <View style={[styles.shareChip, ex.comparison.volume_delta >= 0 ? styles.shareChipPositive : styles.shareChipNegative]}>
                          <Icon
                            name={ex.comparison.volume_delta >= 0 ? 'trending-up' : 'trending-down'}
                            size={26}
                            color={ex.comparison.volume_delta >= 0 ? colors.success : colors.error}
                            style={styles.shareChipIcon}
                          />
                          <Text style={[styles.shareChipText, { color: ex.comparison.volume_delta >= 0 ? colors.success : colors.error }]}>
                            {ex.comparison.volume_delta >= 0 ? '+' : ''}{Math.round(ex.comparison.volume_delta)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              <Image
                source={require('../../../../assets/branding/gofitai-watermark.png')}
                style={styles.shareWatermark}
                pointerEvents="none"
                resizeMode="contain"
              />
            </LinearGradient>
          </ViewShot>
        </View>
        {/* Session Date Banner */}
        <View style={styles.dateBanner}>
          <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.dateBannerContent}>
            <Icon name="calendar-check" size={22} color={colors.primary} style={styles.dateIcon} />
            <Text style={styles.dateText}>
              {formatDate(details.completed_at || '')}
            </Text>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <BlurView intensity={15} tint="dark" style={styles.summaryCardBlur}>
            <LinearGradient
              colors={colors.surfaceGradient}
              style={styles.summaryCardGradient}
            >
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Workout Summary</Text>
                <View style={styles.summaryLine} />
              </View>
              
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient 
                      colors={['rgba(255,107,53,0.2)', 'rgba(255,107,53,0.1)']} 
                      style={styles.statIconGradient}
                    >
                      <Icon name="dumbbell" size={20} color={colors.primary} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>{details?.exercises?.length || 0}</Text>
                  <Text style={styles.statLabel}>Exercises</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient 
                      colors={['rgba(255,107,53,0.2)', 'rgba(255,107,53,0.1)']} 
                      style={styles.statIconGradient}
                    >
                      <Icon name="repeat" size={20} color={colors.primary} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>
                    {details?.exercises?.reduce((total, ex) => total + (ex.logs?.length || 0), 0) || 0}
                  </Text>
                  <Text style={styles.statLabel}>Sets</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient 
                      colors={['rgba(255,107,53,0.2)', 'rgba(255,107,53,0.1)']} 
                      style={styles.statIconGradient}
                    >
                      <Icon name="chart-bar" size={20} color={colors.primary} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>
                    {Math.round(
                      details?.exercises?.reduce((total, ex) => total + (ex.total_volume || 0), 0) || 0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Volume</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <LinearGradient 
                      colors={['rgba(255,107,53,0.2)', 'rgba(255,107,53,0.1)']} 
                      style={styles.statIconGradient}
                    >
                      <Icon name="timer-outline" size={20} color={colors.primary} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.statValue}>
                    {details?.duration_minutes != null && details.duration_minutes >= 0
                      ? details.duration_minutes >= 60
                        ? `${Math.floor(details.duration_minutes / 60)}h ${details.duration_minutes % 60}m`
                        : `${details.duration_minutes}m`
                      : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Exercises */}
        {details.exercises.map((ex, idx) => (
          <Animated.View
            key={ex.exercise_set_id}
            style={[
              styles.exerciseCard,
              { 
                opacity: new Animated.Value(1),
                transform: [
                  { translateY: new Animated.Value(0) }
                ]
              }
            ]}
          >
            <BlurView intensity={15} tint="dark" style={styles.exerciseCardBlur}>
              <LinearGradient
                colors={colors.surfaceGradient}
                style={styles.exerciseCardGradient}
              >
                {/* Exercise Header */}
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseIconContainer}>
                    <LinearGradient
                      colors={['rgba(255,107,53,0.2)', 'rgba(255,107,53,0.1)']}
                      style={styles.exerciseIconGradient}
                    >
                      <Icon 
                        name={getExerciseTypeIcon(ex.exercise_name)} 
                        size={22} 
                        color={colors.primary}
                      />
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.exerciseHeaderContent}>
                    <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
                    {details?.plan_id != null && (
                      <Text style={styles.exerciseTarget}>
                        Target: {ex.target_sets} sets × {ex.target_reps} reps
                      </Text>
                    )}
                  </View>
                </View>

                {/* Performance Stats */}
                <View style={styles.performanceContainer}>
                  <View style={styles.performanceStats}>
                    <View style={styles.performanceItem}>
                      <Text style={styles.performanceLabel}>Volume</Text>
                      <Text style={styles.performanceValue}>{Math.round(ex.total_volume)}</Text>
                    </View>
                    
                    <View style={styles.performanceDivider} />
                    
                    <View style={styles.performanceItem}>
                      <Text style={styles.performanceLabel}>Top Set</Text>
                      <Text style={styles.performanceValue}>
                        {formatWeightForDisplay(ex.top_set_weight, preferredWeightUnit)}
          </Text>
                    </View>
                    
          {ex.comparison && (
                      <>
                        <View style={styles.performanceDivider} />
                        <View style={styles.performanceItem}>
                          <Text style={styles.performanceLabel}>Progress</Text>
                          <Text style={[
                            styles.performanceValue, 
                            {color: ex.comparison.volume_delta >= 0 ? colors.success : colors.error}
                          ]}>
                            {ex.comparison.volume_delta > 0 ? '+' : ''}{Math.round(ex.comparison.volume_delta)}
            </Text>
                          <Icon 
                            name={ex.comparison.volume_delta >= 0 ? 'trending-up' : 'trending-down'}
                            size={16} 
                            color={ex.comparison.volume_delta >= 0 ? colors.success : colors.error}
                            style={styles.trendIcon}
                          />
                        </View>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Sets Table */}
                <View style={styles.setsContainer}>
                  <View style={styles.setsHeaderRow}>
                    <Text style={styles.setsTitle}>Sets</Text>
                    <Text style={styles.setsTotalText}>
                      {ex.logs.length} {ex.logs.length === 1 ? 'set' : 'sets'} completed
                    </Text>
                  </View>
                  
          {ex.logs.length === 0 ? (
                    <View style={styles.noSetsContainer}>
                      <Icon name="alert-circle-outline" size={24} color={colors.textSecondary} />
                      <Text style={styles.noSetsText}>No sets logged for this exercise</Text>
                    </View>
                  ) : (
                    <View style={styles.setsTableContainer}>
                      <View style={styles.setsTableHeader}>
                        <Text style={[styles.setsTableHeaderText, { flex: 0.2 }]}>#</Text>
                        <Text style={[styles.setsTableHeaderText, { flex: 0.3 }]}>Reps</Text>
                        <Text style={[styles.setsTableHeaderText, { flex: 0.3 }]}>Weight ({preferredWeightUnit})</Text>
                        <Text style={[styles.setsTableHeaderText, { flex: 0.4 }]}>Time</Text>
                      </View>
                      
                      {ex.logs.map((log, logIdx) => (
                        <View key={log.id} style={styles.setRow}>
                          <View style={[styles.setCell, { flex: 0.2 }]}>
                            <View style={styles.setNumberContainer}>
                              <Text style={styles.setNumberText}>{logIdx + 1}</Text>
                            </View>
                          </View>
                          <Text style={[styles.setRowText, styles.setRepsText, { flex: 0.3 }]}>{log.actual_reps}</Text>
                          <Text style={[styles.setRowText, { flex: 0.3 }]}>
                            {formatWeightForDisplay(log.actual_weight, preferredWeightUnit)}
                </Text>
                          <Text style={[styles.setRowText, styles.setTimeText, { flex: 0.4 }]}>
                            {formatTime(log.completed_at)}
                </Text>
              </View>
                      ))}
                    </View>
          )}
                </View>
              </LinearGradient>
            </BlurView>
          </Animated.View>
        ))}
        
        {/* Share & Export Button */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={shareWorkout}>
            <LinearGradient
              colors={colors.primaryGradient}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="share-variant" size={16} color={colors.text} style={styles.actionButtonIcon} />
              <Text style={styles.actionButtonText}>Share Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Content Safety Warning Modal */}
      {showContentWarning && (
        <ContentSafetyWarning
          onProceed={proceedWithWorkoutSharing}
          onCancel={cancelWorkoutSharing}
          variant="sharing"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    width: '100%',
    height: 300,
    opacity: 0.3,
  } as any,
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
  headerBackgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLighter,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120, // Increased padding to account for bottom navigation bar (60px + safe area) + extra space
  },
  dateBanner: {
    height: 60,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLighter,
  },
  dateBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: '100%',
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  summaryCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLighter,
  },
  summaryCardGradient: {
    padding: 20,
    borderRadius: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: 12,
  },
  summaryLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLighter,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 8,
  },
  statIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
    borderRadius: 22,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderLighter,
    marginHorizontal: 8,
  },
  exerciseCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  exerciseCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLighter,
  },
  exerciseCardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
  },
  exerciseIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
    borderRadius: 24,
  },
  exerciseHeaderContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseTarget: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  performanceContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
  },
  performanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  performanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderLighter,
    marginHorizontal: 8,
  },
  trendIcon: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLighter,
    marginBottom: 16,
  },
  setsContainer: {
    marginTop: 8,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  setsTotalText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  noSetsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  noSetsText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  setsTableContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  setsTableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLighter,
  },
  setsTableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 50, 50, 0.3)',
    alignItems: 'center',
  },
  setCell: {
    justifyContent: 'center',
  },
  setNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  setRowText: {
    fontSize: 15,
    color: colors.text,
  },
  setRepsText: {
    fontWeight: '600',
  },
  setTimeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  actionButtonContainer: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 24,
    opacity: 0.8,
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,107,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    opacity: 0.8,
  },
  emptyIconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 200,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  shareCardContainer: {
    width: 1080,
    minHeight: 1350,
  },
  shareCardContent: {
    backgroundColor: '#0E0E10',
    padding: 64,
    borderRadius: 48,
    overflow: 'hidden',
    position: 'relative',
  },
  shareAccentOrbOne: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    top: -140,
    right: -120,
    opacity: 1,
    transform: [{ rotate: '15deg' }],
  },
  shareAccentOrbTwo: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    bottom: -120,
    left: -100,
    opacity: 1,
    transform: [{ rotate: '-10deg' }],
  },
  shareHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 24,
  },
  shareTitle: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  shareSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 40,
    marginBottom: 48,
  },
  // shareLogo removed from header to avoid duplicate watermark in capture
  shareStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  shareStatIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  shareStatIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareStatBox: {
    width: (1080 - 64 * 2 - 40 * 2) / 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 40,
    borderRadius: 32,
    alignItems: 'center',
  },
  shareStatValue: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '800',
  },
  shareStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 32,
    marginTop: 8,
  },
  shareExercisesList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 32,
    padding: 32,
    marginBottom: 40,
  },
  shareExerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  shareExerciseRowLast: {
    borderBottomWidth: 0,
  },
  shareExerciseName: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    flex: 1,
    marginRight: 16,
  },
  shareExerciseChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  shareChipIcon: {
    marginRight: 8,
  },
  shareChipText: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  shareChipPositive: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderColor: 'rgba(52,199,89,0.35)',
  },
  shareChipNegative: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderColor: 'rgba(255,59,48,0.35)',
  },
  shareWatermark: {
    position: 'absolute',
    width: 220,
    height: 220,
    opacity: 0.45,
    top: 64,
    right: 48,
  },
}); 