import { router } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Image,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import {
  Appbar,
  Button,
  Checkbox,
  Text,
  TextInput,
  useTheme,
  Surface,
  Divider,
  IconButton,
  ProgressBar,
  Avatar
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { colors } from '../../../src/styles/colors';
import { theme } from '../../../src/styles/theme';
import { SAFE_AREA_PADDING_BOTTOM } from '../_layout';

const { width, height } = Dimensions.get('window');

const GOALS = ['fat_loss', 'muscle_gain', 'maintenance'];
const DIETARY_PREFERENCES = ['vegan', 'keto', 'paleo', 'vegetarian'];
const INTOLERANCES = ['gluten', 'dairy', 'nuts', 'soy'];

// Goal details with icons, images, and descriptions
const GOAL_DETAILS = {
  fat_loss: {
    title: 'Fat Loss',
    icon: 'fire',
    description: 'Focus on calorie deficit while maintaining protein intake to preserve muscle mass.',
    image: require('../../../assets/images/placeholder.png'),
    gradient: ['#FF5A5F', '#FF9F1C'],
  },
  muscle_gain: {
    title: 'Muscle Gain',
    icon: 'arm-flex',
    description: 'Increase protein and overall calories to support muscle growth and recovery.',
    image: require('../../../assets/images/placeholder.png'),
    gradient: ['#3A6BC5', '#2C4F9B'],
  },
  maintenance: {
    title: 'Maintenance',
    icon: 'balance-scale',
    description: 'Balanced macronutrients to maintain your current body composition.',
    image: require('../../../assets/images/placeholder.png'),
    gradient: ['#00C9A7', '#0EA5E9'],
  },
};

const PlanCreateScreen = () => {
  const insets = useSafeAreaInsets();
  const paperTheme = useTheme();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  // Progress calculation
  const totalSteps = 2; // Reduced from 3 to 2 since we removed goal selection
  const progress = currentStep / totalSteps;

  // Automatically determine goal from onboarding data
  useEffect(() => {
    if (profile) {
      const primaryGoal = profile.primary_goal;
      const fitnessStrategy = profile.fitness_strategy;

      // Determine goal based on primary_goal or fitness_strategy
      if (primaryGoal === 'fat_loss' || fitnessStrategy === 'cut' || fitnessStrategy === 'fat_loss') {
        setSelectedGoal('fat_loss');
      } else if (primaryGoal === 'muscle_gain' || fitnessStrategy === 'bulk' || fitnessStrategy === 'muscle_gain') {
        setSelectedGoal('muscle_gain');
      } else if (fitnessStrategy === 'recomp') {
        setSelectedGoal('body_recomposition'); // Map recomp strategy to body_recomposition goal
      } else {
        setSelectedGoal('maintenance');
      }
    }
  }, [profile]);

  const handleGeneratePlan = async () => {
    console.log('--- Button Press: Generate Plan ---');
    if (!user) {
      Alert.alert('Error', 'You must be logged in to generate a plan.');
      return;
    }
    if (!selectedGoal) {
      Alert.alert('Error', 'Unable to determine your goal from your profile. Please complete onboarding first.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const newPlan = await NutritionService.generateNutritionPlan(user.id, {
        goal: selectedGoal,
        dietaryPreferences: selectedPreferences,
        intolerances: selectedIntolerances,
      });
      if (newPlan && newPlan.id) {
        router.replace(`/(main)/nutrition/plan?planId=${newPlan.id}`);
      } else {
        throw new Error('Failed to generate a plan with an ID.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      
      // Show error message
      Alert.alert('Generation Failed', message);
    }
    setIsGenerating(false);
  };

  const toggleSelection = (
    item: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const index = list.indexOf(item);
    if (index > -1) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };
  
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Scroll to top when changing steps
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      handleGeneratePlan();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/(main)/nutrition');
    }
  };
  
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Dietary preferences are optional
      case 2:
        return true; // Intolerances are optional
      default:
        return false;
    }
  };
  
  // Ref for scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            opacity: headerOpacity,
            paddingTop: insets.top
          }
        ]}
      >
        <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.headerContent}>
          <IconButton 
            icon="arrow-left" 
            iconColor={colors.textInverse} 
            onPress={prevStep} 
          />
          <Text style={styles.headerTitle}>Create Nutrition Plan</Text>
          <Text style={styles.stepIndicator}>Step {currentStep}/{totalSteps}</Text>
        </View>
      </Animated.View>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar 
          progress={progress} 
          color={colors.primary} 
          style={styles.progressBar}
        />
      </View>
      
      {/* Main Content */}
      <Animated.ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Step 1: Dietary Preferences */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>Step 1</Text>
              <Text style={styles.stepTitle}>Dietary Preferences</Text>
              <Text style={styles.stepDescription}>
                Select any dietary preferences you follow. This helps us create a plan
                that aligns with your eating style.
              </Text>
            </View>
            
            <Surface style={styles.preferencesContainer} elevation={2}>
              {DIETARY_PREFERENCES.map((pref) => (
                <TouchableOpacity
                  key={pref}
                  style={styles.preferenceItem}
                  onPress={() => toggleSelection(pref, selectedPreferences, setSelectedPreferences)}
                >
                  <View style={styles.preferenceContent}>
                    <Text style={styles.preferenceLabel}>
                      {pref.charAt(0).toUpperCase() + pref.slice(1)}
                    </Text>
                    <Text style={styles.preferenceDescription}>
                      {getPreferenceDescription(pref)}
                    </Text>
                  </View>
                  
                  <View 
                    style={[
                      styles.checkboxContainer,
                      selectedPreferences.includes(pref) && styles.checkboxContainerActive
                    ]}
                  >
                    {selectedPreferences.includes(pref) && (
                      <LinearGradient
                        colors={colors.gradients.primary as any}
                        style={[StyleSheet.absoluteFill, { borderRadius: theme.borderRadius.sm }]}
                      />
                    )}
                    <IconButton
                      icon={selectedPreferences.includes(pref) ? 'check' : 'plus'}
                      iconColor={selectedPreferences.includes(pref) ? colors.textInverse : colors.primary}
                      size={16}
                      style={styles.checkboxIcon}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </Surface>
          </View>
        )}
        
        {/* Step 2: Intolerances */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>Step 2</Text>
              <Text style={styles.stepTitle}>Food Intolerances</Text>
              <Text style={styles.stepDescription}>
                Select any food intolerances or allergies you have. We'll make sure
                these foods are excluded from your plan.
              </Text>
            </View>
            
            <Surface style={styles.preferencesContainer} elevation={2}>
              {INTOLERANCES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.preferenceItem}
                  onPress={() => toggleSelection(item, selectedIntolerances, setSelectedIntolerances)}
                >
                  <View style={styles.preferenceContent}>
                    <Text style={styles.preferenceLabel}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                    <Text style={styles.preferenceDescription}>
                      {getIntoleranceDescription(item)}
                    </Text>
                  </View>
                  
                  <View 
                    style={[
                      styles.checkboxContainer,
                      selectedIntolerances.includes(item) && styles.checkboxContainerActive
                    ]}
                  >
                    {selectedIntolerances.includes(item) && (
                      <LinearGradient
                        colors={colors.gradients.primary as any}
                        style={[StyleSheet.absoluteFill, { borderRadius: theme.borderRadius.sm }]}
                      />
                    )}
                    <IconButton
                      icon={selectedIntolerances.includes(item) ? 'check' : 'plus'}
                      iconColor={selectedIntolerances.includes(item) ? colors.textInverse : colors.primary}
                      size={16}
                      style={styles.checkboxIcon}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </Surface>
            
            {/* Final Step Summary */}
            <Surface style={styles.summaryContainer} elevation={2}>
              <Text style={styles.summaryTitle}>Plan Summary</Text>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Goal:</Text>
                <Text style={styles.summaryValue}>
                  {selectedGoal ? GOAL_DETAILS[selectedGoal as keyof typeof GOAL_DETAILS].title : 'None selected'}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Dietary Preferences:</Text>
                <Text style={styles.summaryValue}>
                  {selectedPreferences.length > 0 
                    ? selectedPreferences.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') 
                    : 'None selected'}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Intolerances:</Text>
                <Text style={styles.summaryValue}>
                  {selectedIntolerances.length > 0 
                    ? selectedIntolerances.map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(', ') 
                    : 'None selected'}
                </Text>
              </View>
            </Surface>
          </View>
        )}
        
        {/* Error Message */}
        {error && (
          <Surface style={styles.errorContainer} elevation={2}>
            <IconButton
              icon="alert-circle"
              iconColor={colors.error}
              size={24}
              style={styles.errorIcon}
            />
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        )}
        
        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
      
      {/* Bottom Navigation */}
      <Surface
        style={[
          styles.bottomNav,
          {
            bottom: Math.max(insets.bottom + 28, SAFE_AREA_PADDING_BOTTOM + 28, 40),
            paddingBottom: Math.max(insets.bottom + 20, SAFE_AREA_PADDING_BOTTOM + 20),
          },
        ]}
        elevation={4}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <Text style={styles.backButtonText}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled
          ]}
          onPress={nextStep}
          disabled={!canProceed() || isGenerating}
        >
          <LinearGradient
            colors={canProceed() ? (colors.gradients.primary as any) : ['#CCCCCC', '#AAAAAA']}
            style={[StyleSheet.absoluteFill, { borderRadius: theme.borderRadius.md }]}
          />
          {isGenerating && currentStep === totalSteps ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps ? 'Generate Plan' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </Surface>
    </View>
  );
};

// Helper functions for descriptions
const getPreferenceDescription = (preference: string): string => {
  switch (preference) {
    case 'vegan':
      return 'Plant-based diet excluding all animal products';
    case 'keto':
      return 'High-fat, low-carb diet for ketosis';
    case 'paleo':
      return 'Based on foods presumed to be available to paleolithic humans';
    case 'vegetarian':
      return 'Plant-based diet that may include dairy and eggs';
    default:
      return '';
  }
};

const getIntoleranceDescription = (intolerance: string): string => {
  switch (intolerance) {
    case 'gluten':
      return 'Avoid wheat, barley, rye and their derivatives';
    case 'dairy':
      return 'Avoid milk and products made from milk';
    case 'nuts':
      return 'Avoid tree nuts like almonds, walnuts, etc.';
    case 'soy':
      return 'Avoid soybeans and products containing soy';
    default:
      return '';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: Platform.OS === 'ios' ? 90 : 70,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    height: '100%',
  },
  headerTitle: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
  },
  stepIndicator: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 70,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: theme.spacing.lg,
  },
  stepContainer: {
    marginBottom: theme.spacing.xl,
  },
  stepHeader: {
    marginBottom: theme.spacing.xl,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: theme.spacing.sm,
  },
  stepDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  goalsContainer: {
    marginBottom: theme.spacing.xl,
  },
  goalCard: {
    height: 180,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  selectedGoalCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  goalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  goalGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  goalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  goalIcon: {
    margin: 0,
  },
  goalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textInverse,
    marginBottom: theme.spacing.xs,
  },
  goalDescription: {
    fontSize: 14,
    color: colors.textInverse,
    opacity: 0.9,
    marginBottom: theme.spacing.sm,
  },
  goalSelectIndicator: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalSelectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  goalSelectDotActive: {
    backgroundColor: colors.textInverse,
  },
  preferencesContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  preferenceContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  checkboxContainer: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkboxContainerActive: {
    borderColor: 'transparent',
  },
  checkboxIcon: {
    margin: 0,
    width: 20,
    height: 20,
  },
  summaryContainer: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryItem: {
    marginBottom: theme.spacing.md,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FFEFEF',
    marginBottom: theme.spacing.lg,
  },
  errorIcon: {
    margin: 0,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nextButton: {
    height: 50,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
  },
});

export default PlanCreateScreen; 