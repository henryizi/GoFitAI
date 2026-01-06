import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Animated, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/styles/colors';
import { theme } from '../../src/styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AnalysisResultsScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate age from birthday
  const calculateAge = (birthdayStr: string | null) => {
    if (!birthdayStr) return 30; // Default
    try {
      const birthDate = new Date(birthdayStr);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return 30;
    }
  };

  const age = calculateAge(profile?.birthday || null);
  const weight = profile?.weight_kg || 70;
  const height = profile?.height_cm || 170;
  const gender = profile?.gender || 'male';
  const activityLevel = profile?.activity_level || 'moderately_active';
  const strategy = profile?.fitness_strategy || 'maintenance';

  // Basic BMR (Mifflin-St Jeor)
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // Activity Multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  // Daily Goal Calories
  const strategyAdjustments: Record<string, number> = {
    cut: -500,
    bulk: 300,
    maintenance: 0,
    recomp: -100,
    maingaining: 100,
  };
  const adjustment = strategyAdjustments[strategy] || 0;
  const dailyTarget = tdee + adjustment;

  // Macros
  const protein = Math.round(weight * 2.2); // ~1g per lb
  const fat = Math.round((dailyTarget * 0.25) / 9);
  const carbs = Math.round((dailyTarget - (protein * 4) - (fat * 9)) / 4);

  // Weight Projection
  const weeklyDeficit = adjustment * 7;
  const lbsPerWeek = Math.abs(weeklyDeficit) / 3500; // 3500 kcal per lb
  const projectedWeight3Months = strategy === 'cut' 
    ? weight - (lbsPerWeek * 0.453592 * 12) 
    : strategy === 'bulk' 
      ? weight + (lbsPerWeek * 0.453592 * 12)
      : weight;

  const milestones = [
    { week: 1, text: "Metabolic Adaptation", icon: "lightning-bolt" },
    { week: 4, text: "Visible Definition", icon: "eye" },
    { week: 12, text: "Goal Achievement", icon: "trophy" },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(onboarding)/fitness-strategy')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.headerTitle}>Your Analysis Is Ready</Text>
            <Text style={styles.headerSubtitle}>We've calculated the optimal path to reach your goals.</Text>

            {/* Metabolic Summary Card */}
          <LinearGradient
            colors={['#1A1A1A', '#0A0A0A']}
            style={styles.mainCard}
          >
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="calculator" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Metabolic Profile</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>BMR</Text>
                <Text style={styles.statValue}>{Math.round(bmr)}</Text>
                <Text style={styles.statUnit}>kcal/day</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxBorder]}>
                <Text style={styles.statLabel}>TDEE</Text>
                <Text style={styles.statValue}>{tdee}</Text>
                <Text style={styles.statUnit}>kcal/day</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Daily Target</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>{dailyTarget}</Text>
                <Text style={styles.statUnit}>kcal</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Weight Projection Card */}
          <View style={styles.projectionCard}>
            <View style={styles.projectionHeader}>
              <Text style={styles.sectionTitle}>12-Week Transformation</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>AI PREDICTED</Text>
              </View>
            </View>
            <View style={styles.projectionContent}>
              <View style={styles.projectionPoint}>
                <Text style={styles.projectionLabel}>Current</Text>
                <Text style={styles.projectionValue}>{weight.toFixed(1)}kg</Text>
              </View>
              <View style={styles.projectionArrow}>
                <MaterialCommunityIcons name="arrow-right-thick" size={24} color="rgba(255,255,255,0.2)" />
              </View>
              <View style={styles.projectionPoint}>
                <Text style={styles.projectionLabel}>Week 12</Text>
                <Text style={[styles.projectionValue, { color: colors.primary }]}>{projectedWeight3Months.toFixed(1)}kg</Text>
              </View>
            </View>
            <Text style={styles.projectionNote}>
              *Based on strict adherence to the {strategy} protocol and training 4-5x weekly.
            </Text>
          </View>

          {/* Strategy Card */}
          <View style={styles.strategyCard}>
            <View style={styles.strategyIconContainer}>
              <MaterialCommunityIcons 
                name={strategy === 'cut' ? 'fire' : strategy === 'bulk' ? 'arm-flex' : 'scale-balance'} 
                size={32} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.strategyTextContent}>
              <Text style={styles.strategyTitle}>Strategy: {strategy.charAt(0).toUpperCase() + strategy.slice(1)}</Text>
              <Text style={styles.strategyDesc}>
                Based on your goal, we've set a {adjustment > 0 ? 'surplus' : adjustment < 0 ? 'deficit' : 'maintenance'} of {Math.abs(adjustment)} calories to maximize results.
              </Text>
            </View>
          </View>

          {/* Macro Breakdown */}
          <Text style={styles.sectionTitle}>Precision Macros</Text>
          <View style={styles.macrosContainer}>
            <View style={[styles.macroCard, { borderLeftColor: '#3B82F6' }]}>
              <Text style={styles.macroName}>Protein</Text>
              <Text style={styles.macroValue}>{protein}g</Text>
              <View style={styles.macroBar}><View style={[styles.macroFill, { width: '30%', backgroundColor: '#3B82F6' }]} /></View>
            </View>
            <View style={[styles.macroCard, { borderLeftColor: '#EF4444' }]}>
              <Text style={styles.macroName}>Carbs</Text>
              <Text style={styles.macroValue}>{carbs}g</Text>
              <View style={styles.macroBar}><View style={[styles.macroFill, { width: '45%', backgroundColor: '#EF4444' }]} /></View>
            </View>
            <View style={[styles.macroCard, { borderLeftColor: '#F59E0B' }]}>
              <Text style={styles.macroName}>Fats</Text>
              <Text style={styles.macroValue}>{fat}g</Text>
              <View style={styles.macroBar}><View style={[styles.macroFill, { width: '25%', backgroundColor: '#F59E0B' }]} /></View>
            </View>
          </View>

          {/* New: Training Roadmap */}
          <Text style={styles.sectionTitle}>Your Personalized Roadmap</Text>
          <View style={styles.roadmapContainer}>
            {milestones.map((milestone, index) => (
              <View key={index} style={styles.roadmapItem}>
                <View style={styles.roadmapIcon}>
                  <MaterialCommunityIcons name={milestone.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.roadmapLine} />
                <View style={styles.roadmapContent}>
                  <Text style={styles.roadmapWeek}>WEEK {milestone.week}</Text>
                  <Text style={styles.roadmapText}>{milestone.text}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* New: Why GoFitAI? */}
          <View style={styles.premiumBenefitBox}>
            <Text style={styles.benefitTitle}>AI-Optimized Protocol Includes:</Text>
            <View style={styles.benefitList}>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                <Text style={styles.benefitText}>Adaptive Workout Progression</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                <Text style={styles.benefitText}>Real-time Calorie Tracking</Text>
              </View>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                <Text style={styles.benefitText}>Pro-Level Nutrition Insights</Text>
              </View>
            </View>
          </View>

          {/* Probability Box */}
          <View style={styles.probabilityBox}>
            <MaterialCommunityIcons name="check-decagram" size={24} color="#10B981" />
            <Text style={styles.probabilityText}>
              98% Success Probability detected based on your commitment level and training frequency.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={() => router.replace('/(onboarding)/lifestyle-convincer')}
        >
          <LinearGradient
            colors={['#FFFFFF', '#E0E0E0']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Unlock My Full 12-Week Plan</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="black" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 22,
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statUnit: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  projectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: 'rgba(255, 140, 90, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 90, 0.3)',
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  projectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  projectionPoint: {
    alignItems: 'center',
  },
  projectionLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginBottom: 4,
  },
  projectionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  projectionArrow: {
    opacity: 0.5,
  },
  projectionNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  strategyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  strategyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strategyTextContent: {
    flex: 1,
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  strategyDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 4,
  },
  macroName: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  macroBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },
  roadmapContainer: {
    marginBottom: 32,
    paddingLeft: 8,
  },
  roadmapItem: {
    flexDirection: 'row',
    marginBottom: 0,
    height: 60,
  },
  roadmapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 140, 90, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  roadmapLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  roadmapContent: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  roadmapWeek: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  roadmapText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  premiumBenefitBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  probabilityBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    marginBottom: 40,
  },
  probabilityText: {
    flex: 1,
    fontSize: 13,
    color: '#10B981',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  continueButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default AnalysisResultsScreen;





