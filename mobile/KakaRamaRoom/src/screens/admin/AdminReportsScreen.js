import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import ReportService from '../../services/ReportService';
import ApartmentService from '../../services/ApartmentService';

/**
 * Screen dashboard laporan untuk admin
 * Fitur: Statistik checkin, filter apartemen, laporan harian, top marketing
 */
const AdminReportsScreen = () => {
  // State untuk data laporan
  const [summaryStats, setSummaryStats] = useState({
    totalCheckins: 0,
    todayCheckins: 0,
    activeCheckins: 0,
    totalRevenue: 0,
  });
  const [apartmentStats, setApartmentStats] = useState([]);
  const [topMarketing, setTopMarketing] = useState([]);
  const [apartments, setApartments] = useState([]);

  // State untuk filter
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  // State untuk UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apartmentModalVisible, setApartmentModalVisible] = useState(false);

  // Load data saat komponen dimount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload data saat filter berubah
  useEffect(() => {
    if (!loading) {
      loadReportData();
    }
  }, [selectedApartment, dateRange]);

  /**
   * Load data awal (apartemen dan laporan)
   */
  const loadInitialData = async () => {
    try {
      // Load apartemen untuk filter
      const apartmentResult = await ApartmentService.getAllApartments();
      if (apartmentResult.success) {
        setApartments(apartmentResult.data);
      }

      // Load data laporan
      await loadReportData();
    } catch (error) {
      console.error('Load initial data error:', error);
      Alert.alert('Error', 'Gagal memuat data awal');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data laporan berdasarkan filter
   */
  const loadReportData = async () => {
    try {
      const filters = {
        apartmentId: selectedApartment?.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      // Load summary statistics
      const summaryResult = await ReportService.getSummaryStatistics(filters);
      if (summaryResult.success) {
        setSummaryStats(summaryResult.data);
      }

      // Load apartment statistics
      const apartmentResult = await ReportService.getApartmentStatistics(filters);
      if (apartmentResult.success) {
        setApartmentStats(apartmentResult.data);
      }

      // Load top marketing
      const marketingResult = await ReportService.getTopMarketing({
        ...filters,
        limit: 10,
      });
      if (marketingResult.success) {
        setTopMarketing(marketingResult.data);
      }
    } catch (error) {
      console.error('Load report data error:', error);
    }
  };

  /**
   * Refresh data dengan pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  /**
   * Pilih apartemen untuk filter
   * @param {Object} apartment - Data apartemen yang dipilih
   */
  const selectApartment = (apartment) => {
    setSelectedApartment(apartment);
    setApartmentModalVisible(false);
  };

  /**
   * Reset filter apartemen
   */
  const resetApartmentFilter = () => {
    setSelectedApartment(null);
    setApartmentModalVisible(false);
  };

  /**
   * Format currency untuk tampilan
   * @param {number} amount - Jumlah dalam angka
   * @returns {string} - Format currency
   */
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Format number untuk tampilan
   * @param {number} number - Angka
   * @returns {string} - Format number
   */
  const formatNumber = (number) => {
    if (!number) return '0';
    return new Intl.NumberFormat('id-ID').format(number);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard Laporan</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setApartmentModalVisible(true)}
        >
          <Icon name="filter-list" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Info */}
      {selectedApartment && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterText}>
            Filter: {selectedApartment.name}
          </Text>
          <TouchableOpacity onPress={resetApartmentFilter}>
            <Icon name="close" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary Statistics */}
      <View style={styles.summaryContainer}>
        <View style={styles.statCard}>
          <Icon name="assessment" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>
            {formatNumber(summaryStats.totalCheckins)}
          </Text>
          <Text style={styles.statLabel}>Total Checkin</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="today" size={32} color={COLORS.success} />
          <Text style={styles.statNumber}>
            {formatNumber(summaryStats.todayCheckins)}
          </Text>
          <Text style={styles.statLabel}>Hari Ini</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="schedule" size={32} color={COLORS.warning} />
          <Text style={styles.statNumber}>
            {formatNumber(summaryStats.activeCheckins)}
          </Text>
          <Text style={styles.statLabel}>Aktif</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="attach-money" size={32} color={COLORS.info} />
          <Text style={styles.statNumber}>
            {formatCurrency(summaryStats.totalRevenue)}
          </Text>
          <Text style={styles.statLabel}>Total Penghasilan</Text>
        </View>
      </View>

      {/* Apartment Statistics */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Statistik per Apartemen</Text>
        {apartmentStats.length > 0 ? (
          <FlatList
            data={apartmentStats}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.apartmentCard}>
                <View style={styles.apartmentHeader}>
                  <Text style={styles.apartmentName}>{item.name}</Text>
                  <Text style={styles.apartmentCode}>{item.code}</Text>
                </View>

                <View style={styles.apartmentStats}>
                  <View style={styles.apartmentStatItem}>
                    <Text style={styles.apartmentStatNumber}>
                      {formatNumber(item.total_checkins)}
                    </Text>
                    <Text style={styles.apartmentStatLabel}>Total</Text>
                  </View>

                  <View style={styles.apartmentStatItem}>
                    <Text style={styles.apartmentStatNumber}>
                      {formatNumber(item.active_checkins)}
                    </Text>
                    <Text style={styles.apartmentStatLabel}>Aktif</Text>
                  </View>

                  <View style={styles.apartmentStatItem}>
                    <Text style={styles.apartmentStatNumber}>
                      {formatCurrency(item.total_revenue)}
                    </Text>
                    <Text style={styles.apartmentStatLabel}>Revenue</Text>
                  </View>
                </View>
              </View>
            )}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="apartment" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Tidak ada data apartemen</Text>
          </View>
        )}
      </View>

      {/* Top Marketing */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Top Marketing</Text>
        {topMarketing.length > 0 ? (
          <FlatList
            data={topMarketing}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.marketingCard}>
                <View style={styles.marketingRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>

                <View style={styles.marketingInfo}>
                  <Text style={styles.marketingName}>{item.marketing_name}</Text>
                  <Text style={styles.marketingStats}>
                    {formatNumber(item.total_checkins)} checkin • {formatCurrency(item.total_revenue)}
                  </Text>
                  <Text style={styles.marketingApartments}>
                    {item.apartments_served} apartemen
                  </Text>
                </View>
              </View>
            )}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="person" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Tidak ada data marketing</Text>
          </View>
        )}
      </View>

      {/* Apartment Filter Modal */}
      <Modal
        visible={apartmentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Apartemen</Text>
            <TouchableOpacity onPress={() => setApartmentModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={[{ id: null, name: 'Semua Apartemen' }, ...apartments]}
            keyExtractor={(item) => item.id?.toString() || 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  (selectedApartment?.id === item.id || (!selectedApartment && !item.id)) &&
                    styles.modalItemSelected
                ]}
                onPress={() => item.id ? selectApartment(item) : resetApartmentFilter()}
              >
                <Text style={[
                  styles.modalItemText,
                  (selectedApartment?.id === item.id || (!selectedApartment && !item.id)) &&
                    styles.modalItemTextSelected
                ]}>
                  {item.name}
                </Text>
                {(selectedApartment?.id === item.id || (!selectedApartment && !item.id)) && (
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
  filterButton: {
    padding: SIZES.sm,
  },
  filterInfo: {
    backgroundColor: COLORS.primary + '10',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.sm,
    borderRadius: SIZES.radius,
  },
  filterText: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SIZES.lg,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'center',
    width: '48%',
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.sm,
  },
  statLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: COLORS.background,
    margin: SIZES.lg,
    marginTop: 0,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  apartmentCard: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    paddingVertical: SIZES.md,
  },
  apartmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  apartmentName: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  apartmentCode: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.radius / 2,
  },
  apartmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  apartmentStatItem: {
    alignItems: 'center',
  },
  apartmentStatNumber: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  apartmentStatLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs / 2,
  },
  marketingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  marketingRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  rankNumber: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  marketingInfo: {
    flex: 1,
  },
  marketingName: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs / 2,
  },
  marketingStats: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  marketingApartments: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
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
});

export default AdminReportsScreen;
