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

type ActivityLevel = 'sedentary' | 'moderate' | 'very-active';

const ActivityLevelScreen = () => {
  const { user } = useAuth();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  const handleNext = async () => {
    if (user && activityLevel) {
      await supabase.from('profiles').update({ activity_level: activityLevel }).eq('id', user.id);
      try { identify(user.id, { activity_level: activityLevel }); } catch {}
      router.push('/(onboarding)/body-fat');
    }
  };

  const options = [
    {
      value: 'sedentary' as ActivityLevel,
      title: 'Sedentary',
      subtitle: 'Little to no exercise, desk job',
      icon: 'desktop-outline' as const,
    },
    {
      value: 'moderate' as ActivityLevel,
      title: 'Moderately Active',
      subtitle: 'Light exercise 1-3 days/week',
      icon: 'walk-outline' as const,
    },
    {
      value: 'very-active' as ActivityLevel,
      title: 'Very Active',
      subtitle: 'Hard exercise 6-7 days/week',
      icon: 'fitness-outline' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.replace('/(onboarding)/exercise-frequency')} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '56%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={() => router.replace('/(main)/dashboard')} />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Text style={styles.title}>What's your activity level?</Text>
        <Text style={styles.subtitle}>This helps us calculate your daily calorie needs</Text>
        
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, activityLevel === option.value && styles.selectedCard]}
              onPress={() => setActivityLevel(option.value)}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={activityLevel === option.value ? colors.primary : colors.textSecondary} 
                  />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardTitle, activityLevel === option.value && styles.selectedText]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.cardSubtitle, activityLevel === option.value && styles.selectedText]}>
                    {option.subtitle}
                  </Text>
                </View>
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
          buttonColor={activityLevel ? colors.accent : colors.border}
          labelStyle={{color: 'white'}}
          disabled={!activityLevel}
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
    marginTop: 8,
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
    marginBottom: 32,
  },
  optionsContainer: {
    width: '100%',
    gap: theme.spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: theme.spacing.lg,
  },
  cardTextContainer: {
    flex: 1,
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedText: {
    color: colors.text,
  },
  footer: {
    padding: 24,
  },
  nextButton: {
    borderRadius: 24,
    width: '100%',
  },
  nextButtonContent: {
    height: 56,
  },
});

export default ActivityLevelScreen; 