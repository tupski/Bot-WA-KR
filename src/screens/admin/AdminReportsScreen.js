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
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import { COLORS, SIZES } from '../../config/constants';
import ReportService from '../../services/ReportService';
import ApartmentService from '../../services/ApartmentService';
import BusinessDayService from '../../services/BusinessDayService';
import { useModernAlert } from '../../components/ModernAlert';

/**
 * Screen dashboard laporan untuk admin
 * Fitur: Statistik checkin, filter apartemen, laporan harian, top marketing
 */
const AdminReportsScreen = () => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

  // State untuk data laporan
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

  // State untuk date picker
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  // State untuk current date/time dihapus karena tidak digunakan lagi

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
    try {
      const now = new Date();
      setCurrentDateTime(now);

      const businessDayRange = BusinessDayService.getCurrentBusinessDayRange();
      setBusinessDate(businessDayRange.businessDate);
    } catch (error) {
      console.error('AdminReportsScreen: Error updating date time:', error);
      // Set fallback date
      setCurrentDateTime(new Date());
      setBusinessDate(new Date().toISOString().split('T')[0]);
    }
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
      console.log('AdminReportsScreen: Starting loadInitialData');
      setLoading(true);

      // Validate services availability
      if (!ApartmentService || typeof ApartmentService.getAllApartments !== 'function') {
        throw new Error('ApartmentService tidak tersedia');
      }

      // Load apartemen untuk filter dengan error handling
      try {
        console.log('AdminReportsScreen: Loading apartments');
        const apartmentResult = await Promise.race([
          ApartmentService.getAllApartments(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout loading apartments')), 10000)
          )
        ]);

        if (apartmentResult && apartmentResult.success && Array.isArray(apartmentResult.data)) {
          setApartments(apartmentResult.data);
          console.log('AdminReportsScreen: Loaded apartments:', apartmentResult.data.length);
        } else {
          console.warn('AdminReportsScreen: Failed to load apartments:', apartmentResult);
          setApartments([]);
        }
      } catch (apartmentError) {
        console.error('AdminReportsScreen: Apartment loading error:', apartmentError);
        setApartments([]);
        // Don't show error for apartment loading failure, continue with empty list
      }

      // Load data laporan dengan error handling
      try {
        console.log('AdminReportsScreen: Loading report data');
        await loadReportData();
      } catch (reportError) {
        console.error('AdminReportsScreen: Report data loading error:', reportError);
        // Set default values instead of showing error immediately
        setApartmentStats([]);
        setTopMarketing([]);
        setDailyStats({
          activeCheckins: 0,
          totalCheckins: 0,
          cashTransactions: 0,
          transferTransactions: 0,
        });

        showAlert({
          type: 'warning',
          title: 'Peringatan',
          message: 'Beberapa data laporan gagal dimuat. Data mungkin tidak lengkap.',
        });
      }

      console.log('AdminReportsScreen: Finished loadInitialData');
    } catch (error) {
      console.error('AdminReportsScreen: Critical error in loadInitialData:', error);

      // Set all states to safe defaults
      setApartmentStats([]);
      setTopMarketing([]);
      setDailyStats({
        activeCheckins: 0,
        totalCheckins: 0,
        cashTransactions: 0,
        transferTransactions: 0,
      });
      setApartments([]);

      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memuat data awal. Aplikasi akan menampilkan data kosong.',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data laporan berdasarkan filter dengan business day logic
   */
  const loadReportData = async () => {
    try {
      console.log('AdminReportsScreen: Starting loadReportData');

      // Jika tidak ada filter tanggal, gunakan business day range
      let filters = {
        apartmentIds: selectedApartments.length > 0 ? selectedApartments.map(apt => apt.id) : null,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      // Jika tidak ada filter tanggal, gunakan current business day
      if (!filters.startDate && !filters.endDate) {
        try {
          const businessDayRange = BusinessDayService.getCurrentBusinessDayRange();
          filters.startDate = businessDayRange.start;
          filters.endDate = businessDayRange.end;
          filters.useBusinessDay = true;
        } catch (businessDayError) {
          console.error('AdminReportsScreen: BusinessDayService error:', businessDayError);
          // Fallback to today
          const today = new Date();
          filters.startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          filters.endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        }
      }

      console.log('AdminReportsScreen: Loading report data with filters:', filters);



      // Load apartment statistics with error handling
      try {
        console.log('AdminReportsScreen: Loading apartment statistics');
        const apartmentResult = await ReportService.getApartmentStatistics(filters);
        if (apartmentResult && apartmentResult.success) {
          setApartmentStats(apartmentResult.data || []);
        } else {
          console.warn('AdminReportsScreen: Apartment statistics failed:', apartmentResult);
          setApartmentStats([]);
        }
      } catch (apartmentError) {
        console.error('AdminReportsScreen: Apartment statistics error:', apartmentError);
        setApartmentStats([]);
      }

      // Load top marketing with error handling
      try {
        console.log('AdminReportsScreen: Loading top marketing');
        const marketingResult = await ReportService.getTopMarketing({
          ...filters,
          limit: 10,
        });
        if (marketingResult && marketingResult.success) {
          setTopMarketing(marketingResult.data || []);
        } else {
          console.warn('AdminReportsScreen: Top marketing failed:', marketingResult);
          setTopMarketing([]);
        }
      } catch (marketingError) {
        console.error('AdminReportsScreen: Top marketing error:', marketingError);
        setTopMarketing([]);
      }

      // Load daily stats dengan business day logic
      try {
        console.log('AdminReportsScreen: Loading daily statistics');
        const dailyStatsResult = await ReportService.getDailyStatistics(filters);
        if (dailyStatsResult && dailyStatsResult.success) {
          setDailyStats(dailyStatsResult.data);
        } else {
          console.warn('AdminReportsScreen: Daily statistics failed:', dailyStatsResult);
          setDailyStats({
            activeCheckins: 0,
            totalCheckins: 0,
            cashTransactions: 0,
            transferTransactions: 0,
          });
        }
      } catch (dailyError) {
        console.error('AdminReportsScreen: Daily statistics error:', dailyError);
        setDailyStats({
          activeCheckins: 0,
          totalCheckins: 0,
          cashTransactions: 0,
          transferTransactions: 0,
        });
      }

      console.log('AdminReportsScreen: Finished loadReportData successfully');
    } catch (error) {
      console.error('AdminReportsScreen: Critical error in loadReportData:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat memuat data laporan. Data mungkin tidak lengkap.',
      });
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
    try {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return 'Rp 0';
      }
      const numAmount = parseFloat(amount) || 0;
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numAmount);
    } catch (error) {
      console.warn('AdminReportsScreen: Error formatting currency:', error);
      return 'Rp 0';
    }
  };

  /**
   * Format number untuk tampilan
   * @param {number} number - Angka
   * @returns {string} - Format number
   */
  const formatNumber = (number) => {
    try {
      if (number === null || number === undefined || isNaN(number)) {
        return '0';
      }
      const numValue = parseFloat(number) || 0;
      return new Intl.NumberFormat('id-ID').format(numValue);
    } catch (error) {
      console.warn('AdminReportsScreen: Error formatting number:', error);
      return '0';
    }
  };

  // Show loading indicator saat pertama kali load
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data laporan...</Text>
        <AlertComponent />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* Filter Actions - dipindah ke atas tanpa header duplikat */}
      <View style={styles.filterActionsContainer}>
        <TouchableOpacity
          style={styles.filterActionButton}
          onPress={() => setDateRangeModalVisible(true)}
        >
          <Icon name="date-range" size={20} color={COLORS.primary} />
          <Text style={styles.filterActionText}>Pilih Tanggal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterActionButton}
          onPress={() => setApartmentModalVisible(true)}
        >
          <Icon name="filter-list" size={20} color={COLORS.primary} />
          <Text style={styles.filterActionText}>Filter Apartemen</Text>
        </TouchableOpacity>
      </View>

      {/* Marketing Report Button */}
      <View style={styles.marketingReportContainer}>
        <TouchableOpacity
          style={styles.marketingReportButton}
          onPress={() => navigation.navigate('LaporanMarketing')}
        >
          <Icon name="trending-up" size={20} color={COLORS.background} />
          <Text style={styles.marketingReportText}>Lihat Laporan Marketing</Text>
          <Icon name="chevron-right" size={20} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Filter Info */}
      {(selectedApartments.length > 0 || (dateRange.startDate && dateRange.endDate)) && (
        <View style={styles.filterInfo}>
          <View style={styles.filterInfoContent}>
            <Icon name="filter-alt" size={16} color={COLORS.primary} />
            <Text style={styles.filterText}>
              {selectedApartments.length > 0
                ? `📍 ${selectedApartments.length} Apartemen Dipilih`
                : '🏢 Semua Apartemen'
              }
              {dateRange.startDate && dateRange.endDate
                ? ` • 📅 ${dateRange.startDate} - ${dateRange.endDate}`
                : ' • 📅 Semua Tanggal'
              }
            </Text>
          </View>
          <TouchableOpacity
            onPress={clearFilters}
            style={styles.filterButton}
          >
            <Icon name="clear" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Daily Statistics Cards - Compact dengan FlatList horizontal */}
      <View style={styles.dailyStatsContainer}>
        <Text style={styles.sectionTitle}>Statistik Harian</Text>
        <FlatList
          data={[
            { id: '1', icon: 'check-circle', color: COLORS.success, value: dailyStats.activeCheckins, label: 'Checkin Aktif' },
            { id: '2', icon: 'assignment', color: COLORS.primary, value: dailyStats.totalCheckins, label: 'Total Checkin' },
            { id: '3', icon: 'money', color: COLORS.warning, value: dailyStats.cashTransactions, label: 'Transaksi Tunai' },
            { id: '4', icon: 'credit-card', color: COLORS.info, value: dailyStats.transferTransactions, label: 'Transaksi Transfer' },
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.compactStatCard}>
              <Icon name={item.icon} size={24} color={item.color} />
              <Text style={styles.compactStatNumber}>{item.value}</Text>
              <Text style={styles.compactStatLabel}>{item.label}</Text>
            </View>
          )}
          contentContainerStyle={styles.statsScrollContent}
          style={styles.statsScrollView}
        />
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



      {/* Apartment Statistics */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Statistik per Apartemen (Business Day)</Text>
        {apartmentStats.length > 0 ? (
          <FlatList
            data={apartmentStats || []}
            keyExtractor={(item, index) => {
              try {
                return item?.id ? item.id.toString() : `apartment-${index}`;
              } catch (error) {
                console.warn('AdminReportsScreen: Error generating key for apartment:', error);
                return `apartment-fallback-${index}`;
              }
            }}
            renderItem={({ item }) => {
              try {
                // Validate item data
                if (!item) {
                  console.warn('AdminReportsScreen: Invalid apartment item:', item);
                  return null;
                }

                return (
                  <TouchableOpacity
                    style={styles.apartmentCard}
                    onPress={() => {
                      // Navigasi ke laporan detail apartemen
                      navigation.navigate('LaporanApartemen', {
                        apartmentId: item.id,
                        apartmentName: item.name,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.apartmentHeader}>
                      <Text style={styles.apartmentName}>{item.name || 'N/A'}</Text>
                      <Text style={styles.apartmentCode}>{item.code || 'N/A'}</Text>
                      <Icon name="chevron-right" size={20} color={COLORS.gray400} />
                    </View>

                    <View style={styles.apartmentStats}>
                      <View style={styles.apartmentStatItem}>
                        <Text style={styles.apartmentStatNumber}>
                          {formatNumber(item.total_units || 0)}
                        </Text>
                        <Text style={styles.apartmentStatLabel}>Total Unit</Text>
                      </View>

                      <View style={styles.apartmentStatItem}>
                        <Text style={styles.apartmentStatNumber}>
                          {formatNumber(item.active_checkins || 0)}
                        </Text>
                        <Text style={styles.apartmentStatLabel}>Checkin Aktif</Text>
                      </View>

                      <View style={styles.apartmentStatItem}>
                        <Text style={styles.apartmentStatNumber}>
                          {formatCurrency(item.total_revenue || 0)}
                        </Text>
                        <Text style={styles.apartmentStatLabel}>Pendapatan</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              } catch (error) {
                console.error('AdminReportsScreen: Error rendering apartment item:', error);
                return null;
              }
            }}
            scrollEnabled={false}
            onError={(error) => {
              console.error('AdminReportsScreen: Apartment FlatList error:', error);
            }}
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
        <Text style={styles.sectionTitle}>Marketing Terbaik (Business Day)</Text>
        {topMarketing.length > 0 ? (
          <FlatList
            data={topMarketing || []}
            keyExtractor={(item, index) => {
              try {
                return item?.marketing_name ? `marketing-${item.marketing_name}-${index}` : `marketing-${index}`;
              } catch (error) {
                console.warn('AdminReportsScreen: Error generating key for marketing:', error);
                return `marketing-fallback-${index}`;
              }
            }}
            renderItem={({ item, index }) => {
              try {
                // Validate item data
                if (!item) {
                  console.warn('AdminReportsScreen: Invalid marketing item:', item);
                  return null;
                }

                return (
                  <View style={styles.marketingCard}>
                    <View style={styles.marketingRank}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>

                    <View style={styles.marketingInfo}>
                      <Text style={styles.marketingName}>{item.marketing_name || 'N/A'}</Text>
                      <Text style={styles.marketingStats}>
                        {formatNumber(item.total_checkins || 0)} checkin • {formatCurrency(item.total_revenue || 0)}
                      </Text>
                      <Text style={styles.marketingApartments}>
                        {item.apartments_served || 0} apartemen
                      </Text>
                    </View>
                  </View>
                );
              } catch (error) {
                console.error('AdminReportsScreen: Error rendering marketing item:', error);
                return null;
              }
            }}
            scrollEnabled={false}
            onError={(error) => {
              console.error('AdminReportsScreen: Marketing FlatList error:', error);
            }}
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
            data={[{ id: null, name: 'Semua Apartemen' }, ...(apartments || [])]}
            keyExtractor={(item, index) => {
              try {
                return item?.id ? item.id.toString() : `apartment-modal-${index}`;
              } catch (error) {
                console.warn('AdminReportsScreen: Error generating key for apartment modal:', error);
                return `apartment-modal-fallback-${index}`;
              }
            }}
            renderItem={({ item }) => {
              try {
                // Validate item data
                if (!item || !item.name) {
                  console.warn('AdminReportsScreen: Invalid apartment modal item:', item);
                  return null;
                }

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
              } catch (error) {
                console.error('AdminReportsScreen: Error rendering apartment modal item:', error);
                return null;
              }
            }}
            contentContainerStyle={styles.modalContent}
            onError={(error) => {
              console.error('AdminReportsScreen: Apartment modal FlatList error:', error);
            }}
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

            {/* Date Picker Section */}
            <View style={styles.datePickerSection}>
              <Text style={styles.sectionTitle}>Pilih Rentang Tanggal</Text>

              {/* Start Date */}
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>Tanggal Mulai:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setStartDatePickerOpen(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {dateRange.startDate
                      ? new Date(dateRange.startDate).toLocaleDateString('id-ID')
                      : 'Pilih tanggal mulai'
                    }
                  </Text>
                  <Icon name="date-range" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* End Date */}
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>Tanggal Selesai:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setEndDatePickerOpen(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {dateRange.endDate
                      ? new Date(dateRange.endDate).toLocaleDateString('id-ID')
                      : 'Pilih tanggal selesai'
                    }
                  </Text>
                  <Icon name="date-range" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Current Date Range Display */}
              {(dateRange.startDate && dateRange.endDate) && (
                <View style={styles.currentDateRange}>
                  <Text style={styles.currentDateRangeLabel}>Rentang Dipilih:</Text>
                  <Text style={styles.currentDateRangeText}>
                    {new Date(dateRange.startDate).toLocaleDateString('id-ID')} - {new Date(dateRange.endDate).toLocaleDateString('id-ID')}
                  </Text>
                </View>
              )}
            </View>
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

      {/* Start Date Picker */}
      <DatePicker
        modal
        open={startDatePickerOpen}
        date={tempStartDate}
        mode="date"
        title="Pilih Tanggal Mulai"
        confirmText="Pilih"
        cancelText="Batal"
        maximumDate={new Date()}
        onConfirm={(date) => {
          try {
            setStartDatePickerOpen(false);
            setTempStartDate(date);

            // Reset tanggal selesai jika sebelum tanggal mulai yang baru
            if (dateRange.endDate && new Date(dateRange.endDate) < date) {
              setDateRange({
                startDate: date.toISOString(),
                endDate: null
              });
              setTempEndDate(date);
            } else {
              setDateRange(prev => ({
                ...prev,
                startDate: date.toISOString()
              }));
            }
          } catch (error) {
            console.error('Error setting start date:', error);
            showAlert({
              type: 'error',
              title: 'Error',
              message: 'Gagal mengatur tanggal mulai',
            });
          }
        }}
        onCancel={() => {
          setStartDatePickerOpen(false);
        }}
      />

      {/* End Date Picker */}
      <DatePicker
        modal
        open={endDatePickerOpen}
        date={tempEndDate}
        mode="date"
        title="Pilih Tanggal Selesai"
        confirmText="Pilih"
        cancelText="Batal"
        minimumDate={dateRange.startDate ? new Date(dateRange.startDate) : new Date('2020-01-01')}
        maximumDate={new Date()}
        onConfirm={(date) => {
          try {
            setEndDatePickerOpen(false);
            setTempEndDate(date);

            // Validasi tanggal selesai tidak boleh sebelum tanggal mulai
            if (dateRange.startDate && date < new Date(dateRange.startDate)) {
              showAlert({
                type: 'warning',
                title: 'Peringatan',
                message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
              });
              return;
            }

            setDateRange(prev => ({
              ...prev,
              endDate: date.toISOString()
            }));
          } catch (error) {
            console.error('Error setting end date:', error);
            showAlert({
              type: 'error',
              title: 'Error',
              message: 'Gagal mengatur tanggal selesai',
            });
          }
        }}
        onCancel={() => {
          setEndDatePickerOpen(false);
        }}
      />
      </ScrollView>

      {/* Modern Alert Component */}
      <AlertComponent />
    </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    paddingTop: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  dateTimeHeader: {
    alignItems: 'center',
  },
  filterButton: {
    padding: SIZES.sm,
    backgroundColor: COLORS.white + '20',
    borderRadius: SIZES.radius,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  // Filter Actions Container - style baru
  filterActionsContainer: {
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SIZES.md,
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray100,
    flex: 1,
    marginHorizontal: SIZES.xs,
    justifyContent: 'center',
  },
  filterActionText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginLeft: SIZES.xs,
  },
  // Marketing Report Button Styles
  marketingReportContainer: {
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.sm,
  },
  marketingReportButton: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  marketingReportText: {
    fontSize: SIZES.body,
    color: COLORS.background,
    fontWeight: '600',
    marginHorizontal: SIZES.sm,
    flex: 1,
    textAlign: 'center',
  },
  filterInfo: {
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.sm,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  filterInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterText: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginLeft: SIZES.sm,
    fontWeight: '600',
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
  // Compact Stats Styles - untuk scroll horizontal
  statsScrollView: {
    marginTop: SIZES.sm,
  },
  statsScrollContent: {
    paddingHorizontal: SIZES.md,
    paddingRight: SIZES.lg,
  },
  compactStatCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'center',
    marginRight: SIZES.sm,
    minWidth: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactStatNumber: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.xs,
  },
  compactStatLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
    lineHeight: 14,
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
    flex: 1,
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
    gap: SIZES.xs,
    flex: 1,
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
    fontWeight: '600',
  },
  statSubLabel: {
    fontSize: SIZES.caption - 1,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.7,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    padding: SIZES.lg,
  },
  loadingText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
  },

  // Date Picker Styles
  datePickerSection: {
    marginTop: SIZES.md,
  },
  datePickerRow: {
    marginBottom: SIZES.md,
  },
  dateLabel: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: SIZES.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButtonText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
  },
  currentDateRange: {
    marginTop: SIZES.md,
    padding: SIZES.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  currentDateRangeLabel: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginBottom: SIZES.xs,
    fontWeight: '500',
  },
  currentDateRangeText: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default AdminReportsScreen;
