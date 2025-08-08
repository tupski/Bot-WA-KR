import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
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
      const user = await AuthService.getCurrentUser();
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

  const showAbout = () => {
    Alert.alert(
      'Tentang Aplikasi',
      `KakaRama Room\nVersi: ${APP_INFO.version}\n\nSistem manajemen checkin apartemen yang terintegrasi dengan bot WhatsApp.\n\nDikembangkan untuk KakaRama Room Management.`,
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({ icon, title, subtitle, value, onToggle, onPress, showSwitch = false, showChevron = false }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingIcon}>
        <Icon name={icon} size={24} color={COLORS.PRIMARY} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showSwitch && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.LIGHT_GRAY, true: COLORS.PRIMARY }}
          thumbColor={value ? COLORS.WHITE : COLORS.TEXT_SECONDARY}
        />
      )}
      {showChevron && (
        <Icon name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
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
          
          <SettingItem
            icon="sync"
            title="Sinkronisasi Otomatis"
            subtitle="Sinkronkan data secara otomatis"
            value={settings.autoSync}
            onToggle={() => toggleSetting('autoSync')}
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
            icon="history"
            title="Log Aktivitas"
            subtitle="Lihat riwayat aktivitas pengguna"
            onPress={() => navigation.navigate('ActivityLog')}
            showChevron={true}
          />

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

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tentang</Text>
          
          <SettingItem
            icon="info"
            title="Tentang Aplikasi"
            subtitle={`Versi ${APP_INFO.version}`}
            onPress={showAbout}
            showChevron={true}
          />
          
          <SettingItem
            icon="help"
            title="Bantuan"
            subtitle="Panduan penggunaan aplikasi"
            onPress={() => Alert.alert('Bantuan', 'Fitur bantuan akan segera tersedia')}
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
    fontSize: SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.WHITE,
    marginVertical: 5,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: SIZES.SMALL,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
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
    fontSize: SIZES.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  userRole: {
    fontSize: SIZES.SMALL,
    color: COLORS.PRIMARY,
    marginTop: 2,
  },
  userContact: {
    fontSize: SIZES.EXTRA_SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
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
    fontSize: SIZES.SMALL,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  settingSubtitle: {
    fontSize: SIZES.EXTRA_SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  debugInfo: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.LIGHT_GRAY,
    marginHorizontal: 15,
    borderRadius: 8,
  },
  debugText: {
    fontSize: SIZES.EXTRA_SMALL,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default AppSettingsScreen;
