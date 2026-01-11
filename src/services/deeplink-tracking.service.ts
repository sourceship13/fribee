import apiService from './api.service';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

/**
 * Service to track and identify deep link clicks
 * This runs on app startup to match users with their deep link clicks
 */
class DeepLinkTrackingService {
  private static instance: DeepLinkTrackingService;

  static getInstance(): DeepLinkTrackingService {
    if (!DeepLinkTrackingService.instance) {
      DeepLinkTrackingService.instance = new DeepLinkTrackingService();
    }
    return DeepLinkTrackingService.instance;
  }

  /**
   * Get the public IP address of the device using React Native NetInfo
   */
  private async getPublicIp(): Promise<string | null> {
    try {
      // First check if we have network connectivity
      const netState = await NetInfo.fetch();
      
      if (!netState.isConnected) {
        console.warn('No network connection available');
        return null;
      }

      // Get public IP using a lightweight API
      // Note: Public IP can only be obtained via external API call
      const response = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();
      return data.ip || null;
    } catch (error) {
      console.error('Failed to get public IP:', error);
      return null;
    }
  }

  /**
   * Get device information for tracking
   */
  private async getDeviceInfo() {
    try {
      // Get network state information
      const netState = await NetInfo.fetch();
      
      return {
        deviceId: await DeviceInfo.getUniqueId(),
        model: DeviceInfo.getModel(),
        brand: DeviceInfo.getBrand(),
        systemName: DeviceInfo.getSystemName(),
        systemVersion: DeviceInfo.getSystemVersion(),
        appVersion: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
        bundleId: DeviceInfo.getBundleId(),
        platform: Platform.OS,
        isTablet: DeviceInfo.isTablet(),
        // Network information
        connectionType: netState.type,
        isConnected: netState.isConnected,
        // Note: MAC address requires special permissions and is deprecated on modern iOS/Android
        // Using device unique ID instead
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }

  /**
   * Identify user and check for recent deep link clicks
   * This should be called FIRST on app startup, before other API calls
   * 
   * @param userId - The authenticated user's ID
   * @returns Deal ID if a recent deep link click was found, null otherwise
   */
  async identifyUserAndCheckDeepLink(userId: number): Promise<{
    dealId: string | null;
    clickData: any | null;
  }> {
    try {
      console.log('🔍 Identifying user and checking for deep link clicks...');

      // Get public IP and device info
      const [publicIp, deviceInfo] = await Promise.all([
        this.getPublicIp(),
        this.getDeviceInfo(),
      ]);

      if (!publicIp) {
        console.warn('⚠️ Could not determine public IP, skipping deep link identification');
        return { dealId: null, clickData: null };
      }

      console.log('📍 User IP:', publicIp);
      console.log('📱 Device info:', deviceInfo);

      // Call backend to identify user and get recent click
      const response = await apiService.makeRequest('/deeplink/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicIp,
          userId,
          deviceInfo,
        }),
      });

      if (response.success && response.data?.recentClick) {
        const { dealId, clickedAt, city } = response.data.recentClick;
        console.log('✅ Found recent deep link click!');
        console.log(`   Deal ID: ${dealId}`);
        console.log(`   Clicked at: ${clickedAt}`);
        console.log(`   Location: ${city || 'Unknown'}`);

        return {
          dealId: dealId.toString(),
          clickData: response.data.recentClick,
        };
      } else {
        console.log('ℹ️ No recent deep link clicks found');
        return { dealId: null, clickData: null };
      }
    } catch (error) {
      console.error('❌ Error identifying user for deep link:', error);
      // Don't throw - we don't want to block app startup if tracking fails
      return { dealId: null, clickData: null };
    }
  }

  /**
   * Track when user opens the app (for analytics)
   */
  async trackAppOpen(userId: number | null): Promise<void> {
    try {
      const [publicIp, deviceInfo] = await Promise.all([
        this.getPublicIp(),
        this.getDeviceInfo(),
      ]);

      await apiService.makeRequest('/analytics/app-open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          publicIp,
          deviceInfo,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to track app open:', error);
      // Don't throw - analytics shouldn't block the app
    }
  }
}

export default DeepLinkTrackingService.getInstance();
