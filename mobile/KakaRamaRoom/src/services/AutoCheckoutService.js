import DatabaseManager from '../config/database';
import UnitService from './UnitService';
import ActivityLogService from './ActivityLogService';
import { ACTIVITY_ACTIONS, UNIT_STATUS, CHECKIN_STATUS } from '../config/constants';

/**
 * Service untuk mengelola auto-checkout
 * Menangani proses otomatis checkout unit yang sudah habis waktunya
 */
class AutoCheckoutService {
  /**
   * Proses auto-checkout untuk semua checkin yang sudah habis waktu
   * @returns {Object} - Result dengan jumlah unit yang di-checkout
   */
  async processAutoCheckout() {
    try {
      const db = DatabaseManager.getDatabase();
      
      // Get checkin yang sudah habis waktu tapi masih aktif
      const result = await db.executeSql(
        `SELECT c.*, u.unit_number, a.name as apartment_name
         FROM checkins c
         INNER JOIN units u ON c.unit_id = u.id
         INNER JOIN apartments a ON c.apartment_id = a.id
         WHERE c.status IN ('active', 'extended') 
         AND datetime(c.checkout_time) <= datetime('now')
         ORDER BY c.checkout_time ASC`
      );

      const expiredCheckins = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        expiredCheckins.push(result[0].rows.item(i));
      }

      let processedCount = 0;
      const processedUnits = [];

      // Process setiap checkin yang expired
      for (const checkin of expiredCheckins) {
        try {
          // Update status checkin menjadi completed
          await db.executeSql(
            `UPDATE checkins 
             SET status = 'completed', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [checkin.id]
          );

          // Update status unit menjadi cleaning
          await UnitService.updateUnitStatus(
            checkin.unit_id,
            UNIT_STATUS.CLEANING,
            1, // System user ID
            'system'
          );

          // Log aktivitas auto-checkout
          await ActivityLogService.logActivity(
            1, // System user ID
            'system',
            ACTIVITY_ACTIONS.AUTO_CHECKOUT,
            `Auto-checkout unit ${checkin.unit_number} (${checkin.apartment_name}) - Checkin ID: ${checkin.id}`,
            'checkins',
            checkin.id
          );

          processedCount++;
          processedUnits.push({
            unitNumber: checkin.unit_number,
            apartmentName: checkin.apartment_name,
            checkinId: checkin.id,
            checkoutTime: checkin.checkout_time,
          });

          console.log(`Auto-checkout processed: Unit ${checkin.unit_number} (${checkin.apartment_name})`);
        } catch (error) {
          console.error(`Error processing auto-checkout for checkin ${checkin.id}:`, error);
        }
      }

      return {
        success: true,
        processedCount,
        processedUnits,
        message: `${processedCount} unit berhasil di-auto-checkout`,
      };
    } catch (error) {
      console.error('Error in processAutoCheckout:', error);
      return {
        success: false,
        message: 'Gagal memproses auto-checkout',
      };
    }
  }

  /**
   * Get checkin yang akan expired dalam waktu tertentu
   * @param {number} minutesAhead - Menit ke depan untuk cek expired
   * @returns {Object} - Result dengan list checkin yang akan expired
   */
  async getUpcomingExpiredCheckins(minutesAhead = 30) {
    try {
      const db = DatabaseManager.getDatabase();
      
      const result = await db.executeSql(
        `SELECT c.*, u.unit_number, a.name as apartment_name, ft.full_name as team_name
         FROM checkins c
         INNER JOIN units u ON c.unit_id = u.id
         INNER JOIN apartments a ON c.apartment_id = a.id
         INNER JOIN field_teams ft ON c.team_id = ft.id
         WHERE c.status IN ('active', 'extended') 
         AND datetime(c.checkout_time) BETWEEN datetime('now') AND datetime('now', '+${minutesAhead} minutes')
         ORDER BY c.checkout_time ASC`
      );

      const upcomingExpired = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const checkin = result[0].rows.item(i);
        const checkoutTime = new Date(checkin.checkout_time);
        const now = new Date();
        const minutesRemaining = Math.ceil((checkoutTime - now) / (1000 * 60));
        
        upcomingExpired.push({
          ...checkin,
          minutesRemaining,
        });
      }

      return {
        success: true,
        data: upcomingExpired,
      };
    } catch (error) {
      console.error('Error getting upcoming expired checkins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin yang akan expired',
      };
    }
  }

  /**
   * Get statistik auto-checkout untuk periode tertentu
   * @param {Object} filters - Filter options
   * @returns {Object} - Result dengan statistik auto-checkout
   */
  async getAutoCheckoutStatistics(filters = {}) {
    try {
      const db = DatabaseManager.getDatabase();
      
      let query = `
        SELECT 
          COUNT(*) as total_auto_checkouts,
          DATE(al.created_at) as date,
          COUNT(DISTINCT al.target_id) as unique_checkins
        FROM activity_logs al
        WHERE al.action = '${ACTIVITY_ACTIONS.AUTO_CHECKOUT}'
      `;

      const params = [];

      // Filter by date range
      if (filters.startDate) {
        query += ' AND DATE(al.created_at) >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND DATE(al.created_at) <= ?';
        params.push(filters.endDate);
      }

      query += ' GROUP BY DATE(al.created_at) ORDER BY date DESC';

      const result = await db.executeSql(query, params);
      const statistics = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        statistics.push(result[0].rows.item(i));
      }

      // Get total statistics
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM activity_logs
        WHERE action = '${ACTIVITY_ACTIONS.AUTO_CHECKOUT}'
        ${filters.startDate ? 'AND DATE(created_at) >= ?' : ''}
        ${filters.endDate ? 'AND DATE(created_at) <= ?' : ''}
      `;

      const totalResult = await db.executeSql(totalQuery, params);
      const totalAutoCheckouts = totalResult[0].rows.item(0).total;

      return {
        success: true,
        data: {
          dailyStatistics: statistics,
          totalAutoCheckouts,
        },
      };
    } catch (error) {
      console.error('Error getting auto-checkout statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik auto-checkout',
      };
    }
  }

  /**
   * Simulasi auto-checkout untuk testing
   * @param {number} checkinId - ID checkin untuk di-checkout
   * @returns {Object} - Result simulasi
   */
  async simulateAutoCheckout(checkinId) {
    try {
      const db = DatabaseManager.getDatabase();
      
      // Get checkin data
      const result = await db.executeSql(
        `SELECT c.*, u.unit_number, a.name as apartment_name
         FROM checkins c
         INNER JOIN units u ON c.unit_id = u.id
         INNER JOIN apartments a ON c.apartment_id = a.id
         WHERE c.id = ? AND c.status IN ('active', 'extended')`,
        [checkinId]
      );

      if (result[0].rows.length === 0) {
        return {
          success: false,
          message: 'Checkin tidak ditemukan atau sudah selesai',
        };
      }

      const checkin = result[0].rows.item(0);

      // Update status checkin menjadi completed
      await db.executeSql(
        `UPDATE checkins 
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [checkinId]
      );

      // Update status unit menjadi cleaning
      await UnitService.updateUnitStatus(
        checkin.unit_id,
        UNIT_STATUS.CLEANING,
        1, // System user ID
        'system'
      );

      // Log aktivitas simulasi auto-checkout
      await ActivityLogService.logActivity(
        1, // System user ID
        'system',
        ACTIVITY_ACTIONS.AUTO_CHECKOUT,
        `Simulasi auto-checkout unit ${checkin.unit_number} (${checkin.apartment_name}) - Checkin ID: ${checkinId}`,
        'checkins',
        checkinId
      );

      return {
        success: true,
        message: `Simulasi auto-checkout berhasil untuk unit ${checkin.unit_number}`,
        data: {
          unitNumber: checkin.unit_number,
          apartmentName: checkin.apartment_name,
          checkinId,
        },
      };
    } catch (error) {
      console.error('Error in simulate auto-checkout:', error);
      return {
        success: false,
        message: 'Gagal melakukan simulasi auto-checkout',
      };
    }
  }

  /**
   * Start auto-checkout scheduler (untuk implementasi background task)
   * @param {number} intervalMinutes - Interval dalam menit untuk menjalankan auto-checkout
   */
  startAutoCheckoutScheduler(intervalMinutes = 5) {
    console.log(`Starting auto-checkout scheduler with ${intervalMinutes} minute interval`);
    
    // Jalankan auto-checkout pertama kali
    this.processAutoCheckout();
    
    // Set interval untuk menjalankan auto-checkout secara berkala
    const intervalId = setInterval(async () => {
      console.log('Running scheduled auto-checkout...');
      const result = await this.processAutoCheckout();
      
      if (result.success && result.processedCount > 0) {
        console.log(`Scheduled auto-checkout processed ${result.processedCount} units`);
      }
    }, intervalMinutes * 60 * 1000);

    return intervalId;
  }

  /**
   * Stop auto-checkout scheduler
   * @param {number} intervalId - ID interval yang akan dihentikan
   */
  stopAutoCheckoutScheduler(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
      console.log('Auto-checkout scheduler stopped');
    }
  }
}

export default new AutoCheckoutService();
