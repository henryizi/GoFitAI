import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { typography } = theme;

// Services
import { NutritionService } from '../../../src/services/nutrition/NutritionService';

// Hooks
import { useAuth } from '../../../src/hooks/useAuth';

export default function ManualPlanCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Form state
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontFamily: fontFamily.secondary,
      color: colors.white,
    },
    inputUnit: {
      fontSize: 14,
      fontFamily: fontFamily.secondary,
      color: colors.textSecondary,
      marginLeft: 8,
    },
    macroContainer: {
      gap: 16,
    },
    macroInput: {
      marginBottom: 8,
    },
    macroLabel: {
      fontSize: 16,
      fontFamily: fontFamily.secondary,
      color: colors.text,
      marginBottom: 8,
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
      paddingBottom: 60 + (insets.bottom || 0), // Account for tab bar height (60) + safe area
      paddingTop: 16,
      backgroundColor: colors.background,
    },
    createButton: {
      width: '100%',
    },
  });

  const handleCreatePlan = async () => {
    // Validate required fields
    if (!calorieTarget) {
      Alert.alert('Missing Information', 'Please enter calorie target');
      return;
    }

    // Check if macros have been entered
    if (!proteinGrams || !carbsGrams || !fatGrams) {
      Alert.alert('Missing Information', 'Please enter your macronutrient targets in grams');
      return;
    }

    if (!user?.id) {
      Alert.alert('Authentication Error', 'Please log in to create a nutrition plan.');
      return;
    }

    setIsLoading(true);

    let manualTargets;

    try {
      // Create manual targets from calculated values
      manualTargets = {
        calories: parseInt(calorieTarget),
        protein: parseInt(proteinGrams),
        carbs: parseInt(carbsGrams),
        fat: parseInt(fatGrams),
      };

      // Create the plan using the NutritionService
      const createdPlan = await NutritionService.createManualNutritionPlan(
        user.id,
        manualTargets,
        {
          goal: 'maintenance', // Default goal for manual plans
          dietaryPreferences: [], // Could be enhanced to include user preferences
          intolerances: [],
        }
      );

      console.log('[NUTRITION] ✅ Manual plan created successfully:', createdPlan.id);

      Alert.alert(
        'Plan Created',
        'Your manual nutrition plan has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/(main)/nutrition/plan?planId=${createdPlan.id}`),
          },
        ]
      );
    } catch (error) {
      console.error('[NUTRITION] Error creating manual plan:', error);
      Alert.alert('Error', 'Failed to create plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Header
        title="Manual Plan Setup"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ProgressBar currentStep={1} totalSteps={1} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Calorie Target</Text>
          <Text style={styles.sectionSubtitle}>
            Set your daily calorie goal for weight management
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={calorieTarget}
              onChangeText={setCalorieTarget}
              placeholder="Enter calorie target"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.inputUnit}>calories</Text>
          </View>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macronutrient Targets</Text>
          <Text style={styles.sectionSubtitle}>
            Enter your daily macronutrient targets in grams
          </Text>

          <View style={styles.macroContainer}>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Protein (g)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={proteinGrams}
                  onChangeText={setProteinGrams}
                  placeholder="150"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputUnit}>g</Text>
              </View>
            </View>

            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Carbs (g)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={carbsGrams}
                  onChangeText={setCarbsGrams}
                  placeholder="200"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputUnit}>g</Text>
              </View>
            </View>

            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Fat (g)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={fatGrams}
                  onChangeText={setFatGrams}
                  placeholder="80"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputUnit}>g</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            These targets will be used to track your daily nutrition and provide personalized recommendations.{"\n\n"}
            💡 <Text style={{fontWeight: '600'}}>Tip:</Text> Enter your exact daily gram targets based on your specific dietary needs or professional recommendations.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={handleCreatePlan}
          disabled={isLoading}
          style={styles.createButton}
        >
          {isLoading ? 'Creating...' : 'Create Plan'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

