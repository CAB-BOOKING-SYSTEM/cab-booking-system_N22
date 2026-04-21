// Custom Tailwind utilities for Grab cab booking system
export const tailwindStyles = {
  // Colors
  colors: {
    primary: '#00B14F',
    primaryLight: '#86efac',
    primaryDark: '#059669',
    gray100: '#f9fafb',
    gray200: '#f3f4f6',
    gray300: '#e5e7eb',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray900: '#111827',
    white: '#ffffff',
    red500: '#ef4444',
    green500: '#10b981',
    emerald500: '#10b981',
    emerald400: '#34d399',
    emerald300: '#6ee7b7',
    emerald100: '#d1fae5',
    emerald50: '#f0fdf4',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    emerald: '0 4px 12px rgba(16, 185, 129, 0.15)',
    emeraldLg: '0 8px 16px rgba(16, 185, 129, 0.2)',
  },

  // Border radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },

  // Animations
  animations: {
    fadeIn: {
      duration: 300,
      delay: 0,
      easing: 'ease-in',
    },
    slideUp: {
      duration: 400,
      delay: 0,
      easing: 'ease-out',
    },
    scaleIn: {
      duration: 300,
      delay: 0,
      easing: 'ease-in-out',
    },
  },
};

// Moti animation configs
export const motiAnimations = {
  headerEnter: {
    from: { opacity: 0, translateY: -10 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing', duration: 400 },
  },

  fadeIn: {
    from: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { type: 'timing', duration: 500 },
  },

  slideInLeft: {
    from: { opacity: 0, translateX: -20 },
    animate: { opacity: 1, translateX: 0 },
    transition: { type: 'timing', duration: 400 },
  },

  slideInUp: {
    from: { opacity: 0, translateY: 20 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'timing', duration: 500 },
  },

  scaleIn: {
    from: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'timing', duration: 400 },
  },

  scaleUp: {
    from: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'timing', duration: 500, delay: 100 },
  },
};

// Grab design system typography
export const typography = {
  h1: { fontSize: 28, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: 'bold' },
  h4: { fontSize: 18, fontWeight: 'bold' },
  body: { fontSize: 14, fontWeight: '400' },
  bodyBold: { fontSize: 14, fontWeight: '600' },
  small: { fontSize: 12, fontWeight: '400' },
  smallBold: { fontSize: 12, fontWeight: '600' },
  xs: { fontSize: 11, fontWeight: '400' },
  xsBold: { fontSize: 11, fontWeight: '600' },
};
