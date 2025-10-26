import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';

type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

const LevelScreen = () => {
  const { user, refreshProfile } = useAuth();
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
        
        // Refresh profile data to ensure latest onboarding data is available
        try {
          await refreshProfile();
          console.log('Profile refreshed after onboarding completion');
        } catch (refreshError) {
          console.warn('Failed to refresh profile after onboarding:', refreshError);
        }
        
        // 入门完成后显示付费墙
        router.replace('/(paywall)');
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

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'level' }); } catch {}
    router.replace('/(onboarding)/fitness-strategy');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'level' }); } catch {}
    router.replace('/(main)/dashboard');
  };

  return (
    <OnboardingLayout
      title="What's your training level?"
      subtitle="This helps us tailor the intensity of your workouts"
      progress={1.0}
      currentStep={12}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={true}
      onBack={handleBack}
      previousScreen="/(onboarding)/fitness-strategy"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, level === option.value && styles.selectedCard]}
              onPress={() => setLevel(option.value)}
            >
              <LinearGradient
                colors={level === option.value 
                  ? ['rgba(255, 107, 53, 0.3)', 'rgba(255, 142, 83, 0.2)']
                  : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.textContainer}>
                    <Text style={[styles.cardTitle, level === option.value && styles.selectedText]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.cardSubtitle, level === option.value && styles.selectedText]}>
                      {option.subtitle}
                    </Text>
                  </View>
                  <View style={[styles.radioButton, level === option.value && styles.radioButtonSelected]}>
                    {level === option.value && (
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
          title="Complete Setup"
          onPress={handleFinish}
          disabled={!level}
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  selectedCard: {
    borderColor: '#FF6B35',
    elevation: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 20,
    minHeight: 100,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  selectedText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 107, 53, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
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

export default LevelScreen;















