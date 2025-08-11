import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { supabase } from '../config/supabase';
import AuthService from './AuthService';
import { FIREBASE_CONFIG, getNotificationChannel, NOTIFICATION_TYPES } from '../config/firebase';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
    this.senderId = FIREBASE_CONFIG.senderId;
    this.projectId = FIREBASE_CONFIG.projectId;
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
        // Don't throw error, just log it - app should continue working
        if (error.code === '42P01') {
          console.log('NotificationService: Table does not exist yet. Please run the SQL setup script.');
        }
      } else {
        console.log('NotificationService: Token saved to database successfully');
      }
    } catch (error) {
      console.error('NotificationService: Error in saveTokenToDatabase:', error);
      // Don't throw error, just log it - app should continue working
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
        if (error.code === '42P01') {
          console.log('NotificationService: Notifications table does not exist yet. Please run the SQL setup script.');
        }
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
      console.log('NotificationService: Sending broadcast notification:', { title, body, targetUserType });

      const currentUser = AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: 'Unauthorized - Admin access required' };
      }

      // Get target users based on type
      let targetUsers = [];

      if (targetUserType === 'all') {
        // Get all active users
        const { data: allUsers, error: allError } = await supabase
          .from('user_fcm_tokens')
          .select('user_id, fcm_token')
          .eq('is_active', true);

        if (allError) {
          throw allError;
        }
        targetUsers = allUsers || [];

      } else if (targetUserType === 'admin') {
        // Get all admin users
        const { data: adminUsers, error: adminError } = await supabase
          .from('user_fcm_tokens')
          .select('user_id, fcm_token')
          .in('user_id',
            supabase
              .from('admins')
              .select('id')
          )
          .eq('is_active', true);

        if (adminError) {
          throw adminError;
        }
        targetUsers = adminUsers || [];

      } else if (targetUserType === 'field_team') {
        // Get all field team users
        const { data: fieldUsers, error: fieldError } = await supabase
          .from('user_fcm_tokens')
          .select('user_id, fcm_token')
          .in('user_id',
            supabase
              .from('field_teams')
              .select('id')
          )
          .eq('is_active', true);

        if (fieldError) {
          throw fieldError;
        }
        targetUsers = fieldUsers || [];
      }

      if (targetUsers.length === 0) {
        return { success: false, message: 'No target users found' };
      }

      // Send push notifications to all target users
      const sendPromises = targetUsers.map(user =>
        this.sendNotificationToUser(user.user_id, title, body, {
          type: 'admin_broadcast',
          target_type: targetUserType
        })
      );

      const results = await Promise.allSettled(sendPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

      // Save broadcast record to database
      const { error: saveError } = await supabase
        .from('broadcast_notifications')
        .insert([{
          title,
          body,
          target_user_type: targetUserType,
          sent_by: currentUser.id,
          target_count: targetUsers.length,
          success_count: successCount,
          created_at: new Date().toISOString()
        }]);

      if (saveError) {
        console.error('NotificationService: Error saving broadcast record:', saveError);
        // Don't fail the operation if saving fails
      }

      console.log(`NotificationService: Broadcast sent to ${successCount}/${targetUsers.length} users`);
      return {
        success: true,
        message: `Notifikasi berhasil dikirim ke ${successCount}/${targetUsers.length} pengguna`
      };

    } catch (error) {
      console.error('NotificationService: Error sending broadcast:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendNotificationToUser(userId, title, body, data = {}) {
    try {
      console.log('NotificationService: Sending notification to user:', userId);

      // Get user's FCM token from database
      const { data: tokenData, error } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .single();

      if (error || !tokenData?.fcm_token) {
        console.warn('NotificationService: No FCM token found for user:', userId);
        return { success: false, message: 'FCM token not found' };
      }

      // Send notification via FCM API (temporary solution until Edge Function is ready)
      try {
        // For now, we'll save to database and let a background service handle FCM sending
        // In production, this should use FCM Server Key via secure backend

        const { error: notificationError } = await supabase
          .from('pending_notifications')
          .insert([{
            user_id: userId,
            fcm_token: tokenData.fcm_token,
            title,
            body,
            data: {
              ...data,
              timestamp: new Date().toISOString()
            },
            status: 'pending',
            created_at: new Date().toISOString()
          }]);

        if (notificationError) {
          throw notificationError;
        }

        console.log('NotificationService: Notification queued for sending');
      } catch (fcmError) {
        console.error('NotificationService: Error queuing notification:', fcmError);
        throw fcmError;
      }

      return { success: true, message: 'Notification sent' };
    } catch (error) {
      console.error('NotificationService: Send notification error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send notification to all admin users
   */
  async sendNotificationToAdmins(title, body, data = {}) {
    try {
      console.log('NotificationService: Sending notification to all admins');

      // Get all admin FCM tokens
      const { data: adminTokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, user_id')
        .in('user_id',
          supabase
            .from('admins')
            .select('id')
        );

      if (error || !adminTokens?.length) {
        console.warn('NotificationService: No admin FCM tokens found');
        return { success: false, message: 'No admin tokens found' };
      }

      // Send to all admin tokens
      const results = await Promise.allSettled(
        adminTokens.map(tokenData =>
          this.sendNotificationToUser(tokenData.user_id, title, body, data)
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

      return {
        success: true,
        message: `Notification sent to ${successCount}/${adminTokens.length} admins`
      };
    } catch (error) {
      console.error('NotificationService: Send admin notification error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Schedule notification for checkout reminder (30 minutes before)
   */
  async scheduleCheckoutReminder(checkinId, checkoutTime, unitName) {
    try {
      const reminderTime = new Date(checkoutTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 30);

      const now = new Date();
      if (reminderTime <= now) {
        console.log('NotificationService: Reminder time has passed, skipping');
        return { success: false, message: 'Reminder time has passed' };
      }

      // Save scheduled notification to database
      const { error } = await supabase
        .from('scheduled_notifications')
        .insert({
          checkin_id: checkinId,
          notification_type: 'checkout_reminder',
          scheduled_time: reminderTime.toISOString(),
          title: '⏰ Reminder Checkout',
          body: `Unit ${unitName} akan checkout dalam 30 menit`,
          data: {
            type: 'checkout_reminder',
            checkin_id: checkinId,
            unit_name: unitName
          }
        });

      if (error) {
        throw error;
      }

      console.log('NotificationService: Checkout reminder scheduled for:', reminderTime);
      return { success: true, message: 'Checkout reminder scheduled' };
    } catch (error) {
      console.error('NotificationService: Schedule reminder error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Schedule notification for checkout time
   */
  async scheduleCheckoutNotification(checkinId, checkoutTime, unitName) {
    try {
      // Save scheduled notification to database
      const { error } = await supabase
        .from('scheduled_notifications')
        .insert({
          checkin_id: checkinId,
          notification_type: 'checkout_time',
          scheduled_time: new Date(checkoutTime).toISOString(),
          title: '🏁 Waktu Checkout',
          body: `Unit ${unitName} sudah waktunya checkout`,
          data: {
            type: 'checkout_time',
            checkin_id: checkinId,
            unit_name: unitName
          }
        });

      if (error) {
        throw error;
      }

      console.log('NotificationService: Checkout notification scheduled for:', checkoutTime);
      return { success: true, message: 'Checkout notification scheduled' };
    } catch (error) {
      console.error('NotificationService: Schedule checkout error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Schedule notification for cleaning time
   */
  async scheduleCleaningNotification(checkinId, checkoutTime, unitName) {
    try {
      const cleaningTime = new Date(checkoutTime);
      cleaningTime.setMinutes(cleaningTime.getMinutes() + 15); // 15 minutes after checkout

      // Save scheduled notification to database
      const { error } = await supabase
        .from('scheduled_notifications')
        .insert({
          checkin_id: checkinId,
          notification_type: 'cleaning_time',
          scheduled_time: cleaningTime.toISOString(),
          title: '🧹 Waktu Cleaning',
          body: `Unit ${unitName} sudah siap untuk dibersihkan`,
          data: {
            type: 'cleaning_time',
            checkin_id: checkinId,
            unit_name: unitName
          }
        });

      if (error) {
        throw error;
      }

      console.log('NotificationService: Cleaning notification scheduled for:', cleaningTime);
      return { success: true, message: 'Cleaning notification scheduled' };
    } catch (error) {
      console.error('NotificationService: Schedule cleaning error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get current FCM token
   */
  getCurrentToken() {
    return this.fcmToken;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized() {
    return this.isInitialized;
  }
}

export default new NotificationService();
