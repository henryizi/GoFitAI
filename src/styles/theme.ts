import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors } from './colors';
import { fontFamily, typography } from './fonts';

// Modern typography system with custom fonts
const fontConfig = {
  displayLarge: {
    fontFamily: fontFamily.primary,
    fontSize: 57,
    fontWeight: '700' as const,
    letterSpacing: -1.0,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: fontFamily.primary,
    fontSize: 45,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: fontFamily.primary,
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: fontFamily.primary,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: fontFamily.primary,
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: fontFamily.primary,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: fontFamily.primary,
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.15,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: fontFamily.secondary,
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: fontFamily.secondary,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: fontFamily.secondary,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: fontFamily.secondary,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.25,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: fontFamily.tertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.25,
    lineHeight: 16,
  },
  bodyLarge: {
    fontFamily: fontFamily.secondary,
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamily.secondary,
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: fontFamily.tertiary,
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
};

// Enhanced shadow styles for different elevation levels
const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
};

// Spacing system for consistent layout
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius system
const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 9999,
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.textInverse,
    primaryContainer: colors.primaryLight,
    onPrimaryContainer: colors.primaryDark,
    secondary: colors.secondary,
    onSecondary: colors.textInverse,
    secondaryContainer: colors.secondaryLight,
    onSecondaryContainer: colors.secondaryDark,
    tertiary: colors.accent,
    onTertiary: colors.textInverse,
    tertiaryContainer: colors.accentLight,
    onTertiaryContainer: colors.accentDark,
    error: colors.error,
    onError: colors.textInverse,
    errorContainer: colors.accentLight,
    onErrorContainer: colors.error,
    background: colors.background,
    onBackground: colors.text,
    surface: colors.surface,
    onSurface: colors.text,
    surfaceVariant: colors.lightGray,
    onSurfaceVariant: colors.darkGray,
    outline: colors.border,
    outlineVariant: colors.lightGray,
    shadow: colors.shadow,
    scrim: colors.overlay,
    inverseSurface: colors.darkGray,
    inverseOnSurface: colors.textInverse,
    inversePrimary: colors.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surface,
      level3: colors.surface,
      level4: colors.surface,
      level5: colors.surface,
    },
  },
  roundness: borderRadius.md,
  animation: {
    scale: 1.0,
  },
  // Custom theme extensions
  shadows,
  spacing,
  borderRadius,
  // Typography export for direct use in styles
  typography,
};

export type AppTheme = typeof theme; 