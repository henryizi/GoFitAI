import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
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
import { StatusBar } from 'expo-status-bar';
import { theme } from '../src/styles/theme';
import { AuthProvider } from '../src/hooks/useAuth';
import { ServerStatusProvider } from '../src/contexts/ServerStatusContext';
import { SubscriptionProvider } from '../src/contexts/SubscriptionContext';
import { TutorialProvider } from '../src/contexts/TutorialContext';
import { TutorialOverlay } from '../src/components/tutorial/TutorialOverlay';
import Toast from 'react-native-toast-message';
import { FontLoader } from '../src/components/ui/FontLoader';
import { initSentry } from '../src/services/monitoring/sentry';
import { initAnalytics } from '../src/services/analytics/analytics';
import { NutritionService } from '../src/services/nutrition/NutritionService';
import { WorkoutService } from '../src/services/workout/WorkoutService';
import { ImageOptimizer } from '../src/services/storage/imageOptimizer';
import { clearSafeImageCache } from '../src/components/ui/SafeImage';
import { RevenueCatService } from '../src/services/subscription/RevenueCatService';
import { NotificationInitializer } from '../src/services/notifications/NotificationInitializer';

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
        <Stack.Screen name="(onboarding)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(paywall)" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="(tutorial)" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
  )
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize data from AsyncStorage when app starts
    const initializeData = async () => {
      try {
        console.log('Initializing app data from storage...');
        
        // Clear image cache to force regeneration with new quality settings (guarded)
        try {
          await (ImageOptimizer?.clearCache?.());
        } catch (e) {
          console.log('ImageOptimizer.clearCache not available yet or failed; continuing');
        }
        
        // Also clear SafeImage component cache
        if (clearSafeImageCache) {
          clearSafeImageCache();
        }
        
        // Load nutrition plans
        await NutritionService.initializeFromStorage();
        console.log('Nutrition data initialization complete');
        
        // Note: Workout plans are loaded per-user when they authenticate
        // This avoids loading cached data from other users
        console.log('Workout data will be initialized per-user when authenticated.');

        // Initialize RevenueCat early in app lifecycle
        // This ensures it's ready before any components that need subscription status
        try {
          await RevenueCatService.initialize();
          console.log('RevenueCat initialization complete');
        } catch (error) {
          console.warn('RevenueCat initialization failed, will retry when needed:', error.message);
          // Don't block app startup if RevenueCat fails to initialize
        }

        // Initialize notification system
        try {
          await NotificationInitializer.initialize();
          console.log('Notification system initialization complete');
        } catch (error) {
          console.warn('Notification system initialization failed:', error.message);
          // Don't block app startup if notifications fail to initialize
        }
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
        <SubscriptionProvider>
          <TutorialProvider>
            <PaperProvider theme={theme}>
              <FontLoader>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <StatusBar style="auto" backgroundColor="transparent" translucent />
                  <InitialLayout />
                  <TutorialOverlay />
                </GestureHandlerRootView>
                <Toast />
              </FontLoader>
            </PaperProvider>
          </TutorialProvider>
        </SubscriptionProvider>
      </ServerStatusProvider>
    </AuthProvider>
  );
}