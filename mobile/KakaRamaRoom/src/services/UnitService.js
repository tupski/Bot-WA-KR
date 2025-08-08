import { supabase } from '../config/supabase';
import ActivityLogService from './ActivityLogService';
import TeamAssignmentService from './TeamAssignmentService';
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

  // Get available units only (untuk checkin) dengan filtering assignment
  async getAvailableUnits(apartmentId = null) {
    try {
      console.log('UnitService: Getting available units for apartment:', apartmentId);

      // Use TeamAssignmentService untuk filtering
      const result = await TeamAssignmentService.getAccessibleUnits(apartmentId);

      if (!result.success) {
        return result;
      }

      // Filter hanya unit yang available
      const availableUnits = result.data.filter(unit => unit.status === UNIT_STATUS.AVAILABLE);

      // Transform data to match expected format
      const transformedUnits = availableUnits.map(unit => ({
        ...unit,
        apartment_name: unit.apartments?.name,
        apartment_code: unit.apartments?.code,
        isSelectable: true, // Available units are always selectable
      }));

      return {
        success: true,
        data: transformedUnits,
      };
    } catch (error) {
      console.error('Error getting available units:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit tersedia',
      };
    }
  }

  // Get units by apartment ID
  async getUnitsByApartmentId(apartmentId) {
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
        .eq('apartment_id', apartmentId)
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

      const { data: units, error } = await supabase
        .from('units')
        .select(`
          *,
          apartments (
            name,
            code
          )
        `)
        .in('apartment_id', apartmentIds)
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
      const { data: unit, error } = await supabase
        .from('units')
        .select(`
          *,
          apartments (
            name,
            code
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: 'Unit tidak ditemukan',
          };
        }
        throw error;
      }

      // Transform data to match expected format
      const transformedUnit = {
        ...unit,
        apartment_name: unit.apartments?.name,
        apartment_code: unit.apartments?.code,
      };

      return {
        success: true,
        data: transformedUnit,
      };
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
      console.log('UnitService: Creating unit with data:', unitData);

      // Validate input data
      if (!unitData) {
        return {
          success: false,
          message: 'Data unit tidak valid',
        };
      }

      const { apartmentId, unitNumber, unitType } = unitData;

      // Validate required fields
      if (!apartmentId || !unitNumber) {
        return {
          success: false,
          message: 'Apartemen ID dan nomor unit harus diisi',
        };
      }

      // Validate apartmentId format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(apartmentId)) {
        return {
          success: false,
          message: 'Format ID apartemen tidak valid',
        };
      }

      // Check if unit number already exists in the apartment
      const { data: existing, error: checkError } = await supabase
        .from('units')
        .select('id')
        .eq('apartment_id', apartmentId)
        .eq('unit_number', unitNumber)
        .single();

      console.log('UnitService: Check existing unit result:', { existing, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('UnitService: Check error:', checkError);
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          message: 'Nomor unit sudah ada di apartemen ini',
        };
      }

      // Insert new unit
      const insertData = {
        apartment_id: apartmentId,
        unit_number: unitNumber,
        unit_type: unitType || null,
        status: 'available'
      };

      console.log('UnitService: Inserting unit data:', insertData);

      const { data: newUnit, error: insertError } = await supabase
        .from('units')
        .insert([insertData])
        .select()
        .single();

      console.log('UnitService: Insert result:', { newUnit, insertError });

      if (insertError) {
        console.error('UnitService: Insert error:', insertError);
        throw insertError;
      }

      const unitId = newUnit.id;

      // Log activity
      try {
        await ActivityLogService.logActivity(
          userId,
          'admin',
          ACTIVITY_ACTIONS.CREATE_UNIT,
          `Membuat unit baru: ${unitNumber} di apartemen ID ${apartmentId}`,
          'units',
          unitId
        );
      } catch (logError) {
        console.error('UnitService: Activity log error:', logError);
        // Don't fail the whole operation if logging fails
      }

      return {
        success: true,
        data: { id: unitId, ...unitData },
        message: 'Unit berhasil dibuat',
      };
    } catch (error) {
      console.error('UnitService: Error creating unit:', error);
      return {
        success: false,
        message: `Gagal membuat unit: ${error.message || 'Unknown error'}`,
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
      console.log('UnitService: Processing auto checkouts...');
      const now = new Date().toISOString();

      // Find expired checkins using Supabase
      const { data: expiredCheckins, error } = await supabase
        .from('checkins')
        .select(`
          *,
          units (
            unit_number,
            apartments (
              name
            )
          )
        `)
        .in('status', ['active', 'extended'])
        .lte('checkout_time', now);

      if (error) {
        console.error('Error finding expired checkins:', error);
        return;
      }

      // Process each expired checkin
      for (const checkin of expiredCheckins || []) {
        try {
          // Update checkin status to completed
          await supabase
            .from('checkins')
            .update({
              status: 'completed',
              updated_at: now
            })
            .eq('id', checkin.id);

          // Update unit status to cleaning
          await this.updateUnitStatus(checkin.unit_id, UNIT_STATUS.CLEANING, 1, 'admin');

          console.log(`Auto checkout: Unit ${checkin.units?.unit_number} at ${checkin.units?.apartments?.name}`);
        } catch (updateError) {
          console.error(`Error processing auto checkout for checkin ${checkin.id}:`, updateError);
        }
      }
    } catch (error) {
      console.error('Error processing auto checkouts:', error);
    }
  }

  // Process cleaning completion
  async processCleaningCompletion() {
    try {
      console.log('UnitService: Processing cleaning completion...');
      const now = new Date();
      const cleaningDuration = TIME_CONSTANTS.CLEANING_DURATION_MINUTES * 60 * 1000; // Convert to milliseconds
      const cutoffTime = new Date(now.getTime() - cleaningDuration).toISOString();

      // Find units that have been cleaning for more than the specified duration
      const { data: cleaningUnits, error } = await supabase
        .from('units')
        .select('*')
        .eq('status', 'cleaning')
        .not('cleaning_started_at', 'is', null)
        .lte('cleaning_started_at', cutoffTime);

      if (error) {
        console.error('Error finding cleaning units:', error);
        return;
      }

      // Process each unit that finished cleaning
      for (const unit of cleaningUnits || []) {
        try {
          // Update unit status to available
          await this.updateUnitStatus(unit.id, UNIT_STATUS.AVAILABLE, 1, 'admin');

          console.log(`Auto cleaning completion: Unit ${unit.unit_number}`);
        } catch (updateError) {
          console.error(`Error completing cleaning for unit ${unit.id}:`, updateError);
        }
      }
    } catch (error) {
      console.error('Error processing cleaning completion:', error);
    }
  }

  // Get unit statistics
  async getUnitStatistics(apartmentIds = null) {
    try {
      console.log('UnitService: Getting unit statistics...');

      let query = supabase
        .from('units')
        .select('status');

      if (apartmentIds && apartmentIds.length > 0) {
        query = query.in('apartment_id', apartmentIds);
      }

      const { data: units, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          // Return empty statistics if no units found
          const statistics = {};
          Object.values(UNIT_STATUS).forEach(status => {
            statistics[status] = 0;
          });
          return { success: true, data: statistics };
        }
        throw error;
      }

      // Count units by status
      const statistics = {};

      // Initialize all statuses with 0
      Object.values(UNIT_STATUS).forEach(status => {
        statistics[status] = 0;
      });

      // Count actual units
      units?.forEach(unit => {
        if (statistics.hasOwnProperty(unit.status)) {
          statistics[unit.status]++;
        }
      });

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
      console.log('UnitService: Searching units with term:', searchTerm);

      let query = supabase
        .from('units')
        .select(`
          *,
          apartments (
            name,
            code
          )
        `);

      // Apply apartment filter if provided
      if (apartmentIds && apartmentIds.length > 0) {
        query = query.in('apartment_id', apartmentIds);
      }

      // Apply search filter - search in unit_number, unit_type, and apartment name
      if (searchTerm && searchTerm.trim()) {
        query = query.or(`unit_number.ilike.%${searchTerm}%,unit_type.ilike.%${searchTerm}%,apartments.name.ilike.%${searchTerm}%`);
      }

      query = query.order('unit_number', { ascending: true });

      const { data: units, error } = await query;

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
      console.error('Error searching units:', error);
      return {
        success: false,
        message: 'Gagal mencari unit',
      };
    }
  }
}

export default new UnitService();
