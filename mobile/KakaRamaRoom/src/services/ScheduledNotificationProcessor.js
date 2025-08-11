import { supabase } from '../config/supabase';
import NotificationService from './NotificationService';

class ScheduledNotificationProcessor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 60000; // Check every minute
  }

  /**
   * Start the scheduled notification processor
   */
  start() {
    if (this.isRunning) {
      console.log('ScheduledNotificationProcessor: Already running');
      return;
    }

    console.log('ScheduledNotificationProcessor: Starting...');
    this.isRunning = true;
    
    // Run initial check
    this.processScheduledNotifications();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.processScheduledNotifications();
    }, this.checkInterval);
  }

  /**
   * Stop the processor
   */
  stop() {
    if (!this.isRunning) {
      console.log('ScheduledNotificationProcessor: Not running');
      return;
    }

    console.log('ScheduledNotificationProcessor: Stopping...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process all scheduled notifications that are due
   */
  async processScheduledNotifications() {
    try {
      const now = new Date();
      console.log('ScheduledNotificationProcessor: Checking for due notifications at:', now.toISOString());

      // Process scheduled notifications
      await this.processScheduledNotificationsDue(now);

      // Process pending push notifications
      await this.processPendingNotifications();

    } catch (error) {
      console.error('ScheduledNotificationProcessor: Error processing notifications:', error);
    }
  }

  /**
   * Process scheduled notifications that are due
   */
  async processScheduledNotificationsDue(now) {
    try {
      // Get all notifications that are due and not sent yet
      const { data: dueNotifications, error } = await supabase
        .from('scheduled_notifications')
        .select(`
          *,
          checkins (
            id,
            status,
            units (
              unit_number,
              apartments (
                name
              )
            ),
            field_teams (
              id,
              full_name
            )
          )
        `)
        .eq('is_sent', false)
        .lte('scheduled_time', now.toISOString())
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error('ScheduledNotificationProcessor: Error fetching due notifications:', error);
        return;
      }

      if (!dueNotifications || dueNotifications.length === 0) {
        console.log('ScheduledNotificationProcessor: No due notifications found');
        return;
      }

      console.log(`ScheduledNotificationProcessor: Processing ${dueNotifications.length} due notifications`);

      // Process each notification
      for (const notification of dueNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      console.error('ScheduledNotificationProcessor: Error processing scheduled notifications:', error);
    }
  }

  /**
   * Process pending push notifications
   */
  async processPendingNotifications() {
    try {
      // Get pending notifications
      const { data: pendingNotifications, error } = await supabase
        .from('pending_notifications')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_count', 3) // Max 3 retries
        .order('created_at', { ascending: true })
        .limit(50); // Process max 50 at a time

      if (error) {
        console.error('ScheduledNotificationProcessor: Error fetching pending notifications:', error);
        return;
      }

      if (!pendingNotifications || pendingNotifications.length === 0) {
        return; // No pending notifications
      }

      console.log(`ScheduledNotificationProcessor: Processing ${pendingNotifications.length} pending notifications`);

      // Process each pending notification
      for (const notification of pendingNotifications) {
        await this.processPendingNotification(notification);
      }
    } catch (error) {
      console.error('ScheduledNotificationProcessor: Error processing pending notifications:', error);
    }
  }

  /**
   * Process a single pending notification
   */
  async processPendingNotification(notification) {
    try {
      console.log(`ScheduledNotificationProcessor: Processing pending notification ${notification.id}`);

      // For now, just mark as sent since we don't have FCM server key
      // In production, this would send via FCM API
      const { error: updateError } = await supabase
        .from('pending_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      if (updateError) {
        console.error(`ScheduledNotificationProcessor: Error updating pending notification ${notification.id}:`, updateError);

        // Increment retry count
        await supabase
          .from('pending_notifications')
          .update({
            retry_count: notification.retry_count + 1,
            error_message: updateError.message
          })
          .eq('id', notification.id);
      } else {
        console.log(`ScheduledNotificationProcessor: Pending notification ${notification.id} marked as sent`);
      }

    } catch (error) {
      console.error(`ScheduledNotificationProcessor: Error processing pending notification ${notification.id}:`, error);
    }
  }

  /**
   * Process a single notification
   */
  async processNotification(notification) {
    try {
      console.log(`ScheduledNotificationProcessor: Processing notification ${notification.id} of type ${notification.notification_type}`);

      // Check if checkin still exists and is active
      if (!notification.checkins) {
        console.log(`ScheduledNotificationProcessor: Checkin not found for notification ${notification.id}, marking as sent`);
        await this.markNotificationAsSent(notification.id);
        return;
      }

      const checkin = notification.checkins;

      // Skip if checkin is already completed
      if (checkin.status === 'completed' || checkin.status === 'early_checkout') {
        console.log(`ScheduledNotificationProcessor: Checkin ${checkin.id} already completed, skipping notification`);
        await this.markNotificationAsSent(notification.id);
        return;
      }

      // Send notification based on type
      let success = false;
      switch (notification.notification_type) {
        case 'checkout_reminder':
          success = await this.sendCheckoutReminder(notification, checkin);
          break;
        case 'checkout_time':
          success = await this.sendCheckoutNotification(notification, checkin);
          break;
        case 'cleaning_time':
          success = await this.sendCleaningNotification(notification, checkin);
          break;
        case 'unit_available':
          success = await this.sendUnitAvailableNotification(notification, checkin);
          break;
        default:
          console.warn(`ScheduledNotificationProcessor: Unknown notification type: ${notification.notification_type}`);
          success = true; // Mark as sent to avoid reprocessing
      }

      if (success) {
        await this.markNotificationAsSent(notification.id);
      }

    } catch (error) {
      console.error(`ScheduledNotificationProcessor: Error processing notification ${notification.id}:`, error);
    }
  }

  /**
   * Send checkout reminder notification
   */
  async sendCheckoutReminder(notification, checkin) {
    try {
      const unitName = checkin.units ? `${checkin.units.apartments?.name} - ${checkin.units.unit_number}` : `Unit ${checkin.unit_id}`;
      
      // Send to field team if assigned
      if (checkin.team_id && checkin.field_teams) {
        await NotificationService.sendNotificationToUser(
          checkin.team_id,
          notification.title,
          notification.body,
          notification.data
        );
      }

      // Send to all admins
      await NotificationService.sendNotificationToAdmins(
        notification.title,
        notification.body,
        notification.data
      );

      console.log(`ScheduledNotificationProcessor: Checkout reminder sent for checkin ${checkin.id}`);
      return true;
    } catch (error) {
      console.error('ScheduledNotificationProcessor: Error sending checkout reminder:', error);
      return false;
    }
  }

  /**
   * Send checkout time notification
   */
  async sendCheckoutNotification(notification, checkin) {
    try {
      const unitName = checkin.units ? `${checkin.units.apartments?.name} - ${checkin.units.unit_number}` : `Unit ${checkin.unit_id}`;

      console.log(`ScheduledNotificationProcessor: Processing checkout for ${unitName} (checkin ${checkin.id})`);

      // Send to field team if assigned
      if (checkin.team_id && checkin.field_teams) {
        await NotificationService.sendNotificationToUser(
          checkin.team_id,
          notification.title,
          `${notification.body} - ${unitName}`,
          notification.data
        );
      }

      // Send to all admins
      await NotificationService.sendNotificationToAdmins(
        notification.title,
        `${notification.body} - ${unitName}`,
        notification.data
      );

      // Auto-complete checkin when checkout time arrives
      try {
        console.log(`ScheduledNotificationProcessor: Updating checkin ${checkin.id} status to completed`);
        const { error: updateError } = await supabase
          .from('checkins')
          .update({
            status: 'completed',
            actual_checkout_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', checkin.id)
          .eq('status', 'active'); // Only update if still active

        if (updateError) {
          console.error('ScheduledNotificationProcessor: Error updating checkin status:', updateError);
        } else {
          console.log(`ScheduledNotificationProcessor: Checkin ${checkin.id} marked as completed`);
        }

        // Update unit status to cleaning (only if currently occupied)
        console.log(`ScheduledNotificationProcessor: Updating unit ${checkin.unit_id} status to cleaning`);
        const { error: unitError, count } = await supabase
          .from('units')
          .update({
            status: 'cleaning',
            updated_at: new Date().toISOString()
          })
          .eq('id', checkin.unit_id)
          .eq('status', 'occupied'); // Only update if currently occupied

        if (unitError) {
          console.error('ScheduledNotificationProcessor: Error updating unit status:', unitError);
        } else if (count === 0) {
          console.warn(`ScheduledNotificationProcessor: Unit ${checkin.unit_id} was not occupied, status not updated`);
        } else {
          console.log(`ScheduledNotificationProcessor: Unit ${checkin.unit_id} marked as cleaning`);
        }

      } catch (statusError) {
        console.error('ScheduledNotificationProcessor: Error updating statuses:', statusError);
      }

      console.log(`ScheduledNotificationProcessor: Checkout notification sent for checkin ${checkin.id}`);
      return true;
    } catch (error) {
      console.error('ScheduledNotificationProcessor: Error sending checkout notification:', error);
      return false;
    }
  }

  /**
   * Send cleaning time notification
   */
  async sendCleaningNotification(notification, checkin) {
    try {
      const unitName = checkin.units ? `${checkin.units.apartments?.name} - ${checkin.units.unit_number}` : `Unit ${checkin.unit_id}`;

      // Send to all admins (cleaning is usually admin responsibility)
      await NotificationService.sendNotificationToAdmins(
        notification.title,
        `${notification.body} - ${unitName}`,
        notification.data
      );

      // Schedule unit to be available after cleaning (30 minutes from now)
      try {
        const availableTime = new Date();
        availableTime.setMinutes(availableTime.getMinutes() + 30);

        // Schedule unit status update to available
        const { error: scheduleError } = await supabase
          .from('scheduled_notifications')
          .insert({
            checkin_id: checkin.id,
            notification_type: 'unit_available',
            scheduled_time: availableTime.toISOString(),
            title: '✅ Unit Siap',
            body: `Unit ${unitName} sudah selesai cleaning dan siap digunakan`,
            data: {
              type: 'unit_available',
              checkin_id: checkin.id,
              unit_id: checkin.unit_id,
              unit_name: unitName
            }
          });

        if (scheduleError) {
          console.error('ScheduledNotificationProcessor: Error scheduling unit available notification:', scheduleError);
        } else {
          console.log(`ScheduledNotificationProcessor: Unit available notification scheduled for ${availableTime.toISOString()}`);
        }

      } catch (scheduleError) {
        console.error('ScheduledNotificationProcessor: Error scheduling unit available:', scheduleError);
      }

      console.log(`ScheduledNotificationProcessor: Cleaning notification sent for checkin ${checkin.id}`);
      return true;
    } catch (error) {
      console.error('ScheduledNotificationProcessor: Error sending cleaning notification:', error);
      return false;
    }
  }

  /**
   * Send unit available notification and update unit status
   */
  async sendUnitAvailableNotification(notification, checkin) {
    try {
      const unitName = checkin.units ? `${checkin.units.apartments?.name} - ${checkin.units.unit_number}` : `Unit ${checkin.unit_id}`;

      // Update unit status to available
      const { error: unitError } = await supabase
        .from('units')
        .update({
          status: 'available',
          updated_at: new Date().toISOString()
        })
        .eq('id', checkin.unit_id);

      if (unitError) {
        console.error('ScheduledNotificationProcessor: Error updating unit to available:', unitError);
      } else {
        console.log(`ScheduledNotificationProcessor: Unit ${checkin.unit_id} marked as available`);
      }

      // Send notification to admins
      await NotificationService.sendNotificationToAdmins(
        notification.title,
        `${notification.body} - ${unitName}`,
        notification.data
      );

      console.log(`ScheduledNotificationProcessor: Unit available notification sent for unit ${checkin.unit_id}`);
      return true;
    } catch (error) {
      console.error('ScheduledNotificationProcessor: Error sending unit available notification:', error);
      return false;
    }
  }

  /**
   * Mark notification as sent
   */
  async markNotificationAsSent(notificationId) {
    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error(`ScheduledNotificationProcessor: Error marking notification ${notificationId} as sent:`, error);
      } else {
        console.log(`ScheduledNotificationProcessor: Notification ${notificationId} marked as sent`);
      }
    } catch (error) {
      console.error(`ScheduledNotificationProcessor: Error updating notification ${notificationId}:`, error);
    }
  }

  /**
   * Get processor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null
    };
  }

  /**
   * Manually trigger notification processing (for testing)
   */
  async triggerManualCheck() {
    console.log('ScheduledNotificationProcessor: Manual check triggered');
    await this.processScheduledNotifications();
  }
}

export default new ScheduledNotificationProcessor();
