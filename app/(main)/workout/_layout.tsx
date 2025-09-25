import React from 'react';
import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="plans" />
      <Stack.Screen name="start-training" />
      <Stack.Screen name="plan-create" />
      <Stack.Screen name="custom-builder" />
      <Stack.Screen name="plan/[planId]" />
      <Stack.Screen name="plan/edit/[planId]" />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="session/[sessionId]" />
      <Stack.Screen name="session/[sessionId]-premium" />
      <Stack.Screen name="session/edit/[sessionId]" />
      <Stack.Screen name="preview-plan" />
      <Stack.Screen name="clear-plans" />
      <Stack.Screen name="history" />
      <Stack.Screen name="history-session/[sessionId]" />
    </Stack>
  );
} 