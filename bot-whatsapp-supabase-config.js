// Konfigurasi Supabase untuk Bot WhatsApp
// File: config/supabase.js

const { createClient } = require('@supabase/supabase-js');

// SECURITY: Keys moved to environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for full access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database helper functions for bot
class SupabaseBot {
  // Get apartment by WhatsApp group ID
  async getApartmentByGroupId(groupId) {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('whatsapp_group_id', groupId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting apartment by group ID:', error);
      return { success: false, error: error.message };
    }
  }

  // Get available units for apartment
  async getAvailableUnits(apartmentId) {
    try {
      const { data, error } = await supabase
        .from('units_with_apartment')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('status', 'available')
        .order('unit_number');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting available units:', error);
      return { success: false, error: error.message };
    }
  }

  // Create checkin from WhatsApp
  async createCheckin(checkinData) {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .insert([{
          apartment_id: checkinData.apartmentId,
          unit_id: checkinData.unitId,
          team_id: null, // Bot checkin doesn't have team
          duration_hours: checkinData.durationHours,
          checkout_time: checkinData.checkoutTime,
          payment_method: checkinData.paymentMethod,
          payment_amount: checkinData.paymentAmount,
          marketing_name: checkinData.marketingName,
          notes: checkinData.notes,
          status: 'active',
          created_by: null // Bot user
        }])
        .select()
        .single();

      if (error) throw error;

      // Update unit status to occupied
      await this.updateUnitStatus(checkinData.unitId, 'occupied');

      // Log activity
      await this.logActivity(
        null,
        'system',
        'create_checkin',
        `Checkin baru dari WhatsApp untuk unit ${checkinData.unitNumber}`,
        'checkins',
        data.id
      );

      return { success: true, data };
    } catch (error) {
      console.error('Error creating checkin:', error);
      return { success: false, error: error.message };
    }
  }

  // Update unit status
  async updateUnitStatus(unitId, status) {
    try {
      const updateData = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'cleaning') {
        updateData.cleaning_started_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('units')
        .update(updateData)
        .eq('id', unitId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating unit status:', error);
      return { success: false, error: error.message };
    }
  }

  // Get active checkins for apartment
  async getActiveCheckins(apartmentId = null) {
    try {
      let query = supabase
        .from('checkins_with_details')
        .select('*')
        .in('status', ['active', 'extended'])
        .order('checkout_time');

      if (apartmentId) {
        query = query.eq('apartment_id', apartmentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error getting active checkins:', error);
      return { success: false, error: error.message };
    }
  }

  // Extend checkin
  async extendCheckin(checkinId, additionalHours, paymentData = {}) {
    try {
      // Get current checkin
      const { data: checkin, error: checkinError } = await supabase
        .from('checkins')
        .select('*')
        .eq('id', checkinId)
        .single();

      if (checkinError) throw checkinError;

      const currentCheckoutTime = new Date(checkin.checkout_time);
      const newCheckoutTime = new Date(currentCheckoutTime.getTime() + (additionalHours * 60 * 60 * 1000));

      // Insert extension record
      const { error: extensionError } = await supabase
        .from('checkin_extensions')
        .insert([{
          checkin_id: checkinId,
          additional_hours: additionalHours,
          new_checkout_time: newCheckoutTime.toISOString(),
          payment_method: paymentData.paymentMethod,
          payment_amount: paymentData.paymentAmount,
          notes: paymentData.notes,
          created_by: null // Bot user
        }]);

      if (extensionError) throw extensionError;

      // Update checkin
      const { data, error } = await supabase
        .from('checkins')
        .update({
          checkout_time: newCheckoutTime.toISOString(),
          status: 'extended',
          updated_at: new Date().toISOString()
        })
        .eq('id', checkinId)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await this.logActivity(
        null,
        'system',
        'extend_checkin',
        `Extend checkin dari WhatsApp selama ${additionalHours} jam`,
        'checkins',
        checkinId
      );

      return { success: true, data };
    } catch (error) {
      console.error('Error extending checkin:', error);
      return { success: false, error: error.message };
    }
  }

  // Process auto-checkout
  async processAutoCheckout() {
    try {
      const { data, error } = await supabase.rpc('process_auto_checkout');
      if (error) throw error;

      // Log each auto-checkout
      for (const checkout of data) {
        await this.logActivity(
          null,
          'system',
          'auto_checkout',
          `Auto-checkout unit ${checkout.unit_number} (${checkout.apartment_name})`,
          'checkins',
          checkout.checkin_id
        );
      }

      return { success: true, data, count: data.length };
    } catch (error) {
      console.error('Error processing auto-checkout:', error);
      return { success: false, error: error.message };
    }
  }

  // Log activity
  async logActivity(userId, userType, action, description, targetTable = null, targetId = null, metadata = null) {
    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          user_type: userType,
          action,
          description,
          target_table: targetTable,
          target_id: targetId,
          metadata
        }]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  }

  // Get daily report for WhatsApp
  async getDailyReport(apartmentId, date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('checkins_with_details')
        .select('*')
        .eq('apartment_id', apartmentId)
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const stats = {
        total: data.length,
        completed: data.filter(c => c.status === 'completed').length,
        active: data.filter(c => ['active', 'extended'].includes(c.status)).length,
        revenue: data.reduce((sum, c) => sum + (parseFloat(c.payment_amount) || 0), 0)
      };

      return { success: true, data, stats };
    } catch (error) {
      console.error('Error getting daily report:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscribe to real-time changes
  subscribeToChanges(table, callback) {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }
}

module.exports = { supabase, SupabaseBot: new SupabaseBot() };
