import { supabase } from '../config/supabase';

class BusinessDayService {
  /**
   * Get business day range (12:00 WIB hari ini sampai 11:59 WIB hari berikutnya)
   * @param {Date} date - Tanggal referensi (default: hari ini)
   * @returns {Object} - Start dan end time untuk business day
   */
  getBusinessDayRange(date = new Date()) {
    // Set timezone ke WIB (UTC+7)
    const wibOffset = 7 * 60; // 7 hours in minutes
    const localOffset = date.getTimezoneOffset();
    const wibTime = new Date(date.getTime() + (wibOffset + localOffset) * 60 * 1000);
    
    // Business day start: 12:00 WIB hari ini
    const startTime = new Date(wibTime);
    startTime.setHours(12, 0, 0, 0);
    
    // Business day end: 11:59:59 WIB hari berikutnya
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(11, 59, 59, 999);
    
    // Convert back to UTC for database
    const startUTC = new Date(startTime.getTime() - wibOffset * 60 * 1000);
    const endUTC = new Date(endTime.getTime() - wibOffset * 60 * 1000);
    
    return {
      start: startUTC.toISOString(),
      end: endUTC.toISOString(),
      startWIB: startTime.toISOString(),
      endWIB: endTime.toISOString(),
      businessDate: this.formatBusinessDate(wibTime),
    };
  }

  /**
   * Get business day range untuk tanggal tertentu
   * @param {string} dateString - Tanggal dalam format YYYY-MM-DD
   * @returns {Object} - Start dan end time untuk business day
   */
  getBusinessDayRangeForDate(dateString) {
    const date = new Date(dateString + 'T00:00:00.000Z');
    return this.getBusinessDayRange(date);
  }

  /**
   * Get current business day range
   * @returns {Object} - Start dan end time untuk business day saat ini
   */
  getCurrentBusinessDayRange() {
    return this.getBusinessDayRange();
  }

  /**
   * Get previous business day range
   * @returns {Object} - Start dan end time untuk business day kemarin
   */
  getPreviousBusinessDayRange() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.getBusinessDayRange(yesterday);
  }

  /**
   * Format business date untuk display
   * @param {Date} date - Tanggal
   * @returns {string} - Formatted date string
   */
  formatBusinessDate(date) {
    return date.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Check apakah waktu tertentu masuk dalam business day range
   * @param {string} timestamp - ISO timestamp
   * @param {Object} businessDayRange - Business day range object
   * @returns {boolean}
   */
  isInBusinessDayRange(timestamp, businessDayRange) {
    const time = new Date(timestamp);
    const start = new Date(businessDayRange.start);
    const end = new Date(businessDayRange.end);
    
    return time >= start && time <= end;
  }

  /**
   * Get checkins dalam business day range
   * @param {Object} businessDayRange - Business day range
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async getCheckinsInBusinessDay(businessDayRange, filters = {}) {
    try {
      let query = supabase
        .from('checkins')
        .select(`
          *,
          apartments (
            name,
            code
          ),
          units (
            unit_number
          ),
          field_teams (
            full_name
          )
        `)
        .gte('created_at', businessDayRange.start)
        .lte('created_at', businessDayRange.end)
        .order('created_at', { ascending: false });

      // Apply additional filters
      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
      }

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      const { data: checkins, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: checkins || [],
        businessDate: businessDayRange.businessDate,
        range: {
          start: businessDayRange.startWIB,
          end: businessDayRange.endWIB,
        },
      };
    } catch (error) {
      console.error('Error getting checkins in business day:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin business day',
      };
    }
  }

  /**
   * Get business day statistics
   * @param {Object} businessDayRange - Business day range
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async getBusinessDayStatistics(businessDayRange, filters = {}) {
    try {
      const checkinsResult = await this.getCheckinsInBusinessDay(businessDayRange, filters);
      
      if (!checkinsResult.success) {
        return checkinsResult;
      }

      const checkins = checkinsResult.data;
      
      // Calculate statistics
      const stats = {
        totalCheckins: checkins.length,
        completedCheckins: checkins.filter(c => c.status === 'completed').length,
        activeCheckins: checkins.filter(c => c.status === 'active').length,
        extendedCheckins: checkins.filter(c => c.status === 'extended').length,
        earlyCheckouts: checkins.filter(c => c.status === 'early_checkout').length,
        
        // Payment method breakdown
        paymentMethods: {
          cash: checkins.filter(c => c.payment_method === 'cash').length,
          transfer: checkins.filter(c => c.payment_method === 'transfer').length,
          qris: checkins.filter(c => c.payment_method === 'qris').length,
        },
        
        // Duration statistics
        totalRevenue: checkins.reduce((sum, c) => sum + (c.payment_amount || 0), 0),
        averageDuration: checkins.length > 0 
          ? checkins.reduce((sum, c) => sum + (c.duration_hours || 0), 0) / checkins.length 
          : 0,
        
        // Apartment breakdown
        apartmentStats: this.calculateApartmentStats(checkins),
        
        // Team breakdown
        teamStats: this.calculateTeamStats(checkins),
        
        // Hourly breakdown
        hourlyStats: this.calculateHourlyStats(checkins),
      };

      return {
        success: true,
        data: stats,
        businessDate: businessDayRange.businessDate,
        range: {
          start: businessDayRange.startWIB,
          end: businessDayRange.endWIB,
        },
      };
    } catch (error) {
      console.error('Error getting business day statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik business day',
      };
    }
  }

  /**
   * Calculate apartment statistics
   * @param {Array} checkins - Array of checkins
   * @returns {Object}
   */
  calculateApartmentStats(checkins) {
    const apartmentMap = {};
    
    checkins.forEach(checkin => {
      const apartmentName = checkin.apartments?.name || 'Unknown';
      if (!apartmentMap[apartmentName]) {
        apartmentMap[apartmentName] = {
          name: apartmentName,
          count: 0,
          revenue: 0,
        };
      }
      apartmentMap[apartmentName].count++;
      apartmentMap[apartmentName].revenue += checkin.payment_amount || 0;
    });
    
    return Object.values(apartmentMap);
  }

  /**
   * Calculate team statistics
   * @param {Array} checkins - Array of checkins
   * @returns {Object}
   */
  calculateTeamStats(checkins) {
    const teamMap = {};
    
    checkins.forEach(checkin => {
      const teamName = checkin.field_teams?.full_name || 'Unknown';
      if (!teamMap[teamName]) {
        teamMap[teamName] = {
          name: teamName,
          count: 0,
          revenue: 0,
        };
      }
      teamMap[teamName].count++;
      teamMap[teamName].revenue += checkin.payment_amount || 0;
    });
    
    return Object.values(teamMap);
  }

  /**
   * Calculate hourly statistics
   * @param {Array} checkins - Array of checkins
   * @returns {Object}
   */
  calculateHourlyStats(checkins) {
    const hourlyMap = {};
    
    checkins.forEach(checkin => {
      const hour = new Date(checkin.created_at).getHours();
      if (!hourlyMap[hour]) {
        hourlyMap[hour] = {
          hour: hour,
          count: 0,
          revenue: 0,
        };
      }
      hourlyMap[hour].count++;
      hourlyMap[hour].revenue += checkin.payment_amount || 0;
    });
    
    return Object.values(hourlyMap).sort((a, b) => a.hour - b.hour);
  }

  /**
   * Get business day range untuk beberapa hari terakhir
   * @param {number} days - Jumlah hari
   * @returns {Array} - Array of business day ranges
   */
  getLastBusinessDays(days = 7) {
    const ranges = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      ranges.push(this.getBusinessDayRange(date));
    }
    
    return ranges;
  }
}

export default new BusinessDayService();
