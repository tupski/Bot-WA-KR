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
import BusinessDayService from '../../services/BusinessDayService';

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
  const [dailyStats, setDailyStats] = useState({
    activeCheckins: 0,
    totalCheckins: 0,
    cashTransactions: 0,
    transferTransactions: 0,
  });

  // State untuk filter
  const [selectedApartments, setSelectedApartments] = useState([]); // Multi-select
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  // State untuk UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apartmentModalVisible, setApartmentModalVisible] = useState(false);
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false);

  // State untuk current date/time
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [businessDate, setBusinessDate] = useState('');

  // Load data saat komponen dimount
  useEffect(() => {
    loadInitialData();
    updateDateTime();

    // Update time setiap menit
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update current date/time dan business date
  const updateDateTime = () => {
    const now = new Date();
    setCurrentDateTime(now);

    const businessDateString = BusinessDayService.getBusinessDate(now);
    const businessDayRange = BusinessDayService.getCurrentBusinessDayRange();
    setBusinessDate(businessDayRange.businessDate);
  };

  // Reload data saat filter berubah
  useEffect(() => {
    if (!loading) {
      loadReportData();
    }
  }, [selectedApartments, dateRange]);

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
   * Load data laporan berdasarkan filter dengan business day logic
   */
  const loadReportData = async () => {
    try {
      // Jika tidak ada filter tanggal, gunakan business day range
      let filters = {
        apartmentIds: selectedApartments.length > 0 ? selectedApartments.map(apt => apt.id) : null,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      // Jika tidak ada filter tanggal, gunakan current business day
      if (!filters.startDate && !filters.endDate) {
        const businessDayRange = BusinessDayService.getCurrentBusinessDayRange();
        filters.startDate = businessDayRange.start;
        filters.endDate = businessDayRange.end;
        filters.useBusinessDay = true;
      }

      console.log('AdminReportsScreen: Loading report data with filters:', filters);

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

      // Load daily stats dengan business day logic
      const dailyStatsResult = await ReportService.getDailyStatistics(filters);
      if (dailyStatsResult.success) {
        setDailyStats(dailyStatsResult.data);
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
  const toggleApartment = (apartment) => {
    if (!apartment.id) {
      // "Semua Apartemen" dipilih
      setSelectedApartments([]);
      return;
    }

    const isSelected = selectedApartments.some(apt => apt.id === apartment.id);
    if (isSelected) {
      // Remove from selection
      setSelectedApartments(selectedApartments.filter(apt => apt.id !== apartment.id));
    } else {
      // Add to selection
      setSelectedApartments([...selectedApartments, apartment]);
    }
  };

  /**
   * Reset filter apartemen
   */
  const resetApartmentFilter = () => {
    setSelectedApartments([]);
  };

  /**
   * Set date range filter
   */
  const setDateRangeFilter = (startDate, endDate) => {
    setDateRange({
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    });
    setDateRangeModalVisible(false);
  };

  /**
   * Reset date range filter
   */
  const resetDateRangeFilter = () => {
    setDateRange({
      startDate: null,
      endDate: null,
    });
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
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setDateRangeModalVisible(true)}
          >
            <Icon name="date-range" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setApartmentModalVisible(true)}
          >
            <Icon name="filter-list" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Time Info */}
      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimeCard}>
          <Icon name="today" size={20} color={COLORS.primary} />
          <View style={styles.dateTimeInfo}>
            <Text style={styles.currentDateTime}>
              {currentDateTime.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.currentTime}>
              {currentDateTime.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })} WIB
            </Text>
          </View>
        </View>
        <View style={styles.businessDateCard}>
          <Icon name="business" size={20} color={COLORS.secondary} />
          <View style={styles.dateTimeInfo}>
            <Text style={styles.businessDateLabel}>Business Day</Text>
            <Text style={styles.businessDateText}>{businessDate}</Text>
          </View>
        </View>
      </View>

      {/* Daily Statistics Cards */}
      <View style={styles.dailyStatsContainer}>
        <Text style={styles.sectionTitle}>Statistik Harian</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="check-circle" size={32} color={COLORS.success} />
            <Text style={styles.statNumber}>{dailyStats.activeCheckins}</Text>
            <Text style={styles.statLabel}>Checkin Aktif</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="assignment" size={32} color={COLORS.primary} />
            <Text style={styles.statNumber}>{dailyStats.totalCheckins}</Text>
            <Text style={styles.statLabel}>Total Checkin</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="money" size={32} color={COLORS.warning} />
            <Text style={styles.statNumber}>{dailyStats.cashTransactions}</Text>
            <Text style={styles.statLabel}>Transaksi Tunai</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="credit-card" size={32} color={COLORS.info} />
            <Text style={styles.statNumber}>{dailyStats.transferTransactions}</Text>
            <Text style={styles.statLabel}>Transaksi Transfer</Text>
          </View>
        </View>
      </View>

      {/* Filter Info */}
      {(selectedApartments.length > 0 || dateRange.startDate || dateRange.endDate) && (
        <View style={styles.filterInfo}>
          <View style={styles.filterTextContainer}>
            {selectedApartments.length > 0 && (
              <Text style={styles.filterText}>
                Apartemen: {selectedApartments.length === 1
                  ? selectedApartments[0].name
                  : `${selectedApartments.length} dipilih`}
              </Text>
            )}
            {(dateRange.startDate || dateRange.endDate) && (
              <Text style={styles.filterText}>
                Tanggal: {dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('id-ID') : 'Tidak ada'} - {dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('id-ID') : 'Tidak ada'}
              </Text>
            )}
          </View>
          <View style={styles.filterActions}>
            {selectedApartments.length > 0 && (
              <TouchableOpacity onPress={resetApartmentFilter}>
                <Icon name="close" size={20} color={COLORS.error} />
              </TouchableOpacity>
            )}
            {(dateRange.startDate || dateRange.endDate) && (
              <TouchableOpacity onPress={resetDateRangeFilter}>
                <Icon name="close" size={20} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>
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
            renderItem={({ item }) => {
              const isSelected = item.id
                ? selectedApartments.some(apt => apt.id === item.id)
                : selectedApartments.length === 0;

              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected
                  ]}
                  onPress={() => toggleApartment(item)}
                >
                  <Text style={[
                    styles.modalItemText,
                    isSelected && styles.modalItemTextSelected
                  ]}>
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={20} color={COLORS.background} />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.modalContent}
          />

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => setApartmentModalVisible(false)}
            >
              <Text style={styles.modalActionText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Range Filter Modal */}
      <Modal
        visible={dateRangeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Rentang Tanggal</Text>
            <TouchableOpacity onPress={() => setDateRangeModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.dateRangeInfo}>
              Pilih rentang tanggal untuk laporan. Kosongkan untuk menggunakan business day saat ini.
            </Text>

            {/* Quick Date Options */}
            <View style={styles.quickDateOptions}>
              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const businessDayRange = BusinessDayService.getCurrentBusinessDayRange();
                  setDateRangeFilter(new Date(businessDayRange.start), new Date(businessDayRange.end));
                }}
              >
                <Text style={styles.quickDateText}>Hari Ini (Business Day)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const today = new Date();
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  setDateRangeFilter(weekAgo, today);
                }}
              >
                <Text style={styles.quickDateText}>7 Hari Terakhir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const today = new Date();
                  const monthAgo = new Date(today);
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  setDateRangeFilter(monthAgo, today);
                }}
              >
                <Text style={styles.quickDateText}>30 Hari Terakhir</Text>
              </TouchableOpacity>
            </View>

            {/* Current Date Range Display */}
            {(dateRange.startDate || dateRange.endDate) && (
              <View style={styles.currentDateRange}>
                <Text style={styles.currentDateRangeLabel}>Rentang Saat Ini:</Text>
                <Text style={styles.currentDateRangeText}>
                  {dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('id-ID') : 'Tidak ada'} - {dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('id-ID') : 'Tidak ada'}
                </Text>
              </View>
            )}
          </View>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalActionButton, styles.modalActionButtonSecondary]}
              onPress={resetDateRangeFilter}
            >
              <Text style={styles.modalActionTextSecondary}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => setDateRangeModalVisible(false)}
            >
              <Text style={styles.modalActionText}>Tutup</Text>
            </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
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
  filterTextContainer: {
    flex: 1,
  },
  filterActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
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
  dateTimeContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    gap: SIZES.sm,
  },
  dateTimeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.md,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: SIZES.sm,
  },
  businessDateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary + '10',
    padding: SIZES.md,
    borderRadius: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.secondary + '30',
    gap: SIZES.sm,
  },
  dateTimeInfo: {
    flex: 1,
  },
  currentDateTime: {
    fontSize: SIZES.caption,
    fontWeight: '600',
    color: COLORS.text,
  },
  currentTime: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  businessDateLabel: {
    fontSize: SIZES.caption,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  businessDateText: {
    fontSize: SIZES.caption,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  dailyStatsContainer: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.h5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.xs,
  },
  statLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  modalActionButton: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
  },
  modalActionText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: SIZES.body,
  },
  modalActionButtonSecondary: {
    backgroundColor: COLORS.gray300,
  },
  modalActionTextSecondary: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: SIZES.body,
  },
  dateRangeInfo: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  quickDateOptions: {
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  quickDateButton: {
    backgroundColor: COLORS.primary + '10',
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  quickDateText: {
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: SIZES.body,
  },
  currentDateRange: {
    backgroundColor: COLORS.gray100,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginTop: SIZES.lg,
  },
  currentDateRangeLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  currentDateRangeText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: SIZES.xs,
  },
});

export default AdminReportsScreen;
