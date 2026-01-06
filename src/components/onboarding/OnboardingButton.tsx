import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: any;
}

export const OnboardingButton: React.FC<OnboardingButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.button, 
        disabled && styles.buttonDisabled,
        style
      ]}
      disabled={disabled}
      activeOpacity={0.8}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={[
        styles.buttonGradient,
        disabled && styles.buttonGradientDisabled,
        variant === 'primary' ? styles.buttonGradientPrimary : styles.buttonGradientSecondary
      ]}>
        <Text style={[
          styles.buttonText, 
          disabled && styles.buttonTextDisabled,
          variant === 'secondary' && styles.buttonTextSecondary
        ]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  buttonDisabled: {
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  buttonGradient: {
    paddingVertical: 16,
    minHeight: 52,
    minWidth: 44, // iOS minimum touch target
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonGradientPrimary: {
    backgroundColor: '#000000',
  },
  buttonGradientSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
  },
  buttonGradientDisabled: {
    backgroundColor: '#E5E5E5',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonTextDisabled: {
    color: '#999999',
  },
  buttonTextSecondary: {
    color: '#000000',
  },
});