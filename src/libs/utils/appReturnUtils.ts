import { Linking, Platform } from 'react-native';
import { fromBase62 } from './deeplink.utils';

/**
 * Utility functions for enabling "Return to App" functionality
 * when users navigate to external apps (SMS, Phone, etc.)
 */

export class AppReturnUtils {
  private static APP_SCHEME = 'nolimitseradeals://';
  private static APP_NAME = 'NoLimit Sera';

  /**
   * Opens SMS app with "Return to App" breadcrumb support
   */
  static async sendSMSWithReturn(phoneNumbers: string[], message: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return this.sendSMSiOSWithReturn(phoneNumbers, message);
    } else {
      return this.sendSMSAndroid(phoneNumbers, message);
    }
  }

  /**
   * iOS SMS with "Return to App" breadcrumb
   */
  private static async sendSMSiOSWithReturn(phoneNumbers: string[], message: string): Promise<boolean> {
    try {
      const encodedMessage = encodeURIComponent(message);
      let smsUrl: string;

      if (phoneNumbers.length === 1) {
        // Single recipient with return support
        smsUrl = `sms:${phoneNumbers[0]}&body=${encodedMessage}`;
      } else {
        // Multiple recipients
        const recipients = phoneNumbers.join(',');
        smsUrl = `sms://open?addresses=${recipients}&body=${encodedMessage}`;
      }
      
      // Check if SMS can be opened
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (!canOpen) {
        throw new Error('SMS not supported on this device');
      }

      // Store return information before opening SMS
      await this.prepareForReturn();
      
      // Open Messages app - iOS will automatically show "Return to [App Name]"
      await Linking.openURL(smsUrl);
      
      return true;

    } catch (error) {
      console.error('❌ iOS SMS with Return Error:', error);
      return false;
    }
  }

  /**
   * Android SMS (no breadcrumb support, but still functional)
   */
  private static async sendSMSAndroid(phoneNumbers: string[], message: string): Promise<boolean> {
    try {
      const encodedMessage = encodeURIComponent(message);
      const recipients = phoneNumbers.join(';');
      const smsUrl = `sms:${recipients}?body=${encodedMessage}`;
      
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (!canOpen) {
        throw new Error('SMS not supported on this device');
      }

      await Linking.openURL(smsUrl);
      return true;

    } catch (error) {
      console.error('❌ Android SMS Error:', error);
      return false;
    }
  }

  /**
   * Prepares app for return navigation
   */
  private static async prepareForReturn(): Promise<void> {
    try {
      // You can add any pre-return logic here
      // For example, saving current state, analytics, etc.
      
      // The iOS breadcrumb will be shown automatically based on:
      // 1. CFBundleDisplayName in Info.plist
      // 2. The fact that our app opened the Messages app
      // 3. URL scheme registration in Info.plist
      
    } catch (error) {
      console.error('❌ Prepare for return error:', error);
    }
  }

  /**
   * Handles deep link when user returns to app
   */
  static handleAppReturn(url: string): void {
    console.log('🔗 AppReturnUtils handling URL:', url);
    
    // Handle shortened deal URLs: /d/:shortId
    const shortDealMatch = url.match(/\/d\/([a-zA-Z0-9]+)/);
    if (shortDealMatch) {
      const shortId = shortDealMatch[1];
      const dealId = fromBase62(shortId);
      console.log(`🔗 Decoded short ID "${shortId}" to deal ID "${dealId}"`);
      // The actual navigation is handled by React Navigation's linking config
    }
    
    // You can add specific logic here for when users return
    // For example, showing a success message, tracking analytics, etc.
    
    if (url.includes('sms-sent')) {
      // Could show a success message or update UI
    }
  }

  /**
   * Opens phone app with return support
   */
  static async makePhoneCallWithReturn(phoneNumber: string): Promise<boolean> {
    try {
      const phoneUrl = `tel:${phoneNumber}`;
      
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (!canOpen) {
        throw new Error('Phone calls not supported on this device');
      }

      await this.prepareForReturn();
      await Linking.openURL(phoneUrl);
      
      return true;

    } catch (error) {
      console.error('❌ Phone call error:', error);
      return false;
    }
  }

  /**
   * Opens email app with return support
   */
  static async sendEmailWithReturn(email: string, subject?: string, body?: string): Promise<boolean> {
    try {
      let emailUrl = `mailto:${email}`;
      
      const params = [];
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      
      if (params.length > 0) {
        emailUrl += `?${params.join('&')}`;
      }
      
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (!canOpen) {
        throw new Error('Email not supported on this device');
      }

      await this.prepareForReturn();
      await Linking.openURL(emailUrl);
      
      return true;

    } catch (error) {
      console.error('❌ Email error:', error);
      return false;
    }
  }
}

export default AppReturnUtils;