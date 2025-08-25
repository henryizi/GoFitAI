import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../styles/colors';
import { theme } from '../../styles/theme';

interface SectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: ViewStyle;
  subtitleStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  rightContent?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  children,
  style,
  titleStyle,
  subtitleStyle,
  contentStyle,
  rightContent,
}) => {
  return (
    <View style={[styles.section, style]}>
      {(title || subtitle || rightContent) && (
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
            {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
          </View>
          {rightContent && <View>{rightContent}</View>}
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {},
}); 