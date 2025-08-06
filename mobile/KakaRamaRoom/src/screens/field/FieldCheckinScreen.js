import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { COLORS, SIZES, PAYMENT_METHODS } from '../../config/constants';
import CheckinService from '../../services/CheckinService';
import UnitService from '../../services/UnitService';
import ApartmentService from '../../services/ApartmentService';
import AuthService from '../../services/AuthService';

/**
 * Screen untuk form checkin tim lapangan
 * Fitur: Input data checkin dengan validasi, upload bukti transfer, kalkulasi checkout time
 */
const FieldCheckinScreen = ({ navigation }) => {
  // State untuk data form
  const [formData, setFormData] = useState({
    apartmentId: '',
    unitId: '',
    durationHours: '',
    paymentMethod: '',
    paymentAmount: '',
    paymentProofPath: '',
    marketingName: '',
    notes: '',
  });

  // State untuk data pilihan
  const [apartments, setApartments] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // State untuk UI
  const [loading, setLoading] = useState(false);
  const [apartmentModalVisible, setApartmentModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  // Load data saat komponen dimount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter unit saat apartemen dipilih
  useEffect(() => {
    if (formData.apartmentId) {
      filterUnitsByApartment();
    }
  }, [formData.apartmentId, availableUnits]);

  // Filter unit berdasarkan pencarian
  useEffect(() => {
    filterUnitsBySearch();
  }, [unitSearchQuery, availableUnits]);

  /**
   * Load data awal (user, apartemen, unit tersedia)
   */
  const loadInitialData = async () => {
    try {
      const user = AuthService.getCurrentUser();
      setCurrentUser(user);

      if (user && user.apartmentIds) {
        // Load apartemen yang ditugaskan ke tim
        const apartmentResult = await ApartmentService.getApartmentsByIds(user.apartmentIds);
        if (apartmentResult.success) {
          setApartments(apartmentResult.data);
        }

        // Load unit tersedia dari apartemen yang ditugaskan
        const unitResult = await UnitService.getAvailableUnits(user.apartmentIds);
        if (unitResult.success) {
          setAvailableUnits(unitResult.data);
        }
      }
    } catch (error) {
      console.error('Load initial data error:', error);
      Alert.alert('Error', 'Gagal memuat data awal');
    }
  };

  /**
   * Filter unit berdasarkan apartemen yang dipilih
   */
  const filterUnitsByApartment = () => {
    if (formData.apartmentId) {
      const filtered = availableUnits.filter(
        unit => unit.apartment_id.toString() === formData.apartmentId
      );
      setFilteredUnits(filtered);
    } else {
      setFilteredUnits(availableUnits);
    }
  };

  /**
   * Filter unit berdasarkan pencarian
   */
  const filterUnitsBySearch = () => {
    let units = formData.apartmentId
      ? availableUnits.filter(unit => unit.apartment_id.toString() === formData.apartmentId)
      : availableUnits;

    if (unitSearchQuery.trim()) {
      units = units.filter(unit =>
        unit.unit_number.toLowerCase().includes(unitSearchQuery.toLowerCase()) ||
        (unit.unit_type && unit.unit_type.toLowerCase().includes(unitSearchQuery.toLowerCase()))
      );
    }

    setFilteredUnits(units);
  };

  /**
   * Pilih apartemen
   * @param {Object} apartment - Data apartemen yang dipilih
   */
  const selectApartment = (apartment) => {
    setFormData({
      ...formData,
      apartmentId: apartment.id.toString(),
      unitId: '', // Reset unit selection
    });
    setApartmentModalVisible(false);
  };

  /**
   * Pilih unit
   * @param {Object} unit - Data unit yang dipilih
   */
  const selectUnit = (unit) => {
    setFormData({
      ...formData,
      unitId: unit.id.toString(),
    });
    setUnitModalVisible(false);
    setUnitSearchQuery('');
  };

  /**
   * Pilih metode pembayaran
   * @param {string} method - Metode pembayaran yang dipilih
   */
  const selectPaymentMethod = (method) => {
    setFormData({
      ...formData,
      paymentMethod: method,
    });
    setPaymentModalVisible(false);
  };

  /**
   * Hitung waktu checkout berdasarkan durasi
   * @returns {string} - Waktu checkout dalam format string
   */
  const calculateCheckoutTime = () => {
    if (!formData.durationHours) return '';

    const now = new Date();
    const checkoutTime = new Date(now.getTime() + (parseInt(formData.durationHours) * 60 * 60 * 1000));

    return checkoutTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Buka kamera atau galeri untuk upload bukti transfer
   */
  const selectPaymentProof = () => {
    Alert.alert(
      'Pilih Sumber Gambar',
      'Pilih dari mana Anda ingin mengambil bukti transfer',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Kamera', onPress: openCamera },
        { text: 'Galeri', onPress: openGallery },
      ]
    );
  };

  /**
   * Buka kamera untuk foto bukti transfer
   */
  const openCamera = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchCamera(options, (response) => {
      if (response.assets && response.assets[0]) {
        setFormData({
          ...formData,
          paymentProofPath: response.assets[0].uri,
        });
      }
    });
  };

  /**
   * Buka galeri untuk pilih bukti transfer
   */
  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets[0]) {
        setFormData({
          ...formData,
          paymentProofPath: response.assets[0].uri,
        });
      }
    });
  };

  /**
   * Validasi form sebelum submit
   * @returns {boolean} - True jika valid, false jika tidak
   */
  const validateForm = () => {
    if (!formData.apartmentId) {
      Alert.alert('Error', 'Pilih apartemen terlebih dahulu');
      return false;
    }

    if (!formData.unitId) {
      Alert.alert('Error', 'Pilih unit terlebih dahulu');
      return false;
    }

    if (!formData.durationHours || parseInt(formData.durationHours) <= 0) {
      Alert.alert('Error', 'Masukkan durasi yang valid (minimal 1 jam)');
      return false;
    }

    if (!formData.paymentMethod) {
      Alert.alert('Error', 'Pilih metode pembayaran');
      return false;
    }

    return true;
  };

  /**
   * Submit form checkin
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const checkinData = {
        apartmentId: parseInt(formData.apartmentId),
        unitId: parseInt(formData.unitId),
        durationHours: parseInt(formData.durationHours),
        paymentMethod: formData.paymentMethod,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : null,
        paymentProofPath: formData.paymentProofPath,
        marketingName: formData.marketingName.trim(),
        notes: formData.notes.trim(),
      };

      const result = await CheckinService.createCheckin(
        checkinData,
        currentUser.id,
        'field_team'
      );

      if (result.success) {
        Alert.alert(
          'Sukses',
          'Checkin berhasil dibuat!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setFormData({
                  apartmentId: '',
                  unitId: '',
                  durationHours: '',
                  paymentMethod: '',
                  paymentAmount: '',
                  paymentProofPath: '',
                  marketingName: '',
                  notes: '',
                });

                // Refresh data
                loadInitialData();

                // Navigate back to dashboard
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Submit checkin error:', error);
      Alert.alert('Error', 'Gagal membuat checkin');
    } finally {
      setLoading(false);
    }
  };

  // Get selected apartment name
  const selectedApartment = apartments.find(apt => apt.id.toString() === formData.apartmentId);

  // Get selected unit info
  const selectedUnit = availableUnits.find(unit => unit.id.toString() === formData.unitId);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <Icon name="add-circle" size={32} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Form Check-in</Text>
          <Text style={styles.headerSubtitle}>
            Isi form di bawah untuk membuat checkin baru
          </Text>
        </View>

        {/* Apartemen Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pilih Apartemen *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setApartmentModalVisible(true)}
          >
            <Text style={[
              styles.selectorText,
              selectedApartment ? styles.selectorTextSelected : styles.selectorTextPlaceholder
            ]}>
              {selectedApartment ? selectedApartment.name : 'Pilih apartemen...'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Unit Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pilih Unit *</Text>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              !formData.apartmentId && styles.selectorButtonDisabled
            ]}
            onPress={() => formData.apartmentId && setUnitModalVisible(true)}
            disabled={!formData.apartmentId}
          >
            <Text style={[
              styles.selectorText,
              selectedUnit ? styles.selectorTextSelected : styles.selectorTextPlaceholder,
              !formData.apartmentId && styles.selectorTextDisabled
            ]}>
              {selectedUnit
                ? `${selectedUnit.unit_number}${selectedUnit.unit_type ? ` (${selectedUnit.unit_type})` : ''}`
                : formData.apartmentId
                  ? 'Pilih unit...'
                  : 'Pilih apartemen terlebih dahulu'
              }
            </Text>
            <Icon
              name="arrow-drop-down"
              size={24}
              color={!formData.apartmentId ? COLORS.gray300 : COLORS.gray400}
            />
          </TouchableOpacity>
        </View>

        {/* Duration Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Durasi (Jam) *</Text>
          <TextInput
            style={styles.input}
            value={formData.durationHours}
            onChangeText={(text) => setFormData({ ...formData, durationHours: text })}
            placeholder="Masukkan durasi dalam jam"
            placeholderTextColor={COLORS.gray400}
            keyboardType="numeric"
          />
        </View>

        {/* Checkout Time Display */}
        {formData.durationHours && (
          <View style={styles.checkoutTimeContainer}>
            <Icon name="schedule" size={20} color={COLORS.primary} />
            <Text style={styles.checkoutTimeLabel}>Waktu Checkout:</Text>
            <Text style={styles.checkoutTimeValue}>{calculateCheckoutTime()}</Text>
          </View>
        )}

        {/* Payment Method Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Metode Pembayaran *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setPaymentModalVisible(true)}
          >
            <Text style={[
              styles.selectorText,
              formData.paymentMethod ? styles.selectorTextSelected : styles.selectorTextPlaceholder
            ]}>
              {formData.paymentMethod || 'Pilih metode pembayaran...'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Payment Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nominal Pembayaran (Opsional)</Text>
          <TextInput
            style={styles.input}
            value={formData.paymentAmount}
            onChangeText={(text) => setFormData({ ...formData, paymentAmount: text })}
            placeholder="Masukkan nominal pembayaran"
            placeholderTextColor={COLORS.gray400}
            keyboardType="numeric"
          />
        </View>

        {/* Payment Proof Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bukti Transfer (Opsional)</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={selectPaymentProof}
          >
            <Icon name="camera-alt" size={24} color={COLORS.primary} />
            <Text style={styles.uploadButtonText}>
              {formData.paymentProofPath ? 'Ganti Bukti Transfer' : 'Upload Bukti Transfer'}
            </Text>
          </TouchableOpacity>

          {formData.paymentProofPath && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: formData.paymentProofPath }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setFormData({ ...formData, paymentProofPath: '' })}
              >
                <Icon name="close" size={20} color={COLORS.background} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Marketing Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nama Marketing (Opsional)</Text>
          <TextInput
            style={styles.input}
            value={formData.marketingName}
            onChangeText={(text) => setFormData({ ...formData, marketingName: text })}
            placeholder="Masukkan nama marketing"
            placeholderTextColor={COLORS.gray400}
          />
        </View>

        {/* Notes Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Masukkan catatan tambahan"
            placeholderTextColor={COLORS.gray400}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Memproses...' : 'Buat Checkin'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Apartment Selection Modal */}
      <Modal
        visible={apartmentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Apartemen</Text>
            <TouchableOpacity onPress={() => setApartmentModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={apartments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.apartmentId === item.id.toString() && styles.modalItemSelected
                ]}
                onPress={() => selectApartment(item)}
              >
                <Text style={[
                  styles.modalItemText,
                  formData.apartmentId === item.id.toString() && styles.modalItemTextSelected
                ]}>
                  {item.name}
                </Text>
                {formData.apartmentId === item.id.toString() && (
                  <Icon name="check" size={20} color={COLORS.background} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.modalContent}
          />
        </View>
      </Modal>

      {/* Unit Selection Modal */}
      <Modal
        visible={unitModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Unit</Text>
            <TouchableOpacity onPress={() => {
              setUnitModalVisible(false);
              setUnitSearchQuery('');
            }}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search Unit */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari unit..."
              value={unitSearchQuery}
              onChangeText={setUnitSearchQuery}
              placeholderTextColor={COLORS.gray400}
            />
          </View>

          <FlatList
            data={filteredUnits}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.unitId === item.id.toString() && styles.modalItemSelected
                ]}
                onPress={() => selectUnit(item)}
              >
                <View style={styles.unitItemInfo}>
                  <Text style={[
                    styles.modalItemText,
                    formData.unitId === item.id.toString() && styles.modalItemTextSelected
                  ]}>
                    {item.unit_number}
                  </Text>
                  {item.unit_type && (
                    <Text style={[
                      styles.unitTypeText,
                      formData.unitId === item.id.toString() && styles.unitTypeTextSelected
                    ]}>
                      {item.unit_type}
                    </Text>
                  )}
                  <Text style={[
                    styles.apartmentNameText,
                    formData.unitId === item.id.toString() && styles.apartmentNameTextSelected
                  ]}>
                    {item.apartment_name}
                  </Text>
                </View>
                {formData.unitId === item.id.toString() && (
                  <Icon name="check" size={20} color={COLORS.background} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.modalContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="meeting-room" size={48} color={COLORS.gray400} />
                <Text style={styles.emptyText}>
                  {unitSearchQuery ? 'Unit tidak ditemukan' : 'Tidak ada unit tersedia'}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Metode Pembayaran</Text>
            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={PAYMENT_METHODS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.paymentMethod === item && styles.modalItemSelected
                ]}
                onPress={() => selectPaymentMethod(item)}
              >
                <Text style={[
                  styles.modalItemText,
                  formData.paymentMethod === item && styles.modalItemTextSelected
                ]}>
                  {item}
                </Text>
                {formData.paymentMethod === item && (
                  <Icon name="check" size={20} color={COLORS.background} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.modalContent}
          />
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  content: {
    padding: SIZES.lg,
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
    borderRadius: SIZES.radius,
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
    marginTop: SIZES.sm,
  },
  headerSubtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
  inputGroup: {
    marginBottom: SIZES.lg,
  },
  inputLabel: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.background,
  },
  selectorButtonDisabled: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray200,
  },
  selectorText: {
    fontSize: SIZES.body,
    flex: 1,
  },
  selectorTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  selectorTextPlaceholder: {
    color: COLORS.gray400,
  },
  selectorTextDisabled: {
    color: COLORS.gray300,
  },
  checkoutTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.lg,
  },
  checkoutTimeLabel: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: SIZES.sm,
  },
  checkoutTimeValue: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.lg,
    backgroundColor: COLORS.background,
  },
  uploadButtonText: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: SIZES.sm,
  },
  imagePreview: {
    marginTop: SIZES.md,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: SIZES.radius,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    backgroundColor: COLORS.error,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    marginTop: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray400,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.background,
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
    padding: SIZES.lg,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
    backgroundColor: COLORS.gray100,
  },
  modalItemSelected: {
    backgroundColor: COLORS.primary,
  },
  modalItemText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  modalItemTextSelected: {
    color: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SIZES.lg,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray100,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
  },
  unitItemInfo: {
    flex: 1,
  },
  unitTypeText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs / 2,
  },
  unitTypeTextSelected: {
    color: COLORS.background + 'CC',
  },
  apartmentNameText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs / 2,
  },
  apartmentNameTextSelected: {
    color: COLORS.background + 'CC',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
  },
});

export default FieldCheckinScreen;
