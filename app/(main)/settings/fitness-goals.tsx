import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert, Image, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';
import { identify } from '../../../src/services/analytics/analytics';

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#FF453A',
};

const trainingLevels = [
  { id: 'beginner', title: 'Beginner', subtitle: 'New to fitness', icon: 'baby-face' },
  { id: 'intermediate', title: 'Intermediate', subtitle: '6+ months experience', icon: 'account' },
  { id: 'advanced', title: 'Advanced', subtitle: '2+ years experience', icon: 'account-star' },
];

const primaryGoals = [
  { id: 'general_fitness', title: 'General Fitness', subtitle: 'Improve overall health and physical conditioning', icon: 'heart-pulse' },
  { id: 'muscle_gain', title: 'Muscle Gain', subtitle: 'Build muscle mass and strength', icon: 'arm-flex' },
  { id: 'fat_loss', title: 'Fat Loss', subtitle: 'Lose body fat while preserving muscle', icon: 'scale' },
  { id: 'athletic_performance', title: 'Athletic Performance', subtitle: 'Enhance speed, power, and sports performance', icon: 'run' },
];

const fitnessStrategies = [
  { 
    id: 'bulk', 
    title: 'Bulk', 
    subtitle: 'Build muscle mass', 
    description: 'Calorie surplus focused on maximizing muscle growth',
    icon: 'arm-flex',
    color: colors.primary
  },
  { 
    id: 'cut', 
    title: 'Cut', 
    subtitle: 'Lose body fat', 
    description: 'Calorie deficit while preserving muscle mass',
    icon: 'fire',
    color: colors.accent
  },
  { 
    id: 'maintenance', 
    title: 'Maintenance', 
    subtitle: 'Maintain physique', 
    description: 'Balanced approach to maintain current weight',
    icon: 'scale-balance',
    color: colors.secondary
  },
  { 
    id: 'recomp', 
    title: 'Body Recomp', 
    subtitle: 'Build muscle & lose fat', 
    description: 'Simultaneous muscle gain and fat loss',
    icon: 'autorenew',
    color: '#8B5CF6'
  },
  { 
    id: 'maingaining', 
    title: 'Maingaining', 
    subtitle: 'Slow, lean gains', 
    description: 'Gradual muscle growth with minimal fat gain',
    icon: 'trending-up',
    color: '#10B981'
  }
];

const workoutFrequencies = [
  { id: '1', title: '1 Day', subtitle: 'Light routine' },
  { id: '2', title: '2 Days', subtitle: 'Maintenance' },
  { id: '3', title: '3 Days', subtitle: 'Balanced' },
  { id: '4', title: '4 Days', subtitle: 'Active' },
  { id: '5', title: '5 Days', subtitle: 'Intensive' },
  { id: '6', title: '6 Days', subtitle: 'Very active' },
  { id: '7', title: '7 Days', subtitle: 'Elite routine' },
];

// Helper function to map UI workout frequency to database format
const mapWorkoutFrequencyToDatabase = (frequency: string): '2_3' | '4_5' | '6' => {
  switch (frequency) {
    case '1':
    case '2':
    case '3':
      return '2_3';
    case '4':
    case '5':
      return '4_5';
    case '6':
    case '7':
    default:
      return '6';
  }
};

// Helper function to map database workout frequency to UI format
const mapWorkoutFrequencyFromDatabase = (frequency: string): string => {
  switch (frequency) {
    case '2_3':
      return '3';
    case '4_5':
      return '4';
    case '6':
      return '6';
    default:
      return '4'; // Default fallback
  }
};

export default function FitnessGoalsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [selectedTrainingLevel, setSelectedTrainingLevel] = useState<string>('beginner');
  const [selectedGoal, setSelectedGoal] = useState<string>('general_fitness');

  // Handle migration from old 'hypertrophy' value to new 'muscle_gain' value
  const effectiveSelectedGoal = selectedGoal === 'hypertrophy' ? 'muscle_gain' : selectedGoal;
  const [selectedFrequency, setSelectedFrequency] = useState<string>('5');

  // Debug log initial values and profile changes
  useEffect(() => {
    console.log('🚀 Fitness Goals: Component mounted with profile:', {
      workout_frequency: profile?.workout_frequency,
      exercise_frequency: profile?.exercise_frequency,
      selectedFrequency: selectedFrequency,
      profileExists: !!profile,
      userHasModified: userHasModified
    });
  }, []);

  // Additional debug for profile changes
  useEffect(() => {
    if (profile) {
      console.log('📊 Profile loaded/changed:', {
        workout_frequency: profile.workout_frequency,
        exercise_frequency: profile.exercise_frequency,
        onboarding_completed: profile.onboarding_completed
      });
    } else {
      console.log('📊 Profile is null');
    }
  }, [profile]);

  // New state for fitness strategy
  const [selectedFitnessStrategy, setSelectedFitnessStrategy] = useState<string>('maintenance');

  // Track if user has made changes to avoid overwriting with profile updates
  const [userHasModified, setUserHasModified] = useState(false);

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    message = "Customize your fitness goals and preferences here.";
    
    return { greeting, message };
  }, []);


  // Sync local state with profile data when profile changes (but only if user hasn't modified)
  useEffect(() => {
    if (profile && !userHasModified) {
      console.log('🔄 Fitness Goals: Syncing with updated profile data:', {
        training_level: profile.training_level,
        primary_goal: profile.primary_goal,
        workout_frequency: profile.workout_frequency,
        exercise_frequency: profile.exercise_frequency,
        fitness_strategy: profile.fitness_strategy
      });

      setSelectedTrainingLevel(profile.training_level || 'beginner');
      // Handle migration from 'hypertrophy' to 'muscle_gain'
      const goal = profile.primary_goal === 'hypertrophy' ? 'muscle_gain' : (profile.primary_goal || 'general_fitness');
      setSelectedGoal(goal);
      // Prefer exact preferred_workout_frequency if available, fallback to mapped value
      const mappedFrequency = profile.preferred_workout_frequency
        ? String(profile.preferred_workout_frequency)
        : (profile.workout_frequency ? mapWorkoutFrequencyFromDatabase(profile.workout_frequency) : '4');
      setSelectedFrequency(mappedFrequency);
      setSelectedFitnessStrategy(profile.fitness_strategy || 'maintenance');

      console.log('✅ Fitness Goals: Local state updated from profile');
    } else if (profile && userHasModified) {
      console.log('🔄 Fitness Goals: Profile updated but user has pending changes - preserving local state');
    } else if (!profile) {
      console.log('⚠️ Fitness Goals: Profile is null - using defaults');
      setSelectedTrainingLevel('beginner');
      setSelectedGoal('general_fitness');
      setSelectedFrequency('5');
      setSelectedFitnessStrategy('maintenance');
    }
  }, [profile, userHasModified]);

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const updateData = {
        training_level: selectedTrainingLevel as 'beginner' | 'intermediate' | 'advanced',
        primary_goal: selectedGoal as 'general_fitness' | 'muscle_gain' | 'fat_loss' | 'athletic_performance',
        workout_frequency: mapWorkoutFrequencyToDatabase(selectedFrequency),
        preferred_workout_frequency: parseInt(selectedFrequency, 10), // NEW: Store exact number for AI calculations
        fitness_strategy: selectedFitnessStrategy as 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining',
      };

      console.log('💾 Saving fitness goals:', updateData);
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Fitness goals saved via Supabase');

      try {
        await refreshProfile();
        updateProfile(updateData);
      } catch (refreshError) {
        console.warn('⚠️ Failed to refresh profile after saving fitness goals:', refreshError);
      }

      // Reset modification flag since we've saved the changes
      setUserHasModified(false);

      console.log('🔄 Fitness goals saved. Waiting for real-time subscription to update profile state...');

      try {
        identify(user.id, {
          training_level: updateData.training_level,
          primary_goal: updateData.primary_goal,
          workout_frequency: updateData.workout_frequency,
          fitness_strategy: updateData.fitness_strategy
        });
      } catch {}

      Alert.alert(
        'Success',
        'Fitness goals updated successfully! Changes will appear instantly.',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      console.error('Error updating goals:', error);
      Alert.alert('Error', 'Failed to update goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: 60 + insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
            <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.saveButton} 
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveButtonText, loading && styles.saveButtonTextDisabled]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Training Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training Level</Text>
          {trainingLevels.map((level) => (
            <TouchableOpacity
              key={level.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedTrainingLevel(level.id);
              }}
              style={[
                styles.optionCard,
                selectedTrainingLevel === level.id && styles.optionCardSelected
              ]}
              activeOpacity={0.8}
            >
              <View style={[
                styles.optionIconContainer,
                selectedTrainingLevel === level.id && styles.selectedIconContainer
              ]}>
                <Icon name={level.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{level.title}</Text>
                <Text style={styles.optionSubtitle}>{level.subtitle}</Text>
              </View>
              <View style={styles.radioButton}>
                {selectedTrainingLevel === level.id && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>



        {/* Primary Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Goal</Text>
          {primaryGoals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedGoal(goal.id);
              }}
              style={[
                styles.optionCard,
                effectiveSelectedGoal === goal.id && styles.optionCardSelected
              ]}
              activeOpacity={0.8}
            >
              <View style={[
                styles.optionIconContainer,
                effectiveSelectedGoal === goal.id && styles.selectedIconContainer
              ]}>
                <Icon name={goal.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{goal.title}</Text>
                <Text style={styles.optionSubtitle}>{goal.subtitle}</Text>
              </View>
              <View style={styles.radioButton}>
                {effectiveSelectedGoal === goal.id && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Workout Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Frequency</Text>
          {workoutFrequencies.map((frequency) => (
            <TouchableOpacity
              key={frequency.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedFrequency(frequency.id);
              }}
              style={[
                styles.optionCard,
                selectedFrequency === frequency.id && styles.optionCardSelected
              ]}
              activeOpacity={0.8}
            >
              <View style={[
                styles.optionIconContainer,
                selectedFrequency === frequency.id && styles.selectedIconContainer
              ]}>
                <Icon name="calendar-clock" size={20} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{frequency.title}</Text>
                <Text style={styles.optionSubtitle}>{frequency.subtitle}</Text>
              </View>
              <View style={styles.radioButton}>
                {selectedFrequency === frequency.id && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness Strategy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Strategy</Text>
          {fitnessStrategies.map((strategy) => (
            <TouchableOpacity
              key={strategy.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedFitnessStrategy(strategy.id);
              }}
              style={[
                styles.optionCard,
                selectedFitnessStrategy === strategy.id && styles.optionCardSelected
              ]}
              activeOpacity={0.8}
            >
              <View style={[
                styles.optionIconContainer,
                selectedFitnessStrategy === strategy.id && styles.selectedIconContainer
              ]}>
                <Icon name={strategy.icon as any} size={20} color={strategy.color || colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{strategy.title}</Text>
                <Text style={styles.optionSubtitle}>{strategy.subtitle}</Text>
                {strategy.description && (
                  <Text style={styles.optionDescription}>
                    {strategy.description}
                  </Text>
                )}
              </View>
              <View style={styles.radioButton}>
                {selectedFitnessStrategy === strategy.id && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  coachAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  saveButtonTextDisabled: {
    opacity: 0.6,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderColor: colors.primary,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  // New slider styles
  sliderCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sliderCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sliderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sliderContent: {
    flex: 1,
  },
  sliderTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sliderValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  slider: {
    marginBottom: 12,
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
}); 