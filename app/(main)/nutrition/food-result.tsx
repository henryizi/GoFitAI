/**
 * FOOD RESULT PAGE
 * Display AI food analysis results
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Alert,
  Text,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';

const { width: screenWidth } = Dimensions.get('window');

// Clean color palette
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#EF4444',
  white: '#FFFFFF',
  protein: '#3B82F6',
  carbs: '#F59E0B',
  fat: '#EC4899',
};

export default function FoodResultScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ data?: string; image?: string }>();

  const parsed = useMemo(() => {
    try { return params?.data ? JSON.parse(String(params.data)) : null; } catch { return null; }
  }, [params?.data]);
  const imageUri = params?.image ? String(params.image) : undefined;

  const [servings, setServings] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (imageUri) {
      Image.getSize(imageUri, (w, h) => {
        if (w && h) setAspectRatio(w / h);
      }, () => {});
    }
  }, [imageUri]);

  // Extract nutrition data
  const nutritionData = parsed?.data?.nutrition || parsed?.data?.totalNutrition || parsed?.totalNutrition || parsed?.nutrition || parsed || {};
  const foodItems = parsed?.data?.foodItems || parsed?.foodItems || [];
  
  const mealName = parsed?.data?.foodName || parsed?.foodName || 
                   parsed?.data?.dishName || parsed?.dishName || 
                   parsed?.data?.food_name || parsed?.food_name || 
                   parsed?.mealName || parsed?.meal_name ||
                   nutritionData?.food_name;

  const generateMealNameFromItems = (items: any[]) => {
    if (!items || items.length === 0) return 'Detected Food';
    if (items.length === 1) return items[0].name || 'Detected Food';
    if (items.length === 2) return `${items[0].name} with ${items[1].name}`;
    return items.map(i => i.name).slice(0, 3).join(', ');
  };

  const isGenericName = !mealName || mealName === 'Food Item' || mealName === 'Unknown Food';
  const foodName = (isGenericName && foodItems?.length > 0)
    ? generateMealNameFromItems(foodItems) 
    : (mealName || 'Detected Food');

  const hasUSDAData = foodItems?.some((item: any) => item.usdaVerified);

  const proteinG = Number(nutritionData?.protein || 0);
  const carbsG = Number(nutritionData?.carbs || nutritionData?.carbohydrates || 0);
  const fatG = Number(nutritionData?.fat || 0);
  const calsFromMacros = proteinG * 4 + carbsG * 4 + fatG * 9;
  const totalCalories = Number(nutritionData?.calories || calsFromMacros || 0);
  const safeTotal = Math.max(totalCalories, 1);
  
  const pctProtein = Math.min(100, Math.round(((proteinG * 4) / safeTotal) * 100));
  const pctCarbs = Math.min(100, Math.round(((carbsG * 4) / safeTotal) * 100));
  const pctFat = Math.min(100, Math.round(((fatG * 9) / safeTotal) * 100));

  const mult = Math.max(servings, 1);
  const dispCalories = Math.round(totalCalories * mult);
  const dispProtein = Math.round(proteinG * mult);
  const dispCarbs = Math.round(carbsG * mult);
  const dispFat = Math.round(fatG * mult);

  // Health score
  const proteinShare = Math.min((proteinG * 4) / safeTotal, 0.4) / 0.4;
  const fatShare = (fatG * 9) / safeTotal;
  const fatPenalty = Math.max(0, fatShare - 0.45) / 0.35;
  const score = Math.max(0, Math.min(10, Math.round((proteinShare * 7 + (1 - fatPenalty) * 3))));

  const handleLog = async () => {
    if (!user || !parsed) return;
    setLoading(true);
    try {
      const entry = {
        food_name: String(foodName || 'Food'),
        calories: Math.round(totalCalories),
        protein_grams: Math.round(proteinG),
        carbs_grams: Math.round(carbsG),
        fat_grams: Math.round(fatG),
      };
      
      await NutritionService.logFoodEntry(user.id, entry);
      Alert.alert('Food Logged', `${entry.food_name} has been added.`, [{ 
        text: 'OK', 
        onPress: () => router.replace('/(main)/nutrition')
      }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to log food.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analysis Result</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Image Preview */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={[styles.imagePreview, { aspectRatio }]} />
            <View style={styles.caloriesBadge}>
              <Text style={styles.caloriesBadgeText}>{dispCalories} kcal</Text>
            </View>
            {hasUSDAData && (
              <View style={styles.usdaBadge}>
                <Icon name="shield-check" size={12} color={colors.success} />
                <Text style={styles.usdaBadgeText}>USDA Verified</Text>
              </View>
            )}
          </View>
        )}

        {/* Food Name */}
        <Text style={styles.foodName}>{foodName}</Text>
        <Text style={styles.subtitle}>AI-analyzed nutrition</Text>

        {/* Portion Selector */}
        <View style={styles.portionRow}>
          <Text style={styles.portionLabel}>Portion</Text>
          <View style={styles.stepper}>
            <TouchableOpacity 
              disabled={servings <= 1} 
              onPress={() => setServings(Math.max(1, servings - 1))} 
              style={[styles.stepperButton, servings <= 1 && styles.stepperButtonDisabled]}
            >
              <Icon name="minus" size={18} color={servings <= 1 ? colors.textTertiary : colors.white} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{servings}x</Text>
            <TouchableOpacity 
              onPress={() => setServings(servings + 1)} 
              style={styles.stepperButton}
            >
              <Icon name="plus" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Macros Card */}
        <View style={styles.macrosCard}>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: colors.protein }]} />
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={[styles.macroValue, { color: colors.protein }]}>{dispProtein}g</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: colors.carbs }]} />
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={[styles.macroValue, { color: colors.carbs }]}>{dispCarbs}g</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: colors.fat }]} />
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={[styles.macroValue, { color: colors.fat }]}>{dispFat}g</Text>
          </View>
        </View>

        {/* Macro Distribution Bar */}
        <View style={styles.macroBar}>
          <View style={[styles.macroBarFill, { backgroundColor: colors.protein, width: `${pctProtein}%` }]} />
          <View style={[styles.macroBarFill, { backgroundColor: colors.carbs, width: `${pctCarbs}%` }]} />
          <View style={[styles.macroBarFill, { backgroundColor: colors.fat, width: `${pctFat}%` }]} />
        </View>
        <View style={styles.macroBarLegend}>
          <Text style={styles.legendText}>{pctProtein}% protein</Text>
          <Text style={styles.legendText}>{pctCarbs}% carbs</Text>
          <Text style={styles.legendText}>{pctFat}% fat</Text>
        </View>

        {/* Health Score */}
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Icon name="heart-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.healthLabel}>Health Score</Text>
            <Text style={styles.healthScore}>{score}/10</Text>
          </View>
          <View style={styles.healthBar}>
            <View style={[styles.healthBarFill, { width: `${score * 10}%` }]} />
          </View>
        </View>

        {/* Food Items (if available) */}
        {foodItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Items</Text>
            {foodItems.map((item: any, index: number) => (
              <View key={index} style={styles.foodItemCard}>
                <Text style={styles.foodItemName}>{item.name}</Text>
                <View style={styles.foodItemMacros}>
                  <Text style={styles.foodItemMacro}>{item.calories || 0} cal</Text>
                  <Text style={[styles.foodItemMacro, { color: colors.protein }]}>{item.protein || 0}g P</Text>
                  <Text style={[styles.foodItemMacro, { color: colors.carbs }]}>{item.carbs || 0}g C</Text>
                  <Text style={[styles.foodItemMacro, { color: colors.fat }]}>{item.fat || 0}g F</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.fixButton}>
            <Text style={styles.fixButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleLog}
            disabled={loading}
            style={styles.logButton}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.logButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Icon name="plus" size={18} color={colors.white} />
                  <Text style={styles.logButtonText}>Log Food</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

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
    color: colors.success,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.success,
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
    color: colors.textSecondary,
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
