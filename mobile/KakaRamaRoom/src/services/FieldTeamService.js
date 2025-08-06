import DatabaseManager from '../config/database';
import ActivityLogService from './ActivityLogService';
import { ACTIVITY_ACTIONS } from '../config/constants';

class FieldTeamService {
  // Get all field teams
  async getAllFieldTeams() {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT ft.*, 
                GROUP_CONCAT(a.name) as apartment_names,
                GROUP_CONCAT(a.id) as apartment_ids
         FROM field_teams ft
         LEFT JOIN team_apartment_assignments taa ON ft.id = taa.team_id
         LEFT JOIN apartments a ON taa.apartment_id = a.id
         GROUP BY ft.id
         ORDER BY ft.full_name ASC`
      );

      const teams = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const team = result[0].rows.item(i);
        teams.push({
          ...team,
          apartmentNames: team.apartment_names ? team.apartment_names.split(',') : [],
          apartmentIds: team.apartment_ids ? team.apartment_ids.split(',').map(id => parseInt(id)) : [],
        });
      }

      return {
        success: true,
        data: teams,
      };
    } catch (error) {
      console.error('Error getting field teams:', error);
      return {
        success: false,
        message: 'Gagal mengambil data tim lapangan',
      };
    }
  }

  // Get field team by ID
  async getFieldTeamById(id) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT ft.*, 
                GROUP_CONCAT(a.name) as apartment_names,
                GROUP_CONCAT(a.id) as apartment_ids
         FROM field_teams ft
         LEFT JOIN team_apartment_assignments taa ON ft.id = taa.team_id
         LEFT JOIN apartments a ON taa.apartment_id = a.id
         WHERE ft.id = ?
         GROUP BY ft.id`,
        [id]
      );

      if (result[0].rows.length > 0) {
        const team = result[0].rows.item(0);
        return {
          success: true,
          data: {
            ...team,
            apartmentNames: team.apartment_names ? team.apartment_names.split(',') : [],
            apartmentIds: team.apartment_ids ? team.apartment_ids.split(',').map(id => parseInt(id)) : [],
          },
        };
      } else {
        return {
          success: false,
          message: 'Tim lapangan tidak ditemukan',
        };
      }
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
      const { username, password, fullName, phone, email, apartmentIds } = teamData;

      // Check if username already exists
      const db = DatabaseManager.getDatabase();
      const existingResult = await db.executeSql(
        'SELECT id FROM field_teams WHERE username = ?',
        [username]
      );

      if (existingResult[0].rows.length > 0) {
        return {
          success: false,
          message: 'Username sudah digunakan',
        };
      }

      // Insert new field team
      const result = await db.executeSql(
        `INSERT INTO field_teams (username, password, full_name, phone, email, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [username, password, fullName, phone, email]
      );

      const teamId = result[0].insertId;

      // Assign apartments if provided
      if (apartmentIds && apartmentIds.length > 0) {
        await this.assignApartments(teamId, apartmentIds);
      }

      // Log activity
      await ActivityLogService.logActivity(
        userId,
        'admin',
        ACTIVITY_ACTIONS.CREATE_TEAM,
        `Membuat tim lapangan baru: ${fullName} (${username})`,
        'field_teams',
        teamId
      );

      return {
        success: true,
        data: { id: teamId, ...teamData },
        message: 'Tim lapangan berhasil dibuat',
      };
    } catch (error) {
      console.error('Error creating field team:', error);
      return {
        success: false,
        message: 'Gagal membuat tim lapangan',
      };
    }
  }

  // Update field team
  async updateFieldTeam(id, teamData, userId) {
    try {
      const { username, password, fullName, phone, email, status, apartmentIds } = teamData;

      // Check if username already exists (exclude current team)
      const db = DatabaseManager.getDatabase();
      const existingResult = await db.executeSql(
        'SELECT id FROM field_teams WHERE username = ? AND id != ?',
        [username, id]
      );

      if (existingResult[0].rows.length > 0) {
        return {
          success: false,
          message: 'Username sudah digunakan',
        };
      }

      // Update field team
      let updateQuery = `UPDATE field_teams 
                        SET username = ?, full_name = ?, phone = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?`;
      let updateParams = [username, fullName, phone, email, status, id];

      // Update password if provided
      if (password && password.trim() !== '') {
        updateQuery = `UPDATE field_teams 
                      SET username = ?, password = ?, full_name = ?, phone = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                      WHERE id = ?`;
        updateParams = [username, password, fullName, phone, email, status, id];
      }

      const result = await db.executeSql(updateQuery, updateParams);

      if (result[0].rowsAffected > 0) {
        // Update apartment assignments
        if (apartmentIds !== undefined) {
          await this.updateApartmentAssignments(id, apartmentIds);
        }

        // Log activity
        await ActivityLogService.logActivity(
          userId,
          'admin',
          ACTIVITY_ACTIONS.UPDATE_TEAM,
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
      const db = DatabaseManager.getDatabase();

      // Insert assignments
      for (const apartmentId of apartmentIds) {
        await db.executeSql(
          `INSERT OR IGNORE INTO team_apartment_assignments (team_id, apartment_id, assigned_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [teamId, apartmentId]
        );
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
      const db = DatabaseManager.getDatabase();

      // Delete existing assignments
      await db.executeSql(
        'DELETE FROM team_apartment_assignments WHERE team_id = ?',
        [teamId]
      );

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
      const db = DatabaseManager.getDatabase();
      
      // Get total teams
      const totalResult = await db.executeSql(
        'SELECT COUNT(*) as total FROM field_teams'
      );

      // Get active teams
      const activeResult = await db.executeSql(
        "SELECT COUNT(*) as active FROM field_teams WHERE status = 'active'"
      );

      // Get teams with assignments
      const withAssignmentsResult = await db.executeSql(
        `SELECT COUNT(DISTINCT ft.id) as with_assignments 
         FROM field_teams ft 
         INNER JOIN team_apartment_assignments taa ON ft.id = taa.team_id`
      );

      return {
        success: true,
        data: {
          total: totalResult[0].rows.item(0).total,
          active: activeResult[0].rows.item(0).active,
          withAssignments: withAssignmentsResult[0].rows.item(0).with_assignments,
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
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT ft.*, 
                GROUP_CONCAT(a.name) as apartment_names,
                GROUP_CONCAT(a.id) as apartment_ids
         FROM field_teams ft
         LEFT JOIN team_apartment_assignments taa ON ft.id = taa.team_id
         LEFT JOIN apartments a ON taa.apartment_id = a.id
         WHERE ft.full_name LIKE ? OR ft.username LIKE ? OR ft.phone LIKE ?
         GROUP BY ft.id
         ORDER BY ft.full_name ASC`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
      );

      const teams = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const team = result[0].rows.item(i);
        teams.push({
          ...team,
          apartmentNames: team.apartment_names ? team.apartment_names.split(',') : [],
          apartmentIds: team.apartment_ids ? team.apartment_ids.split(',').map(id => parseInt(id)) : [],
        });
      }

      return {
        success: true,
        data: teams,
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
