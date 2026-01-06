import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import { TutorialWrapper } from '../../tutorial/TutorialWrapper';

const { width: screenWidth } = Dimensions.get('window');

export const MockNutrition = () => {
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
            <Text style={styles.coachMessage}>Ready to fuel your day? Log your first meal to begin tracking.</Text>
          </View>
        </View>

        {/* Main Progress Card */}
        <View style={styles.mainProgressCard}>
          {/* Calorie Circle */}
          <View style={styles.calorieCircleContainer}>
            <View style={styles.calorieCircle}>
              <View style={styles.calorieCircleInner}>
                <Text style={styles.calorieMainValue}>1450</Text>
                <Text style={styles.calorieMainLabel}>of 2200</Text>
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>
              <View style={[styles.progressRing, { borderColor: colors.primary }]} />
            </View>
            <Text style={styles.remainingText}>750 kcal remaining</Text>
          </View>

          {/* Macro Pills */}
          <View style={styles.macroPillsContainer}>
            <View style={[styles.macroPill, { borderLeftColor: colors.primary }]}>
              <Text style={styles.macroPillValue}>110g</Text>
              <Text style={styles.macroPillLabel}>Protein</Text>
              <View style={styles.macroPillProgress}>
                <View style={[styles.macroPillBar, { width: '70%', backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.macroPillTarget}>/ 160g</Text>
            </View>

            <View style={[styles.macroPill, { borderLeftColor: colors.accent }]}>
              <Text style={styles.macroPillValue}>180g</Text>
              <Text style={styles.macroPillLabel}>Carbs</Text>
              <View style={styles.macroPillProgress}>
                <View style={[styles.macroPillBar, { width: '72%', backgroundColor: colors.accent }]} />
              </View>
              <Text style={styles.macroPillTarget}>/ 250g</Text>
            </View>

            <View style={[styles.macroPill, { borderLeftColor: colors.secondary }]}>
              <Text style={styles.macroPillValue}>45g</Text>
              <Text style={styles.macroPillLabel}>Fat</Text>
              <View style={styles.macroPillProgress}>
                <View style={[styles.macroPillBar, { width: '64%', backgroundColor: colors.secondary }]} />
              </View>
              <Text style={styles.macroPillTarget}>/ 70g</Text>
            </View>
          </View>

          {/* Log Food Button - TARGET */}
          <TutorialWrapper tutorialId="log-food-button">
            <View style={styles.primaryActionButton}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.primaryActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="plus-circle" size={20} color={colors.white} />
                <Text style={styles.primaryActionText}>Log Food</Text>
              </LinearGradient>
            </View>
          </TutorialWrapper>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TutorialWrapper tutorialId="food-history-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Icon name="history" size={22} color="#22C55E" />
              </View>
              <Text style={styles.quickActionLabel}>History</Text>
            </View>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="food-suggestion-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                <Icon name="lightbulb-on-outline" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Suggestions</Text>
            </View>
          </TutorialWrapper>

          <TutorialWrapper tutorialId="create-plan-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Icon name="clipboard-edit-outline" size={22} color="#6366F1" />
              </View>
              <Text style={styles.quickActionLabel}>New Plan</Text>
            </View>
          </TutorialWrapper>

          <View style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="refresh" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>Reset Day</Text>
          </View>
        </View>

        {/* Your Plans Section */}
        <View style={styles.plansSection}>
          <View style={styles.plansSectionHeader}>
            <Text style={styles.plansSectionTitle}>Your Plans</Text>
            <View style={styles.addPlanButton}>
              <Icon name="plus" size={16} color={colors.primary} />
            </View>
          </View>
          
          <View style={styles.emptyPlansContainer}>
            <Icon name="clipboard-text-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyPlansText}>No nutrition plans yet</Text>
            <Text style={styles.emptyPlansSubtext}>Create your first plan to get started</Text>
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

  // Main Progress Card
  mainProgressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  calorieCircleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calorieCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  calorieCircleInner: {
    alignItems: 'center',
  },
  calorieMainValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 40,
  },
  calorieMainLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  calorieUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
  progressRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 83,
    borderWidth: 3,
  },
  remainingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },
  macroPillsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  macroPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
  },
  macroPillValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  macroPillLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  macroPillProgress: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  macroPillBar: {
    height: '100%',
    borderRadius: 2,
  },
  macroPillTarget: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  primaryActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    color: colors.textSecondary,
    letterSpacing: 0.3,
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
  plansSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  addPlanButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPlansContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyPlansText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPlansSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
