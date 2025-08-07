import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import ApartmentService from '../../services/ApartmentService';
import UnitService from '../../services/UnitService';
import CheckinService from '../../services/CheckinService';
import AuthService from '../../services/AuthService';

const AdminCheckinScreen = ({ navigation }) => {
  const [apartments, setApartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    apartmentId: '',
    unitId: '',
    durationHours: '1',
    paymentMethod: 'cash',
    paymentAmount: '',
    marketingName: '',
    notes: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.apartmentId) {
      loadUnits(formData.apartmentId);
    } else {
      setUnits([]);
      setFormData(prev => ({ ...prev, unitId: '' }));
    }
  }, [formData.apartmentId]);

  const loadInitialData = async () => {
    try {
      const apartmentResult = await ApartmentService.getActiveApartments();
      if (apartmentResult.success) {
        setApartments(apartmentResult.data);
      }
    } catch (error) {
      console.error('Load initial data error:', error);
      Alert.alert('Error', 'Gagal memuat data awal');
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async (apartmentId) => {
    try {
      const unitResult = await UnitService.getAvailableUnits(apartmentId);
      if (unitResult.success) {
        setUnits(unitResult.data);
      }
    } catch (error) {
      console.error('Load units error:', error);
      Alert.alert('Error', 'Gagal memuat data unit');
    }
  };

  const handleSubmit = async () => {
    // Validasi form
    if (!formData.apartmentId || !formData.unitId || !formData.paymentAmount || !formData.marketingName) {
      Alert.alert('Error', 'Harap lengkapi semua field yang wajib diisi');
      return;
    }

    const paymentAmount = parseFloat(formData.paymentAmount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Jumlah pembayaran harus berupa angka yang valid');
      return;
    }

    setSubmitting(true);

    try {
      const currentUser = AuthService.getCurrentUser();
      
      // Hitung checkout time
      const checkoutTime = new Date();
      checkoutTime.setHours(checkoutTime.getHours() + parseInt(formData.durationHours));

      const checkinData = {
        apartmentId: formData.apartmentId,
        unitId: formData.unitId,
        durationHours: parseInt(formData.durationHours),
        checkoutTime: checkoutTime.toISOString(),
        paymentMethod: formData.paymentMethod,
        paymentAmount: paymentAmount,
        marketingName: formData.marketingName.trim(),
        notes: formData.notes.trim(),
        createdBy: currentUser.id,
      };

      const result = await CheckinService.createCheckin(checkinData);

      if (result.success) {
        Alert.alert(
          'Berhasil',
          'Checkin berhasil dibuat',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setFormData({
                  apartmentId: '',
                  unitId: '',
                  durationHours: '1',
                  paymentMethod: 'cash',
                  paymentAmount: '',
                  marketingName: '',
                  notes: '',
                });
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Submit checkin error:', error);
      Alert.alert('Error', 'Gagal membuat checkin: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkin Manual</Text>
      </View>

      <View style={styles.form}>
        {/* Apartemen */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Apartemen *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.apartmentId}
              onValueChange={(value) => setFormData({ ...formData, apartmentId: value })}
              style={styles.picker}
            >
              <Picker.Item label="Pilih Apartemen" value="" />
              {apartments.map((apartment) => (
                <Picker.Item
                  key={apartment.id}
                  label={`${apartment.name} (${apartment.code})`}
                  value={apartment.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Unit */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Unit *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.unitId}
              onValueChange={(value) => setFormData({ ...formData, unitId: value })}
              style={styles.picker}
              enabled={units.length > 0}
            >
              <Picker.Item label="Pilih Unit" value="" />
              {units.map((unit) => (
                <Picker.Item
                  key={unit.id}
                  label={`${unit.unit_number} (${unit.unit_type || 'Standard'})`}
                  value={unit.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Durasi */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Durasi (Jam) *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.durationHours}
              onValueChange={(value) => setFormData({ ...formData, durationHours: value })}
              style={styles.picker}
            >
              {[1, 2, 3, 4, 5, 6, 12, 24].map((hour) => (
                <Picker.Item key={hour} label={`${hour} Jam`} value={hour.toString()} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Metode Pembayaran */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Metode Pembayaran *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              style={styles.picker}
            >
              <Picker.Item label="Cash" value="cash" />
              <Picker.Item label="Transfer Bank" value="transfer" />
              <Picker.Item label="E-Wallet" value="ewallet" />
              <Picker.Item label="Kartu Kredit" value="credit_card" />
            </Picker>
          </View>
        </View>

        {/* Jumlah Pembayaran */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Jumlah Pembayaran (Rp) *</Text>
          <TextInput
            style={styles.input}
            value={formData.paymentAmount}
            onChangeText={(text) => setFormData({ ...formData, paymentAmount: text })}
            placeholder="Masukkan jumlah pembayaran"
            placeholderTextColor={COLORS.gray400}
            keyboardType="numeric"
          />
        </View>

        {/* Nama Marketing */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nama Marketing *</Text>
          <TextInput
            style={styles.input}
            value={formData.marketingName}
            onChangeText={(text) => setFormData({ ...formData, marketingName: text })}
            placeholder="Masukkan nama marketing"
            placeholderTextColor={COLORS.gray400}
          />
        </View>

        {/* Catatan */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Catatan tambahan (opsional)"
            placeholderTextColor={COLORS.gray400}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.submitButtonText}>Buat Checkin</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: SIZES.md,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  form: {
    padding: SIZES.lg,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
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
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.background,
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: SIZES.h6,
    fontWeight: 'bold',
  },
});

export default AdminCheckinScreen;
