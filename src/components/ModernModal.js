import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  BackHandler,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../config/constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ModernModal = ({
  visible,
  title,
  children,
  onClose,
  showCloseButton = true,
  animationType = 'slide', // 'slide', 'fade', 'none'
  position = 'bottom', // 'bottom', 'center'
  maxHeight = '80%',
  minHeight = '30%',
  width = '100%',
  backgroundColor = COLORS.white,
  borderRadius = SIZES.radius * 2,
  showBackdrop = true,
  backdropOpacity = 0.5,
  dismissible = true,
  headerStyle = {},
  contentStyle = {},
  scrollable = false,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  useEffect(() => {
    if (visible) {
      if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (animationType === 'slide') {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (animationType === 'slide') {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible, animationType]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible && dismissible) {
        onClose?.();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, dismissible, onClose]);

  const handleBackdropPress = () => {
    if (dismissible) {
      onClose?.();
    }
  };

  if (!visible) return null;

  const getContainerStyle = () => {
    const baseStyle = {
      backgroundColor,
      borderRadius: position === 'bottom' ? 0 : borderRadius,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      maxHeight,
      minHeight,
      width,
    };

    if (position === 'center') {
      return {
        ...baseStyle,
        borderRadius,
        maxWidth: screenWidth * 0.9,
        maxHeight: screenHeight * 0.8,
      };
    }

    return baseStyle;
  };

  const getAnimatedStyle = () => {
    if (animationType === 'fade') {
      return { opacity: fadeAnim };
    } else if (animationType === 'slide') {
      return {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      };
    }
    return {};
  };

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable 
    ? { showsVerticalScrollIndicator: false, style: styles.scrollContent }
    : { style: styles.content };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {showBackdrop && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={handleBackdropPress}
          />
        </Animated.View>
      )}

      <View style={[styles.container, position === 'center' && styles.centerContainer]}>
        <Animated.View
          style={[
            getContainerStyle(),
            getAnimatedStyle(),
            styles.modalContainer,
          ]}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={[styles.header, headerStyle]}>
              {title && (
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <ContentWrapper {...contentWrapperProps}>
            <View style={[styles.contentContainer, contentStyle]}>
              {children}
            </View>
          </ContentWrapper>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropTouchable: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
  },
  modalContainer: {
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  title: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SIZES.sm,
  },
  closeButton: {
    padding: SIZES.xs,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray100,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    padding: SIZES.lg,
  },
});

export default ModernModal;
