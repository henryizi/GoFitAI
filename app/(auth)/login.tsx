import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Text, TextInput, Card, IconButton } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn } from '../../src/hooks/useAuth';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/styles/colors';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    if (!email || !password) {
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.replace('/dashboard');
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

  return (
    <View style={styles.container}>
      {/* Professional Background Gradient */}
      <LinearGradient
        colors={['#1C1C1E', '#000000']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Subtle Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']}
        style={styles.overlayGradient}
      />
      
      {/* Elegant Accent Elements */}
      <View style={styles.accentLine1} />
      <View style={styles.accentLine2} />
      <View style={styles.accentDot} />

      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.welcomeTitle}>
              Welcome Back
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to continue your fitness journey
            </Text>
            
            <View style={styles.decorativeLine}>
              <View style={styles.line} />
              <View style={styles.dot} />
              <View style={styles.line} />
            </View>
          </View>

          {/* Login Form Section */}
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
                    left={<TextInput.Icon icon="email-outline" />}
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
                    left={<TextInput.Icon icon="lock-outline" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
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
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <IconButton icon="alert-circle" size={16} iconColor={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Forgot Password Link */}
                <View style={styles.forgotPasswordContainer}>
                  <Link href="/forgot-password" asChild>
                    <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                  </Link>
                </View>

                {/* Sign In Button */}
                <View style={styles.buttonContainer}>
                  <LinearGradient
                    colors={['#FF6B35', '#E55A2B']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Button
                      variant="primary"
                      onPress={handleLogin}
                      disabled={isLoading || !email || !password}
                      loading={isLoading}
                      fullWidth
                      size="large"
                      style={styles.signInButton}
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </LinearGradient>
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                  <Text style={styles.signupText}>
                    Don't have an account?{' '}
                  </Text>
                  <Link href="/register" asChild>
                    <Text style={styles.signupLink}>Create Account</Text>
                  </Link>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              By signing in, you agree to our Terms of Service and Privacy Policy
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
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  accentLine1: {
    position: 'absolute',
    top: height * 0.15,
    right: width * 0.1,
    width: 2,
    height: 60,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  accentLine2: {
    position: 'absolute',
    bottom: height * 0.25,
    left: width * 0.08,
    width: 1,
    height: 40,
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  accentDot: {
    position: 'absolute',
    top: height * 0.35,
    right: width * 0.15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  line: {
    width: 30,
    height: 1,
    backgroundColor: colors.border,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
    marginBottom: 24,
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
    fontSize: 16,
  },
  inputContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    borderRadius: 16,
  },
  signInButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Footer Section
  footerSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default LoginScreen; 