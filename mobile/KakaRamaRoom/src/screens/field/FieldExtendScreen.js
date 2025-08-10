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
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, PAYMENT_METHODS, CHECKIN_STATUS } from '../../config/constants';
import CheckinService from '../../services/CheckinService';
import AuthService from '../../services/AuthService';

/**
 * Screen untuk extend checkin yang sudah ada
 * Fitur: Form extend dengan data pre-filled, upload bukti transfer tambahan
 */
const FieldExtendScreen = ({ navigation, route }) => {
  // Get checkin data atau checkin ID dari navigation params
  const { checkinData, checkinId } = route.params || {};

  // State untuk checkin data
  const [checkin, setCheckin] = useState(checkinData || null);
  const [loadingCheckin, setLoadingCheckin] = useState(false);

  // State untuk form extend
  const [formData, setFormData] = useState({
    additionalHours: '',
    paymentMethod: 'cash',
    paymentAmount: '',
    paymentProofPath: '',
    notes: '',
  });

  // State untuk UI
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Load data saat komponen dimount
  useEffect(() => {
    loadUserData();

    // Jika ada checkinId tapi tidak ada checkinData, load data checkin
    if (checkinId && !checkinData) {
      loadCheckinData();
    } else if (!checkinData && !checkinId) {
      // Jika tidak ada data checkin sama sekali
      Alert.alert(
        'Error',
        'Data checkin tidak ditemukan',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, []);

  /**
   * Load data checkin berdasarkan ID
   */
  const loadCheckinData = async () => {
    try {
      setLoadingCheckin(true);
      console.log('FieldExtendScreen: Loading checkin data for ID:', checkinId);

      const result = await CheckinService.getCheckinById(checkinId);

      if (result.success && result.data) {
        console.log('FieldExtendScreen: Loaded checkin data:', result.data);
        setCheckin(result.data);
      } else {
        console.error('FieldExtendScreen: Failed to load checkin:', result.message);
        Alert.alert(
          'Error',
          result.message || 'Gagal memuat data checkin',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('FieldExtendScreen: Error loading checkin data:', error);
      Alert.alert(
        'Error',
        'Terjadi kesalahan saat memuat data checkin',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoadingCheckin(false);
    }
  };

  /**
   * Load data user yang sedang login
   */
  const loadUserData = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
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
   * Hitung waktu checkout baru berdasarkan extend
   * @returns {string} - Waktu checkout baru dalam format string
   */
  const calculateNewCheckoutTime = () => {
    if (!formData.additionalHours || !checkinData) return '';

    const currentCheckoutTime = new Date(checkinData.checkout_time);
    const newCheckoutTime = new Date(
      currentCheckoutTime.getTime() + (parseInt(formData.additionalHours) * 60 * 60 * 1000)
    );

    return newCheckoutTime.toLocaleString('id-ID', {
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
    Alert.alert('Info', 'Fitur kamera akan tersedia setelah instalasi react-native-image-picker');
  };

  /**
   * Buka galeri untuk pilih bukti transfer
   */
  const openGallery = () => {
    Alert.alert('Info', 'Fitur galeri akan tersedia setelah instalasi react-native-image-picker');
  };

  /**
   * Validasi form sebelum submit
   * @returns {boolean} - True jika valid, false jika tidak
   */
  const validateForm = () => {
    if (!formData.additionalHours || parseInt(formData.additionalHours) <= 0) {
      Alert.alert('Error', 'Masukkan durasi extend yang valid (minimal 1 jam)');
      return false;
    }

    if (!formData.paymentMethod) {
      Alert.alert('Error', 'Pilih metode pembayaran');
      return false;
    }

    return true;
  };

  /**
   * Submit form extend checkin
   */
  const handleSubmit = async () => {
    try {
      // Validasi checkin data
      if (!checkin || !checkin.id) {
        Alert.alert('Error', 'Data checkin tidak valid. Silakan coba lagi.');
        return;
      }

      // Validasi user
      if (!currentUser || !currentUser.id) {
        Alert.alert('Error', 'Data pengguna tidak valid. Silakan login ulang.');
        return;
      }

      if (!validateForm()) return;

      setLoading(true);

      const extendData = {
        additionalHours: parseInt(formData.additionalHours),
        paymentMethod: formData.paymentMethod,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount.replace(/[^\d]/g, '')) : null,
        paymentProofPath: formData.paymentProofPath,
        notes: formData.notes.trim() || null,
      };

      console.log('FieldExtendScreen: Submitting extend with data:', {
        checkinId: checkin.id,
        extendData,
        userId: currentUser.id,
      });

      const result = await CheckinService.extendCheckin(
        checkin.id,
        extendData,
        currentUser.id,
        'field_team'
      );

      console.log('FieldExtendScreen: Extend result:', result);

      if (result.success) {
        Alert.alert(
          'Sukses',
          'Checkin berhasil diperpanjang!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back dengan refresh flag
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Gagal memperpanjang checkin');
      }
    } catch (error) {
      console.error('FieldExtendScreen: Submit extend error:', error);
      Alert.alert('Error', `Gagal memperpanjang checkin: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Jika sedang loading checkin data
  if (loadingCheckin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data checkin...</Text>
      </View>
    );
  }

  // Jika tidak ada data checkin, tampilkan error
  if (!checkin) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Data checkin tidak ditemukan</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <Icon name="access-time" size={32} color={COLORS.warning} />
          <Text style={styles.headerTitle}>Extend Check-in</Text>
          <Text style={styles.headerSubtitle}>
            Perpanjang waktu checkin untuk unit {checkin.units?.unit_number || checkin.unit_number || 'N/A'}
          </Text>
        </View>

        {/* Current Checkin Info */}
        <View style={styles.checkinInfoCard}>
          <Text style={styles.cardTitle}>Informasi Checkin Saat Ini</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unit:</Text>
            <Text style={styles.infoValue}>
              {checkin.units?.unit_number || checkin.unit_number || 'N/A'} - {checkin.apartments?.name || checkin.apartment_name || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waktu Checkout Saat Ini:</Text>
            <Text style={styles.infoValue}>
              {checkin.checkout_time ? new Date(checkin.checkout_time).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: checkin.status === 'active' ? COLORS.success : COLORS.warning }
            ]}>
              <Text style={styles.statusText}>
                {checkin.status === 'active' ? 'Aktif' : 'Extended'}
              </Text>
            </View>
          </View>
        </View>

        {/* Extend Form */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Form Extend</Text>

          {/* Additional Duration Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tambahan Durasi (Jam) *</Text>
            <TextInput
              style={styles.input}
              value={formData.additionalHours}
              onChangeText={(text) => setFormData({ ...formData, additionalHours: text })}
              placeholder="Masukkan tambahan durasi dalam jam"
              placeholderTextColor={COLORS.gray400}
              keyboardType="numeric"
            />
          </View>

          {/* New Checkout Time Display */}
          {formData.additionalHours && (
            <View style={styles.newCheckoutTimeContainer}>
              <Icon name="schedule" size={20} color={COLORS.success} />
              <Text style={styles.newCheckoutTimeLabel}>Waktu Checkout Baru:</Text>
              <Text style={styles.newCheckoutTimeValue}>{calculateNewCheckoutTime()}</Text>
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

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Masukkan catatan tambahan untuk extend"
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
              {loading ? 'Memproses...' : 'Extend Checkin'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.xl,
  },
  errorText: {
    fontSize: SIZES.h5,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: SIZES.lg,
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
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
  checkinInfoCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  infoLabel: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.radius / 2,
  },
  statusText: {
    fontSize: SIZES.caption,
    color: COLORS.background,
    fontWeight: '500',
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
  newCheckoutTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.lg,
  },
  newCheckoutTimeLabel: {
    fontSize: SIZES.body,
    color: COLORS.success,
    fontWeight: '500',
    marginLeft: SIZES.sm,
  },
  newCheckoutTimeValue: {
    fontSize: SIZES.body,
    color: COLORS.success,
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
    backgroundColor: COLORS.warning,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
  },
  loadingText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    marginTop: SIZES.lg,
  },
  retryButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.background,
    textAlign: 'center',
  },
});

export default FieldExtendScreen;
