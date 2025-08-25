import { supabase } from '../config/supabase';
import NotificationService from './NotificationService';

class AutoNotificationService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 60000; // Check every minute
  }

  /**
   * Start auto notification service
   */
  start() {
    if (this.isRunning) {
      console.log('AutoNotificationService: Already running');
      return;
    }

    console.log('AutoNotificationService: Starting...');
    this.isRunning = true;
    
    // Run initial check
    this.checkNotifications();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkNotifications();
    }, this.checkInterval);
  }

  /**
   * Stop auto notification service
   */
  stop() {
    if (!this.isRunning) {
      console.log('AutoNotificationService: Not running');
      return;
    }

    console.log('AutoNotificationService: Stopping...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for notifications that need to be sent
   */
  async checkNotifications() {
    try {
      console.log('AutoNotificationService: Checking notifications...');
      
      await Promise.all([
        this.checkCheckoutReminders(),
        this.checkOverdueCheckouts(),
      ]);
      
    } catch (error) {
      console.error('AutoNotificationService: Error checking notifications:', error);
    }
  }

  /**
   * Check for checkins that need 30-minute reminder
   */
  async checkCheckoutReminders() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      // Get active checkins that will checkout in 30 minutes
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select(`
          *,
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
        `)
        .eq('status', 'active')
        .lte('checkout_time', reminderTime.toISOString())
        .gte('checkout_time', now.toISOString())
        .is('reminder_30min_sent', null);

      if (error) {
        console.error('AutoNotificationService: Error fetching checkout reminders:', error);
        return;
      }

      if (!checkins || checkins.length === 0) {
        console.log('AutoNotificationService: No checkout reminders to send');
        return;
      }

      console.log(`AutoNotificationService: Found ${checkins.length} checkout reminders to send`);

      for (const checkin of checkins) {
        await this.sendCheckoutReminder(checkin);
      }

    } catch (error) {
      console.error('AutoNotificationService: Error in checkCheckoutReminders:', error);
    }
  }

  /**
   * Check for overdue checkouts
   */
  async checkOverdueCheckouts() {
    try {
      const now = new Date();
      
      // Get checkins that are overdue
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select(`
          *,
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
        `)
        .eq('status', 'active')
        .lt('checkout_time', now.toISOString())
        .is('overdue_notification_sent', null);

      if (error) {
        console.error('AutoNotificationService: Error fetching overdue checkouts:', error);
        return;
      }

      if (!checkins || checkins.length === 0) {
        console.log('AutoNotificationService: No overdue checkouts to notify');
        return;
      }

      console.log(`AutoNotificationService: Found ${checkins.length} overdue checkouts to notify`);

      for (const checkin of checkins) {
        await this.sendOverdueNotification(checkin);
      }

    } catch (error) {
      console.error('AutoNotificationService: Error in checkOverdueCheckouts:', error);
    }
  }

  /**
   * Send 30-minute checkout reminder
   */
  async sendCheckoutReminder(checkin) {
    try {
      const unitNumber = checkin.units?.unit_number || 'Unknown';
      const apartmentName = checkin.units?.apartments?.name || 'Unknown';
      const checkoutTime = new Date(checkin.checkout_time);
      
      const title = 'Reminder Checkout';
      const message = `Unit ${unitNumber} (${apartmentName}) akan checkout dalam 30 menit pada ${checkoutTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

      // Send notification to assigned field team
      if (checkin.team_id) {
        await this.sendNotificationToFieldTeam(
          checkin.team_id,
          title,
          message,
          {
            type: 'checkin_reminder',
            checkin_id: checkin.id,
            unit_id: checkin.unit_id,
          }
        );
      }

      // Send notification to all admins
      await this.sendNotificationToAdmins(
        title,
        message,
        {
          type: 'checkin_reminder',
          checkin_id: checkin.id,
          unit_id: checkin.unit_id,
        }
      );

      // Mark reminder as sent
      await supabase
        .from('checkins')
        .update({ reminder_30min_sent: new Date().toISOString() })
        .eq('id', checkin.id);

      console.log(`AutoNotificationService: Sent checkout reminder for checkin ${checkin.id}`);

    } catch (error) {
      console.error('AutoNotificationService: Error sending checkout reminder:', error);
    }
  }

  /**
   * Send overdue checkout notification
   */
  async sendOverdueNotification(checkin) {
    try {
      const unitNumber = checkin.units?.unit_number || 'Unknown';
      const apartmentName = checkin.units?.apartments?.name || 'Unknown';
      const checkoutTime = new Date(checkin.checkout_time);
      const overdueMins = Math.floor((new Date() - checkoutTime) / 60000);
      
      const title = 'Checkout Terlambat';
      const message = `Unit ${unitNumber} (${apartmentName}) sudah terlambat checkout ${overdueMins} menit. Harap segera lakukan checkout.`;

      // Send notification to assigned field team
      if (checkin.team_id) {
        await this.sendNotificationToFieldTeam(
          checkin.team_id,
          title,
          message,
          {
            type: 'checkout_overdue',
            checkin_id: checkin.id,
            unit_id: checkin.unit_id,
            overdue_minutes: overdueMins,
          }
        );
      }

      // Send notification to all admins
      await this.sendNotificationToAdmins(
        title,
        message,
        {
          type: 'checkout_overdue',
          checkin_id: checkin.id,
          unit_id: checkin.unit_id,
          overdue_minutes: overdueMins,
        }
      );

      // Mark overdue notification as sent
      await supabase
        .from('checkins')
        .update({ overdue_notification_sent: new Date().toISOString() })
        .eq('id', checkin.id);

      console.log(`AutoNotificationService: Sent overdue notification for checkin ${checkin.id}`);

    } catch (error) {
      console.error('AutoNotificationService: Error sending overdue notification:', error);
    }
  }

  /**
   * Send notification to specific field team
   */
  async sendNotificationToFieldTeam(teamId, title, message, data = {}) {
    try {
      // Save notification to database for the field team
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: teamId,
          user_type: 'field_team',
          title,
          body: message,
          data,
          is_read: false,
          created_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('AutoNotificationService: Error saving field team notification:', error);
      }

    } catch (error) {
      console.error('AutoNotificationService: Error in sendNotificationToFieldTeam:', error);
    }
  }

  /**
   * Send notification to all admins
   */
  async sendNotificationToAdmins(title, message, data = {}) {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'active');

      if (error) {
        console.error('AutoNotificationService: Error fetching admins:', error);
        return;
      }

      if (!admins || admins.length === 0) {
        console.log('AutoNotificationService: No active admins found');
        return;
      }

      // Send notification to each admin
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        user_type: 'admin',
        title,
        body: message,
        data,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error('AutoNotificationService: Error saving admin notifications:', insertError);
      }

    } catch (error) {
      console.error('AutoNotificationService: Error in sendNotificationToAdmins:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
    };
  }
}

export default new AutoNotificationService();
