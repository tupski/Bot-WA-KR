import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, UNIT_STATUS } from '../../config/constants';
import TeamAssignmentService from '../../services/TeamAssignmentService';
import AuthService from '../../services/AuthService';
import { useModernAlert } from '../../components/ModernAlert';

const FieldUnitsOverviewScreen = ({ navigation }) => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = () => {
    try {
      const user = AuthService.getCurrentUser();
      console.log('FieldUnitsOverviewScreen: Current user:', user?.id, user?.role);
      setCurrentUser(user);
    } catch (error) {
      console.error('FieldUnitsOverviewScreen: Error loading current user:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memuat data pengguna. Silakan login ulang.',
      });
    }
  };

  // Load units when currentUser changes
  useEffect(() => {
    if (currentUser) {
      console.log('FieldUnitsOverviewScreen: Current user changed, loading units');
      loadUnits();
    }
  }, [currentUser]);

  // Filter units based on search query
  useEffect(() => {
    try {
      if (!searchQuery.trim()) {
        setFilteredUnits(units || []);
      } else {
        const filtered = (units || []).filter(unit => {
          if (!unit) return false;
          
          const unitNumber = unit.unit_number || '';
          const apartmentName = unit.apartments?.name || '';
          const apartmentCode = unit.apartments?.code || '';
          
          return unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 apartmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 apartmentCode.toLowerCase().includes(searchQuery.toLowerCase());
        });
        setFilteredUnits(filtered);
      }
    } catch (error) {
      console.error('FieldUnitsOverviewScreen: Error filtering units:', error);
      setFilteredUnits(units || []);
    }
  }, [units, searchQuery]);

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

      console.log('FieldUnitsOverviewScreen: Calling getAccessibleUnits');
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
        return status || 'Unknown';
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

  const handleUnitPress = async (unit) => {
    try {
      if (!unit) {
        console.warn('FieldUnitsOverviewScreen: Invalid unit data');
        return;
      }

      // Jika unit terisi (occupied), navigasi ke detail checkin
      if (unit.status === UNIT_STATUS.OCCUPIED) {
        console.log('FieldUnitsOverviewScreen: Navigating to checkin detail for occupied unit:', unit.id);

        // Navigasi ke CheckinDetailScreen dengan unitId
        navigation.navigate('CheckinDetail', {
          unitId: unit.id,
          unitNumber: unit.unit_number,
          apartmentName: unit.apartments?.name
        });
      } else {
        // Untuk unit yang tidak terisi, tampilkan detail unit
        showUnitDetails(unit);
      }
    } catch (error) {
      console.error('FieldUnitsOverviewScreen: Error in handleUnitPress:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat membuka detail unit',
      });
    }
  };

  const showUnitDetails = (unit) => {
    try {
      let message = `Unit: ${unit.unit_number}\nApartemen: ${unit.apartments?.name}\nStatus: ${getStatusLabel(unit.status)}`;
      
      if (unit.status === UNIT_STATUS.CLEANING) {
        message += '\n\nUnit sedang dalam proses cleaning.';
      } else if (unit.status === UNIT_STATUS.OCCUPIED) {
        message += '\n\nUnit sedang terisi tamu.';
      } else if (unit.status === UNIT_STATUS.MAINTENANCE) {
        message += '\n\nUnit sedang dalam maintenance.';
      } else if (unit.status === UNIT_STATUS.AVAILABLE) {
        message += '\n\nUnit tersedia untuk booking.';
      }

      Alert.alert('Detail Unit', message);
    } catch (error) {
      console.error('FieldUnitsOverviewScreen: Error showing unit details:', error);
      Alert.alert('Error', 'Gagal menampilkan detail unit');
    }
  };

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
            <Icon name="clear" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUnits || []}
        renderItem={({ item }) => (
          <View style={styles.unitCard}>
            <TouchableOpacity
              style={styles.unitContent}
              onPress={() => handleUnitPress(item)}
            >
              <View style={styles.unitHeader}>
                <View style={styles.unitInfo}>
                  <Text style={styles.unitNumber}>{item?.unit_number || 'N/A'}</Text>
                  <Text style={styles.apartmentName}>{item?.apartments?.name || 'N/A'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item?.status) + '20' }]}>
                  <Icon
                    name={getStatusIcon(item?.status)}
                    size={16}
                    color={getStatusColor(item?.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(item?.status) }]}>
                    {getStatusLabel(item?.status)}
                  </Text>
                </View>
              </View>

              {item?.status === UNIT_STATUS.AVAILABLE && (
                <View style={styles.availableActions}>
                  <Icon name="touch-app" size={16} color={COLORS.success} />
                  <Text style={styles.availableText}>Tap untuk detail</Text>
                </View>
              )}

              {item?.status === UNIT_STATUS.OCCUPIED && (
                <View style={styles.occupiedActions}>
                  <Icon name="visibility" size={16} color={COLORS.primary} />
                  <Text style={styles.occupiedText}>Tap untuk detail checkin</Text>
                </View>
              )}

              {item?.price && (
                <Text style={styles.priceText}>Rp {item.price.toLocaleString('id-ID')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item, index) => {
          try {
            return item?.id ? item.id.toString() : `unit-${index}`;
          } catch (error) {
            console.warn('FieldUnitsOverviewScreen: Error generating key for unit:', error);
            return `unit-fallback-${index}`;
          }
        }}
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
        onError={(error) => {
          console.error('FieldUnitsOverviewScreen: FlatList error:', error);
        }}
      />

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
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    paddingTop: SIZES.lg,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.background,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: SIZES.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    margin: SIZES.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
  },
  listContainer: {
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.lg,
  },
  unitCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unitContent: {
    padding: SIZES.md,
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
  occupiedText: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginLeft: SIZES.xs,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  priceText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SIZES.xs,
  },
  emptyContainer: {
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
  },
});

export default FieldUnitsOverviewScreen;
