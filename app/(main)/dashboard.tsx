import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { NutritionService } from '../../src/services/nutrition/NutritionService';
import { WorkoutHistoryService, CompletedSessionListItem } from '../../src/services/workout/WorkoutHistoryService';
import { TutorialWrapper } from '../../src/components/tutorial/TutorialWrapper';
import { useTutorial } from '../../src/contexts/TutorialContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/services/supabase/client';
import { LocalPhotoStorageService } from '../../src/services/storage/localPhotoStorage';
import { WorkoutReminderService, WorkoutReminder } from '../../src/services/notifications/WorkoutReminderService';

const { width: screenWidth } = Dimensions.get('window');

// Clean color palette
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#22C55E',
  white: '#FFFFFF',
};

interface NutritionProgress {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { state: tutorialState, startTutorial } = useTutorial();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastCheckedDate, setLastCheckedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [showRemaining, setShowRemaining] = useState(false);
  const [nutritionProgress, setNutritionProgress] = useState<NutritionProgress | null>(null);
  const [recentActivities, setRecentActivities] = useState<CompletedSessionListItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userStats, setUserStats] = useState({
    workouts: 0,
    meals: 0,
    weightLogDays: 0,
    bodyPhotoDays: 0,
  });
  const [todoList, setTodoList] = useState({
    meals: false,
    mealsCount: 0,
    workout: false,
    weight: false,
    bodyPhoto: false,
  });
  const [nextReminder, setNextReminder] = useState<WorkoutReminder | null>(null);

  // Fetch upcoming workout reminder
  const fetchNextReminder = useCallback(async () => {
    try {
      const reminders = await WorkoutReminderService.getReminders();
      const activeReminders = reminders.filter(r => r.isActive);
      
      if (activeReminders.length === 0) {
        setNextReminder(null);
        return;
      }

      // Find the next upcoming reminder
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayIndex = dayOrder.indexOf(currentDay);

      let closestReminder: WorkoutReminder | null = null;
      let closestDayDiff = 8; // Max is 7 days

      for (const reminder of activeReminders) {
        if (reminder.type === 'one-time') {
          // For one-time reminders, check if it's today or in the future
          if (reminder.scheduledDate) {
            const reminderDate = new Date(reminder.scheduledDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (reminderDate >= today) {
              const dayDiff = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (dayDiff < closestDayDiff || (dayDiff === closestDayDiff && reminder.scheduledTime < (closestReminder?.scheduledTime || '24:00'))) {
                closestDayDiff = dayDiff;
                closestReminder = reminder;
              }
            }
          }
        } else {
          // For recurring reminders
          for (const day of reminder.days) {
            const dayIndex = dayOrder.indexOf(day.toLowerCase());
            let dayDiff = dayIndex - currentDayIndex;
            
            // If it's today, check if the time has passed
            if (dayDiff === 0) {
              if (reminder.scheduledTime <= currentTime) {
                dayDiff = 7; // Next week
              }
            } else if (dayDiff < 0) {
              dayDiff += 7;
            }

            if (dayDiff < closestDayDiff || (dayDiff === closestDayDiff && reminder.scheduledTime < (closestReminder?.scheduledTime || '24:00'))) {
              closestDayDiff = dayDiff;
              closestReminder = reminder;
            }
          }
        }
      }

      setNextReminder(closestReminder);
    } catch (error) {
      console.error('Error fetching next reminder:', error);
      setNextReminder(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setInterval(() => {
      if (!isMounted) return;
      
      const now = new Date();
      setCurrentTime(now);
      
      // Check if date has changed (new day)
      const todayDate = now.toISOString().split('T')[0];
      if (todayDate !== lastCheckedDate) {
        console.log('[Dashboard] Date changed, refreshing checklist');
        setLastCheckedDate(todayDate);
        // Refresh todo list when date changes
        if (user?.id && isMounted) {
          fetchTodoList();
        }
      }
    }, 60000); // Update every minute

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [lastCheckedDate, user?.id, fetchTodoList]);

  // Fetch nutrition progress
  const fetchNutritionProgress = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Get selected nutrition plan (for daily targets)
      const plan = await NutritionService.getLatestNutritionPlan(user.id);
      
      if (!plan) {
        setNutritionProgress(null);
        return;
      }

      // Get daily targets with priority (same as nutrition screen)
      // First priority: Metabolic calculations goal_calories
      const calorieTarget = plan.metabolic_calculations?.goal_calories || 
                           plan.metabolic_calculations?.adjusted_calories || 
                           plan.daily_targets?.calories || 
                           2000;
      
      const targets = {
        calories: calorieTarget,
        protein: plan.daily_targets?.protein || plan.daily_targets?.protein_grams || 150,
        carbs: plan.daily_targets?.carbs || plan.daily_targets?.carbs_grams || 200,
        fat: plan.daily_targets?.fat || plan.daily_targets?.fat_grams || 65
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
        calories: { current: Math.round(current.calories), target: Math.round(targets.calories || 2000) },
        protein: { current: Math.round(current.protein), target: Math.round(targets.protein || targets.protein_grams || 150) },
        carbs: { current: Math.round(current.carbs), target: Math.round(targets.carbs || targets.carbs_grams || 200) },
        fat: { current: Math.round(current.fat), target: Math.round(targets.fat || targets.fat_grams || 65) }
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

  // Fetch user statistics
  const fetchUserStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // 1. Count workouts from workout_history
      const { count: workoutCount, error: workoutError } = await supabase
        .from('workout_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (workoutError) {
        console.error('Error fetching workout count:', workoutError);
      }

      // 2. Count total number of meals from AsyncStorage
      let totalMeals = 0;
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const nutritionLogKeys = allKeys.filter(key => 
          key.startsWith(`nutrition_log_${user.id}_`)
        );
        
        // Count meals in each day's log
        for (const key of nutritionLogKeys) {
          const logData = await AsyncStorage.getItem(key);
          if (logData) {
            try {
              const meals = JSON.parse(logData);
              totalMeals += Array.isArray(meals) ? meals.length : 0;
            } catch (parseError) {
              console.error('Error parsing meal log:', parseError);
            }
          }
        }
      } catch (error) {
        console.error('Error counting meals:', error);
      }

      // 3. Count unique days with weight logs from daily_user_metrics
      const { data: weightData, error: weightError } = await supabase
        .from('daily_user_metrics')
        .select('metric_date')
        .eq('user_id', user.id)
        .not('weight_kg', 'is', null);

      let weightLogDays = 0;
      if (!weightError && weightData) {
        const uniqueDates = new Set(weightData.map(d => d.metric_date.split('T')[0]));
        weightLogDays = uniqueDates.size;
      }

      // Also check progress_entries for weight logs
      const { data: progressData, error: progressError } = await supabase
        .from('progress_entries')
        .select('date')
        .eq('user_id', user.id)
        .not('weight_kg', 'is', null);

      if (!progressError && progressData) {
        const uniqueProgressDates = new Set(progressData.map(d => d.date.split('T')[0]));
        weightLogDays = Math.max(weightLogDays, uniqueProgressDates.size);
      }

      // 4. Count unique days with body photos
      // Photos are stored locally in AsyncStorage
      let bodyPhotoDays = 0;
      const photoDates = new Set<string>();
      
      try {
        // Get all photos from LocalPhotoStorageService
        const allPhotos = await LocalPhotoStorageService.getUserPhotos(user.id);
        
        if (allPhotos && allPhotos.length > 0) {
          allPhotos.forEach(photo => {
            if (photo.date) {
              // Extract date part (YYYY-MM-DD) from the date string
              const dateStr = photo.date.split('T')[0];
              if (dateStr) {
                photoDates.add(dateStr);
              }
            }
          });
        }
      } catch (photoError) {
        console.warn('Error fetching photos from LocalPhotoStorageService:', photoError);
      }

      // Also check progress_entries for any photo references (backup)
      const { data: progressEntriesData, error: progressEntriesError } = await supabase
        .from('progress_entries')
        .select('date, front_photo_id, back_photo_id')
        .eq('user_id', user.id)
        .or('front_photo_id.not.is.null,back_photo_id.not.is.null');

      if (!progressEntriesError && progressEntriesData) {
        progressEntriesData.forEach(entry => {
          if (entry.date) {
            const dateStr = typeof entry.date === 'string' 
              ? entry.date.split('T')[0] 
              : new Date(entry.date).toISOString().split('T')[0];
            if (dateStr) {
              photoDates.add(dateStr);
            }
          }
        });
      }

      // Also check body_photos table directly (if any photos are stored there)
      const { data: bodyPhotosData, error: bodyPhotosError } = await supabase
        .from('body_photos')
        .select('uploaded_at, created_at')
        .eq('user_id', user.id);

      if (!bodyPhotosError && bodyPhotosData && bodyPhotosData.length > 0) {
        bodyPhotosData.forEach(photo => {
          const timestamp = photo.uploaded_at || photo.created_at;
          if (timestamp) {
            const dateStr = typeof timestamp === 'string' 
              ? timestamp.split('T')[0] 
              : new Date(timestamp).toISOString().split('T')[0];
            if (dateStr) {
              photoDates.add(dateStr);
            }
          }
        });
      }

      bodyPhotoDays = photoDates.size;

      setUserStats({
        workouts: workoutCount || 0,
        meals: totalMeals,
        weightLogDays,
        bodyPhotoDays,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, [user?.id]);

  // Fetch daily to-do list status
  const fetchTodoList = useCallback(async () => {
    if (!user?.id) return;

    try {
      const todayDate = new Date().toISOString().split('T')[0];
      
      // 1. Check if meals logged today and count them
      const mealStorageKey = `nutrition_log_${user.id}_${todayDate}`;
      const todayMealsStr = await AsyncStorage.getItem(mealStorageKey);
      const todayMeals = todayMealsStr ? JSON.parse(todayMealsStr) : [];
      const mealsCount = todayMeals.length;
      const hasMeals = mealsCount > 0;

      // 2. Check if workout completed today
      const { data: todayWorkout, error: workoutError } = await supabase
        .from('workout_history')
        .select('id')
        .eq('user_id', user.id)
        .gte('completed_at', `${todayDate}T00:00:00`)
        .lt('completed_at', `${todayDate}T23:59:59`)
        .limit(1);

      const hasWorkout = !workoutError && todayWorkout && todayWorkout.length > 0;

      // 3. Check if weight logged today
      const { data: todayWeight, error: weightError } = await supabase
        .from('daily_user_metrics')
        .select('id')
        .eq('user_id', user.id)
        .eq('metric_date', todayDate)
        .not('weight_kg', 'is', null)
        .limit(1);

      let hasWeight = !weightError && todayWeight && todayWeight.length > 0;

      // Also check progress_entries
      if (!hasWeight) {
        const { data: todayProgress, error: progressError } = await supabase
          .from('progress_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', todayDate)
          .not('weight_kg', 'is', null)
          .limit(1);

        hasWeight = !progressError && todayProgress && todayProgress.length > 0;
      }

      // 4. Check if body photo logged today
      const { data: todayPhoto, error: photoError } = await supabase
        .from('body_photos')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', `${todayDate}T00:00:00`)
        .lt('created_at', `${todayDate}T23:59:59`)
        .limit(1);

      const hasBodyPhoto = !photoError && todayPhoto && todayPhoto.length > 0;

      setTodoList({
        meals: hasMeals,
        mealsCount: mealsCount,
        workout: hasWorkout,
        weight: hasWeight,
        bodyPhoto: hasBodyPhoto,
      });
    } catch (error) {
      console.error('Error fetching todo list:', error);
    }
  }, [user?.id]);

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    // If tutorial is active, use instant mock data to avoid loading delays
    if (tutorialState.isActive) {
      console.log('[Dashboard] Tutorial active, using mock data');
      setNutritionProgress({
        calories: { current: 1450, target: 2200 },
        protein: { current: 110, target: 160 },
        carbs: { current: 180, target: 250 },
        fat: { current: 45, target: 70 }
      });
      setRecentActivities([
        {
          id: 'mock-1',
          session_name: 'Upper Body Power',
          completed_at: new Date().toISOString(),
          duration_minutes: 45,
          total_exercises: 6,
          total_sets: 18,
          user_id: 'mock',
          plan_id: 'mock',
          split_id: 'mock',
          rating: 5,
          notes: ''
        },
        {
          id: 'mock-2',
          session_name: 'Morning Cardio',
          completed_at: new Date(Date.now() - 86400000).toISOString(),
          duration_minutes: 30,
          total_exercises: 1,
          total_sets: 1,
          user_id: 'mock',
          plan_id: 'mock',
          split_id: 'mock',
          rating: 4,
          notes: ''
        }
      ]);
      setUserStats({
        workouts: 24,
        meals: 156, // Total meals, not days
        weightLogDays: 12,
        bodyPhotoDays: 5,
      });
      setTodoList({
        meals: true,
        mealsCount: 2,
        workout: true,
        weight: false,
        bodyPhoto: false,
      });
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    await Promise.all([
      fetchNutritionProgress(),
      fetchRecentActivities(),
      fetchUserStats(),
      fetchTodoList(),
      fetchNextReminder()
    ]);
    setLoadingData(false);
  }, [fetchNutritionProgress, fetchRecentActivities, fetchUserStats, fetchTodoList, fetchNextReminder, tutorialState.isActive]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id, loadDashboardData]);

  // Refresh nutrition progress and todo list when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // Check if date has changed since last check
        const todayDate = new Date().toISOString().split('T')[0];
        if (todayDate !== lastCheckedDate) {
          console.log('[Dashboard] Date changed on focus, updating last checked date');
          setLastCheckedDate(todayDate);
        }
        fetchNutritionProgress();
        fetchTodoList();
        fetchNextReminder();
      }
    }, [user?.id, fetchNutritionProgress, fetchTodoList, fetchNextReminder, lastCheckedDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = currentTime.getHours();
    const completedToday = (todoList.meals ? 1 : 0) + (todoList.workout ? 1 : 0) + (todoList.weight ? 1 : 0) + (todoList.bodyPhoto ? 1 : 0);
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    if (completedToday === 4) {
      message = "Amazing! You've completed all your daily tasks! 🎉";
    } else if (completedToday >= 2) {
      message = `Great progress! ${4 - completedToday} task${4 - completedToday > 1 ? 's' : ''} left for today.`;
    } else if (completedToday === 1) {
      message = "You're getting started! Keep the momentum going.";
    } else {
      message = "Ready to start your fitness journey today?";
    }
    
    return { greeting, message };
  }, [currentTime, todoList]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* AI Coach Header */}
        <TutorialWrapper tutorialId="ai-coach-header">
          <View style={styles.coachHeader}>
            <View style={styles.coachAvatarContainer}>
              <Image
                source={require('../../assets/mascot.png')}
                style={styles.coachAvatar}
              />
              <View style={styles.coachOnlineIndicator} />
            </View>
            <View style={styles.coachTextContainer}>
              <Text style={styles.coachGreeting}>
                {getAIGreeting.greeting}, {profile?.full_name?.split(' ')[0] || 'Champion'}
              </Text>
              <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
            </View>
          </View>
        </TutorialWrapper>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/workout')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
              <Icon name="dumbbell" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/nutrition')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="food-apple" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>Nutrition</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/progress')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="chart-line" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/settings')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="cog" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Checklist Card */}
        <View style={styles.checklistCard}>
          <View style={styles.checklistHeader}>
            <Icon name="clipboard-check-outline" size={20} color={colors.primary} />
            <Text style={styles.checklistTitle}>Daily Checklist</Text>
          </View>
          
          <TouchableOpacity
            style={styles.checklistItem}
            onPress={() => router.push('/(main)/nutrition/log-food')}
            activeOpacity={0.7}
          >
            <View style={[styles.checklistCheckbox, todoList.meals && styles.checklistCheckboxDone]}>
              {todoList.meals && <Icon name="check" size={14} color={colors.white} />}
            </View>
            <Text style={[styles.checklistText, todoList.meals && styles.checklistTextDone]}>
              {todoList.mealsCount > 0 ? `${todoList.mealsCount} Meal${todoList.mealsCount !== 1 ? 's' : ''} Tracked` : 'Track Meals'}
            </Text>
            {!todoList.meals && <Icon name="chevron-right" size={18} color={colors.textTertiary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checklistItem}
            onPress={() => router.replace('/(main)/workout/plans' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.checklistCheckbox, todoList.workout && styles.checklistCheckboxDone]}>
              {todoList.workout && <Icon name="check" size={14} color={colors.white} />}
            </View>
            <Text style={[styles.checklistText, todoList.workout && styles.checklistTextDone]}>
              Complete Workout
            </Text>
            {!todoList.workout && <Icon name="chevron-right" size={18} color={colors.textTertiary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checklistItem}
            onPress={() => router.push('/(main)/progress/log-progress')}
            activeOpacity={0.7}
          >
            <View style={[styles.checklistCheckbox, todoList.weight && styles.checklistCheckboxDone]}>
              {todoList.weight && <Icon name="check" size={14} color={colors.white} />}
            </View>
            <Text style={[styles.checklistText, todoList.weight && styles.checklistTextDone]}>
              Log Weight
            </Text>
            {!todoList.weight && <Icon name="chevron-right" size={18} color={colors.textTertiary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checklistItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/(main)/progress')}
            activeOpacity={0.7}
          >
            <View style={[styles.checklistCheckbox, todoList.bodyPhoto && styles.checklistCheckboxDone]}>
              {todoList.bodyPhoto && <Icon name="check" size={14} color={colors.white} />}
            </View>
            <Text style={[styles.checklistText, todoList.bodyPhoto && styles.checklistTextDone]}>
              Take Body Photo
            </Text>
            {!todoList.bodyPhoto && <Icon name="chevron-right" size={18} color={colors.textTertiary} />}
          </TouchableOpacity>
        </View>

        {/* Workout Reminder Card */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderHeaderLeft}>
              <Icon name="bell-ring" size={20} color={colors.primary} />
              <Text style={styles.reminderTitle}>Workout Reminder</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/(main)/settings/workout-reminders')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          {nextReminder ? (
            <View style={styles.reminderContent}>
              <View style={styles.reminderIconContainer}>
                <Icon name="dumbbell" size={24} color={colors.primary} />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderName}>{nextReminder.workoutName}</Text>
                <Text style={styles.reminderTime}>
                  {WorkoutReminderService.formatTime(nextReminder.scheduledTime)}
                  {nextReminder.type === 'recurring' && nextReminder.days.length > 0 && (
                    <Text style={styles.reminderDays}> • {WorkoutReminderService.formatDays(nextReminder.days)}</Text>
                  )}
                </Text>
              </View>
              <View style={styles.reminderBadge}>
                <Icon name="clock-outline" size={14} color={colors.success} />
                <Text style={styles.reminderBadgeText}>Active</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addReminderButton}
              onPress={() => router.push('/(main)/settings/create-reminder')}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={20} color={colors.primary} />
              <Text style={styles.addReminderText}>Add Workout Reminder</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nutrition Progress Card */}
        {nutritionProgress && (
          <View style={styles.nutritionCard}>
            <View style={styles.nutritionHeader}>
              <View style={styles.nutritionHeaderLeft}>
                <Icon name="fire" size={20} color={colors.primary} />
                <Text style={styles.nutritionTitle}>Today's Nutrition</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(main)/nutrition')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.calorieRow}>
              <Text style={styles.calorieValue}>{nutritionProgress.calories.current}</Text>
              <Text style={styles.calorieTarget}>/ {nutritionProgress.calories.target} kcal</Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min((nutritionProgress.calories.current / nutritionProgress.calories.target) * 100, 100)}%` }
                ]} 
              />
            </View>
            
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{nutritionProgress.protein.current}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{nutritionProgress.carbs.current}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{nutritionProgress.fat.current}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats Card */}
        <TutorialWrapper tutorialId="total-stats-card">
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Total</Text>
            </View>
            <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push('/(main)/workout-celebration')}
              activeOpacity={0.7}
            >
              <View style={styles.statItemContent}>
                <Text style={styles.statValue}>{userStats.workouts}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} style={styles.statChevron} />
              </View>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push('/(main)/meals-celebration')}
              activeOpacity={0.7}
            >
              <View style={styles.statItemContent}>
                <Text style={styles.statValue}>{userStats.meals}</Text>
                <Text style={styles.statLabel}>Meals</Text>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} style={styles.statChevron} />
              </View>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push('/(main)/weight-celebration')}
              activeOpacity={0.7}
            >
              <View style={styles.statItemContent}>
                <Text style={styles.statValue}>{userStats.weightLogDays}</Text>
                <Text style={styles.statLabel}>Weight Logs</Text>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} style={styles.statChevron} />
              </View>
            </TouchableOpacity>
          </View>
          </View>
        </TutorialWrapper>

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <View style={styles.activitiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              <TouchableOpacity onPress={() => router.push('/(main)/workout/history')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {recentActivities.slice(0, 3).map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityItem}
                onPress={() => router.push(`/(main)/workout/history-session/${activity.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.activityIconContainer}>
                  <Icon name="dumbbell" size={18} color={colors.primary} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {activity.session_name || 'Workout Session'}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {activity.duration_minutes ? `${activity.duration_minutes} min` : ''} 
                    {activity.duration_minutes && activity.total_sets ? ' • ' : ''}
                    {activity.total_sets ? `${activity.total_sets} sets` : ''}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* AI Insight */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIconContainer}>
              <Icon name="lightbulb-on" size={18} color={colors.primary} />
            </View>
            <Text style={styles.insightTitle}>AI Tip</Text>
          </View>
          <Text style={styles.insightText}>
            {!todoList.workout && !todoList.meals 
              ? "Start your day strong! Log a meal and complete a workout to build momentum."
              : todoList.workout && !todoList.meals
                ? "Great workout! Don't forget to fuel your body with proper nutrition."
                : todoList.meals && !todoList.workout
                  ? "You're eating well! A workout today will maximize your progress."
                  : "You're crushing it! Consistency is the key to transformation."
            }
          </Text>
        </View>
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

  // Checklist Card
  checklistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  checklistCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checklistCheckboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  checklistTextDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },

  // Reminder Card
  reminderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 10,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 12,
    padding: 12,
  },
  reminderIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  reminderDays: {
    color: colors.textSecondary,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  reminderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
    borderStyle: 'dashed',
    gap: 8,
  },
  addReminderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Nutrition Card
  nutritionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutritionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 10,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  calorieValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  calorieTarget: {
    fontSize: 15,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  macroDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Stats Card
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  statItemContent: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
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
  statChevron: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },

  // Activities Section
  activitiesSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Insight Card
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
});