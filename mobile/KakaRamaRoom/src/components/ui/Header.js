/**
 * Modern Header Component untuk KakaRama Room
 * Dengan gradient background dan animasi
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Header as RNEHeader } from 'react-native-elements';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../../config/theme';

const Header = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  gradient = true,
  backgroundColor = COLORS.primary,
  textColor = COLORS.white,
  statusBarStyle = 'light-content',
  elevation = true,
  animation = 'slideInDown',
  style,
  ...props
}) => {
  // Render left component
  const renderLeftComponent = () => {
    if (!leftIcon) return null;
    
    return (
      <TouchableOpacity
        onPress={onLeftPress}
        style={styles.iconButton}
        activeOpacity={0.7}
      >
        <Icon name={leftIcon} size={24} color={textColor} />
      </TouchableOpacity>
    );
  };

  // Render center component
  const renderCenterComponent = () => {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: textColor + 'CC' }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    );
  };

  // Render right component
  const renderRightComponent = () => {
    if (!rightIcon) return null;
    
    return (
      <TouchableOpacity
        onPress={onRightPress}
        style={styles.iconButton}
        activeOpacity={0.7}
      >
        <Icon name={rightIcon} size={24} color={textColor} />
      </TouchableOpacity>
    );
  };

  const HeaderContent = (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={gradient ? COLORS.gradientStart : backgroundColor}
        translucent={false}
      />
      <RNEHeader
        leftComponent={renderLeftComponent()}
        centerComponent={renderCenterComponent()}
        rightComponent={renderRightComponent()}
        backgroundColor="transparent"
        containerStyle={[
          styles.container,
          elevation && SHADOWS.medium,
          style,
        ]}
        ViewComponent={gradient ? LinearGradient : View}
        linearGradientProps={gradient ? {
          colors: [COLORS.gradientStart, COLORS.gradientEnd],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 0 },
        } : undefined}
        {...props}
      />
    </>
  );

  // Wrap with animation if specified
  if (animation) {
    return (
      <Animatable.View animation={animation} duration={300}>
        {HeaderContent}
      </Animatable.View>
    );
  }

  return HeaderContent;
};

// Preset header variants
export const AppHeader = ({ title, onMenuPress, onNotificationPress, ...props }) => (
  <Header
    title={title}
    leftIcon="menu"
    rightIcon="notifications"
    onLeftPress={onMenuPress}
    onRightPress={onNotificationPress}
    {...props}
  />
);

export const BackHeader = ({ title, onBackPress, ...props }) => (
  <Header
    title={title}
    leftIcon="arrow-back"
    onLeftPress={onBackPress}
    {...props}
  />
);

export const SearchHeader = ({ title, onSearchPress, onFilterPress, ...props }) => (
  <Header
    title={title}
    leftIcon="search"
    rightIcon="filter-list"
    onLeftPress={onSearchPress}
    onRightPress={onFilterPress}
    {...props}
  />
);

// Dashboard header dengan stats
export const DashboardHeader = ({ 
  title, 
  subtitle,
  stats,
  onMenuPress, 
  onNotificationPress,
  ...props 
}) => {
  return (
    <Animatable.View animation="slideInDown" duration={300}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.gradientStart}
        translucent={false}
      />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.dashboardContainer, SHADOWS.medium]}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Icon name="menu" size={24} color={COLORS.white} />
          </TouchableOpacity>
          
          <View style={styles.centerContainer}>
            <Text style={[styles.title, { color: COLORS.white }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: COLORS.white + 'CC' }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            onPress={onNotificationPress}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Icon name="notifications" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {stats && (
          <View style={styles.statsRow}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  
  // Dashboard Header
  dashboardContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.white + '30',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.white + 'CC',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default Header;
