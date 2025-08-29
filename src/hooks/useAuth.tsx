import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { supabase } from '../services/supabase/client';
import { User, AuthState, Profile } from '../types/user';
import { Session } from '@supabase/supabase-js';
import { identify as analyticsIdentify, reset as analyticsReset } from '../services/analytics/analytics';
import { setUser as sentrySetUser } from '../services/monitoring/sentry';

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    error: null,
  });
  const profileChannelRef = useRef<any>(null);
  
  useEffect(() => {
    console.log('🔐 AuthProvider: Initializing authentication...');
    
    // If Supabase is not configured, run in no-auth mode
    if (!supabase) {
      console.warn('[Auth] Supabase not configured. Running in no-auth mode.');
      setAuthState({ 
        user: { id: 'guest', email: 'guest@example.com' } as User, 
        session: null, 
        profile: null, 
        isLoading: false, 
        error: null 
      });
      return;
    }
    
    const subscribeToProfileChanges = (userId: string, userEmail: string) => {
      // Clean up any existing subscription before creating a new one
      try { profileChannelRef.current?.unsubscribe?.(); } catch {}

      const channel = supabase
        .channel(`profiles:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            console.log('🔄 Real-time profile update received:', {
              eventType: payload.eventType,
              new: (payload as any).new,
              old: (payload as any).old
            });

            const newProfile = (payload as any).new;
            if (newProfile) {
              console.log('🔄 Updating auth state with new profile data');
              setAuthState((prev) => ({ ...prev, profile: newProfile }));

              // Update analytics context with refreshed profile data
              try {
                const props: Record<string, unknown> = { email: userEmail } as any;
                if (newProfile.full_name) props.full_name = newProfile.full_name;
                if (newProfile.birthday) props.birthday = newProfile.birthday;
                if (newProfile.training_level) props.training_level = newProfile.training_level;
                if (typeof newProfile.height === 'number') props.height_cm = newProfile.height;
                if (typeof newProfile.weight === 'number') props.weight_kg = newProfile.weight;
                if (newProfile.gender) props.gender = newProfile.gender;
                if (newProfile.exercise_frequency) props.exercise_frequency = newProfile.exercise_frequency;
                if (newProfile.activity_level) props.activity_level = newProfile.activity_level;
                if (newProfile.weight_trend) props.weight_trend = newProfile.weight_trend;
                if (typeof newProfile.goal_fat_reduction === 'number') props.goal_fat_reduction = newProfile.goal_fat_reduction;
                if (typeof newProfile.goal_muscle_gain === 'number') props.goal_muscle_gain = newProfile.goal_muscle_gain;
                if (typeof newProfile.body_fat === 'number') props.body_fat = newProfile.body_fat;
                if (typeof newProfile.onboarding_completed === 'boolean') props.onboarding_completed = newProfile.onboarding_completed;
                if (newProfile.primary_goal) props.primary_goal = newProfile.primary_goal;
                if (newProfile.workout_frequency) props.workout_frequency = newProfile.workout_frequency;

                analyticsIdentify(userId, props);
                console.log('✅ Analytics updated with new profile data');
              } catch (error) {
                console.error('❌ Error updating analytics:', error);
              }
            } else {
              console.warn('⚠️ Real-time update received but no new profile data');
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔌 Profile subscription status for user ${userId}:`, status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to profile changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Profile subscription channel error');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Profile subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('🔌 Profile subscription closed');
          }
        });

      profileChannelRef.current = channel;
    };
    
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setAuthState({ session, user: session.user as any, profile, isLoading: false, error: null });
          subscribeToProfileChanges(session.user.id, session.user.email!);
        } else {
          // If no profile exists, create one
          const { data: newProfile, error } = await supabase
            .from('profiles')
            .insert({ id: session.user.id, username: session.user.email })
            .select()
            .single();

          if (error) {
            setAuthState({ session, user: session.user as any, profile: null, isLoading: false, error: error.message });
          } else {
            setAuthState({ session, user: session.user as any, profile: newProfile, isLoading: false, error: null });
            subscribeToProfileChanges(session.user.id, session.user.email!);
          }
        }

        // Bind analytics and Sentry user context
        try {
          const props: Record<string, unknown> = { email: session.user.email };
          if (profile?.full_name) props.full_name = profile.full_name;
          if (profile?.birthday) props.birthday = profile.birthday;
          if (profile?.training_level) props.training_level = profile.training_level;
          if (typeof profile?.height === 'number') props.height_cm = profile.height;
          if (typeof profile?.weight === 'number') props.weight_kg = profile.weight;
          if (profile?.gender) props.gender = profile.gender;
          if (profile?.exercise_frequency) props.exercise_frequency = profile.exercise_frequency;
          if (profile?.activity_level) props.activity_level = profile.activity_level;
          if (profile?.weight_trend) props.weight_trend = profile.weight_trend;
          if (typeof profile?.goal_fat_reduction === 'number') props.goal_fat_reduction = profile.goal_fat_reduction;
          if (typeof profile?.goal_muscle_gain === 'number') props.goal_muscle_gain = profile.goal_muscle_gain;
          if (typeof profile?.body_fat === 'number') props.body_fat = profile.body_fat;
          if (typeof profile?.onboarding_completed === 'boolean') props.onboarding_completed = profile.onboarding_completed;
          analyticsIdentify(session.user.id, props);
          sentrySetUser({ id: session.user.id, email: session.user.email });
        } catch {}
      } else {
        setAuthState({ session: null, user: null, profile: null, isLoading: false, error: null });
        try {
          analyticsReset();
          sentrySetUser(null);
        } catch {}
        try { profileChannelRef.current?.unsubscribe?.(); } catch {}
        profileChannelRef.current = null;
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchSession();
      } else {
        setAuthState({ session: null, user: null, profile: null, isLoading: false, error: null });
        try {
          analyticsReset();
          sentrySetUser(null);
        } catch {}
        try { profileChannelRef.current?.unsubscribe?.(); } catch {}
        profileChannelRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
      try { profileChannelRef.current?.unsubscribe?.(); } catch {}
      profileChannelRef.current = null;
    };
  }, []);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const signIn = async (email: string, password: string) => {
    if (!supabase) return { data: null, error: { message: 'Auth disabled' } as any };
    return await supabase.auth.signInWithPassword({ email, password });
}

export const signUp = async (email: string, password: string, username: string, fullName: string) => {
    if (!supabase) return { data: null, error: { message: 'Auth disabled' } as any };
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          },
        },
      });

    if (error) return { data, error };

    // Create a profile entry
    if (data.user) {
        await supabase.from('profiles').insert({
            id: data.user.id,
            username,
            full_name: fullName,
        });
    }
    
    return { data, error };
}

export const signOut = async () => {
    if (!supabase) return { error: null } as any;
    return await supabase.auth.signOut();
} 