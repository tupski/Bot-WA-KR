/**
 * Custom Card Component untuk KakaRama Room
 * Modern card design dengan berbagai variant
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card as RNECard } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../config/theme';

const Card = ({
  children,
  title,
  subtitle,
  icon,
  iconColor = COLORS.primary,
  onPress,
  variant = 'default', // default, elevated, outlined, flat
  animation,
  animationDelay = 0,
  style,
  contentStyle,
  headerStyle,
  ...props
}) => {
  // Get card styles based on variant
  const getCardStyle = () => {
    const baseStyle = {
      borderRadius: RADIUS.md,
      margin: 0,
      padding: 0,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: COLORS.white,
          ...SHADOWS.large,
        };
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: COLORS.white,
          borderWidth: 1,
          borderColor: COLORS.surfaceDark,
        };
      case 'flat':
        return {
          ...baseStyle,
          backgroundColor: COLORS.surface,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: COLORS.white,
          ...SHADOWS.medium,
        };
    }
  };

  // Render header if title or icon provided
  const renderHeader = () => {
    if (!title && !icon) return null;

    return (
      <View style={[styles.header, headerStyle]}>
        {icon && (
          <Icon 
            name={icon} 
            size={24} 
            color={iconColor} 
            style={styles.headerIcon}
          />
        )}
        <View style={styles.headerText}>
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
    );
  };

  const CardContent = (
    <RNECard
      containerStyle={[
        getCardStyle(),
        style,
      ]}
      wrapperStyle={[styles.wrapper, contentStyle]}
      {...props}
    >
      {renderHeader()}
      {children}
    </RNECard>
  );

  // Wrap with animation if specified
  const AnimatedCard = animation ? (
    <Animatable.View
      animation={animation}
      delay={animationDelay}
      duration={300}
    >
      {CardContent}
    </Animatable.View>
  ) : CardContent;

  // Wrap with TouchableOpacity if onPress provided
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {AnimatedCard}
      </TouchableOpacity>
    );
  }

  return AnimatedCard;
};

// Preset card variants
export const ElevatedCard = (props) => <Card variant="elevated" {...props} />;
export const OutlinedCard = (props) => <Card variant="outlined" {...props} />;
export const FlatCard = (props) => <Card variant="flat" {...props} />;

// Specialized card components
export const StatsCard = ({ 
  title, 
  value, 
  icon, 
  iconColor = COLORS.primary,
  trend,
  trendColor,
  onPress,
  style,
  ...props 
}) => {
  return (
    <Card
      onPress={onPress}
      variant="elevated"
      style={[styles.statsCard, style]}
      animation="fadeInUp"
      {...props}
    >
      <View style={styles.statsContent}>
        <View style={styles.statsLeft}>
          <Text style={styles.statsValue}>{value}</Text>
          <Text style={styles.statsTitle}>{title}</Text>
          {trend && (
            <Text style={[styles.statsTrend, { color: trendColor || COLORS.success }]}>
              {trend}
            </Text>
          )}
        </View>
        {icon && (
          <View style={[styles.statsIcon, { backgroundColor: iconColor + '20' }]}>
            <Icon name={icon} size={32} color={iconColor} />
          </View>
        )}
      </View>
    </Card>
  );
};

export const ActionCard = ({ 
  title, 
  subtitle, 
  icon, 
  iconColor = COLORS.primary,
  onPress,
  rightIcon = 'chevron-right',
  style,
  ...props 
}) => {
  return (
    <Card
      onPress={onPress}
      variant="outlined"
      style={[styles.actionCard, style]}
      animation="fadeInUp"
      {...props}
    >
      <View style={styles.actionContent}>
        {icon && (
          <View style={[styles.actionIcon, { backgroundColor: iconColor + '20' }]}>
            <Icon name={icon} size={24} color={iconColor} />
          </View>
        )}
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.actionSubtitle}>{subtitle}</Text>
          )}
        </View>
        <Icon name={rightIcon} size={20} color={COLORS.textSecondary} />
      </View>
    </Card>
  );
};

export const InfoCard = ({ 
  type = 'info', // info, success, warning, error
  title, 
  message, 
  onClose,
  style,
  ...props 
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { color: COLORS.success, icon: 'check-circle' };
      case 'warning':
        return { color: COLORS.warning, icon: 'warning' };
      case 'error':
        return { color: COLORS.error, icon: 'error' };
      default:
        return { color: COLORS.info, icon: 'info' };
    }
  };

  const config = getTypeConfig();

  return (
    <Card
      variant="outlined"
      style={[
        styles.infoCard,
        { borderLeftColor: config.color, borderLeftWidth: 4 },
        style,
      ]}
      animation="slideInDown"
      {...props}
    >
      <View style={styles.infoContent}>
        <Icon name={config.icon} size={24} color={config.color} />
        <View style={styles.infoText}>
          {title && <Text style={styles.infoTitle}>{title}</Text>}
          <Text style={styles.infoMessage}>{message}</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerIcon: {
    marginRight: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  
  // Stats Card
  statsCard: {
    marginVertical: SPACING.sm,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLeft: {
    flex: 1,
  },
  statsValue: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statsTrend: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginTop: SPACING.xs,
  },
  statsIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Action Card
  actionCard: {
    marginVertical: SPACING.xs,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  actionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  
  // Info Card
  infoCard: {
    marginVertical: SPACING.sm,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  infoMessage: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});

export default Card;
