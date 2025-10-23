import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';

const { width, height } = Dimensions.get('window');

// Modern Dark Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.95)',
  border: 'rgba(84, 84, 88, 0.6)',
  blue: '#007AFF',
  purple: '#AF52DE',
};

interface PlanParams {
  gender: 'male' | 'female';
  primaryGoal: 'muscle_gain' | 'fat_loss' | 'athletic_performance' | 'general_fitness';
  workoutFrequency: '1' | '2' | '3' | '4_5' | '6_7';
}

export default function AICustomPlanScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  // Form state
  const [params, setParams] = useState<PlanParams>({
    gender: (profile?.gender as 'male' | 'female') || 'male',
    primaryGoal: (profile?.primary_goal as any) || 'general_fitness',
    workoutFrequency: (profile?.workout_frequency as any) || '4_5'
  });

  const genderOptions = [
    { value: 'male', label: 'Male', icon: 'gender-male' },
    { value: 'female', label: 'Female', icon: 'gender-female' }
  ];

  const goalOptions = [
    { 
      value: 'muscle_gain', 
      label: 'Muscle Gain', 
      icon: 'arm-flex',
      description: 'Build lean muscle mass',
      color: colors.purple
    },
    { 
      value: 'fat_loss', 
      label: 'Fat Loss', 
      icon: 'fire',
      description: 'Burn fat and get lean',
      color: colors.error
    },
    { 
      value: 'athletic_performance', 
      label: 'Athletic Performance', 
      icon: 'run-fast',
      description: 'Enhance power and speed',
      color: colors.blue
    },
    { 
      value: 'general_fitness', 
      label: 'General Fitness', 
      icon: 'heart-pulse',
      description: 'Overall health & wellness',
      color: colors.success
    }
  ];

  const frequencyOptions = [
    { value: '1', label: '1 Day', description: 'Light routine', icon: 'numeric-1-circle' },
    { value: '2', label: '2 Days', description: 'Maintenance', icon: 'numeric-2-circle' },
    { value: '3', label: '3 Days', description: 'Balanced', icon: 'numeric-3-circle' },
    { value: '4', label: '4 Days', description: 'Active', icon: 'numeric-4-circle' },
    { value: '5', label: '5 Days', description: 'Optimal', icon: 'numeric-5-circle', recommended: true },
    { value: '6', label: '6 Days', description: 'Intense', icon: 'numeric-6-circle' },
    { value: '7', label: '7 Days', description: 'Elite routine', icon: 'dumbbell' }
  ];

  const handleGeneratePlan = async () => {
    if (!user || !profile) {
      Alert.alert('Error', 'Please complete your profile first');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('Analyzing your profile...');
    setProgress(20);

    try {
      // Simulate progress updates
      setTimeout(() => {
        setStatusMessage('Consulting AI fitness coach...');
        setProgress(40);
      }, 1000);

      setTimeout(() => {
        setStatusMessage('Designing your custom workout split...');
        setProgress(60);
      }, 2000);

      setTimeout(() => {
        setStatusMessage('Selecting optimal exercises...');
        setProgress(80);
      }, 3000);

      // Calculate age from birthday
      const birthDate = new Date(profile.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const planData = {
        userId: user.id,
        height: profile.height_cm || 175,
        weight: profile.weight_kg || 75,
        age,
        gender: params.gender,
        fullName: profile.full_name || 'User',
        trainingLevel: profile.training_level || 'intermediate',
        primaryGoal: params.primaryGoal,
        fatLossGoal: params.primaryGoal === 'fat_loss' ? 5 : 0,
        muscleGainGoal: params.primaryGoal === 'muscle_gain' ? 5 : 0,
        workoutFrequency: params.workoutFrequency
      };

      console.log('[AI Custom Plan] Generating with params:', planData);

      const plan = await WorkoutService.createAIPlan(planData);

      setStatusMessage('Finalizing your plan...');
      setProgress(100);

      console.log('[AI Custom Plan] Plan created:', plan.id);

      setTimeout(() => {
        // Navigate directly to the generated plan
        router.replace({
          pathname: '/(main)/workout/plan/[planId]',
          params: { planId: String((plan as any).id), planObject: JSON.stringify(plan) }
        });
      }, 500);

    } catch (error) {
      console.error('[AI Custom Plan] Error:', error);
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'Failed to generate workout plan. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
      setProgress(0);
    }
  };

  const updateParam = <K extends keyof PlanParams>(key: K, value: PlanParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const canGenerate = !isGenerating;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1C1C1E', '#121212']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            disabled={isGenerating}
          >
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>AI Custom Plan</Text>
            <Text style={styles.headerSubtitle}>Powered by Gemini AI</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 180 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={[colors.primary + '20', colors.primaryDark + '10']}
            style={styles.infoGradient}
          >
            <Icon name="robot-outline" size={48} color={colors.primary} />
            <Text style={styles.infoTitle}>Professional AI Workout Generator</Text>
            <Text style={styles.infoDescription}>
              Get a personalized workout plan designed by AI, tailored to your goals and preferences. 
              Our system creates professional-grade programs inspired by elite bodybuilders and athletes.
            </Text>
          </LinearGradient>
        </View>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Gender</Text>
          <View style={styles.optionsRow}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  params.gender === option.value && styles.optionCardSelected
                ]}
                onPress={() => updateParam('gender', option.value as any)}
                disabled={isGenerating}
              >
                <Icon 
                  name={option.icon} 
                  size={32} 
                  color={params.gender === option.value ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.optionLabel,
                  params.gender === option.value && styles.optionLabelSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Primary Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Primary Goal</Text>
          {goalOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.goalCard,
                params.primaryGoal === option.value && styles.goalCardSelected
              ]}
              onPress={() => updateParam('primaryGoal', option.value as any)}
              disabled={isGenerating}
            >
              <View style={[styles.goalIconContainer, { backgroundColor: option.color + '20' }]}>
                <Icon 
                  name={option.icon} 
                  size={28} 
                  color={option.color} 
                />
              </View>
              <View style={styles.goalContent}>
                <Text style={[
                  styles.goalLabel,
                  params.primaryGoal === option.value && styles.goalLabelSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.goalDescription}>{option.description}</Text>
              </View>
              {params.primaryGoal === option.value && (
                <Icon name="check-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Workout Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Workout Frequency</Text>
          {frequencyOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.frequencyCard,
                params.workoutFrequency === option.value && styles.frequencyCardSelected,
                option.recommended && styles.frequencyCardRecommended
              ]}
              onPress={() => updateParam('workoutFrequency', option.value as any)}
              disabled={isGenerating}
            >
              <Icon 
                name={option.icon} 
                size={32} 
                color={params.workoutFrequency === option.value ? colors.primary : colors.textSecondary} 
              />
              <View style={styles.frequencyContent}>
                <View style={styles.frequencyHeader}>
                  <Text style={[
                    styles.frequencyLabel,
                    params.workoutFrequency === option.value && styles.frequencyLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  {option.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.frequencyDescription}>{option.description}</Text>
              </View>
              {params.workoutFrequency === option.value && (
                <Icon name="check-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Plan Summary</Text>
          <View style={styles.summaryRow}>
            <Icon name="gender-male-female" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryText}>Gender: {params.gender}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="target" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              Goal: {goalOptions.find(g => g.value === params.primaryGoal)?.label}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="calendar-week" size={20} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              Frequency: {frequencyOptions.find(f => f.value === params.workoutFrequency)?.label}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Generate Button */}
      <View style={[styles.footer, { bottom: 60, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
          onPress={handleGeneratePlan}
          disabled={!canGenerate}
        >
          <LinearGradient
            colors={canGenerate ? [colors.primary, colors.primaryDark] : ['#666', '#555']}
            style={styles.generateGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={styles.generateButtonText}>{statusMessage}</Text>
              </>
            ) : (
              <>
                <Icon name="robot-excited" size={24} color={colors.text} />
                <Text style={styles.generateButtonText}>Generate AI Workout Plan</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Progress Bar */}
        {isGenerating && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 24,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
  },
  optionLabelSelected: {
    color: colors.text,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  goalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  goalContent: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  goalLabelSelected: {
    color: colors.text,
  },
  goalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  frequencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  frequencyCardRecommended: {
    borderColor: colors.success + '40',
  },
  frequencyContent: {
    flex: 1,
    marginLeft: 16,
  },
  frequencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  frequencyLabelSelected: {
    color: colors.text,
  },
  recommendedBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  frequencyDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

