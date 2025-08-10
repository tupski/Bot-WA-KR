import { supabase } from '../config/supabase';
import AuthService from './AuthService';

class TeamAssignmentService {
  /**
   * Get apartment IDs yang bisa diakses oleh user saat ini
   * @returns {Array|null} Array of apartment IDs atau null untuk admin (akses semua)
   */
  getCurrentUserApartmentIds() {
    try {
      const currentUser = AuthService.getCurrentUser();

      if (!currentUser) {
        console.warn('TeamAssignmentService: No current user found');
        return [];
      }

      console.log('TeamAssignmentService: Current user:', currentUser.id, currentUser.role);

      // Admin bisa akses semua apartemen
      if (currentUser.role === 'admin') {
        console.log('TeamAssignmentService: Admin user - access to all apartments');
        return null; // null berarti semua apartemen
      }

      // Tim lapangan hanya bisa akses apartemen yang di-assign
      if (currentUser.role === 'field_team') {
        // Check multiple possible sources for apartment assignments
        let apartmentIds = [];

        // Source 1: apartmentIds array
        if (currentUser.apartmentIds && Array.isArray(currentUser.apartmentIds)) {
          apartmentIds = currentUser.apartmentIds;
        }

        // Source 2: apartment_ids array (alternative naming)
        if (apartmentIds.length === 0 && currentUser.apartment_ids && Array.isArray(currentUser.apartment_ids)) {
          apartmentIds = currentUser.apartment_ids;
        }

        // Source 3: assignments array with apartment_id
        if (apartmentIds.length === 0 && currentUser.assignments && Array.isArray(currentUser.assignments)) {
          apartmentIds = currentUser.assignments.map(assignment => assignment.apartment_id).filter(Boolean);
        }

        console.log('TeamAssignmentService: Field team user - apartment IDs:', apartmentIds);

        // Jika masih tidak ada assignment, coba load dari database
        if (apartmentIds.length === 0) {
          console.warn('TeamAssignmentService: Field team has no apartment assignments in user data');
          // Return empty array instead of null to prevent access to all apartments
          // This will trigger the validation to fail, which is correct behavior
          return [];
        }

        return apartmentIds;
      }

      console.warn('TeamAssignmentService: Unknown user role:', currentUser.role);
      return [];
    } catch (error) {
      console.error('TeamAssignmentService: Error in getCurrentUserApartmentIds:', error);
      return [];
    }
  }

  /**
   * Load apartment assignments dari database untuk field team
   * @param {string} teamId - ID tim lapangan
   * @returns {Promise<Array>} Array of apartment IDs
   */
  async loadApartmentAssignments(teamId) {
    try {
      console.log('TeamAssignmentService: Loading apartment assignments for team:', teamId);

      const { data: assignments, error } = await supabase
        .from('team_apartment_assignments')
        .select('apartment_id')
        .eq('team_id', teamId)
        .eq('status', 'active');

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('TeamAssignmentService: Team assignments table not found');
          return [];
        }
        throw error;
      }

      const apartmentIds = assignments?.map(assignment => assignment.apartment_id) || [];
      console.log('TeamAssignmentService: Loaded apartment assignments:', apartmentIds);

      return apartmentIds;
    } catch (error) {
      console.error('TeamAssignmentService: Error loading apartment assignments:', error);
      return [];
    }
  }

  /**
   * Get apartment IDs dengan fallback ke database
   * @returns {Promise<Array|null>} Array of apartment IDs atau null untuk admin
   */
  async getCurrentUserApartmentIdsAsync() {
    try {
      const currentUser = AuthService.getCurrentUser();

      if (!currentUser) {
        console.warn('TeamAssignmentService: No current user found');
        return [];
      }

      // Admin bisa akses semua apartemen
      if (currentUser.role === 'admin') {
        return null;
      }

      // Tim lapangan - coba dari user data dulu
      if (currentUser.role === 'field_team') {
        let apartmentIds = this.getCurrentUserApartmentIds();

        // Jika tidak ada di user data, load dari database
        if (Array.isArray(apartmentIds) && apartmentIds.length === 0) {
          console.log('TeamAssignmentService: Loading assignments from database');
          apartmentIds = await this.loadApartmentAssignments(currentUser.id);
        }

        return apartmentIds;
      }

      return [];
    } catch (error) {
      console.error('TeamAssignmentService: Error in getCurrentUserApartmentIdsAsync:', error);
      return [];
    }
  }

  /**
   * Filter query berdasarkan apartment assignment
   * @param {Object} query - Supabase query object
   * @param {string} apartmentColumn - Nama kolom apartment_id (default: 'apartment_id')
   * @returns {Object} Filtered query
   */
  filterByApartmentAssignment(query, apartmentColumn = 'apartment_id') {
    try {
      const apartmentIds = this.getCurrentUserApartmentIds();
      console.log('TeamAssignmentService: Filtering by apartment IDs:', apartmentIds);

      // Admin bisa akses semua
      if (apartmentIds === null) {
        return query;
      }

      // Tim lapangan hanya apartemen yang di-assign
      if (apartmentIds && apartmentIds.length > 0) {
        // Validate all UUIDs before using them in query
        const validUUIDs = apartmentIds.filter(id => this.isValidUUID(id));

        if (validUUIDs.length === 0) {
          console.warn('TeamAssignmentService: No valid UUIDs found in apartment assignments');
          // Return query that will return empty results using valid UUID
          return query.eq(apartmentColumn, '00000000-0000-0000-0000-000000000000');
        }

        if (validUUIDs.length !== apartmentIds.length) {
          console.warn('TeamAssignmentService: Some invalid UUIDs filtered out:',
            apartmentIds.filter(id => !this.isValidUUID(id)));
        }

        return query.in(apartmentColumn, validUUIDs);
      }

      // Jika tidak ada assignment, return query yang tidak akan return data
      return query.eq(apartmentColumn, '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      console.error('TeamAssignmentService: Error in filterByApartmentAssignment:', error);
      // Return query with impossible condition to avoid errors
      return query.eq(apartmentColumn, '00000000-0000-0000-0000-000000000000');
    }
  }

  /**
   * Check apakah user bisa akses apartemen tertentu
   * @param {string} apartmentId - ID apartemen
   * @returns {boolean}
   */
  canAccessApartment(apartmentId) {
    const apartmentIds = this.getCurrentUserApartmentIds();

    // Admin bisa akses semua
    if (apartmentIds === null) {
      return true;
    }

    // Tim lapangan cek assignment
    return apartmentIds.includes(apartmentId);
  }

  /**
   * Check apakah user bisa akses apartemen tertentu dengan async fallback
   * @param {string} apartmentId - ID apartemen
   * @returns {Promise<boolean>}
   */
  async canAccessApartmentAsync(apartmentId) {
    try {
      const apartmentIds = await this.getCurrentUserApartmentIdsAsync();

      // Admin bisa akses semua
      if (apartmentIds === null) {
        return true;
      }

      // Tim lapangan cek assignment
      return apartmentIds.includes(apartmentId);
    } catch (error) {
      console.error('TeamAssignmentService: Error in canAccessApartmentAsync:', error);
      return false; // Default to no access on error
    }
  }

  /**
   * Check apakah user bisa akses unit tertentu
   * @param {string} unitId - ID unit
   * @returns {Promise<boolean>}
   */
  async canAccessUnit(unitId) {
    try {
      const { data: unit, error } = await supabase
        .from('units')
        .select('apartment_id')
        .eq('id', unitId)
        .single();

      if (error || !unit) {
        return false;
      }

      return this.canAccessApartment(unit.apartment_id);
    } catch (error) {
      console.error('Error checking unit access:', error);
      return false;
    }
  }

  /**
   * Check apakah user bisa akses checkin tertentu
   * @param {string} checkinId - ID checkin
   * @returns {Promise<boolean>}
   */
  async canAccessCheckin(checkinId) {
    try {
      const { data: checkin, error } = await supabase
        .from('checkins')
        .select('apartment_id')
        .eq('id', checkinId)
        .single();

      if (error || !checkin) {
        return false;
      }

      return this.canAccessApartment(checkin.apartment_id);
    } catch (error) {
      console.error('Error checking checkin access:', error);
      return false;
    }
  }

  /**
   * Get apartments yang bisa diakses user saat ini
   * @returns {Promise<Object>}
   */
  async getAccessibleApartments() {
    try {
      let query = supabase
        .from('apartments')
        .select('*')
        .order('name', { ascending: true });

      // Filter berdasarkan assignment
      query = this.filterByApartmentAssignment(query, 'id');

      const { data: apartments, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: apartments || [],
      };
    } catch (error) {
      console.error('Error getting accessible apartments:', error);
      return {
        success: false,
        message: 'Gagal mengambil data apartemen',
      };
    }
  }

  /**
   * Validate UUID format
   * @param {string} uuid - UUID to validate
   * @returns {boolean}
   */
  isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Get units yang bisa diakses user saat ini
   * @param {string} apartmentId - Optional filter by apartment
   * @returns {Promise<Object>}
   */
  async getAccessibleUnits(apartmentId = null) {
    try {
      console.log('TeamAssignmentService: Getting accessible units, apartmentId:', apartmentId);

      let query = supabase
        .from('units')
        .select(`
          *,
          apartments (
            name,
            code
          )
        `)
        .order('unit_number', { ascending: true });

      // Filter by specific apartment if provided
      if (apartmentId) {
        console.log('TeamAssignmentService: Filtering by specific apartment:', apartmentId);

        // Validate UUID format first
        if (!this.isValidUUID(apartmentId)) {
          console.error('TeamAssignmentService: Invalid UUID format for apartmentId:', apartmentId);
          return {
            success: false,
            message: 'Format ID apartemen tidak valid',
          };
        }

        // Check access first with async fallback
        const hasAccess = await this.canAccessApartmentAsync(apartmentId);
        if (!hasAccess) {
          console.warn('TeamAssignmentService: No access to apartment:', apartmentId);

          // Get user's accessible apartments for better error message
          const userApartmentIds = await this.getCurrentUserApartmentIdsAsync();
          const accessibleApartments = Array.isArray(userApartmentIds) ? userApartmentIds.join(', ') : 'Belum ada assignment';

          return {
            success: false,
            message: `Tidak memiliki akses ke apartemen ini. Tim lapangan hanya dapat mengakses apartemen yang telah ditugaskan. Apartemen yang dapat diakses: ${accessibleApartments}`,
          };
        }
        query = query.eq('apartment_id', apartmentId);
      } else {
        console.log('TeamAssignmentService: Filtering by apartment assignment');

        // Filter by assignment
        try {
          query = this.filterByApartmentAssignment(query, 'apartment_id');
        } catch (filterError) {
          console.error('TeamAssignmentService: Error in filterByApartmentAssignment:', filterError);
          // Continue without filter as fallback
        }
      }

      console.log('TeamAssignmentService: Executing units query...');
      const { data: units, error } = await query;

      if (error) {
        console.error('TeamAssignmentService: Supabase query error:', error);

        // Handle specific UUID error
        if (error.message && error.message.includes('invalid input syntax for type uuid')) {
          return {
            success: false,
            message: 'Format ID apartemen tidak valid. Silakan coba lagi atau hubungi administrator.',
          };
        }

        throw error;
      }

      console.log('TeamAssignmentService: Retrieved units:', units?.length || 0);

      return {
        success: true,
        data: units || [],
      };
    } catch (error) {
      console.error('TeamAssignmentService: Critical error in getAccessibleUnits:', error);

      // Handle specific error types
      let errorMessage = 'Gagal mengambil data unit';
      if (error.message && error.message.includes('invalid input syntax for type uuid')) {
        errorMessage = 'Format ID apartemen tidak valid';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Koneksi timeout. Silakan coba lagi';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get checkins yang bisa diakses user saat ini
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>}
   */
  async getAccessibleCheckins(filters = {}) {
    try {
      console.log('TeamAssignmentService: Getting accessible checkins with filters:', filters);

      let query = supabase
        .from('checkins')
        .select(`
          *,
          apartments (
            name,
            code
          ),
          units (
            unit_number
          ),
          field_teams (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by assignment
      console.log('TeamAssignmentService: Applying apartment assignment filter');
      try {
        query = this.filterByApartmentAssignment(query, 'apartment_id');
      } catch (filterError) {
        console.error('TeamAssignmentService: Error in filterByApartmentAssignment:', filterError);
        // Continue without filter as fallback
      }

      // Apply additional filters
      if (filters.status) {
        console.log('TeamAssignmentService: Filtering by status:', filters.status);
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.apartmentId) {
        console.log('TeamAssignmentService: Filtering by apartment ID:', filters.apartmentId);
        // Check access first
        if (!this.canAccessApartment(filters.apartmentId)) {
          console.warn('TeamAssignmentService: No access to apartment:', filters.apartmentId);
          return {
            success: false,
            message: 'Tidak memiliki akses ke apartemen ini',
          };
        }
        query = query.eq('apartment_id', filters.apartmentId);
      }

      if (filters.teamId) {
        console.log('TeamAssignmentService: Filtering by team ID:', filters.teamId);
        query = query.eq('team_id', filters.teamId);
      }

      if (filters.createdBy) {
        console.log('TeamAssignmentService: Filtering by created_by:', filters.createdBy);
        query = query.eq('created_by', filters.createdBy);
      }

      console.log('TeamAssignmentService: Executing checkins query...');
      const { data: checkins, error } = await query;

      if (error) {
        console.error('TeamAssignmentService: Supabase query error:', error);
        throw error;
      }

      console.log('TeamAssignmentService: Retrieved checkins:', checkins?.length || 0);

      if (checkins && checkins.length > 0) {
        console.log('TeamAssignmentService: Sample checkin:', {
          id: checkins[0].id,
          status: checkins[0].status,
          created_by: checkins[0].created_by,
          apartment_id: checkins[0].apartment_id,
          unit_number: checkins[0].units?.unit_number
        });
      }

      return {
        success: true,
        data: checkins || [],
      };
    } catch (error) {
      console.error('TeamAssignmentService: Critical error in getAccessibleCheckins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin: ' + (error.message || 'Unknown error'),
      };
    }
  }

  /**
   * Validate access before performing action dengan database fallback
   * @param {string} resourceType - Type of resource (apartment, unit, checkin)
   * @param {string} resourceId - ID of resource
   * @returns {Promise<boolean>}
   */
  async validateAccess(resourceType, resourceId) {
    try {
      switch (resourceType) {
        case 'apartment':
          return await this.canAccessApartmentAsync(resourceId);
        case 'unit':
          return await this.canAccessUnit(resourceId);
        case 'checkin':
          return await this.canAccessCheckin(resourceId);
        default:
          return false;
      }
    } catch (error) {
      console.error('TeamAssignmentService: Error validating access:', error);
      return false;
    }
  }

  /**
   * Check apakah user bisa akses apartemen tertentu dengan database fallback
   * @param {string} apartmentId - ID apartemen
   * @returns {Promise<boolean>}
   */
  async canAccessApartmentAsync(apartmentId) {
    try {
      const apartmentIds = await this.getCurrentUserApartmentIdsAsync();

      // Admin bisa akses semua
      if (apartmentIds === null) {
        return true;
      }

      // Tim lapangan cek assignment
      return Array.isArray(apartmentIds) && apartmentIds.includes(apartmentId);
    } catch (error) {
      console.error('TeamAssignmentService: Error checking apartment access:', error);
      return false;
    }
  }
}

export default new TeamAssignmentService();
