import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import packageJson from '../../../package.json';

export const getDeviceId = async (): Promise<string> => {
  try {
    // Get existing device ID or generate new one
    const deviceId = await AsyncStorage.getItem('deviceId');
    if (deviceId) {
      return deviceId;
    }
    const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('deviceId', newDeviceId);
    return newDeviceId;
  } catch (error) {
    // Fallback if AsyncStorage fails
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

export interface DeviceInfoData {
  platform: string;
  deviceName: string;
  osVersion: string;
  appVersion: string;
  pushToken?: string;
}

export const getDeviceInfo = async (pushToken?: string): Promise<DeviceInfoData> => {
  try {
    console.log('📱 Getting device info...');
    
    // Get device name from Platform constants
    const deviceName = Platform.select({
      ios: Platform.constants.systemName || 'iOS Device',
      android: Platform.constants.Model || 'Android Device',
      default: 'Unknown Device',
    }) as string;

    // Get OS version
    const osVersion = Platform.Version.toString();

    // Get app version from package.json
    const appVersion = packageJson.version;

    const deviceInfo = {
      platform: Platform.OS,
      deviceName,
      osVersion,
      appVersion,
      ...(pushToken && { pushToken }),
    };

    console.log('✅ Device info collected:', JSON.stringify(deviceInfo, null, 2));

    return deviceInfo;
  } catch (error) {
    console.error('Error getting device info:', error);
    // Return fallback values
    return {
      platform: Platform.OS,
      deviceName: 'Unknown Device',
      osVersion: 'Unknown',
      appVersion: packageJson.version || '0.0.0',
      ...(pushToken && { pushToken }),
    };
  }
};