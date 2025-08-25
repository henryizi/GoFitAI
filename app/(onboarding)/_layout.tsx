import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="name" />
      <Stack.Screen name="gender" />
      <Stack.Screen name="birthday" />
      <Stack.Screen name="height" />
      <Stack.Screen name="weight" />
      <Stack.Screen name="weight-trend" />
      <Stack.Screen name="exercise-frequency" />
      <Stack.Screen name="activity-level" />
      <Stack.Screen name="body-fat" />
      <Stack.Screen name="fat-reduction" />
      <Stack.Screen name="muscle-gain" />
      <Stack.Screen name="level" />
    </Stack>
  );
} 