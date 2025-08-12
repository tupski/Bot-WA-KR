import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../config/constants';
import NotificationIcon from './NotificationIcon';
import { useNavigation } from '@react-navigation/native';

/**
 * GlobalHeader - Header global yang menampilkan ikon notifikasi di semua screen
 * @param {string} title - Judul screen
 * @param {boolean} showBackButton - Tampilkan tombol back
 * @param {function} onBackPress - Custom handler untuk tombol back
 * @param {React.ReactNode} rightComponent - Komponen tambahan di sebelah kanan
 * @param {object} style - Custom style untuk header
 */
const GlobalHeader = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  style,
}) => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />
      <View style={[styles.container, style]}>
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color={COLORS.background} />
            </TouchableOpacity>
          )}
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {rightComponent}
          <NotificationIcon
            onPress={handleNotificationPress}
            color={COLORS.background}
            size={24}
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000, // Pastikan header selalu di atas
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: SIZES.xs,
    marginRight: SIZES.sm,
  },
  title: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.background,
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default GlobalHeader;
