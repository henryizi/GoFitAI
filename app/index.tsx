import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/styles/colors';
import { supabase } from '../src/services/supabase/client';

export default function Index() {
  const { session, profile, isLoading } = useAuth();

  // If auth is disabled, skip login and go to dashboard
  if (!supabase) {
    console.error('🚨 AUTHENTICATION BYPASS ACTIVATED!');
    console.error('Supabase client is not initialized. User will be anonymous.');
    console.error('Check environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return <Redirect href="/(main)/dashboard" />;
  }

    if (isLoading) {
  return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
    }

    if (!session) {
        return <Redirect href="/login" />;
    }

  if (session && profile && !profile.onboarding_completed) {
    return <Redirect href="/(onboarding)/name" />;
}

  return <Redirect href="/(main)/dashboard" />;
} 