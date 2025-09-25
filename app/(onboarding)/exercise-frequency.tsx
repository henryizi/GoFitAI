import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { LinearGradient } from 'expo-linear-gradient';

type WorkoutFrequency = '1' | '2-3' | '4-5' | '6-7';

// This screen collects the user's preferred workout frequency 
// which will be used to generate personalized workout plans
const ExerciseFrequencyScreen = () => {
  const { user, refreshProfile } = useAuth();
  const [frequency, setFrequency] = useState<WorkoutFrequency | null>(null);

  // Map exercise frequency to workout plan frequency
  const mapToWorkoutFrequency = (exerciseFreq: WorkoutFrequency): '2_3' | '4_5' | '6' => {
    switch (exerciseFreq) {
      case '1':
      case '2-3':
        return '2_3';
      case '4-5':
        return '4_5';
      case '6-7':
        return '6';
      default:
        return '2_3'; // Default for beginners
    }
  };

  const handleNext = async () => {
    if (user && frequency) {
      const workoutFrequency = mapToWorkoutFrequency(frequency);
      console.log('💾 Onboarding: Saving exercise frequency:', {
        user_id: user.id,
        selected_frequency: frequency,
        mapped_workout_frequency: workoutFrequency,
        exercise_frequency: frequency,
        workout_frequency: workoutFrequency
      });
      const { error } = await supabase.from('profiles').update({
        exercise_frequency: frequency,
        workout_frequency: workoutFrequency
      }).eq('id', user.id);
      
      if (error) {
        console.error('❌ Error saving exercise frequency:', error);
        console.error('Exercise frequency values:', { frequency, workoutFrequency });
        // Continue anyway to prevent blocking the user
      } else {
        console.log('✅ Exercise frequency saved successfully');
      }
      
      // Refresh profile data to ensure changes are immediately reflected
      try {
        await refreshProfile();
        console.log('Profile refreshed after exercise frequency update');
      } catch (refreshError) {
        console.warn('Failed to refresh profile after exercise frequency update:', refreshError);
      }
      
      try { identify(user.id, {
        exercise_frequency: frequency,
        workout_frequency: workoutFrequency
      }); } catch {}
      router.push('/(onboarding)/activity-level');
    }
  };

  const handleBack = () => {
    router.replace('/(onboarding)/weight-trend');
  };

  const handleClose = () => {
    router.replace('/(main)/dashboard');
  };

  const options = [
    {
      value: '1' as WorkoutFrequency,
      title: '1 workout per week',
      icon: 'sleep' as const,
    },
    {
      value: '2-3' as WorkoutFrequency,
      title: '2-3 workouts per week',
      icon: 'walk' as const,
    },
    {
      value: '4-5' as WorkoutFrequency,
      title: '4-5 workouts per week',
      icon: 'run' as const,
    },
    {
      value: '6-7' as WorkoutFrequency,
      title: '6-7 workouts per week',
      icon: 'dumbbell' as const,
    },
  ];

  return (
    <OnboardingLayout
      title="What's your preferred workout frequency?"
      subtitle="This will help us create personalized workout plans for you"
      progress={0.63}
      currentStep={7}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/weight-trend"
      onClose={handleClose}
    >
      <View style={styles.content}>
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
      
      <View style={styles.footer}>
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
    padding: 24,
    paddingBottom: 40,
  },
});

export default ExerciseFrequencyScreen; 