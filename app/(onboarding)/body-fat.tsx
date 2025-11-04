import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

const BodyFatScreen = () => {
  const { user } = useAuth();
  const [bodyFat, setBodyFat] = useState('');

  const handleNext = async () => {
    if (!user || !bodyFat) return;
    
    const bodyFatNumber = parseFloat(bodyFat);
    if (isNaN(bodyFatNumber) || bodyFatNumber < 0 || bodyFatNumber > 50) return;
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({ id: user.id, body_fat: bodyFatNumber, onboarding_completed: false }).select(),
      `Saving body fat: ${bodyFatNumber}%`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, { body_fat: bodyFatNumber }); } catch {}
    try { analyticsTrack('onboarding_step_next', { step: 'body-fat' }); } catch {}
    
    console.log('🚀 Navigating to primary-goal screen...');
    router.replace('/(onboarding)/primary-goal');
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'body-fat' }); } catch {}
    router.replace('/(onboarding)/activity-level');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'body-fat' }); } catch {}
    router.replace('/(main)/dashboard');
  };

  const isValid = bodyFat && parseFloat(bodyFat) >= 0 && parseFloat(bodyFat) <= 50;

  return (
    <OnboardingLayout
      title="What's your body fat percentage?"
      subtitle="This helps us track your body composition progress"
      progress={0.75}
      currentStep={9}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/activity-level"
      onClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={undefined}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.content}>
              <View style={styles.inputContainer}>
                <TextInput
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  placeholder=""
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  autoFocus
                />
                <Text style={styles.unit}>%</Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
        <View style={styles.footer}>
          <OnboardingButton
            title="Continue"
            onPress={handleNext}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  inputContainer: {
    width: '100%',
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 18,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
    width: 120,
  },
  unit: {
    fontSize: 18,
    color: colors.text,
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
  },
});

export default BodyFatScreen; 