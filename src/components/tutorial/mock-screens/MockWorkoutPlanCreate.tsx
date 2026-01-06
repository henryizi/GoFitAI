import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import { TutorialWrapper } from '../../tutorial/TutorialWrapper';

const { width } = Dimensions.get('window');

export const MockWorkoutPlanCreate = () => {
  const insets = useSafeAreaInsets();

  const planTypes = [
    {
      id: 'ai-custom',
      name: 'AI Custom Plan',
      description: 'Generate a personalized workout plan powered by Gemini AI',
      icon: 'robot-outline',
      selected: true
    },
    {
      id: 'bodybuilder',
      name: 'Famous Bodybuilder',
      description: 'Follow a workout plan inspired by famous bodybuilders',
      icon: 'weight-lifter',
      selected: false
    },
    {
      id: 'build-your-own',
      name: 'Build Your Own',
      description: 'Create your own fully customized workout plan using our exercise library',
      icon: 'hammer-wrench',
      selected: false
    }
  ];

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
            <Text style={styles.coachMessage}>Let's create a personalized workout plan for you!</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 69, 58, 0.12)' }]}>
              <Icon name="arrow-left" size={22} color="#FF453A" />
            </View>
            <Text style={styles.quickActionLabel}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="dumbbell" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>Plans</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="history" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
              <Icon name="chart-line" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Progress</Text>
          </TouchableOpacity>
        </View>

        {/* Plan Type Selection - TARGET */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Plan Type</Text>
          
          <TutorialWrapper tutorialId="workout-plan-types-list">
            <View style={styles.optionsContainer}>
              {planTypes.map((planType) => (
                <View
                  key={planType.id}
                  style={[
                    styles.optionCard,
                    planType.selected && styles.optionCardSelected
                  ]}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.optionIconContainer,
                      planType.selected && styles.optionIconContainerSelected
                    ]}>
                      <Icon 
                        name={planType.icon} 
                        size={24} 
                        color={planType.selected ? colors.primary : colors.white} 
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.optionTitle,
                        planType.selected && styles.optionTitleSelected
                      ]}>
                        {planType.name}
                      </Text>
                      <Text style={styles.optionDescription}>{planType.description}</Text>
                    </View>
                    {planType.selected && (
                      <View style={styles.checkmarkSelected}>
                        <Icon name="check" size={16} color={colors.white} />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </TutorialWrapper>
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
    color: 'rgba(235, 235, 245, 0.6)',
    letterSpacing: 0.3,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionIconContainerSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.6)',
    lineHeight: 20,
  },
  checkmarkSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
