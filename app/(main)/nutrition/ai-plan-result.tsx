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
      router.replace(`/(main)/nutrition/plan?planId=${aiPlan.id}`);
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

  const renderMacroCard = (label: string, grams: number, percentage: number, color: string) => (
    <View style={styles.macroCard}>
      <View style={[styles.macroColorBar, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroGrams}>{Math.round(grams)}g</Text>
      <Text style={styles.macroPercentage}>{Math.round(percentage)}%</Text>
    </View>
  );

  const renderExpandableSection = (
    title: string,
    content: string,
    sectionKey: string,
    icon: string
  ) => (
    <View style={styles.expandableSection}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(sectionKey)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Icon name={icon as any} size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Icon
          name={expandedSections[sectionKey] ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expandedSections[sectionKey] && (
        <View style={styles.sectionContent}>
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
        <Text style={styles.headerTitle}>Your AI Nutrition Plan</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plan Overview */}
        <LinearGradient
          colors={['rgba(76,175,80,0.1)', 'rgba(76,175,80,0.05)']}
          style={styles.overviewCard}
        >
          <View style={styles.overviewHeader}>
            <Icon name="brain" size={32} color={colors.success} />
            <Text style={styles.planName}>{aiPlan.plan_name}</Text>
          </View>
          
          <View style={styles.caloriesSection}>
            <Text style={styles.caloriesLabel}>Daily Calories</Text>
            <Text style={styles.caloriesValue}>{aiPlan.daily_calories}</Text>
            <Text style={styles.caloriesUnit}>kcal</Text>
          </View>

          <View style={styles.macrosGrid}>
            {renderMacroCard('Protein', aiPlan.protein_grams, aiPlan.protein_percentage, colors.primary)}
            {renderMacroCard('Carbs', aiPlan.carbs_grams, aiPlan.carbs_percentage, colors.accent)}
            {renderMacroCard('Fat', aiPlan.fat_grams, aiPlan.fat_percentage, colors.secondary)}
          </View>
        </LinearGradient>

        {/* AI Explanation */}
        <View style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Icon name="lightbulb-outline" size={24} color={colors.success} />
            <Text style={styles.explanationTitle}>Why This Plan?</Text>
          </View>
          <Text style={styles.explanationText}>{aiPlan.explanation}</Text>
        </View>

        {/* Detailed Reasoning */}
        <View style={styles.reasoningSection}>
          <Text style={styles.reasoningSectionTitle}>Detailed Analysis</Text>
          
          {aiPlan.reasoning.bmr_calculation && renderExpandableSection(
            'BMR Calculation',
            aiPlan.reasoning.bmr_calculation,
            'bmr',
            'calculator'
          )}
          
          {aiPlan.reasoning.tdee_calculation && renderExpandableSection(
            'TDEE Calculation',
            aiPlan.reasoning.tdee_calculation,
            'tdee',
            'run'
          )}
          
          {aiPlan.reasoning.calorie_adjustment && renderExpandableSection(
            'Calorie Adjustments',
            aiPlan.reasoning.calorie_adjustment,
            'calories',
            'tune'
          )}
          
          {aiPlan.reasoning.macro_distribution && renderExpandableSection(
            'Macro Distribution',
            aiPlan.reasoning.macro_distribution,
            'macros',
            'chart-pie'
          )}
          
          {aiPlan.reasoning.personalization_factors && aiPlan.reasoning.personalization_factors.length > 0 && renderExpandableSection(
            'Personalization Factors',
            aiPlan.reasoning.personalization_factors.join('\n• '),
            'personalization',
            'account-cog'
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAcceptPlan}
          >
            <LinearGradient
              colors={[colors.success, '#45a049']}
              style={styles.buttonGradient}
            >
              <Icon name="check" size={20} color={colors.white} />
              <Text style={styles.buttonText}>Accept This Plan</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.modifyButton]}
            onPress={handleModifyPlan}
          >
            <Text style={styles.modifyButtonText}>Try Different Approach</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 20 }} />
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  overviewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  caloriesSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  caloriesLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  caloriesValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
  },
  caloriesUnit: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    position: 'relative',
  },
  macroColorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  macroLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  macroGrams: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  macroPercentage: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  explanationCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  explanationText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  reasoningSection: {
    marginBottom: 30,
  },
  reasoningSectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  expandableSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 12,
    marginBottom: 12,
  },
  acceptButton: {
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modifyButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modifyButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AIPlanResultScreen;
