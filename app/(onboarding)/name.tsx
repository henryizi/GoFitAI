import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';

const NameScreen = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');

  const handleNext = async () => {
    const fullName = name.trim();
    if (user && fullName) {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
      try { identify(user.id, { full_name: fullName }); } catch {}
      try { analyticsTrack('onboarding_step_next', { step: 'name' }); } catch {}
      router.push('/(onboarding)/gender');
    }
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'name' }); } catch {}
  };

  return (
    <OnboardingLayout
      title="What's your name?"
      subtitle="Let's get to know you better"
      progress={8}
      showBackButton={false}
      showCloseButton={true}
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            autoCapitalize="words"
            autoFocus
          />
        </View>
      </View>
      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleNext} 
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
          buttonColor={name.trim() ? colors.accent : colors.border}
          labelStyle={{color: 'white'}}
          disabled={!name.trim()}
        >
          Continue
        </Button>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginTop: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 18,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
  },
  nextButton: {
    borderRadius: 24,
    width: '100%',
  },
  nextButtonContent: {
    height: 56,
  },
});

export default NameScreen; 