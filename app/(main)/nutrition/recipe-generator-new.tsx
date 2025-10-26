import { router } from 'expo-router';
import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ImageBackground, 
  Animated, 
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  ColorValue
} from 'react-native';
import {
  Appbar,
  Button,
  TextInput,
  useTheme,
  Text,
  ActivityIndicator,
  Chip,
  Divider,
  Surface,
  IconButton,
  Avatar,
  ProgressBar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { ShareService } from '../../../src/services/sharing/ShareService';
import { useSubscription } from '../../../src/hooks/useSubscription';
import { colors } from '../../../src/styles/colors';
import { theme } from '../../../src/styles/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// Sample food images for different meal types
const MEAL_TYPE_IMAGES = {
  Breakfast: require('../../../assets/images/placeholder.png'),
  Lunch: require('../../../assets/images/placeholder.png'),
  Dinner: require('../../../assets/images/placeholder.png'),
  Snack: require('../../../assets/images/placeholder.png'),
};

// Define gradient colors
const GRADIENTS = {
  primary: ['#3A6BC5', '#2C4F9B'] as readonly [ColorValue, ColorValue],
  accent: ['#FF5A5F', '#E63E43'] as readonly [ColorValue, ColorValue],
  secondary: ['#00C9A7', '#00A389'] as readonly [ColorValue, ColorValue],
  transparent: ['transparent', 'transparent'] as readonly [ColorValue, ColorValue],
};

const RecipeGeneratorScreen = () => {
  const insets = useSafeAreaInsets();
  const paperTheme = useTheme();
  const { user } = useAuth();
  const { isPremium, useRecipe, openPaywall } = useSubscription();
  const [ingredients, setIngredients] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Dinner');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 70],
    extrapolate: 'clamp',
  });
  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
  
  // Macro distribution animation
  const proteinPercentage = recipe ? (recipe.protein / (recipe.protein + recipe.carbs + recipe.fat)) * 100 : 0;
  const carbsPercentage = recipe ? (recipe.carbs / (recipe.protein + recipe.carbs + recipe.fat)) * 100 : 0;
  const fatPercentage = recipe ? (recipe.fat / (recipe.protein + recipe.carbs + recipe.fat)) * 100 : 0;

  const handleGenerateRecipe = async () => {
    console.log('--- Button Press: Generate Recipe ---');
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert('Missing Ingredients', 'Please enter some ingredients.');
      return;
    }

    // Check subscription limits for free users
    if (!isPremium) {
      const ok = useRecipe();
      if (!ok) {
        openPaywall();
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setRecipe(null);

    try {
      console.log('[RECIPE] Step 1: Getting nutrition plan...');
      const activePlan = await NutritionService.getLatestNutritionPlan(user.id);
      if (!activePlan) {
        throw new Error(
          'You need an active nutrition plan to generate recipes.'
        );
      }
      console.log('[RECIPE] Step 2: Getting nutrition targets...');
      const targetsHistory = await NutritionService.getHistoricalNutritionTargets(
        activePlan.id
      );
      const latestTargets = targetsHistory[0];
      if (!latestTargets) {
        throw new Error(
          'Could not find your current nutritional targets.'
        );
      }

      const mealTargetPercentages = {
        Breakfast: 0.25,
        Lunch: 0.35,
        Dinner: 0.3,
        Snack: 0.1,
      };

      const percentage =
        mealTargetPercentages[selectedMealType] ||
        1 / MEAL_TYPES.length;

      // Use goal-adjusted calories from metabolic calculations
      const goalAdjustedCalories = activePlan.metabolic_calculations?.goal_calories || 
                                   activePlan.metabolic_calculations?.adjusted_calories || 
                                   latestTargets.daily_calories;
      
      console.log('[RECIPE] Using goal-adjusted calories:', goalAdjustedCalories, 'vs base calories:', latestTargets.daily_calories);

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
        console.log('[RECIPE] Scaled macro targets:', adjustedTargets);
      }

      const mealTargets = {
        calories: Math.round(adjustedTargets.daily_calories * percentage),
        protein: Math.round(adjustedTargets.protein_grams * percentage),
        carbs: Math.round(adjustedTargets.carbs_grams * percentage),
        fat: Math.round(adjustedTargets.fat_grams * percentage),
      };

      const ingredientsArray = ingredients
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);

      console.log('[RECIPE] Step 3: Calling generateRecipe API...');
      console.log('[RECIPE] Meal type:', selectedMealType);
      console.log('[RECIPE] Targets:', JSON.stringify(mealTargets));
      console.log('[RECIPE] Ingredients:', JSON.stringify(ingredientsArray));
      
      try {
      const result = await NutritionService.generateRecipe(
        selectedMealType,
        mealTargets,
        ingredientsArray
      );
        
        console.log('[RECIPE] Step 4: API response received:', JSON.stringify(result, null, 2));

      if (result.success) {
        // Add nutrition data to recipe for display
        result.recipe.calories = mealTargets.calories;
        result.recipe.protein = mealTargets.protein;
        result.recipe.carbs = mealTargets.carbs;
        result.recipe.fat = mealTargets.fat;
        
        setRecipe(result.recipe);
          console.log('[RECIPE] Recipe set successfully');
        
        // Scroll to recipe
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 400, animated: true });
        }, 500);
      } else {
          console.error('[RECIPE] API returned error:', result.error);
        throw new Error(result.error || 'The AI failed to generate a recipe.');
        }
      } catch (apiErr) {
        console.error('[RECIPE] API call failed:', apiErr);
        console.error('[RECIPE] Error details:', apiErr.response ? JSON.stringify(apiErr.response.data) : 'No response data');
        throw apiErr;
      }
    } catch (err) {
      console.error('[RECIPE] Error:', err);
      if (err.response) {
        console.error('[RECIPE] Response error:', err.response.status, JSON.stringify(err.response.data));
      }
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      
      if (message.includes('need an active nutrition plan')) {
        Alert.alert(
          'Nutrition Plan Required', 
          'You need to create a nutrition plan before generating recipes. The recipe generator uses your nutritional targets to create personalized recipes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Create Plan', 
              onPress: () => router.push('/(main)/nutrition/plan-create') 
            }
          ]
        );
      } else {
        Alert.alert('Generation Failed', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Ref for scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            height: headerHeight, 
            opacity: headerOpacity,
            paddingTop: insets.top
          }
        ]}
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.headerContent}>
          <IconButton 
            icon="arrow-left" 
            iconColor={colors.textInverse} 
            onPress={() => router.back()} 
          />
          <Text style={styles.headerTitle}>Recipe Generator</Text>
          <IconButton 
            icon="information-outline" 
            iconColor={colors.textInverse} 
            onPress={() => Alert.alert('Info', 'Create personalized recipes based on ingredients you have and your nutritional goals.')} 
          />
        </View>
      </Animated.View>
      
      {/* Main Content */}
      <Animated.ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.heroImageContainer, { transform: [{ scale: imageScale }] }]}>
            <Image
              source={MEAL_TYPE_IMAGES[selectedMealType as keyof typeof MEAL_TYPE_IMAGES]}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
              style={styles.heroGradient}
            />
          </Animated.View>
          
          <View style={[styles.heroContent, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              onPress={() => router.push('/(main)/nutrition')}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>AI Recipe Generator</Text>
              <Text style={styles.heroSubtitle}>
                Create delicious meals with ingredients you have on hand
              </Text>
            </View>
          </View>
        </View>
        
        {/* Form Section */}
        <Surface style={styles.formContainer} elevation={4}>
          <Text style={styles.sectionTitle}>Create Your Recipe</Text>
          
          <Text style={styles.inputLabel}>What meal are you making?</Text>
          <View style={styles.mealTypeContainer}>
            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal}
                style={[
                  styles.mealTypeButton,
                  selectedMealType === meal && styles.selectedMealTypeButton
                ]}
                onPress={() => setSelectedMealType(meal)}
              >
                <LinearGradient
                  colors={selectedMealType === meal ? GRADIENTS.primary : GRADIENTS.transparent}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Text 
                  style={[
                    styles.mealTypeText,
                    selectedMealType === meal && styles.selectedMealTypeText
                  ]}
                >
                  {meal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.inputLabel}>What ingredients do you have?</Text>
          <TextInput
            placeholder="e.g., chicken breast, rice, broccoli, olive oil"
            value={ingredients}
            onChangeText={setIngredients}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.ingredientsInput}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            theme={{ roundness: theme.borderRadius.md }}
          />
          
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={handleGenerateRecipe}
            disabled={isLoading || !ingredients.trim()}
          >
            <LinearGradient
              colors={colors.gradients.primary as any}
              style={[StyleSheet.absoluteFill, { borderRadius: theme.borderRadius.md }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            {isLoading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <>
                <IconButton
                  icon="chef-hat"
                  iconColor={colors.textInverse}
                  size={24}
                  style={styles.buttonIcon}
                />
                <Text style={styles.generateButtonText}>Generate Recipe</Text>
              </>
            )}
          </TouchableOpacity>
        </Surface>
        
        {/* Loading State */}
        {isLoading && (
          <Surface style={styles.loadingContainer} elevation={4}>
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            <Text style={styles.loadingTitle}>Creating Your Recipe</Text>
            <Text style={styles.loadingSubtitle}>
              Our AI chef is crafting a delicious recipe just for you...
            </Text>
          </Surface>
        )}
        
        {/* Error State */}
        {error && !error.includes('need an active nutrition plan') && (
          <Surface style={styles.errorContainer} elevation={4}>
            <Avatar.Icon 
              size={60} 
              icon="alert-circle-outline" 
              color={colors.error}
              style={styles.errorIcon}
            />
            <Text style={styles.errorTitle}>Recipe Generation Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        )}
        
        {/* Recipe Result */}
        {recipe && (
          <Surface style={styles.recipeContainer} elevation={4}>
            {/* Recipe Header */}
            <View style={styles.recipeHeader}>
              <LinearGradient
                colors={colors.gradients.primary as any}
                style={styles.recipeHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.recipeName}>{recipe.recipe_name}</Text>
                <View style={styles.recipeActions}>
                  <IconButton
                    icon="content-save-outline"
                    iconColor={colors.textInverse}
                    size={24}
                    onPress={() => {
                      const saved = NutritionService.saveRecipe(recipe);
                      if (saved) {
                        Alert.alert('Recipe Saved!', 'Recipe has been saved to your collection.');
                      } else {
                        Alert.alert('Error', 'Failed to save recipe. Please try again.');
                      }
                    }}
                  />
                  <IconButton
                    icon="share-variant-outline"
                    iconColor={colors.textInverse}
                    size={24}
                    onPress={() => ShareService.showShareOptions(recipe)}
                  />
                </View>
              </LinearGradient>
            </View>
            
            {/* Nutritional Info */}
            <View style={styles.nutritionContainer}>
              <Text style={styles.nutritionTitle}>Nutritional Information</Text>
              
              <View style={styles.macrosContainer}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{recipe.calories}</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{recipe.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{recipe.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{recipe.fat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
              
              <View style={styles.macroDistribution}>
                <View style={[styles.macroBar, { backgroundColor: colors.fitness.protein, flex: proteinPercentage }]} />
                <View style={[styles.macroBar, { backgroundColor: colors.fitness.carbs, flex: carbsPercentage }]} />
                <View style={[styles.macroBar, { backgroundColor: colors.fitness.fat, flex: fatPercentage }]} />
              </View>
              
              <View style={styles.macroLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.fitness.protein }]} />
                  <Text style={styles.legendText}>Protein</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.fitness.carbs }]} />
                  <Text style={styles.legendText}>Carbs</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.fitness.fat }]} />
                  <Text style={styles.legendText}>Fat</Text>
                </View>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Detailed Ingredients List */}
            {recipe.ingredients && recipe.ingredients.length > 0 && recipe.ingredients[0].quantity_grams && (
              <View style={styles.detailedIngredientsContainer}>
                <Text style={styles.detailedIngredientsTitle}>Ingredient Breakdown</Text>
                
                {recipe.ingredients.map((ingredient: any, index: number) => (
                  <View key={index} style={styles.ingredientDetailCard}>
                    <View style={styles.ingredientHeader}>
                      <Text style={styles.ingredientName}>{ingredient.name}</Text>
                      <Text style={styles.ingredientQuantity}>{ingredient.quantity_display || `${ingredient.quantity_grams}g`}</Text>
                    </View>
                    
                    <View style={styles.ingredientMacros}>
                      <View style={styles.macroDetail}>
                        <Text style={styles.macroDetailValue}>{ingredient.calories || 0}</Text>
                        <Text style={styles.macroDetailLabel}>cal</Text>
                      </View>
                      <View style={styles.macroDetail}>
                        <Text style={styles.macroDetailValue}>{ingredient.protein_grams || 0}g</Text>
                        <Text style={styles.macroDetailLabel}>protein</Text>
                      </View>
                      <View style={styles.macroDetail}>
                        <Text style={styles.macroDetailValue}>{ingredient.carbs_grams || 0}g</Text>
                        <Text style={styles.macroDetailLabel}>carbs</Text>
                      </View>
                      <View style={styles.macroDetail}>
                        <Text style={styles.macroDetailValue}>{ingredient.fat_grams || 0}g</Text>
                        <Text style={styles.macroDetailLabel}>fat</Text>
                      </View>
                    </View>
                    
                    {ingredient.macro_summary && (
                      <Text style={styles.ingredientSummary}>{ingredient.macro_summary}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            <Divider style={styles.divider} />
            
            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Cooking Instructions</Text>
              
              {recipe.instructions.map((instruction: any, index: number) => {
                // Handle both old and new formats
                const isNewFormat = typeof instruction === 'object' && instruction.step && instruction.title;
                const stepText = isNewFormat ? instruction.title : instruction;
                const stepDetails = isNewFormat ? instruction.details : [];
                
                return (
                  <View key={index} style={styles.stepContainer}>
                    <View style={styles.stepNumberContainer}>
                      <LinearGradient
                        colors={colors.gradients.primary as any}
                        style={[StyleSheet.absoluteFill, { borderRadius: theme.borderRadius.round }]}
                      />
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepText}>{stepText}</Text>
                      {isNewFormat && stepDetails.length > 0 && (
                        <View style={styles.stepDetailsContainer}>
                          {stepDetails.map((detail: string, detailIndex: number) => (
                            <Text key={detailIndex} style={styles.stepDetailText}>• {detail}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            
            {/* Cooking Tips */}
            {recipe.cooking_tips && recipe.cooking_tips.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.cookingTipsContainer}>
                  <Text style={styles.cookingTipsTitle}>Chef's Tips</Text>
                  {recipe.cooking_tips.map((tip: string, index: number) => (
                    <View key={index} style={styles.tipContainer}>
                      <MaterialCommunityIcons name="lightbulb-outline" size={16} color={colors.primary} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            
            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <LinearGradient
                  colors={colors.gradients.primary as any}
                  style={[StyleSheet.absoluteFill, { borderRadius: theme.borderRadius.md }]}
                />
                <Text style={styles.actionButtonText}>Start Cooking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryActionButton]}
                onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
              >
                <Text style={styles.secondaryActionButtonText}>Create New Recipe</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        )}
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    height: 300,
    position: 'relative',
  },
  heroImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  heroContent: {
    position: 'relative',
    height: '100%',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 0 : theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: theme.spacing.sm,
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  heroTextContainer: {
    marginBottom: theme.spacing.xl,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textInverse,
    marginBottom: theme.spacing.xs,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textInverse,
    opacity: 0.9,
  },
  formContainer: {
    margin: theme.spacing.lg,
    marginTop: -theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    backgroundColor: colors.surface,
    ...theme.shadows.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: theme.spacing.sm,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  mealTypeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  selectedMealTypeButton: {
    borderColor: 'transparent',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  selectedMealTypeText: {
    color: colors.textInverse,
  },
  ingredientsInput: {
    backgroundColor: colors.surface,
    marginBottom: theme.spacing.lg,
  },
  generateButton: {
    height: 56,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonIcon: {
    margin: 0,
    height: 24,
  },
  generateButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: -theme.spacing.sm,
  },
  loadingContainer: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    ...theme.shadows.md,
  },
  loader: {
    marginBottom: theme.spacing.md,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.sm,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    ...theme.shadows.md,
  },
  errorIcon: {
    backgroundColor: colors.accentLight,
    marginBottom: theme.spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recipeContainer: {
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  recipeHeader: {
    overflow: 'hidden',
  },
  recipeHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  recipeName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textInverse,
    flex: 1,
  },
  recipeActions: {
    flexDirection: 'row',
  },
  nutritionContainer: {
    padding: theme.spacing.lg,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  macroLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  macroDistribution: {
    height: 8,
    flexDirection: 'row',
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  macroBar: {
    height: '100%',
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  instructionsContainer: {
    padding: theme.spacing.lg,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
    overflow: 'hidden',
  },
  stepNumber: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  actionButtonsContainer: {
    padding: theme.spacing.lg,
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    marginLeft: theme.spacing.md,
  },
  secondaryActionButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  // Enhanced recipe display styles
  detailedIngredientsContainer: {
    padding: theme.spacing.lg,
  },
  detailedIngredientsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  ingredientDetailCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  ingredientQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  ingredientMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  macroDetail: {
    alignItems: 'center',
  },
  macroDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  macroDetailLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ingredientSummary: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  stepDetailsContainer: {
    marginTop: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  stepDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  cookingTipsContainer: {
    padding: theme.spacing.lg,
  },
  cookingTipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
});

export default RecipeGeneratorScreen; 