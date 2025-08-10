import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, APP_INFO } from '../../config/constants';
import AuthService from '../../services/AuthService';

const AppSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    autoSync: true,
    debugMode: false,
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadSettings();
    loadCurrentUser();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = AuthService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Gagal menyimpan pengaturan');
    }
  };

  const toggleSetting = (key) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    saveSettings(newSettings);
  };

  const clearCache = () => {
    Alert.alert(
      'Hapus Cache',
      'Apakah Anda yakin ingin menghapus cache aplikasi? Ini akan menghapus data sementara dan mungkin memperlambat aplikasi sementara.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear specific cache keys, but keep user session and settings
              const keysToKeep = ['user_session', 'current_user', 'app_settings', 'api_config'];
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
              
              if (keysToRemove.length > 0) {
                await AsyncStorage.multiRemove(keysToRemove);
              }
              
              Alert.alert('Berhasil', 'Cache berhasil dihapus');
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus cache');
            }
          },
        },
      ]
    );
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Pengaturan',
      'Apakah Anda yakin ingin mereset semua pengaturan ke default?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              darkMode: false,
              notifications: true,
              autoSync: true,
              debugMode: false,
            };
            saveSettings(defaultSettings);
            Alert.alert('Berhasil', 'Pengaturan berhasil direset');
          },
        },
      ]
    );
  };

  const showAboutApp = () => {
    Alert.alert(
      `Tentang ${APP_INFO.name}`,
      `${APP_INFO.description}\n\nVersi: ${APP_INFO.version}\nBuild: ${APP_INFO.buildNumber}\nDeveloper: ${APP_INFO.developer}`,
      [{ text: 'OK' }]
    );
  };

  const showChangelog = () => {
    const changelogText = APP_INFO.changelog
      .map(version => {
        const changes = version.changes.map(change => `• ${change}`).join('\n');
        return `${version.version} (${version.date})\n${changes}`;
      })
      .join('\n\n');

    Alert.alert(
      'Changelog',
      changelogText,
      [{ text: 'OK' }],
      { scrollable: true }
    );
  };

  const showFeatures = () => {
    const featuresText = APP_INFO.features.map(feature => `• ${feature}`).join('\n');
    Alert.alert(
      'Fitur Aplikasi',
      featuresText,
      [{ text: 'OK' }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Bantuan & Kontak Admin',
      'Pilih kontak admin untuk bantuan:',
      [
        {
          text: 'Admin KR 1',
          onPress: () => openWhatsApp('081383138882', 'Admin KR 1'),
        },
        {
          text: 'Admin KR 2',
          onPress: () => openWhatsApp('089613413636', 'Admin KR 2'),
        },
        {
          text: 'Batal',
          style: 'cancel',
        },
      ]
    );
  };

  const openWhatsApp = async (phoneNumber, adminName) => {
    try {
      const message = encodeURIComponent(`Halo ${adminName}, saya membutuhkan bantuan terkait aplikasi KakaRama Room.`);
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
      const webUrl = `https://wa.me/${phoneNumber}?text=${message}`;

      // Try to open WhatsApp app first
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);

      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Error',
        'Tidak dapat membuka WhatsApp. Pastikan WhatsApp terinstall atau coba hubungi admin melalui cara lain.',
        [{ text: 'OK' }]
      );
    }
  };

  const showAbout = () => {
    Alert.alert(
      'Tentang Aplikasi',
      `KakaRama Room\nVersi: ${APP_INFO.version}\n\nSistem manajemen checkin apartemen yang terintegrasi dengan bot WhatsApp.\n\nDikembangkan untuk KakaRama Room Management.`,
      [{ text: 'OK' }]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar dari aplikasi?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('AppSettingsScreen: Starting logout process');

              // Show loading state
              setLoading(true);

              // Perform logout with timeout
              const logoutPromise = AuthService.logout();
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Logout timeout')), 10000)
              );

              const result = await Promise.race([logoutPromise, timeoutPromise]);

              console.log('AppSettingsScreen: Logout result:', result);

              if (result && result.success) {
                console.log('AppSettingsScreen: Logout successful, navigating to login');

                // Small delay to prevent flicker
                setTimeout(() => {
                  // Reset navigation stack to login screen
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }, 100);
              } else {
                console.error('AppSettingsScreen: Logout failed:', result);
                Alert.alert('Error', 'Gagal logout. Silakan coba lagi.');
              }
            } catch (error) {
              console.error('AppSettingsScreen: Logout error:', error);

              // Force logout even if there's an error
              console.log('AppSettingsScreen: Force logout due to error');
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }, 100);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, value, onToggle, onPress, showSwitch = false, showChevron = false, isDestructive = false }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingIcon}>
        <Icon name={icon} size={24} color={isDestructive ? COLORS.error : COLORS.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDestructive && { color: COLORS.error }]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showSwitch && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
          thumbColor={value ? COLORS.background : COLORS.gray400}
        />
      )}
      {showChevron && (
        <Icon name="chevron-right" size={24} color={COLORS.gray400} />
      )}
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
          <Icon name="arrow-back" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        {currentUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informasi Pengguna</Text>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => navigation.navigate('ProfileManagement')}
            >
              <Icon name="account-circle" size={48} color={COLORS.PRIMARY} />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{currentUser.fullName}</Text>
                <Text style={styles.userRole}>
                  {currentUser.role === 'admin' ? 'Administrator' : 'Tim Lapangan'}
                </Text>
                <Text style={styles.userContact}>{currentUser.phone || currentUser.email}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>
        )}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pengaturan Aplikasi</Text>
          
          <SettingItem
            icon="dark-mode"
            title="Mode Gelap"
            subtitle="Gunakan tema gelap untuk aplikasi"
            value={settings.darkMode}
            onToggle={() => toggleSetting('darkMode')}
            showSwitch={true}
          />
          
          <SettingItem
            icon="notifications"
            title="Notifikasi"
            subtitle="Terima notifikasi dari aplikasi"
            value={settings.notifications}
            onToggle={() => toggleSetting('notifications')}
            showSwitch={true}
          />
          

          
          {currentUser?.role === 'admin' && (
            <SettingItem
              icon="bug-report"
              title="Mode Debug"
              subtitle="Tampilkan informasi debug (Admin only)"
              value={settings.debugMode}
              onToggle={() => toggleSetting('debugMode')}
              showSwitch={true}
            />
          )}
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Penyimpanan</Text>



          <SettingItem
            icon="clear"
            title="Hapus Cache"
            subtitle="Hapus data sementara aplikasi"
            onPress={clearCache}
            showChevron={true}
          />

          <SettingItem
            icon="restore"
            title="Reset Pengaturan"
            subtitle="Kembalikan pengaturan ke default"
            onPress={resetSettings}
            showChevron={true}
          />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Akun</Text>

          <SettingItem
            icon="logout"
            title="Keluar"
            subtitle="Logout dari aplikasi"
            onPress={handleLogout}
            showChevron={true}
            isDestructive={true}
          />
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tentang</Text>
          
          <SettingItem
            icon="info"
            title="Tentang Aplikasi"
            subtitle={`Versi ${APP_INFO.version} - ${APP_INFO.developer}`}
            onPress={showAboutApp}
            showChevron={true}
          />

          <SettingItem
            icon="update"
            title="Changelog"
            subtitle="Riwayat perubahan aplikasi"
            onPress={showChangelog}
            showChevron={true}
          />

          <SettingItem
            icon="star"
            title="Fitur Aplikasi"
            subtitle="Daftar fitur yang tersedia"
            onPress={showFeatures}
            showChevron={true}
          />

          <SettingItem
            icon="help"
            title="Bantuan"
            subtitle="Kontak admin dan panduan aplikasi"
            onPress={handleHelp}
            showChevron={true}
          />
        </View>

        {/* Debug Info (if debug mode enabled) */}
        {settings.debugMode && currentUser?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Information</Text>
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>User ID: {currentUser.id}</Text>
              <Text style={styles.debugText}>Role: {currentUser.role}</Text>
              <Text style={styles.debugText}>Login Time: {currentUser.loginTime}</Text>
              <Text style={styles.debugText}>App Version: {APP_INFO.version}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
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
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.background,
    marginVertical: 5,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: SIZES.caption,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginHorizontal: 15,
    textTransform: 'uppercase',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userRole: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginTop: 2,
  },
  userContact: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 10,
  },
  settingTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingSubtitle: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  debugInfo: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.gray100,
    marginHorizontal: 15,
    borderRadius: 8,
  },
  debugText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default AppSettingsScreen;
