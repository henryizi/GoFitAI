/**
 * PROGRESSION INSIGHTS DASHBOARD
 * AI-powered insights showing performance trends, plateaus,
 * and adaptive recommendations for continuous progress.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ProgressionService, { 
  PerformanceInsight, 
  PlateauAlert,
  ProgressionRecommendation 
} from '../../../src/services/workout/ProgressionService';
import { supabase } from '../../../src/services/supabase/client';
import MuscleGroupRadarChart from '../../../src/components/workout/MuscleGroupRadarChart';

const { width: screenWidth } = Dimensions.get('window');

// Clean color palette
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#EF4444',
  white: '#FFFFFF',
};

interface PlateauAlertDisplay {
  exerciseName: string;
  weeksStalled: number;
  recommendedAction: string;
}

export default function ProgressionInsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [plateaus, setPlateaus] = useState<PlateauAlertDisplay[]>([]);
  const [overallStatus, setOverallStatus] = useState<'excellent' | 'good' | 'attention' | 'critical'>('good');
  const [displayUnit, setDisplayUnit] = useState<'kg' | 'lbs'>('kg');
  const [muscleGroupRatios, setMuscleGroupRatios] = useState({
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
    core: 0,
  });
  
  // Cache refs to prevent unnecessary refetches
  const lastFetchTime = useRef<number>(0);
  const cachedInsights = useRef<PerformanceInsight[]>([]);
  const cachedPlateaus = useRef<PlateauAlertDisplay[]>([]);
  const cachedRatios = useRef(muscleGroupRatios);
  const isFetching = useRef<boolean>(false);
  const CACHE_DURATION = 10000; // 10 seconds cache (longer for progression data)

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const progressingCount = insights.filter(i => i.performanceStatus === 'progressing').length;
    const totalCount = insights.length;
    
    let greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    let message = '';
    
    if (totalCount === 0) {
      message = "Complete some workouts to see your progression insights.";
    } else if (progressingCount >= totalCount * 0.7) {
      message = "Outstanding progress! You're crushing your goals.";
    } else if (plateaus.length > 0) {
      message = `${plateaus.length} exercise${plateaus.length > 1 ? 's' : ''} need attention. Let's optimize!`;
    } else {
      message = "Tracking your performance trends and progress.";
    }
    
    return { greeting, message };
  }, [insights, plateaus]);

  // Conversion functions
  const convertKgToLbs = (kg: number): number => kg * 2.20462;
  const formatWeight = (weightKg: number, unit: 'kg' | 'lbs'): number => {
    if (unit === 'lbs') {
      return Math.round(convertKgToLbs(weightKg) * 10) / 10;
    }
    return Math.round(weightKg * 10) / 10;
  };

  useEffect(() => {
    loadInsights();
    loadMuscleGroupRatios();
  }, [loadInsights, loadMuscleGroupRatios]);

  const loadMuscleGroupRatios = useCallback(async () => {
    if (!user?.id) return;

    // Check cache
    const now = Date.now();
    if (cachedRatios.current && Object.values(cachedRatios.current).some(v => v > 0) && (now - lastFetchTime.current) < CACHE_DURATION) {
      setMuscleGroupRatios(cachedRatios.current);
      return;
    }

    try {
      // Only fetch recent workout history (last 90 days) and limit results
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      // Fetch only exercise names, not full exercises_data (much smaller payload)
      const { data: workoutHistory, error } = await supabase
        .from('workout_history')
        .select('exercises_data')
        .eq('user_id', user.id)
        .not('exercises_data', 'is', null)
        .gte('completed_at', ninetyDaysAgo.toISOString())
        .order('completed_at', { ascending: false })
        .limit(100); // Limit to last 100 workouts

      if (error) {
        console.error('Error fetching workout history for muscle groups:', error);
        return;
      }

      if (!workoutHistory || workoutHistory.length === 0) {
        return;
      }

      // Count exercises by muscle group
      const muscleGroupCounts: { [key: string]: number } = {
        chest: 0,
        back: 0,
        legs: 0,
        shoulders: 0,
        arms: 0,
        core: 0,
      };

      // Helper function to normalize muscle group names
      const normalizeMuscleGroup = (mg: string): string => {
        const normalized = mg.toLowerCase().trim();
        if (normalized.includes('chest') || normalized.includes('pectoral') || normalized.includes('pec')) {
          return 'chest';
        }
        if (normalized.includes('back') || normalized.includes('lat') || normalized.includes('rhomboid') || normalized.includes('trap')) {
          return 'back';
        }
        if (normalized.includes('leg') || normalized.includes('quad') || normalized.includes('hamstring') || normalized.includes('glute') || normalized.includes('calf')) {
          return 'legs';
        }
        if (normalized.includes('shoulder') || normalized.includes('delt')) {
          return 'shoulders';
        }
        if (normalized.includes('arm') || normalized.includes('bicep') || normalized.includes('tricep') || normalized.includes('forearm')) {
          return 'arms';
        }
        if (normalized.includes('core') || normalized.includes('abs') || normalized.includes('abdominal') || normalized.includes('oblique')) {
          return 'core';
        }
        return '';
      };

      // Get all unique exercise names first
      const exerciseNames = new Set<string>();
      workoutHistory.forEach((workout) => {
        const exercisesData = workout.exercises_data as any[];
        if (!Array.isArray(exercisesData)) return;
        exercisesData.forEach((exercise: any) => {
          const name = exercise.exercise_name || exercise.name;
          if (name) exerciseNames.add(name);
        });
      });

      // Fetch muscle groups from exercises table
      const exerciseNameArray = Array.from(exerciseNames);
      const exerciseMuscleGroupMap = new Map<string, string[]>();
      
      if (exerciseNameArray.length > 0) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('name, muscle_groups')
          .in('name', exerciseNameArray);

        if (!exercisesError && exercisesData) {
          exercisesData.forEach((ex: any) => {
            if (ex.muscle_groups && Array.isArray(ex.muscle_groups)) {
              exerciseMuscleGroupMap.set(ex.name, ex.muscle_groups);
            }
          });
        }
      }

      // Process each workout
      workoutHistory.forEach((workout) => {
        const exercisesData = workout.exercises_data as any[];
        if (!Array.isArray(exercisesData)) return;

        exercisesData.forEach((exercise: any) => {
          const exerciseName = exercise.exercise_name || exercise.name;
          let muscleGroups = exercise.muscle_groups || exercise.muscleGroups || [];
          
          // If no muscle groups in exercise data, try to get from exercises table
          if ((!muscleGroups || muscleGroups.length === 0) && exerciseName) {
            muscleGroups = exerciseMuscleGroupMap.get(exerciseName) || [];
          }
          
          if (Array.isArray(muscleGroups) && muscleGroups.length > 0) {
            // Count each muscle group (an exercise can target multiple groups)
            muscleGroups.forEach((mg: string) => {
              const normalized = normalizeMuscleGroup(mg);
              if (normalized && muscleGroupCounts.hasOwnProperty(normalized)) {
                muscleGroupCounts[normalized]++;
              }
            });
          } else if (exerciseName) {
            // Try to infer from exercise name if muscle groups not available
            const nameLower = exerciseName.toLowerCase();
            if (nameLower.includes('chest') || (nameLower.includes('bench') && !nameLower.includes('shoulder')) || (nameLower.includes('press') && !nameLower.includes('shoulder') && !nameLower.includes('overhead'))) {
              muscleGroupCounts.chest++;
            } else if (nameLower.includes('row') || nameLower.includes('pull') || nameLower.includes('lat') || nameLower.includes('deadlift')) {
              muscleGroupCounts.back++;
            } else if (nameLower.includes('squat') || nameLower.includes('leg') || nameLower.includes('lunge') || nameLower.includes('calf')) {
              muscleGroupCounts.legs++;
            } else if (nameLower.includes('shoulder') || (nameLower.includes('press') && nameLower.includes('overhead')) || nameLower.includes('lateral raise')) {
              muscleGroupCounts.shoulders++;
            } else if (nameLower.includes('curl') || nameLower.includes('tricep') || nameLower.includes('bicep')) {
              muscleGroupCounts.arms++;
            } else if (nameLower.includes('crunch') || nameLower.includes('plank') || nameLower.includes('sit-up') || nameLower.includes('abs')) {
              muscleGroupCounts.core++;
            }
          }
        });
      });

      // Calculate ratios (0-10 scale) - normalize based on the maximum count
      const maxCount = Math.max(...Object.values(muscleGroupCounts), 1);
      const ratios = {
        chest: maxCount > 0 ? (muscleGroupCounts.chest / maxCount) * 10 : 0,
        back: maxCount > 0 ? (muscleGroupCounts.back / maxCount) * 10 : 0,
        legs: maxCount > 0 ? (muscleGroupCounts.legs / maxCount) * 10 : 0,
        shoulders: maxCount > 0 ? (muscleGroupCounts.shoulders / maxCount) * 10 : 0,
        arms: maxCount > 0 ? (muscleGroupCounts.arms / maxCount) * 10 : 0,
        core: maxCount > 0 ? (muscleGroupCounts.core / maxCount) * 10 : 0,
      };

      setMuscleGroupRatios(ratios);
      cachedRatios.current = ratios;
    } catch (error) {
      console.error('Error calculating muscle group ratios:', error);
    }
  }, [user?.id]);

  const loadInsights = useCallback(async () => {
    if (!user?.id || isFetching.current) return;

    // Check cache
    const now = Date.now();
    if (cachedInsights.current.length > 0 && (now - lastFetchTime.current) < CACHE_DURATION) {
      setInsights(cachedInsights.current);
      setPlateaus(cachedPlateaus.current);
      setLoading(false);
      return;
    }

    // Show cached data immediately if available
    if (cachedInsights.current.length > 0) {
      setInsights(cachedInsights.current);
      setPlateaus(cachedPlateaus.current);
      setLoading(false);
    }

    isFetching.current = true;
    if (cachedInsights.current.length === 0) {
      setLoading(true);
    }

    try {
      // 第1步：调用ProgressionService获取完整的progression overview
      const overview = await ProgressionService.getProgressionOverview(user.id);

      // 第2步：更新insights数据
      setInsights(overview.insights);
      cachedInsights.current = overview.insights;

      // 第3步：更新plateaus数据，转换格式
      const formattedPlateaus = overview.plateaus.map((p) => ({
        exerciseName: p.exerciseName,
        weeksStalled: p.weeksWithoutProgress,
        recommendedAction: p.recommendedAction,
      }));
      setPlateaus(formattedPlateaus);
      cachedPlateaus.current = formattedPlateaus;
      lastFetchTime.current = Date.now();

      // 第4步：根据实际数据计算overall status
      const progressingCount = overview.insights.filter(
        (i) => i.performanceStatus === 'progressing'
      ).length;
      const plateauedCount = formattedPlateaus.length;
      const totalExercises = overview.insights.length;

      if (totalExercises === 0) {
        setOverallStatus('good');
      } else if (progressingCount >= totalExercises * 0.7) {
        setOverallStatus('excellent');
      } else if (plateauedCount >= totalExercises * 0.5) {
        setOverallStatus('attention');
      } else if (plateauedCount >= totalExercises * 0.3) {
        setOverallStatus('attention');
      } else {
        setOverallStatus('good');
      }

      console.log('[ProgressionInsights] Loaded data:', {
        insights: overview.insights.length,
        plateaus: formattedPlateaus.length,
        recommendations: overview.recommendations.length,
      });

    } catch (error: any) {
      console.error('[ProgressionInsights] Error loading:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      const isNetworkError = errorMessage.includes('Network error') || errorMessage.includes('Unable to connect');
      
      Alert.alert(
        'Loading Failed',
        isNetworkError
          ? 'Unable to connect to the server. Please check your internet connection and try again.'
          : `Unable to load progression data: ${errorMessage}. Please try again later.`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetching.current = false;
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    lastFetchTime.current = 0; // Force refresh
    loadInsights();
    loadMuscleGroupRatios();
  }, [loadInsights, loadMuscleGroupRatios]);

  const getStatusConfig = (status: string) => {
    const configs = {
      progressing: { color: '#22C55E', icon: 'trending-up', label: 'Improving' },
      plateaued: { color: '#FF9500', icon: 'minus', label: 'Plateaued' },
      regressing: { color: '#EF4444', icon: 'trending-down', label: 'Declining' },
      maintaining: { color: '#6B7280', icon: 'minus', label: 'Steady' },
    };
    return configs[status] || configs.maintaining;
  };

  const renderInsightCard = (insight: PerformanceInsight, index: number) => {
    const config = getStatusConfig(insight.performanceStatus);
    
    return (
      <View key={index} style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Text style={styles.insightExercise} numberOfLines={1}>{insight.exerciseName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${config.color}15` }]}>
            <Icon name={config.icon} size={12} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {formatWeight(insight.metrics.estimatedOneRM, displayUnit)}{displayUnit}
            </Text>
            <Text style={styles.metricLabel}>Est. 1RM</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { 
              color: insight.metrics.volumeChange > 0 ? colors.success : 
                     insight.metrics.volumeChange < 0 ? colors.error : colors.text 
            }]}>
              {insight.metrics.volumeChange > 0 ? '+' : ''}{insight.metrics.volumeChange}%
            </Text>
            <Text style={styles.metricLabel}>Volume</Text>
          </View>
        </View>
        
        {insight.recommendation && (
          <View style={styles.recommendationRow}>
            <Icon name="lightbulb-on-outline" size={14} color={colors.primary} />
            <Text style={styles.recommendationText} numberOfLines={2}>{insight.recommendation}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAvatarContainer}>
            <Icon name="chart-line" size={32} color={colors.primary} />
          </View>
          <Text style={styles.loadingText}>Analyzing your performance...</Text>
        </View>
      </View>
    );
  }

  const progressingCount = insights.filter(i => i.performanceStatus === 'progressing').length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
              <Icon name="arrow-left" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/workout/progression-analytics')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="chart-bar" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/workout/history')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="history" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setDisplayUnit(displayUnit === 'kg' ? 'lbs' : 'kg')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="scale" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>{displayUnit.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{insights.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{progressingCount}</Text>
            <Text style={styles.statLabel}>Improving</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: plateaus.length > 0 ? colors.warning : colors.text }]}>
              {plateaus.length}
            </Text>
            <Text style={styles.statLabel}>Plateaus</Text>
          </View>
        </View>

        {/* Empty State */}
        {insights.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="dumbbell" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyDescription}>
              Complete some workouts to see your progression insights and performance trends.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(main)/workout/plans')}
              style={styles.emptyActionButton}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.emptyActionGradient}
              >
                <Icon name="plus" size={18} color={colors.white} />
                <Text style={styles.emptyActionText}>Start Workout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Plateau Alerts */}
        {plateaus.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Plateau Alerts</Text>
            {plateaus.map((plateau, index) => (
              <View key={index} style={styles.plateauCard}>
                <View style={styles.plateauHeader}>
                  <Text style={styles.plateauExercise}>{plateau.exerciseName}</Text>
                  <View style={styles.plateauBadge}>
                    <Text style={styles.plateauBadgeText}>{plateau.weeksStalled}w stalled</Text>
                  </View>
                </View>
                <Text style={styles.plateauTip}>💡 {plateau.recommendedAction}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Muscle Group Chart */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Muscle Balance</Text>
            <View style={styles.chartCard}>
              <MuscleGroupRadarChart data={muscleGroupRatios} />
            </View>
          </View>
        )}

        {/* Performance Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Analysis</Text>
            {insights.slice(0, 10).map((insight, index) => renderInsightCard(insight, index))}
            {insights.length > 10 && (
              <Text style={styles.moreText}>+ {insights.length - 10} more exercises</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
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
    width: (screenWidth - 40 - 24) / 4,
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

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 16,
  },

  // Plateau Card
  plateauCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  plateauHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plateauExercise: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
  },
  plateauBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  plateauBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  plateauTip: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Chart Card
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },

  // Insight Card
  insightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightExercise: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  metricDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  moreText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

