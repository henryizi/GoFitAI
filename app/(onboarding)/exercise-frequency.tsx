import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { Appbar } from 'react-native-paper';
import { identify } from '../../src/services/analytics/analytics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ExerciseFrequency = '0' | '1-3' | '4-6' | '7+';

const ExerciseFrequencyScreen = () => {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<ExerciseFrequency | null>(null);

  const handleNext = async () => {
    if (user && frequency) {
      await supabase.from('profiles').update({ exercise_frequency: frequency }).eq('id', user.id);
      try { identify(user.id, { exercise_frequency: frequency }); } catch {}
      router.push('/(onboarding)/activity-level');
    }
  };

  const options = [
    {
      value: '0' as ExerciseFrequency,
      title: '0 sessions',
      icon: 'sleep' as const,
    },
    {
      value: '1-3' as ExerciseFrequency,
      title: '1-3 sessions',
      icon: 'walk' as const,
    },
    {
      value: '4-6' as ExerciseFrequency,
      title: '4-6 sessions',
      icon: 'run' as const,
    },
    {
      value: '7+' as ExerciseFrequency,
      title: '7+ sessions',
      icon: 'dumbbell' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.replace('/(onboarding)/weight-trend')} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '44%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={() => router.replace('/(main)/dashboard')} />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Text style={styles.title}>How often do you exercise?</Text>
        <Text style={styles.subtitle}>This helps us understand your current fitness routine</Text>
        
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, frequency === option.value && styles.selectedCard]}
              onPress={() => setFrequency(option.value)}
            >
              <View style={styles.cardContent}>
                <MaterialCommunityIcons
                  name={option.icon}
                  size={24}
                  color={frequency === option.value ? colors.text : colors.textSecondary}
                  style={styles.cardIcon}
                />
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, frequency === option.value && styles.selectedText]}>
                    {option.title}
                  </Text>
                </View>
              </View>
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
          buttonColor={frequency ? colors.accent : colors.border}
          labelStyle={{color: 'white'}}
          disabled={!frequency}
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
    marginTop: -20, // Moved question closer to progress bar
    paddingBottom: 400, // Significantly increased bottom padding to prevent overlap with footer
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4, // Reduced margin to move subtitle higher
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12, // Further reduced margin to move options higher
  },
  optionsContainer: {
    width: '100%',
    gap: theme.spacing.lg,
    marginBottom: 50, // Reduced margin to move content higher
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: theme.spacing.md,
  },
  cardTextContainer: {
    flex: 1,
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

export default ExerciseFrequencyScreen; 