import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/styles/colors';
import { WorkoutHistoryService } from '../../src/services/workout/WorkoutHistoryService';
import { supabase } from '../../src/services/supabase/client';

const { width: screenWidth } = Dimensions.get('window');

interface WorkoutStats {
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  totalDuration: number;
  firstWorkoutDate: string | null;
  lastWorkoutDate: string | null;
  favoritePlan: string | null;
}

export default function WorkoutCelebrationScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WorkoutStats>({
    totalWorkouts: 0,
    totalExercises: 0,
    totalSets: 0,
    totalDuration: 0,
    firstWorkoutDate: null,
    lastWorkoutDate: null,
    favoritePlan: null,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const trophyRotate = useRef(new Animated.Value(0)).current;
  const statAnim1 = useRef(new Animated.Value(0)).current;
  const statAnim2 = useRef(new Animated.Value(0)).current;
  const statAnim3 = useRef(new Animated.Value(0)).current;

  // Fetch stats on mount
  useEffect(() => {
    if (user?.id) {
      fetchWorkoutStats();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!loading) {
      // Start animations
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
            Animated.timing(trophyRotate, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(trophyRotate, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      // Stagger stat animations
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

  const trophyRotation = trophyRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  const fetchWorkoutStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch all workout history
      const { data: workoutHistory, error } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true });

      if (error) {
        console.error('Error fetching workout history:', error);
        setLoading(false);
        return;
      }

      if (!workoutHistory || workoutHistory.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate statistics
      const totalWorkouts = workoutHistory.length;
      let totalExercises = 0;
      let totalSets = 0;
      let totalDuration = 0;
      const planCounts: { [key: string]: number } = {};

      workoutHistory.forEach((workout) => {
        // Count exercises from exercises_data
        if (workout.exercises_data && Array.isArray(workout.exercises_data)) {
          workout.exercises_data.forEach((exercise: any) => {
            totalExercises++;
            // Count sets
            if (exercise.sets && Array.isArray(exercise.sets)) {
              totalSets += exercise.sets.length;
            } else if (exercise.logs && Array.isArray(exercise.logs)) {
              totalSets += exercise.logs.length;
            }
          });
        }

        // Sum duration
        if (workout.duration_minutes) {
          totalDuration += workout.duration_minutes;
        }

        // Count plan usage
        if (workout.plan_name) {
          planCounts[workout.plan_name] = (planCounts[workout.plan_name] || 0) + 1;
        }
      });

      // Find favorite plan
      let favoritePlan: string | null = null;
      let maxCount = 0;
      Object.entries(planCounts).forEach(([planName, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoritePlan = planName;
        }
      });

      const firstWorkout = workoutHistory[0];
      const lastWorkout = workoutHistory[workoutHistory.length - 1];

      setStats({
        totalWorkouts,
        totalExercises,
        totalSets,
        totalDuration,
        firstWorkoutDate: firstWorkout?.completed_at || null,
        lastWorkoutDate: lastWorkout?.completed_at || null,
        favoritePlan,
      });
    } catch (error) {
      console.error('Error calculating workout stats:', error);
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
              Congratulations, {profile?.full_name?.split(' ')[0] || 'Champion'}! 🎉
            </Text>
            <Text style={styles.coachMessage}>
              You've completed {stats.totalWorkouts} {stats.totalWorkouts === 1 ? 'workout' : 'workouts'}! Keep up the amazing work!
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
                { transform: [{ rotate: trophyRotation }] },
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
              <Text style={styles.achievementTitle}>Workouts Completed</Text>
              <Text style={styles.achievementNumber}>{stats.totalWorkouts}</Text>
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
            <Text style={styles.statValue}>{stats.totalExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
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
            <Text style={styles.statValue}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
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
            <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
            <Text style={styles.statLabel}>Hours</Text>
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
            <Icon name="map-marker-path" size={20} color={colors.primary} />
            <Text style={styles.journeyTitle}>Your Fitness Journey</Text>
          </View>
          
          <View style={styles.journeyItem}>
            <View style={styles.journeyIconContainer}>
              <Icon name="calendar-start" size={18} color={colors.primary} />
            </View>
            <View style={styles.journeyContent}>
              <Text style={styles.journeyLabel}>Journey Started</Text>
              <Text style={styles.journeyValue}>
                {formatDate(stats.firstWorkoutDate)}
              </Text>
            </View>
          </View>

          <View style={styles.journeyDivider} />

          <View style={styles.journeyItem}>
            <View style={styles.journeyIconContainer}>
              <Icon name="flag-checkered" size={18} color={colors.primary} />
            </View>
            <View style={styles.journeyContent}>
              <Text style={styles.journeyLabel}>Latest Session</Text>
              <Text style={styles.journeyValue}>
                {formatDate(stats.lastWorkoutDate)}
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
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
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
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
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
  actionsSection: {
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,53,0.4)',
    backgroundColor: 'rgba(255,107,53,0.1)',
    overflow: 'hidden',
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

