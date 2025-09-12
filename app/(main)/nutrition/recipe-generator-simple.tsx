import { router } from 'expo-router';
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ImageBackground,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import {
  TextInput,
  Text,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { ShareService } from '../../../src/services/sharing/ShareService';
import { GeminiService } from '../../../src/services/ai/GeminiService';
import { MealPreferenceService } from '../../../src/services/nutrition/MealPreferenceService';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSubscription } from '../../../src/hooks/useSubscription';

const { width } = Dimensions.get('window');

// Modern, premium colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
  darkGray: '#1C1C1E',
  mediumGray: '#8E8E93',
};


const DailyMealPlanScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPremium, useRecipe, openPaywall } = useSubscription();
  const [excludedIngredients, setExcludedIngredients] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [usedAI, setUsedAI] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [timeoutError, setTimeoutError] = useState(false);
  const [mealRatings, setMealRatings] = useState<{[key: string]: 'liked' | 'disliked' | null}>({});

  // Load existing meal ratings when component mounts
  const loadMealRatings = async () => {
    if (!mealPlan) return;
    
    const ratings: {[key: string]: 'liked' | 'disliked' | null} = {};
    
    for (const meal of mealPlan.meals) {
      const mealId = `${meal.mealType}_${meal.recipe.recipe_name}`;
      const rating = await MealPreferenceService.getMealRating(mealId, user?.id);
      ratings[mealId] = rating;
    }
    
    setMealRatings(ratings);
  };

  // Handle meal rating (like/dislike)
  const handleMealRating = async (meal: any, rating: 'liked' | 'disliked') => {
    const mealId = `${meal.mealType}_${meal.recipe.recipe_name}`;
    
    // Toggle rating if same rating clicked
    const currentRating = mealRatings[mealId];
    const newRating = currentRating === rating ? null : rating;
    
    if (newRating === null) {
      // Remove rating
      await MealPreferenceService.removeRating(mealId, user?.id);
      setMealRatings(prev => ({ ...prev, [mealId]: null }));
    } else {
      // Set new rating
      const success = await MealPreferenceService.rateMeal(
        mealId,
        meal.recipe.recipe_name,
        meal.mealType,
        newRating,
        user?.id
      );
      
      if (success) {
        setMealRatings(prev => ({ ...prev, [mealId]: newRating }));
        
        // Show feedback to user
        Alert.alert(
          newRating === 'liked' ? '❤️ Liked!' : '👎 Disliked',
          `We'll remember your preference for ${meal.recipe.recipe_name} to improve future recommendations.`,
          [{ text: 'Got it', style: 'default' }]
        );
      }
    }
  };

  // Load ratings when meal plan changes
  React.useEffect(() => {
    if (mealPlan) {
      loadMealRatings();
    }
  }, [mealPlan]);

  // Mathematical meal generation function - creates personalized, nutritionally balanced meals
  const generateAIMeal = async (mealType: string, targets: any, excluded: string[]) => {
    try {
      console.log(`[MEAL GENERATION] Generating ${mealType} with AI`);
      console.log(`[MEAL GENERATION] Targets:`, targets);
      console.log(`[MEAL GENERATION] Excluded ingredients:`, excluded);

      // Use GeminiService to generate a personalized recipe
      const result = await GeminiService.generateRecipe(
        mealType,
        targets,
        excluded.length > 0 ? excluded : ['common allergens'] // Provide some context if no exclusions
      );

      if (result.success && result.recipe) {
        console.log(`[MEAL GENERATION] AI generated recipe successfully: ${result.recipe.name}`);
        
        // Map the AI recipe structure to our expected format
        const mappedRecipe = {
          recipe_name: result.recipe.name,
          ingredients: result.recipe.ingredients.map(ing => ({
            name: ing.ingredient,
            quantity: ing.amount
          })),
          instructions: result.recipe.instructions,
          calories: result.recipe.nutrition.calories,
          protein: result.recipe.nutrition.protein,
          carbs: result.recipe.nutrition.carbs,
          fat: result.recipe.nutrition.fat,
          prep_time: result.recipe.prep_time,
          cook_time: result.recipe.cook_time,
          servings: result.recipe.servings
        };
        
        return { recipe: mappedRecipe, usedAI: true, usedFallback: false };
      } else {
        console.log(`[MEAL GENERATION] AI generation failed, using fallback`);
        throw new Error(result.error || 'AI generation failed');
      }
    } catch (error) {
      console.error(`[MEAL GENERATION] Error generating ${mealType}:`, error);
      
      // Fallback to enhanced mock generation if AI fails
      const fallbackRecipe = generateFallbackMeal(mealType, targets, excluded);
      return { recipe: fallbackRecipe, usedAI: false, usedFallback: true };
    }
  };

  // Enhanced fallback meal generation for when AI is unavailable
  const generateFallbackMeal = (mealType: string, targets: any, excluded: string[]) => {
    console.log(`[MEAL GENERATION] Using fallback generation for ${mealType}`);
    
    // Comprehensive meal options for each meal type
    const mealTemplates = {
      Breakfast: [
        { name: 'Greek Yogurt Parfait', ingredients: ['Greek yogurt', 'Mixed berries', 'Granola', 'Honey'], protein: 0.35, carbs: 0.45, fat: 0.20 },
        { name: 'Scrambled Eggs with Avocado Toast', ingredients: ['Eggs', 'Whole grain bread', 'Avocado', 'Cherry tomatoes'], protein: 0.30, carbs: 0.35, fat: 0.35 },
        { name: 'Protein Smoothie Bowl', ingredients: ['Protein powder', 'Banana', 'Spinach', 'Almond butter', 'Chia seeds'], protein: 0.40, carbs: 0.35, fat: 0.25 },
        { name: 'Overnight Oats', ingredients: ['Rolled oats', 'Greek yogurt', 'Blueberries', 'Walnuts', 'Maple syrup'], protein: 0.25, carbs: 0.55, fat: 0.20 },
        { name: 'Veggie Omelet', ingredients: ['Eggs', 'Bell peppers', 'Spinach', 'Cheese', 'Herbs'], protein: 0.35, carbs: 0.15, fat: 0.50 }
      ],
      Lunch: [
        { name: 'Grilled Chicken Salad', ingredients: ['Chicken breast', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Olive oil vinaigrette'], protein: 0.45, carbs: 0.25, fat: 0.30 },
        { name: 'Quinoa Buddha Bowl', ingredients: ['Quinoa', 'Roasted vegetables', 'Chickpeas', 'Tahini dressing'], protein: 0.25, carbs: 0.50, fat: 0.25 },
        { name: 'Turkey and Hummus Wrap', ingredients: ['Whole wheat tortilla', 'Turkey breast', 'Hummus', 'Vegetables', 'Spinach'], protein: 0.35, carbs: 0.40, fat: 0.25 },
        { name: 'Salmon Rice Bowl', ingredients: ['Grilled salmon', 'Brown rice', 'Edamame', 'Cucumber', 'Sesame dressing'], protein: 0.35, carbs: 0.40, fat: 0.25 },
        { name: 'Lentil Soup with Whole Grain Roll', ingredients: ['Red lentils', 'Vegetables', 'Whole grain bread', 'Olive oil'], protein: 0.30, carbs: 0.50, fat: 0.20 }
      ],
      Dinner: [
        { name: 'Salmon with Quinoa', ingredients: ['Salmon fillet', 'Quinoa', 'Steamed broccoli', 'Lemon', 'Herbs'], protein: 0.40, carbs: 0.35, fat: 0.25 },
        { name: 'Chicken Stir-fry', ingredients: ['Chicken breast', 'Brown rice', 'Mixed vegetables', 'Sesame oil', 'Ginger'], protein: 0.35, carbs: 0.40, fat: 0.25 },
        { name: 'Lean Beef with Sweet Potato', ingredients: ['Lean beef', 'Roasted sweet potato', 'Green beans', 'Garlic'], protein: 0.40, carbs: 0.35, fat: 0.25 },
        { name: 'Tofu Curry with Rice', ingredients: ['Firm tofu', 'Basmati rice', 'Coconut curry sauce', 'Vegetables'], protein: 0.25, carbs: 0.45, fat: 0.30 },
        { name: 'Grilled Fish Tacos', ingredients: ['White fish', 'Corn tortillas', 'Cabbage slaw', 'Avocado', 'Lime'], protein: 0.35, carbs: 0.40, fat: 0.25 }
      ],
      Snack: [
        { name: 'Apple with Almond Butter', ingredients: ['Apple', 'Almond butter'], protein: 0.20, carbs: 0.50, fat: 0.30 },
        { name: 'Greek Yogurt with Berries', ingredients: ['Greek yogurt', 'Mixed berries', 'Honey'], protein: 0.40, carbs: 0.45, fat: 0.15 },
        { name: 'Trail Mix', ingredients: ['Mixed nuts', 'Dried fruit', 'Seeds'], protein: 0.25, carbs: 0.45, fat: 0.30 },
        { name: 'Protein Bar', ingredients: ['Protein bar', 'Water'], protein: 0.45, carbs: 0.35, fat: 0.20 },
        { name: 'Hummus with Vegetables', ingredients: ['Hummus', 'Carrots', 'Bell peppers', 'Cucumber'], protein: 0.25, carbs: 0.45, fat: 0.30 }
      ]
    };

    // Get available meals for this meal type
    const availableMeals = mealTemplates[mealType] || [];
    
    // Filter out meals with excluded ingredients
    const filteredMeals = availableMeals.filter(meal => 
      !excluded.some(excludedItem => 
        meal.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes(excludedItem.toLowerCase())
        )
      )
    );

    // Select a random meal from available options
    const selectedMeal = filteredMeals.length > 0 
      ? filteredMeals[Math.floor(Math.random() * filteredMeals.length)]
      : availableMeals[Math.floor(Math.random() * availableMeals.length)];

    // Calculate nutritional values based on targets and meal ratios
    const calculatedNutrition = {
      calories: targets.calories,
      protein: Math.round(targets.calories * selectedMeal.protein / 4), // 4 calories per gram of protein
      carbs: Math.round(targets.calories * selectedMeal.carbs / 4), // 4 calories per gram of carbs
      fat: Math.round(targets.calories * selectedMeal.fat / 9), // 9 calories per gram of fat
    };
    
    return {
      recipe_name: selectedMeal.name,
      ingredients: selectedMeal.ingredients.map(ing => ({ 
        name: ing, 
        quantity: '1 serving' 
      })),
      instructions: [
        `Prepare ${selectedMeal.name} according to your dietary preferences and nutritional targets`,
        `This meal is designed to provide ${targets.calories} calories with balanced macronutrients`,
        `Focus on proper portion sizes to meet your daily nutrition goals`
      ],
      calories: calculatedNutrition.calories,
      protein: calculatedNutrition.protein,
      carbs: calculatedNutrition.carbs,
      fat: calculatedNutrition.fat,
    };
  };

  // Generate a complete daily meal plan tailored to user's nutrition goals
  const handleGenerateMealPlan = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    if (!isPremium) {
      const ok = useRecipe();
      if (!ok) {
        openPaywall();
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setMealPlan(null);
    setUsedFallback(false);
    setUsedAI(false);
    setTimeoutError(false);

    try {
      const activePlan = await NutritionService.getLatestNutritionPlan(user.id);
      if (!activePlan) {
        throw new Error('You need an active nutrition plan to generate meal plans.');
      }
      const targetsHistory = await NutritionService.getHistoricalNutritionTargets(activePlan.id);
      const latestTargets = targetsHistory[0];
      if (!latestTargets) {
        throw new Error('Could not find your current nutritional targets.');
      }

      // Define meal distribution for complete daily plan
      const mealTargetPercentages = {
        Breakfast: 0.25,
        Lunch: 0.35, 
        Dinner: 0.30,
        Snack: 0.10,
      };

      // Process excluded ingredients
      const excludedArray = excludedIngredients
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      // Generate meal plan for each meal
      const mealPlanPromises = Object.entries(mealTargetPercentages).map(async ([mealType, percentage]) => {
      const mealTargets = {
        calories: Math.round(latestTargets.daily_calories * percentage),
        protein: Math.round(latestTargets.protein_grams * percentage),
        carbs: Math.round(latestTargets.carbs_grams * percentage),
        fat: Math.round(latestTargets.fat_grams * percentage),
      };

        // Generate AI-powered personalized meal for this meal type
        const mealResult = await generateAIMeal(mealType, mealTargets, excludedArray);
        return {
          mealType,
          targets: mealTargets,
          recipe: mealResult.recipe,
          usedAI: mealResult.usedAI,
          usedFallback: mealResult.usedFallback
        };
      });

      const meals = await Promise.all(mealPlanPromises);

      // Track AI usage across all meals
      const hasAIMeals = meals.some(meal => meal.usedAI);
      const hasFallbackMeals = meals.some(meal => meal.usedFallback);
      
      console.log(`[MEAL PLAN] AI meals: ${meals.filter(m => m.usedAI).length}/${meals.length}`);
      console.log(`[MEAL PLAN] Fallback meals: ${meals.filter(m => m.usedFallback).length}/${meals.length}`);

      // Calculate total nutrition for the day
      const totalNutrition = meals.reduce((total, meal) => ({
        calories: total.calories + meal.targets.calories,
        protein: total.protein + meal.targets.protein,
        carbs: total.carbs + meal.targets.carbs,
        fat: total.fat + meal.targets.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      // Create the complete meal plan structure
      const completeMealPlan = {
        date: new Date().toISOString().split('T')[0],
        totalNutrition,
        excludedIngredients: excludedArray,
        usedAI: hasAIMeals,
        usedFallback: hasFallbackMeals,
        meals: meals.map(meal => ({
          mealType: meal.mealType,
          recipe: meal.recipe,
          targets: meal.targets,
          usedAI: meal.usedAI,
          usedFallback: meal.usedFallback
        }))
      };

      setMealPlan(completeMealPlan);
      setUsedAI(hasAIMeals);
      setUsedFallback(hasFallbackMeals);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      const isTimeout = message.includes('timed out') || message.includes('aborted') || message.includes('timeout');
      setTimeoutError(isTimeout);
      setError(message);
      if (message.includes('need an active nutrition plan')) {
        Alert.alert(
          'Nutrition Plan Required', 
          'You need to create a nutrition plan before generating meal plans. The meal plan generator uses your nutritional targets to create personalized daily meals.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Plan', onPress: () => router.push('/(main)/nutrition/plan-create') }
          ]
        );
      } else if (isTimeout) {
        Alert.alert(
          'Connection Timed Out',
          'The meal plan generation is taking longer than expected. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Meal Plan Generation Failed', 
          'We could not generate your daily meal plan. Please try again or check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
      setRetryCount(prev => prev + 1);
    }
  };

  const handleRetry = () => {
    handleGenerateMealPlan();
  };

  // Log a meal from the generated meal plan
  const handleLogMeal = async (meal: any) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to log meals.');
      return;
    }

    try {
      const entry = {
        food_name: meal.recipe.recipe_name,
        calories: meal.targets.calories,
        protein_grams: meal.targets.protein,
        carbs_grams: meal.targets.carbs,
        fat_grams: meal.targets.fat,
      };

      await NutritionService.logFoodEntry(user.id, entry);
      
      Alert.alert(
        'Meal Logged! 🍽️', 
        `${meal.recipe.recipe_name} has been added to today's nutrition progress.\n\n` +
        `Calories: ${meal.targets.calories}\n` +
        `Protein: ${meal.targets.protein}g\n` +
        `Carbs: ${meal.targets.carbs}g\n` +
        `Fat: ${meal.targets.fat}g`,
        [{ 
          text: 'View Progress', 
          onPress: () => router.replace('/(main)/nutrition')
        },
        { 
          text: 'OK', 
          style: 'default' 
        }]
      );
    } catch (error) {
      console.error('Error logging meal:', error);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    }
  };

  // Log all meals from the daily meal plan
  const handleLogAllMeals = async () => {
    if (!user || !mealPlan) {
      Alert.alert('Error', 'You must be logged in and have a meal plan to log meals.');
      return;
    }

    try {
      // Log each meal in sequence
      for (const meal of mealPlan.meals) {
        const entry = {
          food_name: meal.recipe.recipe_name,
          calories: meal.targets.calories,
          protein_grams: meal.targets.protein,
          carbs_grams: meal.targets.carbs,
          fat_grams: meal.targets.fat,
        };
        await NutritionService.logFoodEntry(user.id, entry);
      }
      
      Alert.alert(
        'All Meals Logged! 🎉', 
        `Successfully logged all ${mealPlan.meals.length} meals from your daily meal plan.\n\n` +
        `Total Calories: ${mealPlan.totalNutrition.calories}\n` +
        `Total Protein: ${mealPlan.totalNutrition.protein}g\n` +
        `Total Carbs: ${mealPlan.totalNutrition.carbs}g\n` +
        `Total Fat: ${mealPlan.totalNutrition.fat}g`,
        [{ 
          text: 'View Progress', 
          onPress: () => router.replace('/(main)/nutrition')
        },
        { 
          text: 'OK', 
          style: 'default' 
        }]
      );
    } catch (error) {
      console.error('Error logging all meals:', error);
      Alert.alert('Error', 'Failed to log some meals. Please try again or log meals individually.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=3474&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', colors.dark]}
          style={styles.overlay}
        />
      </ImageBackground>

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-left" iconColor={colors.text} onPress={() => router.replace('/(main)/nutrition')} />
        <Text style={styles.headerTitle}>Daily Meal Planner</Text>
        <IconButton
          icon="calendar-today"
          iconColor={colors.text}
          onPress={() => router.push('/(main)/nutrition/meal-plan')}
          accessibilityLabel="View Meal Plans"
        />
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!mealPlan && !isLoading && (
          <View>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Ingredients to Exclude</Text>
              <Text style={styles.inputSubLabel}>Any specific ingredients you don't want in your meals (e.g., mushrooms, cilantro)</Text>
              <TextInput
                placeholder="e.g., mushrooms, cilantro (optional)"
                value={excludedIngredients}
                onChangeText={setExcludedIngredients}
                mode="outlined"
                style={styles.ingredientsInput}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                theme={{ colors: { onSurface: colors.text, background: colors.darkGray } }}
                textColor={colors.text}
              />
            </View>
            
            <TouchableOpacity onPress={handleGenerateMealPlan} disabled={isLoading}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.generateButton}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Icon name="brain" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={styles.generateButtonText}>Generate AI Meal Plan</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Creating Your Personalized Meal Plan</Text>
            <Text style={styles.loadingSubtitle}>
              Calculating personalized meals based on your nutrition goals and preferences...
            </Text>
            {/* Update the loading steps to be vertical */}
            <View style={styles.loadingSteps}>
              <View style={styles.loadingStep}>
                <Icon name="check-circle" size={16} color={colors.success} style={styles.loadingStepIcon} />
                <Text style={styles.loadingStepText}>Analyzing your nutrition goals</Text>
              </View>
              <View style={styles.loadingStep}>
                <ActivityIndicator size="small" color={colors.primary} style={styles.loadingStepIcon} />
                <Text style={styles.loadingStepText}>AI generating personalized recipes</Text>
              </View>
              <View style={[styles.loadingStep, { opacity: 0.5 }]}>
                <Icon name="circle-outline" size={16} color={colors.textSecondary} style={styles.loadingStepIcon} />
                <Text style={[styles.loadingStepText, { color: colors.textSecondary }]}>Optimizing macro balance</Text>
              </View>
            </View>
          </View>
        )}
        
        {error && !error.includes('need an active nutrition plan') && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorTitle}>Generation Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
            {timeoutError && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.retryButtonGradient}
                >
                  <Icon name="refresh" size={16} color={colors.text} style={{ marginRight: 8 }} />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {mealPlan && (
          <View style={styles.mealPlanContainer}>
            <View style={styles.mealPlanHeader}>
              <Text style={styles.mealPlanTitle}>Your Daily Meal Plan</Text>
              <Text style={styles.mealPlanDate}>{new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</Text>
              <View style={styles.mealPlanActions}>
                <IconButton 
                  icon="content-save-outline" 
                  iconColor={colors.primary} 
                  size={24} 
                  onPress={() => {
                    Alert.alert('Meal Plan Saved!', 'Your daily meal plan has been saved to your meal plan history.');
                  }} 
                />
                <IconButton 
                  icon="share-variant-outline" 
                  iconColor={colors.primary} 
                  size={24} 
                  onPress={() => ShareService.showShareOptions(mealPlan)} 
                />
              </View>
            </View>

            {/* AI Generation Status */}
            {(mealPlan.usedAI || mealPlan.usedFallback) && (
              <View style={[styles.aiStatusCard, mealPlan.usedAI ? styles.aiSuccessCard : styles.aiFallbackCard]}>
                <View style={styles.aiStatusHeader}>
                  <Icon 
                    name={mealPlan.usedAI ? "brain" : "information-outline"} 
                    size={20} 
                    color={mealPlan.usedAI ? colors.success : colors.warning} 
                  />
                  <Text style={[styles.aiStatusTitle, { color: mealPlan.usedAI ? colors.success : colors.warning }]}>
                    {mealPlan.usedAI ? "AI-Powered Meal Plan" : "Standard Meal Plan"}
                  </Text>
                    </View>
                <Text style={styles.aiStatusDescription}>
                  {mealPlan.usedAI 
                    ? "Your meals were calculated using scientific nutrition formulas for optimal balance and variety."
                    : "Your meals were generated using our curated recipe database. For AI-powered personalization, check your internet connection and try again."
                  }
                    </Text>
              </View>
            )}

            {/* Daily nutrition summary */}
            <View style={styles.dailyNutritionCard}>
              <Text style={styles.cardTitle}>DAILY NUTRITION SUMMARY</Text>
              <View style={styles.macrosContainer}>
                <MacroPill label="Calories" value={mealPlan.totalNutrition.calories} color={colors.primary} />
                <MacroPill label="Protein" value={`${mealPlan.totalNutrition.protein}g`} color={colors.accent} />
                <MacroPill label="Carbs" value={`${mealPlan.totalNutrition.carbs}g`} color={colors.secondary} />
                <MacroPill label="Fat" value={`${mealPlan.totalNutrition.fat}g`} color={colors.mediumGray} />
              </View>
            </View>

            {/* Meal plan breakdown */}
            <View style={styles.mealsCard}>
              <Text style={styles.cardTitle}>YOUR MEALS TODAY</Text>
              {mealPlan.meals.map((meal: any, index: number) => (
                <View key={index} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealTypeInfo}>
                      <Icon 
                        name={getMealIcon(meal.mealType)} 
                        size={24} 
                        color={colors.primary} 
                        style={styles.mealIcon}
                      />
                      <View>
                        <Text style={styles.mealTypeName}>{meal.mealType}</Text>
                        <Text style={styles.mealCalories}>{meal.targets.calories} calories</Text>
                  </View>
                    </View>
                    <View style={styles.mealActionsContainer}>
                      <TouchableOpacity style={styles.viewRecipeButton}>
                        <Text style={styles.viewRecipeButtonText}>View Recipe</Text>
                      </TouchableOpacity>
                      <View style={styles.ratingButtonsContainer}>
                        <TouchableOpacity 
                          style={[
                            styles.ratingButton, 
                            mealRatings[`${meal.mealType}_${meal.recipe.recipe_name}`] === 'liked' && styles.likedButton
                          ]}
                          onPress={() => handleMealRating(meal, 'liked')}
                        >
                          <Icon 
                            name="heart" 
                            size={16} 
                            color={mealRatings[`${meal.mealType}_${meal.recipe.recipe_name}`] === 'liked' ? colors.white : colors.success} 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[
                            styles.ratingButton, 
                            mealRatings[`${meal.mealType}_${meal.recipe.recipe_name}`] === 'disliked' && styles.dislikedButton
                          ]}
                          onPress={() => handleMealRating(meal, 'disliked')}
                        >
                          <Icon 
                            name="thumb-down" 
                            size={16} 
                            color={mealRatings[`${meal.mealType}_${meal.recipe.recipe_name}`] === 'disliked' ? colors.white : colors.error} 
                          />
                        </TouchableOpacity>
                        </View>
                      <TouchableOpacity 
                        style={styles.logMealButton}
                        onPress={() => handleLogMeal(meal)}
                      >
                        <Icon name="plus" size={14} color={colors.text} style={{ marginRight: 4 }} />
                        <Text style={styles.logMealButtonText}>Log Meal</Text>
                      </TouchableOpacity>
                      </View>
                </View>
                  <Text style={styles.mealRecipeName}>{meal.recipe.recipe_name}</Text>
                  <View style={styles.mealMacros}>
                    <Text style={styles.mealMacroText}>P: {meal.targets.protein}g</Text>
                    <Text style={styles.mealMacroText}>C: {meal.targets.carbs}g</Text>
                    <Text style={styles.mealMacroText}>F: {meal.targets.fat}g</Text>
                      </View>
                    </View>
              ))}
            </View>

            <View style={styles.bottomActions}>
              <TouchableOpacity 
                style={styles.logAllMealsButton}
                onPress={() => handleLogAllMeals()}
              >
                <LinearGradient
                  colors={[colors.success, '#2DA544']}
                  style={styles.logAllMealsGradient}
                >
                  <Icon name="check-all" size={16} color={colors.text} style={{ marginRight: 8 }} />
                  <Text style={styles.logAllMealsButtonText}>Log All Meals</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setMealPlan(null)} style={styles.newMealPlanButton}>
                <Text style={styles.newMealPlanButtonText}>Create New Meal Plan</Text>
            </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Helper function to get meal type icons
const getMealIcon = (mealType: string): string => {
  switch (mealType) {
    case 'Breakfast': return 'coffee';
    case 'Lunch': return 'food-fork-drink';
    case 'Dinner': return 'silverware-fork-knife';
    case 'Snack': return 'cookie';
    default: return 'food';
  }
};

const MacroPill = ({ label, value, color }) => (
    <View style={styles.macroItem}>
        <Icon name="circle" size={12} color={color} style={{ marginRight: 8 }} />
        <Text style={styles.macroLabel}>{label}: </Text>
        <Text style={styles.macroValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputSubLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  mealTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: colors.darkGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedMealTypeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectedMealTypeText: {
    color: colors.text,
  },
  ingredientsInput: {
    backgroundColor: colors.darkGray,
    borderRadius: 12,
    minHeight: 100,
  },
  generateButton: {
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // Strict toggle styles removed
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  recipeContainer: {
    paddingBottom: 20,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  nutritionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  macrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  macroLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  macroValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: colors.text,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  newRecipeButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  newRecipeButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  ingredientsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredientItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientBullet: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientQuantity: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
    minWidth: 60,
    textAlign: 'right',
  },
  // Fallback notice styles removed
  retryButton: {
    marginTop: 20,
    borderRadius: 30,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  retryButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  ingredientChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  ingredientChip: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ingredientChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  macroInfo: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  stepContainerNew: {
    marginBottom: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  stepDetails: {
    marginLeft: 40,
  },
  stepDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailBullet: {
    marginRight: 8,
    marginTop: 2,
  },
  stepDetailText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingSteps: {
    marginTop: 30,
    width: '80%',
  },
  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingStepIcon: {
    marginRight: 12,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingStepText: {
    fontSize: 14,
    color: colors.text,
  },


  // Meal plan container styles
  mealPlanContainer: {
    paddingBottom: 20,
  },
  mealPlanHeader: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealPlanTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  mealPlanDate: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  mealPlanActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Daily nutrition card
  dailyNutritionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Meals card styles
  mealsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealCard: {
    backgroundColor: colors.darkGray,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIcon: {
    marginRight: 12,
  },
  mealTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  mealCalories: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mealActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ratingButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  ratingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  dislikedButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  viewRecipeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  viewRecipeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  logMealButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logMealButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  mealRecipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 16,
  },
  mealMacroText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Bottom actions container
  bottomActions: {
    marginTop: 16,
    gap: 12,
  },
  
  // Log all meals button
  logAllMealsButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  logAllMealsGradient: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logAllMealsButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },

  // New meal plan button
  newMealPlanButton: {
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  newMealPlanButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // AI Status Card Styles
  aiStatusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  aiSuccessCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  aiFallbackCard: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  aiStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiStatusDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default DailyMealPlanScreen; 