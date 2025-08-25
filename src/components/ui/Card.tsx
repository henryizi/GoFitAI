import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Surface } from 'react-native-paper';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: keyof typeof theme.shadows;
  noPadding?: boolean;
  borderRadius?: keyof typeof theme.borderRadius;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevation = 'sm',
  noPadding = false,
  borderRadius = 'lg',
}) => {
  const resolvedBorderRadius = theme.borderRadius[borderRadius];

  return (
    <Surface
      style={[
        styles.card,
        { borderRadius: resolvedBorderRadius },
        theme.shadows[elevation],
        style,
      ]}
    >
      <View
        style={[
          styles.contentWrapper,
          { borderRadius: resolvedBorderRadius },
          noPadding ? null : styles.padding,
        ]}
      >
        {children}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentWrapper: {
    overflow: 'hidden',
  },
  padding: {
    padding: theme.spacing.lg,
  },
}); 