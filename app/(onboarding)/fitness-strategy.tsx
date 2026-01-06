import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { colors } from '../../src/styles/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { identify, track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

type FitnessStrategy = 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining';

interface StrategyOption {
  value: FitnessStrategy;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  calorieAdjustment: string;
  macroFocus: string;
}

const FitnessStrategyScreen = () => {
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedStrategy, setSelectedStrategy] = useState<FitnessStrategy | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const strategies: StrategyOption[] = [
    {
      value: 'bulk',
      title: 'Bulk',
      subtitle: 'Build muscle mass',
      description: 'Focus on maximizing muscle growth with a significant calorie surplus. Best for underweight individuals or those wanting to gain size quickly.',
      icon: 'arm-flex',
      color: colors.primary,
      calorieAdjustment: '+300-500 calories',
      macroFocus: 'High protein, moderate carbs'
    },
    {
      value: 'cut',
      title: 'Cut',
      subtitle: 'Lose body fat',
      description: 'Prioritize fat loss while preserving muscle mass through a calorie deficit. Ideal for those with higher body fat wanting to get lean.',
      icon: 'fire',
      color: colors.accent,
      calorieAdjustment: '-300-500 calories',
      macroFocus: 'Very high protein, moderate fat'
    },
    {
      value: 'maintenance',
      title: 'Maintenance',
      subtitle: 'Maintain current physique',
      description: 'Eat at maintenance calories to stay at your current weight and body composition. Great for those happy with their physique.',
      icon: 'scale-balance',
      color: colors.secondary,
      calorieAdjustment: 'TDEE calories',
      macroFocus: 'Balanced macronutrients'
    },
    {
      value: 'recomp',
      title: 'Body Recomposition',
      subtitle: 'Build muscle & lose fat',
      description: 'Simultaneously build muscle and lose fat through precise nutrition and training. Works best for beginners or those returning to fitness.',
      icon: 'autorenew',
      color: '#8B5CF6',
      calorieAdjustment: 'Around TDEE',
      macroFocus: 'High protein, cycling carbs'
    },
    {
      value: 'maingaining',
      title: 'Maingaining',
      subtitle: 'Slow, lean gains',
      description: 'Gradual muscle growth with minimal fat gain through a small surplus. Perfect for long-term, sustainable physique improvement.',
      icon: 'trending-up',
      color: '#10B981',
      calorieAdjustment: '+100-200 calories',
      macroFocus: 'High protein, adequate carbs'
    }
  ];

  const handleNext = async () => {
    if (!user || !selectedStrategy || isCompleting) return;

    setIsCompleting(true);
    console.log('🚀 Starting onboarding completion...');

    // Start save operation with timeout protection
    const savePromise = supabase.from('profiles').upsert({ 
      id: user.id,
      fitness_strategy: selectedStrategy,
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
          await new Promise(resolve => setTimeout(resolve, 500));
          const retryProfile = await refreshProfile();
          console.log('🔄 Retry profile refresh:', retryProfile ? 'success' : 'still null');
        }
      } catch (refreshError: any) {
        console.warn('⚠️ Profile refresh failed:', refreshError.message);
        setTimeout(() => {
          refreshProfile().catch(() => {
            console.log('Background profile refresh also failed');
          });
        }, 1000);
      }
      
      // Analytics in background (non-blocking)
      setTimeout(() => {
        try { identify(user.id, { fitness_strategy: selectedStrategy, onboarding_completed: true }); } catch {}
        try { analyticsTrack('onboarding_complete_success', { user_id: user.id, fitness_strategy: selectedStrategy }); } catch {}
      }, 0);
      
      console.log('🚀 Completing onboarding, navigating to analysis screen...');
      router.replace('/(onboarding)/analyzing');
    } catch (error: any) {
      console.error('❌ Failed to complete onboarding:', error);
      
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
      
      refreshProfile().catch(() => {});
      
      setTimeout(() => {
        try { identify(user.id, { fitness_strategy: selectedStrategy, onboarding_completed: true }); } catch {}
        try { analyticsTrack('onboarding_complete_success', { user_id: user.id, fitness_strategy: selectedStrategy }); } catch {}
      }, 0);
      
      router.replace('/(onboarding)/analyzing');
    }
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'fitness-strategy' }); } catch {}
    router.replace('/(onboarding)/primary-goal');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'fitness-strategy' }); } catch {}
    router.replace('/(main)/dashboard');
  };

  return (
    <OnboardingLayout
      title="What's Your Fitness Strategy?"
      subtitle="Choose your approach to reach your physique goals. This will determine your calorie targets and macronutrient ratios."
      progress={1.0}
      currentStep={12}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/primary-goal"
      onClose={handleClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.questionLabel}>
            <Text style={styles.questionLabelText}>Question 12</Text>
          </View>
          <View style={styles.strategiesContainer}>
            {strategies.map((strategy) => (
              <TouchableOpacity
                key={strategy.value}
                style={[
                  styles.strategyCard,
                  selectedStrategy === strategy.value && { 
                    borderColor: strategy.color,
                    backgroundColor: `${strategy.color}10`
                  }
                ]}
                onPress={() => setSelectedStrategy(strategy.value)}
              >
                <View style={styles.strategyHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: strategy.color }]}>
                    <MaterialCommunityIcons 
                      name={strategy.icon} 
                      size={24} 
                      color="white" 
                    />
                  </View>
                  <View style={styles.strategyTitleContainer}>
                    <Text style={styles.strategyTitle}>{strategy.title}</Text>
                    <Text style={styles.strategySubtitle}>{strategy.subtitle}</Text>
                  </View>
                  {selectedStrategy === strategy.value && (
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={24} 
                      color={strategy.color} 
                    />
                  )}
                </View>
                
                <Text style={styles.strategyDescription}>
                  {strategy.description}
                </Text>
                
                <View style={styles.strategyDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="calculator" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{strategy.calorieAdjustment}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="nutrition" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{strategy.macroFocus}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(34, insets.bottom + 16) }]}>
        <OnboardingButton
          title={isCompleting ? "Completing..." : "Complete Setup"}
          onPress={handleNext}
          disabled={!selectedStrategy || isCompleting}
        />
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  questionLabel: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  questionLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  strategiesContainer: {
    gap: 16,
  },
  strategyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  strategyTitleContainer: {
    flex: 1,
  },
  strategyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  strategySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  strategyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  strategyDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});

export default FitnessStrategyScreen;
