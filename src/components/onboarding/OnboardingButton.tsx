import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const OnboardingButton: React.FC<OnboardingButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.buttonSecondary,
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    variant === 'secondary' && styles.textSecondary,
    disabled && styles.textDisabled,
    textStyle,
  ];

  if (variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        style={buttonStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF6B35', '#E55A2B']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={textStyleCombined}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={textStyleCombined}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.secondaryLight,
    elevation: 0,
    shadowOpacity: 0,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  textSecondary: {
    color: colors.primary,
  },
  textDisabled: {
    color: colors.textSecondary,
  },
}); 