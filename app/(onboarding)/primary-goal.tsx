import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';

type PrimaryGoal = 'general_fitness' | 'muscle_gain' | 'fat_loss' | 'athletic_performance';

const PrimaryGoalScreen = () => {
  const { user } = useAuth();
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);

  const handleNext = async () => {
    if (user && primaryGoal) {
      await supabase.from('profiles').update({ primary_goal: primaryGoal }).eq('id', user.id);
      try { identify(user.id, { primary_goal: primaryGoal }); } catch {}
      try { analyticsTrack('onboarding_step_next', { step: 'primary-goal' }); } catch {}
      router.push('/(onboarding)/fitness-strategy');
    }
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'primary-goal' }); } catch {}
    router.replace('/(onboarding)/body-fat');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'primary-goal' }); } catch {}
    router.replace('/(main)/dashboard');
  };

  const options = [
    {
      value: 'general_fitness' as PrimaryGoal,
      title: '💪 General Fitness',
      subtitle: 'Improve overall health and physical conditioning',
      description: 'Perfect for beginners and those looking to maintain a healthy lifestyle',
      icon: 'fitness-outline' as const,
      gradient: ['#FF6B35', '#FF8F65'],
      stats: ['Better energy', 'Improved mood', 'Stronger foundation'],
      popularity: 'Most Popular',
    },
    {
      value: 'muscle_gain' as PrimaryGoal,
      title: '🏋️ Muscle Gain',
      subtitle: 'Build muscle mass and strength',
      description: 'Advanced routines designed to maximize muscle growth and power',
      icon: 'barbell-outline' as const,
      gradient: ['#007AFF', '#40A9FF'],
      stats: ['Increased strength', 'Muscle definition', 'Better physique'],
      popularity: 'Trending',
    },
    {
      value: 'fat_loss' as PrimaryGoal,
      title: '🔥 Fat Loss',
      subtitle: 'Lose body fat while preserving muscle',
      description: 'Scientifically proven methods to burn fat while maintaining muscle',
      icon: 'scale-outline' as const,
      gradient: ['#FF3B30', '#FF6347'],
      stats: ['Lean physique', 'Better definition', 'Improved confidence'],
      popularity: 'Editor\'s Choice',
    },
    {
      value: 'athletic_performance' as PrimaryGoal,
      title: '⚡ Athletic Performance',
      subtitle: 'Enhance speed, power, and sports performance',
      description: 'Elite training methods used by professional athletes',
      icon: 'flash-outline' as const,
      gradient: ['#32D74B', '#30D158'],
      stats: ['Explosive power', 'Enhanced speed', 'Peak performance'],
      popularity: 'Pro Level',
    },
  ];

  return (
    <OnboardingLayout
      title="What's your primary fitness goal?"
      subtitle="This helps us personalize your workout and nutrition plans"
      progress={0.83}
      currentStep={10}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/body-fat"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Choose Your Transformation</Text>
          <Text style={styles.introSubtitle}>
            Our AI will create a personalized plan based on your goal
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard, 
                primaryGoal === option.value && styles.selectedCard,
                { marginTop: index * 5 } // Slight stagger effect
              ]}
              onPress={() => setPrimaryGoal(option.value)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={primaryGoal === option.value
                  ? option.gradient
                  : ['rgba(28, 28, 30, 0.95)', 'rgba(44, 44, 46, 0.9)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                {/* Popularity Badge */}
                <View style={styles.popularityBadge}>
                  <Text style={styles.popularityText}>{option.popularity}</Text>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[
                      styles.cardTitle, 
                      primaryGoal === option.value && styles.selectedText
                    ]}>
                      {option.title}
                    </Text>
                    <View style={[
                      styles.checkmark, 
                      primaryGoal === option.value && styles.checkmarkSelected
                    ]}>
                      {primaryGoal === option.value && (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                  
                  <Text style={[
                    styles.cardSubtitle, 
                    primaryGoal === option.value && styles.selectedSubText
                  ]}>
                    {option.subtitle}
                  </Text>
                  
                  <Text style={[
                    styles.cardDescription,
                    primaryGoal === option.value && styles.selectedDescription
                  ]}>
                    {option.description}
                  </Text>

                  {/* Benefits List */}
                  <View style={styles.statsContainer}>
                    {option.stats.map((stat, statIndex) => (
                      <View key={statIndex} style={styles.statItem}>
                        <View style={[
                          styles.statBullet,
                          primaryGoal === option.value && styles.statBulletSelected
                        ]} />
                        <Text style={[
                          styles.statText,
                          primaryGoal === option.value && styles.statTextSelected
                        ]}>
                          {stat}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Hint */}
        <View style={styles.progressHint}>
          <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.progressHintText}>
            You can always change this later in settings
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <OnboardingButton
          title="Continue"
          onPress={handleNext}
          disabled={!primaryGoal}
        />
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  introSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: 18,
    marginBottom: 20,
  },
  optionCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    transform: [{ scale: 1 }],
  },
  selectedCard: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    transform: [{ scale: 1.02 }],
  },
  cardGradient: {
    borderRadius: 21,
    position: 'relative',
  },
  popularityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: 24,
    paddingTop: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
  },
  selectedText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkmarkSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  selectedSubText: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  selectedDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  statBulletSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  statText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  statTextSelected: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  progressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginTop: 10,
  },
  progressHintText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
});

export default PrimaryGoalScreen;