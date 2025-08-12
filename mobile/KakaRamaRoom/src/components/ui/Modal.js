/**
 * Modern Modal Component untuk KakaRama Room
 * Dengan berbagai variant dan animasi
 */

import React from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import { PrimaryButton, SecondaryButton } from './Button';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../config/theme';

const { width, height } = Dimensions.get('window');

const Modal = ({
  visible = false,
  onClose,
  title,
  children,
  variant = 'center', // center, bottom, fullscreen
  size = 'medium', // small, medium, large
  showCloseButton = true,
  closeOnBackdrop = true,
  animationType = 'fade',
  style,
  contentStyle,
  ...props
}) => {
  // Get modal size based on size prop
  const getModalSize = () => {
    switch (size) {
      case 'small':
        return { width: width * 0.8, maxHeight: height * 0.4 };
      case 'large':
        return { width: width * 0.95, maxHeight: height * 0.8 };
      default:
        return { width: width * 0.9, maxHeight: height * 0.6 };
    }
  };

  // Get modal style based on variant
  const getModalStyle = () => {
    const baseStyle = {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.md,
      ...SHADOWS.large,
    };

    switch (variant) {
      case 'bottom':
        return {
          ...baseStyle,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          maxHeight: height * 0.7,
        };
      case 'fullscreen':
        return {
          ...baseStyle,
          width: width,
          height: height,
          borderRadius: 0,
        };
      default:
        return {
          ...baseStyle,
          ...getModalSize(),
        };
    }
  };

  // Handle backdrop press
  const handleBackdropPress = () => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  };

  // Render modal header
  const renderHeader = () => {
    if (!title && !showCloseButton) return null;

    return (
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {showCloseButton && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Icon name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Get animation based on variant
  const getAnimation = () => {
    switch (variant) {
      case 'bottom':
        return 'slideInUp';
      case 'fullscreen':
        return 'fadeIn';
      default:
        return 'zoomIn';
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      {...props}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleBackdropPress}
      >
        <Animatable.View
          animation={visible ? getAnimation() : undefined}
          duration={300}
          style={[getModalStyle(), style]}
        >
          <TouchableOpacity activeOpacity={1}>
            {renderHeader()}
            <View style={[styles.content, contentStyle]}>
              {children}
            </View>
          </TouchableOpacity>
        </Animatable.View>
      </TouchableOpacity>
    </RNModal>
  );
};

// Preset modal variants
export const CenterModal = (props) => <Modal variant="center" {...props} />;
export const BottomModal = (props) => <Modal variant="bottom" {...props} />;
export const FullScreenModal = (props) => <Modal variant="fullscreen" {...props} />;

// Alert modal
export const AlertModal = ({
  visible,
  onClose,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  type = 'info', // info, success, warning, error
  ...props
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { color: COLORS.success, icon: 'check-circle' };
      case 'warning':
        return { color: COLORS.warning, icon: 'warning' };
      case 'error':
        return { color: COLORS.error, icon: 'error' };
      default:
        return { color: COLORS.info, icon: 'info' };
    }
  };

  const config = getTypeConfig();

  return (
    <Modal
      visible={visible}
      onClose={onClose || onCancel}
      size="small"
      showCloseButton={false}
      {...props}
    >
      <View style={styles.alertContent}>
        <Icon name={config.icon} size={48} color={config.color} />
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertMessage}>{message}</Text>
        
        <View style={styles.alertButtons}>
          {onCancel && (
            <SecondaryButton
              title={cancelText}
              onPress={onCancel}
              style={styles.alertButton}
            />
          )}
          <PrimaryButton
            title={confirmText}
            onPress={onConfirm || onClose}
            style={styles.alertButton}
          />
        </View>
      </View>
    </Modal>
  );
};

// Confirmation modal
export const ConfirmModal = ({
  visible,
  onClose,
  title = 'Konfirmasi',
  message,
  confirmText = 'Ya',
  cancelText = 'Tidak',
  onConfirm,
  onCancel,
  ...props
}) => (
  <AlertModal
    visible={visible}
    onClose={onClose}
    title={title}
    message={message}
    confirmText={confirmText}
    cancelText={cancelText}
    onConfirm={onConfirm}
    onCancel={onCancel || onClose}
    type="warning"
    {...props}
  />
);

// Loading modal
export const LoadingModal = ({
  visible,
  message = 'Memuat...',
  ...props
}) => (
  <Modal
    visible={visible}
    size="small"
    showCloseButton={false}
    closeOnBackdrop={false}
    {...props}
  >
    <View style={styles.loadingContent}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceDark,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  content: {
    padding: SPACING.lg,
  },
  
  // Alert Modal
  alertContent: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  alertTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
    marginBottom: SPACING.lg,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  alertButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  
  // Loading Modal
  loadingContent: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

export default Modal;
