import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, CHECKIN_STATUS } from '../../config/constants';
import CheckinService from '../../services/CheckinService';
import AuthService from '../../services/AuthService';

const CheckinDetailScreen = ({ route, navigation }) => {
  const { unitId, checkinId } = route.params;
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadCheckinDetail();
  }, []);

  const loadCurrentUser = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  };

  const loadCheckinDetail = async () => {
    try {
      setLoading(true);

      console.log('CheckinDetailScreen: Loading checkin detail with params:', { unitId, checkinId });

      // Validate parameters
      if (!checkinId && !unitId) {
        Alert.alert('Error', 'Parameter tidak valid untuk memuat detail checkin');
        navigation.goBack();
        return;
      }

      let result;
      if (checkinId) {
        // Load by checkin ID
        console.log('CheckinDetailScreen: Loading by checkin ID:', checkinId);
        result = await CheckinService.getCheckinById(checkinId);
      } else if (unitId) {
        // Load active checkin by unit ID
        console.log('CheckinDetailScreen: Loading by unit ID:', unitId);
        result = await CheckinService.getActiveCheckinByUnit(unitId);
      }

      console.log('CheckinDetailScreen: Service result:', result);

      if (result && result.success && result.data) {
        setCheckin(result.data);
      } else {
        const errorMessage = result?.message || 'Gagal memuat detail checkin';
        console.error('CheckinDetailScreen: Service error:', errorMessage);
        Alert.alert('Error', errorMessage);
        navigation.goBack();
      }
    } catch (error) {
      console.error('CheckinDetailScreen: Error loading checkin detail:', error);
      Alert.alert('Error', `Gagal memuat detail checkin: ${error.message || 'Unknown error'}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCheckinDetail();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CHECKIN_STATUS.ACTIVE:
        return COLORS.success;
      case CHECKIN_STATUS.EXTENDED:
        return COLORS.warning;
      case CHECKIN_STATUS.COMPLETED:
        return COLORS.info;
      case CHECKIN_STATUS.EARLY_CHECKOUT:
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case CHECKIN_STATUS.ACTIVE:
        return 'Aktif';
      case CHECKIN_STATUS.EXTENDED:
        return 'Diperpanjang';
      case CHECKIN_STATUS.COMPLETED:
        return 'Selesai';
      case CHECKIN_STATUS.EARLY_CHECKOUT:
        return 'Checkout Awal';
      default:
        return status;
    }
  };

  const formatDateTime = (dateString) => {
    try {
      if (!dateString) return '-';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  const formatCurrency = (amount) => {
    try {
      if (!amount || isNaN(amount)) return 'Rp 0';
      return `Rp ${Number(amount).toLocaleString('id-ID')}`;
    } catch (error) {
      console.error('Error formatting currency:', error);
      return 'Rp 0';
    }
  };

  const handleExtendCheckin = () => {
    if (checkin && checkin.status === CHECKIN_STATUS.ACTIVE) {
      navigation.navigate('FieldExtend', { checkinId: checkin.id });
    }
  };

  const handleEarlyCheckout = () => {
    if (checkin && checkin.status === CHECKIN_STATUS.ACTIVE) {
      Alert.alert(
        'Early Checkout',
        'Apakah Anda yakin ingin melakukan early checkout?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Checkout',
            style: 'destructive',
            onPress: performEarlyCheckout,
          },
        ]
      );
    }
  };

  const performEarlyCheckout = async () => {
    try {
      setLoading(true);
      const result = await CheckinService.earlyCheckout(checkin.id, currentUser.id, currentUser.role);
      
      if (result.success) {
        Alert.alert('Berhasil', 'Early checkout berhasil dilakukan', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error early checkout:', error);
      Alert.alert('Error', 'Gagal melakukan early checkout');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !checkin) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Memuat detail checkin...</Text>
      </View>
    );
  }

  if (!checkin) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Detail checkin tidak ditemukan</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Icon name="arrow-back" size={24} color={COLORS.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Checkin</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.headerRefreshButton}
        >
          <Icon name="refresh" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(checkin.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(checkin.status)}</Text>
          </View>
        </View>

        {/* Unit Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Unit</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Apartemen:</Text>
            <Text style={styles.infoValue}>{checkin.apartments?.name || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unit:</Text>
            <Text style={styles.infoValue}>{checkin.units?.unit_number || '-'}</Text>
          </View>
        </View>

        {/* Checkin Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Checkin</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Checkin:</Text>
            <Text style={styles.infoValue}>{formatDateTime(checkin?.checkin_time)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Checkout:</Text>
            <Text style={styles.infoValue}>{formatDateTime(checkin?.checkout_time)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Durasi:</Text>
            <Text style={styles.infoValue}>{checkin?.duration_hours || 0} jam</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pembayaran</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Metode:</Text>
            <Text style={styles.infoValue}>{checkin?.payment_method || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jumlah:</Text>
            <Text style={styles.infoValue}>{formatCurrency(checkin?.payment_amount)}</Text>
          </View>

          {checkin?.payment_proof_url && (
            <View style={styles.paymentProofContainer}>
              <Text style={styles.infoLabel}>Bukti Pembayaran:</Text>
              <Image
                source={{ uri: checkin.payment_proof_url }}
                style={styles.paymentProofImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Error loading payment proof image:', error);
                }}
              />
            </View>
          )}
        </View>

        {/* Marketing Info */}
        {checkin.marketing_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marketing</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sumber:</Text>
              <Text style={styles.infoValue}>{checkin.marketing_name}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {checkin.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <Text style={styles.notesText}>{checkin.notes}</Text>
          </View>
        )}

        {/* Team Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tim Lapangan</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nama:</Text>
            <Text style={styles.infoValue}>{checkin.field_teams?.full_name || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username:</Text>
            <Text style={styles.infoValue}>{checkin.field_teams?.username || '-'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        {checkin.status === CHECKIN_STATUS.ACTIVE && currentUser?.role === 'field_team' && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.extendButton]}
              onPress={handleExtendCheckin}
            >
              <Icon name="access-time" size={20} color={COLORS.background} />
              <Text style={styles.actionButtonText}>Perpanjang</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.checkoutButton]}
              onPress={handleEarlyCheckout}
            >
              <Icon name="exit-to-app" size={20} color={COLORS.background} />
              <Text style={styles.actionButtonText}>Early Checkout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  headerBackButton: {
    padding: SIZES.sm,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
    flex: 1,
    textAlign: 'center',
  },
  headerRefreshButton: {
    padding: SIZES.sm,
  },
  content: {
    flex: 1,
    padding: SIZES.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  loadingText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    padding: SIZES.xl,
  },
  errorText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    marginTop: SIZES.lg,
  },
  backButtonText: {
    color: COLORS.background,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  statusBadge: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
  },
  statusText: {
    color: COLORS.background,
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  section: {
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
  sectionTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  infoLabel: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  paymentProofContainer: {
    marginTop: SIZES.md,
  },
  paymentProofImage: {
    width: '100%',
    height: 200,
    borderRadius: SIZES.radius,
    marginTop: SIZES.sm,
  },
  notesText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  actionSection: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    gap: SIZES.sm,
  },
  extendButton: {
    backgroundColor: COLORS.warning,
  },
  checkoutButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
});

export default CheckinDetailScreen;
