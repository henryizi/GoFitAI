import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SAFE_AREA_PADDING_BOTTOM } from '../_layout';

const { width } = Dimensions.get('window');

// App's consistent dark theme colors
const colors = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  primaryDark: '#E55A2B',
  background: 'rgba(18, 18, 20, 0.95)',
  backgroundLight: 'rgba(28, 28, 30, 0.8)',
  surface: 'rgba(28, 28, 30, 1)',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.4)',
  accent: '#FF8F65',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  border: 'rgba(255, 255, 255, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  card: 'rgba(28, 28, 30, 1)',
  overlay: 'rgba(255, 107, 53, 0.1)',
  white: '#FFFFFF',
};

const PLAN_TYPES = [
  {
    id: 'manual',
    title: 'Manual Setup',
    subtitle: 'Custom calories & macros',
    description: 'Set your own daily calorie target and macronutrient breakdown. Perfect if you know exactly what you need.',
    icon: 'pencil-outline' as const,
    color: colors.primary,
    gradient: ['rgba(255,107,53,0.08)', 'rgba(255,107,53,0.04)'],
  },
  {
    id: 'mathematical',
    title: 'Mathematical Plan',
    subtitle: 'Smart nutrition planning',
    description: 'Let our algorithm calculate your optimal nutrition targets based on proven mathematical formulas and your body metrics.',
    icon: 'calculator-variant' as const,
    color: colors.accent,
    gradient: ['rgba(255,143,101,0.08)', 'rgba(255,143,101,0.04)'],
  },
];

const PlanTypeSelectionScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const progressAnimation = React.useRef(new Animated.Value(0)).current;

  const handleTypeSelection = (typeId: string) => {
    setSelectedType(typeId);
  };

  const handleContinue = () => {
    if (selectedType === 'manual') {
      // Navigate to manual plan creation
      router.push('/(main)/nutrition/plan-create-manual');
    } else if (selectedType === 'mathematical') {
      // Navigate to mathematical plan creation (simplified)
      router.push('/(main)/nutrition/plan-create-mathematical');
    }
  };

  const canProceed = () => {
    return selectedType !== '';
  };

  const getSelectedTypeData = () => {
    return PLAN_TYPES.find(type => type.id === selectedType);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Clean background */}
      <View style={[styles.background, { backgroundColor: colors.background }]}>
        <View style={[styles.pattern, { backgroundColor: colors.overlay }]} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>1/3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.stepNumber}>STEP 01</Text>
            <Text style={styles.title}>Choose Your Approach</Text>
            <Text style={styles.subtitle}>How would you like to create your nutrition plan?</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {PLAN_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => handleTypeSelection(type.id)}
                style={[
                  styles.optionCard,
                  selectedType === type.id && styles.selectedOptionCard
                ]}
              >
                <View style={[styles.optionContent, selectedType === type.id && styles.selectedOptionContent]}>
                  <View style={styles.optionIconContainer}>
                    <Icon
                      name={type.icon}
                      size={28}
                      color={selectedType === type.id ? colors.white : type.color}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, selectedType === type.id && styles.selectedOptionTitle]}>
                      {type.title}
                    </Text>
                    <Text style={[styles.optionSubtitle, selectedType === type.id && styles.selectedOptionSubtitle]}>
                      {type.subtitle}
                    </Text>
                    <Text style={[styles.optionDescription, selectedType === type.id && styles.selectedOptionDescription]}>
                      {type.description}
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, selectedType === type.id && styles.selectedRadioCircle]}>
                    {selectedType === type.id && <View style={styles.radioDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[
        styles.bottomNav,
        {
          bottom: Math.max(insets.bottom + 20, SAFE_AREA_PADDING_BOTTOM + 20, 20),
          paddingBottom: Math.max(insets.bottom + 16, SAFE_AREA_PADDING_BOTTOM + 16),
        }
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButtonNav}
        >
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canProceed() || isGenerating}
          style={[styles.continueButton, !canProceed() && styles.disabledButton]}
        >
          <Text style={styles.continueButtonText}>
            CONTINUE
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Progress Modal */}
      <Modal
        visible={isGenerating}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[colors.background, colors.backgroundLight]}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Generating Your Plan</Text>
            <Text style={styles.modalSubtitle}>
              Calculating your personalized nutrition plan...
            </Text>

            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  }) }
                ]}
              />
            </View>

            <Text style={styles.progressText}>{generationProgress}%</Text>

            <View style={styles.stepsContainer}>
              <View style={[styles.stepItem, generationProgress >= 25 ? styles.completedStep : {}]}>
                <Icon name={generationProgress >= 25 ? "check-circle" : "circle-outline"}
                      size={24}
                      color={generationProgress >= 25 ? colors.success : colors.textSecondary} />
                <Text style={[styles.stepText, generationProgress >= 25 ? styles.completedStepText : {}]}>
                  Analyzing your selection
                </Text>
              </View>

              <View style={[styles.stepItem, generationProgress >= 50 ? styles.completedStep : {}]}>
                <Icon name={generationProgress >= 50 ? "check-circle" : "circle-outline"}
                      size={24}
                      color={generationProgress >= 50 ? colors.success : colors.textSecondary} />
                <Text style={[styles.stepText, generationProgress >= 50 ? styles.completedStepText : {}]}>
                  Setting up your plan
                </Text>
              </View>

              <View style={[styles.stepItem, generationProgress >= 75 ? styles.completedStep : {}]}>
                <Icon name={generationProgress >= 75 ? "check-circle" : "circle-outline"}
                      size={24}
                      color={generationProgress >= 75 ? colors.success : colors.textSecondary} />
                <Text style={[styles.stepText, generationProgress >= 75 ? styles.completedStepText : {}]}>
                  Finalizing details
                </Text>
              </View>
            </View>

            <Text style={styles.modalNote}>
              This may take a moment. We're preparing your personalized experience.
            </Text>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120, // Leave space for bottom navigation
  },
  pattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 120, // Leave space for bottom navigation
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIndicator: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140, // More space for bottom navigation
  },
  content: {
    flex: 1,
  },
  titleSection: {
    marginBottom: 48,
  },
  stepNumber: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedOptionCard: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1.01 }],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  selectedOptionContent: {
    backgroundColor: colors.primary,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedOptionTitle: {
    color: colors.white,
  },
  optionSubtitle: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedOptionSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  optionDescription: {
    color: colors.textTertiary,
    fontSize: 15,
    lineHeight: 21,
  },
  selectedOptionDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  selectedRadioCircle: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: colors.background,
    zIndex: 10,
    elevation: 10,
  },
  backButtonNav: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  continueButton: {
    flex: 1,
    marginLeft: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  progressText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginLeft: 12,
  },
  completedStep: {
    opacity: 1,
  },
  completedStepText: {
    color: colors.text,
  },
  modalNote: {
    color: colors.textTertiary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default PlanTypeSelectionScreen;
