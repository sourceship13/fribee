import React, { useEffect, useRef, useState } from 'react';
import AppNavigator from './AppNavigator';
import { StatusBar, StyleSheet, Linking, Alert, Platform } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './libs/hooks/useAuth';
import AppReturnUtils from './libs/utils/appReturnUtils';
// import Config from 'react-native-config';
import * as Sentry from '@sentry/react-native';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import FeedbackModal from './components/FeedbackModal';

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
  const lastShakeTime = useRef(0);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  const handleFeedbackSubmit = (feedback: string) => {
    try {
      Sentry.captureFeedback({
        message: feedback,
        name: 'App User',
        email: '',
      });
      console.log('✅ Feedback sent to Sentry:', feedback);
      Alert.alert('Thank You!', 'Your feedback has been sent.');
    } catch (error) {
      console.error('❌ Error sending feedback:', error);
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    }
  };

  // Handle shake gesture to show Sentry feedback
  useEffect(() => {
    // Skip shake detection in simulator (accelerometer not available)
    if (__DEV__ && Platform.OS === 'ios') {
      console.log('⚠️ Shake detection disabled in iOS Simulator (accelerometer not available)');
      return;
    }

    console.log('🔧 Setting up shake detection with accelerometer...');
    
    // Set update interval to 100ms
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    
    const SHAKE_THRESHOLD = 2.5; // Adjust sensitivity (lower = more sensitive)
    const SHAKE_COOLDOWN = 2000; // 2 seconds between shakes
    
    const subscription = accelerometer.subscribe(
      ({ x, y, z }) => {
        // Calculate acceleration magnitude
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        
        // Detect shake (sudden acceleration)
        if (acceleration > SHAKE_THRESHOLD) {
          const now = Date.now();
          
          // Check cooldown to prevent multiple triggers
          if (now - lastShakeTime.current > SHAKE_COOLDOWN) {
            lastShakeTime.current = now;
            console.log('📱 ===== SHAKE DETECTED ===== ');
            
            // Show custom feedback modal
            setFeedbackModalVisible(true);
          }
        }
      },
      (error) => {
        // Handle sensor errors gracefully
        console.warn('⚠️ Accelerometer error:', error);
      }
    );

    console.log('✅ Shake detection active');

    return () => {
      console.log('🔧 Removing shake detection');
      subscription.unsubscribe();
    };
  }, []);

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
      
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onSubmit={handleFeedbackSubmit}
      />
    </>
  );
}

export default Sentry.wrap(App);
