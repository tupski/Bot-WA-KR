/**
 * Modern Loading Component untuk KakaRama Room
 * Dengan berbagai variant dan animasi
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../config/theme';

const Loading = ({
  visible = true,
  variant = 'spinner', // spinner, dots, pulse, skeleton
  size = 'medium', // small, medium, large
  color = COLORS.primary,
  text,
  overlay = false,
  style,
  ...props
}) => {
  // Get size value based on size prop
  const getSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 40;
      default:
        return 30;
    }
  };

  // Render spinner loading
  const renderSpinner = () => (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={getSize()} color={color} />
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );

  // Render dots loading
  const renderDots = () => (
    <View style={[styles.container, styles.dotsContainer, style]}>
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={800}
        delay={0}
        style={[styles.dot, { backgroundColor: color }]}
      />
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={800}
        delay={200}
        style={[styles.dot, { backgroundColor: color }]}
      />
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={800}
        delay={400}
        style={[styles.dot, { backgroundColor: color }]}
      />
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );

  // Render pulse loading
  const renderPulse = () => (
    <View style={[styles.container, style]}>
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1000}
        style={[
          styles.pulseCircle,
          {
            backgroundColor: color,
            width: getSize() * 2,
            height: getSize() * 2,
            borderRadius: getSize(),
          },
        ]}
      />
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );

  // Render skeleton loading
  const renderSkeleton = () => (
    <View style={[styles.container, style]}>
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1500}
        style={styles.skeletonLine}
      />
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1500}
        delay={200}
        style={[styles.skeletonLine, { width: '80%' }]}
      />
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1500}
        delay={400}
        style={[styles.skeletonLine, { width: '60%' }]}
      />
    </View>
  );

  // Get loading content based on variant
  const getLoadingContent = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  if (!visible) return null;

  // Render with overlay modal
  if (overlay) {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        {...props}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            {getLoadingContent()}
          </View>
        </View>
      </Modal>
    );
  }

  // Render inline loading
  return getLoadingContent();
};

// Preset loading variants
export const SpinnerLoading = (props) => <Loading variant="spinner" {...props} />;
export const DotsLoading = (props) => <Loading variant="dots" {...props} />;
export const PulseLoading = (props) => <Loading variant="pulse" {...props} />;
export const SkeletonLoading = (props) => <Loading variant="skeleton" {...props} />;

// Full screen loading overlay
export const FullScreenLoading = ({ text = 'Memuat...', ...props }) => (
  <Loading
    variant="spinner"
    overlay
    text={text}
    size="large"
    {...props}
  />
);

// Button loading state
export const ButtonLoading = ({ size = 'small', color = COLORS.white, ...props }) => (
  <Loading
    variant="spinner"
    size={size}
    color={color}
    {...props}
  />
);

// Card loading skeleton
export const CardSkeleton = ({ style, ...props }) => (
  <View style={[styles.cardSkeleton, style]}>
    <Loading variant="skeleton" {...props} />
  </View>
);

// List item loading skeleton
export const ListItemSkeleton = ({ style, ...props }) => (
  <View style={[styles.listItemSkeleton, style]}>
    <Animatable.View
      animation="pulse"
      iterationCount="infinite"
      duration={1500}
      style={styles.skeletonAvatar}
    />
    <View style={styles.skeletonContent}>
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1500}
        style={styles.skeletonTitle}
      />
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={1500}
        delay={200}
        style={styles.skeletonSubtitle}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  
  // Overlay styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    ...SHADOWS.large,
    minWidth: 120,
  },
  
  // Dots loading
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: SPACING.xs,
  },
  
  // Pulse loading
  pulseCircle: {
    opacity: 0.6,
  },
  
  // Skeleton loading
  skeletonLine: {
    height: 16,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.xs,
    marginVertical: SPACING.xs,
    width: '100%',
  },
  
  // Card skeleton
  cardSkeleton: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    ...SHADOWS.small,
  },
  
  // List item skeleton
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    marginVertical: SPACING.xs,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceDark,
    marginRight: SPACING.md,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.xs,
    marginBottom: SPACING.sm,
    width: '70%',
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.xs,
    width: '50%',
  },
});

export default Loading;
