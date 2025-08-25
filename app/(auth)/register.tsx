import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Text, TextInput, Card, IconButton } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signUp } from '../../src/hooks/useAuth';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/styles/colors';

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
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    setIsLoading(true);
    setError(null);
    const { error } = await signUp(email, password);
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.replace('/login');
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
    <LinearGradient
      colors={['#000000', '#1C1C1E', '#2C2C2E']}
      style={styles.gradientContainer}
    >
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={colors.gradients.primary}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>GF</Text>
              </LinearGradient>
            </View>
            
            <Text style={styles.welcomeTitle}>
              Join GoFitAI
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Create your account to start your fitness journey
            </Text>
            
            <View style={styles.decorativeLine}>
              <View style={styles.line} />
              <View style={styles.dot} />
              <View style={styles.line} />
            </View>
          </View>

          {/* Register Form Section */}
          <View style={styles.formSection}>
            <Card style={styles.formCard}>
              <Card.Content style={styles.cardContent}>
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
                    left={<TextInput.Icon icon="email-outline" iconColor={colors.textSecondary} />}
                    theme={{
                      colors: {
                        primary: colors.primary,
                        onSurfaceVariant: colors.textSecondary,
                        outline: colors.border,
                      }
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
                    left={<TextInput.Icon icon="lock-outline" iconColor={colors.textSecondary} />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        iconColor={colors.textSecondary}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                    theme={{
                      colors: {
                        primary: colors.primary,
                        onSurfaceVariant: colors.textSecondary,
                        outline: colors.border,
                      }
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
                    left={<TextInput.Icon icon="lock-check-outline" iconColor={colors.textSecondary} />}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        iconColor={colors.textSecondary}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                    theme={{
                      colors: {
                        primary: colors.primary,
                        onSurfaceVariant: colors.textSecondary,
                        outline: colors.border,
                      }
                    }}
                  />
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <IconButton icon="alert-circle" size={16} iconColor={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Sign Up Button */}
                <Button
                  variant="primary"
                  onPress={handleRegister}
                  disabled={isLoading || !email || !password || !confirmPassword}
                  loading={isLoading}
                  fullWidth
                  size="large"
                  style={styles.signUpButton}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Sign In Link */}
                <View style={styles.signinContainer}>
                  <Text style={styles.signinText}>
                    Already have an account?{' '}
                  </Text>
                  <Link href="/login" asChild>
                    <Text style={styles.signinLink}>Sign In</Text>
                  </Link>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.06,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 28,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  line: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginHorizontal: 12,
  },
  
  // Form Section
  formSection: {
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardContent: {
    padding: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  inputContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1,
  },
  passwordHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  signUpButton: {
    marginBottom: 32,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginHorizontal: 16,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  signinLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
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
});

export default RegisterScreen; 