import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HabitScoreService, HabitScoreComponents } from '../../services/HabitScoreService';
import { useAuth } from '../../hooks/useAuth';

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  glass: 'rgba(255, 255, 255, 0.1)',
  glassStrong: 'rgba(255, 255, 255, 0.15)',
};

interface HabitScoreBreakdownProps {
  habitScore: number | null;
  onRefresh?: () => void;
}

export default function HabitScoreBreakdown({ habitScore, onRefresh }: HabitScoreBreakdownProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [breakdown, setBreakdown] = useState<HabitScoreComponents | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(habitScore);
  const [loading, setLoading] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  // Update total score when habitScore prop changes
  useEffect(() => {
    setTotalScore(habitScore);
  }, [habitScore]);

  const toggleExpanded = async () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    // Animate arrow rotation
    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Load breakdown data if expanding
    if (newExpanded && !breakdown && user) {
      setLoading(true);
      try {
        const today = HabitScoreService.getTodayDateKey();
        const scoreBreakdown = await HabitScoreService.calculateHabitScore(user.id, today);
        console.log('[HabitScoreBreakdown] Loaded breakdown:', scoreBreakdown);
        setBreakdown(scoreBreakdown);
      } catch (error) {
        console.error('[HabitScoreBreakdown] Error loading breakdown:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const arrowRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return colors.success;
    if (percentage >= 60) return colors.warning;
    return colors.error;
  };

  const ScoreItem = ({ icon, title, score, maxScore, details }: {
    icon: string;
    title: string;
    score: number;
    maxScore: number;
    details: any;
  }) => (
    <View style={styles.scoreItem}>
      <View style={styles.scoreHeader}>
        <View style={styles.scoreIcon}>
          <Icon name={icon} size={20} color={getScoreColor(score, maxScore)} />
        </View>
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreTitle}>{title}</Text>
          <Text style={styles.scoreSubtitle}>
            {Object.values(details).filter(Boolean).length} of {Object.keys(details).length} completed
          </Text>
        </View>
        <View style={styles.scoreValue}>
          <Text style={[styles.scoreText, { color: getScoreColor(score, maxScore) }]}>
            {score}
          </Text>
          <Text style={styles.scoreMax}>/{maxScore}</Text>
        </View>
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { 
          width: `${(score / maxScore) * 100}%`,
          backgroundColor: getScoreColor(score, maxScore)
        }]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleExpanded} style={styles.header}>
        <LinearGradient colors={[colors.glassStrong, colors.glass]} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Icon name="star-circle" size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Habit Score Breakdown</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.habitScoreText}>
                {totalScore !== null ? totalScore : '--'}/100
              </Text>
              <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </Animated.View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.breakdown}>
          <LinearGradient colors={[colors.glass, colors.surface]} style={styles.breakdownGradient}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Calculating breakdown...</Text>
              </View>
            ) : breakdown ? (
              <>
                <ScoreItem
                  icon="food-apple"
                  title="Nutrition"
                  score={breakdown.nutrition.score}
                  maxScore={40}
                  details={breakdown.nutrition.details}
                />
                
                <ScoreItem
                  icon="scale-bathroom"
                  title="Weight Tracking"
                  score={breakdown.weight.score}
                  maxScore={20}
                  details={breakdown.weight.details}
                />
                
                <ScoreItem
                  icon="dumbbell"
                  title="Workouts"
                  score={breakdown.workout.score}
                  maxScore={30}
                  details={breakdown.workout.details}
                />
                
                <ScoreItem
                  icon="heart-pulse"
                  title="Wellness"
                  score={breakdown.wellness.score}
                  maxScore={10}
                  details={breakdown.wellness.details}
                />

                <View style={styles.tips}>
                  <Text style={styles.tipsTitle}>💡 Tips to improve:</Text>
                  {breakdown.nutrition.score < 30 && (
                    <Text style={styles.tipText}>• Log your meals and aim for balanced macros</Text>
                  )}
                  {breakdown.weight.score < 15 && (
                    <Text style={styles.tipText}>• Weigh yourself daily for consistency</Text>
                  )}
                  {breakdown.workout.score < 20 && (
                    <Text style={styles.tipText}>• Complete your scheduled workouts</Text>
                  )}
                  {breakdown.wellness.score < 8 && (
                    <Text style={styles.tipText}>• Track sleep and stress levels</Text>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Unable to load breakdown</Text>
                <TouchableOpacity onPress={() => setBreakdown(null)}>
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },
  breakdown: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  breakdownGradient: {
    padding: 16,
  },
  scoreItem: {
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scoreSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tips: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 8,
  },
  retryText: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});



