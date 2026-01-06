/**
 * DETAILED PROGRESSION ANALYTICS
 * Comprehensive analytics dashboard with charts, trends,
 * and historical performance data visualization
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';

const screenWidth = Dimensions.get('window').width;

// Clean color palette
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  card: 'rgba(255, 255, 255, 0.04)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#EF4444',
  white: '#FFFFFF',
  background: '#000000',
};

interface ExerciseDataPoint {
  date: string;
  estimated1RM: number;
  volume: number;
  avgRPE: number;
  maxWeight: number;
  totalReps: number;
}

interface ExerciseAnalytics {
  exerciseName: string;
  dataPoints: ExerciseDataPoint[];
  current1RM: number;
  peak1RM: number;
  totalVolume: number;
  avgVolume: number;
  improvementPercent: number;
}

export default function ProgressionAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<ExerciseAnalytics[]>([]);
  const [allExercises, setAllExercises] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayUnit, setDisplayUnit] = useState<'kg' | 'lbs'>('kg');

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    const selectedData = analytics.find(a => a.exerciseName === selectedExercise);
    let message = '';
    
    if (analytics.length === 0) {
      message = "Complete workouts to see detailed analytics.";
    } else if (selectedData && selectedData.improvementPercent > 0) {
      message = `You've improved ${selectedData.improvementPercent}% on ${selectedExercise}!`;
    } else if (selectedData) {
      message = `Tracking your ${selectedExercise} performance.`;
    } else {
      message = "Select an exercise to view detailed analytics.";
    }
    
    return { greeting, message };
  }, [analytics, selectedExercise]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics().finally(() => setRefreshing(false));
  };

  // Conversion functions
  const convertLbsToKg = (lbs: number): number => lbs * 0.453592;
  const convertKgToLbs = (kg: number): number => kg * 2.20462;
  
  // Format weight for display based on selected unit
  const formatWeight = (weightKg: number, unit: 'kg' | 'lbs'): number => {
    if (unit === 'lbs') {
      return Math.round(convertKgToLbs(weightKg) * 10) / 10;
    }
    return Math.round(weightKg * 10) / 10;
  };

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
    }
  }, [user?.id, timeRange]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery) return allExercises;
    return allExercises.filter(ex => 
      ex.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allExercises, searchQuery]);

  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Calculate date cutoff based on time range
      const cutoffDate = new Date();
      switch (timeRange) {
        case '7d':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(cutoffDate.getDate() - 90);
          break;
        case 'all':
          cutoffDate.setFullYear(2020); // Very old date to get all data
          break;
      }

      // Fetch workout history
      const { data: historyData, error } = await supabase
        .from('workout_history')
        .select('id, completed_at, exercises_data')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', cutoffDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) {
        console.error('[Analytics] Error fetching history:', error);
        setAnalytics([]);
        return;
      }

      if (!historyData || historyData.length === 0) {
        console.log('[Analytics] No workout history found');
        setAnalytics([]);
        return;
      }

      console.log('[Analytics] Found', historyData.length, 'workouts');

      // Process data by exercise
      const exerciseMap = new Map<string, ExerciseDataPoint[]>();

      for (const workout of historyData as any[]) {
        let exercisesData = (workout as any).exercises_data;
        
        // Handle different data structures
        if (!exercisesData) continue;
        
        // If exercises_data is an object with an "exercises" key
        if (typeof exercisesData === 'object' && !Array.isArray(exercisesData) && exercisesData.exercises) {
          exercisesData = exercisesData.exercises;
        }
        
        if (!Array.isArray(exercisesData)) {
          console.log('[Analytics] Skipping workout with invalid exercises_data format:', workout.id);
          continue;
        }

        const workoutDate = new Date((workout as any).completed_at).toISOString().split('T')[0];

        for (const exercise of exercisesData) {
          const exerciseName = exercise.exercise_name || exercise.name || 'Exercise';
          if (!exerciseName || exerciseName === 'Exercise') continue;

          let sets: { reps: number; weight: number; rpe?: number | null }[] = [];
          
          // Format 1: exercise.sets is an array (regular workouts)
          if (Array.isArray(exercise.sets)) {
            sets = exercise.sets
              .filter((s: any) => (s.reps > 0 || s.actual_reps > 0) && (s.weight > 0 || s.actual_weight > 0))
              .map((s: any) => {
                const weight = s.weight || s.actual_weight || 0;
                // Check if we have original_weight (user's actual input) and weight_unit
                // If original_weight exists and weight_unit is lbs, convert to kg
                // Otherwise, assume weight is already in kg (from database storage)
                let weightInKg = weight;
                if (s.original_weight !== null && s.original_weight !== undefined && s.weight_unit === 'lbs') {
                  weightInKg = convertLbsToKg(s.original_weight);
                } else if (s.weight_unit === 'lbs' && !s.original_weight) {
                  // If weight_unit is lbs but no original_weight, the stored weight might be in lbs
                  // But typically DB stores in kg, so this is a fallback
                  weightInKg = convertLbsToKg(weight);
                }
                // If weight_unit is kg or not specified, weight is already in kg
                return {
                  reps: s.reps || s.actual_reps || 0,
                  weight: weightInKg, // Always store in kg for calculations
                  rpe: s.rpe ?? s.actual_rpe ?? null,
                };
              });
          }
          // Format 2: exercise.logs is an array (custom workouts and database fallback)
          else if (Array.isArray(exercise.logs)) {
            sets = exercise.logs
              .filter((log: any) => (log.actual_reps > 0 || log.reps > 0) && (log.actual_weight > 0 || log.weight > 0))
              .map((log: any) => {
                const weight = log.actual_weight || log.weight || 0;
                // Database typically stores weights in kg after conversion
                // But check original_weight if available
                let weightInKg = weight;
                if (log.original_weight !== null && log.original_weight !== undefined && log.weight_unit === 'lbs') {
                  weightInKg = convertLbsToKg(log.original_weight);
                } else if (log.weight_unit === 'lbs' && !log.original_weight) {
                  // Fallback: if weight_unit is lbs but no original_weight, assume weight needs conversion
                  weightInKg = convertLbsToKg(weight);
                }
                // Otherwise, weight is already in kg
                return {
                  reps: log.actual_reps || log.reps || 0,
                  weight: weightInKg, // Always store in kg for calculations
                  rpe: log.actual_rpe ?? log.rpe ?? null,
                };
              });
          }
          // Format 3: exercise has reps/weights arrays (legacy format)
          else if (Array.isArray(exercise.reps) && Array.isArray(exercise.weights)) {
            sets = exercise.reps
              .map((reps: number, index: number) => ({
                reps: reps || 0,
                weight: exercise.weights[index] || 0,
                rpe: null,
              }))
              .filter((s: any) => s.reps > 0 && s.weight > 0);
          }

          if (sets.length === 0) {
            console.log('[Analytics] Skipping exercise with no valid sets:', exerciseName, 'Format:', Object.keys(exercise));
            continue;
          }

          // Calculate metrics for this workout
          const maxWeight = Math.max(...sets.map((s) => s.weight));
          const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
          const volume = sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
          const avgRPE = sets
            .filter((s) => s.rpe != null)
            .reduce((sum, s, _, arr) => sum + (s.rpe || 0) / arr.length, 0);

          // Estimate 1RM using Epley formula: 1RM = weight × (1 + reps/30)
          const bestSet = sets.reduce((best, s) => {
            const est1RM = s.weight * (1 + s.reps / 30);
            const bestEst1RM = best.weight * (1 + best.reps / 30);
            return est1RM > bestEst1RM ? s : best;
          }, sets[0]);
          const estimated1RM = bestSet.weight * (1 + bestSet.reps / 30);

          if (!exerciseMap.has(exerciseName)) {
            exerciseMap.set(exerciseName, []);
          }

          exerciseMap.get(exerciseName)!.push({
            date: workoutDate,
            estimated1RM: Math.round(estimated1RM * 10) / 10,
            volume: Math.round(volume),
            avgRPE: avgRPE > 0 ? Math.round(avgRPE * 10) / 10 : 0,
            maxWeight: maxWeight,
            totalReps: totalReps,
          });
        }
      }

      // Convert to analytics format
      const analyticsArray: ExerciseAnalytics[] = [];
      const exerciseNames: string[] = [];

      for (const [exerciseName, dataPoints] of exerciseMap.entries()) {
        if (dataPoints.length < 2) continue; // Need at least 2 data points

        // Sort by date
        dataPoints.sort((a, b) => a.date.localeCompare(b.date));

        // Calculate summary metrics
        const current1RM = dataPoints[dataPoints.length - 1].estimated1RM;
        const peak1RM = Math.max(...dataPoints.map((d) => d.estimated1RM));
        const totalVolume = dataPoints.reduce((sum, d) => sum + d.volume, 0);
        const avgVolume = totalVolume / dataPoints.length;

        // Calculate improvement
        const first1RM = dataPoints[0].estimated1RM;
        const improvementPercent =
          first1RM > 0 ? ((current1RM - first1RM) / first1RM) * 100 : 0;

        analyticsArray.push({
          exerciseName,
          dataPoints,
          current1RM,
          peak1RM,
          totalVolume,
          avgVolume,
          improvementPercent: Math.round(improvementPercent * 10) / 10,
        });

        exerciseNames.push(exerciseName);
      }

      // Sort by current 1RM (descending)
      analyticsArray.sort((a, b) => b.current1RM - a.current1RM);

      console.log('[Analytics] Processed', analyticsArray.length, 'exercises with analytics');
      console.log('[Analytics] Exercise names:', exerciseNames);

      setAnalytics(analyticsArray);
      setAllExercises(exerciseNames);
      if (exerciseNames.length > 0 && !selectedExercise) {
        setSelectedExercise(exerciseNames[0]);
      }
    } catch (error) {
      console.error('[Analytics] Error loading analytics:', error);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAnalytics = (): ExerciseAnalytics | null => {
    if (!selectedExercise) return null;
    return analytics.find((a) => a.exerciseName === selectedExercise) || null;
  };

  const render1RMChart = (data: ExerciseAnalytics) => {
    if (data.dataPoints.length < 2) return null;

    const recentPoints = data.dataPoints.slice(-6); // Show last 6 data points
    const chartData = {
      labels: recentPoints.map((d) => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: recentPoints.map((d) => formatWeight(d.estimated1RM, displayUnit)),
          color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Estimated 1RM ({displayUnit})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={screenWidth - 56}
            height={220}
            yAxisSuffix={displayUnit === 'kg' ? '' : ''}
            chartConfig={{
              backgroundColor: '#1C1C1E',
              backgroundGradientFrom: '#1C1C1E',
              backgroundGradientTo: '#1C1C1E',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
              labelColor: () => '#FFFFFF',
              style: { borderRadius: 12 },
              propsForDots: { r: '6', strokeWidth: '2', stroke: '#FF6B35', fill: '#FF6B35' },
              propsForBackgroundLines: { stroke: 'rgba(255, 255, 255, 0.1)', strokeDasharray: '' },
              propsForLabels: { fontSize: 11, fontWeight: '600' },
            }}
            bezier
            style={styles.chart}
            fromZero={false}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            segments={4}
          />
        </ScrollView>
      </View>
    );
  };

  const renderVolumeChart = (data: ExerciseAnalytics) => {
    if (data.dataPoints.length < 2) return null;

    const recentPoints = data.dataPoints.slice(-6);
    const chartData = {
      labels: recentPoints.map((d) => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: recentPoints.map((d) => Math.round(formatWeight(d.volume, displayUnit))),
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Volume ({displayUnit})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={chartData}
            width={screenWidth - 56}
            height={220}
            yAxisSuffix=""
            yAxisLabel=""
            chartConfig={{
              backgroundColor: '#1C1C1E',
              backgroundGradientFrom: '#1C1C1E',
              backgroundGradientTo: '#1C1C1E',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              labelColor: () => '#FFFFFF',
              style: { borderRadius: 12 },
              propsForBackgroundLines: { stroke: 'rgba(255, 255, 255, 0.1)', strokeDasharray: '' },
              propsForLabels: { fontSize: 11, fontWeight: '600' },
              barPercentage: 0.6,
            }}
            style={styles.chart}
            fromZero={true}
            withInnerLines={true}
            showValuesOnTopOfBars={true}
          />
        </ScrollView>
      </View>
    );
  };

  const selectedData = getSelectedAnalytics();

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAvatarContainer}>
            <Icon name="chart-line" size={32} color={colors.primary} />
          </View>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  const renderExerciseSelectorModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.exerciseListItem,
                  selectedExercise === item && styles.exerciseListItemActive
                ]}
                onPress={() => {
                  setSelectedExercise(item);
                  setIsModalVisible(false);
                }}
              >
                <Text style={[
                  styles.exerciseListItemText,
                  selectedExercise === item && styles.exerciseListItemTextActive
                ]}>
                  {item}
                </Text>
                {selectedExercise === item && (
                  <Icon name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>No exercises found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderExerciseSelectorModal()}
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
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.coachAvatar}
            >
              <Icon name="fire" size={26} color={colors.white} />
            </LinearGradient>
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
            <Text style={styles.coachMessage} numberOfLines={2}>{getAIGreeting.message}</Text>
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
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="dumbbell" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>Exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setDisplayUnit(displayUnit === 'kg' ? 'lbs' : 'kg')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="scale" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>{displayUnit.toUpperCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="refresh" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === range && styles.timeRangeTextActive,
                ]}
              >
                {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercise Selector */}
        {allExercises.length > 0 && (
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.selectorContent}>
              <View style={styles.selectorIconContainer}>
                <Icon name="dumbbell" size={20} color={colors.primary} />
              </View>
              <Text style={styles.selectorValue} numberOfLines={1}>
                {selectedExercise || 'Select an exercise'}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Empty State */}
        {analytics.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="chart-line" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyDescription}>
              Complete more workouts to see detailed analytics and progression charts.
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

        {/* Analytics Content */}
        {selectedData && (
          <>
            {/* Summary Stats */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatWeight(selectedData.current1RM, displayUnit)}
                </Text>
                <Text style={styles.statLabel}>Current 1RM</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {formatWeight(selectedData.peak1RM, displayUnit)}
                </Text>
                <Text style={styles.statLabel}>Peak 1RM</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, {
                  color: selectedData.improvementPercent > 0 ? colors.success :
                         selectedData.improvementPercent < 0 ? colors.error : colors.text
                }]}>
                  {selectedData.improvementPercent > 0 ? '+' : ''}{selectedData.improvementPercent}%
                </Text>
                <Text style={styles.statLabel}>Change</Text>
              </View>
            </View>

            {/* Charts */}
            {render1RMChart(selectedData)}
            {renderVolumeChart(selectedData)}

            {/* Data Table */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent History</Text>
              {selectedData.dataPoints
                .slice()
                .reverse()
                .slice(0, 5)
                .map((point, index) => (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyDate}>
                      <Text style={styles.historyDateText}>
                        {new Date(point.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.historyMetrics}>
                      <View style={styles.historyMetric}>
                        <Text style={styles.historyMetricValue}>
                          {formatWeight(point.estimated1RM, displayUnit)}
                        </Text>
                        <Text style={styles.historyMetricLabel}>1RM</Text>
                      </View>
                      <View style={styles.historyMetric}>
                        <Text style={styles.historyMetricValue}>
                          {formatWeight(point.volume, displayUnit)}
                        </Text>
                        <Text style={styles.historyMetricLabel}>Volume</Text>
                      </View>
                      <View style={styles.historyMetric}>
                        <Text style={styles.historyMetricValue}>
                          {formatWeight(point.maxWeight, displayUnit)}
                        </Text>
                        <Text style={styles.historyMetricLabel}>Max</Text>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          </>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Time Range
  timeRangeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeRangeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: colors.white,
  },

  // Selector
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectorIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },

  // Charts
  chartContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chartTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  chart: {
    marginLeft: -8,
    borderRadius: 12,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },

  // History Items
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyDate: {
    width: 50,
  },
  historyDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  historyMetrics: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  historyMetric: {
    alignItems: 'center',
  },
  historyMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  historyMetricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  exerciseListItemActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  exerciseListItemText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  exerciseListItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptyListContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyListText: {
    color: colors.textSecondary,
    fontSize: 15,
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

