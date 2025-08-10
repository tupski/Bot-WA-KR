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
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, APARTMENTS } from '../../config/constants';
import ApartmentService from '../../services/ApartmentService';
import AuthService from '../../services/AuthService';
import { useModernAlert } from '../../components/ModernAlert';
import ModernModal from '../../components/ModernModal';

const AdminApartmentsScreen = ({ navigation }) => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingApartment, setEditingApartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    loadApartments();
  }, []);

  const loadApartments = async () => {
    try {
      console.log('AdminApartmentsScreen: Loading apartments...');

      // Validate ApartmentService
      if (!ApartmentService || typeof ApartmentService.getAllApartments !== 'function') {
        throw new Error('ApartmentService tidak tersedia atau tidak valid');
      }

      const result = await ApartmentService.getAllApartments();
      console.log('AdminApartmentsScreen: Service result:', result);

      if (result && result.success) {
        const apartmentData = Array.isArray(result.data) ? result.data : [];
        console.log(`AdminApartmentsScreen: Setting ${apartmentData.length} apartments`);
        setApartments(apartmentData);
      } else {
        console.error('AdminApartmentsScreen: Service error:', result?.message || 'Unknown error');
        showAlert({
          type: 'error',
          title: 'Error',
          message: result?.message || 'Gagal memuat data apartemen',
        });
        setApartments([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('AdminApartmentsScreen: Load apartments error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal memuat data apartemen: ${error.message || 'Unknown error'}`,
      });
      setApartments([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApartments();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingApartment(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      description: '',
      status: 'active',
    });
    setModalVisible(true);
  };

  const openEditModal = (apartment) => {
    setEditingApartment(apartment);
    setFormData({
      name: apartment.name,
      code: apartment.code,
      address: apartment.address || '',
      description: apartment.description || '',
      status: apartment.status,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validasi input
    if (!formData.name?.trim() || !formData.code?.trim()) {
      showAlert({
        type: 'warning',
        title: 'Validasi Error',
        message: 'Nama dan kode apartemen harus diisi',
      });
      return;
    }

    try {
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

      // Validasi service methods
      const isUpdate = editingApartment && editingApartment.id;
      const serviceMethod = isUpdate ? 'updateApartment' : 'createApartment';

      if (!ApartmentService || typeof ApartmentService[serviceMethod] !== 'function') {
        throw new Error(`ApartmentService.${serviceMethod} tidak tersedia`);
      }

      let result;
      if (isUpdate) {
        result = await ApartmentService.updateApartment(
          editingApartment.id,
          formData,
          currentUser.id
        );
      } else {
        result = await ApartmentService.createApartment(formData, currentUser.id);
      }

      if (result && result.success) {
        showAlert({
          type: 'success',
          title: 'Sukses',
          message: result.message || `Apartemen berhasil ${isUpdate ? 'diperbarui' : 'dibuat'}`,
          onDismiss: () => {
            setModalVisible(false);
            loadApartments(); // Reload data
          },
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: result?.message || 'Gagal menyimpan data apartemen',
        });
      }
    } catch (error) {
      console.error('AdminApartmentsScreen: Save apartment error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal menyimpan data apartemen: ${error.message || 'Unknown error'}`,
      });
    }
  };

  const handleDelete = (apartment) => {
    // Validasi apartment object
    if (!apartment || !apartment.id || !apartment.name) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Data apartemen tidak valid',
      });
      return;
    }

    showAlert({
      type: 'confirm',
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus apartemen "${apartment.name}"?\n\nTindakan ini tidak dapat dibatalkan.`,
      buttons: [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteApartment(apartment.id),
        },
      ],
    });
  };

  const deleteApartment = async (id) => {
    try {
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

      // Validasi service method
      if (!ApartmentService || typeof ApartmentService.deleteApartment !== 'function') {
        throw new Error('ApartmentService.deleteApartment tidak tersedia');
      }

      const result = await ApartmentService.deleteApartment(id, currentUser.id);

      if (result && result.success) {
        showAlert({
          type: 'success',
          title: 'Sukses',
          message: result.message || 'Apartemen berhasil dihapus',
          onDismiss: () => {
            loadApartments(); // Reload data
          },
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: result?.message || 'Gagal menghapus apartemen',
        });
      }
    } catch (error) {
      console.error('AdminApartmentsScreen: Delete apartment error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal menghapus apartemen: ${error.message || 'Unknown error'}`,
      });
    }
  };

  // Filter apartments dengan safe operations
  const filteredApartments = Array.isArray(apartments) ? apartments.filter(
    (apartment) => {
      if (!apartment || typeof apartment !== 'object') return false;
      const name = apartment.name || '';
      const code = apartment.code || '';
      const query = searchQuery.toLowerCase();
      return name.toLowerCase().includes(query) || code.toLowerCase().includes(query);
    }
  ) : [];

  // Safe function untuk mendapatkan warna apartemen
  const getApartmentColor = (code) => {
    try {
      if (!code || typeof code !== 'string') {
        return COLORS.gray500;
      }

      // Check if APARTMENTS is defined and has the code
      if (APARTMENTS && typeof APARTMENTS === 'object' && APARTMENTS[code]) {
        return APARTMENTS[code].color || COLORS.gray500;
      }

      // Fallback colors based on code
      const colorMap = {
        'TREEPARK': '#4CAF50',
        'SKYHOUSE': '#2196F3',
        'SPRINGWOOD': '#87CEEB',
        'EMERALD': '#009688',
        'GOLDFINCH': '#FFD700',
        'BLUEBIRD': '#1E90FF',
      };

      return colorMap[code] || COLORS.gray500;
    } catch (error) {
      console.error('AdminApartmentsScreen: Error getting apartment color:', error);
      return COLORS.gray500;
    }
  };

  const renderApartmentItem = ({ item }) => {
    const handleApartmentPress = () => {
      try {
        console.log('AdminApartmentsScreen: Apartment pressed:', item);

        if (!item || !item.id) {
          console.error('AdminApartmentsScreen: Invalid apartment item:', item);
          showAlert({
            type: 'error',
            title: 'Error',
            message: 'Data apartemen tidak valid',
          });
          return;
        }

        console.log('AdminApartmentsScreen: Navigating to detail with ID:', item.id);

        // Check if navigation is available
        if (!navigation || typeof navigation.navigate !== 'function') {
          throw new Error('Navigation tidak tersedia');
        }

        navigation.navigate('AdminApartmentDetail', { apartmentId: item.id });
      } catch (error) {
        console.error('AdminApartmentsScreen: Error navigating to apartment detail:', error);
        showAlert({
          type: 'error',
          title: 'Error',
          message: `Gagal membuka detail apartemen: ${error.message || 'Unknown error'}`,
        });
      }
    };

    return (
      <TouchableOpacity
        style={styles.apartmentCard}
        onPress={handleApartmentPress}
      >
      <View style={styles.apartmentHeader}>
        <View style={styles.apartmentInfo}>
          <View
            style={[
              styles.apartmentIndicator,
              { backgroundColor: getApartmentColor(item.code) },
            ]}
          />
          <View style={styles.apartmentDetails}>
            <Text style={styles.apartmentName}>{item.name}</Text>
            <Text style={styles.apartmentCode}>Kode: {item.code}</Text>
          </View>
        </View>
        <View style={styles.apartmentActions}>
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

      {item.address && (
        <Text style={styles.apartmentAddress}>{item.address}</Text>
      )}
      {item.description && (
        <Text style={styles.apartmentDescription}>{item.description}</Text>
      )}
    </TouchableOpacity>
    );
  };

  // Show loading indicator saat pertama kali load
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data apartemen...</Text>
        <AlertComponent />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manajemen Apartemen</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Icon name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari apartemen..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray400}
        />
      </View>

      {/* Apartment List */}
      <FlatList
        data={filteredApartments || []}
        renderItem={({ item }) => {
          try {
            // Validate item data
            if (!item || !item.id) {
              console.warn('AdminApartmentsScreen: Invalid apartment item:', item);
              return null;
            }
            return renderApartmentItem({ item });
          } catch (error) {
            console.error('AdminApartmentsScreen: Error rendering apartment item:', error);
            return null;
          }
        }}
        keyExtractor={(item, index) => {
          try {
            return item?.id ? item.id.toString() : `apartment-${index}`;
          } catch (error) {
            console.warn('AdminApartmentsScreen: Error generating key for apartment:', error);
            return `apartment-fallback-${index}`;
          }
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="apartment" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Tidak ada apartemen yang sesuai pencarian' : 'Belum ada apartemen'}
            </Text>
            <Text style={styles.emptySubtext}>
              Tap tombol + untuk menambah apartemen baru
            </Text>
          </View>
        }
        onError={(error) => {
          console.error('AdminApartmentsScreen: FlatList error:', error);
        }}
      />

      {/* Add/Edit Modal */}
      <ModernModal
        visible={modalVisible}
        title={editingApartment ? 'Edit Apartemen' : 'Tambah Apartemen'}
        onClose={() => setModalVisible(false)}
        scrollable={true}
        maxHeight="90%"
      >

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Apartemen *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Masukkan nama apartemen"
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kode Apartemen *</Text>
              <TextInput
                style={styles.input}
                value={formData.code}
                onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                placeholder="Masukkan kode apartemen"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="characters"
              />
            </View>



            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Masukkan alamat apartemen"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Deskripsi</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Masukkan deskripsi apartemen"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={3}
              />
            </View>

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
          </View>
      </ModernModal>

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
  apartmentCard: {
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
  apartmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  apartmentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  apartmentIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: SIZES.sm,
  },
  apartmentDetails: {
    flex: 1,
  },
  apartmentName: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs / 2,
  },
  apartmentCode: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  apartmentGroup: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    fontWeight: '500',
  },
  apartmentActions: {
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
  apartmentAddress: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  apartmentDescription: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.lg,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.md,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: SIZES.caption,
    color: COLORS.gray400,
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
});

export default AdminApartmentsScreen;
