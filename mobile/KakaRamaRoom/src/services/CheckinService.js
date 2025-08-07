import { supabase } from '../config/supabase';
import ActivityLogService from './ActivityLogService';
import UnitService from './UnitService';
import { ACTIVITY_ACTIONS, UNIT_STATUS, CHECKIN_STATUS } from '../config/constants';

/**
 * Service untuk mengelola data checkin
 * Menangani create, update, extend, dan early checkout
 */
class CheckinService {
  /**
   * Buat checkin baru
   * @param {Object} checkinData - Data checkin
   * @param {number} userId - ID user yang membuat checkin
   * @param {string} userType - Tipe user (admin/field_team)
   */
  async createCheckin(checkinData, userId, userType = 'field_team') {
    try {
      const {
        apartmentId,
        unitId,
        durationHours,
        paymentMethod,
        paymentAmount,
        paymentProofPath,
        marketingName,
        notes,
      } = checkinData;

      const db = DatabaseManager.getDatabase();

      // Hitung waktu checkout
      const now = new Date();
      const checkoutTime = new Date(now.getTime() + (durationHours * 60 * 60 * 1000));

      // Cek apakah unit tersedia
      const unitResult = await db.executeSql(
        'SELECT status FROM units WHERE id = ?',
        [unitId]
      );

      if (unitResult[0].rows.length === 0) {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }

      const unit = unitResult[0].rows.item(0);
      if (unit.status !== UNIT_STATUS.AVAILABLE) {
        return {
          success: false,
          message: 'Unit tidak tersedia untuk checkin',
        };
      }

      // Insert checkin baru
      const result = await db.executeSql(
        `INSERT INTO checkins 
         (apartment_id, unit_id, team_id, duration_hours, checkout_time, 
          payment_method, payment_amount, payment_proof_path, marketing_name, 
          notes, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          apartmentId,
          unitId,
          userId, // team_id sama dengan created_by untuk field team
          durationHours,
          checkoutTime.toISOString(),
          paymentMethod,
          paymentAmount,
          paymentProofPath,
          marketingName,
          notes,
          userId,
        ]
      );

      const checkinId = result[0].insertId;

      // Update status unit menjadi occupied
      await UnitService.updateUnitStatus(unitId, UNIT_STATUS.OCCUPIED, userId, userType);

      // Log aktivitas
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.CREATE_CHECKIN,
        `Checkin baru untuk unit ${unitId}, durasi ${durationHours} jam`,
        'checkins',
        checkinId
      );

      return {
        success: true,
        data: { id: checkinId, ...checkinData, checkoutTime },
        message: 'Checkin berhasil dibuat',
      };
    } catch (error) {
      console.error('Error creating checkin:', error);
      return {
        success: false,
        message: 'Gagal membuat checkin',
      };
    }
  }

  /**
   * Extend checkin yang sudah ada
   * @param {number} checkinId - ID checkin yang akan di-extend
   * @param {Object} extendData - Data extend
   * @param {number} userId - ID user yang melakukan extend
   * @param {string} userType - Tipe user
   */
  async extendCheckin(checkinId, extendData, userId, userType = 'field_team') {
    try {
      const { additionalHours, paymentMethod, paymentAmount, paymentProofPath, notes } = extendData;

      const db = DatabaseManager.getDatabase();

      // Get checkin yang akan di-extend
      const checkinResult = await db.executeSql(
        'SELECT * FROM checkins WHERE id = ? AND status IN (?, ?)',
        [checkinId, CHECKIN_STATUS.ACTIVE, CHECKIN_STATUS.EXTENDED]
      );

      if (checkinResult[0].rows.length === 0) {
        return {
          success: false,
          message: 'Checkin tidak ditemukan atau sudah selesai',
        };
      }

      const checkin = checkinResult[0].rows.item(0);
      const currentCheckoutTime = new Date(checkin.checkout_time);
      const newCheckoutTime = new Date(currentCheckoutTime.getTime() + (additionalHours * 60 * 60 * 1000));

      // Insert extend record
      await db.executeSql(
        `INSERT INTO checkin_extensions 
         (checkin_id, additional_hours, new_checkout_time, payment_method, 
          payment_amount, payment_proof_path, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          checkinId,
          additionalHours,
          newCheckoutTime.toISOString(),
          paymentMethod,
          paymentAmount,
          paymentProofPath,
          notes,
          userId,
        ]
      );

      // Update checkin dengan waktu checkout baru
      await db.executeSql(
        `UPDATE checkins 
         SET checkout_time = ?, status = 'extended', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newCheckoutTime.toISOString(), checkinId]
      );

      // Log aktivitas
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.EXTEND_CHECKIN,
        `Extend checkin ${checkinId} selama ${additionalHours} jam`,
        'checkins',
        checkinId
      );

      return {
        success: true,
        message: 'Checkin berhasil di-extend',
      };
    } catch (error) {
      console.error('Error extending checkin:', error);
      return {
        success: false,
        message: 'Gagal extend checkin',
      };
    }
  }

  /**
   * Early checkout sebelum waktu habis
   * @param {number} checkinId - ID checkin
   * @param {number} userId - ID user yang melakukan checkout
   * @param {string} userType - Tipe user
   */
  async earlyCheckout(checkinId, userId, userType = 'field_team') {
    try {
      const db = DatabaseManager.getDatabase();

      // Get checkin data
      const checkinResult = await db.executeSql(
        'SELECT * FROM checkins WHERE id = ? AND status IN (?, ?)',
        [checkinId, CHECKIN_STATUS.ACTIVE, CHECKIN_STATUS.EXTENDED]
      );

      if (checkinResult[0].rows.length === 0) {
        return {
          success: false,
          message: 'Checkin tidak ditemukan atau sudah selesai',
        };
      }

      const checkin = checkinResult[0].rows.item(0);

      // Update status checkin menjadi early_checkout
      await db.executeSql(
        `UPDATE checkins 
         SET status = 'early_checkout', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [checkinId]
      );

      // Update status unit menjadi cleaning
      await UnitService.updateUnitStatus(checkin.unit_id, UNIT_STATUS.CLEANING, userId, userType);

      // Log aktivitas
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.EARLY_CHECKOUT,
        `Early checkout untuk checkin ${checkinId}`,
        'checkins',
        checkinId
      );

      return {
        success: true,
        message: 'Early checkout berhasil',
      };
    } catch (error) {
      console.error('Error early checkout:', error);
      return {
        success: false,
        message: 'Gagal melakukan early checkout',
      };
    }
  }

  /**
   * Get active checkins untuk tim lapangan
   * @param {number} teamId - ID tim lapangan
   */
  async getActiveCheckins(teamId) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT c.*, u.unit_number, a.name as apartment_name
         FROM checkins c
         INNER JOIN units u ON c.unit_id = u.id
         INNER JOIN apartments a ON c.apartment_id = a.id
         WHERE c.team_id = ? AND c.status IN ('active', 'extended')
         ORDER BY c.created_at DESC`,
        [teamId]
      );

      const checkins = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        checkins.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: checkins,
      };
    } catch (error) {
      console.error('Error getting active checkins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin aktif',
      };
    }
  }

  /**
   * Get checkin history untuk tim lapangan
   * @param {number} teamId - ID tim lapangan
   * @param {number} limit - Limit data
   */
  async getCheckinHistory(teamId, limit = 50) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT c.*, u.unit_number, a.name as apartment_name
         FROM checkins c
         INNER JOIN units u ON c.unit_id = u.id
         INNER JOIN apartments a ON c.apartment_id = a.id
         WHERE c.team_id = ?
         ORDER BY c.created_at DESC
         LIMIT ?`,
        [teamId, limit]
      );

      const checkins = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        checkins.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: checkins,
      };
    } catch (error) {
      console.error('Error getting checkin history:', error);
      return {
        success: false,
        message: 'Gagal mengambil riwayat checkin',
      };
    }
  }

  /**
   * Get all checkins untuk admin dengan filter
   * @param {Object} filters - Filter options
   */
  async getAllCheckins(filters = {}) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT c.*, u.unit_number, a.name as apartment_name, ft.full_name as team_name
        FROM checkins c
        INNER JOIN units u ON c.unit_id = u.id
        INNER JOIN apartments a ON c.apartment_id = a.id
        INNER JOIN field_teams ft ON c.team_id = ft.id
        WHERE 1=1
      `;
      
      const params = [];

      // Filter by apartment
      if (filters.apartmentId) {
        query += ' AND c.apartment_id = ?';
        params.push(filters.apartmentId);
      }

      // Filter by status
      if (filters.status) {
        query += ' AND c.status = ?';
        params.push(filters.status);
      }

      // Filter by date range
      if (filters.startDate) {
        query += ' AND DATE(c.created_at) >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND DATE(c.created_at) <= ?';
        params.push(filters.endDate);
      }

      // Order by created_at desc
      query += ' ORDER BY c.created_at DESC';

      // Limit
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const result = await db.executeSql(query, params);
      const checkins = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        checkins.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: checkins,
      };
    } catch (error) {
      console.error('Error getting all checkins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin',
      };
    }
  }
}

export default new CheckinService();
