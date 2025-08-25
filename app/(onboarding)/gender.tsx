import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { Appbar } from 'react-native-paper';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';

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
    router.replace('/(main)/dashboard');
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
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={handleBack} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '17%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={handleClose} />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Text style={styles.title}>What's your gender?</Text>
        <Text style={styles.subtitle}>This helps us tailor your workout and nutrition plans</Text>
        
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