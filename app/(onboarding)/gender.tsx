import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify, track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { LinearGradient } from 'expo-linear-gradient';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

type Gender = 'male' | 'female' | 'other';

const GenderScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [gender, setGender] = useState<Gender | null>(null);

  const handleNext = async () => {
    if (!gender) {
      console.warn('⚠️ Gender not selected, button should be disabled');
      return;
    }
    
    // Save data in background (non-blocking)
    if (user) {
      saveOnboardingData(
        supabase.from('profiles').upsert({ id: user.id, gender, onboarding_completed: false }).select(),
        `Saving gender: ${gender}`,
        undefined,
        user.id
      );
    }
    
    // Analytics in background
    try { analyticsTrack('onboarding_step_next', { step: 'gender' }); } catch {}
    
    console.log('🚀 Navigating to birthday screen...');
    router.replace('/(onboarding)/birthday');
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'gender' }); } catch {}
    router.replace('/(onboarding)/name');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'gender' }); } catch {}
  };

  const options = [
    {
      value: 'male' as Gender,
      title: 'Male',
      icon: 'gender-male' as const,
    },
    {
      value: 'female' as Gender,
      title: 'Female',
      icon: 'gender-female' as const,
    },
    {
      value: 'other' as Gender,
      title: 'Other',
      icon: 'account' as const,
    },
  ];

  return (
    <OnboardingLayout
      title="Select Your Gender"
      subtitle="This will be used to configure your individual plan"
      progress={0.166}
      currentStep={2}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/name"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.questionLabel}>
          <Text style={styles.questionLabelText}>Question 2</Text>
        </View>
        
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, gender === option.value && styles.selectedCard]}
              onPress={() => setGender(option.value)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={gender === option.value 
                  ? ['rgba(255, 107, 53, 0.3)', 'rgba(255, 142, 83, 0.2)']
                  : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.05)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons 
                    name={option.icon} 
                    size={24} 
                    color={gender === option.value ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'} 
                  />
                </View>
                <Text style={[styles.cardTitle, gender === option.value && styles.selectedText]}>
                  {option.title}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(40, insets.bottom + 16) }]}>
        <OnboardingButton
          title="Continue"
          onPress={handleNext}
          disabled={!gender}
        />
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
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
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    minHeight: 64,
  },
  selectedCard: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    elevation: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 64,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.2,
    flex: 1,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(255, 107, 53, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});

export default GenderScreen; 