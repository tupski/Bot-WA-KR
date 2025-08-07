// Konfigurasi Supabase untuk React Native
// File: mobile/KakaRamaRoom/src/config/supabase.js

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://rvcknyuinfssgpgkfetx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjE2OTgsImV4cCI6MjA3MDA5NzY5OH0.FXWPp9L4xZ3uw34Iob7QvlEsePTdBmGmgRufXBZZ34c';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database service class untuk React Native
class SupabaseService {
  // Authentication
  async signIn(username, password, userType = 'admin') {
    try {
      // Custom authentication since we're not using Supabase Auth
      const table = userType === 'admin' ? 'admins' : 'field_teams';
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('username', username)
        .eq('password', password) // In production, use proper password hashing
        .single();

      if (error || !data) {
        return { success: false, message: 'Username atau password salah' };
      }

      // Store user session in AsyncStorage
      await AsyncStorage.setItem('user_session', JSON.stringify({
        id: data.id,
        username: data.username,
        fullName: data.full_name,
        userType,
        loginTime: new Date().toISOString()
      }));

      return { success: true, user: data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, message: 'Gagal login' };
    }
  }

  async signOut() {
    try {
      await AsyncStorage.removeItem('user_session');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false };
    }
  }

  async getCurrentUser() {
    try {
      const session = await AsyncStorage.getItem('user_session');
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Apartments
  async getAllApartments() {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .order('name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get apartments error:', error);
      return { success: false, message: 'Gagal mengambil data apartemen' };
    }
  }

  async createApartment(apartmentData, userId) {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .insert([{
          name: apartmentData.name,
          code: apartmentData.code,
          whatsapp_group_id: apartmentData.whatsappGroupId,
          address: apartmentData.address,
          description: apartmentData.description,
          status: apartmentData.status || 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await this.logActivity(
        userId,
        'admin',
        'create_apartment',
        `Membuat apartemen baru: ${apartmentData.name}`,
        'apartments',
        data.id
      );

      return { success: true, data, message: 'Apartemen berhasil dibuat' };
    } catch (error) {
      console.error('Create apartment error:', error);
      return { success: false, message: 'Gagal membuat apartemen' };
    }
  }

  // Units
  async getAllUnits() {
    try {
      const { data, error } = await supabase
        .from('units_with_apartment')
        .select('*')
        .order('apartment_name', { ascending: true })
        .order('unit_number', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get units error:', error);
      return { success: false, message: 'Gagal mengambil data unit' };
    }
  }

  async getAvailableUnits(apartmentIds = null) {
    try {
      let query = supabase
        .from('units_with_apartment')
        .select('*')
        .eq('status', 'available')
        .order('apartment_name')
        .order('unit_number');

      if (apartmentIds && apartmentIds.length > 0) {
        query = query.in('apartment_id', apartmentIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Get available units error:', error);
      return { success: false, message: 'Gagal mengambil unit tersedia' };
    }
  }

  // Checkins
  async createCheckin(checkinData, userId, userType) {
    try {
      const checkoutTime = new Date();
      checkoutTime.setHours(checkoutTime.getHours() + checkinData.durationHours);

      const { data, error } = await supabase
        .from('checkins')
        .insert([{
          apartment_id: checkinData.apartmentId,
          unit_id: checkinData.unitId,
          team_id: userType === 'field_team' ? userId : null,
          duration_hours: checkinData.durationHours,
          checkout_time: checkoutTime.toISOString(),
          payment_method: checkinData.paymentMethod,
          payment_amount: checkinData.paymentAmount,
          payment_proof_path: checkinData.paymentProofPath,
          marketing_name: checkinData.marketingName,
          notes: checkinData.notes,
          status: 'active',
          created_by: userId
        }])
        .select()
        .single();

      if (error) throw error;

      // Update unit status
      await this.updateUnitStatus(checkinData.unitId, 'occupied', userId, userType);

      return { success: true, data, message: 'Checkin berhasil dibuat' };
    } catch (error) {
      console.error('Create checkin error:', error);
      return { success: false, message: 'Gagal membuat checkin' };
    }
  }

  async getActiveCheckins(teamId = null) {
    try {
      let query = supabase
        .from('checkins_with_details')
        .select('*')
        .in('status', ['active', 'extended'])
        .order('checkout_time');

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Get active checkins error:', error);
      return { success: false, message: 'Gagal mengambil checkin aktif' };
    }
  }

  // Real-time subscriptions
  subscribeToCheckins(callback) {
    return supabase
      .channel('checkins_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'checkins' }, 
        callback
      )
      .subscribe();
  }

  subscribeToUnits(callback) {
    return supabase
      .channel('units_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'units' }, 
        callback
      )
      .subscribe();
  }

  // Helper method to update unit status
  async updateUnitStatus(unitId, status, userId, userType) {
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

      // Log activity
      await this.logActivity(
        userId,
        userType,
        'update_unit_status',
        `Update status unit menjadi ${status}`,
        'units',
        unitId
      );

      return { success: true, data };
    } catch (error) {
      console.error('Update unit status error:', error);
      return { success: false, message: 'Gagal update status unit' };
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
      console.error('Log activity error:', error);
      return { success: false };
    }
  }
}

export default new SupabaseService();
