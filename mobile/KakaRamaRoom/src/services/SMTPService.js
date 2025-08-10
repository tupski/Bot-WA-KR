import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

/**
 * Service untuk mengelola konfigurasi SMTP dan pengiriman email
 */
class SMTPService {
  constructor() {
    this.STORAGE_KEY = 'smtp_settings';
  }

  /**
   * Get SMTP settings from storage
   * @returns {Promise<Object>}
   */
  async getSMTPSettings() {
    try {
      const settings = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (settings) {
        return {
          success: true,
          data: JSON.parse(settings),
        };
      }
      
      return {
        success: true,
        data: {
          smtp: {
            host: '',
            port: '587',
            secure: false,
            username: '',
            password: '',
            fromEmail: '',
            fromName: 'KakaRama Room System',
          },
          report: {
            enabled: false,
            recipients: '',
            sendTime: '12:00',
            includeStats: true,
            includeCheckins: true,
            includeUnits: true,
          },
        },
      };
    } catch (error) {
      console.error('Error getting SMTP settings:', error);
      return {
        success: false,
        message: 'Gagal mengambil pengaturan SMTP',
      };
    }
  }

  /**
   * Save SMTP settings to storage
   * @param {Object} settings - SMTP settings
   * @returns {Promise<Object>}
   */
  async saveSMTPSettings(settings) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      
      // Also save to Supabase for backup and server access
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'smtp_config',
          value: settings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('Failed to save SMTP settings to Supabase:', error);
        // Don't fail the operation, local storage is primary
      }

      return {
        success: true,
        message: 'Pengaturan SMTP berhasil disimpan',
      };
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      return {
        success: false,
        message: 'Gagal menyimpan pengaturan SMTP',
      };
    }
  }

  /**
   * Test SMTP connection by sending a test email
   * @param {Object} smtpConfig - SMTP configuration
   * @param {string} testEmail - Test email recipient
   * @returns {Promise<Object>}
   */
  async testSMTPConnection(smtpConfig, testEmail) {
    try {
      console.log('SMTPService: Testing SMTP connection with config:', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        username: smtpConfig.username,
        fromEmail: smtpConfig.fromEmail,
        testEmail,
      });

      // Validate SMTP config
      if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password || !smtpConfig.fromEmail) {
        return {
          success: false,
          message: 'Konfigurasi SMTP tidak lengkap. Pastikan Host, Username, Password, dan From Email sudah diisi.',
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        return {
          success: false,
          message: 'Format email tujuan tidak valid',
        };
      }

      if (!emailRegex.test(smtpConfig.fromEmail)) {
        return {
          success: false,
          message: 'Format From Email tidak valid',
        };
      }

      // Prepare test email data
      const testEmailData = {
        smtp: {
          host: smtpConfig.host,
          port: parseInt(smtpConfig.port) || 587,
          secure: smtpConfig.secure || false,
          auth: {
            user: smtpConfig.username,
            pass: smtpConfig.password,
          },
        },
        from: {
          email: smtpConfig.fromEmail,
          name: smtpConfig.fromName || 'KakaRama Room System',
        },
        to: testEmail,
        subject: 'Test Email - KakaRama Room System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2196F3;">Test Email Berhasil!</h2>
            <p>Ini adalah email test dari sistem KakaRama Room.</p>
            <p><strong>Konfigurasi SMTP:</strong></p>
            <ul>
              <li>Host: ${smtpConfig.host}</li>
              <li>Port: ${smtpConfig.port}</li>
              <li>Username: ${smtpConfig.username}</li>
              <li>From Email: ${smtpConfig.fromEmail}</li>
            </ul>
            <p>Jika Anda menerima email ini, berarti konfigurasi SMTP sudah benar.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Email ini dikirim pada: ${new Date().toLocaleString('id-ID')}
            </p>
          </div>
        `,
      };

      // Try to call backend API for sending email
      try {
        // Check if we have a backend endpoint
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        console.log('SMTPService: Attempting to send test email via backend API');

        const response = await fetch(`${backendUrl}/api/smtp/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testEmailData),
          timeout: 30000, // 30 second timeout
        });

        if (response.ok) {
          const result = await response.json();
          console.log('SMTPService: Backend API response:', result);

          if (result.success) {
            return {
              success: true,
              message: 'Test email berhasil dikirim! Silakan cek inbox email tujuan.',
            };
          } else {
            return {
              success: false,
              message: result.message || 'Gagal mengirim test email melalui backend',
            };
          }
        } else {
          console.warn('SMTPService: Backend API not available, response status:', response.status);
          throw new Error(`Backend API error: ${response.status}`);
        }
      } catch (apiError) {
        console.warn('SMTPService: Backend API not available:', apiError.message);

        // Fallback: Save config and show informative message
        await this.saveSMTPSettings({ smtp: smtpConfig });

        return {
          success: true,
          message: 'Konfigurasi SMTP telah disimpan. Untuk test email yang sebenarnya, pastikan backend server sudah berjalan dan dapat diakses.',
        };
      }
    } catch (error) {
      console.error('SMTPService: Error testing SMTP:', error);
      return {
        success: false,
        message: `Gagal melakukan test SMTP: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate daily report data
   * @param {Object} reportConfig - Report configuration
   * @returns {Promise<Object>}
   */
  async generateDailyReport(reportConfig) {
    try {
      const businessDay = this.getBusinessDayRange();
      const reportData = {
        date: new Date().toLocaleDateString('id-ID'),
        businessDay: {
          start: businessDay.start,
          end: businessDay.end,
        },
        stats: {},
        checkins: [],
        units: [],
      };

      // Get statistics if enabled
      if (reportConfig.includeStats) {
        reportData.stats = await this.getDailyStats(businessDay);
      }

      // Get checkins if enabled
      if (reportConfig.includeCheckins) {
        reportData.checkins = await this.getDailyCheckins(businessDay);
      }

      // Get unit status if enabled
      if (reportConfig.includeUnits) {
        reportData.units = await this.getUnitStatus();
      }

      return {
        success: true,
        data: reportData,
      };
    } catch (error) {
      console.error('Error generating daily report:', error);
      return {
        success: false,
        message: 'Gagal membuat laporan harian',
      };
    }
  }

  /**
   * Get business day range (12:00 today to 11:59 tomorrow)
   */
  getBusinessDayRange() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Business day starts at 12:00 today
    const startTime = new Date(today);
    startTime.setHours(12, 0, 0, 0);
    
    // Business day ends at 11:59 tomorrow
    const endTime = new Date(today);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(11, 59, 59, 999);
    
    // If current time is before 12:00, use previous business day
    if (now.getHours() < 12) {
      startTime.setDate(startTime.getDate() - 1);
      endTime.setDate(endTime.getDate() - 1);
    }
    
    return {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
    };
  }

  /**
   * Get daily statistics
   * @param {Object} businessDay - Business day range
   * @returns {Promise<Object>}
   */
  async getDailyStats(businessDay) {
    try {
      // Get checkins in business day range
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select('*')
        .gte('created_at', businessDay.start)
        .lte('created_at', businessDay.end);

      if (error) throw error;

      // Calculate statistics
      const totalCheckins = checkins.length;
      const totalRevenue = checkins.reduce((sum, checkin) => sum + (checkin.payment_amount || 0), 0);
      const totalCommission = checkins.reduce((sum, checkin) => sum + (checkin.marketing_commission || 0), 0);
      
      const paymentMethods = {};
      const marketingSources = {};
      
      checkins.forEach(checkin => {
        // Count payment methods
        const method = checkin.payment_method || 'Unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        
        // Count marketing sources
        const marketing = checkin.marketing_name || 'Unknown';
        marketingSources[marketing] = (marketingSources[marketing] || 0) + 1;
      });

      return {
        totalCheckins,
        totalRevenue,
        totalCommission,
        paymentMethods,
        marketingSources,
      };
    } catch (error) {
      console.error('Error getting daily stats:', error);
      return {};
    }
  }

  /**
   * Get daily checkins
   * @param {Object} businessDay - Business day range
   * @returns {Promise<Array>}
   */
  async getDailyCheckins(businessDay) {
    try {
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select(`
          *,
          apartments (name),
          units (unit_number),
          field_teams (full_name)
        `)
        .gte('created_at', businessDay.start)
        .lte('created_at', businessDay.end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return checkins || [];
    } catch (error) {
      console.error('Error getting daily checkins:', error);
      return [];
    }
  }

  /**
   * Get current unit status
   * @returns {Promise<Array>}
   */
  async getUnitStatus() {
    try {
      const { data: units, error } = await supabase
        .from('units')
        .select(`
          *,
          apartments (name)
        `)
        .order('apartment_id', { ascending: true })
        .order('unit_number', { ascending: true });

      if (error) throw error;

      return units || [];
    } catch (error) {
      console.error('Error getting unit status:', error);
      return [];
    }
  }

  /**
   * Send daily report email
   * @param {Object} reportData - Report data
   * @param {Array} recipients - Email recipients
   * @returns {Promise<Object>}
   */
  async sendDailyReport(reportData, recipients) {
    try {
      console.log('SMTPService: Sending daily report to:', recipients);
      console.log('SMTPService: Report data summary:', {
        date: reportData.date,
        totalCheckins: reportData.stats?.totalCheckins,
        totalRevenue: reportData.stats?.totalRevenue,
      });

      // Get SMTP settings
      const settingsResult = await this.getSMTPSettings();
      if (!settingsResult.success) {
        return {
          success: false,
          message: 'Gagal mengambil pengaturan SMTP',
        };
      }

      const smtpConfig = settingsResult.data.smtp;

      // Validate SMTP config
      if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password || !smtpConfig.fromEmail) {
        return {
          success: false,
          message: 'Konfigurasi SMTP tidak lengkap',
        };
      }

      // Prepare email data
      const emailData = {
        smtp: {
          host: smtpConfig.host,
          port: parseInt(smtpConfig.port) || 587,
          secure: smtpConfig.secure || false,
          auth: {
            user: smtpConfig.username,
            pass: smtpConfig.password,
          },
        },
        from: {
          email: smtpConfig.fromEmail,
          name: smtpConfig.fromName || 'KakaRama Room System',
        },
        to: recipients,
        subject: `Laporan Harian KakaRama Room - ${reportData.date}`,
        html: this.formatDailyReportHTML(reportData),
      };

      // Try to call backend API for sending email
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        console.log('SMTPService: Attempting to send daily report via backend API');

        const response = await fetch(`${backendUrl}/api/smtp/send-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
          timeout: 60000, // 60 second timeout for reports
        });

        if (response.ok) {
          const result = await response.json();
          console.log('SMTPService: Daily report sent successfully:', result);

          return {
            success: true,
            message: 'Laporan harian berhasil dikirim',
          };
        } else {
          console.error('SMTPService: Backend API error:', response.status);
          throw new Error(`Backend API error: ${response.status}`);
        }
      } catch (apiError) {
        console.warn('SMTPService: Backend API not available for daily report:', apiError.message);

        return {
          success: false,
          message: 'Backend server tidak tersedia untuk mengirim email. Pastikan server backend sudah berjalan.',
        };
      }
    } catch (error) {
      console.error('SMTPService: Error sending daily report:', error);
      return {
        success: false,
        message: `Gagal mengirim laporan harian: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Format daily report data to HTML
   * @param {Object} reportData - Report data
   * @returns {string}
   */
  formatDailyReportHTML(reportData) {
    const { date, stats, checkins, units } = reportData;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #2196F3; text-align: center;">Laporan Harian KakaRama Room</h1>
        <h2 style="color: #666; text-align: center;">${date}</h2>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Ringkasan Statistik</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Checkin:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${stats?.totalCheckins || 0}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Checkin Aktif:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${stats?.activeCheckins || 0}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Pendapatan:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Rp ${(stats?.totalRevenue || 0).toLocaleString('id-ID')}</td>
            </tr>
          </table>
        </div>

        ${checkins && checkins.length > 0 ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Daftar Checkin</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Unit</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Customer</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Checkin</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${checkins.map(checkin => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${checkin.unit_number || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${checkin.customer_name || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${new Date(checkin.checkin_time).toLocaleString('id-ID')}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${checkin.status || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Laporan ini dibuat secara otomatis pada: ${new Date().toLocaleString('id-ID')}
        </p>
      </div>
    `;
  }
}

export default new SMTPService();
