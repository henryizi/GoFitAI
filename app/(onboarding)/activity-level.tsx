import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

type ActivityLevel = 'sedentary' | 'moderately_active' | 'very_active';

const ActivityLevelScreen = () => {
  const { user } = useAuth();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  const handleNext = async () => {
    if (!user || !activityLevel) return;
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({ id: user.id, activity_level: activityLevel, onboarding_completed: false }).select(),
      `Saving activity level: ${activityLevel}`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, { activity_level: activityLevel }); } catch {}
    
    console.log('🚀 Navigating to body-fat screen...');
    router.replace('/(onboarding)/body-fat');
  };

  const handleBack = () => {
    router.replace('/(onboarding)/exercise-frequency');
  };

  const handleClose = () => {
    router.replace('/(main)/dashboard');
  };

  const options = [
    {
      value: 'sedentary' as ActivityLevel,
      title: 'Sedentary',
      subtitle: 'Mostly sitting, desk job, little daily movement',
      icon: 'desktop-outline' as const,
    },
    {
      value: 'moderately_active' as ActivityLevel,
      title: 'Moderately Active',
      subtitle: 'Some walking, standing, light daily activities',
      icon: 'walk-outline' as const,
    },
    {
      value: 'very_active' as ActivityLevel,
      title: 'Very Active',
      subtitle: 'Lots of walking, physical job, very active lifestyle',
      icon: 'fitness-outline' as const,
    },
  ];

  return (
    <OnboardingLayout
      title="What's your daily activity level?"
      subtitle="How active are you outside of workouts and sports?"
      progress={0.72}
      currentStep={8}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/exercise-frequency"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, activityLevel === option.value && styles.selectedCard]}
              onPress={() => setActivityLevel(option.value)}
            >
              <LinearGradient
                colors={activityLevel === option.value 
                  ? ['rgba(255, 107, 53, 0.3)', 'rgba(255, 142, 83, 0.2)']
                  : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons 
                      name={option.icon} 
                      size={28} 
                      color={activityLevel === option.value ? '#FFFFFF' : colors.textSecondary} 
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[styles.cardTitle, activityLevel === option.value && styles.selectedText]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.cardSubtitle, activityLevel === option.value && styles.selectedSubText]}>
                      {option.subtitle}
                    </Text>
                  </View>
                  <View style={[styles.radioButton, activityLevel === option.value && styles.radioButtonSelected]}>
                    {activityLevel === option.value && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
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
          disabled={!activityLevel}
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
    paddingBottom: 20,
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
    borderRadius: 18,
    minHeight: 100,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginRight: 16,
    width: 32,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  selectedText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 107, 53, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  selectedSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
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

export default ActivityLevelScreen;