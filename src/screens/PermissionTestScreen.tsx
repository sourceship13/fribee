import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import VersionFooter from '../components/VersionFooter';

const PermissionTestScreen = () => {
  const checkContactsPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CONTACTS 
        : PERMISSIONS.ANDROID.READ_CONTACTS;
      
      const result = await check(permission);
      
      let message = '';
      switch (result) {
        case RESULTS.UNAVAILABLE:
          message = 'This feature is not available (on this device / in this context)';
          break;
        case RESULTS.DENIED:
          message = 'The permission has not been requested / is denied but requestable';
          break;
        case RESULTS.LIMITED:
          message = 'The permission is limited: some actions are possible';
          break;
        case RESULTS.GRANTED:
          message = 'The permission is granted';
          break;
        case RESULTS.BLOCKED:
          message = 'The permission is denied and not requestable anymore';
          break;
      }
      
      Alert.alert('Contact Permission Status', message);
    } catch (error) {
      console.error('Permission check error:', error);
      Alert.alert('Error', 'Failed to check permission: ' + (error as Error)?.message || 'Unknown error');
    }
  };

  const requestContactsPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CONTACTS 
        : PERMISSIONS.ANDROID.READ_CONTACTS;
      
      const result = await request(permission);
      
      let message = '';
      switch (result) {
        case RESULTS.GRANTED:
          message = 'Permission granted! You can now access contacts.';
          break;
        case RESULTS.DENIED:
          message = 'Permission denied. Please enable it in settings.';
          break;
        case RESULTS.BLOCKED:
          message = 'Permission blocked. Please enable it in device settings.';
          break;
        default:
          message = `Permission result: ${result}`;
      }
      
      Alert.alert('Permission Request Result', message);
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request permission: ' + (error as Error)?.message || 'Unknown error');
    }
  };

  const testModuleImports = () => {
    try {
      // Test if modules can be imported without errors
      const Contacts = require('react-native-contacts');
      const SMSShare = require('react-native-sms-share');
      
      Alert.alert('Success!', 'All modules imported successfully. The permissions system is working.');
    } catch (error) {
      console.error('Module import error:', error);
      Alert.alert('Module Error', 'Failed to import modules: ' + (error as Error)?.message || 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permission Test Screen</Text>
      <Text style={styles.subtitle}>Test native module integration</Text>
      
      <TouchableOpacity style={styles.button} onPress={testModuleImports}>
        <Text style={styles.buttonText}>Test Module Imports</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={checkContactsPermission}>
        <Text style={styles.buttonText}>Check Contacts Permission</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={requestContactsPermission}>
        <Text style={styles.buttonText}>Request Contacts Permission</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        Platform: {Platform.OS}{'\n'}
        This screen tests if react-native-permissions is properly linked.
      </Text>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  info: {
    marginTop: 40,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PermissionTestScreen;