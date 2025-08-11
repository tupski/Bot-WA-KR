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
import NotificationService from './src/services/NotificationService';
import ScheduledNotificationProcessor from './src/services/ScheduledNotificationProcessor';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize services
    const initializeServices = async () => {
      try {
        // Initialize notification service
        console.log('App: Initializing NotificationService...');
        await NotificationService.initialize();

        // Start scheduled notification processor
        console.log('App: Starting ScheduledNotificationProcessor...');
        ScheduledNotificationProcessor.start();

        // Initialize email report scheduler
        console.log('App: Starting EmailReportService...');
        EmailReportService.startScheduler();

        console.log('App: All services initialized successfully');
      } catch (error) {
        console.error('App: Error initializing services:', error);
      }
    };

    initializeServices();

    // Cleanup on app unmount
    return () => {
      console.log('App: Cleaning up services...');
      EmailReportService.stopScheduler();
      ScheduledNotificationProcessor.stop();
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
