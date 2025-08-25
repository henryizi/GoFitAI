import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';

const { width } = Dimensions.get('window');

interface NutritionPlanCreatorProps {
  onSubmit: (planData: any) => void;
  isLoading?: boolean;
}

export const NutritionPlanCreator: React.FC<NutritionPlanCreatorProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [mealsPerDay, setMealsPerDay] = useState<number>(3);
  const [snacksPerDay, setSnacksPerDay] = useState<number>(2);

  const preferences = [
    { id: 'vegan', title: 'Vegan', icon: 'leaf' },
    { id: 'vegetarian', title: 'Vegetarian', icon: 'food-apple-outline' },
    { id: 'keto', title: 'Keto', icon: 'oil' },
    { id: 'paleo', title: 'Paleo', icon: 'food-steak' },
  ];

  const intolerances = [
    { id: 'gluten', title: 'Gluten', icon: 'bread-slice' },
    { id: 'dairy', title: 'Dairy', icon: 'cow' },
    { id: 'nuts', title: 'Nuts', icon: 'food-nut' },
    { id: 'soy', title: 'Soy', icon: 'food-variant' },
  ];

  const handlePreferenceToggle = (prefId: string) => {
    setSelectedPreferences(prev => 
      prev.includes(prefId) 
        ? prev.filter(id => id !== prefId)
        : [...prev, prefId]
    );
  };

  const handleIntoleranceToggle = (intolId: string) => {
    setSelectedIntolerances(prev => 
      prev.includes(intolId) 
        ? prev.filter(id => id !== intolId)
        : [...prev, intolId]
    );
  };

  const handleSubmit = () => {
    onSubmit({
      preferences: selectedPreferences,
      intolerances: selectedIntolerances,
      mealsPerDay,
      snacksPerDay,
    });
  };

  const isSubmitDisabled = isLoading;

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Icon name="food-apple-outline" size={32} color={colors.text} />
            <Text style={styles.headerTitle}>Create Your Nutrition Plan</Text>
            <Text style={styles.headerSubtitle}>
              Personalized meal recommendations based on your preferences and goals
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Dietary Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>01. DIETARY PREFERENCES</Text>
        <Text style={styles.sectionDescription}>
          Select any dietary preferences that apply to you
        </Text>
        
        <View style={styles.preferencesContainer}>
          {preferences.map((pref) => (
            <TouchableOpacity
              key={pref.id}
              style={[
                styles.preferenceChip,
                selectedPreferences.includes(pref.id) && styles.selectedPreferenceChip
              ]}
              onPress={() => handlePreferenceToggle(pref.id)}
              activeOpacity={0.7}
            >
              <Icon 
                name={pref.icon} 
                size={16} 
                color={selectedPreferences.includes(pref.id) ? colors.text : colors.primary} 
              />
              <Text style={[
                styles.preferenceText,
                selectedPreferences.includes(pref.id) && styles.selectedPreferenceText
              ]}>
                {pref.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Food Intolerances */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>02. FOOD INTOLERANCES</Text>
        <Text style={styles.sectionDescription}>
          Select any foods you need to avoid
        </Text>
        
        <View style={styles.preferencesContainer}>
          {intolerances.map((intol) => (
            <TouchableOpacity
              key={intol.id}
              style={[
                styles.preferenceChip,
                selectedIntolerances.includes(intol.id) && styles.selectedIntoleranceChip
              ]}
              onPress={() => handleIntoleranceToggle(intol.id)}
              activeOpacity={0.7}
            >
              <Icon 
                name={intol.icon} 
                size={16} 
                color={selectedIntolerances.includes(intol.id) ? colors.text : colors.warning} 
              />
              <Text style={[
                styles.preferenceText,
                selectedIntolerances.includes(intol.id) && styles.selectedIntoleranceText
              ]}>
                {intol.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Meal Frequency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>03. MEAL FREQUENCY</Text>
        <Text style={styles.sectionDescription}>
          How many meals and snacks do you prefer per day?
        </Text>
        
        <View style={styles.frequencyContainer}>
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyLabel}>Meals per day</Text>
            <View style={styles.frequencyButtons}>
              {[2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.frequencyButton,
                    mealsPerDay === num && styles.selectedFrequencyButton
                  ]}
                  onPress={() => setMealsPerDay(num)}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    mealsPerDay === num && styles.selectedFrequencyButtonText
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyLabel}>Snacks per day</Text>
            <View style={styles.frequencyButtons}>
              {[0, 1, 2, 3].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.frequencyButton,
                    snacksPerDay === num && styles.selectedFrequencyButton
                  ]}
                  onPress={() => setSnacksPerDay(num)}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    snacksPerDay === num && styles.selectedFrequencyButtonText
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Submit Button */}
      <View style={[styles.submitContainer, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          loading={isLoading}
          style={[
            styles.submitButton,
            isSubmitDisabled && styles.disabledSubmitButton
          ]}
          labelStyle={styles.submitButtonText}
        >
          {isLoading ? 'Creating Plan...' : 'Create My Nutrition Plan'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 24,
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
    lineHeight: 20,
  },
  preferencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  preferenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectedPreferenceChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectedIntoleranceChip: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  preferenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 8,
  },
  selectedPreferenceText: {
    color: colors.text,
  },
  selectedIntoleranceText: {
    color: colors.text,
  },
  frequencyContainer: {
    gap: 20,
  },
  frequencyItem: {
    gap: 12,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectedFrequencyButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  selectedFrequencyButtonText: {
    color: colors.text,
  },
  submitContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledSubmitButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
}); 