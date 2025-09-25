import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Components
import { Button } from '../../../src/components/ui/Button';
import ProgressBar from '../../../src/components/ui/ProgressBar';
import { Header } from '../../../src/components/ui/Header';

// Utils
import { theme } from '../../../src/styles/theme';
import { fontFamily } from '../../../src/styles/fonts';
import { colors } from '../../../src/styles/colors';
const { typography } = theme;

// Services
import { NutritionService } from '../../../src/services/nutrition/NutritionService';

// Hooks
import { useAuth } from '../../../src/hooks/useAuth';

export default function MathematicalPlanCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Form state
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState('1.2');
  const [goal, setGoal] = useState('maintain');
  const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Activity level options
  const activityLevels = [
    { value: '1.2', label: 'Sedentary (little/no exercise)' },
    { value: '1.375', label: 'Lightly active (1-3 days/week)' },
    { value: '1.55', label: 'Moderately active (3-5 days/week)' },
    { value: '1.725', label: 'Very active (6-7 days/week)' },
    { value: '1.9', label: 'Extremely active (2x/day)' },
  ];

  // Goal options
  const goals = [
    { value: 'lose', label: 'Lose weight', multiplier: 0.8 },
    { value: 'maintain', label: 'Maintain weight', multiplier: 1.0 },
    { value: 'gain', label: 'Gain weight', multiplier: 1.2 },
  ];

  const calculateCalories = () => {
    if (!age || !weight || !height) {
      Alert.alert('Missing Information', 'Please fill in age, weight, and height');
      return;
    }

    setIsCalculating(true);

    // Simulate calculation delay
    setTimeout(() => {
      const ageNum = parseInt(age);
      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);

      // Harris-Benedict equation for BMR
      let bmr: number;
      if (gender === 'male') {
        bmr = 88.362 + (13.397 * weightNum) + (4.799 * heightNum) - (5.677 * ageNum);
      } else {
        bmr = 447.593 + (9.247 * weightNum) + (3.098 * heightNum) - (4.330 * ageNum);
      }

      // Apply activity level
      const tdee = bmr * parseFloat(activityLevel);

      // Apply goal multiplier
      const targetCalories = Math.round(tdee * (goal === 'lose' ? 0.8 : goal === 'gain' ? 1.2 : 1.0));

      setCalculatedCalories(targetCalories);
      setIsCalculating(false);
    }, 1500);
  };

  const handleCreatePlan = async () => {
    if (!calculatedCalories) {
      Alert.alert('Missing Calculation', 'Please calculate your nutrition targets first');
      return;
    }

    if (!user?.id) {
      Alert.alert('Authentication Error', 'Please log in to create a nutrition plan.');
      return;
    }

    setIsLoading(true);

    try {
      // Calculate macros based on calculated calories
      const calories = calculatedCalories;
      const proteinCalories = calories * 0.3; // 30% protein
      const carbsCalories = calories * 0.4;   // 40% carbs
      const fatCalories = calories * 0.3;     // 30% fat

      const protein = Math.round(proteinCalories / 4);
      const carbs = Math.round(carbsCalories / 4);
      const fat = Math.round(fatCalories / 9);

      // Create and save the plan
      const newPlan = await NutritionService.createNutritionPlan(
        user.id,
        {
          calories: calories,
          protein: protein,
          carbs: carbs,
          fat: fat,
        },
        {
          goal: 'maintenance', // Default goal for mathematical plans
          dietaryPreferences: [],
          intolerances: [],
        }
      );

      console.log('[NUTRITION] ✅ Mathematical plan created successfully:', newPlan.id);

      Alert.alert(
        'Plan Created',
        `Your mathematical nutrition plan has been created!\n\nDaily Target: ${calories} calories\nProtein: ${protein}g | Carbs: ${carbs}g | Fat: ${fat}g`,
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/(main)/nutrition/plan?planId=${newPlan.id}`),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Header
        title="Mathematical Plan Setup"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ProgressBar currentStep={1} totalSteps={1} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionSubtitle}>
            Enter your details for accurate calculations
          </Text>

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Age"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="Weight (kg)"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="Height (cm)"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.genderContainer}>
            <Text style={styles.label}>Gender:</Text>
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'male' && styles.genderOptionActive,
                ]}
                onPress={() => setGender('male')}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    gender === 'male' && styles.genderOptionTextActive,
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === 'female' && styles.genderOptionActive,
                ]}
                onPress={() => setGender('female')}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    gender === 'female' && styles.genderOptionTextActive,
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Level</Text>
          <Text style={styles.sectionSubtitle}>
            How active are you on a typical day?
          </Text>

          {activityLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.optionButton,
                activityLevel === level.value && styles.optionButtonActive,
              ]}
              onPress={() => setActivityLevel(level.value)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  activityLevel === level.value && styles.optionButtonTextActive,
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goal</Text>
          <Text style={styles.sectionSubtitle}>
            What is your primary nutrition goal?
          </Text>

          {goals.map((goalOption) => (
            <TouchableOpacity
              key={goalOption.value}
              style={[
                styles.optionButton,
                goal === goalOption.value && styles.optionButtonActive,
              ]}
              onPress={() => setGoal(goalOption.value)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  goal === goalOption.value && styles.optionButtonTextActive,
                ]}
              >
                {goalOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {calculatedCalories && (
          <View style={styles.resultSection}>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Calculated Daily Target</Text>
              <Text style={styles.resultCalories}>{calculatedCalories}</Text>
              <Text style={styles.resultSubtitle}>calories per day</Text>

              <View style={styles.macroBreakdown}>
                <Text style={styles.macroTitle}>Recommended Macros:</Text>
                <Text style={styles.macroDetails}>
                  Protein: {Math.round(calculatedCalories * 0.3 / 4)}g ({Math.round(calculatedCalories * 0.3)} cal)
                </Text>
                <Text style={styles.macroDetails}>
                  Carbs: {Math.round(calculatedCalories * 0.4 / 4)}g ({Math.round(calculatedCalories * 0.4)} cal)
                </Text>
                <Text style={styles.macroDetails}>
                  Fat: {Math.round(calculatedCalories * 0.3 / 9)}g ({Math.round(calculatedCalories * 0.3)} cal)
                </Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculateCalories}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="calculator" size={16} color={colors.white} />
                <Text style={styles.calculateButtonText}>Calculate</Text>
              </>
            )}
          </TouchableOpacity>

          <Button
            onPress={handleCreatePlan}
            disabled={isLoading}
            style={styles.createButton}
          >
            {isLoading ? 'Creating...' : 'Create Plan'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamily.secondary,
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.secondary,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    fontFamily: fontFamily.secondary,
    color: colors.text,
  },
  genderContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: fontFamily.secondary,
    color: colors.text,
    marginBottom: 8,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  genderOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderOptionText: {
    fontSize: 14,
    fontFamily: fontFamily.secondary,
    color: colors.text,
  },
  genderOptionTextActive: {
    color: colors.white,
  },
  optionButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  optionButtonActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.secondary,
    color: colors.text,
  },
  optionButtonTextActive: {
    color: colors.primary,
    fontFamily: fontFamily.secondary,
  },
  resultSection: {
    marginTop: 24,
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: fontFamily.secondary,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  resultCalories: {
    fontSize: 48,
    fontFamily: fontFamily.secondary,
    color: colors.primary,
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 16,
    fontFamily: fontFamily.secondary,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  macroBreakdown: {
    alignSelf: 'stretch',
  },
  macroTitle: {
    fontSize: 16,
    fontFamily: fontFamily.secondary,
    color: colors.text,
    marginBottom: 8,
  },
  macroDetails: {
    fontSize: 14,
    fontFamily: fontFamily.secondary,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fontFamily.secondary,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  calculateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  calculateButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.secondary,
    color: colors.white,
    marginLeft: 8,
  },
  createButton: {
    flex: 2,
  },
});
