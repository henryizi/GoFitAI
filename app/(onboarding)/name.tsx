import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Animated, BackHandler } from 'react-native';
import { Text } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
// import { BlurView } from 'expo-blur';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

const NameScreen = () => {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = new Animated.Value(0);

  // Pre-fill name if user already has one from social auth, but allow editing
  useEffect(() => {
    // Pre-fill name from profile if available
    if (profile?.full_name && profile.full_name.trim() !== '' && profile.full_name.trim() !== 'User' && !name) {
      console.log('✅ Pre-filling name from profile:', profile.full_name);
      setName(profile.full_name);
      return;
    }
    
    // Also check user metadata as fallback (in case profile hasn't loaded yet)
    if (user?.user_metadata?.full_name && user.user_metadata.full_name.trim() !== '' && user.user_metadata.full_name.trim() !== 'User' && !name) {
      console.log('✅ Pre-filling name from metadata:', user.user_metadata.full_name);
      setName(user.user_metadata.full_name);
      return;
    }
  }, [profile?.full_name, user?.user_metadata?.full_name]);

  const handleNext = async () => {
    const preferredName = name.trim();
    
    if (!preferredName) {
      console.warn('⚠️ Name is empty, button should be disabled');
      return;
    }
    
    // Save data in background (non-blocking)
    if (user) {
      saveOnboardingData(
        supabase.from('profiles').upsert({ 
          id: user.id,
          full_name: preferredName,
          onboarding_completed: false
        }).select(),
        `Saving name: ${preferredName}`,
        undefined,
        user.id
      );
      
      // Analytics in background
      try { identify(user.id, { full_name: preferredName }); } catch (e) {
        console.warn('Analytics identify failed:', e);
      }
    }
    
    try { analyticsTrack('onboarding_step_next', { step: 'name' }); } catch (e) {
      console.warn('Analytics track failed:', e);
    }
    
    console.log('🚀 Navigating to gender screen...');
    router.replace('/(onboarding)/gender');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'name' }); } catch {}
  };

  // Prevent back gesture and hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Prevent going back from name screen
        return true; // Return true to prevent default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => subscription?.remove();
    }, [])
  );

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <OnboardingLayout
      title="What should we call you?"
      subtitle="Tell us your preferred name"
      progress={0.083}
      currentStep={1}
      totalSteps={12}
      showBackButton={false}
      showCloseButton={false}
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.questionLabel}>
          <Text style={styles.questionLabelText}>Question 1</Text>
        </View>
        
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to GoFitAI</Text>
          <Text style={styles.welcomeSubtext}>Your AI-powered fitness journey starts now</Text>
        </View>
        
        
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <LinearGradient
              colors={isFocused 
                ? ['rgba(255, 107, 53, 0.3)', 'rgba(255, 142, 83, 0.2)']
                : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
              }
              style={styles.inputGradient}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your preferred name"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                style={styles.textInput}
                autoCapitalize="words"
                autoFocus
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </LinearGradient>
          </View>
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(34, insets.bottom + 16) }]}>
        <OnboardingButton
          title="Continue"
          onPress={handleNext}
          disabled={!name.trim()}
        />
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    justifyContent: 'center',
  },
  questionLabel: {
    marginBottom: 8,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
    width: '100%',
  },
  questionLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  welcomeSubtext: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
    maxWidth: '90%',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 40,
  },
  inputWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  inputGradient: {
    padding: 2,
  },
  textInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 24,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});

export default NameScreen; 