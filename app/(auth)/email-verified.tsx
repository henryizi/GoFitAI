import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/styles/colors';
import { supabase } from '../../src/services/supabase/client';

const { width, height } = Dimensions.get('window');

const EmailVerifiedScreen = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'loading'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Supabase sends 'token_hash' parameter, not 'token'
        const token = searchParams.token_hash as string;
        const type = searchParams.type as string;

        console.log('🔍 Email verification params:', { token: token?.substring(0, 10) + '...', type });

        if (type === 'signup' && token) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email',
          });

          if (error) {
            setVerificationStatus('error');
            setMessage('驗證失敗。連結可能已過期或無效。');
          } else {
            setVerificationStatus('success');
            setMessage('電子郵件驗證成功！歡迎來到 GoFitAI！');
          }
        } else {
          console.log('❌ Missing parameters for email verification:', { token: !!token, type });
          setVerificationStatus('error');
          setMessage('無效的驗證連結。缺少必要的驗證參數。');
        }
      } catch (error) {
        setVerificationStatus('error');
        setMessage('驗證過程中發生錯誤。');
      } finally {
        setIsVerifying(false);
      }
    };

    handleEmailVerification();
  }, [searchParams]);

  const handleContinue = () => {
    if (verificationStatus === 'success') {
      router.replace('/(main)/onboarding');
    } else {
      router.replace('/login');
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>
                {verificationStatus === 'success' ? '✅' : 
                 verificationStatus === 'error' ? '❌' : '⏳'}
              </Text>
            </View>

            <Text style={styles.title}>
              {verificationStatus === 'success' ? 'Email Verified!' : 
               verificationStatus === 'error' ? 'Verification Failed' : 'Verifying...'}
            </Text>

            <Text style={styles.subtitle}>
              {isVerifying ? '正在驗證你的電子郵件...' : message}
            </Text>

            {verificationStatus === 'success' && (
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeTitle}>歡迎來到 GoFitAI! 🏋️‍♂️</Text>
                <Text style={styles.welcomeText}>
                  你的帳戶已成功啟用。現在可以開始你的健身之旅：
                </Text>
                <View style={styles.featureList}>
                  <Text style={styles.feature}>🤖 AI 個人化訓練計劃</Text>
                  <Text style={styles.feature}>🍎 智能營養建議</Text>
                  <Text style={styles.feature}>📊 詳細進度追蹤</Text>
                  <Text style={styles.feature}>💪 專業健身指導</Text>
                </View>
              </View>
            )}

            {!isVerifying && (
              <Button
                variant="primary"
                onPress={handleContinue}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                {verificationStatus === 'success' ? '開始使用 GoFitAI' : '返回登入'}
              </Button>
            )}
          </Card.Content>
        </Card>

        <Text style={styles.footerText}>
          GoFitAI - 讓 AI 成為你的健身夥伴
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardContent: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  welcomeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  feature: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    borderRadius: 25,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: colors.surface,
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.8,
  },
});

export default EmailVerifiedScreen;
