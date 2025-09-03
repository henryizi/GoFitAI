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

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const RecipeGeneratorScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPremium, useRecipe, openPaywall } = useSubscription();
  const [ingredients, setIngredients] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Dinner');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [strictAI, setStrictAI] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [timeoutError, setTimeoutError] = useState(false);

  // Update the handleGenerateRecipe function to use strict AI mode
  const handleGenerateRecipe = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert('Missing Ingredients', 'Please enter some ingredients.');
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
    setRecipe(null);
    setUsedFallback(false);
    setTimeoutError(false);

    try {
      const activePlan = await NutritionService.getLatestNutritionPlan(user.id);
      if (!activePlan) {
        throw new Error('You need an active nutrition plan to generate recipes.');
      }
      const targetsHistory = await NutritionService.getHistoricalNutritionTargets(activePlan.id);
      const latestTargets = targetsHistory[0];
      if (!latestTargets) {
        throw new Error('Could not find your current nutritional targets.');
      }

      const mealTargetPercentages = {
        Breakfast: 0.25, Lunch: 0.35, Dinner: 0.3, Snack: 0.1,
      } as const;
      const percentage = (mealTargetPercentages as any)[selectedMealType] || 1 / MEAL_TYPES.length;

      const mealTargets = {
        calories: Math.round(latestTargets.daily_calories * percentage),
        protein: Math.round(latestTargets.protein_grams * percentage),
        carbs: Math.round(latestTargets.carbs_grams * percentage),
        fat: Math.round(latestTargets.fat_grams * percentage),
      };

      // Improved ingredient parsing - properly split by commas and clean each ingredient
      const ingredientsArray = ingredients
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);
      
      console.log('Parsed ingredients:', ingredientsArray);
      
      if (ingredientsArray.length === 0) {
        throw new Error('Please enter at least one ingredient separated by commas.');
      }

      // Use strict mode (true) to ensure we get AI-generated recipes only
      const result = await NutritionService.generateRecipe(selectedMealType, mealTargets, ingredientsArray, false);

      if (result.success) {
        const r = result.recipe;
        // Client-side quality validation
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
        
        // Enhanced synonym handling
        const synonyms: Record<string, string[]> = { 
          'yogurt': ['greek yogurt', 'plain yogurt', 'yoghurt'],
          'strawberry': ['strawberries', 'frozen strawberries', 'fresh strawberries'],
          'banana': ['bananas', 'fresh banana', 'ripe banana'],
          'rice': ['white rice', 'brown rice', 'cooked rice'],
          'chicken': ['chicken breast', 'chicken thigh', 'chicken pieces'],
          'beef': ['ground beef', 'beef steak', 'beef pieces'],
          'egg': ['eggs', 'egg whites', 'whole eggs'],
          'oat': ['oats', 'oatmeal', 'rolled oats'],
        };
        
        // Check if an ingredient is valid (direct match, synonym, or substring)
        const isValidIngredient = (ingredient: string): boolean => {
          const normIngredient = norm(ingredient);
          
          // Direct match
          if (ingredientsArray.some(i => norm(i) === normIngredient)) return true;
          
          // Synonym match
          for (const [base, synList] of Object.entries(synonyms)) {
            // Check if base is provided and ingredient is a synonym
            if (ingredientsArray.some(i => norm(i) === norm(base)) && synList.some(syn => normIngredient.includes(norm(syn)))) {
              return true;
            }
            
            // Check if synonym is provided and ingredient is the base
            if (synList.some(syn => ingredientsArray.some(i => norm(i) === norm(syn))) && normIngredient.includes(norm(base))) {
              return true;
            }
          }
          
          // Substring match (e.g., "chicken" in "chicken breast")
          for (const p of ingredientsArray.map(norm)) {
            if (p.includes(normIngredient) || normIngredient.includes(p)) {
              return true;
            }
          }
          
          return false;
        };
        
        const aiIngs = Array.isArray(r.ingredients) ? r.ingredients.map((i: any) => i.name || '') : [];
        const allSubset = aiIngs.every(isValidIngredient);

        // Detect no-cook scenario
        const hasBase = ingredientsArray.some((i) => /(rice|quinoa|oat|pasta|noodle|bread|tortilla|wrap|couscous|bulgur)/.test(norm(i)));
        const hasCookProtein = ingredientsArray.some((i) => /(chicken|beef|pork|tofu|tempeh|fish|salmon|tuna\b(?!\scanned)|shrimp|egg\b)/.test(norm(i)));
        const isNoCook = !hasBase && !hasCookProtein;
        
        // For the new format, we need to check instructions differently
        let hasBadNoCookSteps = false;
        if (Array.isArray(r.instructions)) {
          if (typeof r.instructions[0] === 'string') {
            // Old format - string array
            const instr = r.instructions.map((s: string) => norm(s));
            hasBadNoCookSteps = isNoCook && instr.some((s) => /(cook|steam|bake|boil)/.test(s));
          } else if (r.instructions[0] && Array.isArray(r.instructions[0].details)) {
            // New format - object with details array
            const allDetails = r.instructions.flatMap((step: any) => step.details || []);
            const normDetails = allDetails.map((s: string) => norm(s));
            hasBadNoCookSteps = isNoCook && normDetails.some((s) => /(cook|steam|bake|boil)/.test(s));
          }
        }

        if (!allSubset || hasBadNoCookSteps || aiIngs.length === 0) {
          throw new Error('The AI proposed an invalid recipe (wrong ingredients or steps). Please adjust your ingredients and try again.');
        }

        r.calories = mealTargets.calories;
        r.protein = mealTargets.protein;
        r.carbs = mealTargets.carbs;
        r.fat = mealTargets.fat;
        setRecipe(r);
        setUsedFallback(!!result.fallback);
      } else {
        throw new Error(result.error || 'The AI failed to generate a recipe.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      const isTimeout = message.includes('timed out') || message.includes('aborted') || message.includes('timeout');
      setTimeoutError(isTimeout);
      setError(message);
      if (message.includes('need an active nutrition plan')) {
        Alert.alert(
          'Nutrition Plan Required', 
          'You need to create a nutrition plan before generating recipes. The recipe generator uses your nutritional targets to create personalized recipes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Plan', onPress: () => router.push('/(main)/nutrition/plan-create') }
          ]
        );
      } else if (isTimeout) {
        Alert.alert(
          'Connection Timed Out',
          'The AI recipe generation is taking longer than expected. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Recipe Generation Failed', 
          'We could not generate a recipe with the provided ingredients. Please try again with different ingredients or check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
      setRetryCount(prev => prev + 1);
    }
  };

  const handleRetry = () => {
    handleGenerateRecipe();
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
        <Text style={styles.headerTitle}>AI Recipe Generator</Text>
        <IconButton
          icon="book-outline"
          iconColor={colors.text}
          onPress={() => router.push('/(main)/nutrition/saved-recipes')}
          accessibilityLabel="Review Saved Recipes"
        />
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!recipe && !isLoading && (
          <View>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>What meal are you making?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealTypeContainer}>
                {MEAL_TYPES.map((meal) => (
                  <TouchableOpacity
                    key={meal}
                    style={[styles.mealTypeButton, selectedMealType === meal && styles.selectedMealTypeButton]}
                    onPress={() => setSelectedMealType(meal)}
                  >
                    <Text style={[styles.mealTypeText, selectedMealType === meal && styles.selectedMealTypeText]}>
                      {meal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Text style={styles.inputLabel}>What ingredients do you have?</Text>
              <Text style={styles.inputSubLabel}>Separate each ingredient with a comma (e.g., chicken, rice, broccoli)</Text>
              <TextInput
                placeholder="e.g., chicken breast, rice, broccoli"
                value={ingredients}
                onChangeText={setIngredients}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.ingredientsInput}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                theme={{ colors: { onSurface: colors.text, background: colors.darkGray } }}
                textColor={colors.text}
              />
              
              {ingredients.trim() && (
                <View style={styles.ingredientChipsContainer}>
                  {ingredients
                    .split(',')
                    .map(i => i.trim())
                    .filter(i => i.length > 0)
                    .map((ingredient, index) => (
                      <View key={index} style={styles.ingredientChip}>
                        <Text style={styles.ingredientChipText}>{ingredient}</Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
            
            <TouchableOpacity onPress={handleGenerateRecipe} disabled={isLoading || !ingredients.trim()}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.generateButton}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <Icon name="chef-hat" size={20} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={styles.generateButtonText}>Generate Recipe</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Strict toggle removed: AI-only enforced */}
          </View>
        )}
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Creating Your Recipe</Text>
            <Text style={styles.loadingSubtitle}>
              Our AI chef is analyzing your ingredients and nutritional targets to craft a perfect recipe just for you...
            </Text>
            {/* Update the loading steps to be vertical */}
            <View style={styles.loadingSteps}>
              <View style={styles.loadingStep}>
                <Icon name="check-circle" size={16} color={colors.success} style={styles.loadingStepIcon} />
                <Text style={styles.loadingStepText}>Analyzing ingredients</Text>
              </View>
              <View style={styles.loadingStep}>
                <ActivityIndicator size="small" color={colors.primary} style={styles.loadingStepIcon} />
                <Text style={styles.loadingStepText}>Creating recipe</Text>
              </View>
              <View style={[styles.loadingStep, { opacity: 0.5 }]}>
                <Icon name="circle-outline" size={16} color={colors.textSecondary} style={styles.loadingStepIcon} />
                <Text style={[styles.loadingStepText, { color: colors.textSecondary }]}>Finalizing nutritional information</Text>
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
        
        {recipe && (
          <View style={styles.recipeContainer}>
            <View style={styles.recipeHeader}>
              <Text style={styles.recipeName}>{recipe.recipe_name}</Text>
              <View style={{ flexDirection: 'row' }}>
                <IconButton 
                  icon="content-save-outline" 
                  iconColor={colors.primary} 
                  size={24} 
                  onPress={() => {
                    const saved = NutritionService.saveRecipe(recipe);
                    if (saved) {
                      Alert.alert(
                        'Recipe Saved!', 
                        'You can view your saved recipes in the Saved Recipes section.',
                        [
                          { 
                            text: 'View Saved Recipes', 
                            onPress: () => router.push('/(main)/nutrition/saved-recipes') 
                          },
                          { text: 'OK', style: 'cancel' }
                        ]
                      );
                    } else {
                      Alert.alert('Error', 'Failed to save recipe. Please try again.');
                    }
                  }} 
                />
                <IconButton 
                  icon="share-variant-outline" 
                  iconColor={colors.primary} 
                  size={24} 
                  onPress={() => ShareService.showShareOptions(recipe)} 
                />
              </View>
            </View>

            {/* Fallback notice removed in AI-only mode */}

            {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
              <View style={styles.ingredientsCard}>
                <Text style={styles.cardTitle}>INGREDIENTS</Text>
                {recipe.ingredients.map((ing: any, idx: number) => (
                  <View key={idx} style={styles.ingredientItemRow}>
                    <View style={styles.ingredientBullet}>
                      <Icon name="circle-small" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.ingredientName}>
                      {ing.name}
                      {ing.macro_info ? <Text style={styles.macroInfo}> ({ing.macro_info})</Text> : null}
                    </Text>
                    <Text style={styles.ingredientQuantity}>
                      {ing.quantity_display || ing.quantity || '1 serving'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.nutritionCard}>
              <Text style={styles.cardTitle}>NUTRITIONAL INFO</Text>
              <View style={styles.macrosContainer}>
                <MacroPill label="Calories" value={recipe.calories} color={colors.primary} />
                <MacroPill label="Protein" value={`${recipe.protein}g`} color={colors.accent} />
                <MacroPill label="Carbs" value={`${recipe.carbs}g`} color={colors.secondary} />
                <MacroPill label="Fat" value={`${recipe.fat}g`} color={colors.mediumGray} />
              </View>
            </View>

            <View style={styles.instructionsCard}>
              <Text style={styles.cardTitle}>INSTRUCTIONS</Text>
              {Array.isArray(recipe.instructions) && recipe.instructions.map((instruction: any, index: number) => {
                // Handle both old format (string array) and new format (object array with step, title, details)
                if (typeof instruction === 'string') {
                  // Old format - simple string array
                  return (
                <View key={index} style={styles.stepContainer}>
                  <View style={styles.stepNumberContainer}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                      <Text style={styles.stepText}>{instruction}</Text>
                    </View>
                  );
                } else if (instruction.step && instruction.title && Array.isArray(instruction.details)) {
                  // New format - object with step, title, and details array
                  return (
                    <View key={index} style={styles.stepContainerNew}>
                      <View style={styles.stepHeader}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>{instruction.step}</Text>
                        </View>
                        <Text style={styles.stepTitle}>{instruction.title}</Text>
                      </View>
                      <View style={styles.stepDetails}>
                        {instruction.details.map((detail: string, detailIndex: number) => (
                          <View key={detailIndex} style={styles.stepDetailRow}>
                            <Icon name="minus" size={16} color={colors.primary} style={styles.detailBullet} />
                            <Text style={styles.stepDetailText}>{detail}</Text>
                </View>
              ))}
                      </View>
                    </View>
                  );
                }
                return null;
              })}
            </View>

            <TouchableOpacity onPress={() => setRecipe(null)} style={styles.newRecipeButton}>
                <Text style={styles.newRecipeButtonText}>Create Another Recipe</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
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
});

export default RecipeGeneratorScreen; 