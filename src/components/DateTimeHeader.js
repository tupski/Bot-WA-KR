import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SIZES } from '../config/constants';

/**
 * Component untuk menampilkan tanggal dan jam di header
 * dengan animasi blink pada titik dua
 */
const DateTimeHeader = ({ style, textColor = COLORS.white }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blinkAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Update time setiap detik
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Animasi blink untuk titik dua setiap detik
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(blinkInterval);
    };
  }, [blinkAnim]);

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return { hours, minutes };
  };

  const { hours, minutes } = formatTime(currentTime);
  const dateString = formatDate(currentTime);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.dateText, { color: textColor }]}>{dateString}</Text>
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: textColor }]}>{hours}</Text>
        <Animated.Text style={[styles.colonText, { opacity: blinkAnim, color: textColor }]}>
          :
        </Animated.Text>
        <Text style={[styles.timeText, { color: textColor }]}>{minutes}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: SIZES.caption,
    fontWeight: '500',
    opacity: 0.9,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  colonText: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginHorizontal: 1,
  },
});

export default DateTimeHeader;
