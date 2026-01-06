import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl
} from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';

const { width } = Dimensions.get('window');

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
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
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [params, setParams] = useState<PlanParams>({
    gender: (profile?.gender as 'male' | 'female') || 'male',
    primaryGoal: (profile?.primary_goal as any) || 'general_fitness',
    workoutFrequency: (profile?.workout_frequency as any) || '4_5'
  });

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
    
    const goalLabels: Record<string, string> = {
      muscle_gain: 'build muscle',
      fat_loss: 'burn fat',
      athletic_performance: 'boost performance',
      general_fitness: 'improve fitness'
    };
    
    message = `Let's create an AI-powered plan to help you ${goalLabels[params.primaryGoal] || 'reach your goals'}.`;
    
    return { greeting, message };
  }, [params.primaryGoal]);

  const onRefresh = () => {
    setRefreshing(true);
    // Reset to defaults
    setParams({
      gender: (profile?.gender as 'male' | 'female') || 'male',
      primaryGoal: (profile?.primary_goal as any) || 'general_fitness',
      workoutFrequency: (profile?.workout_frequency as any) || '4_5'
    });
    setTimeout(() => setRefreshing(false), 500);
  };

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

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 60 + insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            disabled={isGenerating}
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
        </View>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gender</Text>
          <View style={styles.genderRow}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderCard,
                  params.gender === option.value && styles.genderCardSelected
                ]}
                onPress={() => updateParam('gender', option.value as any)}
                disabled={isGenerating}
                activeOpacity={0.8}
              >
                <Icon 
                  name={option.icon} 
                  size={28} 
                  color={params.gender === option.value ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.genderLabel,
                  params.gender === option.value && styles.genderLabelSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Primary Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Goal</Text>
          {goalOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.goalCard,
                params.primaryGoal === option.value && styles.goalCardSelected
              ]}
              onPress={() => updateParam('primaryGoal', option.value as any)}
              disabled={isGenerating}
              activeOpacity={0.8}
            >
              <View style={[styles.goalIconContainer, { backgroundColor: option.color + '15' }]}>
                <Icon 
                  name={option.icon} 
                  size={24} 
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
                <View style={styles.checkmarkSelected}>
                  <Icon name="check" size={16} color={colors.text} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Workout Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Frequency</Text>
          <View style={styles.frequencyGrid}>
            {frequencyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.frequencyCard,
                  params.workoutFrequency === option.value && styles.frequencyCardSelected
                ]}
                onPress={() => updateParam('workoutFrequency', option.value as any)}
                disabled={isGenerating}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.frequencyValue,
                  params.workoutFrequency === option.value && styles.frequencyValueSelected
                ]}>
                  {option.value}
                </Text>
                <Text style={[
                  styles.frequencyLabel,
                  params.workoutFrequency === option.value && styles.frequencyLabelSelected
                ]}>
                  {option.value === '1' ? 'day' : 'days'}
                </Text>
                {option.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Icon name="star" size={10} color={colors.text} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Icon name="clipboard-check-outline" size={20} color={colors.primary} />
            <Text style={styles.summaryTitle}>Plan Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gender</Text>
              <Text style={styles.summaryValue}>{params.gender === 'male' ? 'Male' : 'Female'}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Goal</Text>
              <Text style={styles.summaryValue}>{goalOptions.find(g => g.value === params.primaryGoal)?.label}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Frequency</Text>
              <Text style={styles.summaryValue}>{params.workoutFrequency} days/week</Text>
            </View>
          </View>
        </View>

        {/* Progress Status */}
        {isGenerating && (
          <View style={styles.statusCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <View style={styles.statusContent}>
              <Text style={styles.statusText}>{statusMessage}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Generate Button */}
      <View style={[styles.footer, { paddingBottom: 60 + insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
          onPress={handleGeneratePlan}
          disabled={!canGenerate}
          activeOpacity={0.8}
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
                <Text style={styles.generateButtonText}>Generating...</Text>
              </>
            ) : (
              <>
                <Icon name="robot-excited" size={22} color={colors.text} />
                <Text style={styles.generateButtonText}>Generate AI Workout Plan</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  coachMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  // Gender Selection
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  genderCardSelected: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
  },
  genderLabelSelected: {
    color: colors.text,
  },

  // Goal Cards
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  goalCardSelected: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  goalContent: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  goalLabelSelected: {
    color: colors.primary,
  },
  goalDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkmarkSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Frequency Grid
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  frequencyCard: {
    width: (width - 40 - 30) / 4,
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  frequencyCardSelected: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  frequencyValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  frequencyValueSelected: {
    color: colors.primary,
  },
  frequencyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  frequencyLabelSelected: {
    color: colors.text,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
    gap: 14,
  },
  statusContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  generateButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
});

