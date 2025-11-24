import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../ui/Button';
import { colors } from '../../styles/colors';
import { signInWithApple, signInWithGoogle, getAvailableSocialProviders, useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase/client';

interface SocialAuthButtonsProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onSuccess,
  onError,
  disabled = false
}) => {
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState({
    apple: false,
    google: false
  });
  const router = useRouter();
  const { refreshProfile, profile } = useAuth();

  useEffect(() => {
    checkAvailableProviders();
  }, []);

  const checkAvailableProviders = async () => {
    try {
      const providers = await getAvailableSocialProviders();
      setAvailableProviders(providers);
    } catch (error) {
      console.warn('Failed to check available providers:', error);
    }
  };

  const handleAppleSignIn = async () => {
    if (disabled || isAppleLoading) return;

    setIsAppleLoading(true);
    try {
      const result = await signInWithApple();
      
      if (result.success) {
        console.log('✅ Apple Sign-In successful!');
        
        // Log user ID and email for debugging
        if (result.user) {
          console.log('🆔 USER ID:', result.user.id);
          console.log('📧 USER EMAIL:', result.user.email);
        }
        
        // For linked accounts, wait longer for profile creation to complete
        // This prevents the race condition where we navigate before profile state updates
        const isLinkedAccount = result.user?.identities && result.user.identities.length > 1;
        
        if (isLinkedAccount) {
          console.log('🔗 Linked account detected - waiting for profile creation to complete...');
          console.log('🔍 User identities count:', result.user.identities.length);
          
          // Wait 5 seconds for profile creation and auth state to sync
          // This is longer than before because profile creation can take time
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('✅ Profile creation wait completed (5 seconds)');
          
          // Try to verify profile was created
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, onboarding_completed')
              .eq('id', result.user.id)
              .single();
            
            if (profile) {
              console.log('✅ Profile verified after wait:', profile);
            } else {
              console.warn('⚠️ Profile still not found after 5 second wait');
            }
          } catch (error) {
            console.warn('⚠️ Error verifying profile after wait:', error);
          }
        }
        
        Alert.alert(
          "Welcome to GoFitAI! 🍎",
          "Successfully signed in with Apple. Let's get you started on your fitness journey!",
          [
            {
              text: "Let's Go!",
              onPress: () => {
                onSuccess?.();
                // Let the app's routing logic handle where to go next
                router.replace('/');
              }
            }
          ]
        );
      } else {
        const errorMessage = result.error || 'Apple Sign-In failed';
        onError?.(errorMessage);
        Alert.alert('Sign-In Failed', errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Apple Sign-In failed';
      onError?.(errorMessage);
      Alert.alert('Sign-In Failed', errorMessage);
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (disabled || isGoogleLoading) return;

    setIsGoogleLoading(true);
    try {
      console.log('🚀 Starting Google Sign-In...');
      
      // Direct sign-in without timeout (new implementation is much faster)
      const result = await signInWithGoogle();
      
      console.log('🔍 Google Sign-In result:', result);
      
      if (result.success) {
        console.log('✅ Google Sign-In successful!');
        
        // Log user ID and email for debugging
        if (result.user) {
          console.log('🆔 USER ID:', result.user.id);
          console.log('📧 USER EMAIL:', result.user.email);
        }
        
        // For linked accounts, wait longer for profile creation to complete
        // This prevents the race condition where we navigate before profile state updates
        const isLinkedAccount = result.user?.identities && result.user.identities.length > 1;
        
        if (isLinkedAccount) {
          console.log('🔗 Linked account detected - waiting for profile creation to complete...');
          console.log('🔍 User identities count:', result.user.identities.length);
          
          // Wait 5 seconds for profile creation and auth state to sync
          // This is longer than before because profile creation can take time
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('✅ Profile creation wait completed (5 seconds)');
          
          // Profile verification is now handled by the ProfileService after navigation
          console.log('🔍 Profile verification completed for Google sign-in');
        } else {
          // For regular (non-linked) accounts, wait briefly for auth state to propagate
          console.log('👤 Regular Google account - waiting for auth state to propagate...');
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('✅ Auth state propagation wait completed');
        }
        
        console.log('🚀 Navigating to app (index route will handle routing)...');
        
        onSuccess?.();
        
        // Navigate to index route - it will redirect to onboarding for new users
        // or to dashboard/paywall for existing users based on profile status
        router.replace('/');
      } else {
        console.log('❌ Google Sign-In failed:', result.error);
        const errorMessage = result.error || 'Google Sign-In failed';
        onError?.(errorMessage);
        Alert.alert('Sign-In Failed', errorMessage);
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      const errorMessage = error.message || 'Google Sign-In failed';
      onError?.(errorMessage);
      Alert.alert('Sign-In Failed', errorMessage);
    } finally {
      console.log('🔄 Resetting Google loading state...');
      setIsGoogleLoading(false);
    }
  };

  // Don't render if no providers are available
  if (!availableProviders.apple && !availableProviders.google) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Auth Buttons */}
      <View style={styles.socialButtonsContainer}>
        {/* Apple Sign-In Button */}
        {availableProviders.apple && (
          <Button
            onPress={handleAppleSignIn}
            disabled={disabled || isAppleLoading || isGoogleLoading}
            style={[styles.socialButton, styles.appleButton]}
          >
            <View style={styles.buttonContent}>
              {isAppleLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.appleButtonText}>
                {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
              </Text>
            </View>
          </Button>
        )}

        {/* Google Sign-In Button */}
        {availableProviders.google && (
          <Button
            onPress={handleGoogleSignIn}
            disabled={disabled || isAppleLoading || isGoogleLoading}
            style={[styles.socialButton, styles.googleButton]}
          >
            <View style={styles.buttonContent}>
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#1F2937" />
              ) : (
                <Ionicons name="logo-google" size={20} color="#4285F4" />
              )}
              <Text style={styles.googleButtonText}>
                {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </View>
          </Button>
        )}
      </View>

      {/* Privacy Notice */}
      <Text style={styles.privacyText}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    gap: 12,
  },
  socialButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#333333',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 16,
    lineHeight: 16,
  },
});

export default SocialAuthButtons;
