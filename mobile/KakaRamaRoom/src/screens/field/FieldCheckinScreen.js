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
import { COLORS, SIZES } from '../../config/constants';
import CheckinService from '../../services/CheckinService';
import AuthService from '../../services/AuthService';
import MarketingSourceService from '../../services/MarketingSourceService';
import ImagePickerService from '../../services/ImagePickerService';
import TeamAssignmentService from '../../services/TeamAssignmentService';
import CurrencyInput from '../../components/CurrencyInput';
import ModernModal from '../../components/ModernModal';
import { useModernAlert } from '../../components/ModernAlert';
import TimeUtils from '../../utils/TimeUtils';

/**
 * Screen untuk form checkin tim lapangan
 * Fitur: Input data checkin dengan validasi, upload bukti transfer, kalkulasi checkout time
 */
const FieldCheckinScreen = ({ navigation, route }) => {
  // Get prefilled data from navigation params
  const { prefilledData } = route.params || {};
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

  // State untuk data form
  const [formData, setFormData] = useState({
    apartmentId: prefilledData?.apartmentId || '',
    unitId: prefilledData?.unitId || '',
    durationHours: '3',
    paymentMethod: 'cash',
    paymentAmount: '',
    marketingCommission: '',
    marketingName: '',
    notes: '',
  });

  // State untuk data pilihan
  const [apartments, setApartments] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [marketingSources, setMarketingSources] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // State untuk UI
  const [loading, setLoading] = useState(false);
  const [apartmentModalVisible, setApartmentModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [marketingModalVisible, setMarketingModalVisible] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  // Marketing search
  const [marketingSearchQuery, setMarketingSearchQuery] = useState('');
  const [filteredMarketingSources, setFilteredMarketingSources] = useState([]);

  // Payment proof - support multiple images (max 5)
  const [paymentProofs, setPaymentProofs] = useState([]);

  // Load data saat komponen dimount
  useEffect(() => {
    loadInitialData();

    // Show info if unit is prefilled
    if (prefilledData && prefilledData.unitNumber && prefilledData.apartmentName) {
      showAlert({
        type: 'info',
        title: 'Unit Dipilih',
        message: `Unit ${prefilledData.unitNumber} - ${prefilledData.apartmentName} telah dipilih otomatis.`,
        autoClose: 3000,
      });
    }
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

  /**
   * Load data awal (user, apartemen, unit tersedia)
   */
  const loadInitialData = async () => {
    try {
      console.log('FieldCheckinScreen: Starting loadInitialData');

      const user = AuthService.getCurrentUser();
      setCurrentUser(user);

      if (!user) {
        console.error('FieldCheckinScreen: No current user found');
        Alert.alert('Error', 'User tidak ditemukan');
        return;
      }

      console.log('FieldCheckinScreen: Current user:', user.id, user.role);

      // Load apartemen untuk UI dropdown (hanya apartemen yang di-assign untuk kemudahan workflow)
      try {
        console.log('FieldCheckinScreen: Loading assigned apartments for UI');
        const apartmentResult = await TeamAssignmentService.getAccessibleApartments();

        if (apartmentResult && apartmentResult.success) {
          console.log('FieldCheckinScreen: Loaded assigned apartments:', apartmentResult.data?.length || 0);
          console.log('FieldCheckinScreen: Apartment details:', apartmentResult.data?.map(apt => ({
            id: apt.id,
            name: apt.name,
            code: apt.code
          })));
          setApartments(apartmentResult.data || []);
        } else {
          console.warn('FieldCheckinScreen: Failed to load assigned apartments, loading all apartments');
          // Fallback: load all apartments if no assignment
          const allApartmentResult = await TeamAssignmentService.getAllApartmentsForCheckin();
          if (allApartmentResult && allApartmentResult.success) {
            console.log('FieldCheckinScreen: Loaded all apartments as fallback:', allApartmentResult.data?.length || 0);
            console.log('FieldCheckinScreen: All apartment details:', allApartmentResult.data?.map(apt => ({
              id: apt.id,
              name: apt.name,
              code: apt.code
            })));
            setApartments(allApartmentResult.data || []);
          } else {
            setApartments([]);
          }
        }
      } catch (apartmentError) {
        console.error('FieldCheckinScreen: Error loading apartments:', apartmentError);
        setApartments([]);
      }

      // Load semua unit untuk checkin (tim lapangan bisa checkin di semua unit)
      try {
        console.log('FieldCheckinScreen: Loading all units for checkin');
        const unitResult = await TeamAssignmentService.getAllUnitsForCheckin();

        if (unitResult && unitResult.success) {
          const allUnits = unitResult.data || [];
          console.log('FieldCheckinScreen: Loaded all units:', allUnits.length);

          // Log apartment distribution
          const apartmentDistribution = {};
          allUnits.forEach(unit => {
            const aptName = unit.apartments?.name || 'Unknown';
            apartmentDistribution[aptName] = (apartmentDistribution[aptName] || 0) + 1;
          });
          console.log('FieldCheckinScreen: Units by apartment:', apartmentDistribution);

          // Filter hanya unit yang available
          const availableUnitsOnly = allUnits.filter(unit => unit.status === 'available');
          console.log('FieldCheckinScreen: Available units after filtering:', availableUnitsOnly.length);

          // Log available units by apartment
          const availableDistribution = {};
          availableUnitsOnly.forEach(unit => {
            const aptName = unit.apartments?.name || 'Unknown';
            availableDistribution[aptName] = (availableDistribution[aptName] || 0) + 1;
          });
          console.log('FieldCheckinScreen: Available units by apartment:', availableDistribution);

          setAvailableUnits(availableUnitsOnly);

          // Log sample units for debugging
          if (allUnits.length > 0) {
            console.log('FieldCheckinScreen: Sample unit:', {
              id: allUnits[0].id,
              unit_number: allUnits[0].unit_number,
              apartment_id: allUnits[0].apartment_id,
              status: allUnits[0].status,
              apartment_name: allUnits[0].apartments?.name
            });
          }
        } else {
          console.warn('FieldCheckinScreen: Failed to load units:', unitResult);
          setAvailableUnits([]);
        }
      } catch (unitError) {
        console.error('FieldCheckinScreen: Error loading units:', unitError);
        setAvailableUnits([]);
      }

      // Load marketing sources
      try {
        console.log('FieldCheckinScreen: Loading marketing sources');
        const marketingResult = await MarketingSourceService.getAllMarketingSources();

        if (marketingResult && marketingResult.success) {
          console.log('FieldCheckinScreen: Loaded marketing sources:', marketingResult.data?.length || 0);
          setMarketingSources(marketingResult.data || []);
          setFilteredMarketingSources(marketingResult.data || []);
        } else {
          console.warn('FieldCheckinScreen: Failed to load marketing sources:', marketingResult);
          setMarketingSources([]);
          setFilteredMarketingSources([]);
        }
      } catch (marketingError) {
        console.error('FieldCheckinScreen: Error loading marketing sources:', marketingError);
        setMarketingSources([]);
        setFilteredMarketingSources([]);
      }

      console.log('FieldCheckinScreen: Finished loadInitialData');
    } catch (error) {
      console.error('FieldCheckinScreen: Critical error in loadInitialData:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal memuat data awal: ${error.message || 'Unknown error'}`,
      });
    }
  };

  /**
   * Filter unit berdasarkan apartemen yang dipilih
   */
  const filterUnitsByApartment = () => {
    console.log('FieldCheckinScreen: Filtering units by apartment:', formData.apartmentId);
    console.log('FieldCheckinScreen: Available units:', availableUnits.length);

    if (formData.apartmentId) {
      const filtered = availableUnits.filter(unit => {
        const unitApartmentId = unit.apartment_id?.toString();
        const selectedApartmentId = formData.apartmentId?.toString();
        const match = unitApartmentId === selectedApartmentId;

        if (!match && availableUnits.length > 0) {
          console.log('FieldCheckinScreen: Unit apartment ID mismatch:', {
            unitId: unit.id,
            unitNumber: unit.unit_number,
            unitApartmentId,
            selectedApartmentId,
            apartmentName: unit.apartments?.name
          });
        }

        return match;
      });

      console.log('FieldCheckinScreen: Filtered units:', filtered.length);

      if (filtered.length === 0 && availableUnits.length > 0) {
        console.warn('FieldCheckinScreen: No units found for apartment:', formData.apartmentId);
        console.log('FieldCheckinScreen: Available apartment IDs:',
          [...new Set(availableUnits.map(u => u.apartment_id?.toString()))]);
      }

      setFilteredUnits(filtered);
    } else {
      console.log('FieldCheckinScreen: No apartment selected, showing all units');
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
    console.log('FieldCheckinScreen: Selecting apartment:', {
      id: apartment.id,
      name: apartment.name,
      code: apartment.code
    });

    const newFormData = {
      ...formData,
      apartmentId: apartment.id.toString(),
      unitId: '', // Reset unit selection
    };

    console.log('FieldCheckinScreen: Updated formData:', {
      apartmentId: newFormData.apartmentId,
      unitId: newFormData.unitId
    });

    setFormData(newFormData);
    setApartmentModalVisible(false);
  };

  /**
   * Pilih unit
   * @param {Object} unit - Data unit yang dipilih
   */
  const selectUnit = (unit) => {
    console.log('FieldCheckinScreen: Selecting unit:', {
      id: unit.id,
      unit_number: unit.unit_number,
      apartment_id: unit.apartment_id,
      status: unit.status
    });

    const newFormData = {
      ...formData,
      unitId: unit.id.toString(),
    };

    console.log('FieldCheckinScreen: Updated formData with unit:', {
      apartmentId: newFormData.apartmentId,
      unitId: newFormData.unitId
    });

    setFormData(newFormData);
    setUnitModalVisible(false);
    setUnitSearchQuery('');
  };

  /**
   * Pilih metode pembayaran
   * @param {string} method - Metode pembayaran yang dipilih
   */
  const selectPaymentMethod = (method) => {
    let updatedFormData = {
      ...formData,
      paymentMethod: method,
    };

    // Special handling for APK payment method
    if (method === 'APK') {
      updatedFormData.paymentAmount = '0';
      updatedFormData.marketingName = 'APK';
    }

    setFormData(updatedFormData);
    setPaymentModalVisible(false);
  };

  // Marketing search functionality
  const handleMarketingSearch = (query) => {
    try {
      setMarketingSearchQuery(query);

      if (!query || !query.trim()) {
        setFilteredMarketingSources(marketingSources || []);
        return;
      }

      // Ensure marketingSources is an array
      const sources = Array.isArray(marketingSources) ? marketingSources : [];

      const filtered = sources.filter(source => {
        // Validate source object
        if (!source || typeof source.name !== 'string') {
          console.warn('FieldCheckinScreen: Invalid marketing source:', source);
          return false;
        }
        return source.name.toLowerCase().includes(query.toLowerCase());
      });

      // Add current query as option if not found
      const exactMatch = filtered.find(source =>
        source.name.toLowerCase() === query.toLowerCase()
      );

      if (!exactMatch && query.trim()) {
        filtered.unshift({ id: 'new', name: query.trim() });
      }

      setFilteredMarketingSources(filtered);
    } catch (error) {
      console.error('FieldCheckinScreen: Error in handleMarketingSearch:', error);
      // Fallback to show all sources
      setFilteredMarketingSources(marketingSources || []);
    }
  };

  const selectMarketingSource = async (source) => {
    try {
      // Validate source data
      if (!source || !source.name) {
        console.error('FieldCheckinScreen: Invalid marketing source data:', source);
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Data marketing tidak valid',
        });
        return;
      }

      // Update form data immediately
      setFormData({ ...formData, marketingName: source.name });
      setMarketingModalVisible(false);
      setMarketingSearchQuery('');

      // Handle database operations in background
      try {
        if (source.id === 'new') {
          console.log('FieldCheckinScreen: Adding new marketing source:', source.name);
          const result = await MarketingSourceService.addMarketingSourceIfNotExists(source.name);
          if (!result.success) {
            console.warn('FieldCheckinScreen: Failed to add marketing source:', result.message);
          }
        } else {
          console.log('FieldCheckinScreen: Incrementing usage for:', source.name);
          const result = await MarketingSourceService.incrementUsage(source.name);
          if (!result.success) {
            console.warn('FieldCheckinScreen: Failed to increment usage:', result.message);
          }
        }
      } catch (dbError) {
        console.error('FieldCheckinScreen: Database operation error:', dbError);
        // Don't show error to user as the main operation (selecting marketing) succeeded
      }
    } catch (error) {
      console.error('FieldCheckinScreen: Error in selectMarketingSource:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memilih marketing source',
      });
    }
  };

  // Payment proof functionality
  const selectPaymentProof = async () => {
    try {
      const result = await ImagePickerService.showMultipleImagePicker();

      if (result.success && result.images) {
        // Validate images
        const validation = ImagePickerService.validateMultipleImages(result.images);
        if (!validation.valid) {
          Alert.alert('Error', validation.message);
          return;
        }

        // Add new images to existing ones (max 5 total)
        const currentCount = paymentProofs.length;
        const newCount = result.images.length;

        if (currentCount + newCount > 5) {
          Alert.alert('Error', `Maksimal 5 foto. Anda sudah memiliki ${currentCount} foto.`);
          return;
        }

        setPaymentProofs(prev => [...prev, ...result.images]);
        Alert.alert('Berhasil', `${result.images.length} foto berhasil ditambahkan`);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Select payment proof error:', error);
      Alert.alert('Error', 'Gagal memilih foto');
    }
  };

  const removePaymentProof = (index) => {
    setPaymentProofs(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllPaymentProofs = () => {
    Alert.alert(
      'Hapus Semua Foto',
      'Apakah Anda yakin ingin menghapus semua foto bukti pembayaran?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => setPaymentProofs([])
        },
      ]
    );
  };

  /**
   * Hitung waktu checkout berdasarkan durasi menggunakan WIB timezone
   * @returns {string} - Waktu checkout dalam format string WIB
   */
  const calculateCheckoutTime = () => {
    if (!formData.durationHours) return '';

    try {
      const checkoutDate = TimeUtils.calculateCheckoutTime(formData.durationHours);
      return TimeUtils.formatDateTimeWIB(checkoutDate);
    } catch (error) {
      console.error('FieldCheckinScreen: Error calculating checkout time:', error);
      return 'Error menghitung waktu';
    }
  };





  /**
   * Validasi form sebelum submit dengan detail yang lebih baik
   * @returns {boolean} - True jika valid, false jika tidak
   */
  const validateForm = () => {
    console.log('FieldCheckinScreen: Validating form data:', formData);

    const missingFields = [];
    const invalidFields = [];

    // Validasi apartemen
    if (!formData.apartmentId || formData.apartmentId.toString().trim() === '') {
      missingFields.push('Apartemen');
      console.log('FieldCheckinScreen: Missing apartment, formData.apartmentId:', formData.apartmentId);
    }

    // Validasi unit
    if (!formData.unitId || formData.unitId.toString().trim() === '') {
      missingFields.push('Unit');
      console.log('FieldCheckinScreen: Missing unit, formData.unitId:', formData.unitId);
    }

    // Validasi durasi
    if (!formData.durationHours || formData.durationHours.trim() === '') {
      missingFields.push('Durasi');
    } else {
      const durationHours = parseInt(formData.durationHours);
      if (isNaN(durationHours) || durationHours <= 0) {
        invalidFields.push('Durasi (minimal 1 jam)');
      }
    }

    // Validasi metode pembayaran
    if (!formData.paymentMethod || formData.paymentMethod.trim() === '') {
      missingFields.push('Metode Pembayaran');
    }

    // Validasi jumlah pembayaran - allow 0 for APK method
    if (!formData.paymentAmount || formData.paymentAmount.trim() === '') {
      if (formData.paymentMethod !== 'APK') {
        missingFields.push('Jumlah Pembayaran (kecuali untuk metode APK)');
      }
    } else {
      const paymentAmount = parseFloat(formData.paymentAmount);
      if (isNaN(paymentAmount) || paymentAmount < 0) {
        invalidFields.push('Jumlah Pembayaran (minimal Rp 0)');
      }
    }

    // Validasi komisi marketing (jika ada) - allow 0
    if (formData.marketingCommission && formData.marketingCommission.trim() !== '') {
      const commission = parseFloat(formData.marketingCommission);
      if (isNaN(commission) || commission < 0) {
        invalidFields.push('Komisi Marketing (minimal Rp 0)');
      }
    }

    // Validasi nama marketing (jika ada komisi > 0)
    if (formData.marketingCommission && parseFloat(formData.marketingCommission) > 0) {
      if (!formData.marketingName || formData.marketingName.trim() === '') {
        missingFields.push('Nama Marketing (karena ada komisi > 0)');
      }
    }

    // Tampilkan pesan error yang detail
    if (missingFields.length > 0) {
      showAlert({
        type: 'warning',
        title: 'Data Tidak Lengkap',
        message: `Field yang harus diisi:\n• ${missingFields.join('\n• ')}`,
      });
      return false;
    }

    if (invalidFields.length > 0) {
      showAlert({
        type: 'warning',
        title: 'Data Tidak Valid',
        message: `Field yang tidak valid:\n• ${invalidFields.join('\n• ')}`,
      });
      return false;
    }

    console.log('FieldCheckinScreen: Form validation passed');
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
        paymentAmount: parseFloat(formData.paymentAmount),
        marketingCommission: parseFloat(formData.marketingCommission) || 0,
        paymentProof: paymentProofs.length > 0 ? paymentProofs : null,
        marketingName: formData.marketingName.trim() || null,
        notes: formData.notes.trim() || null,
      };

      const result = await CheckinService.createCheckin(
        checkinData,
        currentUser.id,
        'field_team'
      );

      if (result.success) {
        // Save marketing name to database if provided
        if (formData.marketingName && formData.marketingName.trim()) {
          try {
            console.log('FieldCheckinScreen: Saving marketing name to database:', formData.marketingName);
            await MarketingSourceService.addMarketingSourceIfNotExists(formData.marketingName.trim());
          } catch (marketingError) {
            console.error('FieldCheckinScreen: Error saving marketing source:', marketingError);
            // Don't fail the main operation
          }
        }

        showAlert({
          type: 'success',
          title: 'Sukses',
          message: 'Checkin berhasil dibuat!',
          onDismiss: () => {
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
            setPaymentProofs([]);

            // Refresh data
            loadInitialData();

            // Navigate back to dashboard
            navigation.goBack();
          },
        });
      } else {
        // Show detailed error message
        showAlert({
          type: 'error',
          title: 'Error',
          message: result.message || 'Gagal membuat checkin',
        });
      }
    } catch (error) {
      console.error('FieldCheckinScreen: Submit checkin error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal membuat checkin: ${error.message || 'Unknown error'}`,
      });
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


        {/* Apartemen Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pilih Apartemen *</Text>
          <Text style={styles.inputHint}>
            Menampilkan apartemen yang Anda handle untuk kemudahan workflow
          </Text>
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
              {formData.paymentMethod ? getPaymentMethodLabel(formData.paymentMethod) : 'Pilih metode pembayaran...'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        </View>

        {/* Payment Amount Input */}
        <View style={styles.inputGroup}>
          <CurrencyInput
            label="Nominal Pembayaran *"
            value={formData.paymentAmount}
            onChangeValue={(value) => setFormData({ ...formData, paymentAmount: value })}
            placeholder="Masukkan nominal pembayaran"
            style={styles.currencyInput}
          />
        </View>

        {/* Payment Proof Upload */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Bukti Pembayaran</Text>
            {paymentProofs.length > 0 && (
              <Text style={styles.photoCount}>
                {paymentProofs.length}/5 foto
              </Text>
            )}
          </View>

          {paymentProofs.length > 0 ? (
            <View style={styles.paymentProofsContainer}>
              {paymentProofs.map((proof, index) => (
                <View key={index} style={styles.paymentProofItem}>
                  <View style={styles.paymentProofInfo}>
                    <Icon name="image" size={20} color={COLORS.primary} />
                    <Text style={styles.paymentProofName} numberOfLines={1}>
                      {proof.name || `Foto ${index + 1}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeProofButton}
                    onPress={() => removePaymentProof(index)}
                  >
                    <Icon name="close" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.proofActions}>
                {paymentProofs.length < 5 && (
                  <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={selectPaymentProof}
                  >
                    <Icon name="add" size={20} color={COLORS.primary} />
                    <Text style={styles.addMoreText}>Tambah Foto</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.removeAllButton}
                  onPress={removeAllPaymentProofs}
                >
                  <Icon name="delete" size={20} color={COLORS.error} />
                  <Text style={styles.removeAllText}>Hapus Semua</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={selectPaymentProof}
            >
              <Icon name="cloud-upload" size={24} color={COLORS.primary} />
              <Text style={styles.uploadButtonText}>Upload Bukti Pembayaran (Maks 5 Foto)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Marketing Name dengan Select2 */}
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

        {/* Marketing Commission Input */}
        <View style={styles.inputGroup}>
          <CurrencyInput
            label="Komisi Marketing"
            value={formData.marketingCommission}
            onChangeValue={(value) => setFormData({ ...formData, marketingCommission: value })}
            placeholder="Masukkan komisi marketing"
            style={styles.currencyInput}
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
      <ModernModal
        visible={apartmentModalVisible}
        title="Pilih Apartemen"
        onClose={() => setApartmentModalVisible(false)}
        scrollable={true}
      >
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
                <Icon name="check" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      </ModernModal>

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
            data={paymentMethods}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  formData.paymentMethod === item.key && styles.modalItemSelected
                ]}
                onPress={() => selectPaymentMethod(item.key)}
              >
                <Text style={[
                  styles.modalItemText,
                  formData.paymentMethod === item.key && styles.modalItemTextSelected
                ]}>
                  {item.label}
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
              data={filteredMarketingSources || []}
              keyExtractor={(item, index) => {
                try {
                  return item?.id ? item.id.toString() : `marketing-${index}`;
                } catch (error) {
                  console.warn('FieldCheckinScreen: Error generating key for marketing item:', error);
                  return `marketing-fallback-${index}`;
                }
              }}
              renderItem={({ item }) => {
                try {
                  // Validate item data
                  if (!item || !item.name) {
                    console.warn('FieldCheckinScreen: Invalid marketing item:', item);
                    return null;
                  }

                  return (
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
                  );
                } catch (error) {
                  console.error('FieldCheckinScreen: Error rendering marketing item:', error);
                  return null;
                }
              }}
              ListEmptyComponent={
                <View style={styles.emptyMarketingContainer}>
                  <Icon name="search-off" size={48} color={COLORS.gray400} />
                  <Text style={styles.emptyMarketingText}>
                    Tidak ada hasil pencarian
                  </Text>
                </View>
              }
              onError={(error) => {
                console.error('FieldCheckinScreen: FlatList error:', error);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Modern Alert Component */}
      <AlertComponent />
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
  inputHint: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: SIZES.sm,
    fontStyle: 'italic',
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
  // Multiple payment proofs styles
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  photoCount: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  paymentProofsContainer: {
    gap: SIZES.sm,
  },
  paymentProofItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray100,
    padding: SIZES.sm,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  proofActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.sm,
    gap: SIZES.sm,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SIZES.sm,
    borderRadius: SIZES.radius,
    flex: 1,
    justifyContent: 'center',
  },
  addMoreText: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '500',
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    padding: SIZES.sm,
    borderRadius: SIZES.radius,
    flex: 1,
    justifyContent: 'center',
  },
  removeAllText: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.body,
    color: COLORS.error,
    fontWeight: '500',
  },
  removeProofButton: {
    padding: SIZES.xs,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalContent: {
    paddingBottom: SIZES.xl,
  },
});

export default FieldCheckinScreen;
