import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import FieldTeamService from '../../services/FieldTeamService';
import ApartmentService from '../../services/ApartmentService';
import AuthService from '../../services/AuthService';

/**
 * Screen untuk manajemen tim lapangan oleh admin
 * Fitur: CRUD tim lapangan, assign apartemen ke tim
 */
const AdminTeamsScreen = () => {
  // State untuk data tim lapangan
  const [teams, setTeams] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // State untuk form data
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    email: '',
    status: 'active',
    apartmentIds: [],
  });

  // Load data saat komponen dimount
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Load data awal (tim lapangan dan apartemen)
   */
  const loadInitialData = async () => {
    await Promise.all([
      loadTeams(),
      loadApartments(),
    ]);
  };

  /**
   * Load data tim lapangan dari database
   */
  const loadTeams = async () => {
    try {
      const result = await FieldTeamService.getAllFieldTeams();
      if (result.success) {
        setTeams(result.data);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Load teams error:', error);
      Alert.alert('Error', 'Gagal memuat data tim lapangan');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data apartemen untuk pilihan assignment
   */
  const loadApartments = async () => {
    try {
      const result = await ApartmentService.getActiveApartments();
      if (result.success) {
        setApartments(result.data);
      }
    } catch (error) {
      console.error('Load apartments error:', error);
    }
  };

  /**
   * Refresh data dengan pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  /**
   * Buka modal untuk menambah tim baru
   */
  const openAddModal = () => {
    setEditingTeam(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      phone: '',
      email: '',
      status: 'active',
      apartmentIds: [],
    });
    setModalVisible(true);
  };

  /**
   * Buka modal untuk edit tim yang sudah ada
   * @param {Object} team - Data tim yang akan diedit
   */
  const openEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      username: team.username,
      password: '', // Password kosong untuk keamanan
      fullName: team.full_name,
      phone: team.phone,
      email: team.email || '',
      status: team.status,
      apartmentIds: team.apartmentIds || [],
    });
    setModalVisible(true);
  };

  /**
   * Simpan data tim (create atau update)
   */
  const handleSave = async () => {
    // Validasi input wajib
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.phone.trim()) {
      Alert.alert('Error', 'Username, nama lengkap, dan nomor telepon harus diisi');
      return;
    }

    // Validasi password untuk tim baru
    if (!editingTeam && !formData.password.trim()) {
      Alert.alert('Error', 'Password harus diisi untuk tim baru');
      return;
    }

    try {
      const currentUser = AuthService.getCurrentUser();
      let result;

      if (editingTeam) {
        // Update tim yang sudah ada
        result = await FieldTeamService.updateFieldTeam(
          editingTeam.id,
          formData,
          currentUser.id
        );
      } else {
        // Buat tim baru
        result = await FieldTeamService.createFieldTeam(formData, currentUser.id);
      }

      if (result.success) {
        Alert.alert('Sukses', result.message);
        setModalVisible(false);
        await loadTeams();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Save team error:', error);
      Alert.alert('Error', 'Gagal menyimpan data tim lapangan');
    }
  };

  /**
   * Konfirmasi dan hapus tim lapangan
   * @param {Object} team - Data tim yang akan dihapus
   */
  const handleDelete = (team) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Apakah Anda yakin ingin menghapus tim "${team.full_name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteTeam(team.id),
        },
      ]
    );
  };

  /**
   * Hapus tim lapangan dari database
   * @param {number} id - ID tim yang akan dihapus
   */
  const deleteTeam = async (id) => {
    try {
      const currentUser = AuthService.getCurrentUser();
      const result = await FieldTeamService.deleteFieldTeam(id, currentUser.id);

      if (result.success) {
        Alert.alert('Sukses', result.message);
        await loadTeams();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Delete team error:', error);
      Alert.alert('Error', 'Gagal menghapus tim lapangan');
    }
  };

  /**
   * Toggle selection apartemen untuk assignment
   * @param {number} apartmentId - ID apartemen yang di-toggle
   */
  const toggleApartmentSelection = (apartmentId) => {
    const currentIds = formData.apartmentIds;
    const isSelected = currentIds.includes(apartmentId);

    let newIds;
    if (isSelected) {
      // Hapus dari selection
      newIds = currentIds.filter(id => id !== apartmentId);
    } else {
      // Tambah ke selection
      newIds = [...currentIds, apartmentId];
    }

    setFormData({ ...formData, apartmentIds: newIds });
  };

  // Filter tim berdasarkan pencarian
  const filteredTeams = teams.filter(
    (team) =>
      team.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.phone.includes(searchQuery)
  );

  /**
   * Render item tim lapangan dalam list
   * @param {Object} param0 - Item data dari FlatList
   */
  const renderTeamItem = ({ item }) => (
    <View style={styles.teamCard}>
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{item.full_name}</Text>
          <Text style={styles.teamUsername}>@{item.username}</Text>
          <Text style={styles.teamPhone}>{item.phone}</Text>
          {item.email && (
            <Text style={styles.teamEmail}>{item.email}</Text>
          )}
        </View>
        <View style={styles.teamActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Icon name="edit" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Icon name="delete" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              item.status === 'active' ? COLORS.success : COLORS.gray400,
          },
        ]}
      >
        <Text style={styles.statusText}>
          {item.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
        </Text>
      </View>

      {/* Assigned Apartments */}
      {item.apartmentNames && item.apartmentNames.length > 0 && (
        <View style={styles.apartmentContainer}>
          <Text style={styles.apartmentLabel}>Apartemen:</Text>
          <View style={styles.apartmentTags}>
            {item.apartmentNames.map((name, index) => (
              <View key={index} style={styles.apartmentTag}>
                <Text style={styles.apartmentTagText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manajemen Tim Lapangan</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Icon name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari tim lapangan..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray400}
        />
      </View>

      {/* Team List */}
      <FlatList
        data={filteredTeams}
        renderItem={renderTeamItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="group" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Belum ada tim lapangan</Text>
            <Text style={styles.emptySubtext}>
              Tap tombol + untuk menambah tim baru
            </Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingTeam ? 'Edit Tim Lapangan' : 'Tambah Tim Lapangan'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username *</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Masukkan username"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Password {editingTeam ? '(kosongkan jika tidak diubah)' : '*'}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Masukkan password"
                placeholderTextColor={COLORS.gray400}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Lengkap *</Text>
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor Telepon *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Masukkan nomor telepon"
                placeholderTextColor={COLORS.gray400}
                keyboardType="phone-pad"
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Masukkan email"
                placeholderTextColor={COLORS.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Status Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.status === 'active' && styles.statusButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'active' })}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.status === 'active' && styles.statusButtonTextActive,
                    ]}
                  >
                    Aktif
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.status === 'inactive' && styles.statusButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'inactive' })}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.status === 'inactive' && styles.statusButtonTextActive,
                    ]}
                  >
                    Tidak Aktif
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Apartment Assignment */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apartemen yang Ditugaskan</Text>
              <Text style={styles.inputHint}>
                Pilih apartemen yang akan dikelola oleh tim ini
              </Text>
              <View style={styles.apartmentList}>
                {apartments.map((apartment) => (
                  <TouchableOpacity
                    key={apartment.id}
                    style={[
                      styles.apartmentItem,
                      formData.apartmentIds.includes(apartment.id) &&
                        styles.apartmentItemSelected,
                    ]}
                    onPress={() => toggleApartmentSelection(apartment.id)}
                  >
                    <Text
                      style={[
                        styles.apartmentItemText,
                        formData.apartmentIds.includes(apartment.id) &&
                          styles.apartmentItemTextSelected,
                      ]}
                    >
                      {apartment.name}
                    </Text>
                    {formData.apartmentIds.includes(apartment.id) && (
                      <Icon name="check" size={20} color={COLORS.background} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  header: {
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    margin: SIZES.lg,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
  },
  listContainer: {
    padding: SIZES.lg,
    paddingTop: 0,
  },
  teamCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs / 2,
  },
  teamUsername: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SIZES.xs / 2,
  },
  teamPhone: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  teamEmail: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
  },
  teamActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: SIZES.xs,
    marginLeft: SIZES.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.radius / 2,
    marginBottom: SIZES.sm,
  },
  statusText: {
    fontSize: SIZES.caption,
    color: COLORS.background,
    fontWeight: '500',
  },
  apartmentContainer: {
    marginTop: SIZES.xs,
  },
  apartmentLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  apartmentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  apartmentTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.radius / 2,
    marginRight: SIZES.xs,
    marginBottom: SIZES.xs / 2,
  },
  apartmentTagText: {
    fontSize: SIZES.caption,
    color: COLORS.background,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.lg,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  inputHint: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  statusContainer: {
    flexDirection: 'row',
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray100,
    padding: SIZES.xs,
  },
  statusButton: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    borderRadius: SIZES.radius,
  },
  statusButtonActive: {
    backgroundColor: COLORS.primary,
  },
  statusButtonText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statusButtonTextActive: {
    color: COLORS.background,
  },
  apartmentList: {
    marginTop: SIZES.sm,
  },
  apartmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
    backgroundColor: COLORS.background,
  },
  apartmentItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  apartmentItemText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  apartmentItemTextSelected: {
    color: COLORS.background,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  button: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray200,
    marginRight: SIZES.sm,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginLeft: SIZES.sm,
  },
  cancelButtonText: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButtonText: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.background,
  },
});

export default AdminTeamsScreen;
