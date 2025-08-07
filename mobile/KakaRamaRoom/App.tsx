/**
 * KR App - Aplikasi Manajemen Checkin KakaRama Room
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
