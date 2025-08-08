import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../config/constants';
import CleaningService from '../services/CleaningService';

const CleaningManagement = ({ unitId, onStatusChange, currentUser }) => {
  const [cleaningStatus, setCleaningStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showExtendCheckinModal, setShowExtendCheckinModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState('5');
  const [extendHours, setExtendHours] = useState('2');

  useEffect(() => {
    loadCleaningStatus();
    
    // Auto-refresh setiap 30 detik
    const interval = setInterval(loadCleaningStatus, 30000);
    return () => clearInterval(interval);
  }, [unitId]);

  const loadCleaningStatus = async () => {
    try {
      const result = await CleaningService.getCleaningStatus(unitId);
      if (result.success) {
        setCleaningStatus(result.data);
      }
    } catch (error) {
      console.error('Error loading cleaning status:', error);
    }
  };

  const handleExtendCleaning = async () => {
    const minutes = parseInt(extendMinutes);
    if (isNaN(minutes) || minutes < 1 || minutes > 10) {
      Alert.alert('Error', 'Masukkan menit antara 1-10');
      return;
    }

    setLoading(true);
    try {
      const result = await CleaningService.extendCleaning(
        unitId,
        minutes,
        currentUser.id,
        currentUser.role
      );

      if (result.success) {
        Alert.alert('Sukses', result.message);
        setShowExtendModal(false);
        await loadCleaningStatus();
        onStatusChange && onStatusChange();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memperpanjang cleaning');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendCheckin = async () => {
    const hours = parseInt(extendHours);
    if (isNaN(hours) || hours < 1 || hours > 12) {
      Alert.alert('Error', 'Masukkan jam antara 1-12');
      return;
    }

    setLoading(true);
    try {
      const result = await CleaningService.extendCheckinFromCleaning(
        unitId,
        hours,
        currentUser.id,
        currentUser.role
      );

      if (result.success) {
        Alert.alert('Sukses', result.message);
        setShowExtendCheckinModal(false);
        await loadCleaningStatus();
        onStatusChange && onStatusChange();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memperpanjang checkin');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishCleaning = async () => {
    Alert.alert(
      'Konfirmasi',
      'Apakah cleaning sudah selesai?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Selesai',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await CleaningService.finishCleaning(
                unitId,
                currentUser.id,
                currentUser.role
              );

              if (result.success) {
                Alert.alert('Sukses', result.message);
                await loadCleaningStatus();
                onStatusChange && onStatusChange();
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Gagal menyelesaikan cleaning');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!cleaningStatus || !cleaningStatus.isInCleaning) {
    return null;
  }

  const formatTime = (minutes) => {
    if (minutes <= 0) return '0 menit';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}j ${mins}m`;
    }
    return `${mins} menit`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="cleaning-services" size={20} color={COLORS.warning} />
        <Text style={styles.title}>Status Cleaning</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Waktu berlalu:</Text>
        <Text style={styles.value}>{formatTime(cleaningStatus.elapsedMinutes)}</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Sisa waktu:</Text>
        <Text style={[
          styles.value,
          { color: cleaningStatus.isOvertime ? COLORS.error : COLORS.success }
        ]}>
          {cleaningStatus.isOvertime ? 'Overtime!' : formatTime(cleaningStatus.remainingMinutes)}
        </Text>
      </View>

      {cleaningStatus.extendedMinutes > 0 && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Diperpanjang:</Text>
          <Text style={styles.value}>{cleaningStatus.extendedMinutes} menit</Text>
        </View>
      )}

      <View style={styles.actions}>
        {cleaningStatus.canExtend && (
          <TouchableOpacity
            style={[styles.button, styles.extendButton]}
            onPress={() => setShowExtendModal(true)}
            disabled={loading}
          >
            <Icon name="schedule" size={16} color={COLORS.background} />
            <Text style={styles.buttonText}>+Cleaning</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.extendCheckinButton]}
          onPress={() => setShowExtendCheckinModal(true)}
          disabled={loading}
        >
          <Icon name="access-time" size={16} color={COLORS.background} />
          <Text style={styles.buttonText}>+Checkin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.finishButton]}
          onPress={handleFinishCleaning}
          disabled={loading}
        >
          <Icon name="check-circle" size={16} color={COLORS.background} />
          <Text style={styles.buttonText}>Selesai</Text>
        </TouchableOpacity>
      </View>

      {/* Extend Cleaning Modal */}
      <Modal
        visible={showExtendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExtendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Perpanjang Cleaning</Text>

            <Text style={styles.modalLabel}>Tambah menit (1-10):</Text>
            <TextInput
              style={styles.modalInput}
              value={extendMinutes}
              onChangeText={setExtendMinutes}
              keyboardType="numeric"
              placeholder="5"
              maxLength={2}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExtendModal(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleExtendCleaning}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>Perpanjang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Extend Checkin Modal */}
      <Modal
        visible={showExtendCheckinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExtendCheckinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Perpanjang Checkin</Text>
            <Text style={styles.modalSubtitle}>Untuk tamu yang telat checkout</Text>

            <Text style={styles.modalLabel}>Tambah jam (1-12):</Text>
            <TextInput
              style={styles.modalInput}
              value={extendHours}
              onChangeText={setExtendHours}
              keyboardType="numeric"
              placeholder="2"
              maxLength={2}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExtendCheckinModal(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleExtendCheckin}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>Extend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginVertical: SIZES.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  title: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.warning,
    marginLeft: SIZES.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  label: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: SIZES.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    marginTop: SIZES.sm,
    gap: SIZES.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    flex: 1,
    justifyContent: 'center',
  },
  extendButton: {
    backgroundColor: COLORS.info,
  },
  extendCheckinButton: {
    backgroundColor: COLORS.primary,
  },
  finishButton: {
    backgroundColor: COLORS.success,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: SIZES.caption,
    fontWeight: '600',
    marginLeft: SIZES.xs,
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
    padding: SIZES.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  modalSubtitle: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.md,
    fontStyle: 'italic',
  },
  modalLabel: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    fontSize: SIZES.body,
    textAlign: 'center',
    marginBottom: SIZES.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray300,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
});

export default CleaningManagement;
