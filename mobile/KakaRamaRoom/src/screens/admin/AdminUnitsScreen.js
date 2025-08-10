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
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, UNIT_STATUS, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '../../config/constants';
import UnitService from '../../services/UnitService';
import ApartmentService from '../../services/ApartmentService';
import AuthService from '../../services/AuthService';
import CheckinService from '../../services/CheckinService';
import { useModernAlert } from '../../components/ModernAlert';

/**
 * Screen untuk manajemen unit oleh admin
 * Fitur: CRUD unit, ubah status unit, monitoring auto-checkout
 */
const AdminUnitsScreen = () => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

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
    try {
      await Promise.all([
        loadUnits(),
        loadApartments(),
      ]);
    } catch (error) {
      console.error('AdminUnitsScreen: Error loading initial data:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memuat data awal. Silakan coba lagi.',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load semua unit dari database
   */
  const loadUnits = async () => {
    try {
      // Validasi service
      if (!UnitService || typeof UnitService.getAllUnits !== 'function') {
        throw new Error('UnitService tidak tersedia');
      }

      const result = await UnitService.getAllUnits();
      if (result && result.success) {
        const unitData = Array.isArray(result.data) ? result.data : [];
        setUnits(unitData);
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: result?.message || 'Gagal memuat data unit',
        });
        setUnits([]);
      }
    } catch (error) {
      console.error('AdminUnitsScreen: Load units error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal memuat data unit: ${error.message || 'Unknown error'}`,
      });
      setUnits([]);
    }
  };

  /**
   * Load data apartemen untuk pilihan dropdown
   */
  const loadApartments = async () => {
    try {
      // Validasi service
      if (!ApartmentService || typeof ApartmentService.getActiveApartments !== 'function') {
        throw new Error('ApartmentService tidak tersedia');
      }

      const result = await ApartmentService.getActiveApartments();
      if (result && result.success) {
        const apartmentData = Array.isArray(result.data) ? result.data : [];
        setApartments(apartmentData);
      } else {
        console.error('AdminUnitsScreen: Failed to load apartments:', result?.message);
        setApartments([]);
      }
    } catch (error) {
      console.error('AdminUnitsScreen: Load apartments error:', error);
      setApartments([]);
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
        apartmentId: formData.apartmentId, // Keep as UUID string, don't parse to int
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
      // Validasi input
      if (!unit || !unit.id) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Data unit tidak valid',
        });
        return;
      }

      if (!newStatus) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Status baru tidak valid',
        });
        return;
      }

      // Validasi user
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'User tidak valid. Silakan login ulang.',
        });
        return;
      }

      // Validasi service
      if (!UnitService || typeof UnitService.updateUnitStatus !== 'function') {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Service unit tidak tersedia',
        });
        return;
      }

      const result = await UnitService.updateUnitStatus(
        unit.id,
        newStatus,
        currentUser.id,
        'admin'
      );

      if (result && result.success) {
        showAlert({
          type: 'success',
          title: 'Sukses',
          message: result.message || 'Status unit berhasil diubah',
          onDismiss: () => {
            loadUnits(); // Reload data
          },
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: result?.message || 'Gagal mengubah status unit',
        });
      }
    } catch (error) {
      console.error('AdminUnitsScreen: Change unit status error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal mengubah status unit: ${error.message || 'Unknown error'}`,
      });
    }
  };

  /**
   * Tampilkan menu pilihan status unit
   * @param {Object} unit - Data unit
   */
  const showStatusMenu = (unit) => {
    // Validasi unit data
    if (!unit || !unit.id) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Data unit tidak valid',
      });
      return;
    }

    // Validasi UNIT_STATUS dan UNIT_STATUS_LABELS
    if (!UNIT_STATUS || !UNIT_STATUS_LABELS) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Konfigurasi status unit tidak tersedia',
      });
      return;
    }

    const statusOptions = Object.values(UNIT_STATUS).map(status => ({
      text: UNIT_STATUS_LABELS[status] || status,
      onPress: () => changeUnitStatus(unit, status),
      style: status === unit.status ? 'default' : 'default',
    }));

    statusOptions.push({ text: 'Batal', style: 'cancel' });

    showAlert({
      type: 'confirm',
      title: 'Ubah Status Unit',
      message: `Unit ${unit.unit_number}\nStatus saat ini: ${UNIT_STATUS_LABELS[unit.status] || unit.status}`,
      buttons: statusOptions
    });
  };

  // Helper function untuk menghitung jumlah unit per apartemen
  const getUnitCountByApartment = (apartmentId) => {
    return units.filter(unit => unit.apartment_id === apartmentId).length;
  };

  // Helper function untuk mendapatkan total unit
  const getTotalUnits = () => {
    return units.length;
  };

  // Filter unit berdasarkan pencarian dan apartemen dengan safe operations
  const filteredUnits = Array.isArray(units) ? units.filter((unit) => {
    if (!unit || typeof unit !== 'object') return false;

    const unitNumber = unit.unit_number || '';
    const apartmentName = unit.apartment_name || '';
    const unitType = unit.unit_type || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      unitNumber.toLowerCase().includes(query) ||
      apartmentName.toLowerCase().includes(query) ||
      unitType.toLowerCase().includes(query);

    const matchesApartment = selectedApartment ?
      unit.apartment_id === selectedApartment : true;

    return matchesSearch && matchesApartment;
  }) : [];

  /**
   * Handle unit press - show checkin detail if occupied
   * @param {Object} unit - Unit data
   */
  const handleUnitPress = async (unit) => {
    try {
      console.log('AdminUnitsScreen: Unit pressed:', unit);

      // Validasi unit data
      if (!unit || !unit.id) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Data unit tidak valid',
        });
        return;
      }

      if (unit.status === UNIT_STATUS.OCCUPIED) {
        console.log('AdminUnitsScreen: Checking for active checkin for unit:', unit.id);

        // Validasi CheckinService
        if (!CheckinService || typeof CheckinService.getActiveCheckinByUnit !== 'function') {
          showAlert({
            type: 'error',
            title: 'Error',
            message: 'Service checkin tidak tersedia',
          });
          return;
        }

        // First check if there's an active checkin for this unit
        try {
          const checkinResult = await CheckinService.getActiveCheckinByUnit(unit.id);

          if (checkinResult && checkinResult.success && checkinResult.data) {
            console.log('AdminUnitsScreen: Found active checkin, showing detail');

            // Show checkin detail in alert instead of navigation for now
            const checkin = checkinResult.data;
            const checkinTime = new Date(checkin.checkin_time).toLocaleString('id-ID');
            const checkoutTime = checkin.checkout_time ?
              new Date(checkin.checkout_time).toLocaleString('id-ID') : 'Belum ditentukan';

            showAlert({
              type: 'info',
              title: 'Detail Checkin',
              message: `Unit: ${unit.unit_number}\nApartemen: ${unit.apartment_name}\nTamu: ${checkin.guest_name || 'N/A'}\nCheckin: ${checkinTime}\nCheckout: ${checkoutTime}\nPembayaran: Rp ${(checkin.payment_amount || 0).toLocaleString('id-ID')}\nMarketing: ${checkin.marketing_name || 'N/A'}`,
              buttons: [
                { text: 'Tutup', style: 'cancel' },
                {
                  text: 'Ubah Status',
                  onPress: () => showStatusMenu(unit)
                }
              ]
            });
          } else {
            console.warn('AdminUnitsScreen: No active checkin found for occupied unit');
            showAlert({
              type: 'warning',
              title: 'Info Unit',
              message: `Unit: ${unit.unit_number}\nApartemen: ${unit.apartment_name}\nStatus: ${UNIT_STATUS_LABELS[unit.status]}\n\nUnit ini ditandai sebagai terisi, tetapi tidak ada checkin aktif yang ditemukan.`,
              buttons: [
                { text: 'OK', style: 'cancel' },
                {
                  text: 'Ubah Status',
                  onPress: () => showStatusMenu(unit)
                }
              ]
            });
          }
        } catch (checkinError) {
          console.error('AdminUnitsScreen: Error checking active checkin:', checkinError);
          showAlert({
            type: 'error',
            title: 'Error',
            message: `Gagal memeriksa data checkin: ${checkinError.message || 'Unknown error'}`,
          });
        }
      } else {
        // Show unit info for non-occupied units
        showAlert({
          type: 'info',
          title: 'Info Unit',
          message: `Unit: ${unit.unit_number}\nApartemen: ${unit.apartment_name}\nStatus: ${UNIT_STATUS_LABELS[unit.status] || unit.status}`,
          buttons: [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Ubah Status',
              onPress: () => showStatusMenu(unit)
            }
          ]
        });
      }
    } catch (error) {
      console.error('AdminUnitsScreen: Error in handleUnitPress:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Terjadi kesalahan saat membuka detail unit: ${error.message || 'Unknown error'}`,
      });
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

      {/* Checkout Time untuk unit terisi dari input manual admin */}
      {item.status === UNIT_STATUS.OCCUPIED && item.checkout_time && item.is_manual_checkin && (
        <View style={styles.checkoutInfo}>
          <Icon name="schedule" size={16} color={COLORS.success} />
          <Text style={styles.checkoutText}>
            Checkout: {new Date(item.checkout_time).toLocaleString('id-ID', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
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

  // Show loading indicator saat pertama kali load
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data unit...</Text>
        <AlertComponent />
      </View>
    );
  }

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
            styles.modernFilterButton,
            !selectedApartment && styles.modernFilterButtonActive,
          ]}
          onPress={() => filterByApartment(null)}
        >
          <View style={styles.filterButtonContent}>
            <Text
              style={[
                styles.modernFilterButtonText,
                !selectedApartment && styles.modernFilterButtonTextActive,
              ]}
            >
              Semua Apartemen
            </Text>
            <Text
              style={[
                styles.filterButtonCount,
                !selectedApartment && styles.filterButtonCountActive,
              ]}
            >
              {getTotalUnits()} unit
            </Text>
          </View>
        </TouchableOpacity>
        {Array.isArray(apartments) && apartments.map((apartment) => {
          const unitCount = getUnitCountByApartment(apartment.id);
          return (
            <TouchableOpacity
              key={apartment.id}
              style={[
                styles.modernFilterButton,
                selectedApartment === apartment.id && styles.modernFilterButtonActive,
              ]}
              onPress={() => filterByApartment(apartment.id)}
            >
              <View style={styles.filterButtonContent}>
                <Text
                  style={[
                    styles.modernFilterButtonText,
                    selectedApartment === apartment.id && styles.modernFilterButtonTextActive,
                  ]}
                >
                  {apartment.name || apartment.code || 'Apartemen'}
                </Text>
                <Text
                  style={[
                    styles.filterButtonCount,
                    selectedApartment === apartment.id && styles.filterButtonCountActive,
                  ]}
                >
                  {unitCount} unit
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
        data={filteredUnits || []}
        renderItem={({ item }) => {
          try {
            // Validate item data
            if (!item || !item.id) {
              console.warn('AdminUnitsScreen: Invalid unit item:', item);
              return null;
            }
            return renderUnitItem({ item });
          } catch (error) {
            console.error('AdminUnitsScreen: Error rendering unit item:', error);
            return null;
          }
        }}
        keyExtractor={(item, index) => {
          try {
            return item?.id ? item.id.toString() : `unit-${index}`;
          } catch (error) {
            console.warn('AdminUnitsScreen: Error generating key for unit:', error);
            return `unit-fallback-${index}`;
          }
        }}
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
        onError={(error) => {
          console.error('AdminUnitsScreen: FlatList error:', error);
        }}
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

      {/* Modern Alert Component */}
      <AlertComponent />
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
  checkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    padding: SIZES.sm,
    borderRadius: SIZES.radius / 2,
    marginTop: SIZES.xs,
  },
  checkoutText: {
    fontSize: SIZES.caption,
    color: COLORS.success,
    marginLeft: SIZES.xs,
    fontWeight: '600',
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
  // Modern Filter Button Styles
  modernFilterButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.background,
    marginRight: SIZES.sm,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  modernFilterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 2,
    shadowOpacity: 0.15,
  },
  filterButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernFilterButtonText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SIZES.xs,
  },
  modernFilterButtonTextActive: {
    color: COLORS.background,
  },
  filterButtonCount: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterButtonCountActive: {
    color: COLORS.background,
    opacity: 0.9,
  },
  // Loading Container Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    padding: SIZES.lg,
  },
  loadingText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
  },
});

export default AdminUnitsScreen;
