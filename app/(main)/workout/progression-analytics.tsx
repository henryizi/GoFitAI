/**
 * ============================================================
 * DETAILED PROGRESSION ANALYTICS
 * ============================================================
 * Comprehensive analytics dashboard with charts, trends,
 * and historical performance data visualization
 * ============================================================
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
  SafeAreaView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<ExerciseAnalytics[]>([]);
  const [allExercises, setAllExercises] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
              .map((s: any) => ({
                reps: s.reps || s.actual_reps || 0,
                weight: s.weight || s.actual_weight || 0,
                rpe: s.rpe ?? s.actual_rpe ?? null,
              }));
          }
          // Format 2: exercise.logs is an array (custom workouts and database fallback)
          else if (Array.isArray(exercise.logs)) {
            sets = exercise.logs
              .filter((log: any) => (log.actual_reps > 0 || log.reps > 0) && (log.actual_weight > 0 || log.weight > 0))
              .map((log: any) => ({
                reps: log.actual_reps || log.reps || 0,
                weight: log.actual_weight || log.weight || 0,
                rpe: log.actual_rpe ?? log.rpe ?? null,
              }));
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

    const chartData = {
      labels: data.dataPoints.map((d) => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: data.dataPoints.map((d) => d.estimated1RM),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Estimated 1RM Progression</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            backgroundColor: colors.card,
            backgroundGradientFrom: colors.card,
            backgroundGradientTo: colors.card,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: colors.primary,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderVolumeChart = (data: ExerciseAnalytics) => {
    if (data.dataPoints.length < 2) return null;

    const chartData = {
      labels: data.dataPoints.map((d) => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: data.dataPoints.map((d) => d.volume),
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Volume Progression (kg)</Text>
        <BarChart
          data={chartData}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            backgroundColor: colors.card,
            backgroundGradientFrom: colors.card,
            backgroundGradientTo: colors.card,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={styles.chart}
          showValuesOnTopOfBars
        />
      </View>
    );
  };

  const selectedData = getSelectedAnalytics();

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Detailed Analytics',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.white,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
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
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
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
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
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
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Progression',
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.white,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8, marginLeft: -8 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Exercise</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setIsModalVisible(true)}
            >
              <View style={styles.selectorContent}>
                <View style={styles.selectorIconContainer}>
                  <Ionicons name="barbell-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.selectorTextContainer}>
                  <Text style={styles.selectorLabel}>Current Exercise</Text>
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {selectedExercise || 'Select an exercise'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {analytics.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Data Available</Text>
            <Text style={styles.emptyStateText}>
              Complete more workouts to see detailed analytics and progression charts
            </Text>
          </View>
        )}

        {/* Analytics Content */}
        {selectedData && (
          <>
            {/* Summary Cards */}
            <View style={styles.section}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Current 1RM</Text>
                  <Text style={styles.summaryValue}>{selectedData.current1RM} kg</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Peak 1RM</Text>
                  <Text style={styles.summaryValue}>{selectedData.peak1RM} kg</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Improvement</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          selectedData.improvementPercent > 0
                            ? colors.success
                            : selectedData.improvementPercent < 0
                            ? colors.error
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {selectedData.improvementPercent > 0 ? '+' : ''}
                    {selectedData.improvementPercent}%
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Avg Volume</Text>
                  <Text style={styles.summaryValue}>
                    {Math.round(selectedData.avgVolume)} kg
                  </Text>
                </View>
              </View>
            </View>

            {/* Charts */}
            {render1RMChart(selectedData)}
            {renderVolumeChart(selectedData)}

            {/* Data Table */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout History</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderText}>Date</Text>
                  <Text style={styles.tableHeaderText}>1RM</Text>
                  <Text style={styles.tableHeaderText}>Volume</Text>
                  <Text style={styles.tableHeaderText}>Max</Text>
                </View>
                {selectedData.dataPoints
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((point, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={styles.tableCell}>
                        {new Date(point.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.tableCell}>{point.estimated1RM} kg</Text>
                      <Text style={styles.tableCell}>{point.volume} kg</Text>
                      <Text style={styles.tableCell}>{point.maxWeight} kg</Text>
                    </View>
                  ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeRangeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: colors.white,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  // Selector Styles
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectorIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Primary color low opacity
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  selectorValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
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
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  exerciseListItemActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  exerciseListItemText: {
    color: colors.textSecondary,
    fontSize: 16,
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
    fontSize: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  table: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  tableHeaderText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '10',
  },
  tableCell: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyStateTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

