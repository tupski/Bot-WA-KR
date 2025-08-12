/**
 * Custom Button Component untuk KakaRama Room
 * Menggunakan React Native Elements dengan custom styling
 */

import React from 'react';
import { Button as RNEButton } from 'react-native-elements';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../config/theme';

const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'medium', // small, medium, large
  icon,
  iconPosition = 'left', // left, right
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  titleStyle,
  ...props
}) => {
  // Get button styles based on variant
  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: RADIUS.md,
      paddingVertical: size === 'small' ? SPACING.sm : size === 'large' ? SPACING.lg : SPACING.md,
      paddingHorizontal: size === 'small' ? SPACING.md : size === 'large' ? SPACING.xl : SPACING.lg,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? COLORS.surfaceDark : COLORS.primary,
          ...SHADOWS.small,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? COLORS.surfaceDark : COLORS.secondary,
          ...SHADOWS.small,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: disabled ? COLORS.surfaceDark : COLORS.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };

  // Get title styles based on variant
  const getTitleStyle = () => {
    const baseStyle = {
      fontSize: size === 'small' ? TYPOGRAPHY.fontSize.sm : size === 'large' ? TYPOGRAPHY.fontSize.lg : TYPOGRAPHY.fontSize.md,
      fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    };

    switch (variant) {
      case 'primary':
      case 'secondary':
        return {
          ...baseStyle,
          color: disabled ? COLORS.textLight : COLORS.white,
        };
      case 'outline':
        return {
          ...baseStyle,
          color: disabled ? COLORS.textLight : COLORS.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          color: disabled ? COLORS.textLight : COLORS.primary,
        };
      default:
        return baseStyle;
    }
  };

  // Render icon if provided
  const renderIcon = () => {
    if (!icon) return null;
    
    const iconColor = variant === 'primary' || variant === 'secondary' 
      ? COLORS.white 
      : COLORS.primary;
    
    const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
    
    return (
      <Icon 
        name={icon} 
        size={iconSize} 
        color={disabled ? COLORS.textLight : iconColor}
        style={{ 
          marginRight: iconPosition === 'left' ? SPACING.xs : 0,
          marginLeft: iconPosition === 'right' ? SPACING.xs : 0,
        }}
      />
    );
  };

  return (
    <RNEButton
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      buttonStyle={[
        getButtonStyle(),
        fullWidth && { width: '100%' },
        style,
      ]}
      titleStyle={[
        getTitleStyle(),
        titleStyle,
      ]}
      icon={iconPosition === 'left' ? renderIcon() : undefined}
      iconRight={iconPosition === 'right'}
      iconContainerStyle={iconPosition === 'right' ? { marginLeft: SPACING.xs } : undefined}
      {...props}
    />
  );
};

// Preset button variants untuk kemudahan penggunaan
export const PrimaryButton = (props) => <Button variant="primary" {...props} />;
export const SecondaryButton = (props) => <Button variant="secondary" {...props} />;
export const OutlineButton = (props) => <Button variant="outline" {...props} />;
export const GhostButton = (props) => <Button variant="ghost" {...props} />;

// Button dengan ikon khusus
export const IconButton = ({ icon, onPress, size = 'medium', color = COLORS.primary, style, ...props }) => {
  const iconSize = size === 'small' ? 20 : size === 'large' ? 32 : 24;
  const buttonSize = size === 'small' ? 36 : size === 'large' ? 52 : 44;
  
  return (
    <RNEButton
      onPress={onPress}
      buttonStyle={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: 'transparent',
          padding: 0,
        },
        style,
      ]}
      icon={<Icon name={icon} size={iconSize} color={color} />}
      {...props}
    />
  );
};

// Floating Action Button
export const FAB = ({ icon = 'add', onPress, style, ...props }) => {
  return (
    <RNEButton
      onPress={onPress}
      buttonStyle={[
        {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLORS.primary,
          position: 'absolute',
          bottom: SPACING.lg,
          right: SPACING.lg,
          ...SHADOWS.large,
        },
        style,
      ]}
      icon={<Icon name={icon} size={24} color={COLORS.white} />}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  // Additional styles if needed
});

export default Button;
