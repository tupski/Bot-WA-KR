/**
 * KR App - Aplikasi Manajemen Checkin KakaRama Room
 * @format
 */

import React, { useEffect } from 'react';
import {
  StatusBar,
} from 'react-native';
import 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/config/constants';
import EmailReportService from './src/services/EmailReportService';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize email report scheduler
    EmailReportService.startScheduler();

    // Cleanup on app unmount
    return () => {
      EmailReportService.stopScheduler();
    };
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />
      <AppNavigator />
    </>
  );
}

export default App;
