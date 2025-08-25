import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button as PaperButton, ButtonProps as PaperButtonProps } from 'react-native-paper';
import { colors } from '../../styles/colors';

export interface ButtonProps extends Omit<PaperButtonProps, 'mode'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  style,
  children,
  ...props
}) => {
  const getButtonMode = () => {
    switch (variant) {
      case 'primary':
        return 'contained';
      case 'secondary':
        return 'contained-tonal';
      case 'outline':
        return 'outlined';
      case 'ghost':
        return 'text';
      default:
        return 'contained';
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (size) {
      case 'small':
        baseStyle.height = 36;
        break;
      case 'medium':
        baseStyle.height = 48;
        break;
      case 'large':
        baseStyle.height = 56;
        break;
    }

    return { ...baseStyle, ...style };
  };

  const getButtonColors = (): { buttonColor: string; textColor: string } => {
    switch (variant) {
      case 'primary':
        return {
          buttonColor: colors.primary,
          textColor: colors.textInverse,
        };
      case 'secondary':
        return {
          buttonColor: colors.secondary,
          textColor: colors.textInverse,
        };
      case 'outline':
        return {
          buttonColor: 'transparent',
          textColor: colors.primary,
        };
      case 'ghost':
        return {
          buttonColor: 'transparent',
          textColor: colors.primary,
        };
      default:
        return {
          buttonColor: colors.primary,
          textColor: colors.textInverse,
        };
    }
  };

  const buttonColors = getButtonColors();

  return (
    <PaperButton
      mode={getButtonMode()}
      style={getButtonStyle()}
      buttonColor={buttonColors.buttonColor}
      textColor={buttonColors.textColor}
      contentStyle={styles.content}
      labelStyle={styles.label}
      {...props}
    >
      {children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  content: {
    height: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 