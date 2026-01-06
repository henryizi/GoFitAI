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
    // Validate inputs before making the request
    if (!email || !email.trim()) {
      return { 
        data: null, 
        error: { message: 'Email is required' } as any 
      };
    }
    
    if (!password || password.length < 6) {
      return { 
        data: null, 
        error: { message: 'Password must be at least 6 characters' } as any 
      };
    }
    
    // Make the signup request with timeout protection
    // Note: We use emailRedirectTo but don't fail if email sending fails
    const signUpPromise = supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: 'gofitai://email-verified',
        // Don't require email verification to complete signup
        // User can verify later
      }
    });
    
    // Add timeout (30 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout. Please check your internet connection.')), 30000)
    );
    
    const result = await Promise.race([signUpPromise, timeoutPromise]) as any;
    const { data, error } = result;
    
    // If account was created but email failed, still return success
    // The user can verify email later
    if (data?.user && error?.message?.toLowerCase().includes('email')) {
      console.log('⚠️ Account created but email sending failed - user can verify later');
      // Return success with a note about email
      return { 
        data, 
        error: { message: 'Account created, but email verification could not be sent. You can sign in and request a new verification email.' } 
      };
    }
    
    return { data, error };
  } catch (error: any) {
    console.error('SignUp error:', error);
    return { 
      data: null, 
      error: error?.message ? { message: error.message } : { message: 'Failed to create account. Please try again.' } 
    };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'gofitai://reset-password',
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

  const updateProfile = useCallback((updatedProfile: Partial<Profile>) => {
    setProfile(prevProfile => {
      if (!prevProfile) return null;
      return { ...prevProfile, ...updatedProfile };
    });
  }, []);

  const fetchProfile = useCallback(async (userId: string, passedSession?: Session | null) => {
    try {
      // Use passed session if available to avoid timing out on getSession calls
      let currentSession = passedSession;
      
      if (!currentSession) {
        try {
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 1500))
          ]) as any;
          currentSession = sessionResult.data?.session;
        } catch (sessionErr) {
          // Session timeout - proceed anyway, RLS will handle it
        }
      }
      
      const authUid = currentSession?.user?.id || userId;
      
      // Fast profile query with short timeout
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      
      let result;
      try {
        result = await Promise.race([query, timeoutPromise]);
      } catch (err: any) {
        if (err.message === 'timeout') {
          console.warn('⏰ Profile query timed out');
          return null;
        }
        throw err;
      }

      const { data, error } = result as any;

      if (error) {
        console.error('❌ Error fetching profile:', error.message);
        setError(error.message);
        return null;
      }

      if (!data) {
        // No profile exists - create one for new users
        if (authUid === userId) {
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const accountAge = currentUser?.created_at ? Date.now() - new Date(currentUser.created_at).getTime() : 0;
            const isExistingUser = accountAge > 5 * 60 * 1000;
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({ 
                id: userId, 
                onboarding_completed: isExistingUser,
                username: currentUser?.email || null,
                full_name: currentUser?.user_metadata?.full_name || 
                          currentUser?.user_metadata?.name || 
                          currentUser?.email?.split('@')[0] || 
                          'User',
                avatar_url: currentUser?.user_metadata?.avatar_url || null
              } as any)
              .select()
              .single();
            
            if (createError) {
              console.error('❌ Failed to create profile:', createError.message);
              return null;
            }
            
            if (newProfile) {
              console.log('✅ Profile created');
              return newProfile;
            }
          } catch (createErr: any) {
            console.error('❌ Exception creating profile:', createErr);
            return null;
          }
        }
        return null;
      }

      return data;
    } catch (err: any) {
      if (err.message === 'Profile fetch aborted') {
        throw err;
      }
      console.error('❌ Exception in fetchProfile:', err);
      setError('Failed to fetch profile');
      return null;
    }
  }, []);

  // For linked accounts - simplified and faster
  const fetchProfileForLinkedAccount = useCallback(async (user: User, signal?: AbortSignal): Promise<Profile | null> => {
    // Get current session
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const authUid = currentSession?.user?.id || null;
    
    if (!authUid || authUid !== user.id) {
      return null;
    }
    
    // Try fetching profile directly
    let profile = await fetchProfile(user.id, currentSession);
    if (profile) return profile;
    
    // Quick retry after short delay
    await new Promise(resolve => setTimeout(resolve, 300));
    profile = await fetchProfile(user.id, currentSession);
    if (profile) return profile;
    
    // Create profile if it doesn't exist
    try {
      const { error: createError } = await supabase
        .from('profiles')
        .insert({ 
          id: user.id, 
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          username: user.email || null,
          onboarding_completed: false 
        } as any);

      if (createError) {
        if (createError.code === '23505') {
          // Profile exists - fetch it
          return await fetchProfile(user.id, currentSession);
        }
        console.error('❌ Failed to create profile:', createError);
        return null;
      }

      return await fetchProfile(user.id, currentSession);
    } catch (error) {
      console.error('❌ Exception creating profile:', error);
    }

    return null;
  }, [fetchProfile]);

  useEffect(() => {
    // Get initial session with proper error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        
        // If it's a refresh token error, clear the corrupted session
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Refresh Token Not Found')) {
          supabase.auth.signOut().catch(e => console.warn('Error during signOut:', e));
          setSession(null);
          setProfile(null);
          setError(null);
          setIsLoading(false);
          return;
        }
        
        setError(error.message);
      }
      setSession(session);
      
      if (session?.user) {
        // Fast initial profile fetch - no retry on initial load
        fetchProfile(session.user.id, session).then(profile => {
          setProfile(profile);
          setIsLoading(false);
        }).catch(() => {
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
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        setSession(null);
        setProfile(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      
      setSession(session);

      if (session?.user) {
        // Quick profile fetch with 2 retries max
        const fetchProfileWithRetry = async (userId: string, maxRetries = 2) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const profile = await fetchProfile(userId, session);
            if (profile) return profile;
            
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          return null;
        };
        
        const profile = await fetchProfileWithRetry(session.user.id);
        setProfile(profile);

        // Set user ID in RevenueCat (non-blocking)
        RevenueCatService.setUserId(session.user.id).catch(() => {});
      } else {
        setProfile(null);
        RevenueCatService.logOut().catch(() => {});
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Create refreshProfile function - optimized for speed
  const refreshProfile = useCallback(async () => {
    // Get session - use state first, then try API
    let currentSession = session;
    
    if (!currentSession) {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]) as any;
        currentSession = sessionResult.data?.session;
      } catch {
        // Timeout - proceed with null
      }
    }
    
    if (currentSession?.user) {
      // Quick fetch with 2 retries max, 5 second total timeout
      const fetchProfileWithRetry = async (userId: string, maxRetries = 2) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const profile = await fetchProfile(userId, currentSession);
          if (profile) return profile;
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        return null;
      };
      
      const updatedProfile = await Promise.race([
        fetchProfileWithRetry(currentSession.user.id),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      ]);
      
      setProfile(updatedProfile);
      return updatedProfile;
    } else {
      setProfile(null);
      return null;
    }
  }, [session, fetchProfile]);

  // Handle profile fetching when session changes
  useEffect(() => {
    if (session?.user && !profile) {
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
