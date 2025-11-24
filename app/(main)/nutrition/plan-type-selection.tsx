import { router } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  ImageBackground,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { AInutritionService } from '../../../src/services/nutrition/AInutritionService';
import { MaterialCommunityIcons as Icon, Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/styles/colors';
import { SAFE_AREA_PADDING_BOTTOM } from '../_layout';

const { width } = Dimensions.get('window');

const PLAN_TYPES = [
  {
    id: 'ai',
    title: 'AI Smart Plan',
    subtitle: 'Personalized by Gemini AI',
    description: 'The most advanced option. Analyzes your unique profile, habits, and goals to create a hyper-personalized nutrition strategy.',
    icon: 'sparkles' as const,
    isRecommended: true,
    gradient: colors.gradients.primary,
  },
  {
    id: 'mathematical',
    title: 'Standard Calculator',
    subtitle: 'Based on TDEE formulas',
    description: 'Uses proven formulas (Mifflin-St Jeor) to calculate your caloric needs based on your body metrics.',
    icon: 'calculator-outline' as const,
    isRecommended: false,
    gradient: [colors.secondaryLight, colors.secondary],
  },
  {
    id: 'manual',
    title: 'Manual Setup',
    subtitle: 'I know my macros',
    description: 'Set your own calorie and macronutrient targets. Best for experienced users who know exactly what they need.',
    icon: 'create-outline' as const,
    isRecommended: false,
    gradient: [colors.secondaryLight, colors.secondary],
  },
];

const PlanTypeSelectionScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('ai'); // Default to AI
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const progressAnimation = useRef(new Animated.Value(0)).current;

  const handleTypeSelection = (typeId: string) => {
    setSelectedType(typeId);
  };

  const handleContinue = async () => {
    if (selectedType === 'manual') {
      router.push('/(main)/nutrition/plan-create-manual');
      return;
    }

    if (selectedType === 'mathematical') {
      try {
        setIsGenerating(true);
        startProgressAnimation(1200);
        
        // Progress simulation
        simulateProgress();

        const userId = user?.id || 'guest';
        const goal = (profile as any)?.goal_type || 'maintenance';

        const newPlan = await NutritionService.generateNutritionPlan(userId, {
          goal,
          dietaryPreferences: [],
          intolerances: [],
        });

        setGenerationProgress(100);

        if (newPlan && (newPlan as any).id) {
          router.replace(`/(main)/nutrition/plan?planId=${(newPlan as any).id}`);
        } else {
          router.push('/(main)/nutrition/plan-create-mathematical');
        }
      } catch (e) {
        router.push('/(main)/nutrition/plan-create-mathematical');
      } finally {
        setIsGenerating(false);
      }
    }

    if (selectedType === 'ai') {
      try {
        setIsGenerating(true);
        startProgressAnimation(2000);
        
        // AI Progress simulation
        simulateProgress();

        const userId = user?.id || 'guest';

        const aiPlan = await AInutritionService.generateAInutritionPlan(userId, {
          dietaryPreferences: [],
          intolerances: [],
        });

        setGenerationProgress(100);

        if (aiPlan && aiPlan.id) {
          router.replace(`/(main)/nutrition/ai-plan-result?planId=${aiPlan.id}`);
        } else {
          router.push('/(main)/nutrition/plan-create-manual');
        }
      } catch (error) {
        console.error('[AI NUTRITION] Error generating AI plan:', error);
        router.push('/(main)/nutrition/plan-create-manual');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const startProgressAnimation = (duration: number) => {
    progressAnimation.setValue(0);
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start();
  };

  const simulateProgress = () => {
    setGenerationProgress(20);
    setTimeout(() => setGenerationProgress(40), 400);
    setTimeout(() => setGenerationProgress(60), 800);
    setTimeout(() => setGenerationProgress(80), 1200);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Image with Gradient Overlay */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(18,18,18,0.85)', 'rgba(18,18,18,0.95)', '#121212']}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>STEP 1 OF 3</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose Approach</Text>
          <Text style={styles.subtitle}>
            Select how you want to build your personalized nutrition plan.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {PLAN_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            const isAi = type.id === 'ai';
            
            return (
              <TouchableOpacity
                key={type.id}
                onPress={() => handleTypeSelection(type.id)}
                activeOpacity={0.9}
                style={[
                  styles.cardContainer,
                  isSelected && styles.cardContainerSelected
                ]}
              >
                {/* AI Badge */}
                {isAi && (
                  <View style={styles.recommendedBadge}>
                    <LinearGradient
                      colors={colors.gradients.primary}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.badgeGradient}
                    >
                      <Ionicons name="star" size={10} color="white" style={{ marginRight: 4 }} />
                      <Text style={styles.badgeText}>RECOMMENDED</Text>
                    </LinearGradient>
                  </View>
                )}

                <LinearGradient
                  colors={isSelected 
                    ? (isAi ? ['rgba(255,107,53,0.25)', 'rgba(255,107,53,0.1)'] : ['#333', '#222'])
                    : ['rgba(28,28,30,0.8)', 'rgba(28,28,30,0.6)']}
                  style={[
                    styles.cardGradient,
                    isSelected && { borderColor: isAi ? colors.primary : colors.white, borderWidth: 1 }
                  ]}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={[
                        styles.iconBox, 
                        { backgroundColor: isSelected ? (isAi ? colors.primary : colors.white) : 'rgba(255,255,255,0.1)' }
                      ]}>
                        <Ionicons 
                          name={type.icon} 
                          size={24} 
                          color={isSelected ? (isAi ? colors.white : colors.black) : colors.textSecondary} 
                        />
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={isAi ? colors.primary : colors.white} />
                      )}
                    </View>
                    
                    <View style={styles.textContainer}>
                      <Text style={[styles.cardTitle, isSelected && { color: colors.white }]}>
                        {type.title}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {type.subtitle}
                      </Text>
                      <Text style={styles.cardDescription}>
                        {type.description}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Actions - Added extra padding to account for TabBar */}
      <View style={[
        styles.footer,
        { paddingBottom: insets.bottom + 90 }
      ]}>
        <LinearGradient
          colors={['transparent', 'rgba(18,18,18,0.8)', '#121212']}
          style={styles.footerGradient}
          pointerEvents="none"
        />
        <TouchableOpacity
          onPress={handleContinue}
          disabled={isGenerating}
          style={styles.continueButtonWrapper}
        >
          <LinearGradient
            colors={colors.gradients.primary}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.continueButton}
          >
            {isGenerating ? (
              <Text style={styles.continueText}>GENERATING...</Text>
            ) : (
              <View style={styles.buttonContent}>
                 <Text style={styles.continueText}>CONTINUE</Text>
                 <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
      <Modal
        visible={isGenerating}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 20 }} />
            <Text style={styles.modalTitle}>Creating Your Plan</Text>
            <Text style={styles.modalSubtitle}>
              {selectedType === 'ai' 
                ? "Gemini AI is analyzing your profile to build the perfect plan..."
                : "Calculating your nutritional targets..."}
            </Text>
            
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressBar, 
                  { 
                    width: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }) 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>{generationProgress}%</Text>
          </View>
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
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 200, // Increased to prevent content from being covered by the floating footer
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  cardsContainer: {
    gap: 20,
  },
  cardContainer: {
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContainerSelected: {
    transform: [{scale: 1.02}],
  },
  cardGradient: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardContent: {
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingHorizontal: 24,
    backgroundColor: colors.background, // Ensure solid background
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    zIndex: 100, // Bring to front
  },
  footerGradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
  },
  continueButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default PlanTypeSelectionScreen;
