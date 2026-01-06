import { router } from 'expo-router';
import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  ActivityIndicator,
  Text,
  Image,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { AInutritionService } from '../../../src/services/nutrition/AInutritionService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  blue: '#007AFF',
  purple: '#AF52DE',
};

const PLAN_TYPES = [
  {
    id: 'ai',
    title: 'AI Smart Plan',
    subtitle: 'Personalized by Gemini AI',
    description: 'The most advanced option. Analyzes your unique profile to create a hyper-personalized nutrition strategy.',
    icon: 'robot-outline',
    color: colors.primary,
    isRecommended: true,
  },
  {
    id: 'mathematical',
    title: 'Standard Calculator',
    subtitle: 'Based on TDEE formulas',
    description: 'Uses proven formulas to calculate your caloric needs based on your body metrics.',
    icon: 'calculator-variant',
    color: colors.blue,
    isRecommended: false,
  },
  {
    id: 'manual',
    title: 'Manual Setup',
    subtitle: 'I know my macros',
    description: 'Set your own calorie and macronutrient targets. Best for experienced users.',
    icon: 'pencil-outline',
    color: colors.purple,
    isRecommended: false,
  },
];

const CUISINE_OPTIONS = [
  { id: 'american', label: 'American', emoji: '🍔' },
  { id: 'asian', label: 'Asian', emoji: '🍜' },
  { id: 'italian', label: 'Italian', emoji: '🍝' },
  { id: 'mexican', label: 'Mexican', emoji: '🌮' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🥗' },
  { id: 'mix', label: 'Mix', emoji: '🌍' },
];

const MAX_CUISINE_SELECTION = 3;

const PlanTypeSelectionScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('ai'); // Default to AI
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    const typeLabels: Record<string, string> = {
      ai: 'AI-powered nutrition plan',
      mathematical: 'science-based nutrition plan',
      manual: 'custom nutrition plan'
    };
    
    message = `Let's create your ${typeLabels[selectedType] || 'personalized nutrition plan'}.`;
    
    return { greeting, message };
  }, [selectedType]);

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedType('ai');
    setSelectedCuisines([]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleTypeSelection = (typeId: string) => {
    setSelectedType(typeId);
  };

  const toggleCuisine = (cuisineId: string) => {
    setSelectedCuisines((prev) => {
      if (prev.includes(cuisineId)) {
        return prev.filter((id) => id !== cuisineId);
      }
      if (prev.length >= MAX_CUISINE_SELECTION) {
        return prev;
      }
      return [...prev, cuisineId];
    });
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
          cuisinePreferences: selectedCuisines,
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
          cuisinePreferences: selectedCuisines,
        });

        setGenerationProgress(100);

        if (aiPlan && aiPlan.id) {
          console.log('[AI NUTRITION] Plan created with ID:', aiPlan.id, 'Status:', 'active');
          // Add a small delay to ensure database commit before navigation
          await new Promise(resolve => setTimeout(resolve, 100));
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

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 60 + insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            disabled={isGenerating}
          >
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
            <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
          </View>
        </View>

        {/* Plan Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Approach</Text>
          
          {PLAN_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            
            return (
              <TouchableOpacity
                key={type.id}
                onPress={() => handleTypeSelection(type.id)}
                activeOpacity={0.8}
                style={[
                  styles.planCard,
                  isSelected && styles.planCardSelected
                ]}
                disabled={isGenerating}
              >
                <View style={[styles.planIconContainer, { backgroundColor: type.color + '15' }]}>
                  <Icon 
                    name={type.icon} 
                    size={24} 
                    color={type.color} 
                  />
                </View>
                <View style={styles.planContent}>
                  <View style={styles.planHeader}>
                    <Text style={[
                      styles.planTitle,
                      isSelected && styles.planTitleSelected
                    ]}>
                      {type.title}
                    </Text>
                    {type.isRecommended && (
                      <View style={styles.recommendedBadge}>
                        <Icon name="star" size={10} color={colors.text} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.planSubtitle}>{type.subtitle}</Text>
                  <Text style={styles.planDescription}>{type.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmarkSelected}>
                    <Icon name="check" size={16} color={colors.text} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cuisine Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuisine Preferences</Text>
          <Text style={styles.sectionSubtitle}>Select up to {MAX_CUISINE_SELECTION} cuisines to personalize your meals</Text>
          
          <View style={styles.cuisineGrid}>
            {CUISINE_OPTIONS.map(option => {
              const isSelected = selectedCuisines.includes(option.id);
              const isDisabled = !isSelected && selectedCuisines.length >= MAX_CUISINE_SELECTION;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => toggleCuisine(option.id)}
                  style={[
                    styles.cuisineChip,
                    isSelected && styles.cuisineChipActive,
                    isDisabled && styles.cuisineChipDisabled
                  ]}
                  activeOpacity={0.8}
                  disabled={isDisabled || isGenerating}
                >
                  <Text style={styles.cuisineEmoji}>{option.emoji}</Text>
                  <Text style={[
                    styles.cuisineLabel,
                    isSelected && styles.cuisineLabelActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.cuisineHint}>
            {selectedCuisines.length}/{MAX_CUISINE_SELECTION} selected
          </Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Icon name="clipboard-check-outline" size={20} color={colors.primary} />
            <Text style={styles.summaryTitle}>Your Selection</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Plan Type</Text>
              <Text style={styles.summaryValue}>{PLAN_TYPES.find(p => p.id === selectedType)?.title}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cuisines</Text>
              <Text style={styles.summaryValue}>
                {selectedCuisines.length > 0 
                  ? selectedCuisines.map(id => CUISINE_OPTIONS.find(c => c.id === id)?.emoji).join(' ')
                  : 'Any'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Card */}
        {isGenerating && (
          <View style={styles.statusCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <View style={styles.statusContent}>
              <Text style={styles.statusText}>
                {selectedType === 'ai' 
                  ? "Gemini AI is analyzing your profile..."
                  : "Calculating your nutritional targets..."}
              </Text>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      }) 
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: 60 + insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={isGenerating}
          style={[styles.continueButton, isGenerating && styles.continueButtonDisabled]}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isGenerating ? ['#666', '#555'] : [colors.primary, colors.primaryDark]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.continueGradient}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={styles.continueText}>Generating...</Text>
              </>
            ) : (
              <>
                <Icon name="lightning-bolt" size={22} color={colors.text} />
                <Text style={styles.continueText}>Create Nutrition Plan</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  coachMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    marginTop: -8,
  },

  // Plan Cards
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  planCardSelected: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  planContent: {
    flex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  planTitleSelected: {
    color: colors.primary,
  },
  planSubtitle: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  recommendedBadge: {
    backgroundColor: colors.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cuisine Grid
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  cuisineChipActive: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  cuisineChipDisabled: {
    opacity: 0.4,
  },
  cuisineEmoji: {
    fontSize: 16,
  },
  cuisineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cuisineLabelActive: {
    color: colors.primary,
  },
  cuisineHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
    gap: 14,
  },
  statusContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
});

export default PlanTypeSelectionScreen;
