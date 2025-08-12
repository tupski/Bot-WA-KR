/**
 * KakaRama Room - Aplikasi Manajemen Checkin KakaRama Room
 * @format
 */

import React from 'react';
import {
  StatusBar,
} from 'react-native';
import 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/config/constants';

function App(): React.JSX.Element {
  console.log('App: KakaRama Room starting...');

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
