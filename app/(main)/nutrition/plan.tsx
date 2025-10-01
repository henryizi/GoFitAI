import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ImageBackground,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Divider,
  List,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  NutritionPlan,
  NutritionService,
} from '../../../src/services/nutrition/NutritionService';
import { SAFE_AREA_PADDING_BOTTOM } from '../_layout';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../../src/hooks/useAuth';
import { useSubscription } from '../../../src/hooks/useSubscription';
import PaywallPreview from '../../../src/components/nutrition/PaywallPreview';
import DailyMenuCard from '../../../src/components/nutrition/DailyMenuCard';
import { mockPlansStore, mockNutritionPlan } from '../../../src/mock-data';

const { width, height } = Dimensions.get('window');

// Enhanced color palette
const colors = {
  primary: '#FF6B35',
  primaryLight: '#FF8A65',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  background: '#121212',
  surface: '#1E1E1E',
  white: '#FFFFFF',
  gray: '#8E8E93',
  lightGray: '#F2F2F7',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  dark: '#000000',
};

const NutritionPlanScreen = () => {
  const theme = useTheme();
  const { user, profile } = useAuth();
  const { isPremium, openPaywall } = useSubscription();
  const { top, bottom } = useSafeAreaInsets();
  const { planId } = useLocalSearchParams();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dailyMenu, setDailyMenu] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [latestTarget, setLatestTarget] = useState<any>(null);

  // Animation values (persist across renders)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Define all useMemo hooks at the top level
  const chartData = useMemo(() => {
    if (!targets || targets.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [], color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`, strokeWidth: 3 }]
      };
    }
    
    return {
      labels: targets.slice(0, 6).reverse().map((t) =>
        new Date(t.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      ),
      datasets: [
        {
          data: targets.slice(0, 6).reverse().map((t) => t.daily_calories || 0),
          color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [targets]);

  // Get macros using mathematical calculations (no scaling needed)
  const macros = useMemo(() => {
    console.log('\n🔍 [MACROS RECALC] ===== MACRO CALCULATION START =====');
    console.log('[MACROS RECALC] useMemo triggered - dependencies changed');
    console.log('[MACROS RECALC] latestTarget:', JSON.stringify(latestTarget, null, 2));
    console.log('[MACROS RECALC] plan structure:', JSON.stringify({
      id: plan?.id,
      daily_targets: plan?.daily_targets,
      metabolic_calculations: plan?.metabolic_calculations
    }, null, 2));
    
    console.log('[MACROS RECALC] 🎯 EXPECTED VALUES FOR COMPARISON:');
    console.log('[MACROS RECALC] Expected Calories: 2845');
    console.log('[MACROS RECALC] Expected Protein: 178g');
    console.log('[MACROS RECALC] Expected Carbs: 320g');
    console.log('[MACROS RECALC] Expected Fat: 95g');
    
    // First priority: Use mathematical calculations from plan.metabolic_calculations
    const goalCalories = plan?.metabolic_calculations?.goal_calories;
    
    if (goalCalories && plan?.metabolic_calculations) {
      console.log('[NUTRITION PLAN] ✅ Using MATHEMATICAL calculations directly from plan:', {
        goalCalories,
        metabolicCalculations: plan.metabolic_calculations,
        dailyTargets: plan.daily_targets
      });
      
      // Use the stored mathematical macro calculations directly
      const result = {
        calories: goalCalories,
        protein: plan.daily_targets?.protein || 0,
        carbs: plan.daily_targets?.carbs || 0,
        fat: plan.daily_targets?.fat || 0
      };
      
      console.log('[MACROS RECALC] ✅ Returning MATHEMATICAL macros:', result);
      console.log('[MACROS RECALC] 🔍 DETAILED BREAKDOWN:', {
        'Source': 'plan.metabolic_calculations + plan.daily_targets',
        'Calories from': 'plan.metabolic_calculations.goal_calories',
        'Protein from': 'plan.daily_targets.protein',
        'Carbs from': 'plan.daily_targets.carbs', 
        'Fat from': 'plan.daily_targets.fat',
        'Values': result
      });
      console.log('🔍 [MACROS RECALC] ===== MACRO CALCULATION END =====\n');
      return result;
    }
    
    // Second priority: Use latest target (should be mathematical now)
    if (latestTarget) {
      console.log('[NUTRITION PLAN] Using latest mathematical target:', {
        id: latestTarget.id,
        calories: latestTarget.daily_calories,
        protein: latestTarget.protein_grams,
        carbs: latestTarget.carbs_grams,
        fat: latestTarget.fat_grams
      });
      
      const result = {
        calories: latestTarget.daily_calories || 0,
        protein: latestTarget.protein_grams || 0,
        carbs: latestTarget.carbs_grams || 0,
        fat: latestTarget.fat_grams || 0
      };
      console.log('[MACROS RECALC] Returning mathematical target macros:', result);
      console.log('🔍 [MACROS RECALC] ===== MACRO CALCULATION END =====\n');
      return result;
    } 
    
    // Fallback to plan.daily_targets if no historical targets available
    const dailyTargets = plan?.daily_targets || plan?.daily_targets_json;
    if (dailyTargets) {
      console.log('[NUTRITION PLAN] Falling back to plan daily targets:', dailyTargets);
      const fallbackResult = {
        calories: dailyTargets.calories || 0,
        protein: dailyTargets.protein || dailyTargets.protein_grams || 0,
        carbs: dailyTargets.carbs || dailyTargets.carbs_grams || 0,
        fat: dailyTargets.fat || dailyTargets.fat_grams || 0
      };
      console.log('[MACROS RECALC] Using fallback daily targets:', fallbackResult);
      console.log('🔍 [MACROS RECALC] ===== MACRO CALCULATION END =====\n');
      return fallbackResult;
    } 
    
    // Final fallback
    console.log('[MACROS RECALC] ❌ Using final fallback - all zeros');
    console.log('🔍 [MACROS RECALC] ===== MACRO CALCULATION END =====\n');
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }, [latestTarget, plan]);

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchPlanData = useCallback(async () => {
    if (!planId) {
      setError('No plan ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedPlan, fetchedTargets] = await Promise.all([
        NutritionService.getNutritionPlanById(planId as string),
        NutritionService.getHistoricalNutritionTargets(planId as string),
      ]);
      setPlan(fetchedPlan);
      setTargets(fetchedTargets);
      
      // Update latestTarget immediately with the most recent target
      if (fetchedTargets && fetchedTargets.length > 0) {
        console.log('[NUTRITION] 🔍 All fetched targets (sorted by created_at DESC):', 
          fetchedTargets.map((t, i) => ({
            index: i,
            id: t.id,
            created_at: t.created_at,
            calories: t.daily_calories,
            protein: t.protein_grams
          }))
        );
        
        setLatestTarget(fetchedTargets[0]);
        console.log('[NUTRITION] ✅ Updated latestTarget with LATEST target:', {
          id: fetchedTargets[0].id,
          created_at: fetchedTargets[0].created_at,
          calories: fetchedTargets[0].daily_calories,
          protein: fetchedTargets[0].protein_grams,
          carbs: fetchedTargets[0].carbs_grams,
          fat: fetchedTargets[0].fat_grams
        });
      } else {
        console.log('[NUTRITION] ❌ No targets found in fetchedTargets');
      }
      
      // Debug log to see the actual plan structure
      console.log('[NUTRITION] Fetched plan details:', JSON.stringify({
        id: fetchedPlan?.id,
        goal_type: fetchedPlan?.goal_type,
        status: fetchedPlan?.status,
        preferences: fetchedPlan?.preferences,
        daily_targets: fetchedPlan?.daily_targets
      }, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      Alert.alert('Error', 'Could not load your nutrition plan data.');
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  // Removed redundant useEffect - latestTarget is now set directly in fetchPlanData()
  // to avoid race conditions where old cached data overwrites new recalculated values

  
  const handleDeletePlan = async () => {
    if (!plan) return;
    
    if (Platform.OS === 'web') {
      performDeletePlan();
      return;
    }
    
    Alert.alert(
      'Delete Nutrition Plan',
      'Are you sure you want to delete this nutrition plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDeletePlan }
      ]
    );
  };
  
  const performDeletePlan = async () => {
    setIsDeleting(true);
    try {
      if (Platform.OS === 'web') {
        // For web, directly manipulate the mockPlansStore
        const planIndex = mockPlansStore.plans.findIndex(p => p.id === plan.id);
        if (planIndex !== -1) {
          mockPlansStore.plans.splice(planIndex, 1);
        } else if (plan.id === mockNutritionPlan.id) {
          mockPlansStore.deletedDefaultPlan = true;
        }
        
        Alert.alert('Success', 'Nutrition plan deleted successfully', [
          { text: 'OK', onPress: () => router.replace('/(main)/nutrition') }
        ]);
      } else {
        await NutritionService.deleteNutritionPlan(plan.id);
        Alert.alert('Success', 'Nutrition plan deleted successfully', [
          { text: 'OK', onPress: () => router.replace('/(main)/nutrition') }
        ]);
      }
    } catch (error: any) {
      console.error('Error deleting nutrition plan:', error);
      Alert.alert('Error', `Failed to delete nutrition plan: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const loadDailyMenu = async () => {
    if (!user) return;
    try {
      const res = await NutritionService.generateDailyMealPlan(user.id);
      if (res.success) setDailyMenu(res.meal_plan || []);
    } catch (e) {
      console.warn('Failed to load daily menu');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlanData();
    }, [fetchPlanData])
  );

  // Helper function to format preferences and intolerances
  const formatPreferences = (preferences: any) => {
    if (!preferences) return 'None';
    
    // Handle array format
    if (Array.isArray(preferences)) {
      return preferences.length > 0 ? preferences.join(', ') : 'None';
    }
    
    // Handle object format with dietary and intolerances keys
    if (typeof preferences === 'object') {
      const dietary = preferences.dietary || [];
      return dietary.length > 0 ? dietary.join(', ') : 'None';
    }
    
    return 'None';
  };
  
  const formatIntolerances = (preferences: any) => {
    if (!preferences) return 'None';
    
    // Handle object format with intolerances key
    if (typeof preferences === 'object' && preferences.intolerances) {
      const intolerances = preferences.intolerances || [];
      return intolerances.length > 0 ? intolerances.join(', ') : 'None';
    }
    
    return 'None';
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ImageBackground
          source={{ 
            uri: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=2000&auto=format&fit=crop' 
          }}
          style={styles.backgroundImage}
        >
          <LinearGradient
            colors={['rgba(18,18,18,0.9)', 'rgba(18,18,18,0.8)', '#121212']}
            style={styles.overlay}
          />
        </ImageBackground>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your nutrition plan...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ImageBackground
          source={{ 
            uri: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=2000&auto=format&fit=crop' 
          }}
          style={styles.backgroundImage}
        >
          <LinearGradient
            colors={['rgba(18,18,18,0.9)', 'rgba(18,18,18,0.8)', '#121212']}
            style={styles.overlay}
          />
        </ImageBackground>
        
        <Appbar.Header statusBarHeight={top} style={styles.transparentHeader}>
          <Appbar.BackAction onPress={() => router.push('/(main)/nutrition')} color={colors.white} />
          <Appbar.Content title="Plan Error" titleStyle={{ color: colors.white }} />
        </Appbar.Header>
        
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>
            {error || "Could not load nutrition plan"}
          </Text>
          <Text style={styles.errorMessage}>
            Please try creating a new plan or check your connection.
            {planId ? `\n\nPlan ID: ${planId}` : ''}
          </Text>
          <Button 
            mode="contained" 
            onPress={() => router.push('/(main)/nutrition')}
            style={styles.errorButton}
              buttonColor={colors.primary}
          >
            Return to Nutrition Hub
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => router.push('/(main)/nutrition/plan-create')}
            style={styles.errorButton}
              textColor={colors.primary}
          >
            Create New Plan
          </Button>
          </View>
        </View>
        </View>
    );
  }

  const getFitnessStrategyEmoji = (strategy: string) => {
    switch (strategy?.toLowerCase()) {
      case 'bulk':
        return '💪';
      case 'cut':
        return '🔥';
      case 'maintenance':
        return '⚖️';
      case 'recomp':
        return '🔄';
      case 'maingaining':
        return '📈';
      default:
        return '🎯';
    }
  };

  const getFitnessStrategyColor = (strategy: string) => {
    switch (strategy?.toLowerCase()) {
      case 'bulk':
        return colors.primary;
      case 'cut':
        return colors.error;
      case 'maintenance':
        return colors.accent;
      case 'recomp':
        return '#8B5CF6';
      case 'maingaining':
        return '#10B981';
      default:
        return colors.primary;
    }
  };

  const getFitnessStrategyDisplayName = (strategy: string) => {
    switch (strategy?.toLowerCase()) {
      case 'bulk':
        return 'BULK';
      case 'cut':
        return 'CUT';
      case 'maintenance':
        return 'MAINTENANCE';
      case 'recomp':
        return 'BODY RECOMPOSITION';
      case 'maingaining':
        return 'MAINGAINING';
      default:
        return 'FITNESS PLAN';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(18,18,18,0.9)', 'rgba(18,18,18,0.8)', '#121212']}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Header */}
      <Appbar.Header statusBarHeight={top} style={styles.transparentHeader}>
        <Appbar.BackAction onPress={() => router.push('/(main)/nutrition')} color={colors.white} />
        <Appbar.Content title={plan.plan_name || 'Nutrition Plan'} titleStyle={{ color: colors.white }} />
        <Appbar.Action
          icon="delete"
          onPress={handleDeletePlan}
          disabled={isDeleting}
          iconColor={colors.error}
        />
      </Appbar.Header>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={fetchPlanData}
            tintColor={colors.primary}
          />
        }
      >
        {/* Plan Overview Card */}
        <View style={styles.sectionContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
            style={styles.card}
          >
            <Text style={styles.sectionTitle}>Plan Overview</Text>
            
            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>{getFitnessStrategyEmoji(profile?.fitness_strategy || 'maintenance')}</Text>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewLabel}>Fitness Strategy</Text>
                <Text style={[styles.overviewValue, { color: getFitnessStrategyColor(profile?.fitness_strategy || 'maintenance') }]}>
                  {getFitnessStrategyDisplayName(profile?.fitness_strategy || 'maintenance')}
                </Text>
              </View>
            </View>

            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>📈</Text>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewLabel}>Status</Text>
                <Text style={[styles.overviewValue, { color: colors.secondary }]}>
                  {plan.status?.toUpperCase() || 'ACTIVE'}
                </Text>
              </View>
            </View>

            {plan.preferences?.dietary && plan.preferences.dietary.length > 0 && (
              <View style={styles.overviewItem}>
                <Text style={styles.overviewEmoji}>🍎</Text>
                <View style={styles.overviewContent}>
                  <Text style={styles.overviewLabel}>Dietary Preferences</Text>
                  <Text style={[styles.overviewValue, { color: colors.accent }]}>
                    {Array.isArray(plan.preferences.dietary) 
                      ? plan.preferences.dietary.join(', ') 
                      : typeof plan.preferences.dietary === 'string' 
                        ? plan.preferences.dietary
                        : 'None'}
                  </Text>
                </View>
              </View>
            )}

            {plan.preferences?.intolerances && plan.preferences.intolerances.length > 0 && (
              <View style={styles.overviewItem}>
                <Text style={styles.overviewEmoji}>🚫</Text>
                <View style={styles.overviewContent}>
                  <Text style={styles.overviewLabel}>Intolerances</Text>
                  <Text style={[styles.overviewValue, { color: colors.warning }]}>
                    {Array.isArray(plan.preferences.intolerances) 
                      ? plan.preferences.intolerances.join(', ') 
                      : typeof plan.preferences.intolerances === 'string'
                        ? plan.preferences.intolerances
                        : 'None'}
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Current Daily Targets */}
        <View style={styles.sectionContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
            style={styles.card}
          >

            <Text style={styles.sectionTitle}>Current Daily Targets</Text>
            <Text style={{ color: 'rgba(235,235,245,0.6)', marginBottom: 8 }}>Per day · Updated just now</Text>

            <View style={styles.macroGrid} key={`macros-${latestTarget?.id || 'default'}-${macros.calories}`}>
              <View style={[styles.macroCard, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={styles.macroEmoji}>🔥</Text>
                <Text style={styles.macroLabel}>Calories</Text>
                <Text style={styles.macroValue}>
                  {macros.calories}
                  <Text style={styles.macroUnit}> kcal</Text>
                </Text>
              </View>

              <View style={[styles.macroCard, { backgroundColor: `${colors.success}20` }]}>
                <Text style={styles.macroEmoji}>🥩</Text>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>
                  {macros.protein}
                  <Text style={styles.macroUnit}>g</Text>
                </Text>
              </View>

              <View style={[styles.macroCard, { backgroundColor: `${colors.accent}20` }]}>
                <Text style={styles.macroEmoji}>🌾</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>
                  {macros.carbs}
                  <Text style={styles.macroUnit}>g</Text>
                </Text>
              </View>

              <View style={[styles.macroCard, { backgroundColor: `${colors.warning}20` }]}>
                <Text style={styles.macroEmoji}>🧈</Text>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>
                  {macros.fat}
                  <Text style={styles.macroUnit}>g</Text>
                </Text>
              </View>
            </View>

          </LinearGradient>
        </View>

        {/* Metabolic Breakdown Explanation - Only show for mathematical calculations */}
        {plan?.metabolic_calculations && plan.metabolic_calculations.calculation_method !== 'Manual Input' && (
          <View style={styles.sectionContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
              style={styles.card}
            >
              <Text style={styles.sectionTitle}>📊 How Your Targets Were Calculated</Text>
              <Text style={{ color: 'rgba(235,235,245,0.6)', marginBottom: 16 }}>
                Based on your profile and {plan.metabolic_calculations.calculation_method}
              </Text>

              <View style={styles.metabolicBreakdown}>
                {/* BMR */}
                <View style={styles.metabolicRow}>
                  <View style={styles.metabolicLabel}>
                    <Text style={styles.metabolicEmoji}>⚡</Text>
                    <View>
                      <Text style={styles.metabolicTitle}>Basal Metabolic Rate (BMR)</Text>
                      <Text style={styles.metabolicSubtitle}>Calories burned at rest</Text>
                    </View>
                  </View>
                  <Text style={styles.metabolicValue}>
                    {plan.metabolic_calculations.bmr} <Text style={styles.metabolicUnit}>kcal/day</Text>
                  </Text>
                </View>

                {/* Activity Multiplier */}
                <View style={styles.metabolicRow}>
                  <View style={styles.metabolicLabel}>
                    <Text style={styles.metabolicEmoji}>🏃</Text>
                    <View>
                      <Text style={styles.metabolicTitle}>Activity Level</Text>
                      <Text style={styles.metabolicSubtitle}>
                        {plan.metabolic_calculations.activity_level.replace('_', ' ')} (×{plan.metabolic_calculations.activity_multiplier})
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.metabolicValue}>
                    {plan.metabolic_calculations.tdee} <Text style={styles.metabolicUnit}>kcal/day</Text>
                  </Text>
                </View>

                {/* Goal Adjustment */}
                <View style={styles.metabolicRow}>
                  <View style={styles.metabolicLabel}>
                    <Text style={styles.metabolicEmoji}>🎯</Text>
                    <View>
                      <Text style={styles.metabolicTitle}>Goal Adjustment</Text>
                      <Text style={styles.metabolicSubtitle}>
                        {plan.metabolic_calculations.goal_adjustment_reason || 
                         plan.metabolic_calculations.calorie_adjustment_reason || 
                         'Adjusted for your goals'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.metabolicValue, { 
                    color: plan.metabolic_calculations.goal_adjustment > 0 ? colors.success : 
                           plan.metabolic_calculations.goal_adjustment < 0 ? colors.warning : colors.white 
                  }]}>
                    {plan.metabolic_calculations.goal_adjustment > 0 ? '+' : ''}
                    {plan.metabolic_calculations.goal_adjustment} <Text style={styles.metabolicUnit}>kcal/day</Text>
                  </Text>
                </View>

                {/* Final Target */}
                <View style={[styles.metabolicRow, styles.finalTargetRow]}>
                  <View style={styles.metabolicLabel}>
                    <Text style={styles.metabolicEmoji}>🔥</Text>
                    <View>
                      <Text style={styles.metabolicTitle}>Your Daily Target</Text>
                      <Text style={styles.metabolicSubtitle}>Final calorie goal</Text>
                    </View>
                  </View>
                  <Text style={[styles.metabolicValue, styles.finalTargetValue]}>
                    {plan.metabolic_calculations.goal_calories || plan.metabolic_calculations.adjusted_calories} 
                    <Text style={styles.metabolicUnit}> kcal/day</Text>
                  </Text>
                </View>
              </View>

            </LinearGradient>
          </View>
        )}

        {/* Calorie Trend Chart */}
        {targets.length > 1 && (
          <View style={styles.sectionContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
              style={styles.card}
            >
              <Text style={styles.sectionTitle}>📊 Calorie Trend</Text>
              <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
                  width={width - 64}
              height={220}
              chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: 'transparent',
                    backgroundGradientTo: 'transparent',
                decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: colors.primary
                    }
              }}
              bezier
                  style={styles.chart}
            />
              </View>
            </LinearGradient>
          </View>
        )}


        {/* Bottom padding for safe area */}
        <View style={{ height: bottom + 100 }} />
      </Animated.ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
  transparentHeader: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: colors.white,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: colors.gray,
    lineHeight: 24,
  },
  errorButton: {
    marginVertical: 8,
    width: '100%',
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 20,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  overviewEmoji: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  overviewContent: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macroCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  macroEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
    textAlign: 'center',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  macroUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: colors.gray,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    borderRadius: 16,
  },
  micronutrientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  micronutrientEmoji: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  micronutrientInfo: {
    flex: 1,
  },
  micronutrientName: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  micronutrientValue: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  
  // Metabolic breakdown styles
  metabolicBreakdown: {
    gap: 16,
  },
  metabolicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  finalTargetRow: {
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  metabolicLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  metabolicEmoji: {
    fontSize: 20,
  },
  metabolicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  metabolicSubtitle: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 16,
  },
  metabolicValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'right',
  },
  finalTargetValue: {
    fontSize: 18,
    color: colors.primary,
  },
  metabolicUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray,
  },
});

export default NutritionPlanScreen; 