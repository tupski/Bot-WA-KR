import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import DatabaseManager from '../config/supabase'; // Updated to use Supabase
import { COLORS, SIZES, USER_ROLES } from '../config/constants';
import RealtimeService from '../services/RealtimeService';

// Import package.json untuk mendapatkan versi app
const packageJson = require('../../package.json');

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState(USER_ROLES.FIELD_TEAM); // Default ke Tim Lapangan
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await DatabaseManager.initDatabase();

      // Initialize real-time sync
      await RealtimeService.initialize();

      // Check if user is already logged in
      const currentUser = await AuthService.loadUserFromStorage();
      if (currentUser) {
        navigateToHome(currentUser);
        return;
      }
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('Error', 'Gagal menginisialisasi aplikasi');
    } finally {
      setInitializing(false);
    }
  };

  const navigateToHome = (user) => {
    console.log('Navigating to home for user role:', user.role);
    if (user.role === USER_ROLES.ADMIN) {
      console.log('Navigating to AdminTabs');
      navigation.replace('AdminTabs');
    } else {
      console.log('Navigating to FieldTabs');
      navigation.replace('FieldTabs');
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', `Email dan password harus diisi`);
      return;
    }

    setLoading(true);
    console.log('=== LOGIN DEBUG START ===');

    try {
      console.log('Attempting login:', { username: username.trim(), userType });
      console.log('USER_ROLES:', USER_ROLES);

      let result;
      if (userType === USER_ROLES.ADMIN) {
        console.log('Logging in as admin...');
        result = await AuthService.loginAdmin(username.trim(), password);
      } else {
        console.log('Logging in as field team...');
        result = await AuthService.loginFieldTeam(username.trim(), password);
      }

      console.log('Login result:', JSON.stringify(result, null, 2));

      if (result && result.success) {
        console.log('Login successful, user data:', JSON.stringify(result.user, null, 2));

        // Navigate immediately without alert
        console.log('Navigating to home...');
        navigateToHome(result.user);
      } else {
        const errorMessage = result?.message || 'Login gagal tanpa pesan error';
        console.log('Login failed:', errorMessage);
        Alert.alert('Login Gagal', errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', `Terjadi kesalahan saat login: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('=== LOGIN DEBUG END ===');
    }
  };

  const switchUserType = (type) => {
    setUserType(type);
    setUsername('');
    setPassword('');
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/images/logo-placeholder.png')} // Placeholder logo
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingIndicator} />
        <Text style={styles.loadingText}>Memulai aplikasi...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo-placeholder.png')} // Placeholder logo
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Kakarama Room</Text>
          <Text style={styles.subtitle}>Sistem Manajemen Checkin</Text>
        </View>

        <View style={styles.form}>
          {/* User Type Selector */}
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === USER_ROLES.ADMIN && styles.userTypeButtonActive,
              ]}
              onPress={() => switchUserType(USER_ROLES.ADMIN)}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === USER_ROLES.ADMIN && styles.userTypeTextActive,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === USER_ROLES.FIELD_TEAM && styles.userTypeButtonActive,
              ]}
              onPress={() => switchUserType(USER_ROLES.FIELD_TEAM)}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === USER_ROLES.FIELD_TEAM && styles.userTypeTextActive,
                ]}
              >
                Tim Lapangan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Masukkan email"
              placeholderTextColor={COLORS.gray400}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current && passwordRef.current.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password"
                placeholderTextColor={COLORS.gray400}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                style={{ position: 'absolute', right: 12, top: 12 }}
                accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                <Text style={{ color: COLORS.gray500 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Informasi login dihapus untuk keamanan */}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hak Cipta © 2025 - Kakarama Room</Text>
          <Text style={styles.footerText}>www.kakaramaroom.com</Text>
          <Text style={styles.footerText}>App Version {packageJson.version}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SIZES.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  form: {
    marginBottom: SIZES.xl,
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginBottom: SIZES.lg,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray100,
    padding: SIZES.xs,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    borderRadius: SIZES.radius,
  },
  userTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  userTypeText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  userTypeTextActive: {
    color: COLORS.background,
  },
  inputContainer: {
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
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    marginTop: SIZES.md,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: SIZES.h6,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginTop: SIZES.lg,
    padding: SIZES.md,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius,
  },
  infoTitle: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  infoText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  loadingIndicator: {
    marginVertical: SIZES.md,
  },
  loadingText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
});

export default LoginScreen;
