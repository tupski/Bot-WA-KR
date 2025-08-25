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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../config/constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ModernAlert = ({
  visible,
  title,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
  buttons = [],
  onDismiss,
  dismissible = true,
  icon,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible && dismissible) {
        onDismiss?.();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, dismissible, onDismiss]);

  const getIconName = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'confirm':
        return 'help';
      default:
        return 'info';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      case 'confirm':
        return COLORS.primary;
      default:
        return COLORS.info;
    }
  };

  const handleBackdropPress = () => {
    if (dismissible && onDismiss) {
      onDismiss();
    }
  };

  const handleButtonPress = (button) => {
    try {
      if (button.onPress && typeof button.onPress === 'function') {
        button.onPress();
      } else if (onDismiss && typeof onDismiss === 'function') {
        onDismiss();
      }
    } catch (error) {
      console.error('ModernAlert: Error in button press handler:', error);
      // Fallback to dismiss
      if (onDismiss && typeof onDismiss === 'function') {
        onDismiss();
      }
    }
  };

  const defaultButtons = buttons.length > 0 ? buttons : [
    {
      text: 'OK',
      onPress: () => {
        if (onDismiss && typeof onDismiss === 'function') {
          onDismiss();
        }
      },
      style: 'primary',
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <Animated.View
            style={[
              styles.alertContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.alertContent}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                  <Icon
                    name={getIconName()}
                    size={48}
                    color={getIconColor()}
                  />
                </View>

                {/* Title */}
                {title && (
                  <Text style={styles.title}>{title}</Text>
                )}

                {/* Message */}
                {message && (
                  <Text style={styles.message}>{message}</Text>
                )}

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  {defaultButtons.map((button, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        button.style === 'destructive' && styles.destructiveButton,
                        button.style === 'cancel' && styles.cancelButton,
                        defaultButtons.length === 1 && styles.singleButton,
                        index === 0 && defaultButtons.length > 1 && styles.firstButton,
                        index === defaultButtons.length - 1 && defaultButtons.length > 1 && styles.lastButton,
                      ]}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.8}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          button.style === 'destructive' && styles.destructiveButtonText,
                          button.style === 'cancel' && styles.cancelButtonText,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  alertContainer: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  alertContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  singleButton: {
    marginHorizontal: 0,
  },
  firstButton: {
    marginLeft: 0,
  },
  lastButton: {
    marginRight: 0,
  },
  destructiveButton: {
    backgroundColor: COLORS.error,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  destructiveButtonText: {
    color: COLORS.white,
  },
  cancelButtonText: {
    color: COLORS.text,
  },
});

// Hook for using ModernAlert
export const useModernAlert = () => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
    onDismiss: null,
    dismissible: true,
    icon: null,
  });

  const showAlert = (config) => {
    console.log('ModernAlert: showAlert called with config:', config);

    const dismissHandler = () => {
      console.log('ModernAlert: dismissHandler called');
      setAlertConfig(prev => ({ ...prev, visible: false }));
      if (config.onDismiss && typeof config.onDismiss === 'function') {
        try {
          config.onDismiss();
        } catch (error) {
          console.error('ModernAlert: Error in onDismiss callback:', error);
        }
      }
    };

    // Process buttons to ensure proper handlers
    const processedButtons = config.buttons?.map(button => ({
      ...button,
      onPress: () => {
        console.log('ModernAlert: Button pressed:', button.text);
        try {
          if (button.onPress && typeof button.onPress === 'function') {
            button.onPress();
          }
          // Always dismiss after button press unless explicitly prevented
          if (button.preventDismiss !== true) {
            dismissHandler();
          }
        } catch (error) {
          console.error('ModernAlert: Error in button onPress:', error);
          dismissHandler(); // Fallback dismiss
        }
      }
    })) || [];

    setAlertConfig({
      visible: true,
      dismissible: true,
      ...config,
      buttons: processedButtons,
      onDismiss: dismissHandler,
    });
  };

  const hideAlert = () => {
    console.log('ModernAlert: hideAlert called');
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <ModernAlert {...alertConfig} />
  );

  return {
    showAlert,
    hideAlert,
    AlertComponent,
  };
};

export default ModernAlert;
