/**
 * ============================================================
 * PROGRESSION INSIGHTS DASHBOARD
 * ============================================================
 * AI-powered insights showing performance trends, plateaus,
 * and adaptive recommendations for continuous progress.
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
  RefreshControl,
  Alert,
  TextInput,
  FlatList,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'progressing' | 'plateaued' | 'regressing'>('all');

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

  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      const matchesSearch = insight.exerciseName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || insight.performanceStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [insights, searchQuery, statusFilter]);

  const renderSearchAndFilter = () => (
    <View style={styles.searchFilterContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'progressing', 'plateaued', 'regressing'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[
              styles.filterChipText,
              statusFilter === status && styles.filterChipTextActive
            ]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderInsightItem = ({ item: insight }: { item: PerformanceInsight }) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={styles.insightHeaderTop}>
          <Text style={styles.insightExercise}>{insight.exerciseName}</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: insight.performanceStatus === 'progressing' ? 'rgba(76, 175, 80, 0.15)' : 
                              insight.performanceStatus === 'plateaued' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 255, 255, 0.1)'
          }]}>
            <Text style={[styles.statusText, { 
              color: insight.performanceStatus === 'progressing' ? '#4CAF50' : 
                      insight.performanceStatus === 'plateaued' ? '#FF9800' : colors.textSecondary
            }]}>
              {insight.performanceStatus === 'progressing' ? 'Improving' : 
                insight.performanceStatus === 'plateaued' ? 'Plateaued' : insight.performanceStatus}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Est. 1RM</Text>
          <Text style={styles.metricValueMain}>{insight.metrics.estimatedOneRM}kg</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Volume Δ</Text>
          <Text style={[styles.metricValueMain, { 
            color: insight.metrics.volumeChange > 0 ? '#4CAF50' : 
                    insight.metrics.volumeChange < 0 ? '#FF5252' : colors.white 
          }]}>
            {insight.metrics.volumeChange > 0 ? '+' : ''}{insight.metrics.volumeChange}%
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Avg RPE</Text>
          <Text style={styles.metricValueMain}>{insight.metrics.avgRPE.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.recommendationFooter}>
        <Ionicons name="bulb-outline" size={16} color={colors.primary} style={{marginTop: 2}} />
        <Text style={styles.recommendationText}>{insight.recommendation}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={
          overallStatus === 'excellent'
            ? [colors.primary, '#cc5500']
            : overallStatus === 'attention'
            ? ['#FF9500', '#CC7700']
            : [colors.primary, colors.primaryDark]
        }
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <Text style={styles.headerTitle}>Progression Insights</Text>
              <View style={[styles.statusPill, { 
                backgroundColor: overallStatus === 'excellent' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' 
              }]}>
                <Text style={styles.statusPillText}>
                  {overallStatus === 'excellent' && '🚀 Peaking'}
                  {overallStatus === 'good' && '✅ Steady Gains'}
                  {overallStatus === 'attention' && '⚠️ Stalled'}
                  {overallStatus === 'critical' && '🚨 Action Needed'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{insights.length}</Text>
                <Text style={styles.statLabel}>Active Exercises</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {insights.filter(i => i.performanceStatus === 'progressing').length}
                </Text>
                <Text style={styles.statLabel}>Progressing</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{plateaus.length}</Text>
                <Text style={styles.statLabel}>Plateaus</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderListHeader = () => (
    <View>
      {renderHeader()}
      
      {renderSearchAndFilter()}

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

      {/* Performance Insights Title */}
      {insights.length > 0 && (
        <View style={[styles.section, { paddingBottom: 0 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Performance Analysis</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderListFooter = () => (
    <View>
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
            onPress={() => router.push('/(main)/workout/progression-analytics')}
          >
            <Ionicons name="bar-chart" size={20} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>View Detailed Analytics</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: 100 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Progression Insights',
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.white,
            headerBackVisible: true,
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
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
          headerBackVisible: true,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/settings/progression-settings')}>
              <Ionicons name="settings-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={filteredInsights}
        renderItem={renderInsightItem}
        keyExtractor={(item) => item.exerciseName}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          insights.length > 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No exercises found matching your filter.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Deep black background
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
    backgroundColor: '#000000',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  headerContainer: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#1c1c1e',
  },
  headerGradient: {
    paddingBottom: 32,
  },
  headerSafeArea: {
    paddingBottom: 0,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)', // Works on some platforms, ignored on others
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 8,
  },
  statValue: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: 24,
    paddingTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  searchFilterContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginBottom: 16,
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterContent: {
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  alertCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertExercise: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  alertWeeks: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(255,167,38,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  alertRecommendation: {
    color: '#A0A0A0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  insightCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  insightHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  insightHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightExercise: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#252527',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#3A3A3C',
    height: '60%',
    alignSelf: 'center',
  },
  metricLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValueMain: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recommendationFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  recommendationText: {
    color: '#D0D0D0',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyStateTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#8E8E93',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
});

