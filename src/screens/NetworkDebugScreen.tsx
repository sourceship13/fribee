import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform, TextInput } from 'react-native';
import { apiConfig, switchEnvironment, forcePhysicalDevice, getDeviceDetectionStatus } from '../libs/utils/api.utils';
import { useAuth, getColors } from '../libs/hooks/useAuth';
import Toolbar from '../components/Toolbar';
import MacIPDetector from '../libs/utils/macIPDetector';
import VersionFooter from '../components/VersionFooter';

const NetworkDebugScreen = ({ navigation }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);
  const [currentConfig, setCurrentConfig] = useState({
    environment: apiConfig.environment,
    baseURL: apiConfig.baseURL,
    apiURL: apiConfig.apiURL,
    isLocal: apiConfig.isLocal
  });
  const [macIP, setMacIP] = useState<string | null>(null);
  const [customIP, setCustomIP] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    // Get initial Mac IP if available
    const physicalURL = MacIPDetector.getPhysicalDeviceURL();
    const ipMatch = physicalURL.match(/http:\/\/([0-9.]+):/);
    if (ipMatch) {
      setMacIP(ipMatch[1]);
      setCustomIP(ipMatch[1]);
    }
  }, []);

  const refreshConfig = () => {
    setCurrentConfig({
      environment: apiConfig.environment,
      baseURL: apiConfig.baseURL,
      apiURL: apiConfig.apiURL,
      isLocal: apiConfig.isLocal
    });
  };

  const detectMacIP = async () => {
    setIsDetecting(true);
    try {
      const detectedIP = await MacIPDetector.detectMacIP();
      if (detectedIP) {
        setMacIP(detectedIP);
        setCustomIP(detectedIP);
        Alert.alert('✅ IP Detected', `Found Mac IP: ${detectedIP}\n\nPhysical devices can now connect to your Mac's localhost server.`);
      } else {
        Alert.alert('❌ Detection Failed', 'Could not automatically detect Mac IP.\n\nTry manual configuration or ensure your backend server is running.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to detect IP: ' + (error as Error)?.message);
    } finally {
      setIsDetecting(false);
    }
  };

  const setManualIP = () => {
    if (!customIP.trim()) {
      Alert.alert('Invalid IP', 'Please enter a valid IP address');
      return;
    }
    
    MacIPDetector.setManualIP(customIP.trim());
    setMacIP(customIP.trim());
    Alert.alert('✅ IP Updated', `Mac IP set to: ${customIP.trim()}\n\nPhysical devices will now use this IP for localhost connections.`);
  };

  const testMacConnection = async () => {
    if (!macIP) {
      Alert.alert('No IP Set', 'Please detect or manually set your Mac IP first');
      return;
    }

    Alert.alert('Testing Connection', `Testing connection to Mac at ${macIP}:8080...`);
    
    try {
      const result = await MacIPDetector.testSpecificEndpoint(macIP, 8080);
      
      if (result.reachable) {
        Alert.alert('✅ Mac Connection Success', `Successfully connected to your Mac!\n\nResponse time: ${result.responseTime}ms\n\nPhysical devices can now access your localhost backend.`);
      } else {
        Alert.alert('❌ Mac Connection Failed', `Could not reach Mac at ${macIP}:8080\n\nError: ${result.error}\n\nMake sure:\n• Backend server is running\n• Both devices on same network\n• Firewall allows connections`);
      }
    } catch (error) {
      Alert.alert('Test Error', (error as Error)?.message || 'Unknown error');
    }
  };

  const switchToEnvironment = (env: 'local' | 'staging' | 'production') => {
    try {
      switchEnvironment(env);
      refreshConfig();
      Alert.alert('Environment Changed', `Switched to ${env} environment\n\nNew API URL: ${apiConfig.apiURL}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch environment: ' + (error as Error)?.message);
    }
  };

  const testConnection = async () => {
    Alert.alert('Testing Connection', 'Attempting to connect to current API...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${apiConfig.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        Alert.alert('✅ Connection Success', `Successfully connected to ${currentConfig.environment} server`);
      } else {
        Alert.alert('⚠️ Connection Warning', `Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      
      if ((error as Error)?.name === 'AbortError') {
        Alert.alert('❌ Connection Timeout', 'Server took too long to respond (>10s)');
      } else if ((error as Error)?.message?.includes('Network request failed')) {
        Alert.alert('❌ Network Error', `Cannot reach server at ${currentConfig.baseURL}\n\nThis usually means:\n• Server is offline\n• Wrong URL/IP address\n• Network connectivity issues`);
      } else {
        Alert.alert('❌ Connection Error', (error as Error)?.message || 'Unknown error');
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toolbar title="Network Debug" onBack={() => navigation.goBack()} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Current Configuration</Text>
        
        <View style={[styles.configCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Environment:</Text>
          <Text style={[styles.configValue, { color: colors.text }]}>{currentConfig.environment}</Text>
          
          <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Base URL:</Text>
          <Text style={[styles.configValue, { color: colors.text }]}>{currentConfig.baseURL}</Text>
          
          <Text style={[styles.configLabel, { color: colors.textSecondary }]}>API URL:</Text>
          <Text style={[styles.configValue, { color: colors.text }]}>{currentConfig.apiURL}</Text>
          
          <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Is Local:</Text>
          <Text style={[styles.configValue, { color: colors.text }]}>{currentConfig.isLocal ? 'Yes' : 'No'}</Text>
        </View>

        <TouchableOpacity style={[styles.testButton, { backgroundColor: colors.primary }]} onPress={testConnection}>
          <Text style={styles.testButtonText}>🔍 Test Connection</Text>
        </TouchableOpacity>

        {/* Mac IP Configuration Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mac IP for Physical Devices</Text>
        
        <View style={[styles.macIPCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Current Mac IP:</Text>
          <Text style={[styles.macIPValue, { color: macIP ? colors.primary : colors.error }]}>
            {macIP || 'Not configured'}
          </Text>
          
          <View style={styles.ipInputContainer}>
            <TextInput
              style={[styles.ipInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="192.168.1.100"
              placeholderTextColor={colors.textSecondary}
              value={customIP}
              onChangeText={setCustomIP}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={[styles.setIPButton, { backgroundColor: colors.primary }]} 
              onPress={setManualIP}
            >
              <Text style={styles.setIPButtonText}>Set</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.macIPButtons}>
            <TouchableOpacity 
              style={[styles.detectButton, { backgroundColor: isDetecting ? colors.disabled : '#4CAF50' }]} 
              onPress={detectMacIP}
              disabled={isDetecting}
            >
              <Text style={styles.detectButtonText}>
                {isDetecting ? '🔍 Detecting...' : '🔍 Auto Detect'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testMacButton, { backgroundColor: '#FF9800' }]} 
              onPress={testMacConnection}
            >
              <Text style={styles.testMacButtonText}>🧪 Test Mac</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.macIPHelp, { color: colors.textSecondary }]}>
            Physical devices need your Mac's IP to connect to localhost. Auto-detect finds it automatically, or enter manually.
          </Text>
        </View>

        {/* Device Detection Debug Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Device Detection Debug</Text>
        
        <View style={[styles.deviceCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity 
            style={[styles.debugInfoButton, { backgroundColor: colors.primary }]} 
            onPress={() => {
              const status = getDeviceDetectionStatus();
              Alert.alert('Device Detection Status', JSON.stringify(status, null, 2));
            }}
          >
            <Text style={styles.debugInfoButtonText}>📊 Show Detection Status</Text>
          </TouchableOpacity>
          
          <View style={styles.forceButtons}>
            <TouchableOpacity 
              style={[styles.forceButton, { backgroundColor: '#FF9800' }]} 
              onPress={() => {
                forcePhysicalDevice(true);
                refreshConfig();
                Alert.alert('🔧 Forced Physical Device', 'App will now treat this as a physical device and use Mac IP for localhost connections.');
              }}
            >
              <Text style={styles.forceButtonText}>Force Physical</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.forceButton, { backgroundColor: '#9C27B0' }]} 
              onPress={() => {
                forcePhysicalDevice(false);
                refreshConfig();
                Alert.alert('🔧 Forced Simulator', 'App will now treat this as a simulator and use localhost.');
              }}
            >
              <Text style={styles.forceButtonText}>Force Simulator</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.forceButton, { backgroundColor: '#4CAF50' }]} 
              onPress={() => {
                forcePhysicalDevice(null);
                refreshConfig();
                Alert.alert('🔄 Auto Detection', 'App will now use automatic device detection.');
              }}
            >
              <Text style={styles.forceButtonText}>Auto Detect</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.deviceHelp, { color: colors.textSecondary }]}>
            Use these controls to test different device detection modes. "Force Physical" will make the app use your Mac's IP even on simulator.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Switch Environment</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.envButton, { backgroundColor: currentConfig.environment === 'local' ? colors.primary : colors.surface }]} 
            onPress={() => switchToEnvironment('local')}
          >
            <Text style={[styles.envButtonText, { color: currentConfig.environment === 'local' ? '#fff' : colors.text }]}>
              Local (Simulator)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.envButton, { backgroundColor: currentConfig.environment === 'staging' ? colors.primary : colors.surface }]} 
            onPress={() => switchToEnvironment('staging')}
          >
            <Text style={[styles.envButtonText, { color: currentConfig.environment === 'staging' ? '#fff' : colors.text }]}>
              Staging (Cloud)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.envButton, { backgroundColor: currentConfig.environment === 'production' ? colors.primary : colors.surface }]} 
            onPress={() => switchToEnvironment('production')}
          >
            <Text style={[styles.envButtonText, { color: currentConfig.environment === 'production' ? '#fff' : colors.text }]}>
              Production
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>💡 Connection Guide</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            • <Text style={{fontWeight: 'bold'}}>Physical Device + Local Development:</Text>{'\n'}
              1. Set Mac IP above (auto-detect recommended){'\n'}
              2. Switch to "Local" environment{'\n'}
              3. Ensure backend running on Mac{'\n'}
            {'\n'}• <Text style={{fontWeight: 'bold'}}>Physical Device + Cloud:</Text>{'\n'}
              Use "Staging" environment (default){'\n'}
            {'\n'}• <Text style={{fontWeight: 'bold'}}>Simulator:</Text>{'\n'}
              Use "Local" for localhost development{'\n'}
            {'\n'}• Always test connection before signing in
          </Text>
        </View>

        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.surface }]} onPress={refreshConfig}>
          <Text style={[styles.refreshButtonText, { color: colors.text }]}>🔄 Refresh Config</Text>
        </TouchableOpacity>
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  configCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  configValue: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  testButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 32,
  },
  envButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  envButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontWeight: 'bold',
  },
  // Mac IP Configuration Styles
  macIPCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  macIPValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ipInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  ipInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  setIPButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  setIPButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  macIPButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detectButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  testMacButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testMacButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  macIPHelp: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  // Device Detection Debug Styles
  deviceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  debugInfoButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  debugInfoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  forceButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  forceButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  forceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  deviceHelp: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

export default NetworkDebugScreen;