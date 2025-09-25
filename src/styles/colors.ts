// Premium fitness app color system with black and orange theme

export const colors = {
  // Primary brand colors
  primary: '#FF6B35',       // Orange - energetic and motivational
  primaryLight: '#FF8F65',  // Lighter orange for backgrounds and highlights
  primaryDark: '#E55A2B',   // Deeper orange for contrast elements
  
  // Accent colors
  accent: '#FF8F65',        // Light orange - energetic and motivational
  accentLight: '#FFB08F',   // Very light orange for subtle highlights
  accentDark: '#E55A2B',    // Deeper orange for interactive elements
  
  // Secondary colors
  secondary: '#1C1C1E',     // Dark gray - grounding and professional
  secondaryLight: '#2C2C2E', // Lighter dark gray for backgrounds
  secondaryDark: '#000000',  // Pure black for interactive elements
  
  // Neutrals
  background: '#121212',    // Dark gray background - premium and modern
  surface: '#1C1C1E',       // Dark gray for cards and surfaces
  card: '#1C1C1E',          // Dark gray for card surfaces
  
  // Text colors
  text: '#FFFFFF',          // White - sophisticated and readable
  textSecondary: 'rgba(235, 235, 245, 0.6)', // Semi-transparent white for secondary text
  textTertiary: 'rgba(235, 235, 245, 0.4)',  // More transparent white for tertiary text
  textInverse: '#000000',   // Black text for use on light backgrounds

  // Common colors
  white: '#FFFFFF',         // Pure white
  
  // Utility colors
  border: '#2C2C2E',        // Dark gray for borders and dividers
  error: '#FF5252',         // Bright red for errors
  success: '#4CAF50',       // Fresh green for success states
  warning: '#FFC107',       // Amber for warnings
  info: '#2196F3',          // Blue for information
  
  // Additional colors
  shadow: 'rgba(0, 0, 0, 0.3)', // Shadow color
  overlay: 'rgba(0, 0, 0, 0.6)', // Overlay color
  darkGray: '#1C1C1E',      // Dark gray for icons and secondary elements
  lightGray: '#2C2C2E',     // Light gray for inactive states
  black: '#000000',         // Pure black for special text
  gray: '#666666',          // Medium gray for placeholders
  
  // Glass morphism colors
  glass: 'rgba(255, 255, 255, 0.1)',      // Glass effect background
  glassStrong: 'rgba(255, 255, 255, 0.15)', // Stronger glass effect
  glassBorder: 'rgba(255, 255, 255, 0.1)', // Glass borders
  
  // Gradient definitions
  gradients: {
    primary: ['#FF6B35', '#E55A2B'],
    accent: ['#FF8F65', '#E55A2B'],
    secondary: ['#1C1C1E', '#000000'],
    orangeBlack: ['#FF6B35', '#000000'],
    modern: ['#1C1C1E', '#000000'],
    dark: ['#1C1C1E', '#000000'],
    light: ['#2C2C2E', '#1C1C1E'],
  },
  
  // Semantic colors for fitness metrics
  fitness: {
    calories: '#FF6B35',
    protein: '#FF8F65',
    carbs: '#2C2C2E',
    fat: '#1C1C1E',
    workout: '#E55A2B',
    rest: '#1C1C1E',
    sleep: '#000000',
  },
};

export type ColorKey = keyof typeof colors;
export type GradientKey = keyof typeof colors.gradients;
export type FitnessColorKey = keyof typeof colors.fitness; 