import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  progress?: number;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  onBack?: () => void;
  previousScreen?: string;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  title,
  subtitle,
  progress = 0,
  showBackButton = false,
  showCloseButton = true,
  onBack,
  previousScreen,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with gradient background */}
      <LinearGradient
        colors={['#FF6B35', '#E55A2B']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {showBackButton && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  console.log('Back button pressed');
                  if (onBack) {
                    onBack();
                  } else if (previousScreen) {
                    router.replace(previousScreen);
                  } else {
                    router.back();
                  }
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            
            <View style={styles.progressContainer}>
              <View style={styles.diamondProgressContainer}>
                {Array.from({ length: 8 }, (_, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.diamondStep,
                      { 
                        backgroundColor: progress > (index + 1) * 12.5 
                          ? colors.text 
                          : 'rgba(255, 255, 255, 0.2)',
                        transform: [{ rotate: '45deg' }],
                        borderColor: progress > (index + 1) * 12.5 
                          ? 'rgba(255, 255, 255, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)'
                      }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
            
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => router.replace('/(main)/dashboard')}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.text,
    borderRadius: 4,
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    opacity: 0.8,
  },
  diamondProgressContainer: {
    width: '100%',
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
    paddingHorizontal: 4,
  },
  diamondStep: {
    width: 12,
    height: 12,
    borderWidth: 1,
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
}); 