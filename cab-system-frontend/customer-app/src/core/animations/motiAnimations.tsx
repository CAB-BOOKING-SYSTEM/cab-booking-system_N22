// Animation showcase for Cab Booking UI
// These can be used as templates for other components

import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MotiView } from '../shims/ui';

/**
 * ============================================
 * 1. HEADER ANIMATIONS
 * ============================================
 */

// Sliding header with fade
export const HeaderSlideAnimation = ({ children }) => (
  <MotiView
    from={{ opacity: 0, translateY: -10 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ type: 'timing', duration: 400 }}
  >
    {children}
  </MotiView>
);

// Header with scale effect
export const HeaderScaleAnimation = ({ children }) => (
  <MotiView
    from={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'timing', duration: 500, delay: 100 }}
  >
    {children}
  </MotiView>
);

/**
 * ============================================
 * 2. LIST ITEM ANIMATIONS
 * ============================================
 */

// Staggered list items (main ride cards)
export const ListItemStaggerAnimation = ({ children, index }) => (
  <MotiView
    from={{
      opacity: 0,
      translateY: 20,
    }}
    animate={{
      opacity: 1,
      translateY: 0,
    }}
    transition={{
      type: 'timing',
      duration: 500 + index * 100, // Each item delays 100ms more
    }}
  >
    {children}
  </MotiView>
);

// Slide-in from left (for menu items, location cards)
export const SlideInLeftAnimation = ({ children, index, delay = 0 }) => (
  <MotiView
    from={{ opacity: 0, translateX: -20 }}
    animate={{ opacity: 1, translateX: 0 }}
    transition={{
      type: 'timing',
      duration: 400 + index * 100,
      delay: delay,
    }}
  >
    {children}
  </MotiView>
);

/**
 * ============================================
 * 3. BUTTON/INTERACTIVE ANIMATIONS
 * ============================================
 */

// Button scale on press
export const ButtonScaleAnimation = ({ children, isPressed }) => (
  <MotiView
    animate={{
      scale: isPressed ? 0.95 : 1,
    }}
    transition={{ type: 'timing', duration: 200 }}
  >
    {children}
  </MotiView>
);

// Filter button selection animation
export const FilterButtonAnimation = ({ isActive }) => (
  <MotiView
    animate={{
      scale: isActive ? 1.05 : 1,
    }}
    transition={{ type: 'timing', duration: 200 }}
  >
    <TouchableOpacity
      style={[styles.filterButton, isActive ? styles.filterButtonActive : styles.filterButtonInactive]}
    >
      <Text style={styles.filterButtonText}>Filter</Text>
    </TouchableOpacity>
  </MotiView>
);

/**
 * ============================================
 * 4. MODAL/OVERLAY ANIMATIONS
 * ============================================
 */

const styles = StyleSheet.create({
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
  },
  filterButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

// Fade in overlay
export const OverlayAnimation = ({ children, visible }) => (
  <MotiView
    animate={{
      opacity: visible ? 1 : 0,
    }}
    transition={{ type: 'timing', duration: 300 }}
  >
    {children}
  </MotiView>
);

// Slide up modal
export const ModalSlideUpAnimation = ({ children, visible }) => (
  <MotiView
    from={{
      opacity: 0,
      translateY: 300,
    }}
    animate={{
      opacity: visible ? 1 : 0,
      translateY: visible ? 0 : 300,
    }}
    transition={{ type: 'timing', duration: 400 }}
  >
    {children}
  </MotiView>
);

/**
 * ============================================
 * 5. LOADING ANIMATIONS
 * ============================================
 */

// Pulse loading effect
export const PulseAnimation = ({ children }) => (
  <MotiView
    from={{
      opacity: 0.5,
      scale: 1,
    }}
    animate={{
      opacity: 1,
      scale: 1.1,
    }}
    transition={{
      type: 'timing',
      duration: 1000,
      loop: true,
      repeatReverse: true,
    }}
  >
    {children}
  </MotiView>
);

// Skeleton loading shimmer
export const ShimmerAnimation = ({ children }) => (
  <MotiView
    from={{
      opacity: 0.4,
    }}
    animate={{
      opacity: 1,
    }}
    transition={{
      type: 'timing',
      duration: 1000,
      loop: true,
      repeatReverse: true,
    }}
  >
    {children}
  </MotiView>
);

/**
 * ============================================
 * 6. BADGE/STATUS ANIMATIONS
 * ============================================
 */

// Status badge bounce
export const BadgeBounceAnimation = ({ children }) => (
  <MotiView
    from={{
      scale: 0,
      opacity: 0,
    }}
    animate={{
      scale: 1,
      opacity: 1,
    }}
    transition={{
      type: 'timing',
      duration: 600,
      delay: 300,
    }}
  >
    {children}
  </MotiView>
);

/**
 * ============================================
 * 7. AVATAR ANIMATIONS
 * ============================================
 */

// Avatar pop-in with scale
export const AvatarScaleAnimation = ({ children, delay = 0 }) => (
  <MotiView
    from={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{
      type: 'timing',
      duration: 500,
      delay: delay,
    }}
  >
    {children}
  </MotiView>
);

/**
 * ============================================
 * 8. ADVANCED COMBINATIONS
 * ============================================
 */

// Card flip animation (for ride detail)
export const CardFlipAnimation = ({ children, isFlipped }) => (
  <MotiView
    animate={{
      rotateY: isFlipped ? 180 : 0,
      perspective: 1000,
    }}
    transition={{ type: 'timing', duration: 600 }}
    style={{ backfaceVisibility: 'hidden' }}
  >
    {children}
  </MotiView>
);

// Expandable section
export const ExpandAnimation = ({ children, isExpanded, maxHeight }) => (
  <MotiView
    animate={{
      height: isExpanded ? maxHeight : 0,
      opacity: isExpanded ? 1 : 0,
    }}
    transition={{ type: 'timing', duration: 400 }}
    style={{ overflow: 'hidden' }}
  >
    {children}
  </MotiView>
);

/**
 * ============================================
 * USAGE EXAMPLES
 * ============================================

// In ride history card:
<ListItemStaggerAnimation index={index}>
  <RideCard />
</ListItemStaggerAnimation>

// In profile page locations:
<SlideInLeftAnimation index={index} delay={200}>
  <SavedLocationCard />
</SlideInLeftAnimation>

// In filter button:
<FilterButtonAnimation isActive={selectedFilter === filter}>
  <TouchableOpacity>Filter</TouchableOpacity>
</FilterButtonAnimation>

// In loading state:
<PulseAnimation>
  <ActivityIndicator />
</PulseAnimation>

 */
