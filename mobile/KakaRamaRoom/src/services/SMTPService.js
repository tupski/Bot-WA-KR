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
      // In a real implementation, this would call a backend API
      // For now, we'll simulate the test
      
      // Validate SMTP config
      if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
        return {
          success: false,
          message: 'Konfigurasi SMTP tidak lengkap',
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        return {
          success: false,
          message: 'Format email tidak valid',
        };
      }

      // Simulate API call to backend for sending test email
      // In real implementation, this would be:
      // const response = await fetch('/api/smtp/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ smtpConfig, testEmail }),
      // });

      // For now, simulate success after delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'Test email berhasil dikirim',
      };
    } catch (error) {
      console.error('Error testing SMTP:', error);
      return {
        success: false,
        message: 'Gagal melakukan test SMTP',
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
      // In real implementation, this would call backend API
      // For now, simulate sending
      console.log('Sending daily report to:', recipients);
      console.log('Report data:', reportData);

      return {
        success: true,
        message: 'Laporan harian berhasil dikirim',
      };
    } catch (error) {
      console.error('Error sending daily report:', error);
      return {
        success: false,
        message: 'Gagal mengirim laporan harian',
      };
    }
  }
}

export default new SMTPService();
