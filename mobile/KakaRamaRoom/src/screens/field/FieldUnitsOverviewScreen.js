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

const FieldUnitsOverviewScreen = ({ navigation }) => {
  const [units, setUnits] = useState([]);
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

  useEffect(() => {
    loadCurrentUser();
    loadUnits();
  }, []);

  const loadCurrentUser = async () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  };

  const loadUnits = async () => {
    try {
      setLoading(true);
      const result = await TeamAssignmentService.getAccessibleUnits();
      
      if (result.success) {
        setUnits(result.data);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data unit');
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
      if (!duration || isNaN(parseInt(duration))) {
        Alert.alert('Error', 'Masukkan durasi yang valid');
        return;
      }

      const durationHours = bookingType === 'daily' ? 24 : parseInt(duration);
      
      if (bookingType === 'transit' && (durationHours < 1 || durationHours > 12)) {
        Alert.alert('Error', 'Durasi transit harus antara 1-12 jam');
        return;
      }

      if (bookingType === 'daily' && durationHours < 24) {
        Alert.alert('Error', 'Durasi harian minimal 24 jam');
        return;
      }

      const checkinData = {
        apartmentId: selectedUnit.apartment_id,
        unitId: selectedUnit.id,
        durationHours: durationHours,
        paymentMethod: paymentMethod,
        paymentAmount: 0, // Will be calculated by service
        marketingName: marketingName,
        notes: notes,
      };

      setLoading(true);
      const result = await CheckinService.createCheckin(
        checkinData,
        currentUser.id,
        currentUser.role
      );

      if (result.success) {
        Alert.alert('Sukses', 'Booking berhasil dibuat!', [
          {
            text: 'OK',
            onPress: () => {
              setShowBookingModal(false);
              resetBookingForm();
              loadUnits(); // Refresh units
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal membuat booking');
    } finally {
      setLoading(false);
    }
  };

  const resetBookingForm = () => {
    setSelectedUnit(null);
    setBookingType('transit');
    setDuration('3');
    setPaymentMethod('cash');
    setMarketingName('');
    setNotes('');
  };

  const renderUnitCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.unitCard,
        { borderLeftColor: getStatusColor(item.status) }
      ]}
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

      {item.price && (
        <Text style={styles.priceText}>Rp {item.price.toLocaleString('id-ID')}</Text>
      )}
    </TouchableOpacity>
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

      <FlatList
        data={units}
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
            <Text style={styles.emptyText}>Tidak ada unit yang dapat diakses</Text>
          </View>
        }
      />

      {renderBookingModal()}
    </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    width: '95%',
    maxHeight: '90%',
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
});

export default FieldUnitsOverviewScreen;
