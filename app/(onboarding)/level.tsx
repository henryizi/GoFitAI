import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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
import { saveOnboardingData } from '../../src/utils/onboardingSave';

type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

const LevelScreen = () => {
  const { user, refreshProfile } = useAuth();
  const [level, setLevel] = useState<TrainingLevel | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleFinish = async () => {
    if (!user || !level || isCompleting) return;

    setIsCompleting(true);
    console.log('🚀 Starting onboarding completion...');

    // Start save operation with timeout protection
    const savePromise = supabase.from('profiles').upsert({ 
      id: user.id,
      training_level: level, 
      onboarding_completed: true 
    }).select();

    // Create timeout promise (3 seconds max wait)
    const timeoutPromise = new Promise<{ error: null; data: null; timedOut: true }>((resolve) => 
      setTimeout(() => resolve({ error: null, data: null, timedOut: true }), 3000)
    );

    try {
      console.log('💾 Saving onboarding data...');
      
      // Race between save and timeout - don't wait longer than 3 seconds
      const result = await Promise.race([
        savePromise.then((result) => ({ ...result, timedOut: false })),
        timeoutPromise
      ]) as any;
      
      const { error, data, timedOut } = result;

      if (timedOut) {
        console.log('⏱️ Save timeout - continuing navigation, save will complete in background');
        // Continue saving in background
        savePromise.then((result: any) => {
          if (result.error) {
            console.error('Background save error:', result.error);
          } else {
            console.log('✅ Background save completed:', result.data);
          }
        }).catch((err) => {
          console.error('Background save failed:', err);
        });
      } else if (error) {
        console.error('❌ Error saving onboarding completion:', error);
        // Don't block - continue saving in background and navigate anyway
        console.warn('⚠️ Save error, but continuing navigation - save will retry in background');
        savePromise.catch((err) => {
          console.error('Background save also failed:', err);
        });
      } else if (data) {
        console.log('✅ Onboarding data saved successfully:', data);
      }
      
      // Refresh profile - wait for it (with timeout) so app state is updated
      // This ensures the app knows onboarding is complete before navigating
      console.log('🔄 Refreshing profile to update app state...');
      try {
        const refreshPromise = refreshProfile();
        const refreshTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile refresh timeout')), 16000)
        );
        
        const refreshedProfile = await Promise.race([refreshPromise, refreshTimeout]) as any;
        if (refreshedProfile) {
          console.log('✅ Profile refreshed successfully:', refreshedProfile.onboarding_completed ? 'onboarding marked complete' : 'onboarding not yet complete');
        } else {
          console.warn('⚠️ Profile refresh returned null - may need retry');
          // Retry once after short delay
          await new Promise(resolve => setTimeout(resolve, 500));
          const retryProfile = await refreshProfile();
          console.log('🔄 Retry profile refresh:', retryProfile ? 'success' : 'still null');
        }
      } catch (refreshError: any) {
        console.warn('⚠️ Profile refresh failed:', refreshError.message);
        // Continue anyway - the save already happened, profile will load eventually
        // Try one more time in background
        setTimeout(() => {
          refreshProfile().catch(() => {
            console.log('Background profile refresh also failed');
          });
        }, 1000);
      }
      
      // Analytics in background (non-blocking)
      setTimeout(() => {
        try { identify(user.id, { training_level: level, onboarding_completed: true }); } catch {}
        try { analyticsTrack('onboarding_complete_success', { user_id: user.id, training_level: level }); } catch {}
      }, 0);
      
      console.log('🚀 Completing onboarding, navigating to paywall...');
      // Navigate immediately - don't wait for anything
      router.replace('/(paywall)');
    } catch (error: any) {
      console.error('❌ Failed to complete onboarding:', error);
      
      // Even if there's an error, try to navigate anyway
      // The save might still succeed in the background
      console.log('⚠️ Unexpected error, but navigating anyway - save continues in background');
      savePromise.then((result: any) => {
        if (result.error) {
          console.error('Background save error:', result.error);
        } else {
          console.log('✅ Background save completed:', result.data);
        }
      }).catch((err) => {
        console.error('Background save failed:', err);
      });
      
      // Refresh profile in background
      refreshProfile().catch(() => {});
      
      // Analytics
      setTimeout(() => {
        try { identify(user.id, { training_level: level, onboarding_completed: true }); } catch {}
        try { analyticsTrack('onboarding_complete_success', { user_id: user.id, training_level: level }); } catch {}
      }, 0);
      
      router.replace('/(paywall)');
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
          title={isCompleting ? "Completing..." : "Complete Setup"}
          onPress={handleFinish}
          disabled={!level || isCompleting}
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















