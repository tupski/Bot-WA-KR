/**
 * KakaRama Room - Aplikasi Manajemen Checkin KakaRama Room
 * Modern UI Version with React Native Elements + Paper
 * @format
 */

import React from 'react';
import {
  StatusBar,
} from 'react-native';
import 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';
import { COLORS, PAPER_THEME } from './src/config/theme';

function App(): React.JSX.Element {
  console.log('App: KakaRama Room starting with modern UI...');

  return (
    <PaperProvider theme={PAPER_THEME}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />
      <AppNavigator />
    </PaperProvider>
  );
}

export default App;
