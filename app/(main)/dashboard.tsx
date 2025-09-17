import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import {
  Text,
  ActivityIndicator,
  Divider,
  useTheme,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { NutritionService } from '../../src/services/nutrition/NutritionService';
import { WorkoutHistoryService } from '../../src/services/workout/WorkoutHistoryService';
import { WorkoutService } from '../../src/services/workout/WorkoutService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../../src/config/environment';

// Modern, premium colors matching nutrition page
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  mediumGray: 'rgba(255, 255, 255, 0.5)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
  gradient: ['#FF6B35', '#E55A2B'],
  gradientSecondary: ['#FF8F65', '#FF6B35'],
  gradientSuccess: ['#34C759', '#30D158'],
  gradientWarning: ['#FF9500', '#FF8E00'],
};

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDate] = useState(new Date());
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [todayIntake, setTodayIntake] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [nextWorkout, setNextWorkout] = useState<any | null>(null);

  // Type definitions for items used in UI lists
  type QuickActionItem = {
    id: string;
    title: string;
    icon: string;
    color: string;
    route: string;
    gradient: [string, string];
  };

  type OverviewCardItem = {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    value: string;
    unit: string;
    progress: number;
    route: string;
    gradient: [string, string];
    hasQuickStart?: boolean;
    quickStartEnabled?: boolean;
  };

  // Get today's date key in YYYY-MM-DD format
  const getTodayKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch food entries from local storage
  const fetchFoodEntries = useCallback(async () => {
    try {
      const uid = user?.id || 'guest';
      const todayDate = new Date().toISOString().split('T')[0];
      const storageKey = `nutrition_log_${uid}_${todayDate}`;
      
      // Get existing entries for today
      const savedEntries = await AsyncStorage.getItem(storageKey);
      
      if (savedEntries) {
        const entries = JSON.parse(savedEntries);
        
        // Calculate totals from entries
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        entries.forEach((entry: any) => {
          totalCalories += entry.calories || 0;
          totalProtein += entry.protein_grams || 0;
          totalCarbs += entry.carbs_grams || 0;
          totalFat += entry.fat_grams || 0;
        });

        setTodayIntake({
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat
        });
        
        console.log('[DASHBOARD] Loaded food entries:', entries.length, 'entries, total calories:', totalCalories);
      } else {
        // No entries for today, set to 0
        setTodayIntake({
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        });
        console.log('[DASHBOARD] No food entries found for today');
      }
    } catch (error) {
      console.error('[DASHBOARD] Error fetching food entries:', error);
      // Fallback to 0 if there's an error
      setTodayIntake({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      });
    }
  }, [user]);

  // Fetch recent workouts and next workout
  const fetchWorkoutData = useCallback(async () => {
    try {
      if (!user?.id) return;
      
      console.log('[DASHBOARD] Fetching workout data...');
      
      // Get recent workouts
      const workouts = await WorkoutHistoryService.getCompletedSessions(user.id);
      console.log('[DASHBOARD] Found workouts:', workouts?.length || 0);
      
      // Take only the most recent 3 workouts
      const recentWorkouts = (workouts || []).slice(0, 3);
      setRecentWorkouts(recentWorkouts);
      
      // Get next workout session
      const nextWorkoutSession = await WorkoutService.getNextWorkoutSession(user.id);
      console.log('[DASHBOARD] Next workout session:', nextWorkoutSession);
      console.log('[DASHBOARD] User ID:', user.id);
      console.log('[DASHBOARD] Active plan available:', !!nextWorkoutSession);
      if (nextWorkoutSession) {
        console.log('[DASHBOARD] Next workout splitName:', nextWorkoutSession.splitName);
        console.log('[DASHBOARD] Next workout estimatedTime:', nextWorkoutSession.estimatedTime);
      } else {
        console.log('[DASHBOARD] No next workout found - debugging getNextWorkoutSession');
      }
      setNextWorkout(nextWorkoutSession);
      
    } catch (error) {
      console.error('[DASHBOARD] Error fetching workout data:', error);
    }
  }, [user?.id]);

  // Fetch recent nutrition entries
  const fetchRecentMeals = useCallback(async () => {
    try {
      if (!user?.id || user.id === 'guest') {
        console.log('[DASHBOARD] Skipping meal fetch for guest user');
        return;
      }
      
      console.log('[DASHBOARD] Fetching recent meals...');
      
      const response = await fetch(`${environment.apiUrl}/api/recent-nutrition/${user.id}?limit=5`);
      
      if (response.ok) {
        const result = await response.json() as { data?: any[] };
        console.log('[DASHBOARD] Found meals:', result.data?.length || 0);
        setRecentMeals(result.data || []);
      } else {
        console.warn('[DASHBOARD] Failed to fetch meals:', response.status);
        setRecentMeals([]);
      }
      
    } catch (error) {
      console.error('[DASHBOARD] Error fetching meal data:', error);
      setRecentMeals([]);
    }
  }, [user?.id]);

  // Fetch nutrition plan and food entries
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const uid = user?.id || 'guest';
      
      // Get active nutrition plan
      const latestPlan = await NutritionService.getLatestNutritionPlan(uid);
      console.log('[DASHBOARD] Latest nutrition plan:', latestPlan);
      
      if (latestPlan) {
        setActivePlan(latestPlan);
      }
      
      // Get today's food entries
      await fetchFoodEntries();
      
      // Get workout data
      await fetchWorkoutData();
      
      // Get recent meals
      await fetchRecentMeals();
      
    } catch (error) {
      console.error('[DASHBOARD] Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchFoodEntries, fetchWorkoutData, fetchRecentMeals]);

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      analyticsTrack('screen_view', { screen: 'dashboard' });
      console.log('[DASHBOARD] Screen focused');
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData().finally(() => {
      setIsRefreshing(false);
    });
  }, [fetchData]);

  // Handle quick start workout
  const handleQuickStart = useCallback(() => {
    if (!nextWorkout?.sessionId) {
      console.warn('[DASHBOARD] No session ID for next workout');
      return;
    }
    
    // Navigate directly to the workout session
    router.push({
      pathname: `/(main)/workout/session/${nextWorkout.sessionId}`,
      params: { 
        sessionTitle: nextWorkout.splitName,
        fallbackExercises: JSON.stringify(nextWorkout.exercises || [])
      }
    });
  }, [nextWorkout, router]);

  // Format the current date
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const quickActions: QuickActionItem[] = [
    {
      id: '1',
      title: 'Log Food',
      icon: 'food-apple-outline',
      color: colors.primary,
      route: '/(main)/nutrition/log-food',
      gradient: colors.gradient as [string, string],
    },
    {
      id: '2',
      title: 'Workout',
      icon: 'dumbbell',
      color: colors.accent,
      route: '/(main)/workout/plans',
      gradient: colors.gradientSecondary as [string, string],
    },
    {
      id: '3',
      title: 'Progress',
      icon: 'chart-line',
      color: colors.success,
      route: '/(main)/progress/photo-upload',
      gradient: colors.gradientSuccess as [string, string],
    },
  ];

  // Get goal-adjusted calories for accurate progress calculation
  const getGoalAdjustedCalories = () => {
    return activePlan?.metabolic_calculations?.goal_calories || 
           activePlan?.metabolic_calculations?.adjusted_calories || 
           activePlan?.daily_targets?.calories || 0;
  };

  // Calculate nutrition progress using goal-adjusted calories
  const nutritionProgress = getGoalAdjustedCalories() > 0
    ? Math.min((todayIntake.calories / getGoalAdjustedCalories()) * 100, 100)
    : 0;

  // Update the overview cards with real nutrition data
  const overviewCards: OverviewCardItem[] = [
    {
      id: '1',
      title: 'NUTRITION PLAN',
      subtitle: 'Track your daily intake',
      icon: 'food-apple-outline',
      color: colors.primary,
      gradient: colors.gradient as [string, string],
      value: getGoalAdjustedCalories().toString(),
      unit: 'kcal',
      progress: Math.round(nutritionProgress),
      route: '/nutrition',
    },
    {
      id: '2',
      title: 'WORKOUT PLAN',
      subtitle: nextWorkout ? `Next: ${nextWorkout.splitName}` : 'No workout plan',
      icon: 'dumbbell',
      color: colors.accent,
      gradient: colors.gradientSecondary as [string, string],
      value: nextWorkout ? nextWorkout.estimatedTime.replace(' minutes', '').replace(' minute', '').replace(' min', '') : '0',
      unit: 'min',
      progress: 0, // Remove progress bar by setting to 0
      route: '/workout',
      hasQuickStart: true, // Add flag for quick start button
      quickStartEnabled: !!nextWorkout, // Enable only if there's a next workout
    },
  ];

  const metrics = [
    {
      id: '1',
      title: 'Calories',
      value: todayIntake.calories.toString(),
      unit: 'kcal',
      icon: 'fire',
      color: colors.primary,
    },
    {
      id: '2',
      title: 'Protein',
      value: todayIntake.protein.toString(),
      unit: 'g',
      icon: 'food-steak',
      color: colors.accent,
    },
    {
      id: '3',
      title: 'Carbs',
      value: todayIntake.carbs.toString(),
      unit: 'g',
      icon: 'bread-slice',
      color: colors.success,
    },
    {
      id: '4',
      title: 'Fat',
      value: todayIntake.fat.toString(),
      unit: 'g',
      icon: 'oil',
      color: colors.warning,
    },
  ];

  // Calculate weekly workout stats
  const getWeeklyWorkoutStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeekWorkouts = recentWorkouts.filter(workout => 
      new Date(workout.completed_at) >= oneWeekAgo
    );
    
    return {
      count: thisWeekWorkouts.length,
      trend: thisWeekWorkouts.length > 0 ? `+${thisWeekWorkouts.length}` : '0'
    };
  };

  // Calculate weekly calories burnt from workouts
  const getWeeklyCaloriesBurnt = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeekWorkouts = recentWorkouts.filter(workout => 
      new Date(workout.completed_at) >= oneWeekAgo
    );
    
    console.log('[DASHBOARD] This week workouts for calorie calculation:', thisWeekWorkouts.map(w => ({ 
      id: w.id, 
      completed_at: w.completed_at, 
      estimated_calories: w.estimated_calories 
    })));
    
    const totalCaloriesBurnt = thisWeekWorkouts.reduce((total, workout) => {
      const calories = workout.estimated_calories || 0;
      console.log(`[DASHBOARD] Adding ${calories} calories from workout ${workout.id}`);
      return total + calories;
    }, 0);
    
    console.log(`[DASHBOARD] Total weekly calories burnt: ${totalCaloriesBurnt}`);
    
    return {
      total: totalCaloriesBurnt,
      trend: totalCaloriesBurnt > 0 ? `+${totalCaloriesBurnt}` : '0'
    };
  };

  const weeklyWorkoutStats = getWeeklyWorkoutStats();
  const weeklyCaloriesBurnt = getWeeklyCaloriesBurnt();

  const weeklyStats = [
    {
      id: '1',
      title: 'WORKOUTS',
      value: weeklyWorkoutStats.count.toString(),
      unit: 'sessions',
      icon: 'dumbbell',
      color: colors.primary,
      trend: weeklyWorkoutStats.trend,
    },
    {
      id: '2',
      title: 'CALORIES BURNT',
      value: weeklyCaloriesBurnt.total.toString(),
      unit: 'kcal',
      icon: 'fire',
      color: colors.warning,
      trend: weeklyCaloriesBurnt.trend,
    },
    {
      id: '3',
      title: 'CALORIES',
      value: todayIntake.calories.toString(),
      unit: 'consumed',
      icon: 'food-apple',
      color: colors.accent,
      trend: todayIntake.calories > 0 ? `+${todayIntake.calories}` : '0',
    }
  ];

  // Format recent workouts for display
  const formatWorkoutTime = (completedAt: string) => {
    const date = new Date(completedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const recentActivities = recentWorkouts.length > 0 
    ? recentWorkouts.map((workout, index) => ({
        id: workout.id || `workout-${index}`,
        title: workout.split_name || 'Workout Completed',
        subtitle: workout.split_focus ? workout.split_focus.join(', ') : 'Training Session',
        icon: 'dumbbell',
        color: colors.primary,
        time: formatWorkoutTime(workout.completed_at),
        route: `/(main)/workout/history-session/${workout.id}`,
      }))
    : [
        {
          id: '1',
          title: nextWorkout ? 'No Recent Activities' : 'No Workout Plan',
          subtitle: nextWorkout ? 'Complete your next workout to see it here' : 'Create a workout plan to get started',
          icon: nextWorkout ? 'information-outline' : 'dumbbell-off',
          color: colors.textSecondary,
          time: '',
          route: nextWorkout ? '/workout' : '/workout/plans',
        }
      ];

  const renderQuickAction = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.quickActionButton}
      onPress={() => router.push(item.route)}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.quickActionGradient}
      >
        <View style={styles.quickActionContent}>
          <Icon name={item.icon} size={28} color={item.color} />
          <Text style={styles.quickActionText}>{item.title}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderOverviewCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.overviewCard}
      onPress={() => router.push(item.route)}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.overviewCardGradient}
      >
        <View style={styles.overviewCardHeader}>
          <View style={styles.overviewCardIconContainer}>
            <Icon name={item.icon} size={24} color={item.color} />
          </View>
          <View style={styles.overviewCardInfo}>
            <Text style={styles.overviewCardTitle}>{item.title}</Text>
            <Text style={styles.overviewCardSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <View style={styles.overviewCardValue}>
          <Text style={styles.overviewCardValueText}>
            {item.value}
            <Text style={styles.overviewCardUnit}> {item.unit}</Text>
          </Text>
        </View>
        <View style={styles.overviewCardProgress}>
          <View style={styles.hexagonalProgressContainer}>
            {Array.from({ length: 6 }, (_, index) => (
              <View 
                key={index}
                style={[
                  styles.hexagonalSegment,
                  { 
                    backgroundColor: item.progress > (index + 1) * 16.67 
                      ? item.color 
                      : 'rgba(255, 255, 255, 0.1)',
                    transform: [{ rotate: `${index * 60}deg` }]
                  }
                ]}
              />
            ))}
            <View style={styles.hexagonalCenter}>
              <Text style={styles.hexagonalPercentage}>{item.progress}%</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderMetric = ({ item }: { item: any }) => (
    <View style={styles.metricCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.metricCardGradient}
      >
        <View style={styles.metricIconContainer}>
          <Icon name={item.icon} size={24} color={item.color} />
        </View>
        <Text style={styles.metricValue}>
          {item.value}
          <Text style={styles.metricUnit}> {item.unit}</Text>
        </Text>
        <Text style={styles.metricTitle}>{item.title}</Text>
      </LinearGradient>
    </View>
  );

  const renderWeeklyStat = ({ item }: { item: any }) => (
    <View style={styles.weeklyStatCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.weeklyStatCardGradient}
      >
        <View style={styles.weeklyStatHeader}>
          <View style={styles.weeklyStatIconContainer}>
            <Icon name={item.icon} size={20} color={item.color} />
          </View>
          <Text style={styles.weeklyStatTrend}>{item.trend}</Text>
        </View>
        <Text style={styles.weeklyStatValue}>
          {item.value}
          <Text style={styles.weeklyStatUnit}> {item.unit}</Text>
        </Text>
        <Text style={styles.weeklyStatTitle}>{item.title}</Text>
      </LinearGradient>
    </View>
  );

  const renderRecentActivity = ({ item }: { item: any }) => (
    <View style={styles.activityCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.activityCardGradient}
      >
        <View style={styles.activityHeader}>
          <View style={styles.activityIconContainer}>
            <Icon name={item.icon} size={20} color={item.color} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
          </View>
          <Text style={styles.activityTime}>{item.time}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Full-screen background */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2000&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.92)', 'rgba(0,0,0,0.78)', 'rgba(0,0,0,0.72)', '#121212']}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* App header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLine} />
        <Text style={styles.appName}>GoFit<Text style={{ color: colors.primary }}>AI</Text></Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.content}>
            {/* Today's Date and Title */}
            <View style={styles.titleSection}>
              <Text style={styles.titleDate}>{formattedDate.toUpperCase()}</Text>
              <Text style={styles.titleMain}>DASHBOARD</Text>
              <Text style={styles.titleDescription}>
                Welcome back! Here's your fitness overview for today
              </Text>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>01 <Text style={styles.sectionTitleText}>QUICK ACTIONS</Text></Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActions}
            >
              {quickActions.map((action) => (
                <TouchableOpacity 
                  key={action.id}
                  style={styles.quickActionButton}
                  activeOpacity={0.85}
                  onPress={() => router.push(action.route)}
                >
                  <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.quickActionGradient, { borderColor: `${action.color}33` }]}
                  >
                    <View style={styles.quickActionContent}>
                      <View style={[styles.quickActionIconWrapper, { borderColor: `${action.color}55`, shadowColor: action.color }]}>
                        <LinearGradient
                          colors={action.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.quickActionIconGradient}
                        >
                          <View style={styles.quickActionIconContainer}>
                            <Icon name={action.icon} size={22} color={colors.white} />
                          </View>
                        </LinearGradient>
                      </View>
                      <Text style={styles.quickActionText}>{action.title}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Overview Cards */}
            <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>OVERVIEW</Text></Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.overviewCards}
            >
              {overviewCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.overviewCard}
                  onPress={() => router.push(card.route)}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                    style={[styles.overviewCardGradient, { borderColor: `${card.color}33` }]}
                  >
                    {/* Top section: Header */}
                    <View style={styles.overviewCardHeader}>
                      <View style={styles.overviewCardIconContainer}>
                        <Icon name={card.icon} size={24} color={card.color} />
                      </View>
                      <View style={styles.overviewCardInfo}>
                        <Text style={styles.overviewCardTitle}>{card.title}</Text>
                        <Text style={styles.overviewCardSubtitle}>{card.subtitle}</Text>
                      </View>
                    </View>
                    
                    {/* Middle section: Value */}
                    <View style={styles.overviewCardValue}>
                      <Text style={styles.overviewCardValueText}>
                        {card.value}
                        <Text style={styles.overviewCardUnit}> {card.unit}</Text>
                      </Text>
                    </View>
                    
                    {/* Bottom section: Action or Progress */}
                    <View style={styles.overviewCardBottom}>
                      {card.hasQuickStart ? (
                        <TouchableOpacity 
                          style={[styles.quickStartButton, !card.quickStartEnabled && styles.quickStartButtonDisabled]}
                          onPress={card.quickStartEnabled ? handleQuickStart : undefined}
                          activeOpacity={card.quickStartEnabled ? 0.8 : 1}
                        >
                          <LinearGradient
                            colors={card.quickStartEnabled ? [colors.primary, colors.primaryDark] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                            style={styles.quickStartButtonGradient}
                          >
                            <Icon 
                              name="play-circle-outline" 
                              size={16} 
                              color={card.quickStartEnabled ? colors.white : colors.mediumGray} 
                            />
                            <Text style={[styles.quickStartButtonText, !card.quickStartEnabled && styles.quickStartButtonTextDisabled]}>
                              Quick Start
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.overviewCardProgress}>
                          <View style={styles.progressBarContainer}>
                            <LinearGradient
                              colors={card.gradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.progressBar, { width: `${card.progress}%`, backgroundColor: 'transparent' }]}
                            />
                          </View>
                          <Text style={styles.progressText}>{card.progress}%</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Metrics Grid */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>03 <Text style={styles.sectionTitleText}>TODAY'S NUTRITION</Text></Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/nutrition/log-food')}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.addButtonGradient}
                >
                  <Icon name="plus" size={16} color={colors.white} />
                  <Text style={styles.addButtonText}>Log Food</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.metricsGrid}>
              {metrics.map((metric) => (
                <View key={metric.id} style={styles.metricCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                    style={styles.metricCardGradient}
                  >
                    <View style={styles.metricIconContainer}>
                      <Icon name={metric.icon} size={24} color={metric.color} />
                    </View>
                    <Text style={styles.metricValue}>
                      {metric.value}
                      <Text style={styles.metricUnit}> {metric.unit}</Text>
                    </Text>
                    <Text style={styles.metricTitle}>{metric.title}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>

            {/* Weekly Stats */}
            <Text style={styles.sectionTitle}>04 <Text style={styles.sectionTitleText}>WEEKLY STATS</Text></Text>
            <View style={styles.weeklyStatsGrid}>
              {weeklyStats.map((stat) => (
                <View key={stat.id} style={styles.weeklyStatCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                    style={styles.weeklyStatCardGradient}
                  >
                    <View style={styles.weeklyStatHeader}>
                      <View style={styles.weeklyStatIconContainer}>
                        <Icon name={stat.icon} size={20} color={stat.color} />
                      </View>
                      <Text style={styles.weeklyStatTrend}>{stat.trend}</Text>
                    </View>
                    <Text style={styles.weeklyStatValue}>
                      {stat.value}
                      <Text style={styles.weeklyStatUnit}> {stat.unit}</Text>
                    </Text>
                    <Text style={styles.weeklyStatTitle}>{stat.title}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>

            {/* Recent Activities */}
            <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>05 <Text style={styles.sectionTitleText}>RECENT ACTIVITIES</Text></Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push(nextWorkout ? '/workout' : '/workout/plans')}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.addButtonGradient}
                >
                  <Icon name="plus" size={16} color={colors.white} />
                  <Text style={styles.addButtonText}>{nextWorkout ? 'Start Workout' : 'Create Plan'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.activitiesContainer}>
              {recentActivities.map((activity) => (
                <TouchableOpacity 
                  key={activity.id} 
                  style={styles.activityCard}
                  onPress={() => activity.route && router.push(activity.route)}
                  disabled={!activity.route}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                    style={styles.activityCardGradient}
                  >
                    <View style={styles.activityHeader}>
                      <View style={styles.activityIconContainer}>
                        <Icon name={activity.icon} size={20} color={activity.color} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                      </View>
                      <View style={styles.activityRightSection}>
                        <Text style={styles.activityTime}>{activity.time}</Text>
                        <Icon name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
      </ScrollView>
    </View>
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
  content: {
    padding: 24,
  },
  titleSection: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleDate: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  titleMain: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 8,
  },
  titleDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 22,
  },
  scrollContent: {
    padding: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitleText: {
    color: colors.white,
    marginLeft: 8,
    letterSpacing: 1,
  },
  quickActions: {
    flexDirection: 'row',
    paddingRight: 24,
    paddingBottom: 8,
    marginBottom: 32,
  },
  quickActionButton: {
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    width: 140,
  },
  quickActionGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionIconWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  quickActionIconGradient: {
    borderRadius: 14,
    padding: 12,
  },
  quickActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewCards: {
    flexDirection: 'row',
    paddingRight: 24,
    paddingBottom: 8,
    marginBottom: 32,
  },
  overviewCard: {
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    width: 280,
    height: 160, // Fixed height for consistent sizing
  },
  overviewCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    flex: 1, // Fill the entire card height
    justifyContent: 'space-between', // Distribute content evenly
  },
  overviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overviewCardInfo: {
    flex: 1,
  },
  overviewCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  overviewCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  overviewCardValue: {
    // Remove marginBottom since we're using space-between layout
  },
  overviewCardValueText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  overviewCardUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  overviewCardBottom: {
    // Bottom section container - ensures consistent bottom spacing
  },
  overviewCardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
    shadowColor: 'rgba(255, 107, 53, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quickStartButtonDisabled: {
    opacity: 0.5,
  },
  quickStartButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  quickStartButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickStartButtonTextDisabled: {
    color: colors.mediumGray,
  },
  hexagonalProgressContainer: {
    width: 60,
    height: 60,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hexagonalSegment: {
    position: 'absolute',
    width: 30,
    height: 8,
    borderRadius: 4,
    top: '50%',
    left: '50%',
    marginTop: -4,
    marginLeft: -15,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  hexagonalCenter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hexagonalPercentage: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  waveProgressContainer: {
    flex: 1,
    height: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 2,
  },
  waveSegment: {
    flex: 1,
    borderRadius: 2,
    marginHorizontal: 1,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
    elevation: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  metricCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  weeklyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  weeklyStatCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  weeklyStatCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  weeklyStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyStatIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weeklyStatTrend: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  weeklyStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  weeklyStatUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  weeklyStatTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  activitiesContainer: {
    marginBottom: 32,
  },
  activityCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activityCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  activityRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
    minWidth: 50,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DashboardScreen; 