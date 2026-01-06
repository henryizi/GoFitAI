import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/styles/colors';
import { supabase } from '../../src/services/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MealStats {
  totalMeals: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  firstMealDate: string | null;
  lastMealDate: string | null;
  averageCaloriesPerMeal: number;
}

export default function MealsCelebrationScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MealStats>({
    totalMeals: 0,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    firstMealDate: null,
    lastMealDate: null,
    averageCaloriesPerMeal: 0,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const mascotRotate = useRef(new Animated.Value(0)).current;
  const statAnim1 = useRef(new Animated.Value(0)).current;
  const statAnim2 = useRef(new Animated.Value(0)).current;
  const statAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) {
      fetchMealStats();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(mascotRotate, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(mascotRotate, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      Animated.stagger(150, [
        Animated.spring(statAnim1, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(statAnim2, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(statAnim3, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const mascotRotation = mascotRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  const fetchMealStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      let totalMeals = 0;
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      const mealDates: string[] = [];

      // Fetch from AsyncStorage
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const nutritionLogKeys = allKeys.filter(key => 
          key.startsWith(`nutrition_log_${user.id}_`)
        );
        
        for (const key of nutritionLogKeys) {
          const logData = await AsyncStorage.getItem(key);
          if (logData) {
            try {
              const meals = JSON.parse(logData);
              if (Array.isArray(meals)) {
                totalMeals += meals.length;
                meals.forEach((meal: any) => {
                  totalCalories += meal.calories || 0;
                  totalProtein += meal.protein || 0;
                  totalCarbs += meal.carbs || 0;
                  totalFat += meal.fat || 0;
                });
                
                // Extract date from key
                const dateMatch = key.match(/_(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                  mealDates.push(dateMatch[1]);
                }
              }
            } catch (parseError) {
              console.error('Error parsing meal log:', parseError);
            }
          }
        }
      } catch (error) {
        console.error('Error counting meals from AsyncStorage:', error);
      }

      // Also fetch from database
      try {
        const { data: mealLogs, error } = await supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: true });

        if (!error && mealLogs) {
          totalMeals += mealLogs.length;
          mealLogs.forEach((meal: any) => {
            totalCalories += meal.total_calories || 0;
            totalProtein += meal.total_protein || 0;
            totalCarbs += meal.total_carbs || 0;
            totalFat += meal.total_fat || 0;
            if (meal.date) {
              mealDates.push(meal.date);
            }
          });
        }
      } catch (dbError) {
        console.error('Error fetching meals from database:', dbError);
      }

      mealDates.sort();
      const averageCalories = totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0;

      setStats({
        totalMeals,
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein),
        totalCarbs: Math.round(totalCarbs),
        totalFat: Math.round(totalFat),
        firstMealDate: mealDates.length > 0 ? mealDates[0] : null,
        lastMealDate: mealDates.length > 0 ? mealDates[mealDates.length - 1] : null,
        averageCaloriesPerMeal: averageCalories,
      });
    } catch (error) {
      console.error('Error calculating meal stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your achievements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.replace('/(main)/dashboard' as any);
            }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* AI Coach Header */}
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
              Amazing work, {profile?.full_name?.split(' ')[0] || 'Champion'}! 🍎
            </Text>
            <Text style={styles.coachMessage}>
              You've logged {stats.totalMeals} {stats.totalMeals === 1 ? 'meal' : 'meals'}! Your nutrition tracking is on point!
            </Text>
          </View>
        </View>

        {/* Achievement Card */}
        <Animated.View
          style={[
            styles.achievementCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.achievementCardContent}>
            {/* Mascot Icon */}
            <Animated.View
              style={[
                styles.mascotContainer,
                { transform: [{ rotate: mascotRotation }] },
              ]}
            >
              <View style={styles.mascotCircle}>
                <Image
                  source={require('../../assets/mascot.png')}
                  style={styles.mascotImage}
                />
              </View>
            </Animated.View>

            {/* Achievement Text */}
            <View style={styles.achievementTextContainer}>
              <Text style={styles.achievementTitle}>Meals Logged</Text>
              <Text style={styles.achievementNumber}>{stats.totalMeals}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Animated.View
            style={[
              styles.statItem,
              {
                opacity: statAnim1,
                transform: [
                  {
                    scale: statAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.statValue}>{Math.round(stats.totalCalories / 1000)}k</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </Animated.View>
          <View style={styles.statDivider} />
          <Animated.View
            style={[
              styles.statItem,
              {
                opacity: statAnim2,
                transform: [
                  {
                    scale: statAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.statValue}>{stats.averageCaloriesPerMeal}</Text>
            <Text style={styles.statLabel}>Avg/Meal</Text>
          </Animated.View>
          <View style={styles.statDivider} />
          <Animated.View
            style={[
              styles.statItem,
              {
                opacity: statAnim3,
                transform: [
                  {
                    scale: statAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.statValue}>{stats.totalProtein}g</Text>
            <Text style={styles.statLabel}>Protein</Text>
          </Animated.View>
        </View>

        {/* Journey Card */}
        <Animated.View
          style={[
            styles.journeyCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.journeyHeader}>
            <Icon name="food-apple" size={20} color={colors.primary} />
            <Text style={styles.journeyTitle}>Your Nutrition Journey</Text>
          </View>
          
          <View style={styles.journeyItem}>
            <View style={styles.journeyIconContainer}>
              <Icon name="calendar-start" size={18} color={colors.primary} />
            </View>
            <View style={styles.journeyContent}>
              <Text style={styles.journeyLabel}>First Meal Logged</Text>
              <Text style={styles.journeyValue}>
                {formatDate(stats.firstMealDate)}
              </Text>
            </View>
          </View>

          <View style={styles.journeyDivider} />

          <View style={styles.journeyItem}>
            <View style={styles.journeyIconContainer}>
              <Icon name="food-variant" size={18} color={colors.primary} />
            </View>
            <View style={styles.journeyContent}>
              <Text style={styles.journeyLabel}>Latest Meal</Text>
              <Text style={styles.journeyValue}>
                {formatDate(stats.lastMealDate)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  backButtonContainer: {
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
  // Achievement Card
  achievementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  achievementCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mascotContainer: {
    zIndex: 1,
  },
  mascotCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  mascotImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: 'cover',
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementNumber: {
    fontSize: 36,
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Stats Card
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
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 10,
  },
  statValue: {
    fontSize: 24,
    color: colors.white,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Journey Card
  journeyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  journeyTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '700',
  },
  journeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  journeyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyContent: {
    flex: 1,
  },
  journeyDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
    marginLeft: 48,
  },
  journeyLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  journeyValue: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '700',
  },
});




