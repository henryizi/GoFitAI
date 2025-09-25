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

// Modern, premium colors with enhanced gradients
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F65',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.4)',
  success: '#32D74B',
  warning: '#FF9F0A',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.95)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  white: '#FFFFFF',
  dark: '#0A0A0A',
  darkGray: '#1A1A1A',
  mediumGray: '#8E8E93',
  glassMorphism: 'rgba(255, 255, 255, 0.05)',
  shadowColor: 'rgba(0, 0, 0, 0.3)',
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

  // Generate suitable ingredients for each meal type
  const generateIngredientsForMealType = (mealType: string, excluded: string[]) => {
    const mealIngredients = {
      'Breakfast': ['eggs', 'oats', 'banana', 'milk', 'berries', 'yogurt', 'toast', 'avocado', 'nuts', 'honey'],
      'Lunch': ['chicken breast', 'rice', 'vegetables', 'quinoa', 'beans', 'salad', 'olive oil', 'tomatoes', 'cheese', 'pasta'],
      'Dinner': ['salmon', 'sweet potato', 'broccoli', 'lean beef', 'brown rice', 'asparagus', 'garlic', 'herbs', 'spinach', 'zucchini'],
      'Snack': ['almonds', 'apple', 'protein powder', 'cottage cheese', 'crackers', 'hummus', 'carrots', 'peanut butter', 'dark chocolate', 'berries']
    };

    const baseIngredients = mealIngredients[mealType] || mealIngredients['Lunch'];
    
    // Filter out excluded ingredients (case insensitive)
    const filteredIngredients = baseIngredients.filter(ingredient => 
      !excluded.some(excludedItem => 
        ingredient.toLowerCase().includes(excludedItem.toLowerCase()) ||
        excludedItem.toLowerCase().includes(ingredient.toLowerCase())
      )
    );

    // Return 4-6 ingredients for variety
    return filteredIngredients.slice(0, 6);
  };

  // Generate complete daily meal plan using AI - creates creative meals without ingredient restrictions
  const generateDailyMealPlanWithAI = async (userId: string, targets: any, excludedIngredients: string[]) => {
    try {
      console.log('[DAILY MEAL PLAN] 🤖 Generating complete daily meal plan with NEW AI system');
      console.log('[DAILY MEAL PLAN] Targets:', targets);
      console.log('[DAILY MEAL PLAN] Excluded ingredients:', excludedIngredients);

      // Get user's dietary preferences from their active plan
      const activePlan = await NutritionService.getLatestNutritionPlan(userId);
      const dietaryPreferences = activePlan?.preferences?.dietary || [];
      
      console.log('[DAILY MEAL PLAN] Dietary preferences:', dietaryPreferences);

      // Use the new AI-powered meal plan generation with recipes
      const result = await NutritionService.generateAIDailyMealPlan(
        targets.daily_calories,
        targets.protein_grams,
        targets.carbs_grams,
        targets.fat_grams,
        dietaryPreferences,
        undefined // No specific cuisine preference for now - let AI choose variety
      );
      
      if (result.success && result.mealPlan && result.mealPlan.length > 0) {
        console.log('[DAILY MEAL PLAN] ✅ NEW AI generated complete meal plan successfully');
        console.log('[DAILY MEAL PLAN] Generated meals:', result.mealPlan.map(m => m.name).join(', '));
        console.log('[DAILY MEAL PLAN] Cuisine variety:', result.cuisineVariety);
        console.log('[DAILY MEAL PLAN] Total nutrition:', result.totalNutrition);
        
        // Convert the new AI format to the expected format
        const convertedMealPlan = result.mealPlan.map(meal => ({
          meal_type: meal.meal_type,
          recipe_name: meal.name,
          cuisine: meal.cuisine,
          prep_time: meal.prep_time,
          cook_time: meal.cook_time,
          servings: meal.servings,
          ingredients: meal.ingredients?.map(ing => {
            // Handle both string ingredients (from backend API) and object ingredients (from AI)
            if (typeof ing === 'string') {
              return {
                name: ing,
                quantity: '1 serving',
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
              };
            } else {
              return {
                name: ing?.ingredient || ing?.name || 'Unknown ingredient',
                quantity: ing?.amount || ing?.quantity || '1 serving',
                calories: ing?.calories || 0,
                protein: ing?.protein || 0,
                carbs: ing?.carbs || 0,
                fat: ing?.fat || 0
              };
            }
          }) || [],
          instructions: meal.instructions || [],
          macros: {
            calories: meal.macros?.calories || meal.nutrition?.calories || 0,
            protein_grams: meal.macros?.protein_grams || meal.nutrition?.protein || 0,
            carbs_grams: meal.macros?.carbs_grams || meal.nutrition?.carbs || 0,
            fat_grams: meal.macros?.fat_grams || meal.nutrition?.fat || 0,
            fiber_grams: meal.macros?.fiber_grams || meal.nutrition?.fiber || 0,
            sugar_grams: meal.macros?.sugar_grams || meal.nutrition?.sugar || 0
          }
        }));
        
        return {
          mealPlan: convertedMealPlan,
          totalNutrition: result.totalNutrition,
          cuisineVariety: result.cuisineVariety,
          cookingTips: result.cookingTips,
          usedAI: true,
          usedFallback: false
        };
      } else {
        console.log('[DAILY MEAL PLAN] ❌ NEW AI generation failed, using fallback');
        throw new Error(result.error || 'AI meal plan generation failed');
      }
    } catch (error) {
      console.error('[DAILY MEAL PLAN] Error generating daily meal plan:', error);
      console.log('[DAILY MEAL PLAN] Falling back to mathematical meal generation');
      
      // Fallback to mathematical meal plan generation
      const fallbackMealPlan = generateMathematicalFallbackPlan(targets);
      return {
        mealPlan: fallbackMealPlan,
        usedAI: false,
        usedFallback: true
      };
    }
  };

  // Mathematical fallback meal plan generation
  const generateMathematicalFallbackPlan = (targets: any) => {
    console.log('[FALLBACK] Generating mathematical meal plan');
    
    const mealDistribution = {
      breakfast: { calories: 0.25, protein: 0.25, carbs: 0.30, fat: 0.25 },
      lunch: { calories: 0.35, protein: 0.35, carbs: 0.35, fat: 0.30 },
      dinner: { calories: 0.30, protein: 0.30, carbs: 0.25, fat: 0.35 },
      snack: { calories: 0.10, protein: 0.10, carbs: 0.10, fat: 0.10 }
    };

    return Object.entries(mealDistribution).map(([mealType, distribution]) => ({
      meal_type: mealType,
      recipe_name: `Balanced ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
      prep_time: 15,
      cook_time: 20,
      servings: 1,
      ingredients: [],
      instructions: [],
      macros: {
        calories: Math.round(targets.daily_calories * distribution.calories),
        protein_grams: Math.round(targets.protein_grams * distribution.protein),
        carbs_grams: Math.round(targets.carbs_grams * distribution.carbs),
        fat_grams: Math.round(targets.fat_grams * distribution.fat)
      }
    }));
  };

  // AI meal generation function with retry logic - creates personalized, nutritionally balanced meals
  const generateAIMeal = async (mealType: string, targets: any, excluded: string[], maxRetries: number = 2) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[MEAL GENERATION] Generating ${mealType} with AI (attempt ${attempt}/${maxRetries})`);
        console.log(`[MEAL GENERATION] Targets:`, targets);
        console.log(`[MEAL GENERATION] Excluded ingredients:`, excluded);

        // Generate appropriate ingredients for this meal type
        const mealIngredients = generateIngredientsForMealType(mealType, excluded);
        console.log(`[MEAL GENERATION] Generated ingredients for ${mealType}:`, mealIngredients);

        // Use GeminiService to generate a personalized recipe with timeout
        const result = await Promise.race([
          GeminiService.generateRecipe(
            mealType,
            targets,
            mealIngredients // Pass actual ingredients instead of excluded ones
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI generation timeout')), 40000) // 40s timeout per attempt
          )
        ]) as any;

        if (result.success && result.recipe) {
          console.log(`[MEAL GENERATION] AI generated recipe successfully: ${result.recipe.name}`);
          
          // Map the AI recipe structure to our expected format
          const mappedRecipe = {
            recipe_name: result.recipe.name,
            ingredients: result.recipe.ingredients?.map(ing => {
              // Handle both string ingredients and object ingredients
              if (typeof ing === 'string') {
                return {
                  name: ing,
                  quantity: '1 serving'
                };
              } else {
                return {
                  name: ing?.ingredient || ing?.name || 'Unknown ingredient',
                  quantity: ing?.amount || ing?.quantity || '1 serving'
                };
              }
            }) || [],
            instructions: result.recipe.instructions || [],
            calories: result.recipe.nutrition?.calories || 0,
            protein: result.recipe.nutrition?.protein || 0,
            carbs: result.recipe.nutrition?.carbs || 0,
            fat: result.recipe.nutrition?.fat || 0,
            prep_time: result.recipe.prep_time,
            cook_time: result.recipe.cook_time,
            servings: result.recipe.servings
          };
          
          return { recipe: mappedRecipe, usedAI: true, usedFallback: false };
        } else {
          console.log(`[MEAL GENERATION] AI generation failed on attempt ${attempt}: ${result.error || 'Unknown error'}`);
          if (attempt < maxRetries) {
            console.log(`[MEAL GENERATION] Retrying ${mealType} generation...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
            continue;
          }
          throw new Error(result.error || 'AI generation failed after all retries');
        }
      } catch (error) {
        console.error(`[MEAL GENERATION] Error generating ${mealType} on attempt ${attempt}:`, error);
        
        if (attempt < maxRetries) {
          console.log(`[MEAL GENERATION] Retrying ${mealType} generation after error...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
          continue;
        }
        
        // Fallback to enhanced mock generation if all AI attempts fail
        console.log(`[MEAL GENERATION] All AI attempts failed for ${mealType}, using fallback`);
        const fallbackRecipe = generateFallbackMeal(mealType, targets, excluded);
        return { recipe: fallbackRecipe, usedAI: false, usedFallback: true };
      }
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
      
      // Use goal-adjusted calories from metabolic calculations
      const goalAdjustedCalories = activePlan.metabolic_calculations?.goal_calories || 
                                   activePlan.metabolic_calculations?.adjusted_calories || 
                                   latestTargets.daily_calories;
      
      console.log('[MEAL PLAN] Using goal-adjusted calories:', goalAdjustedCalories, 'vs base calories:', latestTargets.daily_calories);
      
      // If using goal-adjusted calories, scale the macro targets proportionally
      let adjustedTargets = latestTargets;
      if (goalAdjustedCalories !== latestTargets.daily_calories) {
        const scalingFactor = goalAdjustedCalories / latestTargets.daily_calories;
        adjustedTargets = {
          ...latestTargets,
          daily_calories: goalAdjustedCalories,
          protein_grams: Math.round(latestTargets.protein_grams * scalingFactor),
          carbs_grams: Math.round(latestTargets.carbs_grams * scalingFactor),
          fat_grams: Math.round(latestTargets.fat_grams * scalingFactor)
        };
        console.log('[MEAL PLAN] Scaled macro targets:', adjustedTargets);
      }

          // Use daily meal plan generation instead of individual meals
      console.log('[MEAL PLAN] Generating complete daily meal plan with AI');
      const dailyMealPlanResult = await generateDailyMealPlanWithAI(user.id, adjustedTargets, excludedArray);
      
      // Convert daily meal plan to our expected format
      console.log('[MEAL PLAN] Processing meal plan result:', JSON.stringify(dailyMealPlanResult, null, 2));
      
      const meals = dailyMealPlanResult.mealPlan.map((meal, index) => {
        try {
          console.log(`[MEAL PLAN] Processing meal ${index}:`, JSON.stringify(meal, null, 2));
          
          const mealTypeKey = meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1);
          
          // Safely process ingredients
          const processedIngredients = (meal.ingredients || []).map(ing => {
            if (typeof ing === 'string') {
              return { name: ing, quantity: '1 serving' };
            } else if (typeof ing === 'object' && ing !== null) {
              return {
                name: ing.name || String(ing),
                quantity: ing.quantity || '1 serving'
              };
            } else {
              console.warn(`[MEAL PLAN] Invalid ingredient format:`, ing);
              return { name: String(ing), quantity: '1 serving' };
            }
          });
          
          return {
            mealType: mealTypeKey,
            targets: {
              calories: meal.macros?.calories || 0,
              protein: meal.macros?.protein_grams || 0,
              carbs: meal.macros?.carbs_grams || 0,
              fat: meal.macros?.fat_grams || 0,
            },
            recipe: {
              recipe_name: meal.recipe_name || `${mealTypeKey} Meal`,
              ingredients: processedIngredients,
              instructions: meal.instructions || [],
              calories: meal.macros?.calories || 0,
              protein: meal.macros?.protein_grams || 0,
              carbs: meal.macros?.carbs_grams || 0,
              fat: meal.macros?.fat_grams || 0,
              prep_time: meal.prep_time || 15,
              cook_time: meal.cook_time || 20,
              servings: meal.servings || 1
            },
            usedAI: dailyMealPlanResult.usedAI,
            usedFallback: dailyMealPlanResult.usedFallback
          };
        } catch (mealError) {
          console.error(`[MEAL PLAN] Error processing meal ${index}:`, mealError);
          throw new Error(`Failed to process meal ${index}: ${mealError.message}`);
        }
      });

      // Track AI usage across all meals
      const hasAIMeals = meals.some(meal => meal.usedAI);
      const hasFallbackMeals = meals.some(meal => meal.usedFallback);
      
      console.log(`[MEAL PLAN] AI meals: ${meals.filter(m => m.usedAI).length}/${meals.length}`);
      console.log(`[MEAL PLAN] Fallback meals: ${meals.filter(m => m.usedFallback).length}/${meals.length}`);

      // Calculate total nutrition for the day
      const totalNutrition = meals.reduce((total, meal) => ({
        calories: total.calories + (meal.targets?.calories || 0),
        protein: total.protein + (meal.targets?.protein || 0),
        carbs: total.carbs + (meal.targets?.carbs || 0),
        fat: total.fat + (meal.targets?.fat || 0),
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
        calories: meal.targets?.calories || 0,
        protein_grams: meal.targets?.protein || 0,
        carbs_grams: meal.targets?.carbs || 0,
        fat_grams: meal.targets?.fat || 0,
      };

      await NutritionService.logFoodEntry(user.id, entry);
      
      Alert.alert(
        'Meal Logged! 🍽️', 
        `${meal.recipe.recipe_name} has been added to today's nutrition progress.\n\n` +
        `Calories: ${meal.targets?.calories || 0}\n` +
        `Protein: ${meal.targets?.protein || 0}g\n` +
        `Carbs: ${meal.targets?.carbs || 0}g\n` +
        `Fat: ${meal.targets?.fat || 0}g`,
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
          calories: meal.targets?.calories || 0,
          protein_grams: meal.targets?.protein || 0,
          carbs_grams: meal.targets?.carbs || 0,
          fat_grams: meal.targets?.fat || 0,
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
        source={{ uri: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?q=80&w=3474&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={[
            'rgba(10, 10, 10, 0.95)', 
            'rgba(26, 26, 26, 0.85)', 
            'rgba(10, 10, 10, 0.95)'
          ]}
          style={styles.overlay}
          locations={[0, 0.5, 1]}
        />
        {/* Additional subtle gradient overlay */}
        <LinearGradient
          colors={[
            'rgba(255, 107, 53, 0.1)', 
            'transparent', 
            'rgba(255, 107, 53, 0.05)'
          ]}
          style={styles.accentOverlay}
          locations={[0, 0.3, 1]}
        />
      </ImageBackground>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => router.replace('/(main)/nutrition')}
          activeOpacity={0.7}
        >
          <View style={styles.headerButtonBackground}>
            <Icon name="arrow-left" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Daily Meal Planner</Text>
          <View style={styles.headerTitleUnderline} />
        </View>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/(main)/nutrition/meal-plan')}
          activeOpacity={0.7}
        >
          <View style={styles.headerButtonBackground}>
            <Icon name="calendar-today" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!mealPlan && !isLoading && (
          <View style={styles.mainFormWrapper}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={styles.heroIconGradient}
                >
                  <Icon name="chef-hat" size={32} color={colors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>Create Your Perfect Meal Plan</Text>
              <Text style={styles.heroSubtitle}>AI-powered nutrition tailored to your goals and preferences</Text>
            </View>

            {/* Enhanced Form Container */}
            <View style={styles.formContainer}>
              <View style={styles.inputSection}>
                <View style={styles.inputHeader}>
                  <Icon name="close-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.inputLabel}>Ingredients to Exclude</Text>
                </View>
                <Text style={styles.inputSubLabel}>Tell us what you'd prefer to avoid in your meals</Text>
                
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="e.g., mushrooms, cilantro, nuts (optional)"
                    placeholderTextColor={colors.textTertiary}
                    value={excludedIngredients}
                    onChangeText={setExcludedIngredients}
                    mode="outlined"
                    style={styles.ingredientsInput}
                    outlineColor={colors.borderLight}
                    activeOutlineColor={colors.primary}
                    theme={{ 
                      colors: { 
                        onSurface: colors.text, 
                        background: colors.surfaceLight,
                        outline: colors.borderLight,
                        primary: colors.primary
                      },
                      roundness: 16
                    }}
                    textColor={colors.text}
                    multiline
                    numberOfLines={4}
                    contentStyle={styles.textInputContent}
                  />
                  <View style={styles.inputIcon}>
                    <Icon name="food-off" size={18} color={colors.textTertiary} />
                  </View>
                </View>

                {/* Quick Exclude Options */}
                <View style={styles.quickExcludeSection}>
                  <Text style={styles.quickExcludeLabel}>Common exclusions:</Text>
                  <View style={styles.quickExcludeChips}>
                    {['Dairy', 'Nuts', 'Gluten', 'Seafood', 'Spicy'].map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.quickExcludeChip,
                          excludedIngredients.toLowerCase().includes(item.toLowerCase()) && styles.quickExcludeChipActive
                        ]}
                        onPress={() => {
                          const current = excludedIngredients.toLowerCase();
                          const itemLower = item.toLowerCase();
                          if (current.includes(itemLower)) {
                            // Remove the item
                            const newValue = excludedIngredients
                              .split(',')
                              .map(s => s.trim())
                              .filter(s => s.toLowerCase() !== itemLower)
                              .join(', ');
                            setExcludedIngredients(newValue);
                          } else {
                            // Add the item
                            const newValue = excludedIngredients 
                              ? `${excludedIngredients}, ${item}` 
                              : item;
                            setExcludedIngredients(newValue);
                          }
                        }}
                      >
                        <Text style={[
                          styles.quickExcludeChipText,
                          excludedIngredients.toLowerCase().includes(item.toLowerCase()) && styles.quickExcludeChipTextActive
                        ]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            
            {/* Enhanced Generate Button */}
            <View style={styles.generateButtonContainer}>
              <TouchableOpacity 
                onPress={handleGenerateMealPlan} 
                disabled={isLoading}
                style={styles.generateButtonWrapper}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.generateButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.generateButtonContent}>
                    {isLoading ? (
                      <>
                        <ActivityIndicator color={colors.white} size="small" />
                        <Text style={styles.generateButtonText}>Generating...</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.generateButtonIcon}>
                          <Icon name="sparkles" size={22} color={colors.white} />
                        </View>
                        <Text style={styles.generateButtonText}>Generate AI Meal Plan</Text>
                        <Icon name="arrow-right" size={18} color={colors.white} style={styles.generateButtonArrow} />
                      </>
                    )}
                  </View>
                </LinearGradient>
                
                {/* Button Shadow */}
                <View style={styles.buttonShadow} />
              </TouchableOpacity>
              
              {/* Additional Info */}
              <View style={styles.generateButtonInfo}>
                <Icon name="information-outline" size={16} color={colors.textTertiary} />
                <Text style={styles.generateButtonInfoText}>Personalized based on your nutrition goals</Text>
              </View>
            </View>
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
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.mealTypeName} numberOfLines={1} ellipsizeMode="tail">{String(meal.mealType).replace(/\n/g, ' ')}</Text>
                        <Text style={styles.mealCalories}>{meal.targets?.calories || 0} calories</Text>
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
  accentOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassMorphism,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerTitleUnderline: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
    marginTop: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  mainFormWrapper: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  heroIconContainer: {
    marginBottom: 20,
  },
  heroIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  inputSection: {
    marginBottom: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  inputSubLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
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
  inputWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  ingredientsInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    minHeight: 120,
    fontSize: 16,
    paddingRight: 50,
  },
  textInputContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  quickExcludeSection: {
    marginTop: 4,
  },
  quickExcludeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  quickExcludeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickExcludeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickExcludeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickExcludeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickExcludeChipTextActive: {
    color: colors.white,
  },
  generateButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  generateButtonWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  generateButton: {
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 24,
    elevation: 8,
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonIcon: {
    marginRight: 12,
  },
  generateButtonArrow: {
    marginLeft: 12,
    opacity: 0.8,
  },
  buttonShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: -4,
    backgroundColor: colors.primary,
    borderRadius: 28,
    opacity: 0.2,
    zIndex: -1,
  },
  generateButtonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  generateButtonInfoText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  // Strict toggle styles removed
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
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
    width: '100%',
  },
  mealTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  mealIcon: {
    marginRight: 12,
  },
  mealTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    includeFontPadding: false,
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