import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  NutritionPlan,
  NutritionService,
} from '../../../src/services/nutrition/NutritionService';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../../src/hooks/useAuth';
import { mockPlansStore, mockNutritionPlan } from '../../../src/mock-data';

const { width } = Dimensions.get('window');

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
};

const NutritionPlanScreen = () => {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestTarget, setLatestTarget] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isSettingActive, setIsSettingActive] = useState(false);

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    const strategy = profile?.fitness_strategy || 'maintenance';
    const strategyLabels: Record<string, string> = {
      bulk: 'bulking',
      cut: 'cutting',
      maintenance: 'maintenance',
      recomp: 'body recomposition',
      maingaining: 'maingaining'
    };
    
    message = `Here's your nutrition plan for ${strategyLabels[strategy] || 'your goals'}.`;
    
    return { greeting, message };
  }, [profile?.fitness_strategy]);

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

  const fetchPlanData = useCallback(async () => {
    if (!planId) {
      setError('No plan ID provided.');
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedPlan, fetchedTargets, fetchedActivePlanId] = await Promise.all([
        NutritionService.getNutritionPlanById(planId as string),
        NutritionService.getHistoricalNutritionTargets(planId as string),
        user?.id ? NutritionService.getSelectedNutritionPlanId(user.id) : Promise.resolve(null),
      ]);
      setPlan(fetchedPlan);
      setTargets(fetchedTargets);
      setActivePlanId(fetchedActivePlanId);
      
      // Update latestTarget immediately with the most recent target
      if (fetchedTargets && fetchedTargets.length > 0) {
        setLatestTarget(fetchedTargets[0]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      Alert.alert('Error', 'Could not load your nutrition plan data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlanData();
  }, [fetchPlanData]);

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

  const handleSetActive = async () => {
    if (!plan || !user?.id) return;
    
    setIsSettingActive(true);
    try {
      const success = await NutritionService.setSelectedNutritionPlanForTargets(user.id, plan.id);
      if (success) {
        setActivePlanId(plan.id);
        Alert.alert('Success', 'This plan is now your active nutrition plan.');
      } else {
        Alert.alert('Error', 'Failed to set this plan as active.');
      }
    } catch (error) {
      console.error('Error setting plan as active:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSettingActive(false);
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

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your nutrition plan...</Text>
        </View>
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.coachHeader}>
            <TouchableOpacity onPress={() => router.push('/(main)/nutrition')} style={styles.backButton}>
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.coachTextContainer}>
              <Text style={styles.coachGreeting}>Plan Error</Text>
              <Text style={styles.coachMessage}>Could not load nutrition plan</Text>
            </View>
          </View>
          
          <View style={styles.errorCard}>
            <Icon name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorTitle}>
              {error || "Could not load nutrition plan"}
            </Text>
            <Text style={styles.errorMessage}>
              Please try creating a new plan or check your connection.
            </Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => router.push('/(main)/nutrition')}
            >
              <Text style={styles.errorButtonText}>Return to Nutrition</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 60 + insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity 
            onPress={() => router.push('/(main)/nutrition')} 
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
            <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
          </View>
          <TouchableOpacity 
            onPress={handleDeletePlan} 
            disabled={isDeleting} 
            style={styles.deleteButton}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Icon name="delete-outline" size={20} color={colors.error} />
            )}
          </TouchableOpacity>
        </View>
        {/* Plan Overview Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Plan Overview</Text>
            {plan.id === activePlanId ? (
              <View style={styles.activePlanBadge}>
                <Icon name="check-circle" size={14} color={colors.primary} />
                <Text style={styles.activePlanBadgeText}>ACTIVE PLAN</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.setActiveButtonHeader}
                onPress={handleSetActive}
                disabled={isSettingActive}
              >
                {isSettingActive ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Icon name="star-outline" size={14} color={colors.primary} />
                    <Text style={styles.setActiveButtonHeaderText}>SET AS ACTIVE</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewEmoji}>{getFitnessStrategyEmoji(profile?.fitness_strategy || 'maintenance')}</Text>
                <View style={styles.overviewContent}>
                  <Text style={styles.overviewLabel}>Fitness Strategy</Text>
                  <Text style={[styles.overviewValue, { color: getFitnessStrategyColor(profile?.fitness_strategy || 'maintenance') }]}>
                    {getFitnessStrategyDisplayName(profile?.fitness_strategy || 'maintenance')}
                  </Text>
                </View>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Icon name="chart-line" size={20} color={colors.secondary} />
                <View style={styles.overviewContent}>
                  <Text style={styles.overviewLabel}>Status</Text>
                  <Text style={[styles.overviewValue, { color: colors.secondary }]}>
                    {plan.status?.toUpperCase() || 'ACTIVE'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Current Daily Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Targets</Text>
          <Text style={styles.sectionSubtitle}>Per day · Updated just now</Text>

          <View style={styles.macroGrid} key={`macros-${latestTarget?.id || 'default'}-${macros.calories}`}>
            <View style={[styles.macroCard, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
              <Text style={styles.macroEmoji}>🔥</Text>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>
                {Math.round(macros.calories)}
                <Text style={styles.macroUnit}> kcal</Text>
              </Text>
            </View>

            <View style={[styles.macroCard, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
              <Text style={styles.macroEmoji}>🥩</Text>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {Math.round(macros.protein)}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>

            <View style={[styles.macroCard, { backgroundColor: 'rgba(255, 230, 109, 0.12)' }]}>
              <Text style={styles.macroEmoji}>🌾</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>
                {Math.round(macros.carbs)}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>

            <View style={[styles.macroCard, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}>
              <Text style={styles.macroEmoji}>🧈</Text>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>
                {Math.round(macros.fat)}
                <Text style={styles.macroUnit}>g</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Metabolic Breakdown Explanation - Show for mathematical plans or any plan with metabolic calculations */}
        {(() => {
          const hasMetabolic = !!plan?.metabolic_calculations;
          const isMathematical = plan?.plan_type === 'mathematical';
          const hasCalculationMethod = plan?.metabolic_calculations?.calculation_method && 
                                      plan.metabolic_calculations.calculation_method !== 'Manual Input';
          const shouldShow = hasMetabolic && (isMathematical || hasCalculationMethod);
          
          console.log('[PLAN DETAIL] Checking metabolic_calculations:', {
            hasMetabolic,
            isMathematical,
            hasCalculationMethod,
            planType: plan?.plan_type,
            calculationMethod: plan?.metabolic_calculations?.calculation_method,
            shouldShow,
            metabolicData: plan?.metabolic_calculations ? {
              bmr: plan.metabolic_calculations.bmr,
              tdee: plan.metabolic_calculations.tdee,
              calculation_method: plan.metabolic_calculations.calculation_method
            } : null
          });
          
          return shouldShow;
        })() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How Your Targets Were Calculated</Text>
            <Text style={styles.sectionSubtitle}>
              Based on your profile and {plan.metabolic_calculations.calculation_method}
            </Text>
            
            <View style={styles.metabolicCard}>

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
            </View>
          </View>
        )}

        {/* Calorie Trend Chart */}
        {targets.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calorie Trend</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={chartData}
                width={width - 80}
                height={200}
                chartConfig={{
                  backgroundColor: '#000000',
                  backgroundGradientFrom: '#000000',
                  backgroundGradientTo: '#000000',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                  labelColor: () => '#FFFFFF',
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: colors.primary
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  coachMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.15)',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  activePlanBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  setActiveButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  setActiveButtonHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    marginTop: -8,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewEmoji: {
    fontSize: 24,
  },
  overviewContent: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },

  // Macro Grid
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCard: {
    width: (width - 40 - 12) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  macroEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  macroUnit: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Metabolic Card
  metabolicCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metabolicBreakdown: {
    gap: 12,
  },
  metabolicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  finalTargetRow: {
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  metabolicLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  metabolicEmoji: {
    fontSize: 20,
  },
  metabolicTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  metabolicSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  metabolicValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    minWidth: 90,
  },
  finalTargetValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  metabolicUnit: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Chart
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
});

export default NutritionPlanScreen; 