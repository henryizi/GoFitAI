import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTutorial } from '../../src/contexts/TutorialContext';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/styles/colors';

export default function TutorialScreen() {
  const { startTutorial, state } = useTutorial();
  const { profile, refreshProfile } = useAuth();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Refresh profile to ensure we have latest tutorial_completed status
    // This is just for logging, routing is handled by app/index.tsx
    if (refreshProfile) {
      refreshProfile().then((refreshedProfile) => {
        console.log('[Tutorial] Profile refreshed, tutorial_completed:', refreshedProfile?.tutorial_completed);
      });
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Only start tutorial once
    if (hasStartedRef.current) {
      return;
    }

    // Only start tutorial if profile is loaded and tutorial hasn't been completed
    // Note: Routing logic is handled by app/index.tsx, so if we're here, tutorial should start
    if (profile !== null && profile !== undefined) {
      hasStartedRef.current = true;
      // Start the interactive tutorial when this screen loads
      // Add a small delay to ensure the screen is mounted
      const timer = setTimeout(() => {
        console.log('[Tutorial] Starting tutorial...');
        console.log('[Tutorial] Current profile state:', { 
          tutorial_completed: profile?.tutorial_completed,
          profileId: profile?.id 
        });
        startTutorial();
      }, 300); // Increased delay to allow profile refresh
      
      return () => clearTimeout(timer);
    }
  }, [startTutorial, profile]);

  // If tutorial is active, we can show a message
  // The overlay will handle the actual tutorial display
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {state.isActive ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Starting tutorial...</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        </View>
      ) : (
        <ActivityIndicator size="large" color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
  },
  messageText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

