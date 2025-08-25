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

interface NutritionInsightCardProps {
  insight: {
    id: string;
    title: string;
    message: string;
    type: 'tip' | 'warning' | 'achievement' | 'suggestion';
    category: 'protein' | 'carbs' | 'fat' | 'calories' | 'general';
    createdAt: string;
  };
  onPress?: () => void;
  showTimestamp?: boolean;
}

export const NutritionInsightCard: React.FC<NutritionInsightCardProps> = ({
  insight,
  onPress,
  showTimestamp = true,
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return 'lightbulb-on';
      case 'warning':
        return 'alert-circle';
      case 'achievement':
        return 'trophy';
      case 'suggestion':
        return 'star';
      default:
        return 'information';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'tip':
        return colors.primary;
      case 'warning':
        return colors.warning;
      case 'achievement':
        return colors.success;
      case 'suggestion':
        return colors.accent;
      default:
        return colors.primary;
    }
  };

  const getInsightGradient = (type: string): [string, string] => {
    switch (type) {
      case 'tip':
        return [colors.primary, colors.primaryDark];
      case 'warning':
        return [colors.warning, colors.primary];
      case 'achievement':
        return [colors.success, colors.accent];
      case 'suggestion':
        return [colors.accent, colors.primary];
      default:
        return [colors.primary, colors.primaryDark];
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'protein':
        return 'protein';
      case 'carbs':
        return 'bread-slice';
      case 'fat':
        return 'oil';
      case 'calories':
        return 'fire';
      case 'general':
        return 'food-apple-outline';
      default:
        return 'food';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <LinearGradient
        colors={getInsightGradient(insight.type)}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Icon 
                name={getInsightIcon(insight.type)} 
                size={20} 
                color={colors.text} 
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <View style={styles.categoryContainer}>
                <Icon 
                  name={getCategoryIcon(insight.category)} 
                  size={12} 
                  color="rgba(255,255,255,0.7)" 
                />
                <Text style={styles.categoryText}>
                  {insight.category.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          
          {showTimestamp && (
            <Text style={styles.timestamp}>
              {formatTimestamp(insight.createdAt)}
            </Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.insightMessage} numberOfLines={3}>
            {insight.message}
          </Text>
        </View>

        {/* Footer */}
        {onPress && (
          <View style={styles.footer}>
            <View style={styles.actionContainer}>
              <Text style={styles.actionText}>Learn More</Text>
              <Icon name="chevron-right" size={14} color={colors.text} />
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  content: {
    marginBottom: 12,
  },
  insightMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontWeight: '400',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  actionContainer: {
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