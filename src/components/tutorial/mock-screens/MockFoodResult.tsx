import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

// Direct require for food image
const foodImage = require('../../../../assets/images/grilled-chicken-salad.jpeg');

export const MockFoodResult = () => {
  const insets = useSafeAreaInsets();

  // Mock data
  const foodName = 'Grilled Chicken Salad';
  const calories = 450;
  const protein = 40;
  const carbs = 12;
  const fat = 20;
  const servings = 1;
  const score = 8;

  const pctProtein = Math.round(((protein * 4) / calories) * 100);
  const pctCarbs = Math.round(((carbs * 4) / calories) * 100);
  const pctFat = Math.round(((fat * 9) / calories) * 100);

  const foodItems = [
    { name: 'Grilled Chicken', calories: 280, protein: 35, carbs: 0, fat: 6 },
    { name: 'Mixed Greens', calories: 20, protein: 1, carbs: 3, fat: 0 },
    { name: 'Olive Oil Dressing', calories: 150, protein: 0, carbs: 2, fat: 14 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analysis Result</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image 
            source={foodImage}
            style={styles.imagePreview}
            resizeMode="cover"
            onError={(error) => {
              console.log('Image load error:', error);
            }}
          />
          <View style={styles.caloriesBadge}>
            <Text style={styles.caloriesBadgeText}>{calories} kcal</Text>
          </View>
        </View>

        {/* Food Name */}
        <Text style={styles.foodName}>{foodName}</Text>
        <Text style={styles.subtitle}>AI-analyzed nutrition</Text>

        {/* Portion Selector */}
        <View style={styles.portionRow}>
          <Text style={styles.portionLabel}>Portion</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={[styles.stepperButton, styles.stepperButtonDisabled]}>
              <Icon name="minus" size={18} color="rgba(235, 235, 245, 0.3)" />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{servings}x</Text>
            <TouchableOpacity style={styles.stepperButton}>
              <Icon name="plus" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Macros Card */}
        <View style={styles.macrosCard}>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={[styles.macroValue, { color: '#3B82F6' }]}>{protein}g</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={[styles.macroValue, { color: '#F59E0B' }]}>{carbs}g</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: '#EC4899' }]} />
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={[styles.macroValue, { color: '#EC4899' }]}>{fat}g</Text>
          </View>
        </View>

        {/* Macro Distribution Bar */}
        <View style={styles.macroBar}>
          <View style={[styles.macroBarFill, { backgroundColor: '#3B82F6', width: `${pctProtein}%` }]} />
          <View style={[styles.macroBarFill, { backgroundColor: '#F59E0B', width: `${pctCarbs}%` }]} />
          <View style={[styles.macroBarFill, { backgroundColor: '#EC4899', width: `${pctFat}%` }]} />
        </View>
        <View style={styles.macroBarLegend}>
          <Text style={styles.legendText}>{pctProtein}% protein</Text>
          <Text style={styles.legendText}>{pctCarbs}% carbs</Text>
          <Text style={styles.legendText}>{pctFat}% fat</Text>
        </View>

        {/* Health Score */}
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Icon name="heart-outline" size={18} color="rgba(235, 235, 245, 0.6)" />
            <Text style={styles.healthLabel}>Health Score</Text>
            <Text style={styles.healthScore}>{score}/10</Text>
          </View>
          <View style={styles.healthBar}>
            <View style={[styles.healthBarFill, { width: `${score * 10}%` }]} />
          </View>
        </View>

        {/* Food Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Items</Text>
          {foodItems.map((item, index) => (
            <View key={index} style={styles.foodItemCard}>
              <Text style={styles.foodItemName}>{item.name}</Text>
              <View style={styles.foodItemMacros}>
                <Text style={styles.foodItemMacro}>{item.calories} cal</Text>
                <Text style={[styles.foodItemMacro, { color: '#3B82F6' }]}>{item.protein}g P</Text>
                <Text style={[styles.foodItemMacro, { color: '#F59E0B' }]}>{item.carbs}g C</Text>
                <Text style={[styles.foodItemMacro, { color: '#EC4899' }]}>{item.fat}g F</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.fixButton}>
            <Text style={styles.fixButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logButton}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.logButtonGradient}
            >
              <Icon name="plus" size={18} color={colors.white} />
              <Text style={styles.logButtonText}>Log Food</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },

  // Image
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  caloriesBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  caloriesBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  usdaBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  usdaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
  },

  // Food Name
  foodName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 24,
  },

  // Portion
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  portionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: 8,
  },

  // Macros Card
  macrosCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 12,
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  macroDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Macro Bar
  macroBar: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  macroBarFill: {
    height: '100%',
  },
  macroBarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(235, 235, 245, 0.6)',
  },

  // Health
  healthCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  healthLabel: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.6)',
  },
  healthScore: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  healthBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },

  // Food Item
  foodItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  foodItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  foodItemMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  foodItemMacro: {
    fontSize: 12,
    color: 'rgba(235, 235, 245, 0.6)',
    fontWeight: '500',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fixButton: {
    flex: 0.35,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  logButton: {
    flex: 0.65,
    borderRadius: 14,
    overflow: 'hidden',
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});

