import DatabaseManager from '../config/database';
import ActivityLogService from './ActivityLogService';
import { ACTIVITY_ACTIONS, UNIT_STATUS, TIME_CONSTANTS } from '../config/constants';

class UnitService {
  constructor() {
    this.autoCheckoutInterval = null;
    this.startAutoCheckoutMonitoring();
  }

  // Get all units
  async getAllUnits() {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT u.*, a.name as apartment_name, a.code as apartment_code
         FROM units u
         INNER JOIN apartments a ON u.apartment_id = a.id
         ORDER BY a.name ASC, u.unit_number ASC`
      );

      const units = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        units.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: units,
      };
    } catch (error) {
      console.error('Error getting all units:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit',
      };
    }
  }

  // Get units by apartment ID
  async getUnitsByApartmentId(apartmentId) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT u.*, a.name as apartment_name, a.code as apartment_code
         FROM units u
         INNER JOIN apartments a ON u.apartment_id = a.id
         WHERE u.apartment_id = ?
         ORDER BY u.unit_number ASC`,
        [apartmentId]
      );

      const units = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        units.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: units,
      };
    } catch (error) {
      console.error('Error getting units by apartment ID:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit',
      };
    }
  }

  // Get units by apartment IDs (untuk field team)
  async getUnitsByApartmentIds(apartmentIds) {
    try {
      if (!apartmentIds || apartmentIds.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      const db = DatabaseManager.getDatabase();
      const placeholders = apartmentIds.map(() => '?').join(',');
      const result = await db.executeSql(
        `SELECT u.*, a.name as apartment_name, a.code as apartment_code
         FROM units u
         INNER JOIN apartments a ON u.apartment_id = a.id
         WHERE u.apartment_id IN (${placeholders})
         ORDER BY a.name ASC, u.unit_number ASC`,
        apartmentIds
      );

      const units = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        units.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: units,
      };
    } catch (error) {
      console.error('Error getting units by apartment IDs:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit',
      };
    }
  }

  // Get unit by ID
  async getUnitById(id) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT u.*, a.name as apartment_name, a.code as apartment_code
         FROM units u
         INNER JOIN apartments a ON u.apartment_id = a.id
         WHERE u.id = ?`,
        [id]
      );

      if (result[0].rows.length > 0) {
        return {
          success: true,
          data: result[0].rows.item(0),
        };
      } else {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error getting unit by ID:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit',
      };
    }
  }

  // Create unit
  async createUnit(unitData, userId) {
    try {
      const { apartmentId, unitNumber, unitType } = unitData;

      // Check if unit number already exists in the apartment
      const db = DatabaseManager.getDatabase();
      const existingResult = await db.executeSql(
        'SELECT id FROM units WHERE apartment_id = ? AND unit_number = ?',
        [apartmentId, unitNumber]
      );

      if (existingResult[0].rows.length > 0) {
        return {
          success: false,
          message: 'Nomor unit sudah ada di apartemen ini',
        };
      }

      // Insert new unit
      const result = await db.executeSql(
        `INSERT INTO units (apartment_id, unit_number, unit_type, status, created_at, updated_at)
         VALUES (?, ?, ?, 'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [apartmentId, unitNumber, unitType]
      );

      const unitId = result[0].insertId;

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        'admin',
        ACTIVITY_ACTIONS.CREATE_UNIT,
        `Membuat unit baru: ${unitNumber} di apartemen ID ${apartmentId}`,
        'units',
        unitId
      );

      return {
        success: true,
        data: { id: unitId, ...unitData },
        message: 'Unit berhasil dibuat',
      };
    } catch (error) {
      console.error('Error creating unit:', error);
      return {
        success: false,
        message: 'Gagal membuat unit',
      };
    }
  }

  // Update unit
  async updateUnit(id, unitData, userId) {
    try {
      const { apartmentId, unitNumber, unitType, status } = unitData;

      // Check if unit number already exists in the apartment (exclude current unit)
      const db = DatabaseManager.getDatabase();
      const existingResult = await db.executeSql(
        'SELECT id FROM units WHERE apartment_id = ? AND unit_number = ? AND id != ?',
        [apartmentId, unitNumber, id]
      );

      if (existingResult[0].rows.length > 0) {
        return {
          success: false,
          message: 'Nomor unit sudah ada di apartemen ini',
        };
      }

      // Update unit
      const result = await db.executeSql(
        `UPDATE units 
         SET apartment_id = ?, unit_number = ?, unit_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [apartmentId, unitNumber, unitType, status, id]
      );

      if (result[0].rowsAffected > 0) {
        // Log activity
        await ActivityLogService.logActivity(
          userId,
          'admin',
          ACTIVITY_ACTIONS.UPDATE_UNIT,
          `Memperbarui unit: ${unitNumber}`,
          'units',
          id
        );

        return {
          success: true,
          message: 'Unit berhasil diperbarui',
        };
      } else {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error updating unit:', error);
      return {
        success: false,
        message: 'Gagal memperbarui unit',
      };
    }
  }

  // Update unit status
  async updateUnitStatus(id, status, userId, userType = 'admin') {
    try {
      const db = DatabaseManager.getDatabase();
      
      let cleaningStartedAt = null;
      if (status === UNIT_STATUS.CLEANING) {
        cleaningStartedAt = new Date().toISOString();
      }

      const result = await db.executeSql(
        `UPDATE units 
         SET status = ?, cleaning_started_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, cleaningStartedAt, id]
      );

      if (result[0].rowsAffected > 0) {
        // Log activity
        await ActivityLogService.logActivity(
          userId,
          userType,
          ACTIVITY_ACTIONS.UPDATE_UNIT_STATUS,
          `Mengubah status unit menjadi: ${status}`,
          'units',
          id
        );

        return {
          success: true,
          message: 'Status unit berhasil diperbarui',
        };
      } else {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error updating unit status:', error);
      return {
        success: false,
        message: 'Gagal memperbarui status unit',
      };
    }
  }

  // Delete unit
  async deleteUnit(id, userId) {
    try {
      const db = DatabaseManager.getDatabase();

      // Check if unit has active checkins
      const checkinsResult = await db.executeSql(
        "SELECT COUNT(*) as count FROM checkins WHERE unit_id = ? AND status IN ('active', 'extended')",
        [id]
      );

      if (checkinsResult[0].rows.item(0).count > 0) {
        return {
          success: false,
          message: 'Tidak dapat menghapus unit yang masih memiliki checkin aktif',
        };
      }

      // Get unit info for logging
      const unitResult = await db.executeSql(
        'SELECT unit_number FROM units WHERE id = ?',
        [id]
      );

      if (unitResult[0].rows.length === 0) {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }

      const unit = unitResult[0].rows.item(0);

      // Delete unit
      const result = await db.executeSql(
        'DELETE FROM units WHERE id = ?',
        [id]
      );

      if (result[0].rowsAffected > 0) {
        // Log activity
        await ActivityLogService.logActivity(
          userId,
          'admin',
          ACTIVITY_ACTIONS.DELETE_UNIT,
          `Menghapus unit: ${unit.unit_number}`,
          'units',
          id
        );

        return {
          success: true,
          message: 'Unit berhasil dihapus',
        };
      } else {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error deleting unit:', error);
      return {
        success: false,
        message: 'Gagal menghapus unit',
      };
    }
  }

  // Get available units for checkin
  async getAvailableUnits(apartmentIds = null) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT u.*, a.name as apartment_name, a.code as apartment_code
        FROM units u
        INNER JOIN apartments a ON u.apartment_id = a.id
        WHERE u.status = 'available'
      `;
      
      const params = [];

      if (apartmentIds && apartmentIds.length > 0) {
        const placeholders = apartmentIds.map(() => '?').join(',');
        query += ` AND u.apartment_id IN (${placeholders})`;
        params.push(...apartmentIds);
      }

      query += ' ORDER BY a.name ASC, u.unit_number ASC';

      const result = await db.executeSql(query, params);
      const units = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        units.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: units,
      };
    } catch (error) {
      console.error('Error getting available units:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit tersedia',
      };
    }
  }

  // Start auto checkout monitoring
  startAutoCheckoutMonitoring() {
    if (this.autoCheckoutInterval) {
      clearInterval(this.autoCheckoutInterval);
    }

    this.autoCheckoutInterval = setInterval(async () => {
      await this.processAutoCheckouts();
      await this.processCleaningCompletion();
    }, TIME_CONSTANTS.AUTO_CHECKOUT_CHECK_INTERVAL);
  }

  // Stop auto checkout monitoring
  stopAutoCheckoutMonitoring() {
    if (this.autoCheckoutInterval) {
      clearInterval(this.autoCheckoutInterval);
      this.autoCheckoutInterval = null;
    }
  }

  // Process auto checkouts
  async processAutoCheckouts() {
    try {
      const db = DatabaseManager.getDatabase();
      const now = new Date().toISOString();

      // Find expired checkins
      const result = await db.executeSql(
        `SELECT c.*, u.unit_number, a.name as apartment_name
         FROM checkins c
         INNER JOIN units u ON c.unit_id = u.id
         INNER JOIN apartments a ON c.apartment_id = a.id
         WHERE c.status IN ('active', 'extended') AND c.checkout_time <= ?`,
        [now]
      );

      for (let i = 0; i < result[0].rows.length; i++) {
        const checkin = result[0].rows.item(i);
        
        // Update checkin status to completed
        await db.executeSql(
          `UPDATE checkins SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [checkin.id]
        );

        // Update unit status to cleaning
        await this.updateUnitStatus(checkin.unit_id, UNIT_STATUS.CLEANING, 1, 'admin'); // System user ID = 1

        console.log(`Auto checkout: Unit ${checkin.unit_number} at ${checkin.apartment_name}`);
      }
    } catch (error) {
      console.error('Error processing auto checkouts:', error);
    }
  }

  // Process cleaning completion
  async processCleaningCompletion() {
    try {
      const db = DatabaseManager.getDatabase();
      const now = new Date();
      const cleaningDuration = TIME_CONSTANTS.CLEANING_DURATION_MINUTES * 60 * 1000; // Convert to milliseconds

      // Find units that have been cleaning for more than the specified duration
      const result = await db.executeSql(
        `SELECT * FROM units 
         WHERE status = 'cleaning' AND cleaning_started_at IS NOT NULL
         AND datetime(cleaning_started_at, '+${TIME_CONSTANTS.CLEANING_DURATION_MINUTES} minutes') <= datetime('now')`
      );

      for (let i = 0; i < result[0].rows.length; i++) {
        const unit = result[0].rows.item(i);
        
        // Update unit status to available
        await this.updateUnitStatus(unit.id, UNIT_STATUS.AVAILABLE, 1, 'admin'); // System user ID = 1

        console.log(`Auto cleaning completion: Unit ${unit.unit_number}`);
      }
    } catch (error) {
      console.error('Error processing cleaning completion:', error);
    }
  }

  // Get unit statistics
  async getUnitStatistics(apartmentIds = null) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM units u
      `;
      
      const params = [];

      if (apartmentIds && apartmentIds.length > 0) {
        const placeholders = apartmentIds.map(() => '?').join(',');
        query += ` WHERE u.apartment_id IN (${placeholders})`;
        params.push(...apartmentIds);
      }

      query += ' GROUP BY status';

      const result = await db.executeSql(query, params);
      const statistics = {};

      // Initialize all statuses with 0
      Object.values(UNIT_STATUS).forEach(status => {
        statistics[status] = 0;
      });

      // Fill with actual counts
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        statistics[row.status] = row.count;
      }

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      console.error('Error getting unit statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik unit',
      };
    }
  }

  // Search units
  async searchUnits(searchTerm, apartmentIds = null) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT u.*, a.name as apartment_name, a.code as apartment_code
        FROM units u
        INNER JOIN apartments a ON u.apartment_id = a.id
        WHERE (u.unit_number LIKE ? OR u.unit_type LIKE ? OR a.name LIKE ?)
      `;
      
      const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

      if (apartmentIds && apartmentIds.length > 0) {
        const placeholders = apartmentIds.map(() => '?').join(',');
        query += ` AND u.apartment_id IN (${placeholders})`;
        params.push(...apartmentIds);
      }

      query += ' ORDER BY a.name ASC, u.unit_number ASC';

      const result = await db.executeSql(query, params);
      const units = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        units.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: units,
      };
    } catch (error) {
      console.error('Error searching units:', error);
      return {
        success: false,
        message: 'Gagal mencari unit',
      };
    }
  }
}

export default new UnitService();
