import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Animated, BackHandler } from 'react-native';
import { Text } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
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

const NameScreen = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = new Animated.Value(0);

  const handleNext = async () => {
    const preferredName = name.trim();
    if (user && preferredName) {
      await supabase.from('profiles').update({ full_name: preferredName }).eq('id', user.id);
      try { identify(user.id, { full_name: preferredName }); } catch {}
      try { analyticsTrack('onboarding_step_next', { step: 'name' }); } catch {}
      router.push('/(onboarding)/gender');
    }
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
      progress={0.09}
      currentStep={1}
      totalSteps={12}
      showBackButton={false}
      showCloseButton={false}
      onClose={handleClose}
    >
      <View style={styles.content}>
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
      <View style={styles.footer}>
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
    padding: 24,
  },
});

export default NameScreen; 