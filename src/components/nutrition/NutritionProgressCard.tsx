import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/colors';


const { width } = Dimensions.get('window');

interface NutritionProgressCardProps {
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onLogFood: () => void;
  onViewDetails: () => void;
}

export const NutritionProgressCard: React.FC<NutritionProgressCardProps> = ({
  targets,
  progress,
  onLogFood,
  onViewDetails,
}) => {
  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return colors.success;
    if (percentage >= 70) return colors.warning;
    return colors.primary;
  };

  const getProgressEmoji = (percentage: number) => {
    if (percentage >= 90) return '🎯';
    if (percentage >= 70) return '📈';
    if (percentage >= 50) return '💪';
    return '🔥';
  };

  const calorieProgress = calculateProgress(progress.calories, targets.calories);
  const proteinProgress = calculateProgress(progress.protein, targets.protein);
  const carbsProgress = calculateProgress(progress.carbs, targets.carbs);
  const fatProgress = calculateProgress(progress.fat, targets.fat);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Icon name="food-apple-outline" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.title}>TODAY'S NUTRITION</Text>
              <Text style={styles.subtitle}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={onLogFood}
            style={styles.logFoodButton}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.logFoodButtonGradient}
            >
              <Icon name="plus" size={18} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={styles.logFoodButtonText}>LOG FOOD</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Main Progress */}
        <View style={styles.mainProgress}>
          <View style={styles.calorieSection}>
            <View style={styles.calorieHeader}>
              <View style={styles.calorieInfo}>
                <Text style={styles.calorieCurrent}>
                  {Math.round(progress.calories)}
                </Text>
                <Text style={styles.calorieTarget}>
                  / {targets.calories} kcal
                </Text>
              </View>
              <Text style={styles.progressEmoji}>
                {getProgressEmoji(calorieProgress)}
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${calorieProgress}%`,
                    backgroundColor: getProgressColor(calorieProgress)
                  }
                ]} 
              />
            </View>
            
            <Text style={styles.progressText}>
              {calorieProgress.toFixed(0)}% of daily goal
            </Text>
          </View>
        </View>

        {/* Macros Grid */}
        <View style={styles.macrosGrid}>
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Icon name="protein" size={16} color={colors.primary} />
              <Text style={styles.macroLabel}>PROTEIN</Text>
            </View>
            <Text style={styles.macroValue}>
              {Math.round(progress.protein)}g
            </Text>
            <Text style={styles.macroTarget}>
              Target: {targets.protein}g
            </Text>
            <View style={styles.miniProgressContainer}>
              <View 
                style={[
                  styles.miniProgressBar, 
                  { 
                    width: `${proteinProgress}%`,
                    backgroundColor: colors.primary
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Icon name="bread-slice" size={16} color={colors.accent} />
              <Text style={styles.macroLabel}>CARBS</Text>
            </View>
            <Text style={styles.macroValue}>
              {Math.round(progress.carbs)}g
            </Text>
            <Text style={styles.macroTarget}>
              Target: {targets.carbs}g
            </Text>
            <View style={styles.miniProgressContainer}>
              <View 
                style={[
                  styles.miniProgressBar, 
                  { 
                    width: `${carbsProgress}%`,
                    backgroundColor: colors.accent
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Icon name="oil" size={16} color={colors.secondary} />
              <Text style={styles.macroLabel}>FAT</Text>
            </View>
            <Text style={styles.macroValue}>
              {Math.round(progress.fat)}g
            </Text>
            <Text style={styles.macroTarget}>
              Target: {targets.fat}g
            </Text>
            <View style={styles.miniProgressContainer}>
              <View 
                style={[
                  styles.miniProgressBar, 
                  { 
                    width: `${fatProgress}%`,
                    backgroundColor: colors.secondary
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={onViewDetails}
            activeOpacity={0.7}
          >
            <Text style={styles.viewDetailsText}>View Detailed Breakdown</Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  logButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  logButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  mainProgress: {
    marginBottom: 20,
  },
  calorieSection: {
    marginBottom: 16,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  calorieInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  calorieCurrent: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  calorieTarget: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    marginLeft: 4,
  },
  progressEmoji: {
    fontSize: 24,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  macroTarget: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  miniProgressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
  logFoodButton: {
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  logFoodButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  logFoodButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.8,
  },
}); 