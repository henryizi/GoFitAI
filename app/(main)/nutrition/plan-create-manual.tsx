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

  // Modern dark theme colors matching the app
  const appColors = {
    background: '#000000',
    surface: 'rgba(255, 255, 255, 0.04)',
    text: '#FFFFFF',
    textSecondary: 'rgba(235, 235, 245, 0.6)',
    primary: '#FF6B35',
    border: 'rgba(255, 255, 255, 0.06)',
    info: '#007AFF',
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: appColors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: appColors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: appColors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: appColors.border,
      borderRadius: 14,
      backgroundColor: appColors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: appColors.text,
    },
    inputUnit: {
      fontSize: 14,
      fontWeight: '500',
      color: appColors.textSecondary,
      marginLeft: 8,
    },
    macroContainer: {
      gap: 16,
    },
    macroInput: {
      marginBottom: 8,
    },
    macroLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: appColors.text,
      marginBottom: 8,
    },
    infoSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(0, 122, 255, 0.1)',
      padding: 16,
      borderRadius: 14,
      marginTop: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(0, 122, 255, 0.2)',
    },
    infoText: {
      fontSize: 14,
      fontWeight: '400',
      color: appColors.textSecondary,
      marginLeft: 12,
      flex: 1,
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 60 + (insets.bottom || 0),
      paddingTop: 16,
      backgroundColor: appColors.background,
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

      // Small delay to ensure database transaction commits
      await new Promise(resolve => setTimeout(resolve, 500));

      Alert.alert(
        'Plan Created',
        'Your manual nutrition plan has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to nutrition index first to trigger refresh, then to plan detail
              router.replace('/(main)/nutrition');
              setTimeout(() => {
                router.push(`/(main)/nutrition/plan?planId=${createdPlan.id}`);
              }, 100);
            },
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
      <StatusBar style="light" />

      {/* Custom Header matching app style */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingTop: insets.top + 8,
        paddingBottom: 16,
        backgroundColor: appColors.background
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: appColors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
            borderWidth: 1,
            borderColor: appColors.border,
          }}
        >
          <Ionicons name="arrow-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={{ 
          fontSize: 20, 
          fontWeight: '700', 
          color: appColors.text,
          flex: 1 
        }}>
          Manual Plan Setup
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <View style={{ 
          height: 4, 
          backgroundColor: appColors.surface, 
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <View style={{ 
            height: '100%', 
            width: '100%', 
            backgroundColor: appColors.primary,
            borderRadius: 2
          }} />
        </View>
      </View>

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
              placeholderTextColor={appColors.textSecondary}
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
                  placeholderTextColor={appColors.textSecondary}
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
                  placeholderTextColor={appColors.textSecondary}
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
                  placeholderTextColor={appColors.textSecondary}
                />
                <Text style={styles.inputUnit}>g</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={appColors.info} />
          <Text style={styles.infoText}>
            These targets will be used to track your daily nutrition and provide personalized recommendations.{"\n\n"}
            💡 <Text style={{fontWeight: '600', color: appColors.text}}>Tip:</Text> Enter your exact daily gram targets based on your specific dietary needs or professional recommendations.
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

