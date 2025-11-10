/**
 * ============================================================
 * PROGRESSION INSIGHTS DASHBOARD
 * ============================================================
 * AI-powered insights showing performance trends, plateaus,
 * and adaptive recommendations for continuous progress.
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressionService, { 
  PerformanceInsight, 
  PlateauAlert,
  ProgressionRecommendation 
} from '../../../src/services/workout/ProgressionService';

interface PlateauAlertDisplay {
  exerciseName: string;
  weeksStalled: number;
  recommendedAction: string;
}

export default function ProgressionInsightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [plateaus, setPlateaus] = useState<PlateauAlertDisplay[]>([]);
  const [overallStatus, setOverallStatus] = useState<'excellent' | 'good' | 'attention' | 'critical'>('good');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // 第1步：调用ProgressionService获取完整的progression overview
      const overview = await ProgressionService.getProgressionOverview(user.id);

      // 第2步：更新insights数据
      setInsights(overview.insights);

      // 第3步：更新plateaus数据，转换格式
      const formattedPlateaus = overview.plateaus.map((p) => ({
        exerciseName: p.exerciseName,
        weeksStalled: p.weeksWithoutProgress,
        recommendedAction: p.recommendedAction,
      }));
      setPlateaus(formattedPlateaus);

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
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInsights();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'progressing':
        return colors.success;
      case 'plateaued':
        return colors.warning;
      case 'regressing':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case 'progressing':
        return 'trending-up';
      case 'plateaued':
        return 'remove';
      case 'regressing':
        return 'trending-down';
      default:
        return 'pause';
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={
        overallStatus === 'excellent'
          ? [colors.primary, colors.primaryDark]
          : overallStatus === 'attention'
          ? [colors.warning, '#cc7000']
          : [colors.primary, colors.primaryDark]
      }
      style={styles.headerGradient}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Progression Overview</Text>
          <Text style={styles.headerSubtitle}>
            {overallStatus === 'excellent' && '🔥 Excellent Progress!'}
            {overallStatus === 'good' && '✅ Making Steady Gains'}
            {overallStatus === 'attention' && '⚠️ Needs Attention'}
            {overallStatus === 'critical' && '🚨 Review Required'}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{insights.length}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {insights.filter(i => i.performanceStatus === 'progressing').length}
              </Text>
              <Text style={styles.statLabel}>Progressing</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{plateaus.length}</Text>
              <Text style={styles.statLabel}>Plateaus</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Progression Insights',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.white,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing your performance...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Progression Insights',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/settings/progression-settings')}>
              <Ionicons name="settings-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderHeader()}

        {/* Empty State */}
        {insights.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Start Training to View Progress Analysis</Text>
            <Text style={styles.emptyStateText}>
              After completing a few workouts, we'll analyze your performance trends and provide progression recommendations
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(main)/workout/ai-custom-plan')}
            >
              <Ionicons name="add-circle" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Start Workout Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plateau Alerts */}
        {insights.length > 0 && plateaus.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={24} color={colors.warning} />
              <Text style={styles.sectionTitle}>Plateau Alerts</Text>
            </View>
            {plateaus.map((plateau, index) => (
              <View key={index} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertExercise}>{plateau.exerciseName}</Text>
                  <Text style={styles.alertWeeks}>{plateau.weeksStalled}w stalled</Text>
                </View>
                <Text style={styles.alertRecommendation}>
                  💡 {plateau.recommendedAction}
                </Text>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>View Alternatives</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Performance Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Performance Analysis</Text>
            </View>
            {insights.map((insight, index) => (
            <TouchableOpacity key={index} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={styles.insightTitleRow}>
                  <Text style={styles.insightExercise}>{insight.exerciseName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(insight.performanceStatus) + '20' }]}>
                    <Ionicons
                      name={getStatusIcon(insight.performanceStatus)}
                      size={14}
                      color={getStatusColor(insight.performanceStatus)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(insight.performanceStatus) }]}>
                      {insight.performanceStatus}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Est. 1RM</Text>
                  <Text style={styles.metricValue}>{insight.metrics.estimatedOneRM}kg</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Volume Δ</Text>
                  <Text style={[styles.metricValue, { color: insight.metrics.volumeChange > 0 ? colors.success : colors.textSecondary }]}>
                    {insight.metrics.volumeChange > 0 ? '+' : ''}{insight.metrics.volumeChange}%
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Avg RPE</Text>
                  <Text style={styles.metricValue}>{insight.metrics.avgRPE.toFixed(1)}</Text>
                </View>
              </View>

              <Text style={styles.recommendationText}>💡 {insight.recommendation}</Text>
            </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {insights.length > 0 && (
          <View style={styles.section}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/settings/progression-settings')}
          >
            <Ionicons name="settings" size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>Adjust Progression Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Coming Soon', 'Detailed analytics coming in the next update!')}
          >
            <Ionicons name="bar-chart" size={20} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>View Detailed Analytics</Text>
          </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
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
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    minWidth: 100,
  },
  statValue: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertExercise: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  alertWeeks: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
  },
  alertRecommendation: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightHeader: {
    marginBottom: 12,
  },
  insightTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightExercise: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  recommendationText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
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
    marginBottom: 32,
    paddingHorizontal: 20,
  },
});
