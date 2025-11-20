import React, { useEffect } from 'react';
import AppNavigator from './AppNavigator';
import { StatusBar, StyleSheet, Linking } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './libs/hooks/useAuth';
import AppReturnUtils from './libs/utils/appReturnUtils';
// import Config from 'react-native-config';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://782d11d5dba6567941af57bb9981d2c3@o4510396604088320.ingest.us.sentry.io/4510396604940288',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function App() {
  // TODO: Test react-native-config after verifying app runs
  // useEffect(() => {
  //   console.log('🔑 Google Maps API Key:', Config.GOOGLE_MAPS_API_KEY);
  // }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <AppWithStatusBar />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

function AppWithStatusBar() {
  const { isDarkMode } = useAuth();

  // Handle deep link when user returns to app
  useEffect(() => {
    // Handle initial URL if app is opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        AppReturnUtils.handleAppReturn(url);
      }
    });

    // Listen for deep link events while app is running
    const handleUrl = (event: { url: string }) => {
      AppReturnUtils.handleAppReturn(event.url);
    };

    // Add event listener
    const subscription = Linking.addEventListener('url', handleUrl);

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
      </GestureHandlerRootView>
    </>
  );
}

export default Sentry.wrap(App);
