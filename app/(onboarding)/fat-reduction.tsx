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

const FatReductionScreen = () => {
  const { user } = useAuth();
  const [fatReduction, setFatReduction] = useState('');

  const handleNext = async () => {
    if (user && fatReduction) {
      const fatReductionNumber = parseFloat(fatReduction);
      if (!isNaN(fatReductionNumber) && fatReductionNumber >= 0 && fatReductionNumber <= 50) {
        await supabase.from('profiles').update({ goal_fat_reduction: fatReductionNumber }).eq('id', user.id);
        try { identify(user.id, { goal_fat_reduction: fatReductionNumber }); } catch {}
        try { analyticsTrack('onboarding_step_next', { step: 'fat-reduction' }); } catch {}
        router.push('/(onboarding)/muscle-gain');
      }
    }
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'fat-reduction' }); } catch {}
    router.replace('/(onboarding)/body-fat');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'fat-reduction' }); } catch {}
    router.replace('/(main)/dashboard');
  };

  const isValid = fatReduction && parseFloat(fatReduction) >= 0 && parseFloat(fatReduction) <= 50;

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={handleBack} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '78%' }]} />
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
              <Text style={styles.title}>What's your fat reduction goal?</Text>
              <Text style={styles.subtitle}>What percentage of body fat do you want to lose?</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={fatReduction}
                  onChangeText={setFatReduction}
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

export default FatReductionScreen; 