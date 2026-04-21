/**
 * Design System & Theme Constants
 * Grab-inspired color palette with Glassmorphism effects
 */

export const COLORS = {
  // Primary Colors (Grab Green)
  primary: '#00B14F',
  primaryLight: '#00D66A',
  primaryDark: '#009C41',

  // Neutral Colors
  white: '#FFFFFF',
  darkGrey: '#1A1A1A',
  lightGrey: '#F5F5F5',
  mediumGrey: '#757575',

  // Semantic Colors
  success: '#00B14F',
  error: '#EB5757',
  warning: '#F2994E',
  info: '#2F80ED',

  // Status Colors
  completed: '#00B14F',
  cancelled: '#EB5757',
  ongoing: '#2F80ED',
  pending: '#F2994E',

  // Gradients
  gradientGreen: ['#00B14F', '#00D66A'],
  gradientError: ['#EB5757', '#FF6B6B'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 24, // rounded-3xl equivalent
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const TYPOGRAPHY = {
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  subtitle1: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  subtitle2: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
};

/**
 * Get status color based on ride status
 */
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return COLORS.completed;
    case 'cancelled':
      return COLORS.cancelled;
    case 'ongoing':
      return COLORS.ongoing;
    case 'pending':
      return COLORS.pending;
    default:
      return COLORS.mediumGrey;
  }
};

/**
 * Get status background color for badges
 */
export const getStatusBgColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return '#D4F8E8';
    case 'cancelled':
      return '#FADDD1';
    case 'ongoing':
      return '#D3E5FF';
    case 'pending':
      return '#FEE8D1';
    default:
      return '#F0F0F0';
  }
};

export default {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  TYPOGRAPHY,
  getStatusColor,
  getStatusBgColor,
};
