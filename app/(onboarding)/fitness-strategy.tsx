import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { colors } from '../../src/styles/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { identify, track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';

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
  const { user } = useAuth();
  const [selectedStrategy, setSelectedStrategy] = useState<FitnessStrategy | null>(null);

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
    if (!user || !selectedStrategy) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          fitness_strategy: selectedStrategy
          // Note: Not clearing goal_fat_reduction/goal_muscle_gain as they may not exist in schema
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating fitness strategy:', error);
        try { 
          analyticsTrack('onboarding_fitness_strategy_failure', { 
            user_id: user.id, 
            strategy: selectedStrategy,
            error: String(error?.message || error) 
          }); 
        } catch {}
      } else {
        try { 
          identify(user.id, { fitness_strategy: selectedStrategy }); 
          analyticsTrack('onboarding_fitness_strategy_success', { 
            user_id: user.id, 
            strategy: selectedStrategy 
          }); 
          analyticsTrack('onboarding_step_next', { step: 'fitness-strategy' });
        } catch {}
        router.push('/(onboarding)/level');
      }
    } catch (error) {
      console.error('Error saving fitness strategy:', error);
      try { 
        analyticsTrack('onboarding_fitness_strategy_failure', { 
          user_id: user?.id, 
          strategy: selectedStrategy,
          error: String((error as any)?.message || error) 
        }); 
      } catch {}
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
      progress={0.91}
      currentStep={11}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/primary-goal"
      onClose={handleClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
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

      <View style={styles.footer}>
        <OnboardingButton
          title="Continue"
          onPress={handleNext}
          disabled={!selectedStrategy}
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
    padding: 24,
  },
});

export default FitnessStrategyScreen;
