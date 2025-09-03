import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';


const { width } = Dimensions.get('window');

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  border: 'rgba(84, 84, 88, 0.4)',
  card: 'rgba(28, 28, 30, 0.9)',
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

  // Extract nutrition data from the correct API response structure
  // Handle both wrapped (data.nutrition) and direct (nutrition) response formats
  const nutritionData = parsed?.data?.nutrition || parsed?.data?.totalNutrition || parsed?.totalNutrition || parsed?.nutrition || parsed || {};
  const foodItems = parsed?.data?.foodItems || parsed?.foodItems || [];
  
  // Use AI-generated meal name from backend or fall back to first food item
  const mealName = parsed?.data?.foodName || parsed?.foodName || parsed?.data?.dishName || parsed?.dishName || parsed?.data?.food_name || parsed?.food_name || parsed?.mealName || parsed?.meal_name;
  const foodName = mealName || foodItems?.[0]?.name || 'Detected Food';
  
  // Create display name for verified foods in bubble
  const verifiedItems = foodItems?.filter((item: any) => item.usdaVerified) || [];
  const bubbleDisplayName = verifiedItems.length > 0 
    ? verifiedItems.map((item: any) => item.name).join(' + ')
    : foodName;
  
  // Check if any food items are USDA verified
  const hasUSDAData = foodItems?.some((item: any) => item.usdaVerified);
  const usdaVerifiedCount = foodItems?.filter((item: any) => item.usdaVerified).length || 0;

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

  // Debug logging to track values (can be removed in production)
  console.log('[FOOD RESULT] Base nutrition - Calories:', totalCalories, 'Protein:', proteinG, 'Carbs:', carbsG, 'Fat:', fatG);
  console.log('[FOOD RESULT] Display with', mult + 'x multiplier - Calories:', dispCalories, 'Protein:', dispProtein, 'Carbs:', dispCarbs, 'Fat:', dispFat);

  const proteinShare = Math.min((proteinG * 4) / safeTotal, 0.4) / 0.4;
  const fatShare = (fatG * 9) / safeTotal;
  const fatPenalty = Math.max(0, fatShare - 0.45) / 0.35;
  const score = Math.max(0, Math.min(10, Math.round((proteinShare * 7 + (1 - fatPenalty) * 3))));
  const scorePct = (score / 10) * 100;

  const handleLog = async () => {
    if (!user || !parsed) return;
    setLoading(true);
    try {
      // IMPORTANT: Log the BASE nutrition values (not multiplied by servings)
      // because the AI already estimated nutrition for the visible food portion.
      // The servings multiplier is only for display/preview purposes.
      const entry = {
        food_name: String(foodName || 'Food'),
        calories: Math.round(totalCalories), // Use base calories, not dispCalories
        protein_grams: Math.round(proteinG), // Use base protein, not dispProtein
        carbs_grams: Math.round(carbsG),     // Use base carbs, not dispCarbs
        fat_grams: Math.round(fatG),         // Use base fat, not dispFat
      };
      
      console.log('[FOOD RESULT] Logging base nutrition values (ignoring portion multiplier):', entry);
      await NutritionService.logFoodEntry(user.id, entry);
      Alert.alert('Food Logged', `${entry.food_name} has been added to today's nutrition progress.`, [{ 
        text: 'OK', 
        onPress: () => {
          // Navigate back to the nutrition tab instead of just going back
          router.replace('/(main)/nutrition');
        } 
      }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to log food.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Analysis</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.heroImageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: '#000' }]} />
        )}
        {bubbleDisplayName && bubbleDisplayName !== 'Detected Food' ? (
          <View style={[styles.bubbleTag, { left: 16, top: 16 }]}>
            <Text style={styles.bubbleText}>{String(bubbleDisplayName)}</Text>
          </View>
        ) : null}
        {hasUSDAData ? (
          <View style={[styles.usdaBadge, { left: 16, top: 60 }]}>
            <Icon name="shield-check" size={14} color="#4CAF50" style={{ marginRight: 4 }} />
            <Text style={styles.usdaBadgeText}>{verifiedItems.length} USDA Verified</Text>
          </View>
        ) : null}
        <View style={[styles.bubbleTag, { right: 16, top: 24 }]}>
          <Text style={styles.bubbleText}>{dispCalories} kcal</Text>
        </View>
      </View>

      <View style={styles.card}>
        <LinearGradient colors={["#1f1f22", "#141416"]} style={styles.cardGradient}>
          <BlurView intensity={20} tint={Platform.OS === 'ios' ? 'dark' : 'default'} style={styles.blurOverlay} />

          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodTitle} numberOfLines={2}>{foodName}</Text>
              <Text style={styles.subtitle}>AI captured nutrition</Text>
            </View>
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieValue}>{dispCalories}</Text>
              <Text style={styles.calorieLabel}>kcal</Text>
            </View>
          </View>

          <View style={styles.servingsRow}>
            <Text style={styles.servingsLabel}>Portion multiplier</Text>
            <View style={styles.stepper}>
              <TouchableOpacity disabled={servings <= 1} onPress={() => setServings(Math.max(1, servings - 1))} style={[styles.stepperBtn, servings <= 1 && { opacity: 0.4 }]}>
                <Icon name="minus" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{servings}</Text>
              <TouchableOpacity onPress={() => setServings(servings + 1)} style={styles.stepperBtn}>
                <Icon name="plus" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.portionHint}>
            {servings === 1 ? 'Nutrition for the food shown in your photo' : `Preview: if you ate ${servings}x this portion`}
          </Text>

          <View style={styles.macrosRow}>
            <View style={[styles.macroChip, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59,130,246,0.35)' }]}>
              <View style={[styles.macroDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{dispProtein} g</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245,158,11,0.35)' }]}>
              <View style={[styles.macroDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{dispCarbs} g</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: 'rgba(236, 72, 153, 0.12)', borderColor: 'rgba(236,72,153,0.35)' }]}>
              <View style={[styles.macroDot, { backgroundColor: '#EC4899' }]} />
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{dispFat} g</Text>
            </View>
          </View>

          <View style={styles.stackBar}>
            <View style={[styles.stackBarFill, { backgroundColor: '#3B82F6', width: `${pctProtein}%` }]} />
            <View style={[styles.stackBarFill, { backgroundColor: '#F59E0B', width: `${pctCarbs}%` }]} />
            <View style={[styles.stackBarFill, { backgroundColor: '#EC4899', width: `${pctFat}%` }]} />
          </View>
          <View style={styles.stackLegend}>
            <Text style={styles.legendText}>{pctProtein}% protein</Text>
            <Text style={styles.legendText}>{pctCarbs}% carbs</Text>
            <Text style={styles.legendText}>{pctFat}% fat</Text>
          </View>

          <View style={styles.healthRow}>
            <View style={styles.healthLabelWrap}>
              <Icon name="heart-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.healthLabel}>Health score</Text>
            </View>
            <Text style={styles.healthScore}>{score}/10</Text>
          </View>
          <View style={styles.healthBar}><View style={[styles.healthFill, { width: `${scorePct}%` }]} /></View>

          {parsed?.notice ? (
            <View style={styles.noticeBox}>
              <Icon name="alert-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.noticeText}>{parsed.notice}</Text>
            </View>
          ) : null}
          
          {hasUSDAData ? (
            <View style={styles.usdaNoticeBox}>
              <Icon name="shield-check" size={18} color="#4CAF50" />
              <Text style={styles.usdaNoticeText}>
                {usdaVerifiedCount} of {foodItems.length} food items verified with USDA FoodData Central.
              </Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.fixBtn} disabled={loading}>
              <Text style={styles.fixBtnText}>Fix Results</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={handleLog}
              disabled={loading}
              style={[styles.logFoodButton, loading && styles.logFoodButtonDisabled]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.logFoodButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <>
                    <Icon name="plus" size={18} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={styles.logFoodButtonText}>LOG FOOD</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  heroImageWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroImage: {
    width: width - 32,
    height: (width - 32) * 0.6,
    borderRadius: 16,
  },
  bubbleTag: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bubbleText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    paddingHorizontal: 16,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  calorieBadge: {
    width: 84,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  calorieValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  calorieLabel: { color: colors.textSecondary, fontSize: 12 },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  servingsLabel: { color: colors.textSecondary, fontSize: 13 },
  portionHint: { 
    color: colors.textSecondary, 
    fontSize: 11, 
    textAlign: 'center', 
    marginTop: 6,
    fontStyle: 'italic',
    opacity: 0.8
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  stepperBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  stepperValue: { color: colors.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 8 },
  macrosRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  macroChip: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    minWidth: (width - 88) / 3 - 6, justifyContent: 'space-between',
  },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  macroLabel: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  macroValue: { color: colors.text, fontSize: 14, fontWeight: '700', marginLeft: 8 },
  stackBar: { height: 12, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row' },
  stackBarFill: { height: '100%' },
  stackLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  legendText: { color: colors.textSecondary, fontSize: 12 },
  healthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  healthLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthLabel: { color: colors.textSecondary, marginLeft: 6, fontSize: 13 },
  healthScore: { color: colors.text, fontSize: 14, fontWeight: '700' },
  healthBar: { marginTop: 6, width: '100%', height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  healthFill: { height: '100%', backgroundColor: '#34D399' },
  noticeBox: {
    marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(28,28,30,0.6)',
    paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  noticeText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  fixBtn: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 16 },
  fixBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  logBtn: { 
    borderRadius: 24, 
    height: 56, 
    overflow: 'hidden', 
    flex: 0.6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logBtnGradient: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logBtnText: { 
    color: colors.text, 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logFoodButton: {
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  logFoodButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  logFoodButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.8,
  },
  logFoodButtonDisabled: {
    opacity: 0.6,
  },
  usdaBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  usdaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    letterSpacing: 0.3,
  },
  usdaNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  usdaNoticeText: {
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
}); 