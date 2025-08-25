import { LogBox } from 'react-native';

// Suppress Animated `useNativeDriver` warning
LogBox.ignoreLogs([
  'Animated: `useNativeDriver`',
  "Style property 'width' is not supported by native animated module"
]);

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '../src/styles/theme';
import { AuthProvider } from '../src/hooks/useAuth';
import { ServerStatusProvider } from '../src/contexts/ServerStatusContext';
import Toast from 'react-native-toast-message';
import { FontLoader } from '../src/components/ui/FontLoader';
import { initSentry } from '../src/services/monitoring/sentry';
import { initAnalytics } from '../src/services/analytics/analytics';
import { NutritionService } from '../src/services/nutrition/NutritionService';
import { WorkoutService } from '../src/services/workout/WorkoutService';

const InitialLayout = () => {
  return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      </Stack>
  )
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize data from AsyncStorage when app starts
    const initializeData = async () => {
      try {
        console.log('Initializing app data from storage...');
        
        // Load nutrition plans
        await NutritionService.initializeFromStorage();
        console.log('Nutrition data initialization complete');
        
        // Load workout plans with more detailed logging
        await WorkoutService.initializeFromStorage();
        console.log(`Workout data initialization complete. Loaded ${WorkoutService.getPlanCount()} plans.`);
      } catch (error) {
        console.error('Error initializing app data:', error);
      }
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      initSentry();
      initAnalytics();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <AuthProvider>
      <ServerStatusProvider>
        <PaperProvider theme={theme}>
          <FontLoader>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <InitialLayout />
            </GestureHandlerRootView>
            <Toast />
          </FontLoader>
        </PaperProvider>
      </ServerStatusProvider>
    </AuthProvider>
  );
} 