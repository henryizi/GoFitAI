import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { MealPreferenceService } from '../../../src/services/nutrition/MealPreferenceService';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#000000',
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
  lightGray: '#2C2C2E',
};

const MealPlanScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [mealPlan, setMealPlan] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mealRatings, setMealRatings] = useState<{[key: string]: 'liked' | 'disliked' | null}>({});

  // Load existing meal ratings
  const loadMealRatings = async (meals: any[]) => {
    if (!meals || meals.length === 0) return;
    
    const ratings: {[key: string]: 'liked' | 'disliked' | null} = {};
    
    for (const meal of meals) {
      const mealId = `${meal.meal_type}_${meal.meal_description}`;
      const rating = await MealPreferenceService.getMealRating(mealId, user?.id);
      ratings[mealId] = rating;
    }
    
    setMealRatings(ratings);
  };

  // Handle meal rating (like/dislike)
  const handleMealRating = async (meal: any, rating: 'liked' | 'disliked') => {
    const mealId = `${meal.meal_type}_${meal.meal_description}`;
    
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
        meal.meal_description,
        meal.meal_type,
        newRating,
        user?.id
      );
      
      if (success) {
        setMealRatings(prev => ({ ...prev, [mealId]: newRating }));
        
        // Show feedback to user
        Alert.alert(
          newRating === 'liked' ? '❤️ Liked!' : '👎 Disliked',
          `We'll remember your preference for this ${meal.meal_type.toLowerCase()} to improve future recommendations.`,
          [{ text: 'Got it', style: 'default' }]
        );
      }
    }
  };

  const fetchMealPlan = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // First check if we have a stored meal plan for today
      const todayString = date.toDateString();
      const storedMealPlan = await MealPreferenceService.getDailyMealPlan(user.id, todayString);
      
      if (storedMealPlan) {
        setMealPlan(storedMealPlan);
        await loadMealRatings(storedMealPlan);
        setIsLoading(false);
        return;
      }

      const activePlan = await NutritionService.getLatestNutritionPlan(user.id);
      if (!activePlan) {
        setMealPlan([]);
        return;
      }
      const formattedDate = date.toISOString().split('T')[0];
      const plan = await NutritionService.getMealPlanForDate(activePlan.id, formattedDate);
      setMealPlan(plan);
      
      // Load meal ratings for existing plan
      if (plan && plan.length > 0) {
        await loadMealRatings(plan);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch the meal plan.');
    } finally {
      setIsLoading(false);
    }
  }, [user, date]);

  // Generate a new meal plan
  const generateNewMealPlan = useCallback(async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const activePlan = await NutritionService.getLatestNutritionPlan(user.id);
      if (!activePlan) {
        Alert.alert('Error', 'No active nutrition plan found. Please create one first.');
        return;
      }

      const formattedDate = date.toISOString().split('T')[0];
      const newPlan = await NutritionService.generateMealPlanForDate(activePlan.id, formattedDate);
      
      if (newPlan && newPlan.length > 0) {
        // Store the new meal plan for today
        const todayString = date.toDateString();
        await MealPreferenceService.storeDailyMealPlan(user.id, todayString, newPlan);
        
        setMealPlan(newPlan);
        await loadMealRatings(newPlan);
        
        Alert.alert(
          '🍽️ New Meal Plan Generated!',
          'Your personalized meal plan for today is ready.',
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        Alert.alert('Error', 'Could not generate meal plan. Please try again.');
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      Alert.alert('Error', 'Could not generate meal plan. Please check your internet connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [user, date, loadMealRatings]);

  useFocusEffect(
    useCallback(() => {
      fetchMealPlan();
    }, [fetchMealPlan])
  );

  useEffect(() => {
    if (user) fetchMealPlan();
  }, [date, user]);

  const isToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
      someDate.getMonth() === today.getMonth() &&
      someDate.getFullYear() === today.getFullYear();
  };

  const handleGeneratePlan = async () => {
    if (!user) return;
    if (!isToday(date)) {
      Alert.alert('Cannot Generate', "You can only generate a meal plan for today.");
      return;
    }
    await generateNewMealPlan();
  };

  const changeDate = (amount: number) => {
    setDate(currentDate => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + amount);
      return newDate;
    });
  };

  const MacroPill = ({ icon, value, unit, color }) => (
    <View style={styles.macroPill}>
      <Icon name={icon} size={16} color={color} style={{ marginRight: 6 }} />
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
    </View>
  );

  const renderMealCard = (meal: any) => {
    const mealId = `${meal.meal_type}_${meal.meal_description}`;
    const currentRating = mealRatings[mealId];

    return (
      <LinearGradient
        key={meal.id}
        colors={[colors.lightGray, colors.darkGray]}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.mealType}>{meal.meal_type.replace('_', ' ').toUpperCase()}</Text>
          <View style={styles.ratingButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.ratingButton,
                currentRating === 'liked' && styles.likedButton
              ]}
              onPress={() => handleMealRating(meal, 'liked')}
            >
              <Icon 
                name="heart" 
                size={16} 
                color={currentRating === 'liked' ? colors.text : colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.ratingButton,
                currentRating === 'disliked' && styles.dislikedButton
              ]}
              onPress={() => handleMealRating(meal, 'disliked')}
            >
              <Icon 
                name="thumb-down" 
                size={16} 
                color={currentRating === 'disliked' ? colors.text : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.mealDescription}>{meal.meal_description}</Text>
        <View style={styles.macroContainer}>
          <MacroPill icon="fire" value={meal.calories} unit="kcal" color="#FF9500" />
          <MacroPill icon="food-drumstick" value={meal.protein_grams} unit="g" color="#34C759" />
          <MacroPill icon="bread-slice" value={meal.carbs_grams} unit="g" color="#FF2D55" />
          <MacroPill icon="oil" value={meal.fat_grams} unit="g" color="#FFD60A" />
        </View>
      </LinearGradient>
    );
  };
  
  const GradientButton = ({ onPress, title, loading, disabled }) => (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading}>
      <LinearGradient
        colors={disabled ? [colors.darkGray, colors.darkGray] : [colors.primary, colors.primaryDark]}
        style={[styles.button, disabled && {opacity: 0.5}]}
      >
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17021?q=80&w=2653&auto=format&fit=crop' }} 
        style={styles.backgroundImage}
      >
        <LinearGradient colors={['rgba(0,0,0,0.8)', colors.dark]} style={styles.overlay} />
      </ImageBackground>

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MEAL PLAN</Text>
      </View>
      
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Icon name="chevron-left" size={30} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.dateTextContainer}>
          <Text style={styles.dateText}>
            {date.toLocaleDateString('en-US', { weekday: 'long' })}
          </Text>
          <Text style={styles.subDateText}>
            {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Icon name="chevron-right" size={30} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
        ) : mealPlan && mealPlan.length > 0 ? (
          <>
            {mealPlan.map(renderMealCard)}
            {isToday(date) && (
              <View style={styles.generateNewContainer}>
                <Text style={styles.generateNewText}>Want a different meal plan?</Text>
                <GradientButton
                  onPress={handleGeneratePlan}
                  loading={isGenerating}
                  disabled={isGenerating}
                  title="Generate New Plan"
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="silverware-fork-knife" size={60} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No meal plan for this date.</Text>
            <Text style={styles.hintText}>
              {isToday(date)
                ? "Let's generate a delicious plan for you."
                : "Plans can only be generated for today."}
            </Text>
            {isToday(date) && (
              <GradientButton
                onPress={handleGeneratePlan}
                loading={isGenerating}
                disabled={isGenerating}
                title="Get Daily Meal Plan"
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  backgroundImage: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: { padding: 5 },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dateArrow: { padding: 10 },
  dateTextContainer: { alignItems: 'center' },
  dateText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  subDateText: { color: colors.textSecondary, fontSize: 14 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealType: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  mealDescription: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  macroValue: { color: colors.text, fontWeight: 'bold', fontSize: 14 },
  macroUnit: { color: colors.textSecondary, fontSize: 12, marginLeft: 4 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '30%',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  hintText: {
    marginTop: 10,
    marginBottom: 25,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  generateNewContainer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  generateNewText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default MealPlanScreen; 