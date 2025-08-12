/**
 * Modern Input Component untuk KakaRama Room
 * Dengan validation, icons, dan berbagai variant
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input as RNEInput } from 'react-native-elements';
import { TextInput as PaperInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  variant = 'outlined', // outlined, filled, underlined
  type = 'default', // default, email, password, phone, number
  leftIcon,
  rightIcon,
  onRightIconPress,
  error,
  helperText,
  required = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  containerStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get keyboard type based on input type
  const getKeyboardType = () => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      case 'number':
        return 'numeric';
      default:
        return 'default';
    }
  };

  // Get secure text entry for password
  const getSecureTextEntry = () => {
    return type === 'password' && !showPassword;
  };

  // Handle password visibility toggle
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Get right icon for password field
  const getRightIcon = () => {
    if (type === 'password') {
      return (
        <Icon
          name={showPassword ? 'visibility-off' : 'visibility'}
          size={24}
          color={COLORS.textSecondary}
          onPress={togglePasswordVisibility}
        />
      );
    }
    if (rightIcon) {
      return (
        <Icon
          name={rightIcon}
          size={24}
          color={COLORS.textSecondary}
          onPress={onRightIconPress}
        />
      );
    }
    return null;
  };

  // Render using React Native Paper for modern look
  if (variant === 'paper') {
    return (
      <View style={[styles.container, containerStyle]}>
        <PaperInput
          label={label + (required ? ' *' : '')}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          mode={variant === 'filled' ? 'flat' : 'outlined'}
          keyboardType={getKeyboardType()}
          secureTextEntry={getSecureTextEntry()}
          disabled={disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          error={!!error}
          left={leftIcon ? <PaperInput.Icon icon={leftIcon} /> : undefined}
          right={getRightIcon() ? <PaperInput.Icon icon={() => getRightIcon()} /> : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.paperInput, style]}
          contentStyle={inputStyle}
          theme={{
            colors: {
              primary: COLORS.primary,
              error: COLORS.error,
            },
          }}
          {...props}
        />
        {(error || helperText) && (
          <Text style={[styles.helperText, error && styles.errorText]}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }

  // Render using React Native Elements
  return (
    <View style={[styles.container, containerStyle]}>
      <RNEInput
        label={label + (required ? ' *' : '')}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={getKeyboardType()}
        secureTextEntry={getSecureTextEntry()}
        editable={!disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        leftIcon={leftIcon ? <Icon name={leftIcon} size={20} color={COLORS.textSecondary} /> : undefined}
        rightIcon={getRightIcon()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        errorMessage={error}
        containerStyle={styles.inputContainer}
        inputContainerStyle={[
          styles.inputContainerStyle,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        inputStyle={[styles.inputStyle, inputStyle]}
        labelStyle={[styles.labelStyle, error && styles.labelError]}
        errorStyle={styles.errorStyle}
        {...props}
      />
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

// Preset input variants
export const EmailInput = (props) => (
  <Input
    type="email"
    leftIcon="email"
    placeholder="Masukkan email"
    {...props}
  />
);

export const PasswordInput = (props) => (
  <Input
    type="password"
    leftIcon="lock"
    placeholder="Masukkan password"
    {...props}
  />
);

export const PhoneInput = (props) => (
  <Input
    type="phone"
    leftIcon="phone"
    placeholder="Masukkan nomor telepon"
    {...props}
  />
);

export const SearchInput = (props) => (
  <Input
    leftIcon="search"
    placeholder="Cari..."
    variant="paper"
    {...props}
  />
);

export const NumberInput = (props) => (
  <Input
    type="number"
    leftIcon="pin"
    placeholder="Masukkan angka"
    {...props}
  />
);

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  inputContainer: {
    paddingHorizontal: 0,
  },
  inputContainerStyle: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceDark,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: COLORS.error,
  },
  inputContainerDisabled: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.textLight,
  },
  inputStyle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },
  labelStyle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.xs,
  },
  labelError: {
    color: COLORS.error,
  },
  errorStyle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  helperText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
  },
  paperInput: {
    backgroundColor: COLORS.white,
  },
});

export default Input;
