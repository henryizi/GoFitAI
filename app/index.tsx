import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useSubscription } from '../src/hooks/useSubscription';
import { colors } from '../src/styles/colors';
import { supabase } from '../src/services/supabase/client';
import { hasSkippedPaywall } from '../src/utils/paywallSkip';

export default function Index() {
  const { session, profile, isLoading, refreshProfile, user } = useAuth();
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const [forceProceed, setForceProceed] = useState(false);
  const [profileRetryAttempted, setProfileRetryAttempted] = useState(false);
  const [retriesFinished, setRetriesFinished] = useState(false);
  const [hasSkipped, setHasSkipped] = useState<boolean | null>(null);
  const [linkedAccountWaitTime, setLinkedAccountWaitTime] = useState(0);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [finalVerificationDone, setFinalVerificationDone] = useState(false);
  const [profileFoundDuringVerification, setProfileFoundDuringVerification] = useState(false);

  // Safety timeout: Force proceed after reasonable time
  useEffect(() => {
    // If auth is done but subscription is still loading, wait max 6 seconds
    // If both are loading, wait max 10 seconds
    const timeoutMs = !isLoading && subscriptionLoading ? 6000 : 10000;
    
    const timer = setTimeout(() => {
      if (isLoading || subscriptionLoading) {
        console.warn(`⏰ Loading timeout: Forcing app to proceed after ${timeoutMs}ms`);
        console.warn(`   Auth loading: ${isLoading}, Subscription loading: ${subscriptionLoading}`);
        setForceProceed(true);
      }
    }, timeoutMs);

    // Reset forceProceed when loading completes normally
    if (!isLoading && !subscriptionLoading) {
      setForceProceed(false);
    }

    return () => clearTimeout(timer);
  }, [isLoading, subscriptionLoading]);

  // Check if user has skipped paywall
  useEffect(() => {
    if (user?.id) {
      hasSkippedPaywall(user.id).then(setHasSkipped).catch(() => setHasSkipped(false));
    } else {
      setHasSkipped(false);
    }
  }, [user?.id]);

  // If we have a session but no profile, try refreshing multiple times before assuming new user
  // This handles cases where profile refresh timed out but data exists in database
  // For linked accounts, retry more aggressively since Supabase needs time to sync
  useEffect(() => {
    if (session && !profile && !isLoading && !profileRetryAttempted && refreshProfile) {
      console.log('🔄 Session exists but no profile - attempting profile refresh retry...');
      
      // Check if this is a linked account (has multiple identities)
      // Linked accounts need more time for Supabase to sync
      const isLinkedAccount = session.user.identities && session.user.identities.length > 1;
      const maxRetries = isLinkedAccount ? 5 : 1; // Retry 5 times for linked accounts, 1 for others
      
      if (isLinkedAccount) {
        console.log('🔗 Linked account detected - will retry profile fetch multiple times');
      }
      
      setProfileRetryAttempted(true);
      
      // Retry profile fetching multiple times for linked accounts
      const retryProfileFetch = async () => {
        for (let i = 0; i < maxRetries; i++) {
          setProfileRetryCount(i + 1);
          console.log(`🔄 Profile retry attempt ${i + 1}/${maxRetries}...`);
          
          try {
            const refreshedProfile = await refreshProfile();
            if (refreshedProfile) {
              console.log(`✅ Profile found on attempt ${i + 1}!`);
              setProfileRetryCount(0); // Reset counter
              return;
            }
            
            // If no profile found and we have more retries, wait before next attempt
            if (i < maxRetries - 1) {
              const waitTime = isLinkedAccount ? 1000 : 500; // Wait 1s for linked accounts, 500ms for others
              console.log(`⏳ Profile not found, waiting ${waitTime}ms before retry ${i + 2}...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          } catch (error: any) {
            console.warn(`⚠️ Profile retry attempt ${i + 1} failed:`, error.message);
            // Wait before retry even on error
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        console.log(`✅ Profile retry completed after ${maxRetries} attempts - no profile found (new user)`);
        setProfileRetryCount(0);
        setRetriesFinished(true);
      };
      
      retryProfileFetch().catch((error) => {
        console.warn('⚠️ Profile retry process failed:', error.message);
        setProfileRetryCount(0);
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

  // Final verification: Direct database check before redirecting to onboarding
  // This catches cases where profile exists but wasn't found due to timing/RLS issues
  useEffect(() => {
    if (session && !profile && profileRetryAttempted && !finalVerificationDone && user?.id) {
      const isLinkedAccount = session.user.identities && session.user.identities.length > 1;
      
      // For linked accounts, do final verification after wait time expires
      // For regular accounts, do it immediately after retry completes
      const shouldVerify = isLinkedAccount ? linkedAccountWaitTime > 0 : true;
      
      if (shouldVerify) {
        console.log('🔍 [Final Verification] Doing direct database check before redirecting to onboarding...');
        console.log('   User ID:', user.id);
        console.log('   Is linked account:', isLinkedAccount);
        
        // Direct database query with timeout
        // Wrap entire verification in a max timeout to prevent infinite waiting
        const verifyProfile = async () => {
          const maxTimeoutId = setTimeout(() => {
            console.warn('   ⚠️ Verification exceeded maximum time (8s) - forcing completion');
            setFinalVerificationDone(true);
          }, 8000); // Max 8 seconds total for entire verification
          
          let timeoutId: NodeJS.Timeout | null = null;
          try {
            // First, verify session is properly authenticated
            console.log('   → Verifying session before query...');
            
            // USE EXISTING SESSION FROM CONTEXT INSTEAD OF AWAITING getSession()
            // getSession() can hang on Android/iOS after social login
            const currentSession = session;
            
            if (!currentSession) {
              console.error('   ❌ No active session found!');
              setFinalVerificationDone(true);
              return;
            }
            
            const authUid = currentSession.user?.id;
            console.log('   → Session verified:', {
              hasSession: !!currentSession,
              authUid: authUid,
              queryUserId: user.id,
              match: authUid === user.id ? '✅ YES' : '❌ NO - RLS will block!'
            });
            
            // Check if auth.uid() matches user.id (critical for RLS)
            if (authUid !== user.id) {
              console.warn('   ⚠️ [RLS WARNING] auth.uid() mismatch detected!');
              console.warn('   → RLS policy requires: auth.uid() = id');
              console.warn('   → But auth.uid() =', authUid);
              console.warn('   → Query userId =', user.id);
              console.warn('   → This query will be blocked by RLS policy');
              console.warn('   → Waiting for session to sync...');
              
              // Wait briefly for session to sync (for linked accounts) - reduced timeout
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Retry session check
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              const retryAuthUid = retrySession?.user?.id;
              
              if (retryAuthUid !== user.id) {
                console.error('   ❌ Session still mismatched after retry - RLS will block query');
                console.error('   → Proceeding anyway, but query will likely fail');
              } else {
                console.log('   ✅ Session synced! auth.uid() now matches');
              }
            }
            
            console.log('   → Querying profiles table directly...');
            console.log('   → Query userId:', user.id);
            
            // Create query promise
            const queryPromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
            // Race query against timeout (2 seconds - fast enough for users, long enough for normal queries)
            const timeoutPromise = new Promise<{ data: null; error: { message: string; code: string } }>((resolve) => {
              timeoutId = setTimeout(() => {
                console.log('   ⏰ Query timeout after 2 seconds');
                resolve({ data: null, error: { message: 'Query timeout', code: 'TIMEOUT' } });
              }, 2000);
            });
            
            console.log('   → Waiting for query result (max 2 seconds)...');
            const result = await Promise.race([
              queryPromise,
              timeoutPromise
            ]);
            
            // Clear timeout if query completed first
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            console.log('   → Query result received:', {
              hasData: !!(result as any)?.data,
              hasError: !!(result as any)?.error,
              errorCode: (result as any)?.error?.code,
              errorMessage: (result as any)?.error?.message
            });
            
            const { data: profileData, error: queryError } = result as any;
            
            if (queryError && queryError.code !== 'TIMEOUT') {
              console.error('   ❌ Final verification query error:', queryError.message);
              console.error('   Error code:', queryError.code);
              console.error('   Error details:', queryError.details);
              console.error('   Error hint:', queryError.hint);
              
              // Check for RLS-related errors
              const isRLSError = 
                queryError.code === 'PGRST301' || 
                queryError.code === '42501' || // PostgreSQL permission denied
                queryError.message?.toLowerCase().includes('rls') ||
                queryError.message?.toLowerCase().includes('row level security') ||
                queryError.message?.toLowerCase().includes('permission denied') ||
                queryError.message?.toLowerCase().includes('policy');
              
              if (isRLSError) {
                console.warn('   ⚠️ [RLS ERROR] Row Level Security policy blocked the query!');
                console.warn('   → This usually means:');
                console.warn('     1. auth.uid() does not match the profile id');
                console.warn('     2. Session is not properly authenticated');
                console.warn('     3. RLS policies are misconfigured');
                console.warn('   → Trying refreshProfile() as fallback...');
                
                // Try refreshProfile immediately (no delay to keep things fast)
                try {
                  const finalProfile = await Promise.race([
                    refreshProfile(),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)) // 1.5s timeout
                  ]);
                  
                  if (finalProfile) {
                    console.log('   ✅ Profile found on refreshProfile() after RLS error!');
                    setProfileFoundDuringVerification(true);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    setFinalVerificationDone(true);
                    return;
                  } else {
                    console.warn('   ⚠️ Profile still not found after RLS error - likely new user');
                  }
                } catch (refreshError: any) {
                  console.error('   ❌ refreshProfile() error after RLS error:', refreshError.message);
                }
              }
              
              // Mark verification as done even on error so we can proceed
              setFinalVerificationDone(true);
              return;
            }
            
            if (queryError && queryError.code === 'TIMEOUT') {
              console.warn('   ⏰ Query timed out after 2 seconds');
              console.warn('   → Possible causes:');
              console.warn('     1. Network connectivity issue');
              console.warn('     2. RLS policy blocking query (timeout before error)');
              console.warn('     3. Supabase service temporarily unavailable');
              console.warn('     4. Session not properly authenticated');
              console.warn('   → Trying refreshProfile() as fallback (fast path)...');
              
              // On timeout, try refreshProfile() as fallback before assuming it's a new user
              // This prevents existing users from being redirected to onboarding on timeout
              // Use a shorter timeout for refreshProfile to keep things fast
              try {
                const refreshProfilePromise = refreshProfile();
                const refreshTimeoutPromise = new Promise<null>((resolve) => {
                  setTimeout(() => resolve(null), 1500); // 1.5 second timeout for refresh
                });
                
                const fallbackProfile = await Promise.race([
                  refreshProfilePromise,
                  refreshTimeoutPromise
                ]);
                
                if (fallbackProfile) {
                  console.log('   ✅ Profile found via refreshProfile() after timeout!');
                  console.log('   → Existing user confirmed - will NOT redirect to onboarding');
                  // Mark that we found the profile
                  setProfileFoundDuringVerification(true);
                  // Short wait for React state to propagate
                  await new Promise(resolve => setTimeout(resolve, 300));
                  console.log('   ✅ State update wait complete');
                  setFinalVerificationDone(true);
                  return;
                } else {
                  console.warn('   ⚠️ refreshProfile() also timed out or returned null');
                  console.warn('   → This might be a new user, or network issue persists');
                  console.warn('   → Marking verification as done - routing will decide');
                }
              } catch (refreshError: any) {
                console.error('   ❌ refreshProfile() error after timeout:', refreshError.message);
                console.warn('   → Network/RLS issue likely - marking verification as done');
              }
              
              // Mark verification as done even on timeout so we can proceed
              // But we've tried refreshProfile() first, so routing can make informed decision
              setFinalVerificationDone(true);
              return;
            }
            
            if (profileData) {
              console.log('   ✅ Profile EXISTS in database! Fetching it now...');
              console.log('   Profile data:', {
                id: (profileData as any).id,
                username: (profileData as any).username,
                onboarding_completed: (profileData as any).onboarding_completed
              });
              // Profile exists! Call refreshProfile to load it properly
              const finalProfile = await Promise.race([
                refreshProfile(),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)) // 1.5s timeout
              ]);
              
              if (finalProfile) {
                console.log('   ✅ Profile loaded successfully!');
                // Mark that we found the profile
                setProfileFoundDuringVerification(true);
                // Short wait for React state to propagate
                await new Promise(resolve => setTimeout(resolve, 300));
                console.log('   ✅ State update complete');
              } else {
                console.warn('   ⚠️ Profile exists but refreshProfile timed out or returned null');
              }
              // Mark verification as done
              setFinalVerificationDone(true);
            } else {
              console.log('   📝 Profile does NOT exist in database - this is a new user');
              console.log('   → Safe to redirect to onboarding');
              // Mark verification as done - profile doesn't exist, safe to redirect
              setFinalVerificationDone(true);
            }
          } catch (error: any) {
            // Clear timeout if still pending
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            console.error('   ❌ Final verification exception:', error.message);
            console.error('   Error stack:', error.stack);
            // On timeout or error, mark as done so we can proceed
            console.warn('   ⚠️ Verification failed - marking as done and proceeding');
            setFinalVerificationDone(true);
          } finally {
            // Always clear the max timeout
            clearTimeout(maxTimeoutId);
          }
        };
        
        verifyProfile();
      }
    }
  }, [session, profile, profileRetryAttempted, finalVerificationDone, user?.id, linkedAccountWaitTime, refreshProfile]);

  // Add a timeout to force navigation if profile is still null after retry attempts complete
  // This prevents infinite loading when profile doesn't exist
  // For linked accounts, wait for all retries to complete (up to 5 retries, ~8s each)
  useEffect(() => {
    if (session && !profile && profileRetryAttempted) {
      const isLinkedAccount = session.user.identities && session.user.identities.length > 1;
      
      if (isLinkedAccount) {
        // For linked accounts, wait for all retries to complete
        // Each retry: 2s initial wait + 5s fetch timeout + 1s between retries = ~8s per retry
        // 5 retries could take up to ~35-40 seconds, but we'll timeout after 25s to be reasonable
        const maxWaitTime = 25000; // Give 25 seconds for all retries (should cover 3-4 retries)
        const timeoutId = setTimeout(() => {
          setLinkedAccountWaitTime(maxWaitTime);
          console.log('⏰ Linked account profile wait timeout - all retries completed, proceeding to redirect');
        }, maxWaitTime);
        
        return () => clearTimeout(timeoutId);
      } else {
        // For non-linked accounts, proceed after single retry completes
        // refreshProfile timeout is 3s, so wait 4s total
        const timeoutId = setTimeout(() => {
          console.log('⏰ Profile retry completed but still no profile - forcing navigation to onboarding');
        }, 5000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [session, profile, profileRetryAttempted]);

  // Debug routing logic
  console.log('🔍 Routing Debug:', {
    hasSession: !!session,
    hasProfile: !!profile,
    isLoading,
    subscriptionLoading,
    isPremium,
    onboardingCompleted: profile?.onboarding_completed,
    hasSkipped,
    userId: user?.id,
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

  // Show loading screen only if loading and not forced to proceed
  // Also wait if we have a session but user ID is not available yet (initial load race condition)
  if ((isLoading || subscriptionLoading || (session && !user?.id)) && !forceProceed) {
    console.log('⏳ Waiting for auth data to load...', { 
      isLoading, 
      subscriptionLoading, 
      hasSession: !!session,
      hasUserId: !!user?.id 
    });
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    // Wait for retries to finish if they are still running
    if (!retriesFinished) {
       console.log('⏳ Still retrying profile fetch...');
       return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  // If session exists but no profile yet (and retry not attempted), wait a moment
  // The useEffect above will trigger the retry automatically
  if (session && !profile && !profileRetryAttempted) {
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
  const bypassPaywall = false; // DISABLED FOR REAL PURCHASE TESTING

  // If onboarding is completed but user is not premium, check if they skipped paywall
  // IMPORTANT: Wait for hasSkipped check to complete before making routing decision
  if (session && profile && profile.onboarding_completed && !isPremium && !bypassPaywall) {
    // If we're still checking skip status OR user ID is not available yet, wait
    // This ensures we don't redirect incorrectly on initial load
    if (hasSkipped === null || !user?.id) {
      console.log('🔍 Waiting for paywall skip status check...', { 
        hasSkipped, 
        userId: user?.id,
        profileId: profile?.id 
      });
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    
    // If user has skipped paywall, allow access
    if (hasSkipped === true) {
      console.log('🔍 User completed onboarding, not premium, but has skipped paywall - allowing access');
      return <Redirect href="/(main)/dashboard" />;
    }
    
    // User hasn't skipped, show paywall
    console.log('🔍 User completed onboarding but not premium, redirecting to paywall');
    console.log('🎯 About to redirect to /(paywall)');
    return <Redirect href="/(paywall)" />;
  }

  // Development bypass message
  if (bypassPaywall) {
    console.log('🚀 DEVELOPMENT MODE: Paywall bypassed - user can access full app');
  }

  // User is premium and onboarded, redirect to dashboard
  console.log('🔍 User session exists, profile loaded, and is premium - redirecting to dashboard');
  return <Redirect href="/(main)/dashboard" />;
}
