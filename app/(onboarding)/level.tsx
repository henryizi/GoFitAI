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
import { track as analyticsTrack } from '../../src/services/analytics/analytics';

type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

const LevelScreen = () => {
  const { user } = useAuth();
  const [level, setLevel] = useState<TrainingLevel | null>(null);

  const handleFinish = async () => {
    if (!user || !level) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ training_level: level, onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        try { analyticsTrack('onboarding_complete_failure', { user_id: user.id, error: String(error?.message || error) }); } catch {}
      } else {
        try { identify(user.id, { training_level: level, onboarding_completed: true }); } catch {}
        try { analyticsTrack('onboarding_complete_success', { user_id: user.id, training_level: level }); } catch {}
        router.replace('/(main)/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      try { analyticsTrack('onboarding_complete_failure', { user_id: user?.id, error: String((error as any)?.message || error) }); } catch {}
    }
  };

  const options = [
    {
      value: 'beginner' as TrainingLevel,
      title: 'Beginner',
      subtitle: 'New to fitness or returning after a long break',
    },
    {
      value: 'intermediate' as TrainingLevel,
      title: 'Intermediate',
      subtitle: 'Regular exercise routine for 6+ months',
    },
    {
      value: 'advanced' as TrainingLevel,
      title: 'Advanced',
      subtitle: 'Consistent training for 2+ years',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => { try { analyticsTrack('onboarding_step_prev', { step: 'level' }); } catch {}; router.replace('/(onboarding)/muscle-gain'); }} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '100%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={() => { try { analyticsTrack('onboarding_step_close', { step: 'level' }); } catch {}; router.replace('/(main)/dashboard'); }} />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Text style={styles.title}>What's your training level?</Text>
        <Text style={styles.subtitle}>This helps us tailor the intensity of your workouts</Text>
        
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, level === option.value && styles.selectedCard]}
              onPress={() => setLevel(option.value)}
            >
              <Text style={[styles.cardTitle, level === option.value && styles.selectedText]}>
                {option.title}
              </Text>
              <Text style={[styles.cardSubtitle, level === option.value && styles.selectedText]}>
                {option.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleFinish} 
          style={[styles.nextButton, !level && styles.buttonDisabled]} 
          labelStyle={{color: 'white'}}
          disabled={!level}
        >
          Complete Setup
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
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 16,
    minHeight: 56,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
});

export default LevelScreen; 