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
      <Stack.Screen name="log-food" />
      <Stack.Screen name="food-result" />
      <Stack.Screen name="food-history" />
      <Stack.Screen name="insight/[insightId]" />
    </Stack>
  );
} 