import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Image, Alert } from 'react-native';
import { Text, TextInput, Card, IconButton } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { resetPassword } from '../../src/hooks/useAuth';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/styles/colors';

const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) return;
    
    setIsLoading(true);
    setError(null);
    
    const { error } = await resetPassword(email);
    
    setIsLoading(false);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      Alert.alert(
        'Check your email',
        'We have sent a password reset link to your email address.',
        [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]
      );
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
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
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'height' : 'height'}
        keyboardVerticalOffset={0}
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
              Forgot Password
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Enter your email to reset your password
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Card style={styles.formCard}>
              <Card.Content style={styles.cardContent}>
                {!success ? (
                  <>
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
                            onSurface: colors.text,
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

                    {/* Reset Password Button */}
                    <View style={styles.buttonContainer}>
                      <LinearGradient
                        colors={['#FF6B35', '#E55A2B']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Button
                          variant="primary"
                          onPress={handleResetPassword}
                          disabled={isLoading || !email}
                          loading={isLoading}
                          fullWidth
                          size="large"
                          style={styles.resetButton}
                        >
                          {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                        </Button>
                      </LinearGradient>
                    </View>
                  </>
                ) : (
                  <View style={styles.successContainer}>
                    <IconButton icon="check-circle" size={64} iconColor={colors.success} />
                    <Text style={styles.successText}>
                      Check your email for instructions to reset your password.
                    </Text>
                    <Button
                      variant="outline"
                      onPress={() => router.replace('/login')}
                      style={styles.backButton}
                    >
                      Back to Login
                    </Button>
                  </View>
                )}

                {/* Back to Login Link */}
                {!success && (
                  <View style={styles.loginContainer}>
                    <Text style={styles.loginText}>
                      Remember your password?{' '}
                    </Text>
                    <Link href="/login" asChild>
                      <Text style={styles.loginLink}>Sign In</Text>
                    </Link>
                  </View>
                )}
              </Card.Content>
            </Card>
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
  logoContainer: {
    marginBottom: 28,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  resetButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 24,
  },
  backButton: {
    marginTop: 10,
    width: '100%',
  }
});

export default ForgotPasswordScreen;

