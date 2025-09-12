import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
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
  currentStep?: number;
  totalSteps?: number;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  onBack?: () => void;
  previousScreen?: string;
  onClose?: () => void;
  disableScroll?: boolean;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  title,
  subtitle,
  progress = 0,
  currentStep = 1,
  totalSteps = 11,
  showBackButton = false,
  showCloseButton = false,
  onBack,
  previousScreen,
  onClose,
  disableScroll = false,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with dark background */}
      <View style={styles.header}>
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
            
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/custom-logo.jpg')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  if (onClose) {
                    try { onClose(); } catch (e) {}
                  }
                  router.replace('/(main)/dashboard');
                }}
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

          {/* Enhanced Progress Section */}
          <View style={styles.progressContainer}>
            {/* Progress Header with Icons */}
            <View style={styles.progressHeader}>
              <View style={styles.progressLabelContainer}>
                <Ionicons name="fitness" size={16} color="#FFD700" />
                <Text style={styles.progressLabel}>Your Journey</Text>
              </View>
              <View style={styles.progressStatsContainer}>
                <Text style={styles.progressStep}>
                  Step {currentStep} of {totalSteps}
                </Text>
                <Text style={styles.progressPercentage}>
                  {Math.round((progress || 0) * 100)}%
                </Text>
              </View>
            </View>

            {/* Step Indicators */}
            <View style={styles.stepIndicatorsContainer}>
              {Array.from({ length: Math.min(totalSteps, 8) }, (_, i) => (
                <View key={i} style={styles.stepIndicatorWrapper}>
                  <View style={[
                    styles.stepIndicator,
                    i < currentStep ? styles.stepCompleted : 
                    i === currentStep - 1 ? styles.stepCurrent : styles.stepPending
                  ]}>
                    {i < currentStep - 1 ? (
                      <Ionicons name="checkmark" size={8} color="#FF6B35" />
                    ) : i === currentStep - 1 ? (
                      <View style={styles.currentStepPulse} />
                    ) : null}
                  </View>
                  {i < Math.min(totalSteps, 8) - 1 && (
                    <View style={[
                      styles.stepConnector,
                      i < currentStep - 1 && styles.stepConnectorCompleted
                    ]} />
                  )}
                </View>
              ))}
            </View>

            {/* Main Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBackground}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500', '#FF6B35']}
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min((progress || 0) * 100, 100)}%` }
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <View style={styles.progressGlow} />
              </View>
              
              {/* Progress Milestones */}
              <View style={styles.progressMilestones}>
                {[25, 50, 75].map((milestone) => (
                  <View 
                    key={milestone}
                    style={[
                      styles.progressMilestone,
                      { left: `${milestone}%` },
                      (progress || 0) * 100 >= milestone && styles.progressMilestoneReached
                    ]}
                  >
                    <Ionicons 
                      name="star" 
                      size={10} 
                      color={(progress || 0) * 100 >= milestone ? "#FFD700" : "rgba(255, 255, 255, 0.3)"} 
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Progress Motivational Text */}
            <View style={styles.motivationContainer}>
              <Text style={styles.motivationText}>
                {(progress || 0) < 0.3 ? "🚀 Getting started..." :
                 (progress || 0) < 0.6 ? "💪 Making progress!" :
                 (progress || 0) < 0.9 ? "🔥 Almost there!" :
                 "🎉 Nearly complete!"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      {disableScroll ? (
        <View style={[styles.content, styles.contentNoScroll]}>
          {children}
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContent: {
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
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.lg,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '90%',
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentNoScroll: {
    flex: 1,
  },
  progressContainer: {
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressStatsContainer: {
    alignItems: 'flex-end',
  },
  progressStep: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  
  // Step Indicators
  stepIndicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  stepIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepCompleted: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCurrent: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    borderWidth: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  stepPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  currentStepPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  stepConnector: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
  stepConnectorCompleted: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 1,
  },

  // Progress Bar
  progressBarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  progressBackground: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  progressGlow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    bottom: -2,
    borderRadius: 7,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 1,
  },

  // Progress Milestones
  progressMilestones: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 14,
    flexDirection: 'row',
  },
  progressMilestone: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressMilestoneReached: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },

  // Motivation
  motivationContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  motivationText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
}); 