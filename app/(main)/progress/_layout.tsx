import React from 'react';
import { Stack } from 'expo-router';

export default function ProgressLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log-metrics" />
      <Stack.Screen name="photo-upload" />
    </Stack>
  );
} 