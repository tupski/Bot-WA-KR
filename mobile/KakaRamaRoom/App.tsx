/**
 * KakaRama Room - Aplikasi Manajemen Checkin KakaRama Room
 * @format
 */

import React, { useEffect } from 'react';
import {
  StatusBar,
} from 'react-native';
import 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/config/constants';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize services with better error handling
    const initializeServices = async () => {
      try {
        console.log('App: Starting KakaRama Room application...');

        // Initialize services safely with individual error handling
        try {
          const EmailReportService = require('./src/services/EmailReportService').default;
          console.log('App: Starting EmailReportService...');
          EmailReportService.startScheduler();
        } catch (error) {
          console.warn('App: EmailReportService initialization failed:', error instanceof Error ? error.message : String(error));
        }

        try {
          const NotificationService = require('./src/services/NotificationService').default;
          console.log('App: Initializing NotificationService...');
          await NotificationService.initialize();
        } catch (error) {
          console.warn('App: NotificationService initialization failed:', error instanceof Error ? error.message : String(error));
        }

        try {
          const ScheduledNotificationProcessor = require('./src/services/ScheduledNotificationProcessor').default;
          console.log('App: Starting ScheduledNotificationProcessor...');
          ScheduledNotificationProcessor.start();
        } catch (error) {
          console.warn('App: ScheduledNotificationProcessor initialization failed:', error instanceof Error ? error.message : String(error));
        }

        console.log('App: KakaRama Room application initialized successfully');
      } catch (error) {
        console.error('App: Critical error during initialization:', error);
        // Don't crash the app, just log the error
      }
    };

    initializeServices();

    // Cleanup on app unmount
    return () => {
      console.log('App: Cleaning up services...');
      try {
        const EmailReportService = require('./src/services/EmailReportService').default;
        EmailReportService.stopScheduler();
      } catch (error) {
        console.warn('App: Error stopping EmailReportService:', error instanceof Error ? error.message : String(error));
      }

      try {
        const ScheduledNotificationProcessor = require('./src/services/ScheduledNotificationProcessor').default;
        ScheduledNotificationProcessor.stop();
      } catch (error) {
        console.warn('App: Error stopping ScheduledNotificationProcessor:', error instanceof Error ? error.message : String(error));
      }
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
