import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import { TutorialWrapper } from '../../tutorial/TutorialWrapper';

const { width: screenWidth } = Dimensions.get('window');

export const MockWorkout = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
                </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>Good morning</Text>
            <Text style={styles.coachMessage}>Ready to crush your workout today? Let's get started!</Text>
            </View>
        </View>

        {/* Weekly Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>180</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
                        </View>
                    </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TutorialWrapper tutorialId="workout-history-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Icon name="history" size={22} color="#22C55E" />
              </View>
              <Text style={styles.quickActionLabel}>History</Text>
            </View>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="workout-overview-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                <Icon name="chart-line" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Progress</Text>
            </View>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="create-workout-plan-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Icon name="plus-circle-outline" size={22} color="#6366F1" />
              </View>
              <Text style={styles.quickActionLabel}>New Plan</Text>
                    </View>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="quick-workout-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(175, 82, 222, 0.12)' }]}>
                <Icon name="lightning-bolt" size={22} color={colors.purple} />
              </View>
              <Text style={styles.quickActionLabel}>Quick Start</Text>
            </View>
            </TutorialWrapper>
        </View>

        {/* AI Insight Card */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIconContainer}>
              <Icon name="lightbulb-on" size={18} color={colors.primary} />
                    </View>
            <Text style={styles.insightTitle}>AI Coach Tip</Text>
                    </View>
          <Text style={styles.insightText}>
            Consistency is key! Aim for at least 3 workouts this week to see results.
          </Text>
        </View>

        {/* Active Plan Section */}
        <View style={styles.activePlanSection}>
          <Text style={styles.sectionTitle}>Active Plan</Text>
          <View style={styles.activePlanCard}>
            <View style={styles.activePlanHeader}>
              <View style={styles.activePlanIconContainer}>
                <Icon name="star" size={20} color={colors.primary} />
                </View>
              <View style={styles.activePlanInfo}>
                <Text style={styles.activePlanName}>Full Body Strength</Text>
                <Text style={styles.activePlanMeta}>Intermediate • 12 weeks</Text>
                        </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
                        </View>
                    </View>
                </View>

        {/* Your Plans Section */}
        <View style={styles.plansSection}>
          <View style={styles.plansSectionHeader}>
            <Text style={styles.sectionTitle}>Your Plans</Text>
            <View style={styles.addPlanButton}>
              <Icon name="plus" size={16} color={colors.primary} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
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
    color: 'rgba(235, 235, 245, 0.6)',
    lineHeight: 20,
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
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(235, 235, 245, 0.6)',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
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
    color: 'rgba(235, 235, 245, 0.6)',
    letterSpacing: 0.3,
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
    color: 'rgba(235, 235, 245, 0.6)',
    lineHeight: 20,
  },

  // Active Plan Section
  activePlanSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },
  activePlanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  activePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activePlanIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activePlanInfo: {
    flex: 1,
  },
  activePlanName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  activePlanMeta: {
    fontSize: 13,
    color: 'rgba(235, 235, 245, 0.6)',
  },

  // Plans Section
  plansSection: {
    marginBottom: 16,
  },
  plansSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPlanButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
