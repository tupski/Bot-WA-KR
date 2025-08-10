import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, UNIT_STATUS, UNIT_STATUS_LABELS, UNIT_STATUS_COLORS } from '../../config/constants';
import UnitService from '../../services/UnitService';
import AuthService from '../../services/AuthService';

/**
 * Screen untuk tim lapangan melihat status unit apartemen yang ditugaskan
 * Fitur: View-only status unit, filter berdasarkan apartemen
 */
const FieldUnitsScreen = ({ navigation }) => {
  // State untuk data unit
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Load data saat komponen dimount
  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUnits();
    }
  }, [currentUser]);

  /**
   * Load data user yang sedang login
   */
  const loadUserData = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  };

  /**
   * Load unit berdasarkan apartemen yang ditugaskan ke tim lapangan
   */
  const loadUnits = async () => {
    try {
      if (!currentUser || !currentUser.apartmentIds) {
        setLoading(false);
        return;
      }

      const result = await UnitService.getUnitsByApartmentIds(currentUser.apartmentIds);
      if (result.success) {
        setUnits(result.data);
      } else {
        console.error('Load units error:', result.message);
      }
    } catch (error) {
      console.error('Load units error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh data dengan pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUnits();
    setRefreshing(false);
  };

  /**
   * Filter unit berdasarkan apartemen yang dipilih
   * @param {number|null} apartmentId - ID apartemen untuk filter, null untuk semua
   */
  const filterByApartment = (apartmentId) => {
    setSelectedApartment(apartmentId);
  };

  // Filter unit berdasarkan apartemen yang dipilih
  const filteredUnits = selectedApartment
    ? units.filter(unit => unit.apartment_id === selectedApartment)
    : units;

  // Group unit berdasarkan apartemen untuk statistik
  const unitStats = units.reduce((acc, unit) => {
    const apartmentName = unit.apartment_name;
    if (!acc[apartmentName]) {
      acc[apartmentName] = {
        apartmentId: unit.apartment_id,
        total: 0,
        available: 0,
        occupied: 0,
        cleaning: 0,
        maintenance: 0,
      };
    }
    acc[apartmentName].total++;
    acc[apartmentName][unit.status]++;
    return acc;
  }, {});

  /**
   * Handle unit press - show checkin detail if occupied
   * @param {Object} unit - Unit data
   */
  const handleUnitPress = (unit) => {
    try {
      console.log('FieldUnitsScreen: Unit pressed:', unit.id, unit.status);

      if (unit.status === UNIT_STATUS.OCCUPIED) {
        console.log('FieldUnitsScreen: Navigating to checkin detail for unit:', unit.id);

        if (navigation && navigation.navigate) {
          navigation.navigate('CheckinDetail', { unitId: unit.id });
        } else {
          console.error('FieldUnitsScreen: Navigation not available');
          Alert.alert('Error', 'Tidak dapat membuka detail checkin');
        }
      } else {
        // Show unit info for non-occupied units
        let statusLabel = 'Tidak diketahui';
        switch (unit.status) {
          case UNIT_STATUS.AVAILABLE:
            statusLabel = 'Tersedia';
            break;
          case UNIT_STATUS.CLEANING:
            statusLabel = 'Sedang dibersihkan';
            break;
          case UNIT_STATUS.MAINTENANCE:
            statusLabel = 'Dalam maintenance';
            break;
        }

        Alert.alert(
          'Info Unit',
          `Unit ${unit.unit_number}\nStatus: ${statusLabel}\n\nUnit ini tidak sedang terisi tamu.`
        );
      }
    } catch (error) {
      console.error('FieldUnitsScreen: Error in handleUnitPress:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat membuka detail unit');
    }
  };

  /**
   * Render item unit dalam list
   * @param {Object} param0 - Item data dari FlatList
   */
  const renderUnitItem = ({ item }) => (
    <TouchableOpacity
      style={styles.unitCard}
      onPress={() => handleUnitPress(item)}
      activeOpacity={item.status === UNIT_STATUS.OCCUPIED ? 0.7 : 1}
    >
      <View style={styles.unitHeader}>
        <View style={styles.unitInfo}>
          <Text style={styles.unitNumber}>{item.unit_number}</Text>
          <Text style={styles.apartmentName}>{item.apartment_name}</Text>
          {item.unit_type && (
            <Text style={styles.unitType}>{item.unit_type}</Text>
          )}
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: UNIT_STATUS_COLORS[item.status] },
          ]}
        >
          <Text style={styles.statusText}>
            {UNIT_STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      {/* Cleaning Timer */}
      {item.status === UNIT_STATUS.CLEANING && item.cleaning_started_at && (
        <View style={styles.cleaningInfo}>
          <Icon name="schedule" size={16} color={COLORS.warning} />
          <Text style={styles.cleaningText}>
            Cleaning dimulai: {new Date(item.cleaning_started_at).toLocaleTimeString('id-ID')}
          </Text>
        </View>
      )}

      {/* Tap hint for occupied units */}
      {item.status === UNIT_STATUS.OCCUPIED && (
        <View style={styles.tapHint}>
          <Icon name="touch-app" size={16} color={COLORS.primary} />
          <Text style={styles.tapHintText}>Tap untuk lihat detail checkin</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  /**
   * Render statistik apartemen
   * @param {string} apartmentName - Nama apartemen
   * @param {Object} stats - Statistik unit
   */
  const renderApartmentStats = (apartmentName, stats) => (
    <TouchableOpacity
      key={apartmentName}
      style={[
        styles.statsCard,
        selectedApartment === stats.apartmentId && styles.statsCardSelected,
      ]}
      onPress={() => filterByApartment(
        selectedApartment === stats.apartmentId ? null : stats.apartmentId
      )}
    >
      <Text style={styles.statsTitle}>{apartmentName}</Text>
      <Text style={styles.statsTotal}>Total: {stats.total} unit</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statsItem}>
          <View style={[styles.statsIndicator, { backgroundColor: UNIT_STATUS_COLORS.available }]} />
          <Text style={styles.statsLabel}>Tersedia: {stats.available}</Text>
        </View>
        <View style={styles.statsItem}>
          <View style={[styles.statsIndicator, { backgroundColor: UNIT_STATUS_COLORS.occupied }]} />
          <Text style={styles.statsLabel}>Terisi: {stats.occupied}</Text>
        </View>
        <View style={styles.statsItem}>
          <View style={[styles.statsIndicator, { backgroundColor: UNIT_STATUS_COLORS.cleaning }]} />
          <Text style={styles.statsLabel}>Cleaning: {stats.cleaning}</Text>
        </View>
        <View style={styles.statsItem}>
          <View style={[styles.statsIndicator, { backgroundColor: UNIT_STATUS_COLORS.maintenance }]} />
          <Text style={styles.statsLabel}>Maintenance: {stats.maintenance}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!currentUser || !currentUser.apartmentIds || currentUser.apartmentIds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="meeting-room" size={64} color={COLORS.gray400} />
        <Text style={styles.emptyTitle}>Tidak Ada Apartemen</Text>
        <Text style={styles.emptyText}>
          Anda belum ditugaskan ke apartemen manapun.
        </Text>
        <Text style={styles.emptySubtext}>
          Hubungi admin untuk mendapatkan assignment apartemen.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Status Unit</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Icon
            name="refresh"
            size={24}
            color={refreshing ? COLORS.gray400 : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <ScrollView
        style={styles.statsContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Statistik Apartemen</Text>
        {Object.entries(unitStats).map(([apartmentName, stats]) =>
          renderApartmentStats(apartmentName, stats)
        )}
      </ScrollView>

      {/* Unit List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          {selectedApartment
            ? `Unit ${Object.keys(unitStats).find(name => unitStats[name].apartmentId === selectedApartment)}`
            : 'Semua Unit'
          }
        </Text>

        <FlatList
          data={filteredUnits}
          renderItem={renderUnitItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="meeting-room" size={48} color={COLORS.gray400} />
              <Text style={styles.emptyText}>Tidak ada unit</Text>
            </View>
          }
        />
      </View>
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
  statsContainer: {
    backgroundColor: COLORS.background,
    maxHeight: 300,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginVertical: SIZES.md,
  },
  statsCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  statsCardSelected: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  statsTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  statsTotal: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: SIZES.xs,
  },
  statsIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.xs,
  },
  statsLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listSection: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SIZES.lg,
  },
  listContainer: {
    paddingBottom: SIZES.lg,
  },
  unitCard: {
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
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs / 2,
  },
  apartmentName: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  unitType: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    fontWeight: '500',
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
  cleaningInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    padding: SIZES.sm,
    borderRadius: SIZES.radius / 2,
    marginTop: SIZES.sm,
  },
  cleaningText: {
    fontSize: SIZES.caption,
    color: COLORS.warning,
    marginLeft: SIZES.xs,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
  emptySubtext: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  tapHintText: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginLeft: SIZES.xs,
    fontStyle: 'italic',
  },
});

export default FieldUnitsScreen;
