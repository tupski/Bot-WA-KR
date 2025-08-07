import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatabaseManager from '../../config/supabase';
import AuthService from '../../services/AuthService';
import PasswordUtils from '../../utils/PasswordUtils';
import { COLORS, SIZES, USER_ROLES } from '../../config/constants';

const ProfileManagementScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Gagal memuat profil pengguna');
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Nama lengkap harus diisi');
      return false;
    }

    if (currentUser.role === USER_ROLES.FIELD_TEAM) {
      if (!formData.phone.trim()) {
        Alert.alert('Error', 'Nomor WhatsApp harus diisi');
        return false;
      }

      // Validate phone number format
      const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        Alert.alert('Error', 'Format nomor WhatsApp tidak valid');
        return false;
      }
    }

    if (currentUser.role === USER_ROLES.ADMIN) {
      if (formData.email && !isValidEmail(formData.email)) {
        Alert.alert('Error', 'Format email tidak valid');
        return false;
      }
    }

    // Validate password if changing
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        Alert.alert('Error', 'Password lama harus diisi untuk mengubah password');
        return false;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        Alert.alert('Error', 'Konfirmasi password baru tidak cocok');
        return false;
      }

      const passwordValidation = PasswordUtils.validatePasswordStrength(formData.newPassword);
      if (!passwordValidation.isValid) {
        Alert.alert('Error', passwordValidation.feedback.join('\n'));
        return false;
      }
    }

    return true;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const updateData = {
        full_name: formData.fullName.trim(),
      };

      if (currentUser.role === USER_ROLES.ADMIN) {
        updateData.email = formData.email.trim();
      } else {
        updateData.phone_number = formData.phone.trim();
      }

      // Handle password change
      if (formData.newPassword) {
        // Verify current password first
        let isCurrentPasswordValid = false;
        
        if (currentUser.role === USER_ROLES.ADMIN) {
          const loginResult = await AuthService.loginAdmin(currentUser.username, formData.currentPassword);
          isCurrentPasswordValid = loginResult.success;
        } else {
          const loginResult = await AuthService.loginFieldTeam(currentUser.phone, formData.currentPassword);
          isCurrentPasswordValid = loginResult.success;
        }

        if (!isCurrentPasswordValid) {
          Alert.alert('Error', 'Password lama tidak benar');
          setLoading(false);
          return;
        }

        // Hash new password
        updateData.password = await PasswordUtils.hashPassword(formData.newPassword);
      }

      // Update profile
      let result;
      if (currentUser.role === USER_ROLES.ADMIN) {
        result = await DatabaseManager.updateAdminProfile(currentUser.id, updateData);
      } else {
        result = await DatabaseManager.updateFieldTeamProfile(currentUser.id, updateData);
      }

      if (result.success) {
        // Update current user data
        const updatedUser = {
          ...currentUser,
          fullName: formData.fullName.trim(),
          email: currentUser.role === USER_ROLES.ADMIN ? formData.email.trim() : currentUser.email,
          phone: currentUser.role === USER_ROLES.FIELD_TEAM ? formData.phone.trim() : currentUser.phone,
        };
        
        await AuthService.setCurrentUser(updatedUser);
        setCurrentUser(updatedUser);
        setEditMode(false);
        
        // Clear password fields
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        Alert.alert('Berhasil', 'Profil berhasil diperbarui');
      } else {
        Alert.alert('Error', result.message || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      fullName: currentUser.fullName || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const generateRandomPassword = () => {
    const password = PasswordUtils.generateRandomPassword(8);
    setFormData({
      ...formData,
      newPassword: password,
      confirmPassword: password,
    });
    Alert.alert('Password Generated', `Password baru: ${password}\n\nSilakan catat password ini.`);
  };

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Memuat profil...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Profil Saya</Text>
        {!editMode && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(true)}
          >
            <Icon name="edit" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={80} color={COLORS.PRIMARY} />
          </View>
          
          <View style={styles.roleInfo}>
            <Text style={styles.roleBadge}>
              {currentUser.role === USER_ROLES.ADMIN ? 'Administrator' : 'Tim Lapangan'}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap *</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              placeholder="Masukkan nama lengkap"
              editable={editMode}
            />
          </View>

          {currentUser.role === USER_ROLES.ADMIN ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Masukkan email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={editMode}
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor WhatsApp *</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Contoh: +6281234567890"
                keyboardType="phone-pad"
                editable={editMode}
              />
            </View>
          )}

          {editMode && (
            <>
              <View style={styles.passwordSection}>
                <Text style={styles.sectionTitle}>Ubah Password (Opsional)</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password Lama</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.currentPassword}
                    onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                    placeholder="Masukkan password lama"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.passwordHeader}>
                    <Text style={styles.label}>Password Baru</Text>
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
                    value={formData.newPassword}
                    onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                    placeholder="Masukkan password baru"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Konfirmasi Password Baru</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                    placeholder="Konfirmasi password baru"
                    secureTextEntry
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {editMode && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Text>
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
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  editButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: COLORS.WHITE,
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 10,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  roleInfo: {
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: COLORS.PRIMARY,
    color: COLORS.WHITE,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: SIZES.SMALL,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: COLORS.WHITE,
    padding: 20,
    marginBottom: 10,
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
  inputDisabled: {
    backgroundColor: COLORS.LIGHT_GRAY,
    color: COLORS.TEXT_SECONDARY,
  },
  passwordSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  sectionTitle: {
    fontSize: SIZES.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 15,
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
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  button: {
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

export default ProfileManagementScreen;
