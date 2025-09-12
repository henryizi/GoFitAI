import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify, track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
// import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type Gender = 'male' | 'female';

const GenderScreen = () => {
  const { user } = useAuth();
  const [gender, setGender] = useState<Gender | null>(null);

  const handleNext = async () => {
    if (user && gender) {
      await supabase.from('profiles').update({ gender }).eq('id', user.id);
      // try { identify(user.id, { gender }); } catch {}
      try { analyticsTrack('onboarding_step_next', { step: 'gender' }); } catch {}
      router.push('/(onboarding)/birthday');
    }
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
      subtitle: 'I identify as male',
    },
    {
      value: 'female' as Gender,
      title: 'Female',
      subtitle: 'I identify as female',
    },
  ];

  return (
    <OnboardingLayout
      title="What's your gender?"
      subtitle="This helps us tailor your workout and nutrition plans"
      progress={0.18}
      currentStep={2}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/name"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, gender === option.value && styles.selectedCard]}
              onPress={() => setGender(option.value)}
            >
              <LinearGradient
                colors={gender === option.value 
                  ? ['rgba(255, 107, 53, 0.3)', 'rgba(255, 142, 83, 0.2)']
                  : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.textContainer}>
                  <Text style={[styles.cardTitle, gender === option.value && styles.selectedText]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.cardSubtitle, gender === option.value && styles.selectedText]}>
                    {option.subtitle}
                  </Text>
                </View>
                <View style={[styles.radioButton, gender === option.value && styles.radioButtonSelected]}>
                  {gender === option.value && <View style={styles.radioButtonInner} />}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: 'flex-start',
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
    minHeight: 100,
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
    padding: 24,
    borderRadius: 18,
    minHeight: 100,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  selectedText: {
    color: '#FFFFFF',
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
    padding: 24,
    paddingBottom: 40,
  },
});

export default GenderScreen; 