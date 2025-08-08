import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import NotificationService from '../../services/NotificationService';
import { useModernAlert } from '../../components/ModernAlert';

const AdminBroadcastScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetUserType: 'all',
  });
  const [loading, setLoading] = useState(false);
  const { showAlert, AlertComponent } = useModernAlert();

  const targetOptions = [
    { value: 'all', label: 'Semua Pengguna', icon: 'people' },
    { value: 'field_team', label: 'Tim Lapangan', icon: 'engineering' },
    { value: 'admin', label: 'Admin', icon: 'admin-panel-settings' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showAlert({
        type: 'warning',
        title: 'Peringatan',
        message: 'Judul notifikasi harus diisi',
      });
      return false;
    }

    if (!formData.message.trim()) {
      showAlert({
        type: 'warning',
        title: 'Peringatan',
        message: 'Pesan notifikasi harus diisi',
      });
      return false;
    }

    if (formData.title.length > 100) {
      showAlert({
        type: 'warning',
        title: 'Peringatan',
        message: 'Judul tidak boleh lebih dari 100 karakter',
      });
      return false;
    }

    if (formData.message.length > 500) {
      showAlert({
        type: 'warning',
        title: 'Peringatan',
        message: 'Pesan tidak boleh lebih dari 500 karakter',
      });
      return false;
    }

    return true;
  };

  const handleSendBroadcast = async () => {
    if (!validateForm()) return;

    showAlert({
      type: 'confirm',
      title: 'Konfirmasi Kirim',
      message: `Apakah Anda yakin ingin mengirim notifikasi ke ${
        targetOptions.find(opt => opt.value === formData.targetUserType)?.label
      }?`,
      buttons: [
        {
          text: 'Batal',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Kirim',
          style: 'primary',
          onPress: sendBroadcast,
        },
      ],
    });
  };

  const sendBroadcast = async () => {
    try {
      setLoading(true);

      const result = await NotificationService.sendBroadcastNotification(
        formData.title.trim(),
        formData.message.trim(),
        formData.targetUserType
      );

      if (result.success) {
        showAlert({
          type: 'success',
          title: 'Berhasil',
          message: 'Notifikasi broadcast berhasil dikirim',
          onDismiss: () => {
            // Reset form
            setFormData({
              title: '',
              message: '',
              targetUserType: 'all',
            });
            navigation.goBack();
          },
        });
      } else {
        showAlert({
          type: 'error',
          title: 'Gagal',
          message: result.message || 'Gagal mengirim notifikasi broadcast',
        });
      }
    } catch (error) {
      console.error('AdminBroadcastScreen: Error sending broadcast:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat mengirim notifikasi',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderTargetOption = (option) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.targetOption,
        formData.targetUserType === option.value && styles.selectedTargetOption,
      ]}
      onPress={() => handleInputChange('targetUserType', option.value)}
      activeOpacity={0.7}
    >
      <Icon
        name={option.icon}
        size={24}
        color={
          formData.targetUserType === option.value
            ? COLORS.white
            : COLORS.primary
        }
      />
      <Text
        style={[
          styles.targetOptionText,
          formData.targetUserType === option.value && styles.selectedTargetOptionText,
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kirim Notifikasi</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Target Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Penerima</Text>
          <View style={styles.targetContainer}>
            {targetOptions.map(renderTargetOption)}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Judul Notifikasi
            <Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.titleInput}
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            placeholder="Masukkan judul notifikasi..."
            placeholderTextColor={COLORS.gray400}
            maxLength={100}
          />
          <Text style={styles.characterCount}>
            {formData.title.length}/100 karakter
          </Text>
        </View>

        {/* Message Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pesan Notifikasi
            <Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            style={styles.messageInput}
            value={formData.message}
            onChangeText={(value) => handleInputChange('message', value)}
            placeholder="Masukkan pesan notifikasi..."
            placeholderTextColor={COLORS.gray400}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {formData.message.length}/500 karakter
          </Text>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview Notifikasi</Text>
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Icon name="notifications" size={20} color={COLORS.primary} />
              <Text style={styles.previewTitle}>
                {formData.title || 'Judul Notifikasi'}
              </Text>
            </View>
            <Text style={styles.previewMessage}>
              {formData.message || 'Pesan notifikasi akan muncul di sini...'}
            </Text>
            <Text style={styles.previewTime}>Baru saja</Text>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!formData.title.trim() || !formData.message.trim() || loading) &&
              styles.disabledButton,
          ]}
          onPress={handleSendBroadcast}
          disabled={!formData.title.trim() || !formData.message.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Icon name="send" size={20} color={COLORS.white} />
              <Text style={styles.sendButtonText}>Kirim Notifikasi</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <AlertComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: SIZES.md,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  required: {
    color: COLORS.error,
  },
  targetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  targetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  selectedTargetOption: {
    backgroundColor: COLORS.primary,
  },
  targetOptionText: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '500',
  },
  selectedTargetOptionText: {
    color: COLORS.white,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    minHeight: 120,
  },
  characterCount: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SIZES.xs,
  },
  previewContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  previewTitle: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: SIZES.xs,
  },
  previewMessage: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.xs,
  },
  previewTime: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  disabledButton: {
    backgroundColor: COLORS.gray400,
  },
  sendButtonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: SIZES.xs,
  },
});

export default AdminBroadcastScreen;
