import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, FlatList, Alert, Animated, Image } from 'react-native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { ProgressService } from '../../../src/services/progressService';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import WeightProgressChart from '../../../src/components/progress/WeightProgressChart';
import BeforeAfterComparison from '../../../src/components/progress/BeforeAfterComparison';
import ProgressPhotoPrivacyNotice from '../../../src/components/legal/ProgressPhotoPrivacyNotice';
import { kgToLbs } from '../../../src/utils/unitConversions';
import { TutorialWrapper } from '../../../src/components/tutorial/TutorialWrapper';
import { useTutorial } from '../../../src/contexts/TutorialContext';

// Clean color palette
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#34C759',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  white: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.1)',
  glassStrong: 'rgba(255, 255, 255, 0.15)',
};

// Date helpers (treat YYYY-MM-DD as local, not UTC)
const parseDateOnly = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN);
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatLocalDate = (dateStr: string): string => {
  const d = parseDateOnly(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getTodayLocalISO = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Define types for progress data
type DailyMetric = {
  id: string;
  user_id: string;
  metric_date: string;
  weight_kg: number | null;
  trend_weight_kg: number | null;
  sleep_hours: number | null;
  stress_level: number | null;
  activity_calories: number | null;
  notes: string | null;
  created_at: string;
  // Additional fields
  body_fat_percentage?: number | null;
  muscle_mass_kg?: number | null;
  water_percentage?: number | null;
  bone_mass_kg?: number | null;
};

// Define a temporary type for progress photos since the table doesn't exist yet
type ProgressPhoto = {
  id: string;
  user_id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
  notes?: string | null;
};

const TABS = ['Dashboard', 'History', 'Photos'];
const { width, height } = Dimensions.get('window');

export default function ProgressScreen() {
  const { user, profile } = useAuth();
  const { state: tutorialState } = useTutorial();
  const params = useLocalSearchParams<{ saved?: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [entries, setEntries] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState('');

  // AI Coach greeting based on progress
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    const entriesCount = entries.length;
    const latestWeight = entries.length > 0 ? entries[entries.length - 1]?.weight_kg : null;
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    if (entriesCount === 0) {
      message = "Start tracking your body progress to see your transformation unfold.";
    } else if (entriesCount < 5) {
      message = "Great start! Keep logging regularly for better insights.";
    } else if (entriesCount < 14) {
      message = `You have ${entriesCount} entries. Consistency is building momentum!`;
    } else {
      message = "Your dedication shows! Your progress data is building a clear picture.";
    }
    
    return { greeting, message };
  }, [entries]);

  const fetchData = useCallback(async () => {
    // If tutorial is active, use instant mock data
    if (tutorialState.isActive) {
      console.log('[Progress] Tutorial active, using mock data');
      const mockEntries = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i) * 2); // Every 2 days
        return {
          id: `mock-${i}`,
          user_id: 'mock-user',
          metric_date: date.toISOString().split('T')[0],
          weight_kg: 85 - (i * 0.5), // Steady progress
          trend_weight_kg: 85 - (i * 0.5),
          sleep_hours: 7.5,
          stress_level: 3,
          activity_calories: 500,
          notes: i % 3 === 0 ? 'Feeling great!' : null,
          created_at: date.toISOString(),
          body_fat_percentage: 20 - (i * 0.2)
        };
      });
      setEntries(mockEntries);
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    if (!user) return;
    
    setIsLoading(true);
    try {
      const metricsData = await ProgressService.getDailyMetrics(user.id);
      // Sort by date ascending for the chart
      const sortedMetrics = metricsData.sort((a, b) => parseDateOnly(a.metric_date).getTime() - parseDateOnly(b.metric_date).getTime());
      setEntries(sortedMetrics);
      
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      Alert.alert('Error', 'Failed to load progress data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (params?.saved === 'weight') {
      setSnackbarText('Weight saved');
      setSnackbarVisible(true);
      fetchData();
    }
  }, [params?.saved, fetchData]);

  const handleTabPress = (index: number) => {
    setActiveTab(index);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <DashboardTab entries={entries} onRefresh={onRefresh} refreshing={refreshing} />;
      case 1:
        return <HistoryTab entries={entries} onRefresh={onRefresh} refreshing={refreshing} />;
      case 2:
        return <PhotosTab onRefresh={onRefresh} refreshing={refreshing} entries={entries} />;
      default:
        return null;
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAvatarContainer}>
            <Icon name="scale-bathroom" size={32} color={colors.primary} />
          </View>
          <Text style={styles.loadingText}>Analyzing your progress...</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
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

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TutorialWrapper tutorialId="log-weight-button">
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(main)/progress/log-progress')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                <Icon name="plus-circle" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Log Weight</Text>
            </TouchableOpacity>
          </TutorialWrapper>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/progress/log-photo')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="camera" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>Log Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setActiveTab(1)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="history" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setActiveTab(2)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="compare" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === index && styles.tabButtonActive]}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === index && styles.tabButtonTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {renderTabContent()}
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => {
          setSnackbarVisible(false);
          router.replace('/(main)/progress');
        }}
        duration={1600}
        action={{
          label: 'OK',
          onPress: () => {
            setSnackbarVisible(false);
            router.replace('/(main)/progress');
          },
        }}
        style={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, margin: 16 }}
      >
        {snackbarText}
      </Snackbar>
    </View>
  );
}

const DashboardTab = ({ entries, onRefresh, refreshing }: { entries: DailyMetric[], onRefresh: () => void, refreshing: boolean }) => {
  const { profile } = useAuth();
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  const unit = profile?.weight_unit_preference || 'kg';
  const latestWeight = latestEntry?.weight_kg;
  const displayWeight =
    unit === 'lbs' && typeof latestWeight === 'number'
      ? kgToLbs(latestWeight)
      : latestWeight;

  // Calculate weight change
  const weightChange = useMemo(() => {
    if (entries.length < 2) return null;
    const first = entries[0]?.weight_kg;
    const last = entries[entries.length - 1]?.weight_kg;
    if (first == null || last == null) return null;
    const change = last - first;
    return unit === 'lbs' ? kgToLbs(change) : change;
  }, [entries, unit]);

  // Calculate days tracking
  const daysTracking = useMemo(() => {
    if (entries.length === 0) return 0;
    return Math.floor((Date.now() - new Date(entries[0].metric_date).getTime()) / (1000 * 60 * 60 * 24));
  }, [entries]);

  return (
    <View style={styles.dashboardContent}>
      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {typeof displayWeight === 'number' ? displayWeight.toFixed(1) : '--'}
          </Text>
          <Text style={styles.statLabel}>{unit.toUpperCase()}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{entries.length}</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, weightChange != null && { color: weightChange < 0 ? '#22C55E' : weightChange > 0 ? '#EF4444' : colors.text }]}>
            {weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}` : '--'}
          </Text>
          <Text style={styles.statLabel}>Change</Text>
        </View>
      </View>

      {/* AI Insight */}
      {entries.length > 0 && (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIconContainer}>
              <Icon name="lightbulb-on" size={18} color={colors.primary} />
            </View>
            <Text style={styles.insightTitle}>AI Insight</Text>
          </View>
          <Text style={styles.insightText}>
            {entries.length < 7
              ? "Log your weight daily for more accurate trend analysis and predictions."
              : weightChange != null && weightChange < 0
                ? `Great progress! You've lost ${Math.abs(weightChange).toFixed(1)} ${unit} over ${daysTracking} days.`
                : "Maintain consistency with your logging for the best insights."
            }
          </Text>
        </View>
      )}

      {/* Weight Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Weight Trend</Text>
        <TutorialWrapper tutorialId="weight-trend-chart">
          <WeightProgressChart data={entries} unit={unit} />
        </TutorialWrapper>
      </View>
    </View>
  );
};



const HistoryTab = ({ entries, onRefresh, refreshing }: { entries: DailyMetric[], onRefresh: () => void, refreshing: boolean }) => {
  const { profile } = useAuth();
  const unit = profile?.weight_unit_preference || 'kg';
  const sortedEntries = useMemo(() => 
    [...entries].sort((a, b) => parseDateOnly(b.metric_date).getTime() - parseDateOnly(a.metric_date).getTime()),
    [entries]
  );

  if (sortedEntries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Icon name="history" size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No History Yet</Text>
        <Text style={styles.emptyDescription}>
          Start logging your weight to see your progress over time.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(main)/progress/log-progress')}
          style={styles.emptyActionButton}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.emptyActionGradient}
          >
            <Icon name="plus" size={18} color={colors.white} />
            <Text style={styles.emptyActionText}>Log First Entry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.historyContent}>
      {sortedEntries.slice(0, 10).map((item, index) => (
        <HistoryItem key={item.id} item={item} index={index} unit={unit} />
      ))}
      {sortedEntries.length > 10 && (
        <Text style={styles.moreEntriesText}>
          + {sortedEntries.length - 10} more entries
        </Text>
      )}
    </View>
  );
};

const HistoryItem = ({ item, index, unit }: { item: DailyMetric, index: number, unit: string }) => {
  const displayWeight =
    unit === 'lbs' && typeof item.weight_kg === 'number'
      ? kgToLbs(item.weight_kg)
      : item.weight_kg;

  const hasBodyFat = typeof item.body_fat_percentage === 'number' && item.body_fat_percentage !== null;
  const hasNotes = item.notes && item.notes.trim().length > 0;

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyItemLeft}>
        <Text style={styles.historyDate}>{formatLocalDate(item.metric_date)}</Text>
        {hasBodyFat && (
          <View style={styles.historyMetricsRow}>
            <View style={styles.historyMetricBadge}>
              <Icon name="percent" size={12} color={colors.primary} />
              <Text style={styles.historyMetricText}>
                Body Fat: {item.body_fat_percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}
        {hasNotes && (
          <Text style={styles.historyNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
      <View style={styles.historyItemRight}>
        <Text style={styles.historyWeight}>
          {typeof displayWeight === 'number' ? displayWeight.toFixed(1) : '--'}
        </Text>
        <Text style={styles.historyUnit}>{unit}</Text>
      </View>
    </View>
  );
};

const PhotosTab = ({ onRefresh, refreshing, entries = [] }: { onRefresh: () => void, refreshing: boolean, entries?: DailyMetric[] }) => {
  const { user } = useAuth();
  const { state: tutorialState } = useTutorial();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = useCallback(async () => {
    if (tutorialState.isActive) {
      setPhotos([]); 
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const fetchedPhotos = await ProgressService.getProgressPhotos(user.id);
      const enrichedPhotos = fetchedPhotos.map(photo => {
        const dateEntry = entries.find(e => e.metric_date === photo.date);
        return { ...photo, weight_kg: dateEntry?.weight_kg || null };
      });
      setPhotos(enrichedPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entries, tutorialState.isActive]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos, refreshing]);

  if (loading && !refreshing && photos.length === 0) {
    return (
      <View style={styles.loadingMini}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!photos || photos.length < 2) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Icon name="camera" size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>
          {photos.length === 0 ? 'No Photos Yet' : 'Add More Photos'}
        </Text>
        <Text style={styles.emptyDescription}>
          {photos.length === 0 
            ? 'Capture your transformation journey visually.' 
            : 'Upload at least 2 photos to compare your progress.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(main)/progress/log-photo')}
          style={styles.emptyActionButton}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.emptyActionGradient}
          >
            <Icon name="camera-plus" size={18} color={colors.white} />
            <Text style={styles.emptyActionText}>Add Photo</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.photosContent}>
      <BeforeAfterComparison 
        userId={user?.id || ''} 
        onPhotoUpload={() => router.push('/(main)/progress/log-photo')}
        showScrollView={false}
      />
      <ProgressPhotoPrivacyNotice variant="compact" />
    </View>
  );
};


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
    padding: 20,
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
  loadingMini: {
    padding: 40,
    alignItems: 'center',
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
    width: (width - 40 - 24) / 4, // 40px padding, 24px for 3 gaps of 8px
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

  // Tab Selector
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.white,
  },

  content: {
    flex: 1,
  },
  // Dashboard Tab Styles
  dashboardContent: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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

  // AI Insight Card
  insightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  insightText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Chart Section
  chartSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 16,
  },

  // History Tab Styles
  historyContent: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  historyNotes: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 6,
    lineHeight: 16,
  },
  historyMetricsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  historyMetricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  historyMetricText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  historyItemRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  historyWeight: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  historyUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  moreEntriesText: {
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

  // Photos Tab Styles
  photosContent: {
    flex: 1,
  },
});