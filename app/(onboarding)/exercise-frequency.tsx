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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { LinearGradient } from 'expo-linear-gradient';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

type WorkoutFrequency = '1' | '2' | '3' | '4' | '5' | '6' | '7';

// This screen collects the user's preferred workout frequency 
// which will be used to generate personalized workout plans
const ExerciseFrequencyScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [frequency, setFrequency] = useState<WorkoutFrequency | null>(null);

  // Map exercise frequency to database-compatible values
  const mapToExerciseFrequency = (exerciseFreq: WorkoutFrequency): '1' | '2-3' | '4-5' | '6-7' => {
    switch (exerciseFreq) {
      case '1':
        return '1';
      case '2':
      case '3':
        return '2-3';
      case '4':
      case '5':
        return '4-5';
      case '6':
      case '7':
        return '6-7';
      default:
        return '2-3'; // Default to 2-3 days
    }
  };

  // Map exercise frequency to workout plan frequency
  const mapToWorkoutFrequency = (exerciseFreq: WorkoutFrequency): '2_3' | '4_5' | '6' => {
    switch (exerciseFreq) {
      case '1':
      case '2':
      case '3':
        return '2_3';
      case '4':
      case '5':
        return '4_5';
      case '6':
      case '7':
        return '6';
      default:
        return '2_3'; // Default to 2_3 days
    }
  };

  const handleNext = async () => {
    if (!user || !frequency) return;
    
    const exerciseFrequency = mapToExerciseFrequency(frequency);
    const workoutFrequency = mapToWorkoutFrequency(frequency);
    const preferredWorkoutFrequency = parseInt(frequency, 10); // Store actual user preference (1-7)
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({
        id: user.id,
        exercise_frequency: exerciseFrequency,
        workout_frequency: workoutFrequency,
        preferred_workout_frequency: preferredWorkoutFrequency, // NEW: Store exact number for AI calculations
        onboarding_completed: false
      }).select(),
      `Saving exercise frequency: ${exerciseFrequency}, workout frequency: ${workoutFrequency}, preferred: ${preferredWorkoutFrequency}`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, {
      exercise_frequency: exerciseFrequency,
      workout_frequency: workoutFrequency,
      preferred_workout_frequency: preferredWorkoutFrequency
    }); } catch {}
    
    console.log('🚀 Navigating to activity-level screen...');
    router.replace('/(onboarding)/activity-level');
  };

  const handleBack = () => {
    router.replace('/(onboarding)/level');
  };

  const handleClose = () => {
    router.replace('/(main)/dashboard');
  };

  const options = [
    {
      value: '1' as WorkoutFrequency,
      title: '1 Day',
      subtitle: 'Light routine',
      icon: 'numeric-1-circle' as const,
    },
    {
      value: '2' as WorkoutFrequency,
      title: '2 Days',
      subtitle: 'Maintenance',
      icon: 'numeric-2-circle' as const,
    },
    {
      value: '3' as WorkoutFrequency,
      title: '3 Days',
      subtitle: 'Balanced',
      icon: 'numeric-3-circle' as const,
    },
    {
      value: '4' as WorkoutFrequency,
      title: '4 Days',
      subtitle: 'Active',
      icon: 'numeric-4-circle' as const,
    },
    {
      value: '5' as WorkoutFrequency,
      title: '5 Days',
      subtitle: 'Intensive',
      icon: 'numeric-5-circle' as const,
    },
    {
      value: '6' as WorkoutFrequency,
      title: '6 Days',
      subtitle: 'Very active',
      icon: 'numeric-6-circle' as const,
    },
    {
      value: '7' as WorkoutFrequency,
      title: '7 Days',
      subtitle: 'Elite routine',
      icon: 'dumbbell' as const,
    },
  ];

  return (
    <OnboardingLayout
      title="What's your preferred workout frequency?"
      subtitle="This will help us create personalized workout plans for you"
      progress={0.666}
      currentStep={8}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/weight-trend"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.questionLabel}>
          <Text style={styles.questionLabelText}>Question 8</Text>
        </View>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, frequency === option.value && styles.selectedCard]}
              onPress={() => setFrequency(option.value)}
            >
              <LinearGradient
                colors={frequency === option.value 
                  ? ['rgba(255, 107, 53, 0.3)', 'rgba(255, 142, 83, 0.2)']
                  : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <MaterialCommunityIcons 
                  name={option.icon} 
                  size={24} 
                  color={frequency === option.value ? '#FFFFFF' : colors.textSecondary} 
                  style={styles.optionIcon}
                />
                <View style={styles.optionContent}>
                  <Text style={[styles.cardTitle, frequency === option.value && styles.selectedText]}>
                    {option.title}
                  </Text>
                  <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                </View>
                <View style={[styles.radioButton, frequency === option.value && styles.radioButtonSelected]}>
                  {frequency === option.value && (
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
          disabled={!frequency}
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
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
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

export default ExerciseFrequencyScreen; 