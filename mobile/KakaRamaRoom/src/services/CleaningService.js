import { supabase } from '../config/supabase';
import { UNIT_STATUS, ACTIVITY_ACTIONS } from '../config/constants';
import ActivityLogService from './ActivityLogService';

class CleaningService {
  /**
   * Start cleaning timer untuk unit
   * @param {string} unitId - ID unit
   * @param {string} userId - ID user yang memulai cleaning
   * @param {string} userType - Tipe user (admin/field_team)
   */
  async startCleaning(unitId, userId, userType) {
    try {
      console.log('CleaningService: Starting cleaning for unit:', unitId);
      
      const now = new Date().toISOString();
      
      // Update unit status ke cleaning dengan timestamp
      const { error } = await supabase
        .from('units')
        .update({
          status: UNIT_STATUS.CLEANING,
          cleaning_started_at: now,
          updated_at: now
        })
        .eq('id', unitId);

      if (error) {
        throw error;
      }

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.UPDATE_UNIT_STATUS,
        `Memulai cleaning unit`,
        'units',
        unitId
      );

      return {
        success: true,
        message: 'Cleaning dimulai',
      };
    } catch (error) {
      console.error('Error starting cleaning:', error);
      return {
        success: false,
        message: 'Gagal memulai cleaning',
      };
    }
  }

  /**
   * Extend cleaning timer (maksimal 10 menit)
   * @param {string} unitId - ID unit
   * @param {number} additionalMinutes - Tambahan menit (maksimal 10)
   * @param {string} userId - ID user
   * @param {string} userType - Tipe user
   */
  async extendCleaning(unitId, additionalMinutes, userId, userType) {
    try {
      console.log('CleaningService: Extending cleaning for unit:', unitId);
      
      if (additionalMinutes > 10) {
        return {
          success: false,
          message: 'Maksimal perpanjangan cleaning adalah 10 menit',
        };
      }

      // Get current unit data
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('cleaning_started_at, cleaning_extended_minutes')
        .eq('id', unitId)
        .single();

      if (unitError || !unit) {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }

      const currentExtended = unit.cleaning_extended_minutes || 0;
      const newExtended = currentExtended + additionalMinutes;

      if (newExtended > 10) {
        return {
          success: false,
          message: `Maksimal total perpanjangan adalah 10 menit. Saat ini sudah diperpanjang ${currentExtended} menit.`,
        };
      }

      // Update extended minutes
      const { error } = await supabase
        .from('units')
        .update({
          cleaning_extended_minutes: newExtended,
          updated_at: new Date().toISOString()
        })
        .eq('id', unitId);

      if (error) {
        throw error;
      }

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.UPDATE_UNIT_STATUS,
        `Memperpanjang cleaning ${additionalMinutes} menit (total: ${newExtended} menit)`,
        'units',
        unitId
      );

      return {
        success: true,
        message: `Cleaning diperpanjang ${additionalMinutes} menit`,
      };
    } catch (error) {
      console.error('Error extending cleaning:', error);
      return {
        success: false,
        message: 'Gagal memperpanjang cleaning',
      };
    }
  }

  /**
   * Finish cleaning dan set unit ke available
   * @param {string} unitId - ID unit
   * @param {string} userId - ID user
   * @param {string} userType - Tipe user
   */
  async finishCleaning(unitId, userId, userType) {
    try {
      console.log('CleaningService: Finishing cleaning for unit:', unitId);
      
      const now = new Date().toISOString();
      
      // Update unit status ke available dan reset cleaning fields
      const { error } = await supabase
        .from('units')
        .update({
          status: UNIT_STATUS.AVAILABLE,
          cleaning_started_at: null,
          cleaning_extended_minutes: 0,
          updated_at: now
        })
        .eq('id', unitId);

      if (error) {
        throw error;
      }

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.UPDATE_UNIT_STATUS,
        `Menyelesaikan cleaning unit`,
        'units',
        unitId
      );

      return {
        success: true,
        message: 'Cleaning selesai, unit tersedia',
      };
    } catch (error) {
      console.error('Error finishing cleaning:', error);
      return {
        success: false,
        message: 'Gagal menyelesaikan cleaning',
      };
    }
  }

  /**
   * Get cleaning status untuk unit
   * @param {string} unitId - ID unit
   */
  async getCleaningStatus(unitId) {
    try {
      const { data: unit, error } = await supabase
        .from('units')
        .select('status, cleaning_started_at, cleaning_extended_minutes, unit_number')
        .eq('id', unitId)
        .single();

      if (error || !unit) {
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }

      if (unit.status !== UNIT_STATUS.CLEANING) {
        return {
          success: true,
          data: {
            isInCleaning: false,
            status: unit.status,
          },
        };
      }

      const cleaningStarted = new Date(unit.cleaning_started_at);
      const now = new Date();
      const baseDuration = 30; // 30 menit default
      const extendedMinutes = unit.cleaning_extended_minutes || 0;
      const totalDuration = baseDuration + extendedMinutes;
      
      const elapsedMinutes = Math.floor((now - cleaningStarted) / (1000 * 60));
      const remainingMinutes = totalDuration - elapsedMinutes;

      return {
        success: true,
        data: {
          isInCleaning: true,
          cleaningStarted: unit.cleaning_started_at,
          elapsedMinutes,
          remainingMinutes,
          extendedMinutes,
          canExtend: extendedMinutes < 10,
          isOvertime: remainingMinutes <= 0,
        },
      };
    } catch (error) {
      console.error('Error getting cleaning status:', error);
      return {
        success: false,
        message: 'Gagal mengambil status cleaning',
      };
    }
  }

  /**
   * Get semua unit yang sedang cleaning
   */
  async getUnitsInCleaning() {
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
        .eq('status', UNIT_STATUS.CLEANING)
        .order('cleaning_started_at', { ascending: true });

      if (error) {
        throw error;
      }

      const unitsWithStatus = await Promise.all(
        units?.map(async (unit) => {
          const statusResult = await this.getCleaningStatus(unit.id);
          return {
            ...unit,
            cleaningStatus: statusResult.success ? statusResult.data : null,
          };
        }) || []
      );

      return {
        success: true,
        data: unitsWithStatus,
      };
    } catch (error) {
      console.error('Error getting units in cleaning:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit cleaning',
      };
    }
  }

  /**
   * Auto-process cleaning yang sudah selesai (dipanggil oleh timer)
   */
  async processCompletedCleaning() {
    try {
      console.log('CleaningService: Processing completed cleaning...');
      
      const { data: units, error } = await supabase
        .from('units')
        .select('*')
        .eq('status', UNIT_STATUS.CLEANING)
        .not('cleaning_started_at', 'is', null);

      if (error) {
        throw error;
      }

      let processedCount = 0;
      const now = new Date();

      for (const unit of units || []) {
        const cleaningStarted = new Date(unit.cleaning_started_at);
        const baseDuration = 30; // 30 menit
        const extendedMinutes = unit.cleaning_extended_minutes || 0;
        const totalDuration = baseDuration + extendedMinutes;
        
        const elapsedMinutes = Math.floor((now - cleaningStarted) / (1000 * 60));
        
        if (elapsedMinutes >= totalDuration) {
          // Auto-finish cleaning
          await this.finishCleaning(unit.id, 1, 'system'); // System user
          processedCount++;
          console.log(`Auto-finished cleaning for unit: ${unit.unit_number}`);
        }
      }

      return {
        success: true,
        processedCount,
        message: `${processedCount} unit cleaning selesai otomatis`,
      };
    } catch (error) {
      console.error('Error processing completed cleaning:', error);
      return {
        success: false,
        message: 'Gagal memproses cleaning otomatis',
      };
    }
  }
}

export default new CleaningService();
