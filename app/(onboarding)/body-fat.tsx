import React, { useState } from 'react';
import { View, StyleSheet, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { Appbar } from 'react-native-paper';
import { identify } from '../../src/services/analytics/analytics';

const BodyFatScreen = () => {
  const { user } = useAuth();
  const [bodyFat, setBodyFat] = useState('');

  const handleNext = async () => {
    if (user && bodyFat) {
      const bodyFatNumber = parseFloat(bodyFat);
      if (!isNaN(bodyFatNumber) && bodyFatNumber >= 0 && bodyFatNumber <= 50) {
                 await supabase.from('profiles').update({ body_fat: bodyFatNumber }).eq('id', user.id);
         try { identify(user.id, { body_fat: bodyFatNumber }); } catch {}
         router.push('/(onboarding)/fat-reduction');
      }
    }
  };

  const isValid = bodyFat && parseFloat(bodyFat) >= 0 && parseFloat(bodyFat) <= 50;

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.replace('/(onboarding)/activity-level')} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '67%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={() => router.replace('/(main)/dashboard')} />
      </Appbar.Header>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={undefined}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.content}>
              <Text style={styles.title}>What's your body fat percentage?</Text>
              <Text style={styles.subtitle}>This helps us track your body composition progress</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  placeholder=""
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  autoFocus
                />
                <Text style={styles.unit}>%</Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
        <View style={styles.footer}>
          <Button 
            mode="contained" 
            onPress={handleNext} 
            style={styles.nextButton}
            contentStyle={styles.nextButtonContent}
            buttonColor={isValid ? colors.accent : colors.border}
            labelStyle={{color: 'white'}}
            disabled={!isValid}
          >
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appbar: {
    backgroundColor: colors.background,
    elevation: 0,
    borderBottomWidth: 0,
  },
  progressBar: {
    flex: 1,
    alignItems: 'center',
  },
  progress: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 120,
  },
  unit: {
    fontSize: 18,
    color: colors.text,
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    backgroundColor: colors.background,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  nextButton: {
    borderRadius: 24,
    width: '100%',
  },
  nextButtonContent: {
    height: 56,
  },
});

export default BodyFatScreen; 