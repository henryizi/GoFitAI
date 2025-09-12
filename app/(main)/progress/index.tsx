import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, FlatList, Alert, ImageBackground, Animated, Image } from 'react-native';
import { Button, Text, ActivityIndicator, Avatar, Snackbar } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { ProgressService } from '../../../src/services/progressService';
import { supabase } from '../../../src/services/supabase/client';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import WeightProgressChart from '../../../src/components/progress/WeightProgressChart';
import TodayCard from '../../../src/components/progress/TodayCard';
import BeforeAfterComparison from '../../../src/components/progress/BeforeAfterComparison';
import { BlurView } from 'expo-blur';

// Modern, premium colors with enhanced palette
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
  gradient1: '#FF6B35',
  gradient2: '#FF8F65',
  gradient3: '#FFB88C',
  blue: '#007AFF',
  purple: '#AF52DE',
  pink: '#FF2D92',
  cyan: '#5AC8FA',
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
  const { user } = useAuth();
  const params = useLocalSearchParams<{ saved?: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [entries, setEntries] = useState<DailyMetric[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate] = useState(new Date());
  const [scrollY] = useState(new Animated.Value(0));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState('');
  
  // Tab animation values
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const tabScaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  // Format the current date
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const metricsData = await ProgressService.getDailyMetrics(user.id);
      // Sort by date ascending for the chart
      const sortedMetrics = metricsData.sort((a, b) => parseDateOnly(a.metric_date).getTime() - parseDateOnly(b.metric_date).getTime());
      setEntries(sortedMetrics);
      
      const photosData = await ProgressService.getProgressPhotos(user.id);
      setPhotos(photosData || []);
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
      // Refresh data to show the newly logged weight
      fetchData();
    }
  }, [params?.saved, fetchData]);

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

  // Animate tab indicator when activeTab changes
  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  }, [activeTab]);

  const handleTabPress = (index: number) => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(tabScaleAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tabScaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

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
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <LinearGradient
              colors={[colors.glass, colors.glassStrong]}
              style={styles.loadingCardGradient}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading Progress...</Text>
              <Text style={styles.loadingSubText}>Analyzing your transformation journey</Text>
            </LinearGradient>
          </View>
        </View>
      );
    }

    switch (activeTab) {
      case 0:
        return <DashboardTab entries={entries} onRefresh={onRefresh} refreshing={refreshing} scrollY={scrollY} />;
      case 1:
        return <HistoryTab entries={entries} onRefresh={onRefresh} refreshing={refreshing} scrollY={scrollY} />;
      case 2:
        return <PhotosTab photos={photos} onRefresh={onRefresh} refreshing={refreshing} scrollY={scrollY} />;
      default:
        return null;
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced dynamic background with parallax effect */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.7)', 
            'rgba(18,18,18,0.85)', 
            'rgba(18,18,18,0.95)', 
            '#121212'
          ]}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Animated header with enhanced blur effect */}
      <Animated.View style={[
        styles.animatedHeader, 
        { 
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }]
        }
      ]}>
        <View style={styles.solidHeader}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerLine} />
            <Text style={styles.appName}>PROGRESS<Text style={{ color: colors.primary }}>HUB</Text></Text>
            <View style={styles.headerLine} />
          </View>
        </View>
      </Animated.View>

      {/* Enhanced main header */}
      <Animated.View style={[
        styles.header, 
        { 
          paddingTop: insets.top + 16,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <View style={styles.headerLine} />
        <Text style={styles.appName}>PROGRESS<Text style={{ color: colors.primary }}>HUB</Text></Text>
        <View style={styles.headerLine} />
      </Animated.View>

      {/* Enhanced title section with better animations */}
      <Animated.View style={[
        styles.titleSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <View style={styles.titleGlow}>
          <View style={styles.titleDateContainer}>
            <Icon name="calendar-today" size={16} color={colors.primary} />
            <Text style={styles.titleDate}>{formattedDate.toUpperCase()}</Text>
          </View>
          <Text style={styles.titleMain}>BODY PROGRESS</Text>
          <Text style={styles.titleDescription}>
            Track your transformation and see your journey unfold
          </Text>
        </View>
      </Animated.View>
      
      {/* Ultra-Modern Tab Container with Advanced Animations */}
      <Animated.View style={[
        styles.tabContainerWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <View style={styles.tabBackdrop}>
          <BlurView intensity={80} tint="dark" style={styles.tabBlurView}>
            <LinearGradient
              colors={[
                'rgba(255, 107, 53, 0.1)',
                'rgba(255, 107, 53, 0.05)',
                'rgba(0, 0, 0, 0.3)'
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradientOverlay}
            >
              <View style={styles.tabContainer}>
                {/* Animated Background Indicator */}
                <Animated.View
                  style={[
                    styles.tabIndicatorBackground,
                    {
                      transform: [{
                        translateX: tabIndicatorAnim.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [0, (width - 52) / 3, ((width - 52) / 3) * 2],
                        })
                      }]
                    }
                  ]}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.activeTabBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>

                {/* Tab Buttons */}
                {TABS.map((tab, index) => {
                  const isActive = activeTab === index;
                  
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.tab, isActive && styles.activeTab]}
                      onPress={() => handleTabPress(index)}
                      activeOpacity={0.8}
                    >
                        {/* Tab Icon */}
                        <View style={[styles.tabIconContainer, isActive && styles.activeTabIconContainer]}>
                          <Icon 
                            name={
                              index === 0 ? 'view-dashboard' : 
                              index === 1 ? 'history' : 
                              'camera-outline'
                            }
                            size={isActive ? 20 : 18}
                            color={isActive ? colors.white : colors.textSecondary}
                          />
                        </View>
                        
                        {/* Tab Text */}
                        <Text style={[
                          styles.tabText,
                          isActive && styles.activeTabText
                        ]}>
                          {tab}
                        </Text>

                        {/* Active Tab Glow Effect */}
                        {isActive && (
                          <View style={styles.tabGlowEffect} />
                        )}
                      </TouchableOpacity>
                  );
                })}
              </View>
              
              {/* Bottom Accent Line */}
              <View style={styles.tabAccentLine}>
                <LinearGradient
                  colors={[
                    'transparent',
                    colors.primary + '40',
                    colors.primary + '80',
                    colors.primary + '40',
                    'transparent'
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabAccentGradient}
                />
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </Animated.View>

      {/* Tab content container */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

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
        style={{ backgroundColor: colors.surfaceLight, borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, margin: 16 }}
      >
        {snackbarText}
      </Snackbar>

      {/* Floating action button removed as requested */}
    </View>
  );
}

const DashboardTab = ({ entries, onRefresh, refreshing, scrollY }) => {
  const { user } = useAuth();
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [motivation, setMotivation] = useState<any | null>(null);

  const weightToday = React.useMemo(() => {
    if (!entries || entries.length === 0) return null;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Find today's entry
    const todayEntry = entries.find(entry => entry.metric_date === today);
    
    console.log('[DashboardTab] Weight calculation:', {
      today,
      entriesCount: entries.length,
      todayEntry,
      weightToday: todayEntry?.weight_kg
    });
    
    return todayEntry?.weight_kg || null;
  }, [entries]);
  
  const streakDays = React.useMemo(() => {
    if (!entries || entries.length === 0) return 0;
    
    // Sort entries by date (newest first)
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime()
    );
    
    // Filter entries that have weight logged
    const weightEntries = sortedEntries.filter(entry => entry.weight_kg != null);
    
    console.log('[DashboardTab] Streak calculation:', {
      totalEntries: entries.length,
      weightEntries: weightEntries.length,
      weightEntriesDates: weightEntries.map(e => e.metric_date)
    });
    
    if (weightEntries.length === 0) return 0;
    
    // Calculate streak
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) { // Check up to 30 days back
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = checkDate.toISOString().split('T')[0];
      
      const hasEntry = weightEntries.some(entry => entry.metric_date === dateKey);
      if (hasEntry) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
    
    console.log('[DashboardTab] Calculated streak:', streak);
    return streak;
  }, [entries]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user) return;
        const [m] = await Promise.allSettled([
          ProgressService.generateMotivationalMessage(user.id, 'streak_7'),
        ]);
        if (!active) return;
        if (m.status === 'fulfilled' && m.value?.success) setMotivation(m.value.message || null);
      } catch {}
    })();
    return () => { active = false; };
  }, [user?.id]);

  // Habit score removed per request

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
      )}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[colors.primary]} 
          tintColor={colors.primary}
          progressBackgroundColor="rgba(255,255,255,0.1)"
        />
      }
    >
      <TodayCard
        weightToday={weightToday}
        streakDays={streakDays}
        onLogProgress={() => router.push('/(main)/progress/log-progress')}
      />

      {/* Enhanced hero stats card with better design */}
      <Animated.View style={[styles.heroCard, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={[
            'rgba(255,107,53,0.2)',
            'rgba(255,107,53,0.1)',
            'rgba(255,255,255,0.08)'
          ]}
          style={styles.heroCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroCardContent}>
            <View style={styles.heroCardHeader}>
              <View style={styles.heroIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.heroIcon}
                >
                  <Icon name="chart-line" size={24} color={colors.white} />
                </LinearGradient>
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroCardTitle}>YOUR PROGRESS</Text>
                <Text style={styles.heroCardSubtitle}>Transformation in progress</Text>
              </View>
              <TouchableOpacity style={styles.heroMoreButton}>
                <Icon name="chevron-right" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>{entries.length}</Text>
                <Text style={styles.heroStatLabel}>ENTRIES</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>
                  {entries.length > 0 ? Math.floor((Date.now() - new Date(entries[0].metric_date).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                </Text>
                <Text style={styles.heroStatLabel}>DAYS</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>
                  {latestEntry?.weight_kg ? latestEntry.weight_kg.toFixed(1) : '--'}
                </Text>
                <Text style={styles.heroStatLabel}>KG</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Trends and forecast */}
      <View style={styles.sectionHeaderContainer}>
        <View style={styles.sectionTitle}>
          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>01</Text>
          </View>
          <Text style={styles.sectionTitleText}>WEIGHT TREND</Text>
        </View>
      </View>

      {/* Weight Progress Chart */}
      <WeightProgressChart data={entries} />
      
      {/* Motivation */}
      {motivation?.message && (
        <View style={{ marginTop: 20 }}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={{ borderRadius: 16, padding: 16 }}>
            <Text style={{ color: colors.white, fontWeight: '700' }}>Keep Going</Text>
            <Text style={{ color: colors.white, marginTop: 6 }}>{motivation.message}</Text>
          </LinearGradient>
        </View>
      )}


    </ScrollView>
  );
};



const HistoryTab = ({ entries, onRefresh, refreshing, scrollY }) => {
  const sortedEntries = useMemo(() => 
    [...entries].sort((a, b) => parseDateOnly(b.metric_date).getTime() - parseDateOnly(a.metric_date).getTime()),
    [entries]
  );

  if (sortedEntries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <LinearGradient
            colors={[colors.glassStrong, colors.glass]}
            style={styles.emptyCardGradient}
          >
            <View style={styles.emptyCardContent}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.emptyIconGradient}
                >
                  <Icon name="history" size={32} color={colors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyText}>No History Yet</Text>
              <Text style={styles.emptySubText}>Your fitness journey starts with the first step</Text>
              <TouchableOpacity
                onPress={() => router.push('/(main)/progress/log-metrics')}
                style={styles.createButtonContainer}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.createButton}
                >
                  <Icon name="plus" size={16} color={colors.white} style={styles.buttonIcon} />
                  <Text style={styles.createButtonText}>Log First Entry</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={sortedEntries}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.historyList}
      renderItem={({ item, index }) => <EnhancedHistoryItem item={item} index={index} />}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
      )}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[colors.primary]} 
          tintColor={colors.primary}
          progressBackgroundColor="rgba(255,255,255,0.1)"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const EnhancedHistoryItem = ({ item, index }) => (
  <View style={[styles.historyItem, { marginTop: index === 0 ? 24 : 0 }]}>
    <LinearGradient
      colors={[colors.glassStrong, colors.glass]}
      style={styles.historyItemGradient}
    >
      <View style={styles.historyHeader}>
        <View style={styles.historyDateContainer}>
          <Icon name="calendar" size={16} color={colors.primary} />
          <Text style={styles.historyDate}>{formatLocalDate(item.metric_date)}</Text>
        </View>
        <View style={styles.historyBadge}>
          <Text style={styles.historyBadgeText}>#{index + 1}</Text>
        </View>
      </View>
      
      <View style={styles.historyMetrics}>
        <View style={styles.historyMetricItemSingle}>
          <View style={styles.weightDisplayContainer}>
            <Text style={styles.historyMetricValueLarge}>
              {item.weight_kg ? `${item.weight_kg}` : 'N/A'}
            </Text>
            <Text style={styles.historyMetricUnitLarge}>kg</Text>
          </View>
          <Text style={styles.historyMetricLabelSingle}>BODY WEIGHT</Text>
          {typeof item.body_fat_percentage === 'number' && (
            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.white }}>
                {item.body_fat_percentage.toFixed(1)}%
              </Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4, letterSpacing: 1, fontWeight: '600' }}>
                BODY FAT
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {item.notes && (
        <View style={styles.historyNotes}>
          <Icon name="note-text-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.historyNotesText}>{item.notes}</Text>
        </View>
      )}
    </LinearGradient>
  </View>
);

const PhotosTab = ({ photos, onRefresh, refreshing, scrollY }) => {
  const [viewMode, setViewMode] = useState('comparison'); // 'comparison' or 'grid'
  const { user } = useAuth();

  const renderViewModeToggle = () => (
    <View style={styles.viewModeToggle}>
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'comparison' && styles.viewModeButtonActive]}
        onPress={() => setViewMode('comparison')}
      >
        <LinearGradient
          colors={viewMode === 'comparison' ? [colors.primary, colors.primaryDark] : [colors.glass, colors.glass]}
          style={styles.viewModeButtonGradient}
        >
          <Icon name="compare" size={16} color={viewMode === 'comparison' ? colors.white : colors.primary} />
          <Text style={[styles.viewModeButtonText, viewMode === 'comparison' && styles.viewModeButtonTextActive]}>
            Before/After
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
        onPress={() => setViewMode('grid')}
      >
        <LinearGradient
          colors={viewMode === 'grid' ? [colors.primary, colors.primaryDark] : [colors.glass, colors.glass]}
          style={styles.viewModeButtonGradient}
        >
          <Icon name="grid" size={16} color={viewMode === 'grid' ? colors.white : colors.primary} />
          <Text style={[styles.viewModeButtonText, viewMode === 'grid' && styles.viewModeButtonTextActive]}>
            Photo Grid
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <LinearGradient
            colors={[colors.glassStrong, colors.glass]}
            style={styles.emptyCardGradient}
          >
            <View style={styles.emptyCardContent}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.emptyIconGradient}
                >
                  <Icon name="camera" size={32} color={colors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyText}>No Photos Yet</Text>
              <Text style={styles.emptySubText}>Capture your transformation journey visually</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(main)/progress/photo-upload' })}
                style={styles.createButtonContainer}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.createButton}
                >
                  <Icon name="camera-plus" size={16} color={colors.white} style={styles.buttonIcon} />
                  <Text style={styles.createButtonText}>Add First Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  if (photos.length === 1) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <LinearGradient
            colors={[colors.glassStrong, colors.glass]}
            style={styles.emptyCardGradient}
          >
            <View style={styles.emptyCardContent}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.emptyIconGradient}
                >
                  <Icon name="camera-plus" size={32} color={colors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyText}>One Photo Uploaded</Text>
              <Text style={styles.emptySubText}>Upload at least 2 photos to compare your progress</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(main)/progress/photo-upload' })}
                style={styles.createButtonContainer}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.createButton}
                >
                  <Icon name="camera-plus" size={16} color={colors.white} style={styles.buttonIcon} />
                  <Text style={styles.createButtonText}>Add Another Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  if (viewMode === 'comparison') {
    return (
      <View style={styles.content}>
        {/* Before/After Comparison Component - now handles its own scrolling */}
        <BeforeAfterComparison 
          userId={user?.id || ''} 
          onPhotoUpload={() => router.push('/(main)/progress/photo-upload')}
          showScrollView={true}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primary]} 
              tintColor={colors.primary}
              progressBackgroundColor="rgba(255,255,255,0.1)"
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          headerComponent={
            <>
              {renderViewModeToggle()}
              
              <View style={styles.comparisonContainer}>
                <Text style={styles.comparisonTitle}>Progress Comparison</Text>
                <Text style={styles.comparisonSubtitle}>
                  Track your transformation with before/after photos
                </Text>
              </View>
            </>
          }
        />
      </View>
    );
  }
  
  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
      )}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[colors.primary]} 
          tintColor={colors.primary}
          progressBackgroundColor="rgba(255,255,255,0.1)"
        />
      }
    >
      {renderViewModeToggle()}
      
      <View style={styles.photosHeader}>
        <Text style={styles.photosTitle}>Your Progress Photos</Text>
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => router.push('/(main)/progress/photo-upload')}
        >
          <Icon name="camera-plus" size={16} color={colors.primary} />
          <Text style={styles.uploadButtonText}>Upload Photos</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.photosContainer}>
        {photos.map((entry, index) => (
          <View key={entry.id} style={styles.photoEntryCard}>
            <LinearGradient
              colors={[colors.glassStrong, colors.glass]}
              style={styles.photoEntryGradient}
            >
              <View style={styles.photoEntryHeader}>
                <Text style={styles.photoEntryDate}>
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
                {entry.weight_kg && (
                  <View style={styles.weightBadge}>
                    <Text style={styles.weightText}>{entry.weight_kg.toFixed(1)} kg</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.photosGrid}>
                {entry.front_photo && (
                  <View style={styles.photoContainer}>
                    <Image 
                      source={{ uri: supabase.storage.from('body-photos').getPublicUrl(entry.front_photo.storage_path).data.publicUrl }} 
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoLabel}>
                      <Text style={styles.photoLabelText}>Front</Text>
                    </View>
                  </View>
                )}
                
                {entry.back_photo && (
                  <View style={styles.photoContainer}>
                    <Image 
                      source={{ uri: supabase.storage.from('body-photos').getPublicUrl(entry.back_photo.storage_path).data.publicUrl }} 
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoLabel}>
                      <Text style={styles.photoLabelText}>Back</Text>
                    </View>
                  </View>
                )}
              </View>
              
              <TouchableOpacity
                onPress={() => router.push({ 
                  pathname: '/(main)/progress/photo-upload',
                  params: { date: entry.date }
                })}
                style={styles.editButton}
              >
                <Icon name="pencil" size={16} color={colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.dark,
  },
  solidHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: colors.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  appName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  titleGlow: {
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
    color: colors.white,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: 8,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  titleDescription: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  // Ultra-Modern Tab Styles
  tabContainerWrapper: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 24,
    overflow: 'hidden',
  },
  tabBackdrop: {
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  tabBlurView: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabGradientOverlay: {
    borderRadius: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
    position: 'relative',
  },
  
  // Animated Background Indicator
  tabIndicatorBackground: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: (width - 52) / 3, // Exact width of each tab
    bottom: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  activeTabBackground: {
    flex: 1,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  
  // Tab Wrapper & Button (removed - simplified structure)
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    position: 'relative',
    zIndex: 2,
    minHeight: 48,
  },
  activeTab: {
    // Active state handled by background indicator
  },
  
  // Tab Icon Styles
  tabIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: colors.white,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  
  // Tab Text Styles
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.white,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Glow Effect
  tabGlowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  },
  
  // Bottom Accent Line
  tabAccentLine: {
    height: 2,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 1,
    overflow: 'hidden',
  },
  tabAccentGradient: {
    flex: 1,
    borderRadius: 1,
  },

  // Remove old styles that are no longer needed
  tabBlur: {
    // Removed - replaced with tabBlurView
  },
  tabGradientBorder: {
    // Removed - replaced with tabGradientOverlay
  },
  activeTabIndicator: {
    // Removed - replaced with tabIndicatorBackground
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 300,
  },
  loadingCardGradient: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  heroCard: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroCardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
    padding: 24,
  },
  heroCardContent: {
    alignItems: 'center',
  },
  heroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  heroIconContainer: {
    marginRight: 12,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  heroCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 2,
  },
  heroCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  heroMoreButton: {
    padding: 8,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    width: '100%',
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
  },
  heroStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionNumberText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitleText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  chartCard: {
    marginBottom: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  chartCardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  chartBadge: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  chartBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  emptyContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  photosContainer: {
    padding: 24,
  },
  photoEntryCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  photoEntryGradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
  },
  photoEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  photoEntryDate: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  weightBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  weightText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  photoContainer: {
    flex: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  photoLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  emptyCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyCardGradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emptyCardContent: {
    alignItems: 'center',
    padding: 48,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  createButtonContainer: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  historyList: {
    padding: 24,
    paddingBottom: 120,
  },
  historyItem: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  historyItemGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  historyBadge: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  historyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  historyMetricSeparator: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  historyMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  historyMetricUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyMetricLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
    letterSpacing: 1,
    fontWeight: '600',
  },
  historyMetricItemSingle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  historyMetricValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
  },
  historyMetricUnitLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  historyMetricLabelSingle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    letterSpacing: 1,
    fontWeight: '600',
  },
  historyNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  historyNotesText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 174,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fabShadow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,107,53,0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fabPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,107,53,0.1)',
    top: -8,
    left: -8,
    zIndex: -1,
  },
  fabRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,107,53,0.05)',
    top: -10,
    left: -10,
    zIndex: -2,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  comingSoonCard: {
    padding: 48,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  comingSoonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginTop: 16,
  },
  comingSoonSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  photosHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 20,
    gap: 16,
  },
  photosTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    alignSelf: 'flex-start',
  },
  uploadButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // View mode toggle styles
  viewModeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  viewModeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 120,
  },
  viewModeButtonActive: {
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  viewModeButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  viewModeButtonTextActive: {
    color: '#FFFFFF',
  },
  // Comparison container styles
  comparisonContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  comparisonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 