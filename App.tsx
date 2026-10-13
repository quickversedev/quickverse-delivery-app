/**
 * QV Transporters App
 * Authentication Flow with Phone Number and OTP
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalLocationSync from './src/components/GlobalLocationSync';
import NotificationSetup from './src/components/NotificationSetup';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#FFFFFF"
      />
      <NotificationSetup />
      <GlobalLocationSync />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
