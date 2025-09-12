import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import {
  Button,
  Text,
  ActivityIndicator,
  ProgressBar,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SAFE_AREA_PADDING_BOTTOM } from '../_layout';

const { width } = Dimensions.get('window');

// Modern, premium colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
  darkGray: '#1C1C1E',
  mediumGray: '#8E8E93',
};

const GOALS = ['fat_loss', 'muscle_gain', 'maintenance'];
const DIETARY_PREFERENCES = ['vegan', 'keto', 'paleo', 'vegetarian'];
const INTOLERANCES = ['gluten', 'dairy', 'nuts', 'soy'];

const GOAL_DETAILS = {
  fat_loss: {
    title: 'Fat Loss',
    icon: 'fire',
    description: 'Calorie deficit with high protein to preserve muscle.',
    color: colors.accent,
  },
  muscle_gain: {
    title: 'Muscle Gain',
    icon: 'arm-flex',
    description: 'Calorie surplus with high protein to build muscle.',
    color: colors.primary,
  },
  maintenance: {
    title: 'Maintenance',
    icon: 'scale-balance',
    description: 'Balanced macros to maintain your current physique.',
    color: colors.secondary,
  },
};

const PlanCreateScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const progressAnimation = React.useRef(new Animated.Value(0)).current;
  
  const totalSteps = 2; // Reduced from 3 to 2 since we removed goal selection
  const progress = currentStep / totalSteps;

  // Automatically determine goal from onboarding data
  useEffect(() => {
    if (profile) {
      const primaryGoal = profile.primary_goal;
      const fitnessStrategy = profile.fitness_strategy;

      // Determine goal based on primary_goal or fitness_strategy
      if (primaryGoal === 'fat_loss' || fitnessStrategy === 'cut') {
        setSelectedGoal('fat_loss');
      } else if (primaryGoal === 'muscle_gain' || fitnessStrategy === 'bulk') {
        setSelectedGoal('muscle_gain');
      } else {
        setSelectedGoal('maintenance');
      }
    }
  }, [profile]);

  const handleGeneratePlan = async () => {
    try {
      console.log('=== GENERATE PLAN BUTTON PRESSED ===');
      console.log('handleGeneratePlan called, user:', user?.id);
      console.log('Platform:', Platform.OS);
      console.log('API URL:', NutritionService.API_URL);

      // Add visual feedback immediately
      setIsGenerating(true);
      setError(null);
      
      // Start progress animation
      setGenerationProgress(0);
      progressAnimation.setValue(0);
      
      // Animate progress to simulate AI generation steps
      Animated.sequence([
        Animated.timing(progressAnimation, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: false
        }),
        Animated.timing(progressAnimation, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: false
        }),
        Animated.timing(progressAnimation, {
          toValue: 0.9,
          duration: 3000,
          useNativeDriver: false
        })
      ]).start();

      // Check if a plan already exists
      console.log('Checking for existing plans...');
      const existingPlan = await NutritionService.getLatestNutritionPlan(user?.id || 'guest');
      console.log('Existing plan check:', existingPlan ? 'found' : 'none');

      if (existingPlan) {
        // Stop animation if we need to ask for confirmation
        Animated.timing(progressAnimation, {
          toValue: 0.3,
          duration: 0,
          useNativeDriver: false
        }).stop();
        
        // If a plan exists, ask the user if they want to replace it
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Replace Existing Plan?',
            'You already have a nutrition plan. Creating a new one will replace your current plan.',
            [
              { 
                text: 'Cancel', 
                style: 'cancel', 
                onPress: () => resolve(false)
              },
              { 
                text: 'Replace', 
                style: 'destructive', 
                onPress: () => resolve(true)
              },
            ]
          );
        });
        
        if (!confirmed) {
          console.log('User cancelled replacement');
          setIsGenerating(false);
          return;
        }
        
        // Restart animation if user confirmed
        progressAnimation.setValue(0.1);
        Animated.sequence([
          Animated.timing(progressAnimation, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: false
          }),
          Animated.timing(progressAnimation, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: false
          }),
          Animated.timing(progressAnimation, {
            toValue: 0.9,
            duration: 2000,
            useNativeDriver: false
          })
        ]).start();
      }
      
      // Generate the plan
      await generatePlan();
    } catch (error) {
      console.error('Error in handleGeneratePlan:', error);
      setIsGenerating(false);
      
      // Show a user-friendly error message
      Alert.alert(
        'Error',
        'Failed to generate nutrition plan. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const generatePlan = async () => {
    try {
      const effectiveUserId = user?.id || 'guest';
      const goal = selectedGoal || 'maintenance';
      
      // Prepare options for the AI plan
      const planOptions = {
        goal,
        dietaryPreferences: selectedPreferences,
        intolerances: selectedIntolerances,
      };
      
      // Generate the plan with mathematical calculations
      console.log('Calling NutritionService.generateNutritionPlan with options:', planOptions);
      
      // The service now handles its own timeout, so we call it directly
      const plan = await NutritionService.generateNutritionPlan(effectiveUserId, planOptions);
      
      // Complete the progress animation
      Animated.timing(progressAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false
      }).start();
      
      setGenerationProgress(100);
      
      // Wait a moment to show completion before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to the plan screen
      if (plan && plan.id) {
        router.replace(`/(main)/nutrition/plan?planId=${plan.id}`);
      } else {
        throw new Error('Generated plan has no ID');
      }
    } catch (error) {
      console.error('Plan generation error:', error);
      
      // Show a user-friendly error message
      Alert.alert(
        'Error',
        error instanceof Error 
          ? `Failed to generate plan: ${error.message}` 
          : 'Failed to generate nutrition plan. Please try again.',
        [{ text: 'OK' }]
      );
      
      setIsGenerating(false);
    }
  };

  const toggleSelection = (item: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const index = list.indexOf(item);
    if (index > -1) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };
  
  const nextStep = () => {
    console.log('Next step button pressed, currentStep:', currentStep, 'totalSteps:', totalSteps);
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      console.log('Calling handleGeneratePlan()');
      handleGeneratePlan();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };
  
  const canProceed = () => {
    return true; // All steps are now optional since goal is auto-determined
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 1: return <Step1 />;
      case 2: return <Step2 />;
      default: return null;
    }
  }

  const StepHeader = ({ step, title, description }) => (
    <View style={styles.stepHeader}>
      <Text style={styles.stepNumber}>STEP 0{step}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  );

  const Step1 = () => (
    <View>
      <StepHeader step={1} title="Dietary Preferences" description="Select any specific dietary styles you follow (optional)." />
      <View style={styles.chipContainer}>
        {DIETARY_PREFERENCES.map(pref => (
          <CustomChip
            key={pref}
            label={pref.charAt(0).toUpperCase() + pref.slice(1)}
            selected={selectedPreferences.includes(pref)}
            onPress={() => toggleSelection(pref, selectedPreferences, setSelectedPreferences)}
          />
        ))}
      </View>
    </View>
  );

  const CustomChip = ({ label, selected, onPress }) => (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={selected ? [colors.primary, colors.primaryDark] : [colors.surface, colors.surface]}
        style={[styles.chip, selected && styles.selectedChip]}
      >
        <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const Step2 = () => (
    <View>
      <StepHeader step={2} title="Food Intolerances" description="Select any foods you need to avoid (optional)." />
      <View style={styles.chipContainer}>
        {INTOLERANCES.map(item => (
          <CustomChip
            key={item}
            label={item.charAt(0).toUpperCase() + item.slice(1)}
            selected={selectedIntolerances.includes(item)}
            onPress={() => toggleSelection(item, selectedIntolerances, setSelectedIntolerances)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=3540&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', colors.dark]}
          style={styles.overlay}
        />
      </ImageBackground>

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Icon name="arrow-left" size={24} color={colors.text} onPress={prevStep} />
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} color={colors.primary} style={styles.progressBar} />
        </View>
        <Text style={styles.stepIndicator}>{currentStep}/{totalSteps}</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>
      
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={20} color={colors.error} style={{marginRight: 8}} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={[
        styles.bottomNav,
        {
          bottom: Math.max(insets.bottom + 28, SAFE_AREA_PADDING_BOTTOM + 28, 40),
          paddingBottom: Math.max(insets.bottom + 20, SAFE_AREA_PADDING_BOTTOM + 20),
        }
      ]}>
        <TouchableOpacity 
          onPress={prevStep} 
          style={[
            styles.navButton, 
            { 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderWidth: 1, 
              borderColor: 'rgba(255,255,255,0.2)' 
            }
          ]}
        >
          <Text style={[styles.navButtonText, { opacity: 0.8 }]}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            console.log('Button pressed: ' + (currentStep === totalSteps ? 'Generate Plan' : 'Continue'));
            nextStep();
          }} 
          disabled={!canProceed() || isGenerating} 
          style={[styles.navButton, styles.nextButton]}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={canProceed() ? [colors.primary, colors.primaryDark] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.nextButtonGradient}
          >
            {isGenerating && currentStep === totalSteps ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={[styles.navButtonText, { fontWeight: '700' }]}>
                {currentStep === totalSteps ? 'Generate Plan' : 'Continue'}
              </Text>
            )}
          </LinearGradient>
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
            colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.85)']}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Generating Your Plan</Text>
            <Text style={styles.modalSubtitle}>
              Calculating your personalized nutrition plan based on your preferences...
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
              <View style={[styles.stepItem, generationProgress >= 20 ? styles.completedStep : {}]}>
                <Icon name={generationProgress >= 20 ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={generationProgress >= 20 ? colors.success : colors.textSecondary} />
                <Text style={[styles.stepText, generationProgress >= 20 ? styles.completedStepText : {}]}>
                  Analyzing preferences
                </Text>
              </View>
              
              <View style={[styles.stepItem, generationProgress >= 40 ? styles.completedStep : {}]}>
                <Icon name={generationProgress >= 40 ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={generationProgress >= 40 ? colors.success : colors.textSecondary} />
                <Text style={[styles.stepText, generationProgress >= 40 ? styles.completedStepText : {}]}>
                  Calculating macros
                </Text>
              </View>
              
              <View style={[styles.stepItem, generationProgress >= 60 ? styles.completedStep : {}]}>
                <Icon name={generationProgress >= 60 ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={generationProgress >= 60 ? colors.success : colors.textSecondary} />
                <Text style={[styles.stepText, generationProgress >= 60 ? styles.completedStepText : {}]}>
                  Creating meal suggestions
                </Text>
              </View>
              
              <View style={[styles.stepItem, generationProgress >= 80 ? styles.completedStep : {}]}>
                <Icon name={generationProgress >= 80 ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={generationProgress >= 80 ? colors.success : colors.textSecondary} />
                <Text style={[styles.stepText, generationProgress >= 80 ? styles.completedStepText : {}]}>
                  Finalizing your plan
                </Text>
              </View>
            </View>
            
            <Text style={styles.modalNote}>
              This may take a minute. We're using AI to create your personalized plan.
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
    backgroundColor: colors.dark,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepIndicator: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  stepHeader: {
    marginBottom: 32,
  },
  stepNumber: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  stepDescription: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  optionCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedOptionCard: {
    borderColor: 'transparent',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
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
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    marginRight: 12,
    marginBottom: 12,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedChip: {
    borderColor: 'transparent',
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedChipText: {
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.2)',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  navButton: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nextButton: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginLeft: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  nextButtonGradient: {
    width: '100%',
    height: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.darkGray,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.white,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    color: colors.white,
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
    color: colors.white,
  },
  modalNote: {
    color: colors.textTertiary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default PlanCreateScreen; 