import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/styles/colors';
import { NutritionService } from '../../src/services/nutrition/NutritionService';
import { WorkoutHistoryService, CompletedSessionListItem } from '../../src/services/workout/WorkoutHistoryService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  gradient: string[];
}

const quickActions: QuickAction[] = [
  {
    id: 'workout',
    title: 'Start Workout',
    subtitle: 'Begin your training session',
    icon: 'dumbbell',
    route: '/(main)/workout',
    gradient: ['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)'],
  },
  {
    id: 'nutrition',
    title: 'Nutrition Plan',
    subtitle: 'Track your daily nutrition',
    icon: 'food-apple-outline',
    route: '/(main)/nutrition',
    gradient: ['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)'],
  },
  {
    id: 'progress',
    title: 'Track Progress',
    subtitle: 'Log your body metrics',
    icon: 'chart-line',
    route: '/(main)/progress',
    gradient: ['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)'],
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Customize your experience',
    icon: 'cog',
    route: '/(main)/settings',
    gradient: ['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)'],
  },
];

interface NutritionProgress {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showRemaining, setShowRemaining] = useState(false);
  const [nutritionProgress, setNutritionProgress] = useState<NutritionProgress | null>(null);
  const [recentActivities, setRecentActivities] = useState<CompletedSessionListItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Fetch nutrition progress
  const fetchNutritionProgress = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Get active nutrition plan
      const plan = await NutritionService.getLatestNutritionPlan(user.id);
      
      if (!plan) {
        setNutritionProgress(null);
        return;
      }

      // Get daily targets
      const targets = plan.daily_targets || {
        calories: 2000,
        protein_grams: 150,
        carbs_grams: 200,
        fat_grams: 65
      };

      // Get today's food logs from AsyncStorage
      const todayDate = new Date().toISOString().split('T')[0];
      const storageKey = `nutrition_log_${user.id}_${todayDate}`;
      const todayLogsStr = await AsyncStorage.getItem(storageKey);
      const todayLogs = todayLogsStr ? JSON.parse(todayLogsStr) : [];

      // Calculate current intake
      const current = todayLogs.reduce((acc: any, log: any) => {
        acc.calories += log.calories || 0;
        acc.protein += log.protein_grams || 0;
        acc.carbs += log.carbs_grams || 0;
        acc.fat += log.fat_grams || 0;
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setNutritionProgress({
        calories: { current: Math.round(current.calories), target: Math.round(targets.calories) },
        protein: { current: Math.round(current.protein), target: Math.round(targets.protein_grams) },
        carbs: { current: Math.round(current.carbs), target: Math.round(targets.carbs_grams) },
        fat: { current: Math.round(current.fat), target: Math.round(targets.fat_grams) }
      });
    } catch (error) {
      console.error('Error fetching nutrition progress:', error);
      setNutritionProgress(null);
    }
  }, [user?.id]);

  // Fetch recent workout activities
  const fetchRecentActivities = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const sessions = await WorkoutHistoryService.getCompletedSessions(user.id);
      // Get the 3 most recent activities
      setRecentActivities(sessions.slice(0, 3));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    }
  }, [user?.id]);

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    await Promise.all([
      fetchNutritionProgress(),
      fetchRecentActivities()
    ]);
    setLoadingData(false);
  }, [fetchNutritionProgress, fetchRecentActivities]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id, loadDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      "Ready to crush your goals today?",
      "Every step counts towards your success!",
      "Your fitness journey starts now!",
      "Make today count!",
      "Push your limits and grow stronger!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background */}
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

      {/* App header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLine} />
        <Text style={styles.appName}>GO<Text style={{ color: colors.primary }}>FIT</Text></Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.sectionContainer}>
          <LinearGradient
            colors={['rgba(255,107,53,0.2)', 'rgba(0,0,0,0.3)']}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {profile?.full_name || profile?.username || 'Champion'}! 👋
              </Text>
              <Text style={styles.motivationalText}>
                {getMotivationalMessage()}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              <Text style={styles.dateText}>
                {currentTime.toLocaleDateString([], { 
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Today's Focus */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Today's Focus</Text>
          <LinearGradient
            colors={['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)']}
            style={styles.focusCard}
          >
            <View style={styles.focusContent}>
              <Icon name="target" size={28} color={colors.primary} />
              <View style={styles.focusText}>
                <Text style={styles.focusTitle}>Stay Consistent</Text>
                <Text style={styles.focusDescription}>
                  Small daily actions lead to big results. Choose one thing to focus on today.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={action.gradient as any}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.actionContent}>
                    <View style={[styles.actionIconContainer, {
                      backgroundColor: 'rgba(255,107,53,0.3)',
                      borderColor: 'rgba(255,107,53,0.5)',
                      borderWidth: 1,
                      shadowColor: colors.primary,
                    }]}>
                      <Icon 
                        name={action.icon as any} 
                        size={28} 
                        color={colors.white} 
                      />
                    </View>
                    
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                    </View>
                  </View>
                  
                  {/* Subtle highlight overlay */}
                  <View style={[styles.actionHighlight, {
                    backgroundColor: 'rgba(255,107,53,0.08)'
                  }]} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Nutrition Progress */}
        {nutritionProgress && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Nutrition</Text>
              <View style={styles.nutritionActions}>
                <TouchableOpacity 
                  style={styles.nutritionActionButton}
                  onPress={() => router.push('/(main)/nutrition/log-food')}
                >
                  <Icon name="plus-circle" size={16} color={colors.primary} />
                  <Text style={styles.nutritionActionText}>Log Food</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.nutritionActionButtonSecondary,
                    showRemaining && styles.nutritionActionButtonActive
                  ]}
                  onPress={() => setShowRemaining(!showRemaining)}
                >
                  <Icon 
                    name={showRemaining ? "check-circle" : "information-outline"} 
                    size={16} 
                    color={showRemaining ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.nutritionActionTextSecondary,
                    showRemaining && styles.nutritionActionTextActive
                  ]}>
                    {showRemaining ? "Show Consumed" : "Show Remaining"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <LinearGradient
              colors={['rgba(255,107,53,0.2)', 'rgba(0,0,0,0.25)']}
              style={styles.nutritionCard}
            >
              {/* Calories - Main Focus */}
              <View style={styles.caloriesContainer}>
                <View style={styles.caloriesHeader}>
                  <Icon name="fire" size={24} color={colors.primary} />
                  <Text style={styles.caloriesLabel}>Calories {showRemaining ? 'Remaining' : 'Consumed'}</Text>
                </View>
                <View style={styles.caloriesProgress}>
                  <Text style={styles.caloriesNumber}>
                    {showRemaining 
                      ? Math.max(0, nutritionProgress.calories.target - nutritionProgress.calories.current)
                      : nutritionProgress.calories.current
                    }
                  </Text>
                  <Text style={styles.caloriesTarget}>
                    / {nutritionProgress.calories.target}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${Math.min(showRemaining 
                            ? Math.max(0, ((nutritionProgress.calories.target - nutritionProgress.calories.current) / nutritionProgress.calories.target) * 100)
                            : (nutritionProgress.calories.current / nutritionProgress.calories.target) * 100
                          , 100)}%`,
                          backgroundColor: colors.primary
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressPercentage}>
                    {Math.round(showRemaining 
                      ? Math.max(0, ((nutritionProgress.calories.target - nutritionProgress.calories.current) / nutritionProgress.calories.target) * 100)
                      : (nutritionProgress.calories.current / nutritionProgress.calories.target) * 100
                    )}%
                  </Text>
                </View>
              </View>

              {/* Macros Grid */}
              <View style={styles.macrosGrid}>
                <View style={styles.macroItem}>
                  <Icon name="food-drumstick" size={20} color="#4ECDC4" />
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>
                    {showRemaining 
                      ? Math.max(0, nutritionProgress.protein.target - nutritionProgress.protein.current)
                      : nutritionProgress.protein.current
                    }g
                  </Text>
                  <Text style={styles.macroTarget}>
                    of {nutritionProgress.protein.target}g
                  </Text>
                  <View style={styles.miniProgressBar}>
                    <View 
                      style={[
                        styles.miniProgressFill, 
                        { 
                          width: `${Math.min(showRemaining
                            ? Math.max(0, ((nutritionProgress.protein.target - nutritionProgress.protein.current) / nutritionProgress.protein.target) * 100)
                            : (nutritionProgress.protein.current / nutritionProgress.protein.target) * 100
                          , 100)}%`,
                          backgroundColor: '#4ECDC4'
                        }
                      ]} 
                    />
                  </View>
                </View>

                <View style={styles.macroItem}>
                  <Icon name="bread-slice" size={20} color="#95E1D3" />
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>
                    {showRemaining 
                      ? Math.max(0, nutritionProgress.carbs.target - nutritionProgress.carbs.current)
                      : nutritionProgress.carbs.current
                    }g
                  </Text>
                  <Text style={styles.macroTarget}>
                    of {nutritionProgress.carbs.target}g
                  </Text>
                  <View style={styles.miniProgressBar}>
                    <View 
                      style={[
                        styles.miniProgressFill, 
                        { 
                          width: `${Math.min(showRemaining
                            ? Math.max(0, ((nutritionProgress.carbs.target - nutritionProgress.carbs.current) / nutritionProgress.carbs.target) * 100)
                            : (nutritionProgress.carbs.current / nutritionProgress.carbs.target) * 100
                          , 100)}%`,
                          backgroundColor: '#95E1D3'
                        }
                      ]} 
                    />
                  </View>
                </View>

                <View style={styles.macroItem}>
                  <Icon name="water" size={20} color="#F38181" />
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>
                    {showRemaining 
                      ? Math.max(0, nutritionProgress.fat.target - nutritionProgress.fat.current)
                      : nutritionProgress.fat.current
                    }g
                  </Text>
                  <Text style={styles.macroTarget}>
                    of {nutritionProgress.fat.target}g
                  </Text>
                  <View style={styles.miniProgressBar}>
                    <View 
                      style={[
                        styles.miniProgressFill, 
                        { 
                          width: `${Math.min(showRemaining
                            ? Math.max(0, ((nutritionProgress.fat.target - nutritionProgress.fat.current) / nutritionProgress.fat.target) * 100)
                            : (nutritionProgress.fat.current / nutritionProgress.fat.target) * 100
                          , 100)}%`,
                          backgroundColor: '#F38181'
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activities</Text>
              <TouchableOpacity onPress={() => router.push('/(main)/workout/history')}>
                <Text style={styles.sectionAction}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activitiesContainer}>
              {recentActivities.map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityCard}
                  onPress={() => router.push(`/(main)/workout/history-session/${activity.id}` as any)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255,107,53,0.15)', 'rgba(0,0,0,0.2)']}
                    style={styles.activityGradient}
                  >
                    <View style={styles.activityHeader}>
                      <View style={styles.activityIconContainer}>
                        <Icon name="dumbbell" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle} numberOfLines={1}>
                          {activity.session_name || activity.plan_name || 'Workout Session'}
                        </Text>
                        <Text style={styles.activityDate}>
                          {new Date(activity.completed_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                    </View>
                    <View style={styles.activityStats}>
                      {activity.duration_minutes && (
                        <View style={styles.activityStat}>
                          <Icon name="clock-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.activityStatText}>
                            {activity.duration_minutes} min
                          </Text>
                        </View>
                      )}
                      {activity.total_exercises && (
                        <View style={styles.activityStat}>
                          <Icon name="weight-lifter" size={14} color={colors.textSecondary} />
                          <Text style={styles.activityStatText}>
                            {activity.total_exercises} exercises
                          </Text>
                        </View>
                      )}
                      {activity.total_sets && (
                        <View style={styles.activityStat}>
                          <Icon name="format-list-numbered" size={14} color={colors.textSecondary} />
                          <Text style={styles.activityStatText}>
                            {activity.total_sets} sets
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  overlay: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  welcomeCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 8,
  },
  motivationalText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: colors.white,
    fontWeight: 'bold',
  },
  sectionAction: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  nutritionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  nutritionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,107,53,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  nutritionActionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  nutritionActionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nutritionActionTextSecondary: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  nutritionActionButtonActive: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: 'rgba(255,107,53,0.3)',
  },
  nutritionActionTextActive: {
    color: colors.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (screenWidth - 76) / 2,
    height: 130,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  actionGradient: {
    flex: 1,
    borderRadius: 24,
    position: 'relative',
  },
  actionContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionTextContainer: {
    flex: 1,
    marginTop: 8,
  },
  actionTitle: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 14,
    fontWeight: '500',
  },
  actionHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  focusCard: {
    borderRadius: 16,
    padding: 20,
  },
  focusContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  focusText: {
    flex: 1,
  },
  focusTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 6,
  },
  focusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Nutrition Progress Styles
  nutritionCard: {
    borderRadius: 20,
    padding: 20,
  },
  caloriesContainer: {
    marginBottom: 20,
  },
  caloriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  caloriesLabel: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  caloriesProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  caloriesNumber: {
    fontSize: 36,
    color: colors.white,
    fontWeight: 'bold',
  },
  caloriesTarget: {
    fontSize: 18,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
    minWidth: 40,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroItem: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    color: colors.white,
    fontWeight: 'bold',
  },
  macroTarget: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  miniProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Recent Activities Styles
  activitiesContainer: {
    gap: 12,
  },
  activityCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  activityGradient: {
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});