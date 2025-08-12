/**
 * Theme Configuration untuk KakaRama Room
 * Menggunakan React Native Elements + React Native Paper
 */

import { DefaultTheme } from 'react-native-paper';

// Color Palette untuk KakaRama Room
export const COLORS = {
  // Primary Colors
  primary: '#2E7D32',      // Green - untuk header, button utama
  primaryLight: '#4CAF50', // Light Green - untuk hover states
  primaryDark: '#1B5E20',  // Dark Green - untuk pressed states
  
  // Secondary Colors
  secondary: '#FF6F00',    // Orange - untuk accent, notifications
  secondaryLight: '#FF8F00',
  secondaryDark: '#E65100',
  
  // Background Colors
  background: '#FFFFFF',   // White - background utama
  surface: '#F5F5F5',     // Light Gray - card background
  surfaceDark: '#EEEEEE', // Darker Gray - untuk divider
  
  // Text Colors
  textPrimary: '#212121',  // Dark Gray - text utama
  textSecondary: '#757575', // Medium Gray - text secondary
  textLight: '#BDBDBD',    // Light Gray - placeholder text
  
  // Status Colors
  success: '#4CAF50',      // Green - untuk success states
  warning: '#FF9800',      // Orange - untuk warning
  error: '#F44336',        // Red - untuk error states
  info: '#2196F3',         // Blue - untuk info
  
  // Utility Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Gradient Colors
  gradientStart: '#2E7D32',
  gradientEnd: '#4CAF50',
};

// Typography
export const TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Spacing System
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 50,
};

// Shadows
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// React Native Paper Theme
export const PAPER_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    accent: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    text: COLORS.textPrimary,
    placeholder: COLORS.textLight,
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: TYPOGRAPHY.fontFamily.regular,
      fontWeight: TYPOGRAPHY.fontWeight.regular,
    },
    medium: {
      fontFamily: TYPOGRAPHY.fontFamily.medium,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    light: {
      fontFamily: TYPOGRAPHY.fontFamily.regular,
      fontWeight: TYPOGRAPHY.fontWeight.light,
    },
    thin: {
      fontFamily: TYPOGRAPHY.fontFamily.regular,
      fontWeight: TYPOGRAPHY.fontWeight.light,
    },
  },
};

// React Native Elements Theme
export const ELEMENTS_THEME = {
  colors: {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    text: COLORS.textPrimary,
  },
  Button: {
    titleStyle: {
      fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    },
    buttonStyle: {
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md,
    },
  },
  Card: {
    containerStyle: {
      borderRadius: RADIUS.md,
      ...SHADOWS.medium,
      marginVertical: SPACING.sm,
    },
  },
  Header: {
    backgroundColor: COLORS.primary,
    centerComponentStyle: {
      color: COLORS.white,
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
  },
  Input: {
    inputStyle: {
      fontSize: TYPOGRAPHY.fontSize.md,
      color: COLORS.textPrimary,
    },
    labelStyle: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      color: COLORS.textSecondary,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    containerStyle: {
      paddingHorizontal: 0,
    },
    inputContainerStyle: {
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.surfaceDark,
      paddingHorizontal: SPACING.md,
    },
  },
};

// Animation Configurations
export const ANIMATIONS = {
  // Timing
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  // Easing
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  
  // Common animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  slideInUp: {
    from: { translateY: 50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },
  slideInDown: {
    from: { translateY: -50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },
  scaleIn: {
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
};

// Layout Constants
export const LAYOUT = {
  // Screen padding
  screenPadding: SPACING.md,
  
  // Header height
  headerHeight: 56,
  
  // Tab bar height
  tabBarHeight: 60,
  
  // Card spacing
  cardSpacing: SPACING.md,
  
  // Button heights
  buttonHeight: {
    small: 36,
    medium: 44,
    large: 52,
  },
  
  // Input heights
  inputHeight: 48,
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  PAPER_THEME,
  ELEMENTS_THEME,
  ANIMATIONS,
  LAYOUT,
};
