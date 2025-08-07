import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import ApartmentService from '../../services/ApartmentService';
import UnitService from '../../services/UnitService';
import CheckinService from '../../services/CheckinService';
import AuthService from '../../services/AuthService';

const AdminCheckinScreen = ({ navigation }) => {
  const [apartments, setApartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [apartmentModalVisible, setApartmentModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  
  const [formData, setFormData] = useState({
    apartmentId: '',
    unitId: '',
    durationHours: '1',
    paymentMethod: 'cash',
    paymentAmount: '',
    marketingName: '',
    notes: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.apartmentId) {
      loadUnits(formData.apartmentId);
    } else {
      setUnits([]);
      setFormData(prev => ({ ...prev, unitId: '' }));
    }
  }, [formData.apartmentId]);

  const loadInitialData = async () => {
    try {
      const apartmentResult = await ApartmentService.getActiveApartments();
      if (apartmentResult.success) {
        setApartments(apartmentResult.data);
      }
    } catch (error) {
      console.error('Load initial data error:', error);
      Alert.alert('Error', 'Gagal memuat data awal');
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async (apartmentId) => {
    try {
      const unitResult = await UnitService.getAvailableUnits(apartmentId);
      if (unitResult.success) {
        setUnits(unitResult.data);
      }
    } catch (error) {
      console.error('Load units error:', error);
      Alert.alert('Error', 'Gagal memuat data unit');
    }
  };

  const handleSubmit = async () => {
    // Validasi form
    if (!formData.apartmentId || !formData.unitId || !formData.paymentAmount || !formData.marketingName) {
      Alert.alert('Error', 'Harap lengkapi semua field yang wajib diisi');
      return;
    }

    const paymentAmount = parseFloat(formData.paymentAmount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Jumlah pembayaran harus berupa angka yang valid');
      return;
    }

    setSubmitting(true);

    try {
      const currentUser = AuthService.getCurrentUser();
      
      // Hitung checkout time
      const checkoutTime = new Date();
      checkoutTime.setHours(checkoutTime.getHours() + parseInt(formData.durationHours));

      const checkinData = {
        apartmentId: formData.apartmentId,
        unitId: formData.unitId,
        durationHours: parseInt(formData.durationHours),
        checkoutTime: checkoutTime.toISOString(),
        paymentMethod: formData.paymentMethod,
        paymentAmount: paymentAmount,
        marketingName: formData.marketingName.trim(),
        notes: formData.notes.trim(),
        createdBy: currentUser.id,
      };

      const result = await CheckinService.createCheckin(checkinData);

      if (result.success) {
        Alert.alert(
          'Berhasil',
          'Checkin berhasil dibuat',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setFormData({
                  apartmentId: '',
                  unitId: '',
                  durationHours: '1',
                  paymentMethod: 'cash',
                  paymentAmount: '',
                  marketingName: '',
                  notes: '',
                });
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Submit checkin error:', error);
      Alert.alert('Error', 'Gagal membuat checkin: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkin Manual</Text>
      </View>

      <View style={styles.form}>
        {/* Apartemen */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Apartemen *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setApartmentModalVisible(true)}
          >
            <Text style={[
              styles.selectorText,
              formData.apartmentId ? styles.selectorTextSelected : styles.selectorTextPlaceholder
            ]}>
              {formData.apartmentId
                ? apartments.find(apt => apt.id === formData.apartmentId)?.name + ` (${apartments.find(apt => apt.id === formData.apartmentId)?.code})`
                : 'Pilih Apartemen...'
              }
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Unit */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Unit *</Text>
          <TouchableOpacity
            style={[styles.selectorButton, units.length === 0 && styles.selectorButtonDisabled]}
            onPress={() => units.length > 0 && setUnitModalVisible(true)}
            disabled={units.length === 0}
          >
            <Text style={[
              styles.selectorText,
              formData.unitId ? styles.selectorTextSelected : styles.selectorTextPlaceholder,
              units.length === 0 && styles.selectorTextDisabled
            ]}>
              {formData.unitId
                ? units.find(unit => unit.id === formData.unitId)?.unit_number + ` (${units.find(unit => unit.id === formData.unitId)?.unit_type || 'Standard'})`
                : units.length === 0 ? 'Pilih apartemen terlebih dahulu' : 'Pilih Unit...'
              }
            </Text>
            <Icon name="arrow-drop-down" size={24} color={units.length === 0 ? COLORS.gray300 : COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Durasi */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Durasi (Jam) *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setDurationModalVisible(true)}
          >
            <Text style={[
              styles.selectorText,
              formData.durationHours ? styles.selectorTextSelected : styles.selectorTextPlaceholder
            ]}>
              {formData.durationHours ? `${formData.durationHours} Jam` : 'Pilih Durasi...'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Metode Pembayaran */}
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
              {formData.paymentMethod
                ? formData.paymentMethod === 'cash' ? 'Cash'
                  : formData.paymentMethod === 'transfer' ? 'Transfer Bank'
                  : formData.paymentMethod === 'ewallet' ? 'E-Wallet'
                  : formData.paymentMethod === 'credit_card' ? 'Kartu Kredit'
                  : formData.paymentMethod
                : 'Pilih Metode Pembayaran...'
              }
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Jumlah Pembayaran */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Jumlah Pembayaran (Rp) *</Text>
          <TextInput
            style={styles.input}
            value={formData.paymentAmount}
            onChangeText={(text) => setFormData({ ...formData, paymentAmount: text })}
            placeholder="Masukkan jumlah pembayaran"
            placeholderTextColor={COLORS.gray400}
            keyboardType="numeric"
          />
        </View>

        {/* Nama Marketing */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nama Marketing *</Text>
          <TextInput
            style={styles.input}
            value={formData.marketingName}
            onChangeText={(text) => setFormData({ ...formData, marketingName: text })}
            placeholder="Masukkan nama marketing"
            placeholderTextColor={COLORS.gray400}
          />
        </View>

        {/* Catatan */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Catatan tambahan (opsional)"
            placeholderTextColor={COLORS.gray400}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.submitButtonText}>Buat Checkin</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Apartment Selection Modal */}
      <Modal
        visible={apartmentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setApartmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
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
                    formData.apartmentId === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, apartmentId: item.id, unitId: '' });
                    setApartmentModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    formData.apartmentId === item.id && styles.modalItemTextSelected
                  ]}>
                    {item.name} ({item.code})
                  </Text>
                  {formData.apartmentId === item.id && (
                    <Icon name="check" size={20} color={COLORS.background} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Unit Selection Modal */}
      <Modal
        visible={unitModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUnitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Unit</Text>
              <TouchableOpacity onPress={() => setUnitModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={units}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.unitId === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, unitId: item.id });
                    setUnitModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    formData.unitId === item.id && styles.modalItemTextSelected
                  ]}>
                    {item.unit_number} ({item.unit_type || 'Standard'})
                  </Text>
                  {formData.unitId === item.id && (
                    <Icon name="check" size={20} color={COLORS.background} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Duration Selection Modal */}
      <Modal
        visible={durationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDurationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Durasi</Text>
              <TouchableOpacity onPress={() => setDurationModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[1, 2, 3, 4, 5, 6, 12, 24]}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.durationHours === item.toString() && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, durationHours: item.toString() });
                    setDurationModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    formData.durationHours === item.toString() && styles.modalItemTextSelected
                  ]}>
                    {item} Jam
                  </Text>
                  {formData.durationHours === item.toString() && (
                    <Icon name="check" size={20} color={COLORS.background} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Metode Pembayaran</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { key: 'cash', label: 'Cash' },
                { key: 'transfer', label: 'Transfer Bank' },
                { key: 'ewallet', label: 'E-Wallet' },
                { key: 'credit_card', label: 'Kartu Kredit' }
              ]}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.paymentMethod === item.key && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, paymentMethod: item.key });
                    setPaymentModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    formData.paymentMethod === item.key && styles.modalItemTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  {formData.paymentMethod === item.key && (
                    <Icon name="check" size={20} color={COLORS.background} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: SIZES.md,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  form: {
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
  selectorButton: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  selectorButtonDisabled: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray200,
  },
  selectorText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  selectorTextSelected: {
    color: COLORS.textPrimary,
  },
  selectorTextPlaceholder: {
    color: COLORS.gray400,
  },
  selectorTextDisabled: {
    color: COLORS.gray300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    width: '90%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalItem: {
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
  modalItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalItemText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  modalItemTextSelected: {
    color: COLORS.background,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: SIZES.h6,
    fontWeight: 'bold',
  },
});

export default AdminCheckinScreen;
