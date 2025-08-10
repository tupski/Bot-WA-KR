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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, APARTMENTS } from '../../config/constants';
import ApartmentService from '../../services/ApartmentService';
import AuthService from '../../services/AuthService';

const AdminApartmentsScreen = ({ navigation }) => {
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
      const result = await ApartmentService.getAllApartments();
      console.log('AdminApartmentsScreen: Service result:', result);

      if (result.success) {
        console.log(`AdminApartmentsScreen: Setting ${result.data.length} apartments`);
        setApartments(result.data);
      } else {
        console.error('AdminApartmentsScreen: Service error:', result.message);
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('AdminApartmentsScreen: Load apartments error:', error);
      Alert.alert('Error', 'Gagal memuat data apartemen: ' + error.message);
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
    if (!formData.name.trim() || !formData.code.trim()) {
      Alert.alert('Error', 'Nama dan kode apartemen harus diisi');
      return;
    }

    try {
      const currentUser = AuthService.getCurrentUser();
      let result;

      if (editingApartment) {
        result = await ApartmentService.updateApartment(
          editingApartment.id,
          formData,
          currentUser.id
        );
      } else {
        result = await ApartmentService.createApartment(formData, currentUser.id);
      }

      if (result.success) {
        Alert.alert('Sukses', result.message);
        setModalVisible(false);
        await loadApartments();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Save apartment error:', error);
      Alert.alert('Error', 'Gagal menyimpan data apartemen');
    }
  };

  const handleDelete = (apartment) => {
    Alert.alert(
      'Konfirmasi Hapus',
      `Apakah Anda yakin ingin menghapus apartemen "${apartment.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteApartment(apartment.id),
        },
      ]
    );
  };

  const deleteApartment = async (id) => {
    try {
      const currentUser = AuthService.getCurrentUser();
      const result = await ApartmentService.deleteApartment(id, currentUser.id);

      if (result.success) {
        Alert.alert('Sukses', result.message);
        await loadApartments();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Delete apartment error:', error);
      Alert.alert('Error', 'Gagal menghapus apartemen');
    }
  };

  const filteredApartments = apartments.filter(
    (apartment) =>
      apartment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apartment.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getApartmentColor = (code) => {
    return APARTMENTS[code]?.color || COLORS.gray500;
  };

  const renderApartmentItem = ({ item }) => {
    const handleApartmentPress = () => {
      try {
        console.log('AdminApartmentsScreen: Apartment pressed:', item);

        if (!item || !item.id) {
          console.error('AdminApartmentsScreen: Invalid apartment item:', item);
          Alert.alert('Error', 'Data apartemen tidak valid');
          return;
        }

        console.log('AdminApartmentsScreen: Navigating to detail with ID:', item.id);
        navigation.navigate('AdminApartmentDetail', { apartmentId: item.id });
      } catch (error) {
        console.error('AdminApartmentsScreen: Error navigating to apartment detail:', error);
        Alert.alert('Error', 'Gagal membuka detail apartemen');
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
        data={filteredApartments}
        renderItem={renderApartmentItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
              {editingApartment ? 'Edit Apartemen' : 'Tambah Apartemen'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

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
});

export default AdminApartmentsScreen;
