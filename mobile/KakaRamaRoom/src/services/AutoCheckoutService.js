import { supabase } from '../config/supabase';
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
      console.log('AutoCheckoutService: Processing auto-checkout...');
      const now = new Date().toISOString();

      // Get checkin yang sudah habis waktu tapi masih aktif
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
        .lte('checkout_time', now)
        .order('checkout_time', { ascending: true });

      if (error) {
        console.error('Error fetching expired checkins:', error);
        return {
          success: false,
          message: 'Gagal mengambil data checkin expired',
        };
      }

      let processedCount = 0;
      const processedUnits = [];

      // Process setiap checkin yang expired
      for (const checkin of expiredCheckins || []) {
        try {
          // Update status checkin menjadi completed
          const { error: updateError } = await supabase
            .from('checkins')
            .update({
              status: 'completed',
              updated_at: now
            })
            .eq('id', checkin.id);

          if (updateError) {
            console.error(`Error updating checkin ${checkin.id}:`, updateError);
            continue;
          }

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
            `Auto-checkout unit ${checkin.units?.unit_number} (${checkin.units?.apartments?.name}) - Checkin ID: ${checkin.id}`,
            'checkins',
            checkin.id
          );

          processedCount++;
          processedUnits.push({
            unitNumber: checkin.units?.unit_number,
            apartmentName: checkin.units?.apartments?.name,
            checkinId: checkin.id,
            checkoutTime: checkin.checkout_time,
          });

          console.log(`Auto-checkout processed: Unit ${checkin.units?.unit_number} (${checkin.units?.apartments?.name})`);
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
      const now = new Date();
      const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

      const { data: checkins, error } = await supabase
        .from('checkins')
        .select(`
          *,
          units (
            unit_number,
            apartments (
              name
            )
          ),
          field_teams (
            full_name
          )
        `)
        .in('status', ['active', 'extended'])
        .gte('checkout_time', now.toISOString())
        .lte('checkout_time', futureTime.toISOString())
        .order('checkout_time', { ascending: true });

      if (error) {
        console.error('Error getting upcoming expired checkins:', error);
        return {
          success: false,
          message: 'Gagal mengambil data checkin yang akan expired',
        };
      }

      const upcomingExpired = checkins?.map(checkin => {
        const checkoutTime = new Date(checkin.checkout_time);
        const minutesRemaining = Math.ceil((checkoutTime - now) / (1000 * 60));

        return {
          ...checkin,
          unit_number: checkin.units?.unit_number,
          apartment_name: checkin.units?.apartments?.name,
          team_name: checkin.field_teams?.full_name,
          minutesRemaining,
        };
      }) || [];

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
      console.log('AutoCheckoutService: Getting auto-checkout statistics...');

      // Simplified implementation - get activity logs for auto-checkout
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('action', ACTIVITY_ACTIONS.AUTO_CHECKOUT);

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data: logs, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting auto-checkout statistics:', error);
        return {
          success: false,
          message: 'Gagal mengambil statistik auto-checkout',
        };
      }

      // Group by date
      const dailyStats = {};
      logs?.forEach(log => {
        const date = log.created_at.split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            total_auto_checkouts: 0,
            unique_checkins: new Set(),
          };
        }
        dailyStats[date].total_auto_checkouts++;
        if (log.related_id) {
          dailyStats[date].unique_checkins.add(log.related_id);
        }
      });

      const dailyStatistics = Object.values(dailyStats).map(stat => ({
        ...stat,
        unique_checkins: stat.unique_checkins.size,
      }));

      return {
        success: true,
        data: {
          dailyStatistics,
          totalAutoCheckouts: logs?.length || 0,
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
      console.log('AutoCheckoutService: Simulating auto-checkout for checkin:', checkinId);

      // Get checkin data
      const { data: checkin, error } = await supabase
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
        .eq('id', checkinId)
        .in('status', ['active', 'extended'])
        .single();

      if (error || !checkin) {
        return {
          success: false,
          message: 'Checkin tidak ditemukan atau sudah selesai',
        };
      }

      const now = new Date().toISOString();

      // Update status checkin menjadi completed
      const { error: updateError } = await supabase
        .from('checkins')
        .update({
          status: 'completed',
          updated_at: now
        })
        .eq('id', checkinId);

      if (updateError) {
        throw updateError;
      }

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
        `Simulasi auto-checkout unit ${checkin.units?.unit_number} (${checkin.units?.apartments?.name}) - Checkin ID: ${checkinId}`,
        'checkins',
        checkinId
      );

      return {
        success: true,
        message: `Simulasi auto-checkout berhasil untuk unit ${checkin.units?.unit_number}`,
        data: {
          unitNumber: checkin.units?.unit_number,
          apartmentName: checkin.units?.apartments?.name,
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
