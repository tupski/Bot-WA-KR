import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, APP_INFO } from '../../config/constants';
import AuthService from '../../services/AuthService';
import { useModernAlert } from '../../components/ModernAlert';

const AppSettingsScreen = ({ navigation }) => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    autoSync: true,
    debugMode: false,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

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
    showAlert({
      type: 'confirm',
      title: 'Reset Pengaturan',
      message: 'Apakah Anda yakin ingin mereset semua pengaturan ke default?',
      buttons: [
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
            showAlert({
              type: 'success',
              title: 'Berhasil',
              message: 'Pengaturan berhasil direset'
            });
          },
        },
      ]
    });
  };

  const showAboutApp = () => {
    try {
      showAlert({
        type: 'info',
        title: `Tentang ${APP_INFO.name}`,
        message: `${APP_INFO.description}\n\nVersi: ${APP_INFO.version}\nBuild: ${APP_INFO.buildNumber}\nDeveloper: ${APP_INFO.developer}`
      });
    } catch (error) {
      console.error('Error showing about app:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal menampilkan informasi aplikasi'
      });
    }
  };

  const showChangelog = () => {
    try {
      const changelogText = APP_INFO.changelog
        .map(version => {
          const changes = version.changes.map(change => `• ${change}`).join('\n');
          return `${version.version} (${version.date})\n${changes}`;
        })
        .join('\n\n');

      showAlert({
        type: 'info',
        title: 'Changelog',
        message: changelogText
      });
    } catch (error) {
      console.error('Error showing changelog:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal menampilkan changelog'
      });
    }
  };

  const showFeatures = () => {
    try {
      const featuresText = APP_INFO.features.map(feature => `• ${feature}`).join('\n');
      showAlert({
        type: 'info',
        title: 'Fitur Aplikasi',
        message: featuresText
      });
    } catch (error) {
      console.error('Error showing features:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal menampilkan daftar fitur'
      });
    }
  };

  const handleHelp = () => {
    showAlert({
      type: 'info',
      title: 'Bantuan & Kontak Admin',
      message: 'Pilih kontak admin untuk bantuan:',
      buttons: [
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
    });
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



  const handleLogout = async () => {
    showAlert({
      type: 'confirm',
      title: 'Konfirmasi Logout',
      message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      buttons: [
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

              // Check if navigation is available
              if (!navigation || !navigation.reset) {
                console.error('AppSettingsScreen: Navigation not available');
                showAlert({
                  type: 'error',
                  title: 'Error',
                  message: 'Navigasi tidak tersedia'
                });
                return;
              }

              // Perform logout immediately without loading state to prevent flicker
              console.log('AppSettingsScreen: Calling AuthService.logout');
              const result = await AuthService.logout();

              console.log('AppSettingsScreen: Logout result:', result);

              // Always navigate to login regardless of result to prevent flicker
              console.log('AppSettingsScreen: Navigating to login');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              console.log('AppSettingsScreen: Navigation reset successful');

            } catch (error) {
              console.error('AppSettingsScreen: Logout error:', error);

              // Force logout even if there's an error
              console.log('AppSettingsScreen: Force logout due to error');
              try {
                if (navigation && navigation.reset) {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                  console.log('AppSettingsScreen: Force navigation reset successful');
                } else {
                  console.error('AppSettingsScreen: Cannot force logout - navigation not available');
                  showAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'Tidak dapat logout - silakan restart aplikasi'
                  });
                }
              } catch (forceNavError) {
                console.error('AppSettingsScreen: Force navigation error:', forceNavError);
                showAlert({
                  type: 'error',
                  title: 'Error',
                  message: 'Tidak dapat logout - silakan restart aplikasi'
                });
              }
            }
          },
        },
      ]
    });
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
          <Icon name="arrow-back" size={24} color={COLORS.white} />
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
              onPress={() => {
                if (currentUser.role === 'admin') {
                  navigation.navigate('AdminProfile');
                } else {
                  navigation.navigate('FieldProfile');
                }
              }}
            >
              <Icon name="account-circle" size={48} color={COLORS.primary} />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{currentUser.fullName}</Text>
                <Text style={styles.userRole}>
                  {currentUser.role === 'admin' ? 'Administrator' : 'Tim Lapangan'}
                </Text>
                <Text style={styles.userContact}>{currentUser.phone || currentUser.email}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil & Akun</Text>

          <SettingItem
            icon="person"
            title="Profil Saya"
            subtitle="Kelola informasi profil dan password"
            onPress={() => {
              if (currentUser.role === 'admin') {
                navigation.navigate('AdminProfile');
              } else {
                navigation.navigate('FieldProfile');
              }
            }}
            showChevron={true}
          />
        </View>

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
