import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
    >
      <LinearGradient
        colors={
          disabled 
            ? ['#2A2A2A', '#3A3A3A'] 
            : variant === 'primary'
              ? ['#FF6B35', '#FF8E53', '#FFA726'] 
              : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <Text style={[
          styles.buttonText, 
          disabled && styles.buttonTextDisabled,
          variant === 'secondary' && styles.buttonTextSecondary
        ]}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    elevation: 15,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  buttonDisabled: {
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  buttonGradient: {
    paddingVertical: 18,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  buttonTextDisabled: {
    color: '#999',
    textShadowColor: 'transparent',
  },
  buttonTextSecondary: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
  },
});