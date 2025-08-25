import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { Appbar } from 'react-native-paper';
import { identify } from '../../src/services/analytics/analytics';
import { Ionicons } from '@expo/vector-icons';

type WeightTrend = 'losing' | 'gaining' | 'stable' | 'unsure';

const WeightTrendScreen = () => {
  const { user } = useAuth();
  const [weightTrend, setWeightTrend] = useState<WeightTrend | null>(null);

  const handleNext = async () => {
    if (user && weightTrend) {
      await supabase.from('profiles').update({ weight_trend: weightTrend }).eq('id', user.id);
      try { identify(user.id, { weight_trend: weightTrend }); } catch {}
      router.push('/(onboarding)/exercise-frequency');
    }
  };

  const options = [
    {
      value: 'losing' as WeightTrend,
      title: 'I have been losing weight',
      icon: 'trending-down',
    },
    {
      value: 'gaining' as WeightTrend,
      title: 'I have been gaining weight',
      icon: 'trending-up',
    },
    {
      value: 'stable' as WeightTrend,
      title: 'I have been weight stable',
      icon: 'remove',
    },
    {
      value: 'unsure' as WeightTrend,
      title: 'Not sure',
      icon: 'help-circle-outline',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.replace('/(onboarding)/weight')} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '33%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={() => router.replace('/(main)/dashboard')} />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Text style={styles.title}>How has your weight trended for the past few weeks?</Text>
        
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, weightTrend === option.value && styles.selectedCard]}
              onPress={() => setWeightTrend(option.value)}
            >
              <Ionicons 
                name={option.icon as any} 
                size={24} 
                color={weightTrend === option.value ? colors.primary : colors.textSecondary} 
                style={styles.optionIcon}
              />
              <View style={styles.optionContent}>
                <Text style={[styles.cardTitle, weightTrend === option.value && styles.selectedText]}>
                  {option.title}
                </Text>
              </View>
              <View style={[styles.radioButton, weightTrend === option.value && styles.radioButtonSelected]}>
                {weightTrend === option.value && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleNext} 
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
          buttonColor={weightTrend ? colors.accent : colors.border}
          labelStyle={{color: 'white'}}
          disabled={!weightTrend}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appbar: {
    backgroundColor: colors.background,
    elevation: 0,
    borderBottomWidth: 0,
  },
  progressBar: {
    flex: 1,
    alignItems: 'center',
  },
  progress: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 20, // Better positioning
    paddingBottom: 140, // Adequate space for footer
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32, // Better spacing
  },
  optionsContainer: {
    width: '100%',
    gap: theme.spacing.lg, // Better spacing between options
    marginTop: 16, // Better spacing from subtitle
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl, // Better padding for aesthetics
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72, // Consistent height for better appearance
  },
  optionIcon: {
    marginRight: theme.spacing.lg,
    width: 24,
    height: 24,
  },
  optionContent: {
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  selectedText: {
    color: colors.text,
  },
  footer: {
    padding: 24,
    backgroundColor: colors.background,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  nextButton: {
    borderRadius: 24,
    width: '100%',
  },
  nextButtonContent: {
    height: 56,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
});

export default WeightTrendScreen; 