import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false
      }}
    >
      <Stack.Screen 
        name="name" 
        options={{ 
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
          swipeEnabled: false,
          animationEnabled: true,
          gestureResponseDistance: 0,
          gestureVelocityImpact: 0,
          presentation: 'card',
          animationTypeForReplace: 'push'
        }} 
      />
      <Stack.Screen name="gender" />
      <Stack.Screen name="birthday" />
      <Stack.Screen name="height" />
      <Stack.Screen name="weight" />
      <Stack.Screen name="weight-trend" />
      <Stack.Screen name="exercise-frequency" />
      <Stack.Screen name="activity-level" />
      <Stack.Screen name="body-fat" />
      <Stack.Screen name="primary-goal" />
      <Stack.Screen name="fitness-strategy" />
      <Stack.Screen name="level" />
      <Stack.Screen name="analyzing" />
      <Stack.Screen name="analysis-results" />
      <Stack.Screen name="lifestyle-convincer" />
    </Stack>
  );
} 