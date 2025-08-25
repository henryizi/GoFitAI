import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
  { id: 'weight_loss', title: 'Weight Loss', subtitle: 'Burn fat and lose weight', icon: 'scale-bathroom' },
  { id: 'muscle_gain', title: 'Muscle Gain', subtitle: 'Build muscle and strength', icon: 'arm-flex' },
  { id: 'general_fitness', title: 'General Fitness', subtitle: 'Stay healthy and active', icon: 'heart-pulse' },
  { id: 'endurance', title: 'Endurance', subtitle: 'Improve cardiovascular health', icon: 'run' },
];

const workoutFrequencies = [
  { id: '2_3', title: '2-3 times per week', subtitle: 'Light activity' },
  { id: '4_5', title: '4-5 times per week', subtitle: 'Moderate activity' },
  { id: '6_7', title: '6-7 times per week', subtitle: 'High activity' },
];

export default function FitnessGoalsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [selectedTrainingLevel, setSelectedTrainingLevel] = useState<string>(profile?.training_level || 'beginner');
  const [selectedGoal, setSelectedGoal] = useState<string>('general_fitness');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('4_5');
  
  // New state for fat loss and muscle gain goals
  const [fatLossGoal, setFatLossGoal] = useState<number>(profile?.goal_fat_reduction || 0);
  const [muscleGainGoal, setMuscleGainGoal] = useState<number>(profile?.goal_muscle_gain || 0);

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Use proper environment configuration
      const response = await fetch(`${environment.apiUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          updates: {
            training_level: selectedTrainingLevel as 'beginner' | 'intermediate' | 'advanced',
            goal_fat_reduction: fatLossGoal,
            goal_muscle_gain: muscleGainGoal,
          },
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      try { 
        identify(user.id, { 
          training_level: selectedTrainingLevel, 
          primary_goal: selectedGoal, 
          workout_frequency: selectedFrequency,
          goal_fat_reduction: fatLossGoal,
          goal_muscle_gain: muscleGainGoal
        }); 
      } catch {}

      Alert.alert('Success', 'Fitness goals updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop' }}
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
              onPress={() => setSelectedTrainingLevel(level.id)}
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
                  <Icon name={level.icon} size={24} color={colors.primary} />
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

        {/* Fat Loss Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>FAT LOSS GOAL</Text></Text>
          <View style={styles.sliderCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              style={styles.sliderCardGradient}
            >
              <View style={styles.sliderHeader}>
                <View style={styles.sliderIconContainer}>
                  <Icon name="trending-down" size={24} color={colors.accent} />
                </View>
                <View style={styles.sliderContent}>
                  <Text style={styles.sliderTitle}>Target Fat Loss</Text>
                  <Text style={styles.sliderValue}>{fatLossGoal}%</Text>
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={20}
                value={fatLossGoal}
                onValueChange={(value) => setFatLossGoal(Math.round(value))}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={colors.accent}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0%</Text>
                <Text style={styles.sliderLabel}>20%</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Muscle Gain Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>03 <Text style={styles.sectionTitleText}>MUSCLE GAIN GOAL</Text></Text>
          <View style={styles.sliderCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              style={styles.sliderCardGradient}
            >
              <View style={styles.sliderHeader}>
                <View style={styles.sliderIconContainer}>
                  <Icon name="arm-flex" size={24} color={colors.success} />
                </View>
                <View style={styles.sliderContent}>
                  <Text style={styles.sliderTitle}>Target Muscle Gain</Text>
                  <Text style={styles.sliderValue}>{muscleGainGoal} kg</Text>
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={20}
                value={muscleGainGoal}
                onValueChange={(value) => setMuscleGainGoal(Math.round(value))}
                minimumTrackTintColor={colors.success}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={colors.success}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0 kg</Text>
                <Text style={styles.sliderLabel}>20 kg</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Primary Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>04 <Text style={styles.sectionTitleText}>PRIMARY GOAL</Text></Text>
          {primaryGoals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => setSelectedGoal(goal.id)}
              style={styles.optionCard}
            >
              <LinearGradient
                colors={selectedGoal === goal.id ? 
                  ['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)'] : 
                  ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                style={styles.optionCardGradient}
              >
                <View style={[styles.optionIconContainer, 
                  selectedGoal === goal.id && styles.selectedIconContainer]}>
                  <Icon name={goal.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{goal.title}</Text>
                  <Text style={styles.optionSubtitle}>{goal.subtitle}</Text>
                </View>
                <View style={styles.radioButton}>
                  {selectedGoal === goal.id && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Workout Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>05 <Text style={styles.sectionTitleText}>WORKOUT FREQUENCY</Text></Text>
          {workoutFrequencies.map((frequency) => (
            <TouchableOpacity
              key={frequency.id}
              onPress={() => setSelectedFrequency(frequency.id)}
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