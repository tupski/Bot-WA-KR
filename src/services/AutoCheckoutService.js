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
   * Proses auto-checkout untuk semua checkin yang sudah habis waktu dengan error handling yang robust
   * @returns {Object} - Result dengan jumlah unit yang di-checkout
   */
  async processAutoCheckout() {
    try {
      console.log('AutoCheckoutService: Starting auto-checkout process...');
      const now = new Date();
      const nowISO = now.toISOString();

      // Validasi supabase connection
      if (!supabase) {
        throw new Error('Supabase connection not available');
      }

      console.log(`AutoCheckoutService: Checking for expired checkins at ${nowISO}`);

      // Get checkin yang sudah habis waktu tapi masih aktif dengan retry mechanism
      let expiredCheckins = [];
      let queryAttempts = 0;
      const maxQueryAttempts = 3;

      while (queryAttempts < maxQueryAttempts) {
        try {
          const { data, error } = await supabase
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
            .lte('checkout_time', nowISO)
            .order('checkout_time', { ascending: true });

          if (error) {
            if (error.code === 'PGRST116') {
              console.log('AutoCheckoutService: Checkins table not found');
              return {
                success: true,
                processedCount: 0,
                processedUnits: [],
                message: 'No checkins table found',
              };
            }

            if (error.code === 'PGRST301' && queryAttempts < maxQueryAttempts - 1) {
              // Connection error, retry
              queryAttempts++;
              console.warn(`AutoCheckoutService: Connection error, retrying (${queryAttempts}/${maxQueryAttempts}):`, error);
              await new Promise(resolve => setTimeout(resolve, 1000 * queryAttempts));
              continue;
            }

            throw error;
          }

          expiredCheckins = data || [];
          break;

        } catch (queryError) {
          queryAttempts++;
          if (queryAttempts >= maxQueryAttempts) {
            throw queryError;
          }
          console.warn(`AutoCheckoutService: Query error, retrying (${queryAttempts}/${maxQueryAttempts}):`, queryError);
          await new Promise(resolve => setTimeout(resolve, 1000 * queryAttempts));
        }
      }

      console.log(`AutoCheckoutService: Found ${expiredCheckins.length} expired checkins`);

      if (expiredCheckins.length === 0) {
        return {
          success: true,
          processedCount: 0,
          processedUnits: [],
          message: 'No expired checkins found',
        };
      }

      let processedCount = 0;
      let failedCount = 0;
      const processedUnits = [];
      const failedUnits = [];

      // Process setiap checkin yang expired dengan error handling yang robust
      for (const checkin of expiredCheckins) {
        try {
          console.log(`AutoCheckoutService: Processing checkin ${checkin.id} for unit ${checkin.units?.unit_number}`);

          // Validasi data checkin
          if (!checkin.id || !checkin.unit_id) {
            console.error(`AutoCheckoutService: Invalid checkin data:`, checkin);
            failedCount++;
            failedUnits.push({
              checkinId: checkin.id,
              unitNumber: checkin.units?.unit_number,
              error: 'Invalid checkin data',
            });
            continue;
          }

          // Update status checkin menjadi completed dengan retry
          let updateAttempts = 0;
          const maxUpdateAttempts = 3;
          let updateSuccess = false;

          while (updateAttempts < maxUpdateAttempts && !updateSuccess) {
            try {
              const { error: updateError } = await supabase
                .from('checkins')
                .update({
                  status: 'completed',
                  updated_at: nowISO
                })
                .eq('id', checkin.id);

              if (updateError) {
                if (updateError.code === 'PGRST301' && updateAttempts < maxUpdateAttempts - 1) {
                  // Connection error, retry
                  updateAttempts++;
                  console.warn(`AutoCheckoutService: Update error, retrying (${updateAttempts}/${maxUpdateAttempts}):`, updateError);
                  await new Promise(resolve => setTimeout(resolve, 1000 * updateAttempts));
                  continue;
                }
                throw updateError;
              }

              updateSuccess = true;
            } catch (updateError) {
              updateAttempts++;
              if (updateAttempts >= maxUpdateAttempts) {
                throw updateError;
              }
              console.warn(`AutoCheckoutService: Update retry ${updateAttempts}/${maxUpdateAttempts} for checkin ${checkin.id}:`, updateError);
              await new Promise(resolve => setTimeout(resolve, 1000 * updateAttempts));
            }
          }

          // Update status unit menjadi cleaning dengan error handling
          try {
            const unitUpdateResult = await UnitService.updateUnitStatus(
              checkin.unit_id,
              UNIT_STATUS.CLEANING,
              1, // System user ID
              'system'
            );

            if (!unitUpdateResult || !unitUpdateResult.success) {
              console.warn(`AutoCheckoutService: Unit status update failed for unit ${checkin.unit_id}:`, unitUpdateResult);
              // Continue anyway, don't fail the whole process
            }
          } catch (unitError) {
            console.error(`AutoCheckoutService: Error updating unit status for unit ${checkin.unit_id}:`, unitError);
            // Continue anyway, don't fail the whole process
          }

          // Log aktivitas auto-checkout dengan error handling
          try {
            await ActivityLogService.logActivity(
              1, // System user ID
              'system',
              ACTIVITY_ACTIONS.AUTO_CHECKOUT,
              `Auto-checkout unit ${checkin.units?.unit_number} (${checkin.units?.apartments?.name}) - Checkin ID: ${checkin.id}`,
              'checkins',
              checkin.id
            );
          } catch (logError) {
            console.error(`AutoCheckoutService: Error logging activity for checkin ${checkin.id}:`, logError);
            // Continue anyway, don't fail the whole process
          }

          processedCount++;
          processedUnits.push({
            unitNumber: checkin.units?.unit_number,
            apartmentName: checkin.units?.apartments?.name,
            checkinId: checkin.id,
            checkoutTime: checkin.checkout_time,
          });

          console.log(`AutoCheckoutService: Successfully processed auto-checkout for unit ${checkin.units?.unit_number} (${checkin.units?.apartments?.name})`);

        } catch (error) {
          console.error(`AutoCheckoutService: Critical error processing auto-checkout for checkin ${checkin.id}:`, error);
          failedCount++;
          failedUnits.push({
            checkinId: checkin.id,
            unitNumber: checkin.units?.unit_number,
            apartmentName: checkin.units?.apartments?.name,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Prepare detailed result
      const totalCheckins = expiredCheckins.length;
      const successRate = totalCheckins > 0 ? (processedCount / totalCheckins * 100).toFixed(1) : 0;

      console.log(`AutoCheckoutService: Auto-checkout completed. Processed: ${processedCount}/${totalCheckins} (${successRate}%), Failed: ${failedCount}`);

      return {
        success: true,
        processedCount,
        failedCount,
        totalCheckins,
        successRate: parseFloat(successRate),
        processedUnits,
        failedUnits,
        message: `Auto-checkout completed: ${processedCount} unit berhasil, ${failedCount} gagal dari ${totalCheckins} total`,
      };
    } catch (error) {
      console.error('AutoCheckoutService: Critical error in processAutoCheckout:', error);
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        totalCheckins: 0,
        successRate: 0,
        processedUnits: [],
        failedUnits: [],
        message: `Gagal melakukan auto-checkout: ${error.message || 'Unknown error'}`,
        error: error.message,
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
   * Start auto-checkout scheduler dengan error handling yang robust
   * @param {number} intervalMinutes - Interval dalam menit untuk menjalankan auto-checkout
   * @returns {number} - Interval ID untuk menghentikan scheduler
   */
  startAutoCheckoutScheduler(intervalMinutes = 5) {
    try {
      console.log(`AutoCheckoutService: Starting auto-checkout scheduler with ${intervalMinutes} minute interval`);

      // Validasi parameter
      if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
        throw new Error('Invalid interval minutes');
      }

      // Jalankan auto-checkout pertama kali dengan error handling
      this.processAutoCheckout()
        .then(result => {
          console.log('AutoCheckoutService: Initial auto-checkout completed:', result);
        })
        .catch(error => {
          console.error('AutoCheckoutService: Error in initial auto-checkout:', error);
        });

      // Set interval untuk menjalankan auto-checkout secara berkala
      const intervalId = setInterval(async () => {
        try {
          console.log('AutoCheckoutService: Running scheduled auto-checkout...');
          const result = await this.processAutoCheckout();

          if (result.success) {
            if (result.processedCount > 0) {
              console.log(`AutoCheckoutService: Scheduled auto-checkout processed ${result.processedCount} units (${result.successRate}% success rate)`);
            } else {
              console.log('AutoCheckoutService: Scheduled auto-checkout completed - no expired checkins found');
            }

            if (result.failedCount > 0) {
              console.warn(`AutoCheckoutService: ${result.failedCount} units failed during auto-checkout`);
            }
          } else {
            console.error('AutoCheckoutService: Scheduled auto-checkout failed:', result.message);
          }
        } catch (scheduledError) {
          console.error('AutoCheckoutService: Critical error in scheduled auto-checkout:', scheduledError);
        }
      }, intervalMinutes * 60 * 1000);

      console.log(`AutoCheckoutService: Auto-checkout scheduler started with interval ID: ${intervalId}`);
      return intervalId;
    } catch (error) {
      console.error('AutoCheckoutService: Error starting auto-checkout scheduler:', error);
      throw error;
    }
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
