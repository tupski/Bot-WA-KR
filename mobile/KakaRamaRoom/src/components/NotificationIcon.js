import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../config/constants';
import NotificationService from '../services/NotificationService';

const NotificationIcon = ({
  onPress,
  size = 24,
  color = COLORS.text,
  showBadge = true,
  style,
}) => {
  const [badgeCount, setBadgeCount] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadBadgeCount();
    
    // Set up interval to check for new notifications
    const interval = setInterval(loadBadgeCount, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (badgeCount > 0) {
      // Pulse animation for new notifications
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [badgeCount]);

  const loadBadgeCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setBadgeCount(count);
    } catch (error) {
      console.error('NotificationIcon: Error loading badge count:', error);
    }
  };

  const handlePress = () => {
    onPress?.();
    // Optionally refresh badge count after press
    setTimeout(loadBadgeCount, 1000);
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Icon
          name="notifications"
          size={size}
          color={color}
        />
        
        {showBadge && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount.toString()}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationIcon;
