// Modern typography system for fitness app
import { Platform } from 'react-native';

export const fontFamily = {
  // Primary font family - clean, modern and highly readable
  primary: 'Montserrat',
  // Secondary font family - elegant and stylish
  secondary: 'Poppins',
  // Tertiary font family - clean and versatile
  tertiary: 'Inter',
};

export const typography = {
  // Headings
  h1: {
    fontFamily: fontFamily.primary,
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fontFamily.primary,
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: fontFamily.primary,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
  },
  h4: {
    fontFamily: fontFamily.primary,
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.25,
  },
  h5: {
    fontFamily: fontFamily.primary,
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  // Body text
  body1: {
    fontFamily: fontFamily.secondary,
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
  },
  body2: {
    fontFamily: fontFamily.secondary,
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
  },
  body3: {
    fontFamily: fontFamily.secondary,
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
  },

  // Button text
  button: {
    fontFamily: fontFamily.secondary,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'capitalize' as const,
  },

  // Caption and overline
  caption: {
    fontFamily: fontFamily.tertiary,
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
  },
  overline: {
    fontFamily: fontFamily.tertiary,
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },

  // Additional styles
  label: {
    fontFamily: fontFamily.secondary,
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.25,
  },
  metric: {
    fontFamily: fontFamily.primary,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
  },
  metricLabel: {
    fontFamily: fontFamily.tertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  tabLabel: {
    fontFamily: fontFamily.secondary,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
}; 