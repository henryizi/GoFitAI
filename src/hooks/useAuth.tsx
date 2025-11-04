import { useState, useEffect, createContext, useContext } from 'react';
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
  clearCorruptedSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  refreshProfile: async () => null,
  clearCorruptedSession: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string, signal?: AbortSignal) => {
    console.log('🚀 [fetchProfile] FUNCTION CALLED - Starting execution...');
    console.log('🚀 [fetchProfile] userId parameter:', userId);
    
    try {
      // Get current session to verify auth.uid() matches userId
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const authUid = currentSession?.user?.id || null;
      
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
      
      // Use maybeSingle() instead of single() to avoid errors when profile doesn't exist
      // This prevents PGRST116 errors for new users
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      // Note: Supabase JS client doesn't support AbortSignal directly, but we can track cancellation
      const result = await query;
      
      // Check if aborted (though Supabase doesn't support it, we can track it)
      if (signal?.aborted) {
        throw new Error('Profile fetch aborted');
      }

      const { data, error } = result;

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
          console.log('🚀 [fetchProfile] → User ID matches auth.uid(), creating profile automatically...');
          console.log('🚀 [fetchProfile] → About to insert profile with ID:', userId);
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({ id: userId, onboarding_completed: false })
              .select()
              .single();
            
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

      console.log('✅ Profile found successfully for user ID:', userId);
      console.log('   Profile ID:', data.id);
      console.log('   Profile onboarding_completed:', data.onboarding_completed);

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
  };

  // For linked accounts, try fetching profile with better error handling
  // Also adds extra logging to debug profile lookup issues
  const fetchProfileForLinkedAccount = async (user: User, signal?: AbortSignal): Promise<Profile | null> => {
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

    // For linked accounts, try retrying with exponential backoff (Supabase may need time to sync)
    console.log('🔄 Retrying profile fetch for linked account (Supabase may need sync time)...');
    
    // Retry with exponential backoff: wait 1s, then 2s, then 3s
    for (let attempt = 1; attempt <= 3; attempt++) {
      const waitTime = attempt * 1000; // 1s, 2s, 3s
      console.log(`🔄 Retry attempt ${attempt}/3: Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      profile = await fetchProfile(user.id, signal);
      if (profile) {
        console.log(`✅ Profile found on retry attempt ${attempt}!`);
        return profile;
      }
      
      console.log(`⚠️ Retry attempt ${attempt} failed - profile still not found`);
    }

    console.log('⚠️ Profile not found after all retry attempts');
    // Note: identity.id is provider-specific (Google/Apple user ID), not Supabase user ID
    // All identities share the same Supabase user.id, so checking identity.id won't help
    // If profile exists but isn't found, it's likely a Supabase sync issue or RLS policy issue

    // For Google sign-in users, automatically create a profile if one doesn't exist
    // This handles the case where the database trigger didn't fire (existing Google accounts)
    console.log('🔧 Attempting to create profile for Google sign-in user...');
    try {
      const { error: createError } = await supabase
        .from('profiles')
        .insert({ 
          id: user.id, 
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          username: user.email || null,
          onboarding_completed: false 
        });

      if (createError) {
        console.error('❌ Failed to create profile for Google user:', createError);
        return null;
      }

      console.log('✅ Profile created successfully for Google sign-in user:', user.id);
      
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
  };

  useEffect(() => {
    // Get initial session with proper error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
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
        fetchProfileForLinkedAccount(session.user).then(profile => {
          setProfile(profile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
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
        const profile = await fetchProfileForLinkedAccount(session.user);
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
  const refreshProfile = async () => {
    // Get session directly from Supabase instead of relying on context state
    // This ensures we have the latest session even if context hasn't updated yet
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (currentSession?.user) {
      console.log('🔄 Refreshing profile data for user:', currentSession.user.id);
      console.log('🔍 User identities:', currentSession.user.identities?.map((id: any) => ({
        provider: id.provider,
        email: id.email
      })));
      
      // If account is linked (multiple identities), wait a bit for Supabase to sync
      const isLinkedAccount = currentSession.user.identities && currentSession.user.identities.length > 1;
      if (isLinkedAccount) {
        console.log('🔗 Linked account detected - waiting for profile sync...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for sync
      }
      
      // Use a robust timeout mechanism that always resolves
      // For linked accounts, use MUCH longer timeout (15s) since fetchProfileForLinkedAccount
      // has its own retries (1s + 2s + 3s = 6s minimum) plus network delays
      // For regular accounts, use shorter timeout (3s)
      const timeoutMs = isLinkedAccount ? 15000 : 3000;
      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;
      
      console.log(`⏱️ Starting profile fetch with ${timeoutMs}ms timeout for ${isLinkedAccount ? 'linked' : 'regular'} account...`);
      console.log('🔍 [refreshProfile] About to call fetchProfileForLinkedAccount...');
      const fetchPromise = fetchProfileForLinkedAccount(currentSession.user)
        .then((result) => {
          if (!resolved) {
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            console.log(`✅ Profile fetch completed${result ? ' - profile found' : ' - no profile'}`);
            return result;
          }
          console.log('⚠️ Profile fetch resolved but timeout already occurred');
          return null;
        })
        .catch((error) => {
          if (!resolved) {
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
          }
          console.warn('⚠️ Profile fetch error:', error.message);
          console.warn('⚠️ Error stack:', error.stack);
          return null;
        });
      
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn(`⏰ Profile fetch timeout after ${timeoutMs}ms - proceeding with null profile`);
            resolve(null);
          }
        }, timeoutMs);
      });
      
      // Race between fetch and timeout - always resolves (never hangs)
      const updatedProfile = await Promise.race([fetchPromise, timeoutPromise]);
      
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
  };

  // Function to clear corrupted auth tokens manually
  const clearCorruptedSession = async () => {
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
  };

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    profile,
    isLoading,
    error,
    refreshProfile,
    clearCorruptedSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};