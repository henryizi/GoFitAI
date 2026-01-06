import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useSubscription } from '../src/hooks/useSubscription';
import { colors } from '../src/styles/colors';
import { supabase } from '../src/services/supabase/client';
import { AnimatedSplashScreen } from '../src/components/ui/AnimatedSplashScreen';

export default function Index() {
  const { session, profile, isLoading, refreshProfile, user } = useAuth();
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const [animationDone, setAnimationDone] = useState(false);
  const [forceProceed, setForceProceed] = useState(false);
  const [profileRetryAttempted, setProfileRetryAttempted] = useState(false);
  const [retriesFinished, setRetriesFinished] = useState(false);
  const [linkedAccountWaitTime, setLinkedAccountWaitTime] = useState(0);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [finalVerificationDone, setFinalVerificationDone] = useState(false);
  const [profileFoundDuringVerification, setProfileFoundDuringVerification] = useState(false);

  // Safety timeout: Force proceed after reasonable time (optimized for faster startup)
  useEffect(() => {
    // Quick timeout - 2 seconds max wait time for loading
    const timeoutMs = 2000;
    
    const timer = setTimeout(() => {
      if (isLoading || subscriptionLoading) {
        setForceProceed(true);
      }
    }, timeoutMs);

    // Reset forceProceed when loading completes normally
    if (!isLoading && !subscriptionLoading) {
      setForceProceed(false);
    }

    return () => clearTimeout(timer);
  }, [isLoading, subscriptionLoading]);


  // If we have a session but no profile, try refreshing once before assuming new user
  useEffect(() => {
    if (session && !profile && !isLoading && !profileRetryAttempted && refreshProfile) {
      setProfileRetryAttempted(true);
      
      // Single quick retry
      refreshProfile().then(refreshedProfile => {
        if (refreshedProfile) {
          console.log('✅ Profile found on retry');
        } else {
          console.log('📝 No profile found - new user');
        }
        setRetriesFinished(true);
      }).catch(() => {
        setRetriesFinished(true);
      });
    }
  }, [session, profile, isLoading, profileRetryAttempted, refreshProfile]);

  // Reset linked account wait time and retry count when profile loads or session changes
  useEffect(() => {
    if (profile || !session) {
      setLinkedAccountWaitTime(0);
      setProfileRetryCount(0);
      setFinalVerificationDone(false);
      // Reset retry attempted flag when profile loads so we can retry again if needed
      if (profile) {
        setProfileRetryAttempted(false);
        setRetriesFinished(false);
      }
    }
  }, [profile, session]);

  // Final verification: Quick database check before redirecting to onboarding
  useEffect(() => {
    if (session && !profile && profileRetryAttempted && !finalVerificationDone && user?.id) {
      // Quick final check with short timeout
      const verifyProfile = async () => {
        const maxTimeout = setTimeout(() => {
          setFinalVerificationDone(true);
        }, 3000); // Max 3 seconds

        try {
          const { data: profileData } = await Promise.race([
            supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
            new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 2000))
          ]);

          if (profileData) {
            // Profile exists - refresh to load it
            const finalProfile = await Promise.race([
              refreshProfile(),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
            ]);
            if (finalProfile) {
              setProfileFoundDuringVerification(true);
            }
          }
          setFinalVerificationDone(true);
        } catch {
          setFinalVerificationDone(true);
        } finally {
          clearTimeout(maxTimeout);
        }
      };

      verifyProfile();
    }
  }, [session, profile, profileRetryAttempted, finalVerificationDone, user?.id, refreshProfile]);

  // Timeout to force navigation if profile is still null
  useEffect(() => {
    if (session && !profile && profileRetryAttempted) {
      const isLinkedAccount = session.user.identities && session.user.identities.length > 1;
      // Quick timeout: 5s for linked accounts, 3s for regular
      const maxWaitTime = isLinkedAccount ? 5000 : 3000;
      
      const timeoutId = setTimeout(() => {
        setLinkedAccountWaitTime(maxWaitTime);
      }, maxWaitTime);
      
      return () => clearTimeout(timeoutId);
    }
  }, [session, profile, profileRetryAttempted]);

  // Debug routing logic (minimal logging)
  if (__DEV__) {
    console.log('🔍 Routing:', { session: !!session, profile: !!profile, loading: isLoading });
  }

  // If auth is disabled, skip login and go to dashboard
  if (!supabase) {
    console.error('🚨 AUTHENTICATION BYPASS ACTIVATED!');
    console.error('Supabase client is not initialized. User will be anonymous.');
    console.error('Check environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return <Redirect href="/(main)/dashboard" />;
  }

  // Show loading screen only if loading and not forced to proceed
  if (((isLoading || subscriptionLoading || (session && !user?.id)) && !forceProceed) || !animationDone) {
    return <AnimatedSplashScreen onAnimationFinish={() => setAnimationDone(true)} />;
  }

  if (!session) {
    console.log('🔍 No session, redirecting to login');
    return <Redirect href="/login" />;
  }

  // If we have a session but no profile, this could be a new user from social sign-in
  // Give it a moment to load, but if it's truly a new user, redirect to onboarding
  // IMPORTANT: For linked accounts, wait longer before assuming new user
  // Also check if profile was found during final verification (even if React state hasn't updated yet)
  if (session && !profile && profileRetryAttempted) {
    const isLinkedAccount = session.user.identities && session.user.identities.length > 1;
    
    // If profile was found during final verification, don't redirect to onboarding
    // The profile state should update soon, so wait a bit longer
    if (profileFoundDuringVerification) {
      console.log('🔍 Profile was found during verification - waiting for state to update...');
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    // Wait for retries to finish if they are still running
    if (!retriesFinished) {
       console.log('⏳ Still retrying profile fetch...');
       return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    if (isLinkedAccount && linkedAccountWaitTime === 0) {
      // For linked accounts, give extra time - profile might still be loading
      // This prevents redirecting to onboarding when account is actually linked
      // But we have a timeout (linkedAccountWaitTime) to prevent infinite waiting
      console.log('🔍 Linked account detected - waiting a bit longer for profile to sync...');
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    // Either not a linked account, or we've waited long enough for linked account
    // Only redirect if final verification is done (or skipped for non-linked accounts)
    if (!isLinkedAccount || finalVerificationDone) {
      console.log('🔍 Session exists but no profile after ALL retries - redirecting to onboarding for new user');
      return <Redirect href="/(onboarding)/name" />;
    }
    
    // For linked accounts, wait for final verification to complete
    console.log('🔍 Waiting for final verification to complete before redirecting...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  // If session exists but no profile yet (and retry not attempted), wait a moment
  // The useEffect above will trigger the retry automatically
  if (session && !profile && !profileRetryAttempted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // DEVELOPMENT BYPASS: Skip paywall during development
  const isDevelopment = __DEV__; // This will be true in development builds
  const bypassPaywall = false; // DISABLED FOR REAL PURCHASE TESTING
  
  // FORCE ONBOARDING: Allow forcing onboarding even for premium users (for testing)
  // Set this to true to test onboarding flow even if user is premium
  const forceOnboarding = false; // Set to true to force onboarding regardless of premium status
  
  // FORCE PAYWALL TESTING: Allow testing paywall even for premium users (for testing)
  // Set this to true to test paywall flow even if user is premium
  const forcePaywallTesting = true; // ENABLED FOR TESTING - Force paywall to appear

  // CRITICAL: Check premium status FIRST - Premium users should NEVER see onboarding or paywall
  // This ensures existing subscribed/lifetime users won't be forced through onboarding again
  // even if onboarding_completed flag is somehow false or profile hasn't fully loaded
  // UNLESS forceOnboarding is true (for testing purposes)
  if (session && profile && isPremium && !forceOnboarding && !forcePaywallTesting) {
    console.log('✅ User is premium - skipping onboarding and paywall');
    // Check if tutorial has been completed
    // tutorial_completed is null by default, so we check if it's explicitly false or null
    if (profile.tutorial_completed === false || profile.tutorial_completed === null) {
      console.log('🔍 User is premium but tutorial not completed, redirecting to tutorial');
      console.log('🔍 Tutorial status:', { tutorial_completed: profile.tutorial_completed, isPremium });
      return <Redirect href="/(tutorial)" />;
    }
    
    // Tutorial completed, redirect to dashboard
    console.log('🔍 User is premium and tutorial completed - redirecting to dashboard');
    return <Redirect href="/(main)/dashboard" />;
  }

  // If user is NOT premium OR forceOnboarding is true, then check onboarding status
  // If we have both session and profile, check onboarding status
  if (session && profile && !profile.onboarding_completed) {
    console.log('🔍 User needs onboarding, redirecting to onboarding');
    return <Redirect href="/(onboarding)/name" />;
  }

  // If onboarding is completed but user is not premium (or forcePaywallTesting is true), redirect to paywall
  // IMPORTANT: Wait for subscription loading to complete before making routing decision
  if (session && profile && profile.onboarding_completed && (!isPremium || forcePaywallTesting) && !bypassPaywall) {
    // If subscription is still loading, wait for it to complete
    // This ensures we don't redirect to paywall before RevenueCat has finished checking premium status
    if (subscriptionLoading) {
      console.log('🔍 Waiting for subscription status to load...', { 
        isPremium,
        subscriptionLoading,
        userId: user?.id
      });
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    // Double-check premium status now that loading is complete
    // Sometimes RevenueCat takes a moment to sync after user login
    if (isPremium && !forcePaywallTesting) {
      console.log('🔍 User is premium (checked after subscription loading), redirecting to dashboard');
      // Check if tutorial has been completed
      if (profile.tutorial_completed === false || profile.tutorial_completed === null) {
        console.log('🔍 User is premium but tutorial not completed, redirecting to tutorial');
        return <Redirect href="/(tutorial)" />;
      }
      return <Redirect href="/(main)/dashboard" />;
    }
    
    // User is not premium - redirect to paywall (no free tier access)
    console.log('🔍 User completed onboarding but not premium, redirecting to paywall');
    console.log('🎯 About to redirect to /(paywall)');
    return <Redirect href="/(paywall)" />;
  }

  // Development bypass message
  if (bypassPaywall) {
    console.log('🚀 DEVELOPMENT MODE: Paywall bypassed - user can access full app');
  }

  // Fallback (shouldn't reach here, but just in case)
  console.log('🔍 Fallback: User session exists, profile loaded - redirecting to dashboard');
  return <Redirect href="/(main)/dashboard" />;
}
