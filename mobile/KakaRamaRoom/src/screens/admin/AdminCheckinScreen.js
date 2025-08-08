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
  Image,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import ApartmentService from '../../services/ApartmentService';
import UnitService from '../../services/UnitService';
import CheckinService from '../../services/CheckinService';
import AuthService from '../../services/AuthService';
import MarketingSourceService from '../../services/MarketingSourceService';
import CurrencyInput from '../../components/CurrencyInput';

const AdminCheckinScreen = ({ navigation }) => {
  const [apartments, setApartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [marketingSources, setMarketingSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [apartmentModalVisible, setApartmentModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [marketingModalVisible, setMarketingModalVisible] = useState(false);

  // Marketing search
  const [marketingSearchQuery, setMarketingSearchQuery] = useState('');
  const [filteredMarketingSources, setFilteredMarketingSources] = useState([]);

  // Payment proof
  const [paymentProof, setPaymentProof] = useState(null);

  const [formData, setFormData] = useState({
    apartmentId: '',
    unitId: '',
    durationHours: '3',
    paymentMethod: 'cash',
    paymentAmount: '',
    marketingCommission: '',
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
      const [apartmentResult, marketingResult] = await Promise.all([
        ApartmentService.getActiveApartments(),
        MarketingSourceService.getAllMarketingSources()
      ]);

      if (apartmentResult.success) {
        setApartments(apartmentResult.data);
      }

      if (marketingResult.success) {
        setMarketingSources(marketingResult.data);
        setFilteredMarketingSources(marketingResult.data);
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

  // Marketing search functionality
  const handleMarketingSearch = (query) => {
    setMarketingSearchQuery(query);

    if (!query.trim()) {
      setFilteredMarketingSources(marketingSources);
      return;
    }

    const filtered = marketingSources.filter(source =>
      source.name.toLowerCase().includes(query.toLowerCase())
    );

    // Add current query as option if not found
    const exactMatch = filtered.find(source =>
      source.name.toLowerCase() === query.toLowerCase()
    );

    if (!exactMatch && query.trim()) {
      filtered.unshift({ id: 'new', name: query.trim() });
    }

    setFilteredMarketingSources(filtered);
  };

  const selectMarketingSource = async (source) => {
    setFormData({ ...formData, marketingName: source.name });
    setMarketingModalVisible(false);
    setMarketingSearchQuery('');

    // Add to database if new
    if (source.id === 'new') {
      await MarketingSourceService.addMarketingSourceIfNotExists(source.name);
    } else {
      // Increment usage count
      await MarketingSourceService.incrementUsage(source.name);
    }
  };

  // Payment proof functionality
  const selectPaymentProof = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
      });

      if (result && result[0]) {
        setPaymentProof(result[0]);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Gagal memilih file bukti pembayaran');
      }
    }
  };

  const removePaymentProof = () => {
    setPaymentProof(null);
  };

  // Payment methods with new options
  const paymentMethods = [
    { key: 'cash', label: 'Cash' },
    { key: 'transfer_kr', label: 'Transfer KR' },
    { key: 'transfer_amel', label: 'Transfer Amel' },
    { key: 'cash_amel', label: 'Cash Amel' },
    { key: 'qris', label: 'QRIS' },
    { key: 'apk', label: 'APK' },
  ];

  const getPaymentMethodLabel = (key) => {
    const method = paymentMethods.find(m => m.key === key);
    return method ? method.label : key;
  };

  const handleSubmit = async () => {
    // Validasi form
    if (!formData.apartmentId || !formData.unitId || !formData.paymentAmount) {
      Alert.alert('Error', 'Harap lengkapi apartemen, unit, dan jumlah pembayaran');
      return;
    }

    const durationHours = parseInt(formData.durationHours);
    if (isNaN(durationHours) || durationHours <= 0) {
      Alert.alert('Error', 'Durasi harus berupa angka yang valid');
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
        durationHours: durationHours,
        checkoutTime: checkoutTime.toISOString(),
        paymentMethod: formData.paymentMethod,
        paymentAmount: paymentAmount,
        marketingCommission: parseFloat(formData.marketingCommission) || 0,
        marketingName: formData.marketingName.trim() || null,
        notes: formData.notes.trim() || null,
        paymentProof: paymentProof,
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
                  durationHours: '3',
                  paymentMethod: 'cash',
                  paymentAmount: '',
                  marketingCommission: '',
                  marketingName: '',
                  notes: '',
                });
                setPaymentProof(null);
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
          <TextInput
            style={styles.textInput}
            value={formData.durationHours}
            onChangeText={(text) => setFormData({ ...formData, durationHours: text })}
            placeholder="Masukkan durasi dalam jam"
            keyboardType="numeric"
            placeholderTextColor={COLORS.gray400}
          />
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
                ? getPaymentMethodLabel(formData.paymentMethod)
                  : formData.paymentMethod
                : 'Pilih Metode Pembayaran...'
              }
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Jumlah Pembayaran */}
        <View style={styles.inputGroup}>
          <CurrencyInput
            label="Jumlah Pembayaran *"
            value={formData.paymentAmount}
            onChangeValue={(value) => setFormData({ ...formData, paymentAmount: value })}
            placeholder="Masukkan nominal pembayaran"
            style={styles.currencyInput}
          />
        </View>

        {/* Upload Bukti Pembayaran */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bukti Pembayaran</Text>
          {paymentProof ? (
            <View style={styles.paymentProofContainer}>
              <View style={styles.paymentProofInfo}>
                <Icon name="attach-file" size={20} color={COLORS.primary} />
                <Text style={styles.paymentProofName} numberOfLines={1}>
                  {paymentProof.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeProofButton}
                onPress={removePaymentProof}
              >
                <Icon name="close" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={selectPaymentProof}
            >
              <Icon name="cloud-upload" size={24} color={COLORS.primary} />
              <Text style={styles.uploadButtonText}>Upload Bukti Pembayaran</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nama Marketing dengan Select2 */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nama Marketing</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setMarketingModalVisible(true)}
          >
            <Text style={[
              styles.selectorText,
              formData.marketingName ? styles.selectorTextSelected : styles.selectorTextPlaceholder
            ]}>
              {formData.marketingName || 'Pilih atau tambah marketing...'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Komisi Marketing */}
        <View style={styles.inputGroup}>
          <CurrencyInput
            label="Komisi Marketing"
            value={formData.marketingCommission}
            onChangeValue={(value) => setFormData({ ...formData, marketingCommission: value })}
            placeholder="Masukkan komisi marketing"
            style={styles.currencyInput}
          />
        </View>

        {/* Catatan */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Catatan</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
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
              data={paymentMethods}
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

      {/* Marketing Selection Modal */}
      <Modal
        visible={marketingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMarketingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Sumber Marketing</Text>
              <TouchableOpacity onPress={() => setMarketingModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={COLORS.gray400} />
              <TextInput
                style={styles.searchInput}
                value={marketingSearchQuery}
                onChangeText={handleMarketingSearch}
                placeholder="Cari atau tambah marketing baru..."
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <FlatList
              data={filteredMarketingSources}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.id === 'new' && styles.modalItemNew
                  ]}
                  onPress={() => selectMarketingSource(item)}
                >
                  <View style={styles.marketingItemContent}>
                    {item.id === 'new' && (
                      <Icon name="add" size={20} color={COLORS.primary} style={styles.marketingIcon} />
                    )}
                    <Text style={[
                      styles.modalItemText,
                      item.id === 'new' && styles.modalItemTextNew
                    ]}>
                      {item.id === 'new' ? `Tambah "${item.name}"` : item.name}
                    </Text>
                  </View>
                  {item.usage_count > 0 && item.id !== 'new' && (
                    <Text style={styles.usageCount}>
                      {item.usage_count}x
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyMarketingContainer}>
                  <Icon name="search-off" size={48} color={COLORS.gray400} />
                  <Text style={styles.emptyMarketingText}>
                    Tidak ada hasil pencarian
                  </Text>
                </View>
              }
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
  textInput: {
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
  // Payment proof styles
  paymentProofContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray100,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  paymentProofInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentProofName: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  removeProofButton: {
    padding: SIZES.xs,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Marketing modal styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    margin: SIZES.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
  },
  modalItemNew: {
    backgroundColor: COLORS.primary + '10',
  },
  marketingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  marketingIcon: {
    marginRight: SIZES.sm,
  },
  modalItemTextNew: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  usageCount: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.gray200,
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.radius / 2,
  },
  emptyMarketingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyMarketingText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
  },
  currencyInput: {
    borderWidth: 0, // Remove border since CurrencyInput has its own
  },
});

export default AdminCheckinScreen;
