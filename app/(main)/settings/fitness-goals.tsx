import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';
import { identify } from '../../../src/services/analytics/analytics';
import { environment } from '../../../src/config/environment';

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
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
  const { user, profile } = useAuth();
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
      // Map database workout frequency to UI format
      const mappedFrequency = profile.workout_frequency ? mapWorkoutFrequencyFromDatabase(profile.workout_frequency) : '4';
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
      console.log('🌐 Using API URL:', environment.apiUrl);

      // Use proper environment configuration
      const response = await fetch(`${environment.apiUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          updates: updateData,
        }),
      });

      const result = await response.json() as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      console.log('✅ Save successful, result:', result);

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
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=2070&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)', colors.dark]}
          style={styles.overlay}
        />
      </ImageBackground>

      <ScrollView 
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FITNESS GOALS</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
            <Text style={styles.saveButtonText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        {/* Training Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>01 <Text style={styles.sectionTitleText}>TRAINING LEVEL</Text></Text>
          {trainingLevels.map((level) => (
            <TouchableOpacity
              key={level.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedTrainingLevel(level.id);
              }}
              style={styles.optionCard}
            >
              <LinearGradient
                colors={selectedTrainingLevel === level.id ? 
                  ['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)'] : 
                  ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.optionCardGradient}
              >
                <View style={[styles.optionIconContainer, 
                  selectedTrainingLevel === level.id && styles.selectedIconContainer]}>
                  <Icon name={level.icon as any} size={24} color={colors.primary} />
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
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>



        {/* Primary Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>PRIMARY GOAL</Text></Text>
          {primaryGoals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedGoal(goal.id);
              }}
              style={styles.optionCard}
            >
              <LinearGradient
                colors={effectiveSelectedGoal === goal.id ?
                  ['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)'] :
                  ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.optionCardGradient}
              >
                <View style={[styles.optionIconContainer,
                  effectiveSelectedGoal === goal.id && styles.selectedIconContainer]}>
                  <Icon name={goal.icon as any} size={24} color={colors.primary} />
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
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Workout Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>03 <Text style={styles.sectionTitleText}>WORKOUT FREQUENCY</Text></Text>
          {workoutFrequencies.map((frequency) => (
            <TouchableOpacity
              key={frequency.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedFrequency(frequency.id);
              }}
              style={styles.optionCard}
            >
              <LinearGradient
                colors={selectedFrequency === frequency.id ?
                  ['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)'] :
                  ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.optionCardGradient}
              >
                <View style={[styles.optionIconContainer,
                  selectedFrequency === frequency.id && styles.selectedIconContainer]}>
                  <Icon name="calendar-clock" size={24} color={colors.primary} />
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
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness Strategy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>04 <Text style={styles.sectionTitleText}>FITNESS STRATEGY</Text></Text>
          {fitnessStrategies.map((strategy) => (
            <TouchableOpacity
              key={strategy.id}
              onPress={() => {
                setUserHasModified(true);
                setSelectedFitnessStrategy(strategy.id);
              }}
              style={styles.optionCard}
            >
              <LinearGradient
                colors={selectedFitnessStrategy === strategy.id ?
                  ['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)'] :
                  ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.optionCardGradient}
              >
                <View style={[styles.optionIconContainer,
                  selectedFitnessStrategy === strategy.id && styles.selectedIconContainer]}>
                  <Icon name={strategy.icon as any} size={24} color={strategy.color || colors.primary} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{strategy.title}</Text>
                  <Text style={styles.optionSubtitle}>{strategy.subtitle}</Text>
                  {strategy.description && (
                    <Text style={[styles.optionSubtitle, { fontSize: 12, marginTop: 4 }]}>
                      {strategy.description}
                    </Text>
                  )}
                </View>
                <View style={styles.radioButton}>
                  {selectedFitnessStrategy === strategy.id && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
              </LinearGradient>
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
    backgroundColor: colors.dark,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sectionTitleText: {
    color: colors.text,
  },
  optionCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,107,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedIconContainer: {
    backgroundColor: 'rgba(255,107,53,0.2)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  optionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
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