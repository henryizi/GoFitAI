import React from 'react';
import { StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightIcon?: string;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  elevated?: boolean;
  transparent?: boolean;
  centerTitle?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  rightIcon,
  onRightIconPress,
  style,
  titleStyle,
  elevated = false,
  transparent = false,
  centerTitle = false,
}) => {
  const insets = useSafeAreaInsets();
  
  const handleBackPress = () => {
    console.log('Header back button pressed');
    if (onBackPress) {
      console.log('Calling custom onBackPress');
      onBackPress();
    } else {
      console.log('Calling router.back()');
      router.back();
    }
  };

  return (
    <Appbar.Header
      style={[
        styles.header,
        elevated && styles.elevated,
        transparent && styles.transparent,
        { paddingTop: insets.top > 0 ? 0 : theme.spacing.md },
        style,
      ]}
      mode={centerTitle ? 'center-aligned' : 'small'}
    >
      {showBackButton && (
        <Appbar.BackAction
          onPress={handleBackPress}
          color={transparent ? colors.textInverse : colors.text}
        />
      )}
      
      <Appbar.Content
        title={title}
        titleStyle={[
          styles.title,
          transparent && styles.titleTransparent,
          titleStyle,
        ]}
      />
      
      {rightIcon && (
        <Appbar.Action
          icon={rightIcon}
          onPress={onRightIconPress}
          color={transparent ? colors.textInverse : colors.text}
        />
      )}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  elevated: {
    ...theme.shadows.sm,
    borderBottomWidth: 0,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  titleTransparent: {
    color: colors.textInverse,
  },
}); 