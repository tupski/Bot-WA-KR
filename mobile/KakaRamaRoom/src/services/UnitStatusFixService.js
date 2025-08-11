/**
 * Unit Status Fix Service
 * Service untuk memperbaiki status unit yang inconsistent
 */

import { supabase } from '../config/supabase';

class UnitStatusFixService {
  /**
   * Fix units yang statusnya 'occupied' tapi tidak ada checkin aktif
   */
  static async fixOrphanedOccupiedUnits() {
    try {
      console.log('UnitStatusFixService: Checking for orphaned occupied units...');

      // Get all units yang statusnya occupied
      const { data: occupiedUnits, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, status, apartments(name)')
        .eq('status', 'occupied');

      if (unitsError) {
        console.error('UnitStatusFixService: Error fetching occupied units:', unitsError);
        return { success: false, message: unitsError.message };
      }

      if (!occupiedUnits || occupiedUnits.length === 0) {
        console.log('UnitStatusFixService: No occupied units found');
        return { success: true, message: 'No occupied units to check', fixed: 0 };
      }

      console.log(`UnitStatusFixService: Found ${occupiedUnits.length} occupied units`);

      let fixedCount = 0;
      const fixedUnits = [];

      // Check each occupied unit
      for (const unit of occupiedUnits) {
        // Check if unit has active checkin
        const { data: activeCheckins, error: checkinError } = await supabase
          .from('checkins')
          .select('id, status, checkout_time')
          .eq('unit_id', unit.id)
          .eq('status', 'active');

        if (checkinError) {
          console.error(`UnitStatusFixService: Error checking checkins for unit ${unit.id}:`, checkinError);
          continue;
        }

        // If no active checkin, unit should not be occupied
        if (!activeCheckins || activeCheckins.length === 0) {
          console.log(`UnitStatusFixService: Unit ${unit.unit_number} (${unit.apartments?.name}) has no active checkin, fixing status...`);

          // Check if there are any completed checkins recently (within 2 hours)
          const twoHoursAgo = new Date();
          twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

          const { data: recentCheckins } = await supabase
            .from('checkins')
            .select('id, status, actual_checkout_time, checkout_time')
            .eq('unit_id', unit.id)
            .eq('status', 'completed')
            .gte('updated_at', twoHoursAgo.toISOString())
            .order('updated_at', { ascending: false })
            .limit(1);

          let newStatus = 'available';
          
          // If there's a recent completed checkin, set to cleaning
          if (recentCheckins && recentCheckins.length > 0) {
            const recentCheckin = recentCheckins[0];
            const checkoutTime = new Date(recentCheckin.actual_checkout_time || recentCheckin.checkout_time);
            const now = new Date();
            const minutesSinceCheckout = (now - checkoutTime) / (1000 * 60);

            if (minutesSinceCheckout < 45) { // Less than 45 minutes since checkout
              newStatus = 'cleaning';
            }
          }

          // Update unit status
          const { error: updateError } = await supabase
            .from('units')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', unit.id);

          if (updateError) {
            console.error(`UnitStatusFixService: Error updating unit ${unit.id}:`, updateError);
          } else {
            console.log(`UnitStatusFixService: Unit ${unit.unit_number} status updated to ${newStatus}`);
            fixedCount++;
            fixedUnits.push({
              id: unit.id,
              unit_number: unit.unit_number,
              apartment: unit.apartments?.name,
              oldStatus: 'occupied',
              newStatus: newStatus
            });
          }
        } else {
          console.log(`UnitStatusFixService: Unit ${unit.unit_number} has active checkin, status is correct`);
        }
      }

      console.log(`UnitStatusFixService: Fixed ${fixedCount} units`);

      return {
        success: true,
        message: `Fixed ${fixedCount} orphaned occupied units`,
        fixed: fixedCount,
        fixedUnits: fixedUnits
      };

    } catch (error) {
      console.error('UnitStatusFixService: Error in fixOrphanedOccupiedUnits:', error);
      return {
        success: false,
        message: error.message,
        fixed: 0
      };
    }
  }

  /**
   * Fix units yang statusnya 'cleaning' terlalu lama
   */
  static async fixStuckCleaningUnits() {
    try {
      console.log('UnitStatusFixService: Checking for stuck cleaning units...');

      // Get units yang statusnya cleaning lebih dari 2 jam
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const { data: cleaningUnits, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, status, updated_at, apartments(name)')
        .eq('status', 'cleaning')
        .lt('updated_at', twoHoursAgo.toISOString());

      if (unitsError) {
        console.error('UnitStatusFixService: Error fetching cleaning units:', unitsError);
        return { success: false, message: unitsError.message };
      }

      if (!cleaningUnits || cleaningUnits.length === 0) {
        console.log('UnitStatusFixService: No stuck cleaning units found');
        return { success: true, message: 'No stuck cleaning units', fixed: 0 };
      }

      console.log(`UnitStatusFixService: Found ${cleaningUnits.length} stuck cleaning units`);

      let fixedCount = 0;
      const fixedUnits = [];

      // Update all stuck cleaning units to available
      for (const unit of cleaningUnits) {
        const { error: updateError } = await supabase
          .from('units')
          .update({
            status: 'available',
            updated_at: new Date().toISOString()
          })
          .eq('id', unit.id);

        if (updateError) {
          console.error(`UnitStatusFixService: Error updating unit ${unit.id}:`, updateError);
        } else {
          console.log(`UnitStatusFixService: Unit ${unit.unit_number} status updated from cleaning to available`);
          fixedCount++;
          fixedUnits.push({
            id: unit.id,
            unit_number: unit.unit_number,
            apartment: unit.apartments?.name,
            oldStatus: 'cleaning',
            newStatus: 'available'
          });
        }
      }

      return {
        success: true,
        message: `Fixed ${fixedCount} stuck cleaning units`,
        fixed: fixedCount,
        fixedUnits: fixedUnits
      };

    } catch (error) {
      console.error('UnitStatusFixService: Error in fixStuckCleaningUnits:', error);
      return {
        success: false,
        message: error.message,
        fixed: 0
      };
    }
  }

  /**
   * Run all unit status fixes
   */
  static async runAllFixes() {
    console.log('UnitStatusFixService: Running all unit status fixes...');

    const results = {
      orphanedOccupied: await this.fixOrphanedOccupiedUnits(),
      stuckCleaning: await this.fixStuckCleaningUnits(),
    };

    const totalFixed = results.orphanedOccupied.fixed + results.stuckCleaning.fixed;

    console.log('UnitStatusFixService: All fixes completed');
    console.log(`- Orphaned occupied units fixed: ${results.orphanedOccupied.fixed}`);
    console.log(`- Stuck cleaning units fixed: ${results.stuckCleaning.fixed}`);
    console.log(`- Total units fixed: ${totalFixed}`);

    return {
      success: true,
      totalFixed: totalFixed,
      results: results
    };
  }

  /**
   * Get unit status summary
   */
  static async getUnitStatusSummary() {
    try {
      const { data: summary, error } = await supabase
        .from('units')
        .select('status')
        .eq('status', 'available')
        .union(
          supabase.from('units').select('status').eq('status', 'occupied')
        )
        .union(
          supabase.from('units').select('status').eq('status', 'cleaning')
        )
        .union(
          supabase.from('units').select('status').eq('status', 'maintenance')
        );

      if (error) {
        console.error('UnitStatusFixService: Error getting status summary:', error);
        return null;
      }

      // Count by status
      const statusCount = {
        available: 0,
        occupied: 0,
        cleaning: 0,
        maintenance: 0
      };

      summary?.forEach(unit => {
        if (statusCount.hasOwnProperty(unit.status)) {
          statusCount[unit.status]++;
        }
      });

      return statusCount;

    } catch (error) {
      console.error('UnitStatusFixService: Error in getUnitStatusSummary:', error);
      return null;
    }
  }
}

export default UnitStatusFixService;
