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
import { COLORS, SIZES, UNIT_STATUS, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '../../config/constants';
import UnitService from '../../services/UnitService';
import ApartmentService from '../../services/ApartmentService';
import AuthService from '../../services/AuthService';

/**
 * Screen untuk manajemen unit oleh admin
 * Fitur: CRUD unit, ubah status unit, monitoring auto-checkout
 */
const AdminUnitsScreen = () => {
  // State untuk data unit dan apartemen
  const [units, setUnits] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);

  // State untuk form data
  const [formData, setFormData] = useState({
    apartmentId: '',
    unitNumber: '',
    unitType: '',
    status: UNIT_STATUS.AVAILABLE,
  });

  // Load data saat komponen dimount
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Load data awal (unit dan apartemen)
   */
  const loadInitialData = async () => {
    await Promise.all([
      loadUnits(),
      loadApartments(),
    ]);
  };

  /**
   * Load semua unit dari database
   */
  const loadUnits = async () => {
    try {
      const result = await UnitService.getAllUnits();
      if (result.success) {
        setUnits(result.data);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Load units error:', error);
      Alert.alert('Error', 'Gagal memuat data unit');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data apartemen untuk pilihan dropdown
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
   * Filter unit berdasarkan apartemen yang dipilih
   * @param {number|null} apartmentId - ID apartemen untuk filter, null untuk semua
   */
  const filterByApartment = (apartmentId) => {
    setSelectedApartment(apartmentId);
  };

  /**
   * Buka modal untuk menambah unit baru
   */
  const openAddModal = () => {
    setEditingUnit(null);
    setFormData({
      apartmentId: selectedApartment || '',
      unitNumber: '',
      unitType: '',
      status: UNIT_STATUS.AVAILABLE,
    });
    setModalVisible(true);
  };

  /**
   * Buka modal untuk edit unit yang sudah ada
   * @param {Object} unit - Data unit yang akan diedit
   */
  const openEditModal = (unit) => {
    setEditingUnit(unit);
    setFormData({
      apartmentId: unit.apartment_id.toString(),
      unitNumber: unit.unit_number,
      unitType: unit.unit_type || '',
      status: unit.status,
    });
    setModalVisible(true);
  };

  /**
   * Simpan data unit (create atau update)
   */
  const handleSave = async () => {
    // Validasi input wajib
    if (!formData.apartmentId || !formData.unitNumber.trim()) {
      Alert.alert('Error', 'Apartemen dan nomor unit harus diisi');
      return;
    }

    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'User tidak ditemukan. Silakan login ulang.');
        return;
      }

      const unitData = {
        apartmentId: parseInt(formData.apartmentId),
        unitNumber: formData.unitNumber.trim(),
        unitType: formData.unitType.trim(),
        status: formData.status,
      };

      console.log('AdminUnitsScreen: Saving unit data:', unitData);

      let result;
      if (editingUnit) {
        // Update unit yang sudah ada
        result = await UnitService.updateUnit(
          editingUnit.id,
          unitData,
          currentUser.id
        );
      } else {
        // Buat unit baru
        result = await UnitService.createUnit(unitData, currentUser.id);
      }

      console.log('AdminUnitsScreen: Save result:', result);

      if (result && result.success) {
        Alert.alert('Sukses', result.message);
        setModalVisible(false);
        await loadUnits();
      } else {
        const errorMessage = result?.message || 'Gagal menyimpan data unit tanpa pesan error';
        console.error('AdminUnitsScreen: Save failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('AdminUnitsScreen: Save unit error:', error);
      Alert.alert('Error', `Gagal menyimpan data unit: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Konfirmasi dan hapus unit
   * @param {Object} unit - Data unit yang akan dihapus
   */
  const handleDelete = (unit) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Apakah Anda yakin ingin menghapus unit "${unit.unit_number}" di ${unit.apartment_name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteUnit(unit.id),
        },
      ]
    );
  };

  /**
   * Hapus unit dari database
   * @param {number} id - ID unit yang akan dihapus
   */
  const deleteUnit = async (id) => {
    try {
      const currentUser = AuthService.getCurrentUser();
      const result = await UnitService.deleteUnit(id, currentUser.id);

      if (result.success) {
        Alert.alert('Sukses', result.message);
        await loadUnits();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Delete unit error:', error);
      Alert.alert('Error', 'Gagal menghapus unit');
    }
  };

  /**
   * Ubah status unit
   * @param {Object} unit - Data unit
   * @param {string} newStatus - Status baru
   */
  const changeUnitStatus = async (unit, newStatus) => {
    try {
      const currentUser = AuthService.getCurrentUser();
      const result = await UnitService.updateUnitStatus(
        unit.id,
        newStatus,
        currentUser.id,
        'admin'
      );

      if (result.success) {
        Alert.alert('Sukses', result.message);
        await loadUnits();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Change unit status error:', error);
      Alert.alert('Error', 'Gagal mengubah status unit');
    }
  };

  /**
   * Tampilkan menu pilihan status unit
   * @param {Object} unit - Data unit
   */
  const showStatusMenu = (unit) => {
    const statusOptions = Object.values(UNIT_STATUS).map(status => ({
      text: UNIT_STATUS_LABELS[status],
      onPress: () => changeUnitStatus(unit, status),
      style: status === unit.status ? 'default' : 'default',
    }));

    statusOptions.push({ text: 'Batal', style: 'cancel' });

    Alert.alert('Ubah Status Unit', `Unit ${unit.unit_number}`, statusOptions);
  };

  // Filter unit berdasarkan pencarian dan apartemen
  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.apartment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (unit.unit_type && unit.unit_type.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesApartment = selectedApartment ?
      unit.apartment_id === selectedApartment : true;

    return matchesSearch && matchesApartment;
  });

  /**
   * Handle unit press - show checkin detail if occupied
   * @param {Object} unit - Unit data
   */
  const handleUnitPress = (unit) => {
    if (unit.status === UNIT_STATUS.OCCUPIED) {
      // Navigate to checkin detail
      navigation.navigate('CheckinDetail', { unitId: unit.id });
    }
  };

  /**
   * Render item unit dalam list
   * @param {Object} param0 - Item data dari FlatList
   */
  const renderUnitItem = ({ item }) => (
    <TouchableOpacity
      style={styles.unitCard}
      onPress={() => handleUnitPress(item)}
      activeOpacity={item.status === UNIT_STATUS.OCCUPIED ? 0.7 : 1}
    >
      <View style={styles.unitHeader}>
        <View style={styles.unitInfo}>
          <Text style={styles.unitNumber}>{item.unit_number}</Text>
          <Text style={styles.apartmentName}>{item.apartment_name}</Text>
          {item.unit_type && (
            <Text style={styles.unitType}>{item.unit_type}</Text>
          )}
        </View>
        <View style={styles.unitActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => showStatusMenu(item)}
          >
            <Icon name="swap-vert" size={20} color={COLORS.warning} />
          </TouchableOpacity>
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
          { backgroundColor: UNIT_STATUS_COLORS[item.status] },
        ]}
      >
        <Text style={styles.statusText}>
          {UNIT_STATUS_LABELS[item.status]}
        </Text>
      </View>

      {/* Cleaning Timer */}
      {item.status === UNIT_STATUS.CLEANING && item.cleaning_started_at && (
        <View style={styles.cleaningInfo}>
          <Icon name="schedule" size={16} color={COLORS.warning} />
          <Text style={styles.cleaningText}>
            Cleaning dimulai: {new Date(item.cleaning_started_at).toLocaleTimeString('id-ID')}
          </Text>
        </View>
      )}

      {/* Tap hint for occupied units */}
      {item.status === UNIT_STATUS.OCCUPIED && (
        <View style={styles.tapHint}>
          <Icon name="touch-app" size={16} color={COLORS.primary} />
          <Text style={styles.tapHintText}>Tap untuk lihat detail checkin</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manajemen Unit</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Icon name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Filter Apartemen */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            !selectedApartment && styles.filterButtonActive,
          ]}
          onPress={() => filterByApartment(null)}
        >
          <Text
            style={[
              styles.filterButtonText,
              !selectedApartment && styles.filterButtonTextActive,
            ]}
          >
            Semua
          </Text>
        </TouchableOpacity>
        {apartments.map((apartment) => (
          <TouchableOpacity
            key={apartment.id}
            style={[
              styles.filterButton,
              selectedApartment === apartment.id && styles.filterButtonActive,
            ]}
            onPress={() => filterByApartment(apartment.id)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedApartment === apartment.id && styles.filterButtonTextActive,
              ]}
            >
              {apartment.name || apartment.code || 'Apartemen'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari unit..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray400}
        />
      </View>

      {/* Unit List */}
      <FlatList
        data={filteredUnits}
        renderItem={renderUnitItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="meeting-room" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>
              {selectedApartment ? 'Tidak ada unit di apartemen ini' : 'Belum ada unit'}
            </Text>
            <Text style={styles.emptySubtext}>
              Tap tombol + untuk menambah unit baru
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
              {editingUnit ? 'Edit Unit' : 'Tambah Unit'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Apartment Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apartemen *</Text>
              <View style={styles.pickerContainer}>
                {apartments.map((apartment) => (
                  <TouchableOpacity
                    key={apartment.id}
                    style={[
                      styles.pickerItem,
                      formData.apartmentId === apartment.id.toString() &&
                        styles.pickerItemSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, apartmentId: apartment.id.toString() })}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        formData.apartmentId === apartment.id.toString() &&
                          styles.pickerItemTextSelected,
                      ]}
                    >
                      {apartment.name}
                    </Text>
                    {formData.apartmentId === apartment.id.toString() && (
                      <Icon name="check" size={20} color={COLORS.background} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Unit Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor Unit *</Text>
              <TextInput
                style={styles.input}
                value={formData.unitNumber}
                onChangeText={(text) => setFormData({ ...formData, unitNumber: text })}
                placeholder="Contoh: 0326, 1626"
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            {/* Unit Type Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tipe Unit</Text>
              <TextInput
                style={styles.input}
                value={formData.unitType}
                onChangeText={(text) => setFormData({ ...formData, unitType: text })}
                placeholder="Contoh: 1BR, Studio, 2BR"
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            {/* Status Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusGrid}>
                {Object.values(UNIT_STATUS).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusItem,
                      { backgroundColor: UNIT_STATUS_COLORS[status] },
                      formData.status === status && styles.statusItemSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={styles.statusItemText}>
                      {UNIT_STATUS_LABELS[status]}
                    </Text>
                    {formData.status === status && (
                      <Icon name="check" size={16} color={COLORS.background} />
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
  filterContainer: {
    backgroundColor: COLORS.background,
    paddingVertical: SIZES.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterContent: {
    paddingHorizontal: SIZES.lg,
  },
  filterButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray100,
    marginRight: SIZES.sm,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: COLORS.background,
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
  unitCard: {
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
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs / 2,
  },
  apartmentName: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  unitType: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    fontWeight: '500',
  },
  unitActions: {
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
  cleaningInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    padding: SIZES.sm,
    borderRadius: SIZES.radius / 2,
  },
  cleaningText: {
    fontSize: SIZES.caption,
    color: COLORS.warning,
    marginLeft: SIZES.xs,
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
  pickerContainer: {
    marginTop: SIZES.sm,
  },
  pickerItem: {
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
  pickerItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerItemText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: COLORS.background,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    marginRight: SIZES.sm,
    marginBottom: SIZES.sm,
    minWidth: '45%',
    justifyContent: 'center',
  },
  statusItemSelected: {
    borderWidth: 2,
    borderColor: COLORS.textPrimary,
  },
  statusItemText: {
    fontSize: SIZES.body,
    color: COLORS.background,
    fontWeight: '600',
    marginRight: SIZES.xs,
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
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  tapHintText: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginLeft: SIZES.xs,
    fontStyle: 'italic',
  },
});

export default AdminUnitsScreen;
