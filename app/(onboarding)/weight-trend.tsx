import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';
import { LinearGradient } from 'expo-linear-gradient';

type WeightTrend = 'losing' | 'gaining' | 'stable' | 'unsure';

const WeightTrendScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [weightTrend, setWeightTrend] = useState<WeightTrend | null>(null);

  const handleNext = async () => {
    if (!user || !weightTrend) return;
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({ id: user.id, weight_trend: weightTrend, onboarding_completed: false }).select(),
      `Saving weight trend: ${weightTrend}`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, { weight_trend: weightTrend }); } catch {}
    
    console.log('🚀 Navigating to level screen...');
    router.replace('/(onboarding)/level');
  };

  const handleBack = () => {
    router.replace('/(onboarding)/weight');
  };

  const handleClose = () => {
    router.replace('/(main)/dashboard');
  };

  const options = [
    {
      value: 'losing' as WeightTrend,
      title: 'I have been losing weight',
      icon: 'trending-down',
    },
    {
      value: 'gaining' as WeightTrend,
      title: 'I have been gaining weight',
      icon: 'trending-up',
    },
    {
      value: 'stable' as WeightTrend,
      title: 'I have been weight stable',
      icon: 'remove',
    },
    {
      value: 'unsure' as WeightTrend,
      title: 'Not sure',
      icon: 'help-circle-outline',
    },
  ];

  return (
    <OnboardingLayout
      title="How has your weight trended for the past few weeks?"
      subtitle="This helps us understand your current progress"
      progress={0.5}
      currentStep={6}
      totalSteps={11}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/weight"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.questionLabel}>
          <Text style={styles.questionLabelText}>Question 6</Text>
        </View>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, weightTrend === option.value && styles.selectedCard]}
              onPress={() => setWeightTrend(option.value)}
            >
              <LinearGradient
                colors={weightTrend === option.value 
                  ? ['rgba(255, 107, 53, 0.3)', 'rgba(255, 142, 83, 0.2)']
                  : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={weightTrend === option.value ? '#FFFFFF' : colors.textSecondary} 
                  style={styles.optionIcon}
                />
                <View style={styles.optionContent}>
                  <Text style={[styles.cardTitle, weightTrend === option.value && styles.selectedText]}>
                    {option.title}
                  </Text>
                </View>
                <View style={[styles.radioButton, weightTrend === option.value && styles.radioButtonSelected]}>
                  {weightTrend === option.value && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={[styles.footer, { paddingBottom: Math.max(40, insets.bottom + 16) }]}>
        <OnboardingButton
          title="Continue"
          onPress={handleNext}
          disabled={!weightTrend}
        />
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: 'flex-start',
  },
  questionLabel: {
    marginBottom: 8,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
    width: '100%',
  },
  questionLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
  },
  selectedCard: {
    borderColor: '#FF6B35',
    elevation: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 18,
    minHeight: 80,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(255, 107, 53, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FFFFFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});

export default WeightTrendScreen;
