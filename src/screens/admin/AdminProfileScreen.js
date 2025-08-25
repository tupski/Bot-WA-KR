import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, USER_ROLES } from '../../config/constants';
import AuthService from '../../services/AuthService';
import PasswordUtils from '../../utils/PasswordUtils';
import ImagePickerService from '../../services/ImagePickerService';
import { useModernAlert } from '../../components/ModernAlert';

const AdminProfileScreen = ({ navigation }) => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  /**
   * Load user profile data
   */
  const loadUserProfile = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'User tidak ditemukan. Silakan login ulang.'
        });
        navigation.replace('Login');
        return;
      }

      setCurrentUser(user);
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Load profile image if exists
      if (user.profileImage) {
        setProfileImage(user.profileImage);
      }
    } catch (error) {
      console.error('AdminProfileScreen: Error loading user profile:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memuat profil pengguna'
      });
    }
  };

  /**
   * Handle profile image selection
   */
  const handleImagePicker = async () => {
    try {
      ImagePickerService.showProfileImagePicker((selectedImage) => {
        console.log('AdminProfileScreen: Image selected:', selectedImage);

        // Validate image
        const validation = ImagePickerService.validateImage(selectedImage);
        if (!validation.valid) {
          showAlert({
            type: 'error',
            title: 'Error',
            message: validation.message
          });
          return;
        }

        // Set profile image
        setProfileImage(selectedImage.uri);
        showAlert({
          type: 'success',
          title: 'Berhasil',
          message: 'Foto profil berhasil dipilih'
        });
      });
    } catch (error) {
      console.error('AdminProfileScreen: Error picking image:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memilih foto profil'
      });
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    if (!formData.fullName.trim()) {
      showAlert({
        type: 'warning',
        title: 'Peringatan',
        message: 'Nama lengkap harus diisi'
      });
      return false;
    }

    if (!formData.email.trim()) {
      showAlert({
        type: 'warning',
        title: 'Peringatan',
        message: 'Email harus diisi'
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showAlert({
        type: 'warning',
        title: 'Peringatan',
        message: 'Format email tidak valid'
      });
      return false;
    }

    // Validate password if changing
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        showAlert({
          type: 'warning',
          title: 'Peringatan',
          message: 'Password lama harus diisi untuk mengubah password'
        });
        return false;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        showAlert({
          type: 'warning',
          title: 'Peringatan',
          message: 'Konfirmasi password baru tidak cocok'
        });
        return false;
      }

      const passwordValidation = PasswordUtils.validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        showAlert({
          type: 'warning',
          title: 'Password Tidak Valid',
          message: passwordValidation.feedback.join('\n')
        });
        return false;
      }
    }

    return true;
  };

  /**
   * Handle save profile
   */
  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const updateData = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
      };

      // Handle password change
      if (formData.newPassword) {
        // Verify current password first
        const loginResult = await AuthService.loginAdmin(currentUser.email, formData.currentPassword);
        if (!loginResult.success) {
          showAlert({
            type: 'error',
            title: 'Error',
            message: 'Password lama tidak benar'
          });
          setLoading(false);
          return;
        }

        // Hash new password
        updateData.password = await PasswordUtils.hashPassword(formData.newPassword);
      }

      // Handle profile image update
      if (profileImage !== currentUser.profileImage) {
        console.log('AdminProfileScreen: Updating profile image:', profileImage ? 'New image selected' : 'Image removed');
        updateData.profile_image = profileImage;
      }

      // Update profile
      const result = await AuthService.updateProfile(updateData);

      if (result.success) {
        // Update current user data
        const updatedUser = {
          ...currentUser,
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          profileImage: profileImage,
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

        showAlert({
          type: 'success',
          title: 'Berhasil',
          message: 'Profil berhasil diperbarui'
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: result.message || 'Gagal memperbarui profil'
        });
      }
    } catch (error) {
      console.error('AdminProfileScreen: Error updating profile:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memperbarui profil'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle cancel edit
   */
  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      fullName: currentUser.fullName || '',
      email: currentUser.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setProfileImage(currentUser.profileImage);
  };

  /**
   * Generate random password
   */
  const generateRandomPassword = () => {
    const password = PasswordUtils.generateRandomPassword(12);
    setFormData({
      ...formData,
      newPassword: password,
      confirmPassword: password,
    });
    showAlert({
      type: 'info',
      title: 'Password Generated',
      message: `Password baru: ${password}\n\nSilakan catat password ini dengan aman.`
    });
  };

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat profil...</Text>
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
          <Icon name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Administrator</Text>
        {!editMode && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(true)}
          >
            <Icon name="edit" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Image Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={editMode ? handleImagePicker : null}
            disabled={!editMode}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <Icon name="account-circle" size={120} color={COLORS.primary} />
            )}
            {editMode && (
              <View style={styles.cameraIcon}>
                <Icon name="camera-alt" size={24} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.roleInfo}>
            <Text style={styles.roleBadge}>Administrator</Text>
            <Text style={styles.username}>@{currentUser.username}</Text>
          </View>
        </View>

        {/* System Info */}
        <View style={styles.systemInfoSection}>
          <Text style={styles.sectionTitle}>Informasi Sistem</Text>
          <View style={styles.infoRow}>
            <Icon name="business" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>KakaRama Room Management</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="security" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Akses Penuh Sistem</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="schedule" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>Login: {new Date(currentUser.loginTime).toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informasi Profil</Text>
          
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
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

          {editMode && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Keamanan</Text>
              
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
                <Text style={styles.label}>Password Baru</Text>
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

              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateRandomPassword}
              >
                <Icon name="auto-fix-high" size={20} color={COLORS.primary} />
                <Text style={styles.generateButtonText}>Generate Password Aman</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Action Buttons */}
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
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modern Alert Component */}
      <AlertComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  editButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGray,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  roleInfo: {
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: SIZES.small,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  username: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  systemInfoSection: {
    backgroundColor: COLORS.white,
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
  },
  formSection: {
    backgroundColor: COLORS.white,
    padding: 20,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: SIZES.medium,
    backgroundColor: COLORS.white,
  },
  inputDisabled: {
    backgroundColor: COLORS.lightGray,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
  },
  generateButtonText: {
    marginLeft: 8,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default AdminProfileScreen;
