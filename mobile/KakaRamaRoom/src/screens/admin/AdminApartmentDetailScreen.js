import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApartmentService from '../../services/ApartmentService';
import UnitService from '../../services/UnitService';
import { COLORS, SIZES, UNIT_STATUS } from '../../config/constants';

const AdminApartmentDetailScreen = ({ route, navigation }) => {
  const { apartmentId } = route.params;
  const [apartment, setApartment] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadApartmentData();
  }, [apartmentId]);

  const loadApartmentData = async () => {
    try {
      setLoading(true);

      // Load apartment details
      const apartmentResult = await ApartmentService.getApartmentById(apartmentId);
      if (apartmentResult.success) {
        setApartment(apartmentResult.data);
      } else {
        Alert.alert('Error', apartmentResult.message);
        return;
      }

      // Load units for this apartment
      const unitsResult = await UnitService.getUnitsByApartment(apartmentId);
      if (unitsResult.success) {
        setUnits(unitsResult.data);
      } else {
        console.error('Error loading units:', unitsResult.message);
        setUnits([]);
      }
    } catch (error) {
      console.error('Error loading apartment data:', error);
      Alert.alert('Error', 'Gagal memuat data apartemen');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApartmentData();
    setRefreshing(false);
  };

  const handleAddUnit = () => {
    navigation.navigate('AdminAddUnit', { apartmentId });
  };

  const handleEditUnit = (unit) => {
    navigation.navigate('AdminEditUnit', { unitId: unit.id, apartmentId });
  };

  const handleDeleteUnit = (unit) => {
    Alert.alert(
      'Hapus Unit',
      `Apakah Anda yakin ingin menghapus unit ${unit.unit_number}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await UnitService.deleteUnit(unit.id);
              if (result.success) {
                await loadApartmentData();
                Alert.alert('Berhasil', result.message);
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus unit');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case UNIT_STATUS.AVAILABLE:
        return COLORS.SUCCESS;
      case UNIT_STATUS.OCCUPIED:
        return COLORS.ERROR;
      case UNIT_STATUS.CLEANING:
        return COLORS.WARNING;
      case UNIT_STATUS.MAINTENANCE:
        return COLORS.INFO;
      default:
        return COLORS.TEXT_SECONDARY;
    }
  };

  const getStatusText = (status) => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Memuat data apartemen...</Text>
      </View>
    );
  }

  if (!apartment) {
    return (
      <View style={styles.errorContainer}>
        <Text>Apartemen tidak ditemukan</Text>
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{apartment.name}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AdminEditApartment', { apartmentId })}
        >
          <Icon name="edit" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Apartment Info */}
      <View style={styles.apartmentInfo}>
        <Text style={styles.apartmentName}>{apartment.name}</Text>
        <Text style={styles.apartmentAddress}>{apartment.address}</Text>
        <Text style={styles.apartmentGroup}>
          Grup WhatsApp: {apartment.whatsapp_group_id || 'Belum diatur'}
        </Text>
      </View>

      {/* Units Section */}
      <View style={styles.unitsSection}>
        <View style={styles.unitsSectionHeader}>
          <Text style={styles.unitsSectionTitle}>Daftar Unit</Text>
          <TouchableOpacity
            style={styles.addUnitButton}
            onPress={handleAddUnit}
          >
            <Icon name="add" size={20} color={COLORS.WHITE} />
            <Text style={styles.addUnitButtonText}>Tambah Unit</Text>
          </TouchableOpacity>
        </View>

        {units.length === 0 ? (
          <View style={styles.emptyUnits}>
            <Icon name="home" size={48} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyUnitsText}>Belum ada unit</Text>
            <TouchableOpacity
              style={styles.addFirstUnitButton}
              onPress={handleAddUnit}
            >
              <Text style={styles.addFirstUnitButtonText}>Tambah Unit Pertama</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.unitsTable}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.unitNumberColumn]}>
                No. Unit
              </Text>
              <Text style={[styles.tableHeaderText, styles.unitTypeColumn]}>
                Tipe
              </Text>
              <Text style={[styles.tableHeaderText, styles.statusColumn]}>
                Status
              </Text>
              <Text style={[styles.tableHeaderText, styles.actionColumn]}>
                Aksi
              </Text>
            </View>

            {/* Table Rows */}
            {units.map((unit) => (
              <View key={unit.id} style={styles.tableRow}>
                <Text style={[styles.tableCellText, styles.unitNumberColumn]}>
                  {unit.unit_number}
                </Text>
                <Text style={[styles.tableCellText, styles.unitTypeColumn]}>
                  {unit.unit_type}
                </Text>
                <View style={[styles.statusCell, styles.statusColumn]}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(unit.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(unit.status)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.actionCell, styles.actionColumn]}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditUnit(unit)}
                  >
                    <Icon name="edit" size={16} color={COLORS.PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteUnit(unit)}
                  >
                    <Icon name="delete" size={16} color={COLORS.ERROR} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  headerBackButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  editButton: {
    padding: 5,
  },
  apartmentInfo: {
    backgroundColor: COLORS.WHITE,
    padding: 20,
    marginBottom: 10,
  },
  apartmentName: {
    fontSize: SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 5,
  },
  apartmentAddress: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 5,
  },
  apartmentGroup: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_SECONDARY,
  },
  unitsSection: {
    backgroundColor: COLORS.WHITE,
    margin: 10,
    borderRadius: 10,
    padding: 15,
  },
  unitsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  unitsSectionTitle: {
    fontSize: SIZES.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  addUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 5,
  },
  addUnitButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.EXTRA_SMALL,
    fontWeight: '600',
  },
  emptyUnits: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyUnitsText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 10,
    marginBottom: 20,
  },
  addFirstUnitButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstUnitButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.SMALL,
    fontWeight: '600',
  },
  unitsTable: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: SIZES.EXTRA_SMALL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  tableCellText: {
    fontSize: SIZES.EXTRA_SMALL,
    color: COLORS.TEXT_PRIMARY,
  },
  unitNumberColumn: {
    flex: 2,
  },
  unitTypeColumn: {
    flex: 2,
  },
  statusColumn: {
    flex: 2,
  },
  actionColumn: {
    flex: 2,
  },
  statusCell: {
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: COLORS.WHITE,
    fontSize: SIZES.EXTRA_SMALL,
    fontWeight: '600',
  },
  actionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  backButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.SMALL,
    fontWeight: '600',
  },
});

export default AdminApartmentDetailScreen;
