import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import { Database } from '../types/database';
import { RevenueCatService } from '../services/subscription/RevenueCatService';
import { SocialAuthService, SocialAuthResult } from '../services/auth/SocialAuthService';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (updatedProfile: Partial<Profile>) => void;
  clearCorruptedSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  refreshProfile: async () => null,
  updateProfile: () => {},
  clearCorruptedSession: async () => {},
});

export const useAuth = () => {
  console.log('🚀 [useAuth] Hook called');
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('🚀 [useAuth] Context data:', { 
    hasSession: !!context.session, 
    hasProfile: !!context.profile, 
    isLoading: context.isLoading 
  });
  return context;
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async (userId?: string) => {
  try {
    console.log('🚪 Starting logout process...');
    
    // Clear skipped paywall state if user ID provided
    if (userId) {
      try {
        const { clearSkippedPaywall } = await import('../utils/paywallSkip');
        await clearSkippedPaywall(userId);
        console.log('✅ Cleared skipped paywall state');
      } catch (error) {
        console.warn('⚠️ Failed to clear skipped paywall state:', error);
      }
    }
    
    // Log out from RevenueCat first
    try {
      await RevenueCatService.logOut();
      console.log('✅ RevenueCat logout successful');
    } catch (error) {
      console.warn('⚠️ RevenueCat logout failed (continuing anyway):', error);
    }
    
    // Then sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Supabase logout error:', error);
    return { error };
    }
    
    console.log('✅ Logout successful');
    return { error: null };
  } catch (error) {
    console.error('❌ Unexpected logout error:', error);
    return { error: error as Error };
  }
};

// Social Authentication Methods
export const signInWithApple = async (): Promise<SocialAuthResult> => {
  return await SocialAuthService.signInWithApple();
};

export const signInWithGoogle = async (): Promise<SocialAuthResult> => {
  return await SocialAuthService.signInWithGoogle();
};

export const getAvailableSocialProviders = async () => {
  return await SocialAuthService.getAvailableProviders();
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  console.log('🚀 [AuthProvider] Component initialized/re-rendered');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback((updatedProfile: Partial<Profile>) => {
    setProfile(prevProfile => {
      if (!prevProfile) return null;
      return { ...prevProfile, ...updatedProfile };
    });
  }, []);

  const fetchProfile = useCallback(async (userId: string, signal?: AbortSignal) => {
    console.log('🚀 [fetchProfile] FUNCTION CALLED - Starting execution...');
    console.log('🚀 [fetchProfile] userId parameter:', userId);
    
    try {
      console.log('🔍 [fetchProfile] Step 1: Getting current session...');
      // Get current session to verify auth.uid() matches userId
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const authUid = currentSession?.user?.id || null;
      console.log('🔍 [fetchProfile] Step 1 complete - authUid:', authUid);
      
      console.log('🔍 [RLS Check] Fetching profile:');
      console.log('   Query userId:', userId);
      console.log('   auth.uid():', authUid);
      console.log('   Match:', authUid === userId ? '✅ YES' : '❌ NO - This could cause RLS to block!');
      
      // CRITICAL: If no active session (authUid is null), abort immediately
      // This prevents RLS errors after logout when pending async operations try to fetch/create profiles
      if (!authUid) {
        console.warn('⚠️ [RLS Warning] No active session detected (auth.uid() is null)!');
        console.warn('   This usually happens after logout when pending operations try to access profiles.');
        console.warn('   Aborting profile fetch to prevent RLS policy violations.');
        return null;
      }
      
      if (authUid !== userId) {
        console.warn('⚠️ [RLS Warning] User ID mismatch detected!');
        console.warn('   This might cause RLS policy to block the query.');
        console.warn('   RLS policy checks: auth.uid() = id');
        console.warn('   But we\'re querying with different userId:', userId);
        // Don't proceed if IDs don't match - RLS will block anyway
        return null;
      }
      
      console.log('🔍 [fetchProfile] Step 2: Querying profiles table...');
      // Use maybeSingle() instead of single() to avoid errors when profile doesn't exist
      // This prevents PGRST116 errors for new users
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      // Note: Supabase JS client doesn't support AbortSignal directly, but we can track cancellation
      const result = await query;
      console.log('🔍 [fetchProfile] Step 2 complete - query result received');
      
      // Check if aborted (though Supabase doesn't support it, we can track it)
      if (signal?.aborted) {
        throw new Error('Profile fetch aborted');
      }

      const { data, error } = result;
      
      console.log('🔍 [fetchProfile] Step 3: Processing query result...');
      console.log('   Data:', data ? 'Profile found' : 'No profile');
      console.log('   Error:', error?.message || 'None');

      if (error) {
        console.error('❌ Error fetching profile:', error);
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        console.error('   Error details:', error.details);
        console.error('   Error hint:', error.hint);
        if (authUid !== userId) {
          console.error('   ⚠️ This error might be caused by RLS policy blocking due to ID mismatch!');
        }
        setError(error.message);
        return null;
      }

      if (!data) {
        console.log('📝 No profile found for user ID:', userId);
        
        // If user ID matches (RLS allows), but profile doesn't exist, create it automatically
        if (authUid === userId) {
          console.log('🔍 [fetchProfile] Step 4: Creating new profile...');
          console.log('🚀 [fetchProfile] → User ID matches auth.uid(), creating profile automatically...');
          console.log('🚀 [fetchProfile] → About to insert profile with ID:', userId);
          
          // Check if this is an existing user (account older than 5 minutes) or a new user
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const accountAge = currentUser?.created_at ? Date.now() - new Date(currentUser.created_at).getTime() : 0;
          const isExistingUser = accountAge > 5 * 60 * 1000; // 5 minutes in milliseconds
          
          console.log('🕒 [fetchProfile] Account age check:', {
            created_at: currentUser?.created_at,
            age_minutes: Math.round(accountAge / (60 * 1000)),
            is_existing_user: isExistingUser
          });
          
          try {
            console.log('🔍 [fetchProfile] Step 4a: Executing profile insert...');
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({ 
                id: userId, 
                onboarding_completed: isExistingUser, // Existing users skip onboarding
                username: currentUser?.email || null,
                full_name: currentUser?.user_metadata?.full_name || 
                          currentUser?.user_metadata?.name || 
                          currentUser?.email?.split('@')[0] || 
                          'User',
                avatar_url: currentUser?.user_metadata?.avatar_url || null
              } as any)
              .select()
              .single();
            
            console.log('🔍 [fetchProfile] Step 4a complete - insert executed');
            console.log('🚀 [fetchProfile] → Insert result - data:', newProfile);
            console.log('🚀 [fetchProfile] → Insert result - error:', createError);
            
            if (createError) {
              console.error('   ❌ Failed to create profile:', createError);
              console.error('   Error code:', createError.code);
              console.error('   Error message:', createError.message);
              console.error('   Error details:', createError.details);
              console.error('   Error hint:', createError.hint);
              return null;
            }
            
            if (newProfile) {
              console.log('🔍 [fetchProfile] Step 4b: Profile creation successful!');
              console.log('   ✅ Profile created successfully');
              console.log('   ✅ New profile data:', newProfile);
              return newProfile;
            }
          } catch (createErr: any) {
            console.error('   ❌ Exception creating profile:', createErr);
            return null;
          }
        } else {
          console.warn('   ⚠️ This might be because RLS blocked the query due to ID mismatch!');
        }
        return null;
      }

      console.log('🔍 [fetchProfile] Step 5: Existing profile found!');
      console.log('✅ Profile found successfully for user ID:', userId);
      console.log('   Profile ID:', (data as any).id);
      console.log('   Profile onboarding_completed:', (data as any).onboarding_completed);

      return data;
    } catch (err: any) {
      // If aborted, don't log as error
      if (err.message === 'Profile fetch aborted') {
        throw err;
      }
      console.error('❌ Exception in fetchProfile:', err);
      setError('Failed to fetch profile');
      return null;
    }
  }, []);

  // For linked accounts, try fetching profile with better error handling
  // Also adds extra logging to debug profile lookup issues
  const fetchProfileForLinkedAccount = useCallback(async (user: User, signal?: AbortSignal): Promise<Profile | null> => {
    console.log('🚀 [fetchProfileForLinkedAccount] FUNCTION CALLED - Starting execution...');
    console.log('🚀 [fetchProfileForLinkedAccount] User ID:', user.id);
    console.log('🚀 [fetchProfileForLinkedAccount] User email:', user.email);
    
    // CRITICAL: Check if there's an active session before proceeding
    // This prevents RLS errors after logout when pending async operations try to fetch profiles
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const authUid = currentSession?.user?.id || null;
    
    console.log('🚀 [fetchProfileForLinkedAccount] Session check - authUid:', authUid);
    
    if (!authUid) {
      console.warn('⚠️ [fetchProfileForLinkedAccount] No active session detected (auth.uid() is null)!');
      console.warn('   This usually happens after logout when pending operations try to access profiles.');
      console.warn('   Aborting profile fetch to prevent RLS policy violations.');
      return null;
    }
    
    // Also verify that the user ID matches auth.uid() before proceeding
    if (authUid !== user.id) {
      console.warn('⚠️ [fetchProfileForLinkedAccount] User ID mismatch detected!');
      console.warn('   auth.uid():', authUid);
      console.warn('   user.id:', user.id);
      console.warn('   RLS policy will block this query - aborting.');
      return null;
    }
    
    const isLinkedAccount = user.identities && user.identities.length > 1;
    
    console.log('🔍 [fetchProfileForLinkedAccount] Starting profile fetch...');
    console.log('   User ID:', user.id);
    console.log('   Is linked account:', isLinkedAccount);
    console.log('   Identities count:', user.identities?.length || 0);
    
    if (!isLinkedAccount) {
      // Not a linked account, use regular fetch
      console.log('   → Not a linked account, calling fetchProfile directly...');
      return fetchProfile(user.id, signal);
    }

    console.log('🔗 Linked account detected - checking profile...');
    console.log('🔍 Current user ID:', user.id);
    console.log('🔍 User email:', user.email);
    console.log('🔍 User identities:', user.identities.map((id: any) => ({
      provider: id.provider,
      email: id.email,
      identity_id: id.id, // This is provider-specific ID, not Supabase user ID
      created_at: id.created_at
    })));

    // Try the current user ID first (most likely - Supabase should preserve the primary account's ID)
    console.log('   → Calling fetchProfile with user ID:', user.id);
    let profile = await fetchProfile(user.id, signal);
    if (profile) {
      console.log('✅ Profile found with current user ID:', user.id);
      return profile;
    }

    // If not found, log detailed error information
    console.log('⚠️ Profile not found with current user ID:', user.id);
    console.log('🔍 This might mean:');
    console.log('   1. Profile doesn\'t exist yet (new user)');
    console.log('   2. Profile was created with a different user ID before account linking');
    console.log('   3. RLS policy is blocking the query');
    console.log('   4. Supabase hasn\'t finished syncing the linked account');

    // SIMPLIFIED: No complex retry logic - just like email login
    // If profile doesn't exist immediately, create it (same as email flow)

    console.log('⚠️ Profile not found - will attempt to create it');
    // Note: identity.id is provider-specific (Google/Apple user ID), not Supabase user ID
    // All identities share the same Supabase user.id, so checking identity.id won't help
    // If profile exists but isn't found, it's likely a Supabase sync issue or RLS policy issue

    // CRITICAL FIX: Check if profile exists first before creating new one
    console.log('🔧 Checking for existing profile before creating new one...');
    
    // CRITICAL: Before creating a new profile, do a final check using service role
    // This bypasses RLS to see if profile actually exists in database
    console.log('🔍 Final check: Does profile exist in database (bypassing RLS)?');
    
    try {
      // Use a direct query that bypasses RLS issues
      const { data: directCheck, error: directError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!directError && directCheck) {
        console.log('✅ Profile found via direct check!', directCheck);
        return directCheck as Profile;
      }
    } catch (error) {
      console.warn('⚠️ Direct check failed (function may not exist):', error);
    }
    
    // If direct check fails, try one more regular fetch after a short wait
    console.log('⏳ Waiting for session sync before final profile check...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const retryProfile = await fetchProfile(user.id, signal);
    if (retryProfile) {
      console.log('✅ Profile found after session sync wait!');
      return retryProfile;
    }
    
    // Only create profile if it truly doesn't exist
    console.log('📝 No existing profile found - creating new one...');
    
    try {
      const { error: createError } = await supabase
        .from('profiles')
        .insert({ 
          id: user.id, 
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          username: user.email || null,
          // For OAuth users, check account age to determine if they're returning users
          // This prevents existing users from losing their onboarding status
          onboarding_completed: false 
        } as any);

      if (createError) {
        // If error is due to profile already existing, that's actually good - try to fetch it
        if (createError.code === '23505') { // Unique constraint violation
          console.log('✅ Profile already exists (unique constraint), attempting to fetch...');
          const existingProfile = await fetchProfile(user.id, signal);
          if (existingProfile) {
            console.log('✅ Successfully fetched existing profile after constraint error');
            return existingProfile;
          }
        }
        console.error('❌ Failed to create profile for Google user:', createError);
        return null;
      }

      console.log('✅ Profile created successfully for OAuth user:', user.id);
      
      // Try fetching the newly created profile
      const newProfile = await fetchProfile(user.id, signal);
      if (newProfile) {
        console.log('✅ Successfully fetched newly created profile');
        return newProfile;
      }
    } catch (error) {
      console.error('❌ Exception while creating profile for Google user:', error);
    }

    return null;
  }, [fetchProfile]);

  useEffect(() => {
    console.log('🚀 [AuthProvider] useEffect[] running - setting up auth state listener');
    // Get initial session with proper error handling
    console.log('🚀 [useAuth] useEffect triggered - Getting initial session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🚀 [useAuth] getSession result:', { 
        hasSession: !!session, 
        userId: session?.user?.id, 
        error: error?.message 
      });
      
      if (error) {
        console.error('Error getting session:', error);
        
        // If it's a refresh token error, clear the corrupted session
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Refresh Token Not Found')) {
          console.log('🧹 Clearing corrupted session tokens...');
          supabase.auth.signOut().catch(e => console.warn('Error during signOut:', e));
          setSession(null);
          setProfile(null);
          setError(null); // Clear error after cleanup
          setIsLoading(false);
          return;
        }
        
        setError(error.message);
      }
      setSession(session);
      
      if (session?.user) {
        // SIMPLIFIED: Use simple profile fetch for initial load too
        console.log('🔍 Initial session - Provider:', session.user.app_metadata?.provider);
        console.log('📧 Using simple profile fetch for initial load');
        console.log('🚀 [useAuth] About to call fetchProfile for initial session...');
        
        fetchProfile(session.user.id).then(profile => {
          console.log('🚀 [useAuth] Initial fetchProfile completed:', { hasProfile: !!profile });
          setProfile(profile);
          setIsLoading(false);
        }).catch(error => {
          console.error('🚀 [useAuth] Initial fetchProfile failed:', error);
          setIsLoading(false);
        });
      } else {
        console.log('🚀 [useAuth] No session found, setting loading to false');
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🚀 [useAuth] Auth state change:', event, session?.user?.id);
      console.log('🚀 [useAuth] Auth state change details:', { 
        event, 
        hasSession: !!session, 
        userId: session?.user?.id,
        provider: session?.user?.app_metadata?.provider 
      });
      
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('🔄 Token refresh failed, clearing session');
        setSession(null);
        setProfile(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      
      setSession(session);

      if (session?.user) {
        // SIMPLIFIED: Use the same simple profile fetch for ALL providers
        // The complex linked account logic was causing issues with existing Google users
        console.log('🔍 Auth state change - Provider:', session.user.app_metadata?.provider);
        console.log('📧 Using simple profile fetch for all providers (like working email login)');
        
        // Add a small delay to ensure session is fully propagated for RLS
        // This fixes the issue where profile loads only after refresh, not after login
        const fetchProfileWithRetry = async (userId: string, maxRetries = 3) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Profile fetch attempt ${attempt}/${maxRetries} for user:`, userId);
            
            // Small delay to let session propagate, especially on first attempt
            if (attempt === 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const profile = await fetchProfile(userId);
            
            if (profile) {
              console.log('✅ Profile fetch successful on attempt', attempt);
              return profile;
            }
            
            if (attempt < maxRetries) {
              console.log(`⏳ Profile fetch attempt ${attempt} failed, retrying in ${attempt * 200}ms...`);
              await new Promise(resolve => setTimeout(resolve, attempt * 200));
            }
          }
          
          console.warn('⚠️ All profile fetch attempts failed');
          return null;
        };
        
        const profile = await fetchProfileWithRetry(session.user.id);
        
        setProfile(profile);

        // Set user ID in RevenueCat for purchase tracking (non-blocking)
        // Don't await this - it shouldn't block auth flow
        RevenueCatService.setUserId(session.user.id)
          .then(() => console.log('✅ RevenueCat user ID set successfully'))
          .catch(error => console.warn('⚠️ Failed to set RevenueCat user ID (non-blocking):', error));
      } else {
        setProfile(null);

        // Clear user ID from RevenueCat when logged out (non-blocking)
        RevenueCatService.logOut()
          .then(() => console.log('✅ RevenueCat user logged out'))
          .catch(error => console.warn('⚠️ Failed to log out from RevenueCat (non-blocking):', error));
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Create refreshProfile function
  const refreshProfile = useCallback(async () => {
    // Get session directly from Supabase instead of relying on context state
    // This ensures we have the latest session even if context hasn't updated yet
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (currentSession?.user) {
      console.log('🔄 Refreshing profile data for user:', currentSession.user.id);
      console.log('🔍 User identities:', currentSession.user.identities?.map((id: any) => ({
        provider: id.provider,
        email: id.email
      })));
      
      // Use the same retry mechanism as in auth state change
      const fetchProfileWithRetry = async (userId: string, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(`🔄 Profile refresh attempt ${attempt}/${maxRetries} for user:`, userId);
          
          // Small delay to let session propagate, especially on first attempt
          if (attempt === 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          const profile = await fetchProfile(userId);
          
          if (profile) {
            console.log('✅ Profile refresh successful on attempt', attempt);
            return profile;
          }
          
          if (attempt < maxRetries) {
            console.log(`⏳ Profile refresh attempt ${attempt} failed, retrying in ${attempt * 300}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 300));
          }
        }
        
        console.warn('⚠️ All profile refresh attempts failed');
        return null;
      };
      
      // Use the retry mechanism with timeout
      const timeoutMs = 5000; // 5 second timeout
      const updatedProfile = await Promise.race([
        fetchProfileWithRetry(currentSession.user.id),
        new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn(`⏰ Profile refresh timeout after ${timeoutMs}ms - proceeding with null profile`);
            resolve(null);
          }, timeoutMs);
        })
      ]);
      
      // Explicitly set profile so app can proceed
      setProfile(updatedProfile);
      
      if (updatedProfile) {
        console.log('✅ Profile refreshed:', {
          id: updatedProfile.id,
          username: updatedProfile.username,
          full_name: updatedProfile.full_name,
          onboarding_completed: updatedProfile.onboarding_completed,
          training_level: updatedProfile.training_level,
          primary_goal: updatedProfile.primary_goal
        });
      } else {
        console.log('✅ Profile refreshed: not found (new user)');
      }
      
      return updatedProfile;
    } else {
      console.log('⚠️ No session available for profile refresh');
      setProfile(null);
      return null;
    }
  }, [session, fetchProfile]);

  // Add a new useEffect to explicitly handle profile fetching when session changes
  useEffect(() => {
    // This hook ensures that whenever the session is updated (e.g., after login),
    // the profile is immediately refreshed. This provides a more reliable way
    // to trigger profile fetching than relying solely on onAuthStateChange,
    // which can sometimes have timing issues.
    if (session?.user && !profile) {
      console.log('🚀 [AuthProvider] Session changed, triggering profile refresh...');
      refreshProfile();
    }
  }, [session, profile, refreshProfile]);

  // Function to clear corrupted auth tokens manually
  const clearCorruptedSession = useCallback(async () => {
    console.log('🧹 Manually clearing corrupted session...');
    try {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setError(null);
      console.log('✅ Session cleared successfully');
    } catch (error) {
      console.warn('Error clearing session:', error);
    }
  }, []);

  const value: AuthContextType = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    isLoading,
    error,
    refreshProfile,
    updateProfile,
    clearCorruptedSession,
  }), [session, profile, isLoading, error, refreshProfile, updateProfile, clearCorruptedSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
