import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, UNIT_STATUS } from '../../config/constants';
import TeamAssignmentService from '../../services/TeamAssignmentService';
import CheckinService from '../../services/CheckinService';
import AuthService from '../../services/AuthService';
import ImagePickerService from '../../services/ImagePickerService';
import CurrencyInput from '../../components/CurrencyInput';
import { useModernAlert } from '../../components/ModernAlert';

const FieldUnitsOverviewScreen = ({ navigation }) => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [bookingType, setBookingType] = useState('transit'); // 'transit' or 'daily'
  const [duration, setDuration] = useState('3');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [marketingName, setMarketingName] = useState('');
  const [notes, setNotes] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Additional booking fields to match FieldCheckinScreen
  const [paymentAmount, setPaymentAmount] = useState('');
  const [marketingCommission, setMarketingCommission] = useState('');
  const [paymentProofs, setPaymentProofs] = useState([]);

  // Extend checkin states
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedUnitForExtend, setSelectedUnitForExtend] = useState(null);
  const [extendHours, setExtendHours] = useState('1');
  const [extendPaymentMethod, setExtendPaymentMethod] = useState('cash');
  const [extendPaymentAmount, setExtendPaymentAmount] = useState('');
  const [extendNotes, setExtendNotes] = useState('');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUnitForStatus, setSelectedUnitForStatus] = useState(null);

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        console.log('FieldUnitsOverviewScreen: Initializing screen');
        await loadCurrentUser();
        // Wait a bit for currentUser to be set
        setTimeout(() => {
          loadUnits();
        }, 100);
      } catch (error) {
        console.error('FieldUnitsOverviewScreen: Error initializing screen:', error);
      }
    };

    initializeScreen();
  }, []);

  // Load units when currentUser changes
  useEffect(() => {
    if (currentUser) {
      console.log('FieldUnitsOverviewScreen: Current user changed, loading units');
      loadUnits();
    }
  }, [currentUser]);

  // Filter units based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUnits(units);
    } else {
      const filtered = units.filter(unit =>
        unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.apartments?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.apartments?.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUnits(filtered);
    }
  }, [units, searchQuery]);

  const loadCurrentUser = async () => {
    try {
      console.log('FieldUnitsOverviewScreen: Loading current user');
      const user = AuthService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        console.log('FieldUnitsOverviewScreen: Current user loaded:', user.id);
      } else {
        console.warn('FieldUnitsOverviewScreen: No current user found');
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('FieldUnitsOverviewScreen: Error loading current user:', error);
      setCurrentUser(null);
    }
  };

  const loadUnits = async () => {
    try {
      console.log('FieldUnitsOverviewScreen: Starting loadUnits');
      setLoading(true);

      // Check if user is available
      if (!currentUser) {
        console.warn('FieldUnitsOverviewScreen: No current user, cannot load units');
        setUnits([]);
        setFilteredUnits([]);
        showAlert({
          type: 'warning',
          title: 'Peringatan',
          message: 'Silakan login terlebih dahulu untuk melihat data unit',
        });
        return;
      }

      // Validate TeamAssignmentService
      if (!TeamAssignmentService || typeof TeamAssignmentService.getAccessibleUnits !== 'function') {
        throw new Error('TeamAssignmentService tidak tersedia');
      }

      console.log('FieldUnitsOverviewScreen: Calling TeamAssignmentService.getAccessibleUnits');
      const result = await TeamAssignmentService.getAccessibleUnits();

      console.log('FieldUnitsOverviewScreen: getAccessibleUnits result:', result);

      if (result && result.success) {
        const unitsData = Array.isArray(result.data) ? result.data : [];
        console.log('FieldUnitsOverviewScreen: Loaded units:', unitsData.length);
        setUnits(unitsData);
        setFilteredUnits(unitsData);

        if (unitsData.length === 0) {
          showAlert({
            type: 'info',
            title: 'Info',
            message: 'Belum ada unit yang dapat diakses. Pastikan Anda telah ditugaskan ke apartemen tertentu.',
          });
        }
      } else {
        console.warn('FieldUnitsOverviewScreen: Failed to load units:', result);
        setUnits([]);
        setFilteredUnits([]);
        showAlert({
          type: 'error',
          title: 'Error',
          message: result?.message || 'Gagal memuat data unit. Silakan coba lagi.',
        });
      }
    } catch (error) {
      console.error('FieldUnitsOverviewScreen: Error loading units:', error);
      setUnits([]);
      setFilteredUnits([]);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal memuat data unit: ${error.message || 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUnits();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case UNIT_STATUS.AVAILABLE:
        return COLORS.success;
      case UNIT_STATUS.OCCUPIED:
        return COLORS.error;
      case UNIT_STATUS.CLEANING:
        return COLORS.warning;
      case UNIT_STATUS.MAINTENANCE:
        return COLORS.info;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case UNIT_STATUS.AVAILABLE:
        return 'Tersedia';
      case UNIT_STATUS.OCCUPIED:
        return 'Terisi';
      case UNIT_STATUS.CLEANING:
        return 'Cleaning';
      case UNIT_STATUS.MAINTENANCE:
        return 'Maintenance';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case UNIT_STATUS.AVAILABLE:
        return 'check-circle';
      case UNIT_STATUS.OCCUPIED:
        return 'person';
      case UNIT_STATUS.CLEANING:
        return 'cleaning-services';
      case UNIT_STATUS.MAINTENANCE:
        return 'build';
      default:
        return 'help';
    }
  };

  const handleUnitPress = (unit) => {
    if (unit.status === UNIT_STATUS.AVAILABLE) {
      setSelectedUnit(unit);
      setShowBookingModal(true);
    } else {
      // Show unit details or actions based on status
      showUnitDetails(unit);
    }
  };

  const showUnitDetails = (unit) => {
    let message = `Unit: ${unit.unit_number}\nApartemen: ${unit.apartments?.name}\nStatus: ${getStatusLabel(unit.status)}`;
    
    if (unit.status === UNIT_STATUS.CLEANING) {
      message += '\n\nUnit sedang dalam proses cleaning.';
    } else if (unit.status === UNIT_STATUS.OCCUPIED) {
      message += '\n\nUnit sedang terisi tamu.';
    } else if (unit.status === UNIT_STATUS.MAINTENANCE) {
      message += '\n\nUnit sedang dalam maintenance.';
    }

    Alert.alert('Detail Unit', message);
  };

  const handleBooking = async () => {
    try {
      console.log('FieldUnitsOverviewScreen: Starting booking process');

      // Validation dengan showAlert
      if (!duration || isNaN(parseInt(duration))) {
        showAlert({
          type: 'warning',
          title: 'Data Tidak Valid',
          message: 'Masukkan durasi yang valid',
        });
        return;
      }

      if (!paymentAmount || parseFloat(paymentAmount.replace(/[^\d]/g, '')) <= 0) {
        showAlert({
          type: 'warning',
          title: 'Data Tidak Valid',
          message: 'Masukkan jumlah pembayaran yang valid',
        });
        return;
      }

      const durationHours = bookingType === 'daily' ? parseInt(duration) : parseInt(duration);

      if (bookingType === 'transit' && (durationHours < 1 || durationHours > 12)) {
        showAlert({
          type: 'warning',
          title: 'Durasi Tidak Valid',
          message: 'Durasi transit harus antara 1-12 jam',
        });
        return;
      }

      if (bookingType === 'daily' && durationHours < 24) {
        showAlert({
          type: 'warning',
          title: 'Durasi Tidak Valid',
          message: 'Durasi harian minimal 24 jam',
        });
        return;
      }

      // Parse payment amount
      const parsedPaymentAmount = parseFloat(paymentAmount.replace(/[^\d]/g, ''));
      const parsedMarketingCommission = marketingCommission
        ? parseFloat(marketingCommission.replace(/[^\d]/g, ''))
        : 0;

      const checkinData = {
        apartmentId: selectedUnit.apartment_id,
        unitId: selectedUnit.id,
        durationHours: durationHours,
        paymentMethod: paymentMethod,
        paymentAmount: parsedPaymentAmount,
        marketingCommission: parsedMarketingCommission,
        marketingName: marketingName?.trim() || null,
        notes: notes?.trim() || null,
        paymentProof: paymentProofs.length > 0 ? paymentProofs : null,
      };

      setLoading(true);
      const result = await CheckinService.createCheckin(
        checkinData,
        currentUser.id,
        currentUser.role
      );

      if (result.success) {
        showAlert({
          type: 'success',
          title: 'Sukses',
          message: 'Booking berhasil dibuat!',
          onDismiss: () => {
            setShowBookingModal(false);
            resetBookingForm();
            loadUnits(); // Refresh units
          },
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: result.message || 'Gagal membuat booking',
        });
      }
    } catch (error) {
      console.error('FieldUnitsOverviewScreen: Booking error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal membuat booking: ${error.message || 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetBookingForm = () => {
    setSelectedUnit(null);
    setBookingType('transit');
    setDuration('3');
    setPaymentMethod('cash');
    setPaymentAmount('');
    setMarketingCommission('');
    setMarketingName('');
    setNotes('');
    setPaymentProofs([]);
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

  // Extend checkin functionality
  const handleExtendCheckin = (unit) => {
    setSelectedUnitForExtend(unit);
    setExtendHours('1');
    setExtendPaymentMethod('cash');
    setExtendPaymentAmount('');
    setExtendNotes('');
    setShowExtendModal(true);
  };

  const submitExtendCheckin = async () => {
    try {
      if (!extendHours || parseInt(extendHours) <= 0) {
        Alert.alert('Error', 'Masukkan durasi extend yang valid');
        return;
      }

      if (!extendPaymentAmount || parseFloat(extendPaymentAmount.replace(/[^\d]/g, '')) <= 0) {
        Alert.alert('Error', 'Masukkan jumlah pembayaran yang valid');
        return;
      }

      setLoading(true);

      // Get active checkin for this unit
      const checkinResult = await CheckinService.getActiveCheckinByUnit(selectedUnitForExtend.id);

      if (!checkinResult.success || !checkinResult.data) {
        Alert.alert('Error', 'Checkin aktif tidak ditemukan untuk unit ini');
        return;
      }

      const extendData = {
        additionalHours: parseInt(extendHours),
        paymentMethod: extendPaymentMethod,
        paymentAmount: parseFloat(extendPaymentAmount.replace(/[^\d]/g, '')),
        notes: extendNotes?.trim() || null,
      };

      const result = await CheckinService.extendCheckin(
        checkinResult.data.id,
        extendData,
        currentUser.id,
        currentUser.role
      );

      if (result.success) {
        Alert.alert('Sukses', 'Checkin berhasil diperpanjang!', [
          {
            text: 'OK',
            onPress: () => {
              setShowExtendModal(false);
              loadUnits(); // Refresh units
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Extend checkin error:', error);
      Alert.alert('Error', 'Gagal memperpanjang checkin');
    } finally {
      setLoading(false);
    }
  };

  // Status update functions
  const showStatusOptions = (unit) => {
    setSelectedUnitForStatus(unit);
    setShowStatusModal(true);
  };

  const updateUnitStatus = async (newStatus) => {
    if (!selectedUnitForStatus) return;

    try {
      setLoading(true);
      const result = await UnitService.updateUnitStatus(
        selectedUnitForStatus.id,
        newStatus,
        currentUser.id
      );

      if (result.success) {
        Alert.alert('Berhasil', `Status unit ${selectedUnitForStatus.unit_number} berhasil diubah`);
        setShowStatusModal(false);
        setSelectedUnitForStatus(null);
        loadUnits(); // Refresh data
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Update unit status error:', error);
      Alert.alert('Error', 'Gagal mengubah status unit');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStatuses = (currentStatus) => {
    // Define which status transitions are allowed
    const statusTransitions = {
      [UNIT_STATUS.AVAILABLE]: [UNIT_STATUS.CLEANING, UNIT_STATUS.MAINTENANCE],
      [UNIT_STATUS.OCCUPIED]: [UNIT_STATUS.AVAILABLE], // Only if no active checkin
      [UNIT_STATUS.CLEANING]: [UNIT_STATUS.AVAILABLE, UNIT_STATUS.MAINTENANCE],
      [UNIT_STATUS.MAINTENANCE]: [UNIT_STATUS.AVAILABLE, UNIT_STATUS.CLEANING],
    };

    return statusTransitions[currentStatus] || [];
  };

  const renderUnitCard = ({ item }) => (
    <View
      style={[
        styles.unitCard,
        { borderLeftColor: getStatusColor(item.status) }
      ]}
    >
      <TouchableOpacity
        style={styles.unitContent}
        onPress={() => handleUnitPress(item)}
      >
        <View style={styles.unitHeader}>
          <View style={styles.unitInfo}>
            <Text style={styles.unitNumber}>{item.unit_number}</Text>
            <Text style={styles.apartmentName}>{item.apartments?.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Icon
              name={getStatusIcon(item.status)}
              size={16}
              color={getStatusColor(item.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {item.status === UNIT_STATUS.AVAILABLE && (
          <View style={styles.availableActions}>
            <Icon name="touch-app" size={16} color={COLORS.success} />
            <Text style={styles.availableText}>Tap untuk booking</Text>
          </View>
        )}

        {item.status === UNIT_STATUS.OCCUPIED && (
          <View style={styles.occupiedActions}>
            <TouchableOpacity
              style={styles.extendButton}
              onPress={() => handleExtendCheckin(item)}
            >
              <Icon name="access-time" size={14} color={COLORS.white} />
              <Text style={styles.extendButtonText}>Extend</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.price && (
          <Text style={styles.priceText}>Rp {item.price.toLocaleString('id-ID')}</Text>
        )}
      </TouchableOpacity>

      {/* Status Update Button */}
      <TouchableOpacity
        style={styles.statusButton}
        onPress={() => showStatusOptions(item)}
      >
        <Icon name="swap-vert" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderBookingModal = () => (
    <Modal
      visible={showBookingModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBookingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking Unit {selectedUnit?.unit_number}</Text>
            <TouchableOpacity
              onPress={() => setShowBookingModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Unit Info */}
            <View style={styles.unitInfoSection}>
              <Text style={styles.sectionTitle}>Informasi Unit</Text>
              <Text style={styles.unitDetailText}>
                Unit: {selectedUnit?.unit_number}
              </Text>
              <Text style={styles.unitDetailText}>
                Apartemen: {selectedUnit?.apartments?.name}
              </Text>
            </View>

            {/* Booking Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipe Booking</Text>
              <View style={styles.bookingTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.bookingTypeButton,
                    bookingType === 'transit' && styles.bookingTypeActive
                  ]}
                  onPress={() => {
                    setBookingType('transit');
                    setDuration('3');
                  }}
                >
                  <Text style={[
                    styles.bookingTypeText,
                    bookingType === 'transit' && styles.bookingTypeTextActive
                  ]}>
                    Transit
                  </Text>
                  <Text style={styles.bookingTypeSubtext}>1-12 jam</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.bookingTypeButton,
                    bookingType === 'daily' && styles.bookingTypeActive
                  ]}
                  onPress={() => {
                    setBookingType('daily');
                    setDuration('24');
                  }}
                >
                  <Text style={[
                    styles.bookingTypeText,
                    bookingType === 'daily' && styles.bookingTypeTextActive
                  ]}>
                    Harian
                  </Text>
                  <Text style={styles.bookingTypeSubtext}>24+ jam</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Durasi ({bookingType === 'transit' ? '1-12 jam' : '24+ jam'})
              </Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder={bookingType === 'transit' ? 'Contoh: 3' : 'Contoh: 24'}
              />
            </View>

            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
              <View style={styles.paymentContainer}>
                {['cash', 'transfer', 'qris'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentButton,
                      paymentMethod === method && styles.paymentButtonActive
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[
                      styles.paymentText,
                      paymentMethod === method && styles.paymentTextActive
                    ]}>
                      {method === 'cash' ? 'Cash' : method === 'transfer' ? 'Transfer' : 'QRIS'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Payment Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jumlah Pembayaran *</Text>
              <CurrencyInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Masukkan jumlah pembayaran"
                style={styles.currencyInput}
              />
            </View>

            {/* Marketing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sumber Marketing (Opsional)</Text>
              <TextInput
                style={styles.input}
                value={marketingName}
                onChangeText={setMarketingName}
                placeholder="Instagram, Facebook, dll"
              />
            </View>

            {/* Marketing Commission */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Komisi Marketing (Opsional)</Text>
              <CurrencyInput
                value={marketingCommission}
                onChangeText={setMarketingCommission}
                placeholder="Masukkan komisi marketing"
                style={styles.currencyInput}
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Catatan (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Catatan tambahan..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Payment Proof Upload */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionTitle}>Bukti Pembayaran</Text>
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
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBookingModal(false)}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={handleBooking}
              disabled={loading}
            >
              <Text style={styles.bookButtonText}>
                {loading ? 'Memproses...' : 'Booking'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={COLORS.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unit Overview</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
        >
          <Icon name="refresh" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari unit atau apartemen..."
          placeholderTextColor={COLORS.gray400}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUnits}
        renderItem={renderUnitCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="meeting-room" size={64} color={COLORS.gray300} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Tidak ada unit yang sesuai pencarian' : 'Tidak ada unit yang dapat diakses'}
            </Text>
          </View>
        }
      />

      {renderBookingModal()}
      {renderStatusModal()}
      {renderExtendModal()}
    </View>
  );

  // Status Modal
  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.statusModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Ubah Status Unit {selectedUnitForStatus?.unit_number}
            </Text>
            <TouchableOpacity
              onPress={() => setShowStatusModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.statusOptions}>
            <Text style={styles.currentStatusText}>
              Status saat ini: {getStatusLabel(selectedUnitForStatus?.status)}
            </Text>

            {getAvailableStatuses(selectedUnitForStatus?.status).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  { borderColor: getStatusColor(status) }
                ]}
                onPress={() => updateUnitStatus(status)}
              >
                <Icon
                  name={getStatusIcon(status)}
                  size={20}
                  color={getStatusColor(status)}
                />
                <Text style={[styles.statusOptionText, { color: getStatusColor(status) }]}>
                  {getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.statusOption, styles.cancelOption]}
              onPress={() => setShowStatusModal(false)}
            >
              <Icon name="cancel" size={20} color={COLORS.gray600} />
              <Text style={[styles.statusOptionText, { color: COLORS.gray600 }]}>
                Batal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Extend Modal
  const renderExtendModal = () => (
    <Modal
      visible={showExtendModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowExtendModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Extend Checkin - Unit {selectedUnitForExtend?.unit_number}
            </Text>
            <TouchableOpacity
              onPress={() => setShowExtendModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Durasi Tambahan (Jam) *</Text>
              <TextInput
                style={styles.input}
                value={extendHours}
                onChangeText={setExtendHours}
                keyboardType="numeric"
                placeholder="Contoh: 2"
              />
            </View>

            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
              <View style={styles.paymentContainer}>
                {['cash', 'transfer', 'qris'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentButton,
                      extendPaymentMethod === method && styles.paymentButtonActive
                    ]}
                    onPress={() => setExtendPaymentMethod(method)}
                  >
                    <Text style={[
                      styles.paymentText,
                      extendPaymentMethod === method && styles.paymentTextActive
                    ]}>
                      {method === 'cash' ? 'Cash' : method === 'transfer' ? 'Transfer' : 'QRIS'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Payment Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jumlah Pembayaran *</Text>
              <CurrencyInput
                value={extendPaymentAmount}
                onChangeText={setExtendPaymentAmount}
                placeholder="Masukkan jumlah pembayaran"
                style={styles.currencyInput}
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Catatan (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={extendNotes}
                onChangeText={setExtendNotes}
                placeholder="Catatan tambahan..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowExtendModal(false)}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={submitExtendCheckin}
              disabled={loading}
            >
              <Text style={styles.bookButtonText}>
                {loading ? 'Memproses...' : 'Extend Checkin'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modern Alert Component */}
    <AlertComponent />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    paddingTop: SIZES.xl,
  },
  backButton: {
    padding: SIZES.sm,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: SIZES.sm,
  },
  listContainer: {
    padding: SIZES.md,
  },
  unitCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  apartmentName: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radius,
  },
  statusText: {
    fontSize: SIZES.caption,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  availableActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.xs,
  },
  availableText: {
    fontSize: SIZES.caption,
    color: COLORS.success,
    marginLeft: SIZES.xs,
    fontStyle: 'italic',
  },
  occupiedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.xs,
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radius,
  },
  extendButtonText: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.caption,
    color: COLORS.white,
    fontWeight: '500',
  },
  priceText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SIZES.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
  },
  modalTitle: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SIZES.sm,
  },
  modalBody: {
    padding: SIZES.md,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  unitInfoSection: {
    backgroundColor: COLORS.gray100,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  unitDetailText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  bookingTypeContainer: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  bookingTypeButton: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
  },
  bookingTypeActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  bookingTypeText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bookingTypeTextActive: {
    color: COLORS.primary,
  },
  bookingTypeSubtext: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentContainer: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  paymentButton: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
  },
  paymentButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  paymentText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  paymentTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray300,
    gap: SIZES.sm,
  },
  cancelButton: {
    flex: 1,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray300,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bookButton: {
    flex: 2,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.background,
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    margin: SIZES.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
  },
  // Unit card styles
  unitContent: {
    flex: 1,
  },
  statusButton: {
    padding: SIZES.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status modal styles
  statusModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    maxHeight: '60%',
    minHeight: '40%',
  },
  statusOptions: {
    padding: SIZES.md,
  },
  currentStatusText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    marginVertical: SIZES.xs,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    backgroundColor: COLORS.background,
  },
  statusOptionText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    fontWeight: '500',
  },
  cancelOption: {
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray100,
    marginTop: SIZES.sm,
  },
  // Currency input styles
  currencyInput: {
    borderWidth: 0,
  },
  // Payment proof styles
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
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.error + '20',
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // Currency input styles
  currencyInput: {
    borderWidth: 0, // Remove border since CurrencyInput has its own
  },
  // Payment proof styles
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
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.error + '20',
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default FieldUnitsOverviewScreen;
