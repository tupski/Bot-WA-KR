import { supabase } from '../config/supabase';
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
      const { data: units, error } = await supabase
        .from('units')
        .select(`
          *,
          apartments (
            name,
            code
          )
        `)
        .order('unit_number', { ascending: true });

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      // Transform data to match expected format
      const transformedUnits = units?.map(unit => ({
        ...unit,
        apartment_name: unit.apartments?.name,
        apartment_code: unit.apartments?.code,
      })) || [];

      return {
        success: true,
        data: transformedUnits,
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
      const { data: existing, error: checkError } = await supabase
        .from('units')
        .select('id')
        .eq('apartment_id', apartmentId)
        .eq('unit_number', unitNumber)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          message: 'Nomor unit sudah ada di apartemen ini',
        };
      }

      // Insert new unit
      const { data: newUnit, error: insertError } = await supabase
        .from('units')
        .insert([{
          apartment_id: apartmentId,
          unit_number: unitNumber,
          unit_type: unitType,
          status: 'available'
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const unitId = newUnit.id;

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
      const { data: existing, error: checkError } = await supabase
        .from('units')
        .select('id')
        .eq('apartment_id', apartmentId)
        .eq('unit_number', unitNumber)
        .neq('id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          message: 'Nomor unit sudah ada di apartemen ini',
        };
      }

      // Update unit
      const { data: updatedUnit, error: updateError } = await supabase
        .from('units')
        .update({
          apartment_id: apartmentId,
          unit_number: unitNumber,
          unit_type: unitType,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (updatedUnit) {
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
      let cleaningStartedAt = null;
      if (status === UNIT_STATUS.CLEANING) {
        cleaningStartedAt = new Date().toISOString();
      }

      const { data: updatedUnit, error } = await supabase
        .from('units')
        .update({
          status,
          cleaning_started_at: cleaningStartedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('unit_number')
        .single();

      if (error) {
        throw error;
      }

      if (updatedUnit) {
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
      // Check if unit has active checkins
      const { count: activeCheckins, error: checkError } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', id)
        .in('status', ['active', 'extended']);

      if (checkError) {
        throw checkError;
      }

      if (activeCheckins > 0) {
        return {
          success: false,
          message: 'Tidak dapat menghapus unit yang masih memiliki checkin aktif',
        };
      }

      // Get unit info for logging
      const { data: unit, error: getError } = await supabase
        .from('units')
        .select('unit_number')
        .eq('id', id)
        .single();

      if (getError) {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }

      // Delete unit
      const { error: deleteError } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        'admin',
        ACTIVITY_ACTIONS.DELETE_UNIT || 'delete_unit',
        `Menghapus unit: ${unit.unit_number}`,
        'units',
        id
      );

      return {
        success: true,
        message: 'Unit berhasil dihapus',
      };
    } catch (error) {
      console.error('UnitService: Error deleting unit:', error);
      return {
        success: false,
        message: 'Gagal menghapus unit: ' + error.message,
      };
    }
  }

  // Get available units for checkin
  async getAvailableUnits(apartmentId = null) {
    try {
      console.log('UnitService: Getting available units for apartment:', apartmentId);

      let query = supabase
        .from('units')
        .select(`
          *,
          apartments (
            name,
            code
          )
        `)
        .eq('status', 'available');

      // If apartmentId is provided, filter by it
      if (apartmentId) {
        query = query.eq('apartment_id', apartmentId);
      }

      const { data: units, error } = await query
        .order('unit_number', { ascending: true });

      if (error) {
        throw error;
      }

      // Transform data to match expected format
      const transformedUnits = units?.map(unit => ({
        ...unit,
        apartment_name: unit.apartments?.name,
        apartment_code: unit.apartments?.code,
      })) || [];

      console.log(`UnitService: Found ${transformedUnits.length} available units`);
      return {
        success: true,
        data: transformedUnits,
      };
    } catch (error) {
      console.error('UnitService: Error getting available units:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit tersedia: ' + error.message,
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
