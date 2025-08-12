/**
 * Test Notification Utility
 * Helper functions untuk testing push notification
 */

import NotificationService from '../services/NotificationService';
import { supabase } from '../config/supabase';
import AuthService from '../services/AuthService';

class TestNotification {
  /**
   * Test FCM token generation
   */
  static async testFCMToken() {
    try {
      console.log('=== Testing FCM Token Generation ===');
      
      const isInitialized = await NotificationService.initialize();
      if (!isInitialized) {
        console.error('❌ NotificationService initialization failed');
        return false;
      }

      const token = NotificationService.getCurrentToken();
      if (!token) {
        console.error('❌ FCM token not generated');
        return false;
      }

      console.log('✅ FCM Token generated:', token.substring(0, 20) + '...');
      
      // Check if token is saved to database
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        const { data: tokenData, error } = await supabase
          .from('user_fcm_tokens')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (error || !tokenData) {
          console.error('❌ FCM token not saved to database:', error);
          return false;
        }

        console.log('✅ FCM token saved to database');
      }

      return true;
    } catch (error) {
      console.error('❌ FCM token test failed:', error);
      return false;
    }
  }

  /**
   * Test manual push notification via Edge Function
   */
  static async testManualPushNotification() {
    try {
      console.log('=== Testing Manual Push Notification ===');
      
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        console.error('❌ No authenticated user');
        return false;
      }

      const result = await NotificationService.sendNotificationToUser(
        currentUser.id,
        '🧪 Test Manual Push',
        'Testing manual push notification dari TestNotification utility',
        {
          type: 'test_manual',
          timestamp: new Date().toISOString()
        }
      );

      if (result.success) {
        console.log('✅ Manual push notification sent successfully');
        return true;
      } else {
        console.error('❌ Manual push notification failed:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Manual push notification test failed:', error);
      return false;
    }
  }

  /**
   * Test admin broadcast notification
   */
  static async testAdminBroadcast() {
    try {
      console.log('=== Testing Admin Broadcast ===');
      
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        console.error('❌ Admin access required');
        return false;
      }

      const result = await NotificationService.sendBroadcastNotification(
        '📢 Test Broadcast',
        'Testing broadcast notification dari TestNotification utility',
        'all'
      );

      if (result.success) {
        console.log('✅ Admin broadcast sent successfully:', result.message);
        return true;
      } else {
        console.error('❌ Admin broadcast failed:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Admin broadcast test failed:', error);
      return false;
    }
  }

  /**
   * Test scheduled notification creation
   */
  static async testScheduledNotification() {
    try {
      console.log('=== Testing Scheduled Notification ===');
      
      // Create a test scheduled notification for 1 minute from now
      const testTime = new Date();
      testTime.setMinutes(testTime.getMinutes() + 1);

      const result = await NotificationService.scheduleCheckoutReminder(
        'test-checkin-id',
        testTime.toISOString(),
        'Test Unit'
      );

      if (result.success) {
        console.log('✅ Scheduled notification created successfully');
        
        // Check if it's saved to database
        const { data: scheduledData, error } = await supabase
          .from('scheduled_notifications')
          .select('*')
          .eq('checkin_id', 'test-checkin-id')
          .single();

        if (error || !scheduledData) {
          console.error('❌ Scheduled notification not saved to database:', error);
          return false;
        }

        console.log('✅ Scheduled notification saved to database');
        
        // Clean up test data
        await supabase
          .from('scheduled_notifications')
          .delete()
          .eq('checkin_id', 'test-checkin-id');

        return true;
      } else {
        console.error('❌ Scheduled notification failed:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Scheduled notification test failed:', error);
      return false;
    }
  }

  /**
   * Test notification processor status
   */
  static async testNotificationProcessor() {
    try {
      console.log('=== Testing Notification Processor ===');
      
      // Check if ScheduledNotificationProcessor is running
      if (global.scheduledNotificationProcessor) {
        const status = global.scheduledNotificationProcessor.getStatus();
        console.log('✅ Notification processor status:', status);
        return status.isRunning;
      } else {
        console.error('❌ Notification processor not found');
        return false;
      }
    } catch (error) {
      console.error('❌ Notification processor test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests() {
    console.log('🧪 Starting Push Notification Tests...\n');
    
    const results = {
      fcmToken: await this.testFCMToken(),
      manualPush: await this.testManualPushNotification(),
      adminBroadcast: await this.testAdminBroadcast(),
      scheduledNotification: await this.testScheduledNotification(),
      notificationProcessor: await this.testNotificationProcessor(),
    };

    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! Push notification system is ready.');
    } else {
      console.log('⚠️  Some tests failed. Please check the logs above.');
    }

    return results;
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats() {
    try {
      console.log('📊 Getting Notification Statistics...');
      
      // Get FCM tokens count
      const { count: fcmTokensCount } = await supabase
        .from('user_fcm_tokens')
        .select('*', { count: 'exact', head: true });

      // Get notification logs count
      const { count: notificationLogsCount } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true });

      // Get scheduled notifications count
      const { count: scheduledCount } = await supabase
        .from('scheduled_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_sent', false);

      // Get pending notifications count
      const { count: pendingCount } = await supabase
        .from('pending_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const stats = {
        activeFCMTokens: fcmTokensCount || 0,
        totalNotificationsSent: notificationLogsCount || 0,
        scheduledNotifications: scheduledCount || 0,
        pendingNotifications: pendingCount || 0,
      };

      console.log('📈 Notification Statistics:');
      console.log('===========================');
      console.log(`Active FCM Tokens: ${stats.activeFCMTokens}`);
      console.log(`Total Notifications Sent: ${stats.totalNotificationsSent}`);
      console.log(`Scheduled Notifications: ${stats.scheduledNotifications}`);
      console.log(`Pending Notifications: ${stats.pendingNotifications}`);

      return stats;
    } catch (error) {
      console.error('❌ Error getting notification stats:', error);
      return null;
    }
  }
}

export default TestNotification;
