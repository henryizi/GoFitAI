import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/styles/colors';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

type PrimaryGoal = 'general_fitness' | 'muscle_gain' | 'fat_loss' | 'athletic_performance';

const PrimaryGoalScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);

  const handleNext = async () => {
    if (!user || !primaryGoal) return;
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({ id: user.id, primary_goal: primaryGoal, onboarding_completed: false }).select(),
      `Saving primary goal: ${primaryGoal}`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, { primary_goal: primaryGoal }); } catch {}
    try { analyticsTrack('onboarding_step_next', { step: 'primary-goal' }); } catch {}
    
    console.log('🚀 Navigating to fitness-strategy screen...');
    router.replace('/(onboarding)/fitness-strategy');
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
      title: 'General Fitness',
      subtitle: 'Improve overall health and physical conditioning',
      description: 'Perfect for beginners and those looking to maintain a healthy lifestyle',
      icon: 'dumbbell' as keyof typeof MaterialCommunityIcons.glyphMap,
      color: colors.primary,
      benefits: ['Better energy', 'Improved mood', 'Stronger foundation'],
    },
    {
      value: 'muscle_gain' as PrimaryGoal,
      title: 'Muscle Gain',
      subtitle: 'Build muscle mass and strength',
      description: 'Advanced routines designed to maximize muscle growth and power',
      icon: 'arm-flex' as keyof typeof MaterialCommunityIcons.glyphMap,
      color: '#007AFF',
      benefits: ['Increased strength', 'Muscle definition', 'Better physique'],
    },
    {
      value: 'fat_loss' as PrimaryGoal,
      title: 'Fat Loss',
      subtitle: 'Lose body fat while preserving muscle',
      description: 'Scientifically proven methods to burn fat while maintaining muscle',
      icon: 'fire' as keyof typeof MaterialCommunityIcons.glyphMap,
      color: colors.accent,
      benefits: ['Lean physique', 'Better definition', 'Improved confidence'],
    },
    {
      value: 'athletic_performance' as PrimaryGoal,
      title: 'Athletic Performance',
      subtitle: 'Enhance speed, power, and sports performance',
      description: 'Elite training methods used by professional athletes',
      icon: 'lightning-bolt' as keyof typeof MaterialCommunityIcons.glyphMap,
      color: '#32D74B',
      benefits: ['Explosive power', 'Enhanced speed', 'Peak performance'],
    },
  ];

  return (
    <OnboardingLayout
      title="What's your primary fitness goal?"
      subtitle="This helps us personalize your workout and nutrition plans"
      progress={0.916}
      currentStep={11}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/body-fat"
      onClose={handleClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.questionLabel}>
          <Text style={styles.questionLabelText}>Question 11</Text>
        </View>
        <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  primaryGoal === option.value && { 
                    borderColor: option.color,
                    backgroundColor: `${option.color}10`
                  }
                ]}
                onPress={() => setPrimaryGoal(option.value)}
              >
                <View style={styles.optionHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={24} 
                      color="white" 
                    />
                  </View>
                  <View style={styles.optionTitleContainer}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  {primaryGoal === option.value && (
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={24} 
                      color={option.color} 
                    />
                  )}
                </View>
                
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
                
                <View style={styles.optionBenefits}>
                  {option.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitRow}>
                      <MaterialCommunityIcons name="check" size={16} color={colors.textSecondary} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(34, insets.bottom + 16) }]}>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  questionLabel: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  questionLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  optionBenefits: {
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});

export default PrimaryGoalScreen;