import React, { useState } from 'react';
import { View, StyleSheet, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { Appbar } from 'react-native-paper';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';

const MuscleGainScreen = () => {
  const { user } = useAuth();
  const [muscleGain, setMuscleGain] = useState('');

  const handleNext = async () => {
    if (user && muscleGain) {
      const muscleGainNumber = parseFloat(muscleGain);
      if (!isNaN(muscleGainNumber) && muscleGainNumber >= 0 && muscleGainNumber <= 50) {
        await supabase.from('profiles').update({ goal_muscle_gain: muscleGainNumber }).eq('id', user.id);
        try { identify(user.id, { goal_muscle_gain: muscleGainNumber }); } catch {}
        try { analyticsTrack('onboarding_step_next', { step: 'muscle-gain' }); } catch {}
        router.push('/(onboarding)/level');
      }
    }
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'muscle-gain' }); } catch {}
    router.replace('/(onboarding)/fat-reduction');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'muscle-gain' }); } catch {}
    router.replace('/(main)/dashboard');
  };

  const isValid = muscleGain && parseFloat(muscleGain) >= 0 && parseFloat(muscleGain) <= 50;

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={handleBack} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '89%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={handleClose} />
      </Appbar.Header>
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
              <Text style={styles.title}>What's your muscle gain goal?</Text>
              <Text style={styles.subtitle}>How much muscle mass do you want to build?</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={muscleGain}
                  onChangeText={setMuscleGain}
                  placeholder=""
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  autoFocus
                />
                <Text style={styles.unit}>kg</Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
        <View style={styles.footer}>
          <Button 
            mode="contained" 
            onPress={handleNext} 
            style={styles.nextButton}
            contentStyle={styles.nextButtonContent}
            buttonColor={isValid ? colors.accent : colors.border}
            labelStyle={{color: 'white'}}
            disabled={!isValid}
          >
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appbar: {
    backgroundColor: colors.background,
    elevation: 0,
    borderBottomWidth: 0,
  },
  progressBar: {
    flex: 1,
    alignItems: 'center',
  },
  progress: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
    backgroundColor: colors.background,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  nextButton: {
    borderRadius: 24,
    width: '100%',
  },
  nextButtonContent: {
    height: 56,
  },
});

export default MuscleGainScreen; 