import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, Image, Linking, TouchableOpacity } from 'react-native';
import { Text, TextInput, Card, IconButton } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signUp } from '../../src/hooks/useAuth';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/styles/colors';
import HealthDisclaimer from '../../src/components/legal/HealthDisclaimer';
import SocialAuthButtons from '../../src/components/auth/SocialAuthButtons';

const { width, height } = Dimensions.get('window');

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await signUp(email.trim(), password);
      
      if (error) {
        // Handle email sending errors - account might still be created
        let errorMessage = error.message;
        
        // Check if account was created despite email error
        if (data?.user && error.message?.toLowerCase().includes('email')) {
          // Account created but email failed - this is recoverable
          setIsLoading(false);
          Alert.alert(
            "Account Created! 📧",
            `Your GoFitAI account has been created successfully!\n\nHowever, we couldn't send the verification email right now. Don't worry - you can:\n\n1. Try signing in with your email and password\n2. Request a new verification email from the login screen\n3. Check your spam folder\n\nYour account is ready to use!`,
            [
              {
                text: "Sign In",
                onPress: () => router.replace('/login')
              },
              {
                text: "OK",
                style: 'cancel'
              }
            ]
          );
          return;
        }
        
        // Handle common Supabase errors
        if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
          errorMessage = "An account with this email already exists. Please sign in instead.";
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = "Please enter a valid email address.";
        } else if (error.message?.includes('Password')) {
          errorMessage = "Password must be at least 6 characters long.";
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message?.includes('timeout')) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message?.toLowerCase().includes('email') || error.message?.toLowerCase().includes('confirmation')) {
          // Email-related errors - be more helpful
          errorMessage = "Account created, but email verification couldn't be sent. You can sign in and request a new verification email.";
        } else if (!error.message || error.message === '') {
          errorMessage = "Unable to create account. Please try again.";
        }
        
        setError(errorMessage);
        setIsLoading(false);
      } else if (data?.user) {
        // Success - show email verification message
        setIsLoading(false);
        Alert.alert(
          "Welcome to GoFitAI! 🏋️‍♂️",
          `Thanks for joining GoFitAI - your AI fitness coach!\n\nWe've sent a verification link to ${email}. Please check your email and click the link to activate your account.\n\nOnce verified, you'll have access to:\n• AI-powered workout plans\n• Smart nutrition guidance\n• Progress tracking\n• Personalized coaching`,
          [
            {
              text: "Check My Email",
              onPress: () => router.replace('/login')
            }
          ]
        );
      } else {
        // No error but no user data - unexpected case
        setIsLoading(false);
        setError("Account creation completed, but we couldn't verify it. Please check your email for verification link.");
      }
    } catch (error: any) {
      // Catch any unexpected errors
      setIsLoading(false);
      console.error('Account creation error:', error);
      setError(error?.message || "An unexpected error occurred. Please try again.");
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (error) setError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) setError(null);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (error) setError(null);
  };

  return (
    <View style={styles.container}>
    <LinearGradient
        colors={['#0F0F11', '#18181B', '#000000']}
        style={styles.backgroundGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bounces={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/custom-logo.jpg')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.welcomeTitle}>
              Join GoFitAI
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Create your account to start your fitness journey
            </Text>
          </View>

          {/* Register Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              <View style={styles.cardContent}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={handleEmailChange}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={styles.input}
                    contentStyle={styles.inputContent}
                    outlineStyle={styles.inputOutline}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textTertiary}
                    left={<TextInput.Icon icon="email-outline" color={colors.textSecondary} />}
                    theme={{
                      colors: {
                        primary: colors.primary,
                        onSurfaceVariant: colors.textSecondary,
                        outline: 'rgba(255, 255, 255, 0.1)',
                        onSurface: colors.text,
                        background: 'transparent',
                        surface: 'transparent',
                        placeholder: colors.textTertiary,
                      },
                      roundness: 16,
                    }}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={handlePasswordChange}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    contentStyle={styles.inputContent}
                    outlineStyle={styles.inputOutline}
                    placeholder="Create a password"
                    placeholderTextColor={colors.textTertiary}
                    left={<TextInput.Icon icon="lock-outline" color={colors.textSecondary} />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        color={colors.textSecondary}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                    autoComplete="new-password"
                    textContentType="newPassword"
                    theme={{
                      colors: {
                        primary: colors.primary,
                        onSurfaceVariant: colors.textSecondary,
                        outline: 'rgba(255, 255, 255, 0.1)',
                        onSurface: colors.text,
                        background: 'transparent',
                        surface: 'transparent',
                        placeholder: colors.textTertiary,
                      },
                      roundness: 16,
                    }}
                  />
                  <Text style={styles.passwordHint}>
                    Must be at least 6 characters long
                  </Text>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    mode="outlined"
                    secureTextEntry={!showConfirmPassword}
                    style={styles.input}
                    contentStyle={styles.inputContent}
                    outlineStyle={styles.inputOutline}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.textTertiary}
                    left={<TextInput.Icon icon="lock-check-outline" color={colors.textSecondary} />}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        color={colors.textSecondary}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                    autoComplete="new-password"
                    textContentType="newPassword"
                    theme={{
                      colors: {
                        primary: colors.primary,
                        onSurfaceVariant: colors.textSecondary,
                        outline: 'rgba(255, 255, 255, 0.1)',
                        onSurface: colors.text,
                        background: 'transparent',
                        surface: 'transparent',
                        placeholder: colors.textTertiary,
                      },
                      roundness: 16,
                    }}
                  />
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <IconButton icon="alert-circle" size={18} iconColor="#FF5252" style={{margin: 0}} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Sign Up Button */}
                <View style={styles.buttonContainer}>
                  <LinearGradient
                    colors={[colors.primary, '#E55A2B']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                <Button
                  variant="primary"
                  onPress={handleRegister}
                  disabled={isLoading || !email || !password || !confirmPassword}
                  loading={isLoading}
                  fullWidth
                  size="large"
                  style={styles.signUpButton}
                      labelStyle={styles.signUpButtonLabel}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
                  </LinearGradient>
                </View>

                {/* Social Authentication Buttons */}
                <SocialAuthButtons
                  onSuccess={() => {
                    console.log('Social auth successful');
                  }}
                  onError={(error) => {
                    setError(error);
                  }}
                  disabled={isLoading}
                />

                {/* Sign In Link */}
                <View style={styles.signinContainer}>
                  <Text style={styles.signinText}>
                    Already have an account?{' '}
                  </Text>
                  <Link href="/login" asChild>
                    <Text style={styles.signinLink}>Sign In</Text>
                  </Link>
                </View>
              </View>
            </View>
          </View>

          {/* Health Disclaimer Section */}
          <View style={styles.disclaimerSection}>
            <HealthDisclaimer variant="compact" />
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our{' '}
              <Text 
                style={styles.footerLink}
                onPress={() => Linking.openURL('https://henryizi.github.io/gofitai-privacy/terms-of-service.html')}
              >
                Terms of Service
              </Text>
              {', '}
              <Text 
                style={styles.footerLink}
                onPress={() => Linking.openURL('https://henryizi.github.io/gofitai-privacy/')}
              >
                Privacy Policy
              </Text>
              , and Health Disclaimer
            </Text>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.06,
    paddingBottom: 40,
    minHeight: height,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  
  // Form Section
  formSection: {
    width: '100%',
  },
  formCard: {
    backgroundColor: 'rgba(28, 28, 30, 0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    fontSize: 16,
  },
  inputContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    color: '#FFFFFF',
  },
  inputOutline: {
    borderRadius: 16,
    borderWidth: 1,
  },
  passwordHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 6,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.2)',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    borderRadius: 16,
  },
  signUpButton: {
    backgroundColor: 'transparent',
    height: 56,
  },
  signUpButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  signinText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  signinLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  
  // Disclaimer Section
  disclaimerSection: {
    marginTop: 24,
    marginHorizontal: 4,
  },
  
  // Footer Section
  footerSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
