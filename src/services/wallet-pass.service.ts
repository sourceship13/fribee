import { Platform, Linking } from 'react-native';
import RNWalletManager from 'react-native-wallet-manager';
import AuthService from './auth.service';
import apiConfig from '../libs/utils/api.utils';

/**
 * Wallet Pass Service
 *
 * BACKEND CONFIGURATION REQUIRED:
 *
 * For Apple Wallet:
 * - Apple Pass Type ID certificate (.p12 file)
 * - Pass Type Identifier (e.g., pass.nolimitsera.deals)
 * - Team ID (from Apple Developer account)
 * - Backend endpoint: POST /api/wallet/apple/generate-pass
 *
 * For Google Wallet:
 * - Google Cloud service account credentials (JSON key file)
 * - Merchant ID and Issuer ID
 * - Generic Pass Class configured in Google Wallet API
 * - Backend endpoint: POST /api/wallet/google/generate-pass
 *
 * Both endpoints should accept: { redemptionCode, businessName, description, expiryDate }
 * and return: { success: true, passUrl: "https://..." }
 */

export interface WalletPassData {
  redemptionCode: string;
  businessName: string;
  description: string;
  expiryDate?: string;
  dealImage?: string;
}

interface WalletAPIResponse {
  success: boolean;
  passUrl?: string;
  passId?: string;
  message?: string;
  error?: string;
}

class WalletPassService {
  private static instance: WalletPassService;

  private get API_BASE_URL(): string {
    return apiConfig.baseURL;
  }

  private constructor() {}

  static getInstance(): WalletPassService {
    if (!WalletPassService.instance) {
      WalletPassService.instance = new WalletPassService();
    }
    return WalletPassService.instance;
  }

  /**
   * Check if the device supports wallet passes
   */
  async canAddPasses(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        return await RNWalletManager.canAddPasses();
      }
      // Android Google Pay support
      return true;
    } catch (error) {
      console.error('Error checking wallet pass support:', error);
      return false;
    }
  }

  /**
   * Add a pass to Apple Wallet (iOS) or Google Pay (Android)
   */
  async addPassToWallet(passData: WalletPassData): Promise<void> {
    try {
      console.log('🎫 Adding pass to wallet:', {
        platform: Platform.OS,
        apiUrl: this.API_BASE_URL,
        redemptionCode: passData.redemptionCode,
      });

      const canAdd = await this.canAddPasses();
      if (!canAdd) {
        throw new Error('Device does not support wallet passes');
      }

      if (Platform.OS === 'ios') {
        await this.addAppleWalletPass(passData);
      } else if (Platform.OS === 'android') {
        await this.addGooglePayPass(passData);
      }

      console.log('✅ Pass added successfully');
    } catch (error) {
      console.error('❌ Error adding pass to wallet:', error);
      throw error;
    }
  }

  /**
   * Add pass to Apple Wallet (iOS) - Calls backend API
   */
  private async addAppleWalletPass(passData: WalletPassData): Promise<void> {
    try {
      const token = await AuthService.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${this.API_BASE_URL}/api/wallet/apple/generate-pass`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            redemptionCode: passData.redemptionCode,
            businessName: passData.businessName,
            description: passData.description,
            expiryDate: passData.expiryDate,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend API error:', response.status, errorText);
        throw new Error(
          `Apple Wallet is not configured on the backend yet. Status: ${response.status}`,
        );
      }

      const result: WalletAPIResponse = await response.json();

      console.log('📱 Apple Wallet API response:', result);

      if (!result.success || !result.passUrl) {
        throw new Error(
          result.error ||
            'Backend did not return a valid pass URL. Wallet configuration may be incomplete.',
        );
      }

      // Check if backend is in mock mode
      if (result.message?.includes('Mock') || result.passId?.includes('mock')) {
        throw new Error(
          'Apple Wallet is running in mock mode. The pass cannot be added until the backend is configured with proper Apple certificates. Please contact support.',
        );
      }

      console.log('📱 Attempting to add pass from URL:', result.passUrl);
      
      // First, verify the pass URL is accessible
      try {
        console.log('🔍 Verifying pass URL is accessible...');
        const checkResponse = await fetch(result.passUrl, { method: 'HEAD' });
        console.log('📊 Pass URL check:', {
          status: checkResponse.status,
          contentType: checkResponse.headers.get('content-type'),
          contentLength: checkResponse.headers.get('content-length'),
        });
        
        if (!checkResponse.ok) {
          throw new Error(`Pass URL returned status ${checkResponse.status}. The pass file may not be accessible.`);
        }
        
        const contentType = checkResponse.headers.get('content-type');
        if (contentType && !contentType.includes('application/vnd.apple.pkpass')) {
          console.warn('⚠️ Warning: Pass URL has incorrect Content-Type:', contentType);
        }
      } catch (urlError: any) {
        console.error('❌ Failed to verify pass URL:', urlError);
        throw new Error(
          `Cannot access pass file at ${result.passUrl}. Error: ${urlError.message || 'Unknown error'}`,
        );
      }
      
      // Open the pass URL to add to Apple Wallet
      try {
        console.log('📱 Calling RNWalletManager.addPassFromUrl...');
        await RNWalletManager.addPassFromUrl(result.passUrl);
        console.log('✅ Pass successfully added to Apple Wallet');
      } catch (addError: any) {
        console.error('❌ Failed to add pass to wallet:', addError);
        console.error('❌ Error details:', JSON.stringify(addError, null, 2));
        
        // Provide more specific error messages based on common issues
        let errorMessage = addError.message || 'Unknown error';
        
        if (errorMessage.includes('Invalid pass') || errorMessage.includes('cannot be read')) {
          errorMessage = 'The pass file is invalid or corrupted. This usually means there\'s an issue with the pass signing certificates on the backend.';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          errorMessage = 'Network error: Could not download the pass file. Check your internet connection.';
        } else if (errorMessage.includes('certificate') || errorMessage.includes('signature')) {
          errorMessage = 'Pass signature verification failed. The backend certificates may be incorrect or expired.';
        }
        
        throw new Error(
          `Failed to add pass to Apple Wallet: ${errorMessage}`,
        );
      }
    } catch (error) {
      console.error('Error creating Apple Wallet pass:', error);
      // Provide a more helpful error message
      if (error instanceof Error) {
        throw new Error(
          `Unable to add pass: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Add pass to Google Pay (Android) - Calls backend API
   */
  private async addGooglePayPass(passData: WalletPassData): Promise<void> {
    try {
      console.log('🎫 Adding pass to Google Pay via backend API...');

      // Get auth token
      const token = await AuthService.getAccessToken();
      if (!token) {
        throw new Error('Authentication required to add pass to Google Pay');
      }

      // Call backend API to generate Google Pay pass
      const response = await fetch(
        `${this.API_BASE_URL}/api/wallet/google/generate-pass`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            redemptionCode: passData.redemptionCode,
            businessName: passData.businessName,
            description: passData.description,
            expiryDate: passData.expiryDate,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend API error:', response.status, errorText);
        throw new Error(
          `Google Wallet is not configured on the backend yet. Status: ${response.status}`,
        );
      }

      const result: WalletAPIResponse = await response.json();

      if (!result.success || !result.passUrl) {
        throw new Error(
          result.error ||
            'Backend did not return a valid pass URL. Google Wallet configuration may be incomplete.',
        );
      }

      console.log('✅ Backend returned Google Pay URL:', result.passUrl);

      // Open the Google Pay "Save to Wallet" URL
      const supported = await Linking.canOpenURL(result.passUrl);
      if (supported) {
        console.log('📱 Opening Google Pay URL...');
        await Linking.openURL(result.passUrl);
      } else {
        throw new Error('Cannot open Google Pay URL on this device');
      }

      console.log('✅ Google Pay pass opened successfully');
    } catch (error) {
      console.error('❌ Error adding Google Pay pass:', error);
      throw error;
    }
  }

  /**
   * Check if a specific pass exists in the wallet (iOS only)
   */
  async hasPassInWallet(serialNumber: string): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // This would require additional implementation
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error checking pass in wallet:', error);
      return false;
    }
  }
}

export default WalletPassService.getInstance();
