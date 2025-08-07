import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatabaseManager from '../../config/supabase';
import PasswordUtils from '../../utils/PasswordUtils';
import { COLORS, SIZES } from '../../config/constants';

const AdminFieldTeamManagementScreen = ({ navigation }) => {
  const [fieldTeams, setFieldTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadFieldTeams();
  }, []);

  const loadFieldTeams = async () => {
    try {
      setLoading(true);
      const teams = await DatabaseManager.getAllFieldTeams();
      setFieldTeams(teams);
    } catch (error) {
      console.error('Error loading field teams:', error);
      Alert.alert('Error', 'Gagal memuat data tim lapangan');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFieldTeams();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingTeam(null);
    setFormData({
      fullName: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      fullName: team.full_name,
      phoneNumber: team.phone_number,
      password: '',
      confirmPassword: '',
    });
    setModalVisible(true);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Nama lengkap harus diisi');
      return false;
    }

    if (!formData.phoneNumber.trim()) {
      Alert.alert('Error', 'Nomor WhatsApp harus diisi');
      return false;
    }

    // Validate phone number format
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Format nomor WhatsApp tidak valid');
      return false;
    }

    if (!editingTeam) {
      // For new team, password is required
      if (!formData.password.trim()) {
        Alert.alert('Error', 'Password harus diisi');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Konfirmasi password tidak cocok');
        return false;
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(formData.password);
      if (!passwordValidation.isValid) {
        Alert.alert('Error', passwordValidation.feedback.join('\n'));
        return false;
      }
    } else {
      // For edit, password is optional
      if (formData.password && formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Konfirmasi password tidak cocok');
        return false;
      }

      if (formData.password) {
        const passwordValidation = PasswordUtils.validatePasswordStrength(formData.password);
        if (!passwordValidation.isValid) {
          Alert.alert('Error', passwordValidation.feedback.join('\n'));
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const teamData = {
        full_name: formData.fullName.trim(),
        phone_number: formData.phoneNumber.trim(),
      };

      // Hash password if provided
      if (formData.password) {
        teamData.password = await PasswordUtils.hashPassword(formData.password);
      }

      let result;
      if (editingTeam) {
        result = await DatabaseManager.updateFieldTeam(editingTeam.id, teamData);
      } else {
        result = await DatabaseManager.createFieldTeam(teamData);
      }

      if (result.success) {
        Alert.alert('Berhasil', editingTeam ? 'Tim lapangan berhasil diupdate' : 'Tim lapangan berhasil ditambahkan');
        setModalVisible(false);
        await loadFieldTeams();
      } else {
        Alert.alert('Error', result.message || 'Gagal menyimpan data tim lapangan');
      }
    } catch (error) {
      console.error('Error saving field team:', error);
      Alert.alert('Error', 'Gagal menyimpan data tim lapangan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (team) => {
    Alert.alert(
      'Hapus Tim Lapangan',
      `Apakah Anda yakin ingin menghapus ${team.full_name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DatabaseManager.deleteFieldTeam(team.id);
              if (result.success) {
                Alert.alert('Berhasil', 'Tim lapangan berhasil dihapus');
                await loadFieldTeams();
              } else {
                Alert.alert('Error', result.message || 'Gagal menghapus tim lapangan');
              }
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus tim lapangan');
            }
          },
        },
      ]
    );
  };

  const generateRandomPassword = () => {
    const password = PasswordUtils.generateRandomPassword(8);
    setFormData({
      ...formData,
      password,
      confirmPassword: password,
    });
    Alert.alert('Password Generated', `Password: ${password}\n\nSilakan catat password ini untuk diberikan kepada tim lapangan.`);
  };

  const renderTeamItem = (team) => (
    <View key={team.id} style={styles.teamCard}>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{team.full_name}</Text>
        <Text style={styles.teamPhone}>{team.phone_number}</Text>
        <Text style={styles.teamStatus}>
          Status: {team.is_active ? 'Aktif' : 'Nonaktif'}
        </Text>
      </View>
      <View style={styles.teamActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(team)}
        >
          <Icon name="edit" size={20} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(team)}
        >
          <Icon name="delete" size={20} color={COLORS.ERROR} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Tim Lapangan</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <Icon name="add" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {fieldTeams.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>Belum ada tim lapangan</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={openAddModal}
            >
              <Text style={styles.addFirstButtonText}>Tambah Tim Pertama</Text>
            </TouchableOpacity>
          </View>
        ) : (
          fieldTeams.map(renderTeamItem)
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingTeam ? 'Edit Tim Lapangan' : 'Tambah Tim Lapangan'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Lengkap *</Text>
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholder="Masukkan nama lengkap"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor WhatsApp *</Text>
              <TextInput
                style={styles.input}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                placeholder="Contoh: +6281234567890"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>
                  Password {editingTeam ? '(kosongkan jika tidak diubah)' : '*'}
                </Text>
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={generateRandomPassword}
                >
                  <Icon name="refresh" size={16} color={COLORS.PRIMARY} />
                  <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Masukkan password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Konfirmasi Password</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Konfirmasi password"
                secureTextEntry
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  addButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: SIZES.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 15,
    marginBottom: 30,
  },
  addFirstButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.SMALL,
    fontWeight: '600',
  },
  teamCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: SIZES.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 5,
  },
  teamPhone: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 3,
  },
  teamStatus: {
    fontSize: SIZES.EXTRA_SMALL,
    color: COLORS.TEXT_SECONDARY,
  },
  teamActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: SIZES.SMALL,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_PRIMARY,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  generateButtonText: {
    fontSize: SIZES.EXTRA_SMALL,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  cancelButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.SMALL,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontSize: SIZES.SMALL,
    fontWeight: '600',
  },
});

export default AdminFieldTeamManagementScreen;
