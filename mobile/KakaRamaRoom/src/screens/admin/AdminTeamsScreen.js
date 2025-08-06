import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../config/constants';

const AdminTeamsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manajemen Tim Lapangan</Text>
      <Text style={styles.subtitle}>Coming Soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
  },
});

export default AdminTeamsScreen;
