import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import SMTPService from '../../services/SMTPService';

const AdminSMTPSettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [smtpConfig, setSMTPConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'KakaRama Room System',
  });
  const [reportConfig, setReportConfig] = useState({
    enabled: false,
    recipients: '',
    sendTime: '12:00',
    includeStats: true,
    includeCheckins: true,
    includeUnits: true,
  });
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadSMTPSettings();
  }, []);

  const loadSMTPSettings = async () => {
    try {
      setLoading(true);
      const result = await SMTPService.getSMTPSettings();
      if (result.success) {
        setSMTPConfig(result.data.smtp || smtpConfig);
        setReportConfig(result.data.report || reportConfig);
      }
    } catch (error) {
      console.error('Error loading SMTP settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSMTPSettings = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password || !smtpConfig.fromEmail) {
        Alert.alert('Error', 'Harap lengkapi semua field yang wajib diisi');
        return;
      }

      const result = await SMTPService.saveSMTPSettings({
        smtp: smtpConfig,
        report: reportConfig,
      });

      if (result.success) {
        Alert.alert('Berhasil', 'Pengaturan SMTP berhasil disimpan');
      } else {
        Alert.alert('Error', result.message || 'Gagal menyimpan pengaturan SMTP');
      }
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      Alert.alert('Error', 'Gagal menyimpan pengaturan SMTP');
    } finally {
      setLoading(false);
    }
  };

  const testSMTPConnection = async () => {
    try {
      if (!testEmail) {
        Alert.alert('Error', 'Masukkan email tujuan untuk test');
        return;
      }

      setTestingEmail(true);
      const result = await SMTPService.testSMTPConnection(smtpConfig, testEmail);

      if (result.success) {
        Alert.alert('Berhasil', 'Test email berhasil dikirim! Silakan cek inbox email tujuan.');
      } else {
        Alert.alert('Error', result.message || 'Gagal mengirim test email');
      }
    } catch (error) {
      console.error('Error testing SMTP:', error);
      Alert.alert('Error', 'Gagal melakukan test SMTP');
    } finally {
      setTestingEmail(false);
    }
  };

  const renderSMTPSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Konfigurasi SMTP</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>SMTP Host *</Text>
        <TextInput
          style={styles.input}
          value={smtpConfig.host}
          onChangeText={(text) => setSMTPConfig({ ...smtpConfig, host: text })}
          placeholder="smtp.gmail.com"
          placeholderTextColor={COLORS.gray400}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>SMTP Port *</Text>
        <TextInput
          style={styles.input}
          value={smtpConfig.port}
          onChangeText={(text) => setSMTPConfig({ ...smtpConfig, port: text })}
          placeholder="587"
          placeholderTextColor={COLORS.gray400}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.inputLabel}>Secure Connection (SSL/TLS)</Text>
          <Switch
            value={smtpConfig.secure}
            onValueChange={(value) => setSMTPConfig({ ...smtpConfig, secure: value })}
            trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
            thumbColor={smtpConfig.secure ? COLORS.background : COLORS.gray400}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Username/Email *</Text>
        <TextInput
          style={styles.input}
          value={smtpConfig.username}
          onChangeText={(text) => setSMTPConfig({ ...smtpConfig, username: text })}
          placeholder="your-email@gmail.com"
          placeholderTextColor={COLORS.gray400}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password/App Password *</Text>
        <TextInput
          style={styles.input}
          value={smtpConfig.password}
          onChangeText={(text) => setSMTPConfig({ ...smtpConfig, password: text })}
          placeholder="App password atau password email"
          placeholderTextColor={COLORS.gray400}
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>From Email *</Text>
        <TextInput
          style={styles.input}
          value={smtpConfig.fromEmail}
          onChangeText={(text) => setSMTPConfig({ ...smtpConfig, fromEmail: text })}
          placeholder="noreply@kakaramaroom.com"
          placeholderTextColor={COLORS.gray400}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>From Name</Text>
        <TextInput
          style={styles.input}
          value={smtpConfig.fromName}
          onChangeText={(text) => setSMTPConfig({ ...smtpConfig, fromName: text })}
          placeholder="KakaRama Room System"
          placeholderTextColor={COLORS.gray400}
        />
      </View>
    </View>
  );

  const renderTestSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Test SMTP</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Tujuan Test</Text>
        <TextInput
          style={styles.input}
          value={testEmail}
          onChangeText={setTestEmail}
          placeholder="test@example.com"
          placeholderTextColor={COLORS.gray400}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.testButton, testingEmail && styles.buttonDisabled]}
        onPress={testSMTPConnection}
        disabled={testingEmail}
      >
        {testingEmail ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <>
            <Icon name="send" size={20} color={COLORS.background} />
            <Text style={styles.buttonText}>Kirim Test Email</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderReportSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Laporan Harian Otomatis</Text>
      
      <View style={styles.inputGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.inputLabel}>Aktifkan Laporan Harian</Text>
          <Switch
            value={reportConfig.enabled}
            onValueChange={(value) => setReportConfig({ ...reportConfig, enabled: value })}
            trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
            thumbColor={reportConfig.enabled ? COLORS.background : COLORS.gray400}
          />
        </View>
      </View>

      {reportConfig.enabled && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Penerima (pisahkan dengan koma)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reportConfig.recipients}
              onChangeText={(text) => setReportConfig({ ...reportConfig, recipients: text })}
              placeholder="admin@kakaramaroom.com, manager@kakaramaroom.com"
              placeholderTextColor={COLORS.gray400}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Waktu Pengiriman</Text>
            <TextInput
              style={styles.input}
              value={reportConfig.sendTime}
              onChangeText={(text) => setReportConfig({ ...reportConfig, sendTime: text })}
              placeholder="12:00"
              placeholderTextColor={COLORS.gray400}
            />
            <Text style={styles.helpText}>Format: HH:MM (24 jam)</Text>
          </View>

          <View style={styles.checkboxGroup}>
            <Text style={styles.inputLabel}>Konten Laporan</Text>
            
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setReportConfig({ ...reportConfig, includeStats: !reportConfig.includeStats })}
            >
              <Icon
                name={reportConfig.includeStats ? "check-box" : "check-box-outline-blank"}
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.checkboxText}>Statistik Harian</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setReportConfig({ ...reportConfig, includeCheckins: !reportConfig.includeCheckins })}
            >
              <Icon
                name={reportConfig.includeCheckins ? "check-box" : "check-box-outline-blank"}
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.checkboxText}>Daftar Check-in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setReportConfig({ ...reportConfig, includeUnits: !reportConfig.includeUnits })}
            >
              <Icon
                name={reportConfig.includeUnits ? "check-box" : "check-box-outline-blank"}
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.checkboxText}>Status Unit</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={COLORS.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan SMTP</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSMTPSection()}
        {renderTestSection()}
        {renderReportSection()}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={saveSMTPSettings}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Icon name="save" size={20} color={COLORS.background} />
              <Text style={styles.buttonText}>Simpan Pengaturan</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    paddingTop: SIZES.xl,
  },
  backButton: {
    padding: SIZES.sm,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: SIZES.md,
  },
  section: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  checkboxGroup: {
    marginTop: SIZES.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  checkboxText: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  testButton: {
    backgroundColor: COLORS.info,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    gap: SIZES.sm,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.xl,
    gap: SIZES.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
});

export default AdminSMTPSettingsScreen;
