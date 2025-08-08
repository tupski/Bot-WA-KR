import BackgroundJob from '@react-native-async-storage/async-storage';
import SMTPService from './SMTPService';

/**
 * Service untuk mengelola laporan email otomatis
 * Note: Untuk implementasi production, ini memerlukan backend service
 * yang berjalan di server untuk mengirim email secara terjadwal
 */
class EmailReportService {
  constructor() {
    this.isScheduled = false;
    this.intervalId = null;
  }

  /**
   * Start email report scheduler
   * Note: Ini hanya simulasi untuk mobile app
   * Implementasi sebenarnya harus di backend/server
   */
  async startScheduler() {
    try {
      const settings = await SMTPService.getSMTPSettings();
      if (!settings.success || !settings.data.report.enabled) {
        console.log('Email report scheduler not enabled');
        return;
      }

      const reportConfig = settings.data.report;
      
      // Calculate next send time
      const nextSendTime = this.calculateNextSendTime(reportConfig.sendTime);
      console.log('Next email report scheduled for:', nextSendTime);

      // Set interval to check every minute
      this.intervalId = setInterval(() => {
        this.checkAndSendReport();
      }, 60000); // Check every minute

      this.isScheduled = true;
      console.log('Email report scheduler started');
    } catch (error) {
      console.error('Error starting email report scheduler:', error);
    }
  }

  /**
   * Stop email report scheduler
   */
  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isScheduled = false;
    console.log('Email report scheduler stopped');
  }

  /**
   * Calculate next send time based on configured time
   * @param {string} sendTime - Time in HH:MM format
   * @returns {Date}
   */
  calculateNextSendTime(sendTime) {
    const [hours, minutes] = sendTime.split(':').map(Number);
    const now = new Date();
    const nextSend = new Date();
    
    nextSend.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (nextSend <= now) {
      nextSend.setDate(nextSend.getDate() + 1);
    }
    
    return nextSend;
  }

  /**
   * Check if it's time to send report and send if needed
   */
  async checkAndSendReport() {
    try {
      const settings = await SMTPService.getSMTPSettings();
      if (!settings.success || !settings.data.report.enabled) {
        return;
      }

      const reportConfig = settings.data.report;
      const now = new Date();
      const [targetHours, targetMinutes] = reportConfig.sendTime.split(':').map(Number);
      
      // Check if current time matches target time (within 1 minute window)
      if (now.getHours() === targetHours && now.getMinutes() === targetMinutes) {
        await this.sendDailyReport(reportConfig);
      }
    } catch (error) {
      console.error('Error checking and sending report:', error);
    }
  }

  /**
   * Send daily report email
   * @param {Object} reportConfig - Report configuration
   */
  async sendDailyReport(reportConfig) {
    try {
      console.log('Generating and sending daily report...');
      
      // Generate report data
      const reportResult = await SMTPService.generateDailyReport(reportConfig);
      if (!reportResult.success) {
        console.error('Failed to generate report:', reportResult.message);
        return;
      }

      // Parse recipients
      const recipients = reportConfig.recipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      if (recipients.length === 0) {
        console.error('No recipients configured for daily report');
        return;
      }

      // Send report
      const sendResult = await SMTPService.sendDailyReport(reportResult.data, recipients);
      if (sendResult.success) {
        console.log('Daily report sent successfully to:', recipients);
        
        // Log the activity
        await this.logReportActivity(recipients, reportResult.data);
      } else {
        console.error('Failed to send daily report:', sendResult.message);
      }
    } catch (error) {
      console.error('Error sending daily report:', error);
    }
  }

  /**
   * Log report activity for tracking
   * @param {Array} recipients - Email recipients
   * @param {Object} reportData - Report data
   */
  async logReportActivity(recipients, reportData) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'daily_report',
        recipients: recipients,
        stats: reportData.stats,
        status: 'sent',
      };

      // Store in AsyncStorage for local tracking
      const existingLogs = await BackgroundJob.getItem('email_report_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(logEntry);
      
      // Keep only last 30 days of logs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const filteredLogs = logs.filter(log => 
        new Date(log.timestamp) > thirtyDaysAgo
      );

      await BackgroundJob.setItem('email_report_logs', JSON.stringify(filteredLogs));
    } catch (error) {
      console.error('Error logging report activity:', error);
    }
  }

  /**
   * Get email report logs
   * @returns {Promise<Array>}
   */
  async getReportLogs() {
    try {
      const logs = await BackgroundJob.getItem('email_report_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error getting report logs:', error);
      return [];
    }
  }

  /**
   * Send test daily report immediately
   * @param {string} testEmail - Test email recipient
   * @returns {Promise<Object>}
   */
  async sendTestReport(testEmail) {
    try {
      const settings = await SMTPService.getSMTPSettings();
      if (!settings.success) {
        return {
          success: false,
          message: 'Gagal mengambil pengaturan SMTP',
        };
      }

      const reportConfig = settings.data.report;
      
      // Generate report data
      const reportResult = await SMTPService.generateDailyReport(reportConfig);
      if (!reportResult.success) {
        return {
          success: false,
          message: 'Gagal membuat laporan',
        };
      }

      // Send test report
      const sendResult = await SMTPService.sendDailyReport(reportResult.data, [testEmail]);
      return sendResult;
    } catch (error) {
      console.error('Error sending test report:', error);
      return {
        success: false,
        message: 'Gagal mengirim test laporan',
      };
    }
  }

  /**
   * Get scheduler status
   * @returns {Object}
   */
  getStatus() {
    return {
      isScheduled: this.isScheduled,
      intervalId: this.intervalId,
    };
  }

  /**
   * Format report data to HTML email template
   * @param {Object} reportData - Report data
   * @returns {string}
   */
  formatReportHTML(reportData) {
    const { date, stats, checkins, units } = reportData;
    
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #1976D2; color: white; padding: 20px; text-align: center; }
            .section { margin: 20px 0; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-card { background-color: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laporan Harian KakaRama Room</h1>
            <p>Tanggal: ${date}</p>
          </div>
    `;

    if (stats && Object.keys(stats).length > 0) {
      html += `
        <div class="section">
          <h2>Statistik Harian</h2>
          <div class="stats">
            <div class="stat-card">
              <h3>${stats.totalCheckins || 0}</h3>
              <p>Total Check-in</p>
            </div>
            <div class="stat-card">
              <h3>Rp ${(stats.totalRevenue || 0).toLocaleString('id-ID')}</h3>
              <p>Total Pendapatan</p>
            </div>
            <div class="stat-card">
              <h3>Rp ${(stats.totalCommission || 0).toLocaleString('id-ID')}</h3>
              <p>Total Komisi</p>
            </div>
          </div>
        </div>
      `;
    }

    if (checkins && checkins.length > 0) {
      html += `
        <div class="section">
          <h2>Daftar Check-in Hari Ini</h2>
          <table>
            <tr>
              <th>Waktu</th>
              <th>Apartemen</th>
              <th>Unit</th>
              <th>Durasi</th>
              <th>Pembayaran</th>
              <th>Marketing</th>
            </tr>
      `;
      
      checkins.forEach(checkin => {
        html += `
          <tr>
            <td>${new Date(checkin.checkin_time).toLocaleString('id-ID')}</td>
            <td>${checkin.apartments?.name || '-'}</td>
            <td>${checkin.units?.unit_number || '-'}</td>
            <td>${checkin.duration_hours} jam</td>
            <td>Rp ${(checkin.payment_amount || 0).toLocaleString('id-ID')}</td>
            <td>${checkin.marketing_name || '-'}</td>
          </tr>
        `;
      });
      
      html += `
          </table>
        </div>
      `;
    }

    html += `
        </body>
      </html>
    `;

    return html;
  }
}

export default new EmailReportService();
