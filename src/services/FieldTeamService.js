import { supabase } from '../config/supabase';
import ActivityLogService from './ActivityLogService';
import { ACTIVITY_ACTIONS } from '../config/constants';

class FieldTeamService {
  // Get all field teams
  async getAllFieldTeams() {
    try {
      console.log('FieldTeamService: Fetching all field teams...');

      const { data: teams, error } = await supabase
        .from('field_teams')
        .select(`
          *,
          team_apartment_assignments (
            apartment_id,
            apartments (
              id,
              name
            )
          )
        `)
        .order('full_name', { ascending: true });

      console.log('FieldTeamService: Supabase response:', { teams, error });

      if (error) {
        console.error('FieldTeamService: Supabase error:', error);
        if (error.code === 'PGRST116') {
          console.log('FieldTeamService: Table not found, returning empty array');
          return { success: true, data: [] };
        }
        throw error;
      }

      if (!teams) {
        console.log('FieldTeamService: No teams data returned');
        return { success: true, data: [] };
      }

      console.log(`FieldTeamService: Found ${teams.length} teams`);

      // Transform data to include apartment names and IDs
      const transformedTeams = teams.map(team => {
        try {
          const assignments = team.team_apartment_assignments || [];
          const apartmentNames = assignments.map(a => a.apartments?.name).filter(Boolean);
          const apartmentIds = assignments.map(a => a.apartments?.id).filter(Boolean);

          return {
            ...team,
            apartmentNames,
            apartmentIds,
          };
        } catch (transformError) {
          console.error('FieldTeamService: Error transforming team:', team, transformError);
          return {
            ...team,
            apartmentNames: [],
            apartmentIds: [],
          };
        }
      });

      console.log('FieldTeamService: Transformed teams:', transformedTeams);

      return {
        success: true,
        data: transformedTeams,
      };
    } catch (error) {
      console.error('FieldTeamService: Error getting field teams:', error);
      return {
        success: false,
        message: `Gagal mengambil data tim lapangan: ${error.message || 'Unknown error'}`,
      };
    }
  }

  // Get field team by ID
  async getFieldTeamById(id) {
    try {
      const { data: team, error } = await supabase
        .from('field_teams')
        .select(`
          *,
          team_apartment_assignments (
            apartment_id,
            apartments (
              id,
              name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: 'Tim lapangan tidak ditemukan',
          };
        }
        throw error;
      }

      // Transform data to include apartment names and IDs
      const assignments = team.team_apartment_assignments || [];
      const apartmentNames = assignments.map(a => a.apartments?.name).filter(Boolean);
      const apartmentIds = assignments.map(a => a.apartments?.id).filter(Boolean);

      return {
        success: true,
        data: {
          ...team,
          apartmentNames,
          apartmentIds,
        },
      };
    } catch (error) {
      console.error('Error getting field team by ID:', error);
      return {
        success: false,
        message: 'Gagal mengambil data tim lapangan',
      };
    }
  }

  // Create field team
  async createFieldTeam(teamData, userId) {
    try {
      console.log('FieldTeamService: Creating field team with data:', teamData);

      // Validate input data
      if (!teamData) {
        return {
          success: false,
          message: 'Data tim lapangan tidak valid',
        };
      }

      const { username, password, fullName, phone, email, apartmentIds } = teamData;

      // Validate required fields
      if (!username || !fullName) {
        return {
          success: false,
          message: 'Username dan nama lengkap harus diisi',
        };
      }

      // Check if username already exists
      const { data: existing, error: checkError } = await supabase
        .from('field_teams')
        .select('id')
        .eq('username', username)
        .single();

      console.log('FieldTeamService: Check existing username result:', { existing, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('FieldTeamService: Check error:', checkError);
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          message: 'Username sudah digunakan',
        };
      }

      // Prepare insert data
      const insertData = {
        username,
        password: password || 'default123', // Default password if not provided
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        status: 'active'
      };

      console.log('FieldTeamService: Inserting team data:', insertData);

      // Insert new field team
      const { data: newTeam, error: insertError } = await supabase
        .from('field_teams')
        .insert([insertData])
        .select()
        .single();

      console.log('FieldTeamService: Insert result:', { newTeam, insertError });

      if (insertError) {
        console.error('FieldTeamService: Insert error:', insertError);
        throw insertError;
      }

      const teamId = newTeam.id;

      // Assign apartments if provided
      if (apartmentIds && apartmentIds.length > 0) {
        console.log('FieldTeamService: Assigning apartments:', apartmentIds);
        try {
          await this.assignApartments(teamId, apartmentIds);
        } catch (assignError) {
          console.error('FieldTeamService: Apartment assignment error:', assignError);
          // Don't fail the whole operation if apartment assignment fails
        }
      }

      // Log activity
      try {
        await ActivityLogService.logActivity(
          userId,
          'admin',
          'create_team',
          `Membuat tim lapangan baru: ${fullName} (${username})`,
          'field_teams',
          teamId
        );
      } catch (logError) {
        console.error('FieldTeamService: Activity log error:', logError);
        // Don't fail the whole operation if logging fails
      }

      return {
        success: true,
        data: { id: teamId, ...teamData },
        message: 'Tim lapangan berhasil dibuat',
      };
    } catch (error) {
      console.error('FieldTeamService: Error creating field team:', error);
      return {
        success: false,
        message: `Gagal membuat tim lapangan: ${error.message || 'Unknown error'}`,
      };
    }
  }

  // Update field team
  async updateFieldTeam(id, teamData, userId) {
    try {
      const { username, password, fullName, phone, email, status, apartmentIds } = teamData;

      // Check if username already exists (exclude current team)
      const { data: existing, error: checkError } = await supabase
        .from('field_teams')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        return {
          success: false,
          message: 'Username sudah digunakan',
        };
      }

      // Prepare update data
      let updateData = {
        username,
        full_name: fullName,
        phone,
        email,
        status
      };

      // Update password if provided
      if (password && password.trim() !== '') {
        updateData.password = password;
      }

      // Update field team
      const { data: updatedTeam, error: updateError } = await supabase
        .from('field_teams')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (updatedTeam) {
        // Update apartment assignments
        if (apartmentIds !== undefined) {
          await this.updateApartmentAssignments(id, apartmentIds);
        }

        // Log activity
        await ActivityLogService.logActivity(
          userId,
          'admin',
          'update_team',
          `Memperbarui tim lapangan: ${fullName} (${username})`,
          'field_teams',
          id
        );

        return {
          success: true,
          message: 'Tim lapangan berhasil diperbarui',
        };
      } else {
        return {
          success: false,
          message: 'Tim lapangan tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error updating field team:', error);
      return {
        success: false,
        message: 'Gagal memperbarui tim lapangan',
      };
    }
  }

  // Delete field team
  async deleteFieldTeam(id, userId) {
    try {
      const db = DatabaseManager.getDatabase();

      // Check if team has active checkins
      const checkinsResult = await db.executeSql(
        "SELECT COUNT(*) as count FROM checkins WHERE team_id = ? AND status IN ('active', 'extended')",
        [id]
      );

      if (checkinsResult[0].rows.item(0).count > 0) {
        return {
          success: false,
          message: 'Tidak dapat menghapus tim yang masih memiliki checkin aktif',
        };
      }

      // Get team info for logging
      const teamResult = await db.executeSql(
        'SELECT full_name, username FROM field_teams WHERE id = ?',
        [id]
      );

      if (teamResult[0].rows.length === 0) {
        return {
          success: false,
          message: 'Tim lapangan tidak ditemukan',
        };
      }

      const team = teamResult[0].rows.item(0);

      // Delete team (assignments will be deleted by CASCADE)
      const result = await db.executeSql(
        'DELETE FROM field_teams WHERE id = ?',
        [id]
      );

      if (result[0].rowsAffected > 0) {
        // Log activity
        await ActivityLogService.logActivity(
          userId,
          'admin',
          ACTIVITY_ACTIONS.DELETE_TEAM,
          `Menghapus tim lapangan: ${team.full_name} (${team.username})`,
          'field_teams',
          id
        );

        return {
          success: true,
          message: 'Tim lapangan berhasil dihapus',
        };
      } else {
        return {
          success: false,
          message: 'Tim lapangan tidak ditemukan',
        };
      }
    } catch (error) {
      console.error('Error deleting field team:', error);
      return {
        success: false,
        message: 'Gagal menghapus tim lapangan',
      };
    }
  }

  // Assign apartments to team
  async assignApartments(teamId, apartmentIds) {
    try {
      // Prepare assignments data
      const assignments = apartmentIds.map(apartmentId => ({
        team_id: teamId,
        apartment_id: apartmentId
      }));

      // Insert assignments (upsert to handle duplicates)
      const { error } = await supabase
        .from('team_apartment_assignments')
        .upsert(assignments, {
          onConflict: 'team_id,apartment_id',
          ignoreDuplicates: true
        });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning apartments:', error);
      return {
        success: false,
        message: 'Gagal mengassign apartemen',
      };
    }
  }

  // Update apartment assignments
  async updateApartmentAssignments(teamId, apartmentIds) {
    try {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('team_apartment_assignments')
        .delete()
        .eq('team_id', teamId);

      if (deleteError) {
        throw deleteError;
      }

      // Insert new assignments
      if (apartmentIds && apartmentIds.length > 0) {
        await this.assignApartments(teamId, apartmentIds);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating apartment assignments:', error);
      return {
        success: false,
        message: 'Gagal memperbarui assignment apartemen',
      };
    }
  }

  // Get team statistics
  async getTeamStatistics() {
    try {
      // Get total teams
      const { count: total, error: totalError } = await supabase
        .from('field_teams')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get active teams
      const { count: active, error: activeError } = await supabase
        .from('field_teams')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (activeError) throw activeError;

      // Get teams with assignments
      const { data: withAssignmentsData, error: assignmentsError } = await supabase
        .from('team_apartment_assignments')
        .select('team_id')
        .distinct();

      if (assignmentsError) throw assignmentsError;

      const withAssignments = withAssignmentsData?.length || 0;

      return {
        success: true,
        data: {
          total: total || 0,
          active: active || 0,
          withAssignments,
        },
      };
    } catch (error) {
      console.error('Error getting team statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik tim',
      };
    }
  }

  // Search field teams
  async searchFieldTeams(searchTerm) {
    try {
      const { data: teams, error } = await supabase
        .from('field_teams')
        .select(`
          *,
          team_apartment_assignments (
            apartment_id,
            apartments (
              id,
              name
            )
          )
        `)
        .or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('full_name', { ascending: true });

      if (error) {
        throw error;
      }

      // Transform data to include apartment names and IDs
      const transformedTeams = teams?.map(team => {
        const assignments = team.team_apartment_assignments || [];
        const apartmentNames = assignments.map(a => a.apartments?.name).filter(Boolean);
        const apartmentIds = assignments.map(a => a.apartments?.id).filter(Boolean);

        return {
          ...team,
          apartmentNames,
          apartmentIds,
        };
      }) || [];

      return {
        success: true,
        data: transformedTeams,
      };
    } catch (error) {
      console.error('Error searching field teams:', error);
      return {
        success: false,
        message: 'Gagal mencari tim lapangan',
      };
    }
  }
}

export default new FieldTeamService();
