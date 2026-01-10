import ApiService from './api.service';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SendSMS from 'react-native-sms';
import AppReturnUtils from '../libs/utils/appReturnUtils';

interface Contact {
  recordID: string;
  displayName: string;
  givenName: string | null;
  familyName: string;
  middleName: string;
  company: string | null;
  phoneNumbers: Array<{
    label: string;
    number: string;
  }>;
  emailAddresses: Array<{
    label: string;
    email: string;
  }>;
  [key: string]: any; // For additional properties from react-native-contacts
}

interface ShareProgress {
  dealId: string;
  currentShares: number;
  requiredShares: number;
  canRedeem: boolean;
  progress: number;
}

class DealSharingService {
  private static instance: DealSharingService;

  static getInstance(): DealSharingService {
    if (!DealSharingService.instance) {
      DealSharingService.instance = new DealSharingService();
    }
    return DealSharingService.instance;
  }

  async checkContactsPermissionStatus(): Promise<
    'granted' | 'denied' | 'blocked' | 'unavailable'
  > {
    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CONTACTS
          : PERMISSIONS.ANDROID.READ_CONTACTS;

      const result = await check(permission);

      switch (result) {
        case RESULTS.GRANTED:
          return 'granted';
        case RESULTS.DENIED:
          return 'denied';
        case RESULTS.BLOCKED:
          return 'blocked';
        case RESULTS.UNAVAILABLE:
          return 'unavailable';
        default:
          return 'denied';
      }
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      console.error('❌ Error details:', JSON.stringify(error));

      // Show alert for permission handler error
      Alert.alert(
        'Permission Handler Error',
        `Could not check contacts permission: ${
          error instanceof Error ? error.message : String(error)
        }. Please ensure the app is properly built with permission handlers.`,
        [{ text: 'OK' }],
      );

      return 'unavailable';
    }
  }

  async requestContactsPermission(): Promise<boolean> {
    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CONTACTS
          : PERMISSIONS.ANDROID.READ_CONTACTS;

      const result = await request(permission);

      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      Alert.alert(
        'Permission Error',
        'Could not request contacts permission. Please check your settings.',
        [{ text: 'OK' }],
      );
      return false;
    }
  }

  async loadContacts(): Promise<Contact[]> {
    try {
      // Check permission first
      const permissionStatus = await this.checkContactsPermissionStatus();
      if (permissionStatus !== 'granted') {
        return [];
      }

      // Load real contacts using react-native-contacts
      const contacts = await Contacts.getAll();

      // Filter contacts that have phone numbers
      const contactsWithPhones = contacts.filter(
        contact => contact.phoneNumbers && contact.phoneNumbers.length > 0,
      );

      if (contactsWithPhones.length > 0) {
      }

      // Transform contacts to ensure displayName is available
      const transformedContacts = contactsWithPhones.map(contact => ({
        ...contact,
        displayName:
          contact.displayName ||
          `${contact.givenName || ''} ${contact.familyName || ''}`.trim() ||
          contact.givenName ||
          contact.familyName ||
          'Unknown Contact',
      }));

      // Sort contacts alphabetically by displayName
      const sortedContacts = transformedContacts.sort((a, b) => {
        const nameA = a.displayName.toLowerCase();
        const nameB = b.displayName.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      if (sortedContacts.length > 0) {
      }

      // Return the sorted contacts
      return sortedContacts;
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      Alert.alert(
        'Error Loading Contacts',
        'Could not load your contacts. Please check your permissions.',
        [{ text: 'OK' }],
      );
      return [];
    }
  }

  async shareWithContacts(
    dealId: string,
    selectedContacts: Contact[],
    dealInfo: any,
  ): Promise<boolean> {
    try {
      // Create SMS content
      const shareMessage = this.createShareMessage(dealInfo);

      // Extract and clean phone numbers
      const phoneNumbers = selectedContacts
        .map(contact => contact.phoneNumbers[0]?.number)
        .filter(number => number)
        .map(number => number.replace(/[^\d+]/g, '')); // Clean phone numbers

      if (phoneNumbers.length === 0) {
        Alert.alert(
          'No Valid Phone Numbers',
          'Selected contacts do not have valid phone numbers.',
          [{ text: 'OK' }],
        );
        return false;
      }

      // Send SMS via native SMS composer
      const smsSuccess = await this.sendSMSViaAPI(
        phoneNumbers,
        shareMessage,
        dealInfo,
      );

      if (smsSuccess) {
        // Track the shares locally
        await this.trackShares(dealId, selectedContacts.length);

        // Check if deal is now unlocked and call API endpoint if so
        const key = `shares_${dealId}`;
        const sharesString = await AsyncStorage.getItem(key);
        const currentShares = sharesString ? parseInt(sharesString, 10) : 0;
        const requiredShares = dealInfo?.min_shares_required || 3;

        try {
          console.log('📣 Deal unlocked locally, calling trackDealUnlocked', {
            dealId,
            currentShares,
          });
          await ApiService.trackDealUnlocked(dealId, currentShares);
        } catch (err) {
          console.warn('⚠️ Failed to call trackDealUnlocked API:', err);
        }

        Alert.alert(
          'SMS Sent Successfully!',
          `Deal shared with ${selectedContacts.length} contacts via your device's SMS app!`,
          [{ text: 'OK' }],
        );

        return true;
      } else {
        Alert.alert(
          'SMS Not Sent',
          'SMS was not sent. You can try again to share this deal and unlock it.',
          [{ text: 'OK' }],
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Error sharing with contacts:', error);
      Alert.alert(
        'Sharing Failed',
        'Could not share the deal. Please try again.',
        [{ text: 'OK' }],
      );
      return false;
    }
  }

  private async sendSMSViaAPI(
    phoneNumbers: string[],
    message: string,
    dealInfo: any,
  ): Promise<boolean> {
    try {
      if (phoneNumbers.length === 0) {
        console.error('❌ No phone numbers provided');
        return false;
      }

      // Clean and validate phone numbers
      const cleanedNumbers = phoneNumbers
        .map(num => num.replace(/[^\d+\-\(\)\s]/g, '')) // Keep digits, +, -, (), spaces
        .map(num => num.trim())
        .filter(num => num.length >= 7); // Minimum phone number length

      if (cleanedNumbers.length === 0) {
        console.error('❌ No valid phone numbers after cleaning');
        Alert.alert(
          'Invalid Phone Numbers',
          'None of the selected contacts have valid phone numbers.',
          [{ text: 'OK' }],
        );
        return false;
      }

      // Use AppReturnUtils for SMS with "Return to App" breadcrumb support
      return await AppReturnUtils.sendSMSWithReturn(cleanedNumbers, message);
    } catch (error) {
      console.error('❌ SMS Method Error:', error);
      return false;
    }
  }

  private async sendSMSiOS(
    phoneNumbers: string[],
    message: string,
  ): Promise<boolean> {
    try {
      // Create SMS URL for iOS
      const encodedMessage = encodeURIComponent(message);
      let smsUrl: string;

      if (phoneNumbers.length === 1) {
        // Single recipient - most reliable format
        smsUrl = `sms:${phoneNumbers[0]}&body=${encodedMessage}`;
      } else {
        // Multiple recipients - iOS format
        const recipients = phoneNumbers.join(',');
        smsUrl = `sms://open?addresses=${recipients}&body=${encodedMessage}`;

        // Alternative format for iOS if the above doesn't work
        if (!(await Linking.canOpenURL(smsUrl))) {
          smsUrl = `sms:${recipients}&body=${encodedMessage}`;
        }
      }

      // Check if SMS URL can be opened
      const canOpen = await Linking.canOpenURL(smsUrl);

      if (!canOpen) {
        throw new Error('SMS URL scheme not supported');
      }

      // Open iOS Messages app
      await Linking.openURL(smsUrl);

      // On iOS with Linking, we assume success since the Messages app opened
      return true;
    } catch (error) {
      console.error('❌ iOS SMS Error:', error);

      // Fallback to react-native-sms for iOS if Linking fails
      return await this.sendSMSAndroid(phoneNumbers, message);
    }
  }

  private async sendSMSAndroid(
    phoneNumbers: string[],
    message: string,
  ): Promise<boolean> {
    return new Promise(resolve => {
      try {
        SendSMS.send(
          {
            body: message,
            recipients: phoneNumbers,
            allowAndroidSendWithoutReadPermission: true,
          },
          (completed: boolean, cancelled: boolean, error: boolean) => {
            if (completed) {
              resolve(true);
            } else if (cancelled) {
              resolve(false);
            } else if (error) {
              resolve(false);
            } else {
              resolve(false);
            }
          },
        );
      } catch (sendError) {
        console.error('❌ react-native-sms Error:', sendError);
        Alert.alert(
          'SMS Error',
          'Could not open SMS composer. Please check your device settings.',
          [{ text: 'OK' }],
        );
        resolve(false);
      }
    });
  }

  private createShareMessage(dealInfo: any): string {
    const dealId = dealInfo.id || dealInfo.deal_id || '';
    console.log(`🔗 Creating share message for deal ID: ${dealId}`);
    
    // Use full deal ID in URLs (UUIDs can't be base62 encoded)
    const appLink = `nolimitseradeals://deal/${dealId}`;
    const webLink = `https://fribee.io/deal/${dealId}`;
    
    return `🎉 Check out this amazing deal at ${
      dealInfo.business_name || dealInfo.business
    }!\n\n${
      dealInfo.description || dealInfo.descrption
    }\n\nOpen in app: ${appLink}\nView in browser: ${webLink}`;
  }

  private async trackShares(dealId: string, shareCount: number): Promise<void> {
    try {
      const key = `shares_${dealId}`;
      const existingShares = await AsyncStorage.getItem(key);
      const currentShares = existingShares ? parseInt(existingShares, 10) : 0;
      const newTotal = currentShares + shareCount;

      await AsyncStorage.setItem(key, newTotal.toString());
    } catch (error) {
      console.error('❌ Error tracking shares:', error);
    }
  }

  async getShareProgress(
    dealId: string,
    requiredShares: number = 3,
  ): Promise<ShareProgress> {
    try {
      const key = `shares_${dealId}`;
      const sharesString = await AsyncStorage.getItem(key);
      const currentShares = sharesString ? parseInt(sharesString, 10) : 0;

      return {
        dealId,
        currentShares,
        requiredShares,
        canRedeem: currentShares >= requiredShares,
        progress: Math.min(currentShares / requiredShares, 1),
      };
    } catch (error) {
      console.error('❌ Error getting share progress:', error);
      return {
        dealId,
        currentShares: 0,
        requiredShares,
        canRedeem: false,
        progress: 0,
      };
    }
  }
}

export default DealSharingService.getInstance();
