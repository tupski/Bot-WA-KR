import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import AuthService from './AuthService';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    try {
      console.log('NotificationService: Initializing...');

      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('NotificationService: Permission not granted');
        return false;
      }

      // Get FCM token
      await this.getFCMToken();

      // Set up message handlers
      this.setupMessageHandlers();

      this.isInitialized = true;
      console.log('NotificationService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('NotificationService: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Get FCM token and save to storage
   */
  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      
      console.log('NotificationService: FCM Token:', token);
      
      // Save token to AsyncStorage
      await AsyncStorage.setItem('fcm_token', token);
      
      // Save token to Supabase for current user
      await this.saveTokenToDatabase(token);
      
      return token;
    } catch (error) {
      console.error('NotificationService: Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to database
   */
  async saveTokenToDatabase(token) {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        console.log('NotificationService: No current user, skipping token save');
        return;
      }

      const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert({
          user_id: currentUser.id,
          user_type: currentUser.role,
          fcm_token: token,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,user_type'
        });

      if (error) {
        console.error('NotificationService: Error saving token to database:', error);
      } else {
        console.log('NotificationService: Token saved to database successfully');
      }
    } catch (error) {
      console.error('NotificationService: Error in saveTokenToDatabase:', error);
    }
  }

  /**
   * Setup message handlers
   */
  setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('NotificationService: Background message received:', remoteMessage);
      await this.handleNotification(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('NotificationService: Foreground message received:', remoteMessage);
      await this.handleNotification(remoteMessage);
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('NotificationService: Notification opened app:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Check if app was opened from notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('NotificationService: App opened from notification:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });
  }

  /**
   * Handle incoming notification
   */
  async handleNotification(remoteMessage) {
    try {
      const { notification, data } = remoteMessage;
      
      // Save notification to local database
      await this.saveNotificationToDatabase({
        title: notification?.title || 'Notification',
        body: notification?.body || '',
        data: data || {},
        received_at: new Date().toISOString(),
        is_read: false
      });

      // Update notification badge
      await this.updateNotificationBadge();
      
    } catch (error) {
      console.error('NotificationService: Error handling notification:', error);
    }
  }

  /**
   * Handle notification tap
   */
  handleNotificationTap(remoteMessage) {
    try {
      const { data } = remoteMessage;
      
      // Navigate based on notification type
      if (data?.type === 'checkin_reminder') {
        // Navigate to checkin detail or unit list
      } else if (data?.type === 'broadcast') {
        // Navigate to notifications list
      }
      
    } catch (error) {
      console.error('NotificationService: Error handling notification tap:', error);
    }
  }

  /**
   * Save notification to database
   */
  async saveNotificationToDatabase(notificationData) {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return;

      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: currentUser.id,
          user_type: currentUser.role,
          ...notificationData
        }]);

      if (error) {
        console.error('NotificationService: Error saving notification:', error);
      }
    } catch (error) {
      console.error('NotificationService: Error in saveNotificationToDatabase:', error);
    }
  }

  /**
   * Update notification badge count
   */
  async updateNotificationBadge() {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      // Store badge count in AsyncStorage for quick access
      await AsyncStorage.setItem('notification_badge_count', (count || 0).toString());
      
      return count || 0;
    } catch (error) {
      console.error('NotificationService: Error updating badge:', error);
      return 0;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    try {
      const count = await AsyncStorage.getItem('notification_badge_count');
      return parseInt(count || '0');
    } catch (error) {
      console.error('NotificationService: Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (!error) {
        await this.updateNotificationBadge();
      }

      return !error;
    } catch (error) {
      console.error('NotificationService: Error marking as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return false;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      if (!error) {
        await this.updateNotificationBadge();
      }

      return !error;
    } catch (error) {
      console.error('NotificationService: Error marking all as read:', error);
      return false;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(limit = 50) {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return { success: false, data: [] };

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('NotificationService: Error getting notifications:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * Send broadcast notification (admin only)
   */
  async sendBroadcastNotification(title, body, targetUserType = 'all') {
    try {
      // This would typically be done via a cloud function or backend API
      // For now, we'll save to database and let a background service handle FCM sending
      
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: 'Unauthorized' };
      }

      const { error } = await supabase
        .from('broadcast_notifications')
        .insert([{
          title,
          body,
          target_user_type: targetUserType,
          sent_by: currentUser.id,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        throw error;
      }

      return { success: true, message: 'Broadcast notification sent' };
    } catch (error) {
      console.error('NotificationService: Error sending broadcast:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new NotificationService();
