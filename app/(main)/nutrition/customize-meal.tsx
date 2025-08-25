import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Text,
  useTheme,
  RadioButton,
  Divider,
} from 'react-native-paper';

import { NutritionService } from '../../../src/services/nutrition/NutritionService';

const extractIngredientsFromMeal = (
  mealDescription: string,
  foodSuggestions: any
): string[] => {
  if (!mealDescription || !foodSuggestions) return [];

  const allFoods = [
    ...(foodSuggestions.protein || []),
    ...(foodSuggestions.carbohydrates || []),
    ...(foodSuggestions.fat || []),
  ].map((item) => item.food);

  const foundIngredients = allFoods.filter((food) =>
    new RegExp(`\\b${food}\\b`, 'i').test(mealDescription)
  );

  return [...new Set(foundIngredients)];
};

const CustomizeMealScreen = () => {
  const theme = useTheme();
  const {
    planId: planIdParam,
    meal: mealString,
    foodSuggestions: foodSuggestionsString,
  } = useLocalSearchParams();

  const planId = planIdParam as string;
  const meal = JSON.parse(mealString as string);
  const foodSuggestions = JSON.parse(foodSuggestionsString as string);

  const [ingredientToReplace, setIngredientToReplace] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState<string>('');
  const [isCustomizing, setIsCustomizing] = useState(false);

  const potentialIngredients = useMemo(
    () => extractIngredientsFromMeal(meal.meal, foodSuggestions),
    [meal.meal, foodSuggestions]
  );

  const allFoodSuggestions = useMemo(
    () => [
      ...foodSuggestions.protein,
      ...foodSuggestions.carbohydrates,
      ...foodSuggestions.fat,
    ],
    [foodSuggestions]
  );

  const handleCustomize = async () => {
    if (!ingredientToReplace || !newIngredient) {
      Alert.alert(
        'Selection Missing',
        'Please select both an ingredient to replace and a new ingredient.'
      );
      return;
    }
    setIsCustomizing(true);
    try {
      const newMealDescription = await NutritionService.customizeMeal(
        meal.meal,
        meal.macros,
        ingredientToReplace,
        newIngredient
      );

      await NutritionService.updateMeal(
        planId,
        meal.time_slot,
        newMealDescription
      );

      Alert.alert(
        'Success',
        'Your meal has been updated successfully.',
        [{ text: 'OK', onPress: () => router.push('/(main)/nutrition') }]
      );
    } catch (error) {
      console.error('--- MEAL CUSTOMIZATION FAILED ---');
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      Alert.alert('Error', `Failed to customize meal: ${message}`);
    } finally {
      setIsCustomizing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.push('/(main)/nutrition')} />
        <Appbar.Content title="Customize Meal" />
      </Appbar.Header>

      <ScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Original Meal:</Text>
            <Text variant="bodyLarge" style={styles.mealText}>
              {meal.meal}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Step 1: Select Ingredient to Replace
            </Text>
            <RadioButton.Group
              onValueChange={setIngredientToReplace}
              value={ingredientToReplace}>
              {potentialIngredients.map((ingredient) => (
                <RadioButton.Item
                  key={ingredient}
                  label={ingredient}
                  value={ingredient}
                  style={styles.radioItem}
                />
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.stepTitle}>
              Step 2: Choose a New Ingredient
            </Text>
            <RadioButton.Group
              onValueChange={setNewIngredient}
              value={newIngredient}>
              {allFoodSuggestions.map((item, index) => (
                <View key={item.food}>
                  <RadioButton.Item
                    label={item.food}
                    value={item.food}
                    style={styles.radioItem}
                  />
                  {index < allFoodSuggestions.length - 1 && <Divider />}
                </View>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleCustomize}
          loading={isCustomizing}
          disabled={isCustomizing}
          style={styles.button}>
          {isCustomizing ? 'Updating Meal...' : 'Confirm & Update Meal'}
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
  },
  mealText: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#555',
  },
  stepTitle: {
    marginBottom: 12,
  },
  radioItem: {
    paddingVertical: 4,
  },
  button: {
    margin: 16,
    paddingVertical: 8,
  },
});

export default CustomizeMealScreen; 