import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { useAuth, getColors } from '../../libs/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../../services/auth.service';
import ApiService from '../../services/api.service';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';

const DebugScreen = ({ navigation }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);
  const [debugInfo, setDebugInfo] = useState<any>({});

  const checkDebugInfo = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const user = await AsyncStorage.getItem('user');
      const isAuth = await AuthService.isAuthenticated();
      
      // Test API calls with detailed logging
      let dealsResult = null;
      let categoriesResult = null;
      let testAuthResult = null;
      
      // Test a simple authenticated endpoint
      try {
        const testResponse = await AuthService.makeAuthenticatedRequest(
          'https://your-api-url.com/test-auth', // Replace with actual test endpoint
          { method: 'GET' }
        );
        testAuthResult = {
          status: testResponse.status,
          headers: Object.fromEntries(testResponse.headers.entries()),
        };
      } catch (error) {
        testAuthResult = { error: String(error) };
      }
      
      try {
        dealsResult = await ApiService.getDeals();
      } catch (error) {
        dealsResult = { error: String(error) };
      }
      
      // try {
      //   categoriesResult = await ApiService.getCategories();
      // } catch (error) {
      //   categoriesResult = { error: String(error) };
      // }

      setDebugInfo({
        accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL',
        refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'NULL',
        user: user ? JSON.parse(user) : 'NULL',
        isAuthenticated: isAuth,
        testAuthCall: testAuthResult,
        dealsApi: dealsResult,
        categoriesApi: categoriesResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setDebugInfo({ error: String(error) });
    }
  };

  const clearTokens = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    await checkDebugInfo();
  };

  // const testTokenHeaders = async () => {
  //   try {
  //     // Get the token directly
  //     const accessToken = await AsyncStorage.getItem('accessToken');
  //     // Test manual fetch with token
  //     const apiUrl = await import('../../libs/utils/api.utils');
  //     // const testUrl = `${apiUrl.default.apiURL}/deals/categories`;
  //     const manualResponse = await fetch(testUrl, {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': accessToken ? `Bearer ${accessToken}` : '',
  //       },
  //     });
  //     if (!manualResponse.ok) {
  //       const errorText = await manualResponse.text();
  //       console.error('❌ Debug: Manual fetch error:', errorText);
  //     } else {
  //       const data = await manualResponse.json();
  //     }
  //   } catch (error) {
  //     console.error('❌ Debug: Token test failed:', error);
  //   }
  //   await checkDebugInfo();
  // };

  const testApiConnection = async () => {
    try {
      const apiUrl = await import('../../libs/utils/api.utils');
      try {
        const apiUrl = await import('../../libs/utils/api.utils');
        // Test basic connectivity
        const response = await fetch(`${apiUrl.default.apiURL}/health`);
        if (response.ok) {
          const data = await response.text();
        }
      } catch (error) {
        setDebugInfo({ error: String(error) });
      }
      await checkDebugInfo();
      // This is just a test - replace with real credentials if you have test ones
      const credentials = { email: 'test@example.com', password: 'password123' };
      const result = await AuthService.login(credentials);
      await checkDebugInfo();
    } catch (error) {
      await checkDebugInfo();
    }
  };

  const fillTestCredentials = () => {
    // This will help you test - you can replace with real test credentials
    navigation.goBack();
  };

  useEffect(() => {
    checkDebugInfo();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    title: StyleSheet.flatten([
      iOSUIKit.largeTitleEmphasized,
      {
        color: colors.text,
        marginBottom: 20,
      },
    ]),
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    debugSection: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
    },
    debugKey: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 5,
    },
    debugValue: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'Courier',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Screen</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkDebugInfo}>
        <Text style={styles.buttonText}>Refresh Debug Info</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={clearTokens}>
        <Text style={styles.buttonText}>Clear All Tokens</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testApiConnection}>
        <Text style={styles.buttonText}>Test API Connection</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity style={styles.button} onPress={testTokenHeaders}>
        <Text style={styles.buttonText}>Test Token Headers</Text>
      </TouchableOpacity> */}
      
      <TouchableOpacity style={styles.button} onPress={fillTestCredentials}>
        <Text style={styles.buttonText}>Go to Sign In</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }}>
        {Object.entries(debugInfo).map(([key, value]) => (
          <View key={key} style={styles.debugSection}>
            <Text style={styles.debugKey}>{key}:</Text>
            <Text style={styles.debugValue}>
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </Text>
          </View>
        ))}
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

export default DebugScreen;