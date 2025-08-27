import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';

type Gender = 'male' | 'female';

const GenderScreen = () => {
  const { user } = useAuth();
  const [gender, setGender] = useState<Gender | null>(null);

  const handleNext = async () => {
    if (user && gender) {
      await supabase.from('profiles').update({ gender }).eq('id', user.id);
      try { identify(user.id, { gender }); } catch {}
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
      progress={17}
      showBackButton={true}
      showCloseButton={true}
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
              <Text style={[styles.cardTitle, gender === option.value && styles.selectedText]}>
                {option.title}
              </Text>
              <Text style={[styles.cardSubtitle, gender === option.value && styles.selectedText]}>
                {option.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleNext} 
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
          buttonColor={gender ? colors.accent : colors.border}
          labelStyle={{color: 'white'}}
          disabled={!gender}
        >
          Continue
        </Button>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    width: '100%',
    gap: theme.spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedText: {
    color: colors.text,
  },
  footer: {
    padding: 24,
  },
  nextButton: {
    borderRadius: 24,
    width: '100%',
  },
  nextButtonContent: {
    height: 56,
  },
});

export default GenderScreen; 