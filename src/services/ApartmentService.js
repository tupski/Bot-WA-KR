import { supabase } from '../config/supabase';
import ActivityLogService from './ActivityLogService';
import { ACTIVITY_ACTIONS } from '../config/constants';

class ApartmentService {
  // Get all apartments
  async getAllApartments() {
    try {
      console.log('ApartmentService: Fetching all apartments...');

      const { data: apartments, error } = await supabase
        .from('apartments')
        .select('*')
        .order('name', { ascending: true });

      console.log('ApartmentService: Supabase response:', { apartments, error });

      if (error) {
        console.error('ApartmentService: Supabase error:', error);
        if (error.code === 'PGRST116') {
          // Table doesn't exist, return empty array
          console.log('ApartmentService: Table not found, returning empty array');
          return {
            success: true,
            data: [],
          };
        }
        throw error;
      }

      console.log(`ApartmentService: Found ${apartments?.length || 0} apartments`);
      return {
        success: true,
        data: apartments || [],
      };
    } catch (error) {
      console.error('ApartmentService: Error getting apartments:', error);
      return {
        success: false,
        message: 'Gagal mengambil data apartemen: ' + error.message,
      };
    }
  }

  // Get active apartments
  async getActiveApartments() {
    try {
      const { data: apartments, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      return {
        success: true,
        data: apartments || [],
      };
    } catch (error) {
      console.error('Error getting active apartments:', error);
      return {
        success: false,
        message: 'Gagal mengambil data apartemen aktif',
      };
    }
  }

  // Get apartment by ID
  async getApartmentById(id) {
    try {
      const { data: apartment, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, message: 'Apartemen tidak ditemukan' };
        }
        throw error;
      }

      if (apartment) {
        return {
          success: true,
          data: apartment,
        };
      } else {
        return {
          success: false,
          message: 'Apartemen tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error getting apartment by ID:', error);
      return {
        success: false,
        message: 'Gagal mengambil data apartemen',
      };
    }
  }

  // Get apartments by IDs (untuk field team)
  async getApartmentsByIds(ids) {
    try {
      if (!ids || ids.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      const { data: apartments, error } = await supabase
        .from('apartments')
        .select('*')
        .in('id', ids)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      return {
        success: true,
        data: apartments || [],
      };
    } catch (error) {
      console.error('Error getting apartments by IDs:', error);
      return {
        success: false,
        message: 'Gagal mengambil data apartemen',
      };
    }
  }

  // Create apartment
  async createApartment(apartmentData, userId) {
    try {
      const { name, code, address, description } = apartmentData;

      // Check if code already exists
      const { data: existing, error: checkError } = await supabase
        .from('apartments')
        .select('id')
        .eq('code', code)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          message: 'Kode apartemen sudah digunakan',
        };
      }

      // Insert new apartment
      const { data: newApartment, error: insertError } = await supabase
        .from('apartments')
        .insert([{
          name,
          code,
          address,
          description,
          status: 'active'
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const apartmentId = newApartment.id;

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        'admin',
        ACTIVITY_ACTIONS.CREATE_APARTMENT,
        `Membuat apartemen baru: ${name} (${code})`,
        'apartments',
        apartmentId
      );

      return {
        success: true,
        data: { id: apartmentId, ...apartmentData },
        message: 'Apartemen berhasil dibuat',
      };
    } catch (error) {
      console.error('Error creating apartment:', error);
      return {
        success: false,
        message: 'Gagal membuat apartemen',
      };
    }
  }

  // Update apartment
  async updateApartment(id, apartmentData, userId) {
    try {
      const { name, code, address, description, status } = apartmentData;

      // Check if code already exists (exclude current apartment)
      const { data: existing, error: checkError } = await supabase
        .from('apartments')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          message: 'Kode apartemen sudah digunakan',
        };
      }

      // Update apartment
      const { data: updatedApartment, error: updateError } = await supabase
        .from('apartments')
        .update({
          name,
          code,
          address,
          description,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (updatedApartment) {
        // Log activity
        await ActivityLogService.logActivity(
          userId,
          'admin',
          ACTIVITY_ACTIONS.UPDATE_APARTMENT,
          `Memperbarui apartemen: ${name} (${code})`,
          'apartments',
          id
        );

        return {
          success: true,
          message: 'Apartemen berhasil diperbarui',
        };
      } else {
        return {
          success: false,
          message: 'Apartemen tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error updating apartment:', error);
      return {
        success: false,
        message: 'Gagal memperbarui apartemen',
      };
    }
  }

  // Delete apartment
  async deleteApartment(id, userId) {
    try {
      console.log('ApartmentService: Deleting apartment:', id);

      // Check if apartment has units
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('apartment_id', id);

      if (unitsError) {
        throw unitsError;
      }

      if (units && units.length > 0) {
        return {
          success: false,
          message: 'Tidak dapat menghapus apartemen yang masih memiliki unit',
        };
      }

      // Check if apartment has team assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('team_apartment_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('apartment_id', id);

      if (assignmentsError) {
        throw assignmentsError;
      }

      if (assignments && assignments.length > 0) {
        return {
          success: false,
          message: 'Tidak dapat menghapus apartemen yang masih memiliki assignment tim',
        };
      }

      // Get apartment name for logging
      const { data: apartment, error: apartmentError } = await supabase
        .from('apartments')
        .select('name, code')
        .eq('id', id)
        .single();

      if (apartmentError || !apartment) {
        return {
          success: false,
          message: 'Apartemen tidak ditemukan',
        };
      }

      // Delete apartment
      const { error: deleteError } = await supabase
        .from('apartments')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        'admin',
        ACTIVITY_ACTIONS.DELETE_APARTMENT,
        `Menghapus apartemen: ${apartment.name} (${apartment.code})`,
        'apartments',
        id
      );

      return {
        success: true,
        message: 'Apartemen berhasil dihapus',
      };
    } catch (error) {
      console.error('Error deleting apartment:', error);
      return {
        success: false,
        message: 'Gagal menghapus apartemen',
      };
    }
  }

  // Get apartment statistics
  async getApartmentStatistics() {
    try {
      const db = DatabaseManager.getDatabase();
      
      // Get total apartments
      const totalResult = await db.executeSql(
        'SELECT COUNT(*) as total FROM apartments'
      );

      // Get active apartments
      const activeResult = await db.executeSql(
        "SELECT COUNT(*) as active FROM apartments WHERE status = 'active'"
      );

      // Get apartments with units
      const withUnitsResult = await db.executeSql(
        `SELECT COUNT(DISTINCT a.id) as with_units 
         FROM apartments a 
         INNER JOIN units u ON a.id = u.apartment_id`
      );

      // Get apartments with team assignments
      const withTeamsResult = await db.executeSql(
        `SELECT COUNT(DISTINCT a.id) as with_teams 
         FROM apartments a 
         INNER JOIN team_apartment_assignments taa ON a.id = taa.apartment_id`
      );

      return {
        success: true,
        data: {
          total: totalResult[0].rows.item(0).total,
          active: activeResult[0].rows.item(0).active,
          withUnits: withUnitsResult[0].rows.item(0).with_units,
          withTeams: withTeamsResult[0].rows.item(0).with_teams,
        },
      };
    } catch (error) {
      console.error('Error getting apartment statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik apartemen',
      };
    }
  }

  // Search apartments
  async searchApartments(searchTerm) {
    try {
      const { data: apartments, error } = await supabase
        .from('apartments')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      return {
        success: true,
        data: apartments || [],
      };
    } catch (error) {
      console.error('Error searching apartments:', error);
      return {
        success: false,
        message: 'Gagal mencari apartemen',
      };
    }
  }
}

export default new ApartmentService();
