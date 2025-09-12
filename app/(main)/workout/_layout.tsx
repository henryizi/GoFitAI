import React from 'react';
import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="plans" />
      <Stack.Screen name="start-training" />
      <Stack.Screen name="plan-create" />
      <Stack.Screen name="plan/[planId]" />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="preview-plan" />
      <Stack.Screen name="clear-plans" />
      <Stack.Screen name="history" />
      <Stack.Screen name="history-session/[sessionId]" />
    </Stack>
  );
} 