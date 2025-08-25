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
  const { user } = useAuth();
  const { isPremium, openPaywall } = useSubscription();
  const { top, bottom } = useSafeAreaInsets();
  const { planId } = useLocalSearchParams();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReevaluating, setIsReevaluating] = useState(false);
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

  // Get macros from plan.daily_targets or latestTarget
  const macros = useMemo(() => {
    // First try to get from plan.daily_targets or plan.daily_targets_json
    const dailyTargets = plan?.daily_targets || plan?.daily_targets_json;
    
    // Log the dailyTargets for debugging
    console.log('[NUTRITION PLAN] Daily targets:', dailyTargets);
    
    if (dailyTargets) {
      return {
        calories: dailyTargets.calories || 0,
        protein: dailyTargets.protein || dailyTargets.protein_grams || 0,
        carbs: dailyTargets.carbs || dailyTargets.carbs_grams || 0,
        fat: dailyTargets.fat || dailyTargets.fat_grams || 0
      };
    } else if (latestTarget) {
      return {
        calories: latestTarget.daily_calories || 0,
        protein: latestTarget.protein_grams || 0,
        carbs: latestTarget.carbs_grams || 0,
        fat: latestTarget.fat_grams || 0
      };
    } else {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  }, [plan, latestTarget]);

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

  useEffect(() => {
    if (plan?.id) {
      NutritionService.getHistoricalNutritionTargets(plan.id)
        .then(targets => {
          if (targets && targets.length > 0) {
            setLatestTarget(targets[0]);
          }
        })
        .catch(err => console.error('Error fetching nutrition targets:', err));
    }
  }, [plan]);

  const handleReevaluate = async () => {
    console.log('--- Button Press: Re-evaluate Plan ---');
    if (!user) return;
    if (!isPremium) {
      openPaywall();
      return;
    }
    setIsReevaluating(true);
    try {
      const result = await NutritionService.reevaluatePlan(user.id);
      if (result.success) {
        Alert.alert(
          'Plan Adjusted',
          result.new_targets.reasoning ||
            'Your nutrition plan has been updated based on your recent progress.'
        );
        fetchPlanData(); // Re-fetch data to show the latest targets
      } else {
        throw new Error(result.error || 'Failed to re-evaluate plan.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      Alert.alert('Error', message);
    } finally {
      setIsReevaluating(false);
    }
  };
  
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

  const getGoalEmoji = (goalType: string) => {
    switch (goalType?.toLowerCase()) {
      case 'fat_loss':
        return '🔥';
      case 'muscle_gain':
        return '💪';
      case 'maintenance':
        return '⚖️';
      default:
        return '🎯';
    }
  };

  const getGoalColor = (goalType: string) => {
    switch (goalType?.toLowerCase()) {
      case 'fat_loss':
        return colors.error;
      case 'muscle_gain':
        return colors.success;
      case 'maintenance':
        return colors.accent;
      default:
        return colors.primary;
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
          icon="robot-outline"
          onPress={() => router.push({ pathname: '/(main)/nutrition/ai-chat', params: { planId: String(plan?.id || planId) } })}
          disabled={isReevaluating || isDeleting}
          iconColor={colors.secondary}
        />
        <Appbar.Action
          icon="delete"
          onPress={handleDeletePlan}
          disabled={isReevaluating || isDeleting}
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
              <Text style={styles.overviewEmoji}>{getGoalEmoji(plan.goal_type)}</Text>
              <View style={styles.overviewContent}>
                <Text style={styles.overviewLabel}>Goal</Text>
                <Text style={[styles.overviewValue, { color: getGoalColor(plan.goal_type) }]}>
                  {plan.goal_type?.toUpperCase().replace(/_/g, ' ')}
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
            {isReevaluating && (
              <View style={styles.reevaluatingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.reevaluatingText}>
                  AI is analyzing your week...
                </Text>
              </View>
            )}
            
            <Text style={styles.sectionTitle}>Current Daily Targets</Text>
            <Text style={{ color: 'rgba(235,235,245,0.6)', marginBottom: 8 }}>Per day · Updated just now</Text>
            <Button mode="contained" onPress={handleReevaluate} disabled={isReevaluating} style={{ marginBottom: 12 }}>
              Auto‑Adjust Targets (AI)
            </Button>
            
            <View style={styles.macroGrid}>
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
            
            {latestTarget && latestTarget.reasoning && (
              <View style={styles.reasoningContainer}>
                <LinearGradient
                  colors={['rgba(255,107,53,0.1)', 'rgba(255,107,53,0.05)']}
                  style={styles.reasoningCard}
                >
                  <Text style={styles.reasoningEmoji}>🤖</Text>
              <Text style={styles.reasoningText}>
                AI Reasoning: {latestTarget.reasoning}
              </Text>
                </LinearGradient>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Daily Menu or Paywall */}
        <View style={styles.sectionContainer}>
          {isPremium ? (
            <DailyMenuCard
              items={dailyMenu}
              onRegenerate={loadDailyMenu}
              onSwap={(meal) => router.push('/(main)/nutrition/recipe-generator-simple')}
              onSave={() => Alert.alert('Saved', 'Suggestions saved for today')}
            />
          ) : (
            <PaywallPreview
              title="Today’s AI Menu (Premium)"
              bullets={["Get 4 meals tailored to your targets", "Swap ingredients instantly", "Save and reuse"]}
              onUpgrade={openPaywall}
            />
          )}
        </View>

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

        {/* Micronutrients */}
        {latestTarget && latestTarget.micronutrients_targets && (
          <View style={styles.sectionContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
              style={styles.card}
            >
              <Text style={styles.sectionTitle}>🧪 Micronutrient Targets</Text>
              {Object.entries(latestTarget.micronutrients_targets).map(
                ([key, value]) => (
                  <View key={key} style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientEmoji}>⚛️</Text>
                    <View style={styles.micronutrientInfo}>
                      <Text style={styles.micronutrientName}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <Text style={styles.micronutrientValue}>
                        {String(value)} {key.split('_')[1] || ''}
                      </Text>
                    </View>
                  </View>
                )
              )}
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
  reasoningContainer: {
    marginTop: 8,
  },
  reasoningCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reasoningEmoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  reasoningText: {
    flex: 1,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
    fontStyle: 'italic',
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
  reevaluatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  reevaluatingText: {
    marginTop: 16,
    fontWeight: '600',
    color: colors.white,
    fontSize: 16,
  },
  detailsContainer: {
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default NutritionPlanScreen; 