import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../src/hooks/useAuth';
import { AInutritionPlan } from '../../../src/services/nutrition/AInutritionService';
import { supabase } from '../../../src/services/supabase/client';

const { width } = Dimensions.get('window');

const colors = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#FF6B35',
  secondary: '#FF8F65',
  accent: '#FFA366',
  success: '#4CAF50',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  card: 'rgba(28, 28, 30, 1)',
  white: '#FFFFFF',
};

const AIPlanResultScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [aiPlan, setAiPlan] = useState<AInutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    explanation: true,
    bmr: false,
    tdee: false,
    calories: false,
    macros: false,
    personalization: false,
  });

  useEffect(() => {
    loadAIPlan();
  }, [planId]);

  const loadAIPlan = async () => {
    try {
      setLoading(true);
      
      // Handle guest plan
      if (planId === 'temp-guest-plan') {
        console.log('[AI PLAN RESULT] Loading temporary guest plan from storage');
        const tempPlanStr = await AsyncStorage.getItem('temp_guest_nutrition_plan');
        if (tempPlanStr) {
          setAiPlan(JSON.parse(tempPlanStr));
          setLoading(false);
          return;
        } else {
          throw new Error('Temporary plan not found');
        }
      }

      // Load AI plan from database
      const { data, error } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('[AI PLAN RESULT] Error loading AI plan:', error);
        Alert.alert('Error', 'Failed to load AI nutrition plan');
        router.back();
        return;
      }

      if (data) {
        // Convert database format to AInutritionPlan format
        const plan: AInutritionPlan = {
          id: data.id,
          user_id: data.user_id,
          plan_name: data.plan_name,
          daily_calories: data.daily_targets?.calories || 0,
          protein_grams: data.daily_targets?.protein || 0,
          carbs_grams: data.daily_targets?.carbs || 0,
          fat_grams: data.daily_targets?.fat || 0,
          protein_percentage: data.daily_targets?.protein_percentage || 0,
          carbs_percentage: data.daily_targets?.carbs_percentage || 0,
          fat_percentage: data.daily_targets?.fat_percentage || 0,
          explanation: data.ai_explanation || '',
          reasoning: data.ai_reasoning || {},
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        
        setAiPlan(plan);
      }
    } catch (error) {
      console.error('[AI PLAN RESULT] Exception loading AI plan:', error);
      Alert.alert('Error', 'Failed to load AI nutrition plan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAcceptPlan = () => {
    if (aiPlan) {
      // Navigate to the nutrition plan screen with this AI plan
      // Use push with refresh param to trigger refresh on nutrition index
      router.push({
        pathname: '/(main)/nutrition/plan',
        params: { planId: aiPlan.id, refresh: 'true' }
      });
    }
  };

  const handleModifyPlan = () => {
    // Navigate back to plan type selection to try a different approach
    router.replace('/(main)/nutrition/plan-type-selection');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Loading your AI nutrition plan...</Text>
      </View>
    );
  }

  if (!aiPlan) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>AI plan not found</Text>
      </View>
    );
  }

  const renderMacroCard = (label: string, grams: number, percentage: number, color: string, iconName: string) => (
    <View style={styles.macroCard}>
      <View style={[styles.macroIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={iconName as any} size={20} color={color} />
      </View>
      <View style={styles.macroInfo}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroGrams}>{Math.round(grams)}g</Text>
        <View style={styles.percentageRow}>
          <View style={[styles.percentageBar, { backgroundColor: color + '30', width: 40 }]}>
            <View style={[styles.percentageFill, { backgroundColor: color, width: `${percentage}%` }]} />
          </View>
          <Text style={styles.macroPercentage}>{Math.round(percentage)}%</Text>
        </View>
      </View>
    </View>
  );

  const renderExpandableSection = (
    title: string,
    content: string,
    sectionKey: string,
    icon: string
  ) => (
    <View style={[styles.expandableSection, expandedSections[sectionKey] && styles.expandableSectionActive]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(sectionKey)}
        activeOpacity={0.7}
      >
        <View style={[styles.sectionIconContainer, { backgroundColor: expandedSections[sectionKey] ? colors.primary + '20' : colors.surface }]}>
          <Icon name={icon as any} size={20} color={expandedSections[sectionKey] ? colors.primary : colors.textSecondary} />
        </View>
        <Text style={[styles.sectionTitle, expandedSections[sectionKey] && styles.sectionTitleActive]}>{title}</Text>
        <Icon
          name={expandedSections[sectionKey] ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expandedSections[sectionKey] && (
        <View style={styles.sectionContent}>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionText}>{content}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Plan</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Icon name="information-variant" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 }
        ]}
      >
        {/* Plan Overview Hero */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#2C2C2E', '#1C1C1E']}
            style={styles.overviewCard}
          >
            <View style={styles.planHeaderRow}>
              <View style={styles.planBadge}>
                <Icon name="star-four-points" size={14} color={colors.primary} />
                <Text style={styles.planBadgeText}>AI GENERATED</Text>
              </View>
              <Text style={styles.planName}>{aiPlan.plan_name}</Text>
            </View>
            
            <View style={styles.caloriesCircle}>
              <View style={styles.caloriesInner}>
                <Text style={styles.caloriesValue}>{aiPlan.daily_calories}</Text>
                <Text style={styles.caloriesLabel}>Daily kcal</Text>
              </View>
            </View>

            <View style={styles.macrosGrid}>
              {renderMacroCard('Protein', aiPlan.protein_grams, aiPlan.protein_percentage, colors.primary, 'food-drumstick')}
              {renderMacroCard('Carbs', aiPlan.carbs_grams, aiPlan.carbs_percentage, colors.accent, 'barley')}
              {renderMacroCard('Fat', aiPlan.fat_grams, aiPlan.fat_percentage, colors.secondary, 'water')}
            </View>
          </LinearGradient>
        </View>

        {/* AI Insight */}
        <View style={styles.insightContainer}>
          <View style={styles.insightHeader}>
            <LinearGradient colors={[colors.success, '#43A047']} style={styles.insightIcon}>
              <Icon name="robot" size={16} color={colors.white} />
            </LinearGradient>
            <Text style={styles.insightTitle}>AI Insight</Text>
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightText}>{aiPlan.explanation}</Text>
          </View>
        </View>

        {/* Detailed Reasoning */}
        <View style={styles.reasoningSection}>
          <Text style={styles.sectionHeaderTitle}>Strategy Breakdown</Text>
          
          {aiPlan.reasoning.bmr_calculation && renderExpandableSection(
            'BMR Analysis',
            aiPlan.reasoning.bmr_calculation,
            'bmr',
            'calculator-variant'
          )}
          
          {aiPlan.reasoning.tdee_calculation && renderExpandableSection(
            'Activity Level (TDEE)',
            aiPlan.reasoning.tdee_calculation,
            'tdee',
            'run-fast'
          )}
          
          {aiPlan.reasoning.calorie_adjustment && renderExpandableSection(
            'Calorie Adjustments',
            aiPlan.reasoning.calorie_adjustment,
            'calories',
            'scale-balance'
          )}
          
          {aiPlan.reasoning.macro_distribution && renderExpandableSection(
            'Macro Split Strategy',
            aiPlan.reasoning.macro_distribution,
            'macros',
            'chart-pie'
          )}
          
          {aiPlan.reasoning.personalization_factors && aiPlan.reasoning.personalization_factors.length > 0 && renderExpandableSection(
            'Personalization',
            aiPlan.reasoning.personalization_factors.join('\n• '),
            'personalization',
            'account-check'
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.acceptButtonContainer}
            onPress={handleAcceptPlan}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, '#E65100']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptButton}
            >
              <Text style={styles.acceptButtonText}>Start This Plan</Text>
              <Icon name="arrow-right" size={20} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modifyButton}
            onPress={handleModifyPlan}
          >
            <Text style={styles.modifyButtonText}>Regenerate Plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  overviewCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeaderRow: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 24,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  planBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  planName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  caloriesCircle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  caloriesInner: {
    alignItems: 'center',
  },
  caloriesValue: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
    includeFontPadding: false,
  },
  caloriesLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  macroIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroInfo: {
    alignItems: 'center',
  },
  macroLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroGrams: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  percentageBar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  percentageFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  percentageIcon: {
    // removed
  },
  percentageText: {
    // removed
  },
  macroPercentage: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  
  // AI Insight
  insightContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  insightTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  insightContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },

  // Reasoning
  reasoningSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeaderTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  expandableSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surface, // Hidden border initially
  },
  expandableSectionActive: {
    borderColor: colors.border,
    backgroundColor: '#252527',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  sectionTitleActive: {
    color: colors.text,
    fontWeight: '600',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
    opacity: 0.5,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },

  // Actions
  actionButtons: {
    paddingHorizontal: 20,
    gap: 12,
  },
  acceptButtonContainer: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modifyButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modifyButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default AIPlanResultScreen;
