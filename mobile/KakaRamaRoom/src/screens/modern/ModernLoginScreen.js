/**
 * Modern Login Screen untuk KakaRama Room
 * Dengan UI yang lebih modern dan user-friendly
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import * as Animatable from 'react-native-animatable';

// Import UI Components
import Input, { EmailInput, PasswordInput } from '../../components/ui/Input';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { InfoCard } from '../../components/ui/Card';
import { FullScreenLoading } from '../../components/ui/Loading';
import { AlertModal } from '../../components/ui/Modal';

// Import Theme & Constants
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../config/theme';
import { APP_CONFIG } from '../../config/constants';

// Import Services
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const ModernLoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [userType, setUserType] = useState('admin'); // admin, field
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username harus diisi';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password harus diisi';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await login(formData, userType);
      
      if (result.success) {
        // Navigation akan dihandle oleh AuthContext
        console.log('Login berhasil:', result.user);
      } else {
        setAlertConfig({
          type: 'error',
          title: 'Login Gagal',
          message: result.message || 'Username atau password salah',
        });
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat login. Silakan coba lagi.',
      });
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle user type change
  const handleUserTypeChange = (type) => {
    setUserType(type);
    setFormData({ username: '', password: '' });
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <Animatable.View
            animation="fadeInDown"
            duration={800}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>KR</Text>
              </View>
            </View>
            <Text style={styles.appName}>{APP_CONFIG.name}</Text>
            <Text style={styles.appSubtitle}>Sistem Manajemen Apartemen</Text>
          </Animatable.View>

          {/* Login Form */}
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            delay={200}
            style={styles.formContainer}
          >
            {/* User Type Selector */}
            <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeLabel}>Masuk sebagai:</Text>
              <View style={styles.userTypeButtons}>
                <SecondaryButton
                  title="Admin"
                  onPress={() => handleUserTypeChange('admin')}
                  variant={userType === 'admin' ? 'primary' : 'outline'}
                  style={styles.userTypeButton}
                />
                <SecondaryButton
                  title="Tim Lapangan"
                  onPress={() => handleUserTypeChange('field')}
                  variant={userType === 'field' ? 'primary' : 'outline'}
                  style={styles.userTypeButton}
                />
              </View>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              <Input
                label="Username"
                placeholder="Masukkan username"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                leftIcon="person"
                error={errors.username}
                required
                variant="paper"
              />

              <PasswordInput
                label="Password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                error={errors.password}
                required
                variant="paper"
              />

              <PrimaryButton
                title="Masuk"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                fullWidth
                size="large"
                style={styles.loginButton}
              />
            </View>

            {/* Info Card */}
            <InfoCard
              type="info"
              title="Demo Login"
              message={`Username: ${userType === 'admin' ? 'admin' : 'field1'}\nPassword: ${userType === 'admin' ? 'admin123' : 'field123'}`}
            />
          </Animatable.View>
        </ScrollView>
      </LinearGradient>

      {/* Loading Modal */}
      <FullScreenLoading
        visible={loading}
        text="Sedang masuk..."
      />

      {/* Alert Modal */}
      <AlertModal
        visible={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  appSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.white + 'CC',
    textAlign: 'center',
  },
  
  // Form
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  userTypeContainer: {
    marginBottom: SPACING.lg,
  },
  userTypeLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  userTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userTypeButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  form: {
    marginBottom: SPACING.lg,
  },
  loginButton: {
    marginTop: SPACING.lg,
  },
});

export default ModernLoginScreen;
