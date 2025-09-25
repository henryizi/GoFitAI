import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useSubscription } from '../src/hooks/useSubscription';
import { colors } from '../src/styles/colors';
import { supabase } from '../src/services/supabase/client';

export default function Index() {
  const { session, profile, isLoading } = useAuth();
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();

  // Debug routing logic
  console.log('🔍 Routing Debug:', {
    hasSession: !!session,
    hasProfile: !!profile,
    isLoading,
    subscriptionLoading,
    isPremium,
    onboardingCompleted: profile?.onboarding_completed,
    profileData: profile ? {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      onboarding_completed: profile.onboarding_completed
    } : null
  });

  // If auth is disabled, skip login and go to dashboard
  if (!supabase) {
    console.error('🚨 AUTHENTICATION BYPASS ACTIVATED!');
    console.error('Supabase client is not initialized. User will be anonymous.');
    console.error('Check environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return <Redirect href="/(main)/dashboard" />;
  }

  if (isLoading || subscriptionLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    console.log('🔍 No session, redirecting to login');
    return <Redirect href="/login" />;
  }

  // If we have a session but no profile, wait for profile to load
  if (session && !profile) {
    console.log('🔍 Session exists but no profile yet, showing loading...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If we have both session and profile, check onboarding status
  if (session && profile && !profile.onboarding_completed) {
    console.log('🔍 User needs onboarding, redirecting to onboarding');
    return <Redirect href="/(onboarding)/name" />;
  }

  // DEVELOPMENT BYPASS: Skip paywall during development
  const isDevelopment = __DEV__; // This will be true in development builds
  const bypassPaywall = isDevelopment; // Set to true to bypass paywall for development

  // If onboarding is completed but user is not premium, show paywall (unless in development)
  if (session && profile && profile.onboarding_completed && !isPremium && !bypassPaywall) {
    console.log('🔍 User completed onboarding but not premium, redirecting to paywall');
    return <Redirect href="/paywall" />;
  }

  // Development bypass message
  if (bypassPaywall) {
    console.log('🚀 DEVELOPMENT MODE: Paywall bypassed - user can access full app');
  }

  // User is premium and onboarded, redirect to dashboard
  console.log('🔍 User session exists, profile loaded, and is premium - redirecting to dashboard');
  return <Redirect href="/(main)/dashboard" />;
}