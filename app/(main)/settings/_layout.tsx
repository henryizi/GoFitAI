import React from 'react';
import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="profile-premium" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy-security" />
      <Stack.Screen name="fitness-goals" />
      <Stack.Screen name="progression-settings" options={{ headerShown: true }} />
      <Stack.Screen name="app" />
    </Stack>
  );
} 