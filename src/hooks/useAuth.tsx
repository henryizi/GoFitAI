import { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import { Database } from '../types/database';
import { RevenueCatService } from '../services/subscription/RevenueCatService';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  refreshProfile: async () => {},
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

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error };
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setError(error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setError('Failed to fetch profile');
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        setError(error.message);
      }
      setSession(session);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(profile => {
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
      setSession(session);

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setProfile(profile);

        // Set user ID in RevenueCat for purchase tracking
        try {
          await RevenueCatService.setUserId(session.user.id);
          console.log('RevenueCat user ID set successfully');
        } catch (error) {
          console.warn('Failed to set RevenueCat user ID:', error);
        }
      } else {
        setProfile(null);

        // Clear user ID from RevenueCat when logged out
        try {
          await RevenueCatService.logOut();
          console.log('RevenueCat user logged out');
        } catch (error) {
          console.warn('Failed to log out from RevenueCat:', error);
        }
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Create refreshProfile function
  const refreshProfile = async () => {
    if (session?.user) {
      console.log('Refreshing profile data for user:', session.user.id);
      const updatedProfile = await fetchProfile(session.user.id);
      setProfile(updatedProfile);
      console.log('Profile refreshed:', updatedProfile);
    }
  };

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    profile,
    isLoading,
    error,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};