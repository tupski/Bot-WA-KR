/**
 * Firebase Configuration
 * Contains Firebase project settings and constants
 */

export const FIREBASE_CONFIG = {
  // Project Information
  projectId: 'kr-app-12092',
  senderId: '241468377',
  databaseURL: 'https://kr-app-12092-default-rtdb.firebaseio.com',
  
  // Notification Settings
  defaultNotificationIcon: 'ic_notification',
  defaultNotificationColor: '#2196F3',
  defaultChannelId: 'kakarama_notifications',
  
  // Channel Configuration
  channels: {
    default: {
      id: 'kakarama_notifications',
      name: 'KakaRama Notifications',
      description: 'General notifications from KakaRama Room',
      importance: 'high',
      sound: true,
      vibrate: true,
    },
    checkin: {
      id: 'checkin_notifications',
      name: 'Checkin Notifications',
      description: 'Notifications related to checkin activities',
      importance: 'high',
      sound: true,
      vibrate: true,
    },
    admin: {
      id: 'admin_notifications',
      name: 'Admin Notifications',
      description: 'Administrative notifications and broadcasts',
      importance: 'high',
      sound: true,
      vibrate: true,
    },
    cleaning: {
      id: 'cleaning_notifications',
      name: 'Cleaning Notifications',
      description: 'Notifications for cleaning schedules',
      importance: 'default',
      sound: false,
      vibrate: true,
    }
  }
};

/**
 * Get notification channel configuration
 * @param {string} type - Channel type (default, checkin, admin, cleaning)
 * @returns {object} Channel configuration
 */
export const getNotificationChannel = (type = 'default') => {
  return FIREBASE_CONFIG.channels[type] || FIREBASE_CONFIG.channels.default;
};

/**
 * Get Firebase project configuration
 * @returns {object} Firebase project config
 */
export const getFirebaseConfig = () => {
  return {
    projectId: FIREBASE_CONFIG.projectId,
    senderId: FIREBASE_CONFIG.senderId,
    databaseURL: FIREBASE_CONFIG.databaseURL,
  };
};

/**
 * Notification types and their corresponding channels
 */
export const NOTIFICATION_TYPES = {
  CHECKOUT_REMINDER: {
    type: 'checkout_reminder',
    channel: 'checkin',
    priority: 'high',
  },
  CHECKOUT_TIME: {
    type: 'checkout_time',
    channel: 'checkin',
    priority: 'high',
  },
  CLEANING_TIME: {
    type: 'cleaning_time',
    channel: 'cleaning',
    priority: 'default',
  },
  UNIT_AVAILABLE: {
    type: 'unit_available',
    channel: 'cleaning',
    priority: 'default',
  },
  ADMIN_BROADCAST: {
    type: 'admin_broadcast',
    channel: 'admin',
    priority: 'high',
  },
};

export default FIREBASE_CONFIG;
