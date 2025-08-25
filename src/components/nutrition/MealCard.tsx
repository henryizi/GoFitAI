import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/colors';

const { width } = Dimensions.get('window');

interface MealCardProps {
  meal: {
    id: string;
    name: string;
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    image?: string;
    description?: string;
    time?: string;
  };
  onPress: () => void;
  isCompleted?: boolean;
  showMacros?: boolean;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onPress,
  isCompleted = false,
  showMacros = true,
}) => {
  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'food-croissant';
      case 'lunch':
        return 'food-fork-drink';
      case 'dinner':
        return 'food-variant';
      case 'snack':
        return 'food-apple-outline';
      default:
        return 'food';
    }
  };

  const getMealColor = (type: string) => {
    switch (type) {
      case 'breakfast':
        return colors.primary;
      case 'lunch':
        return colors.accent;
      case 'dinner':
        return colors.primaryDark;
      case 'snack':
        return colors.success;
      default:
        return colors.primary;
    }
  };

  const getMealGradient = (type: string): [string, string] => {
    switch (type) {
      case 'breakfast':
        return [colors.primary, colors.primaryLight];
      case 'lunch':
        return [colors.accent, colors.primary];
      case 'dinner':
        return [colors.primaryDark, colors.primary];
      case 'snack':
        return [colors.success, colors.accent];
      default:
        return [colors.primary, colors.primaryLight];
    }
  };

  const formatMealType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isCompleted && styles.completedContainer]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getMealGradient(meal.type)}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Icon 
                name={getMealIcon(meal.type)} 
                size={20} 
                color={colors.text} 
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.mealType}>{formatMealType(meal.type)}</Text>
              {meal.time && (
                <Text style={styles.mealTime}>{meal.time}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.headerRight}>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Icon name="check-circle" size={16} color={colors.success} />
              </View>
            )}
            <Icon 
              name="chevron-right" 
              size={16} 
              color={colors.text} 
              style={styles.chevron}
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealName}>{meal.name}</Text>
            {meal.description && (
              <Text style={styles.mealDescription} numberOfLines={2}>
                {meal.description}
              </Text>
            )}
          </View>

          {/* Calories */}
          <View style={styles.calorieSection}>
            <View style={styles.calorieContainer}>
              <Icon name="fire" size={16} color={colors.text} />
              <Text style={styles.calorieText}>
                {Math.round(meal.calories)} kcal
              </Text>
            </View>
          </View>

          {/* Macros */}
          {showMacros && (
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>P</Text>
                <Text style={styles.macroValue}>{Math.round(meal.protein)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>C</Text>
                <Text style={styles.macroValue}>{Math.round(meal.carbs)}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>F</Text>
                <Text style={styles.macroValue}>{Math.round(meal.fat)}g</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>
              {isCompleted ? 'View Details' : 'Log This Meal'}
            </Text>
            <Icon 
              name={isCompleted ? "eye" : "plus"} 
              size={14} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completedContainer: {
    opacity: 0.8,
  },
  gradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  mealTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadge: {
    marginRight: 8,
  },
  chevron: {
    opacity: 0.7,
  },
  content: {
    marginBottom: 12,
  },
  mealInfo: {
    marginBottom: 12,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  calorieSection: {
    marginBottom: 12,
  },
  calorieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  calorieText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  macrosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 8,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  macroDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginRight: 6,
  },
}); 