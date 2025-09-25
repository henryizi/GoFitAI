import { Stack } from 'expo-router';
import React from 'react';

export default function NutritionStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="plan-create" />
      <Stack.Screen name="plan-create-manual" />
      <Stack.Screen name="plan-create-mathematical" />
      <Stack.Screen name="plan-type-selection" />
      <Stack.Screen name="plan-create-new" />
      <Stack.Screen name="plan-test" />
      <Stack.Screen name="ai-chat" />
      <Stack.Screen name="log-food" />
      <Stack.Screen name="recipe-generator" />
      <Stack.Screen name="recipe-generator-simple" />
      <Stack.Screen name="recipe-generator-new" />
      <Stack.Screen name="food-result" />
      <Stack.Screen name="meal-plan" />
      <Stack.Screen name="customize-meal" />
      <Stack.Screen name="saved-recipes" />
    </Stack>
  );
} 