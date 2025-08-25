import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface StatProps {
  value: string | number;
  label: string;
  icon?: string;
  iconColor?: string;
  iconBackground?: string;
  style?: ViewStyle;
  valueStyle?: ViewStyle;
  labelStyle?: ViewStyle;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const Stat: React.FC<StatProps> = ({
  value,
  label,
  icon,
  iconColor,
  iconBackground,
  style,
  valueStyle,
  labelStyle,
  trend,
  trendValue,
}) => {
  const renderTrend = () => {
    if (!trend) return null;

    let trendIcon = 'minus';
    let trendColor = colors.textSecondary;

    if (trend === 'up') {
      trendIcon = 'arrow-up';
      trendColor = colors.success;
    } else if (trend === 'down') {
      trendIcon = 'arrow-down';
      trendColor = colors.error;
    }

    return (
      <View style={styles.trendContainer}>
        <IconButton
          icon={trendIcon}
          size={16}
          iconColor={trendColor}
          style={styles.trendIcon}
        />
        {trendValue && (
          <Text style={[styles.trendValue, { color: trendColor }]}>
            {trendValue}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View
          style={[
            styles.iconContainer,
            iconBackground && { backgroundColor: iconBackground },
          ]}
        >
          <IconButton
            icon={icon}
            size={20}
            iconColor={iconColor || colors.primary}
            style={styles.icon}
          />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.valueRow}>
          <Text style={[styles.value, valueStyle]}>{value}</Text>
          {renderTrend()}
        </View>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  icon: {
    margin: 0,
  },
  content: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
  },
  trendIcon: {
    margin: 0,
    width: 16,
    height: 16,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: -theme.spacing.xs,
  },
}); 