import ApiService from './api.service';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SendSMS from 'react-native-sms';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import AppReturnUtils from '../libs/utils/appReturnUtils';
import { uuidToBase62 } from '../libs/utils/deeplink.utils';
import { apiConfig } from '../libs/utils/api.utils';

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

      // Get deal image URL
      const dealImageUrl = this.getDealImageUrl(dealInfo);

      // Use react-native-share for MMS with image attachments
      return await this.sendMMSWithShare(cleanedNumbers, message, dealImageUrl);
    } catch (error) {
      console.error('❌ MMS Method Error:', error);
      return false;
    }
  }

  /**
   * Send MMS with image attachment by downloading image locally
   * Opens share sheet with Messages, including both text and image
   */
  private async sendMMSWithShare(
    phoneNumbers: string[],
    message: string,
    imageUrl: string | null,
  ): Promise<boolean> {
    try {
      console.log('📤 Sending MMS via share sheet...');
      console.log('📱 Recipients:', phoneNumbers);
      console.log('📸 Image URL:', imageUrl);

      let localImagePath: string | null = null;

      // Download image to local storage if URL exists
      if (imageUrl) {
        try {
          console.log('⬇️ Downloading image for MMS...');
          const filename = `deal_image_${Date.now()}.jpg`;
          const downloadPath = `${RNFS.CachesDirectoryPath}/${filename}`;

          const downloadResult = await RNFS.downloadFile({
            fromUrl: imageUrl,
            toFile: downloadPath,
          }).promise;

          if (downloadResult.statusCode === 200) {
            localImagePath = `file://${downloadPath}`;
            console.log('✅ Image downloaded:', localImagePath);
          } else {
            console.warn(
              '⚠️ Image download failed with status:',
              downloadResult.statusCode,
            );
          }
        } catch (downloadError) {
          console.error('❌ Failed to download image:', downloadError);
          // Continue without image
        }
      }

      // Build share options with local image
      const shareOptions: any = {
        title: 'Share Deal via Messages',
        message: message,
      };

      // Add local image file if downloaded
      if (localImagePath) {
        shareOptions.url = localImagePath;
        shareOptions.type = 'image/jpeg';
        console.log('📎 Attaching image to share');
      }

      // iOS: Try to suggest Messages app
      if (Platform.OS === 'ios') {
        shareOptions.social = Share.Social.SMS;

        // Pre-fill recipients if possible
        if (phoneNumbers.length > 0) {
          shareOptions.recipient = phoneNumbers.join(',');
        }
      }

      console.log('📤 Opening share sheet...');

      // Open share sheet
      const result = await Share.open(shareOptions);

      console.log('✅ Share completed:', result);

      // Clean up downloaded image
      if (localImagePath) {
        try {
          const cleanPath = localImagePath.replace('file://', '');
          await RNFS.unlink(cleanPath);
          console.log('🗑️ Cleaned up temporary image');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup image:', cleanupError);
        }
      }

      return true;
    } catch (error: any) {
      console.log('📤 Share interaction:', error);

      // User dismissed - this is normal, not an error
      if (
        error.message &&
        (error.message.includes('User did not share') ||
          error.message.includes('cancelled'))
      ) {
        console.log('ℹ️ User cancelled share sheet');
        return false;
      }

      // Actual error
      console.error('❌ Share error:', error);
      Alert.alert('Sharing Failed', 'Could not share deal. Please try again.', [
        { text: 'OK' },
      ]);
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

    // Encode UUID to base62 for shorter URLs
    const shortId = uuidToBase62(dealId);
    console.log(`🔗 Base62 encoded: ${dealId} → ${shortId}`);

    // Use environment-based base URL (staging.fribee.io or fribee.io)
    const webBaseUrl = apiConfig.baseURL;
    console.log(
      `🌐 Using base URL: ${webBaseUrl} (environment: ${apiConfig.environment})`,
    );

    const appLink = `nolimitseradeals://deal/${shortId}`;
    const webLink = `${webBaseUrl}/deal/${shortId}`;

    // Extract deal image URL from multiple possible sources
    const dealImageUrl = this.getDealImageUrl(dealInfo);

    // Business name
    const businessName =
      dealInfo.business_name || dealInfo.business || 'this business';

    // Description
    const description = dealInfo.description || dealInfo.descrption || '';

    // Get discount/deal info if available
    const discount = dealInfo.discount || dealInfo.offer || '';
    const expiryDate = dealInfo.expires || dealInfo.expiry || '';

    // Build professional SMS message with sections
    let message = `✨ You've been sent an exclusive deal!\n\n`;

    // Deal headline
    message += `🎉 ${businessName}\n`;

    // Discount/offer highlight
    if (discount) {
      message += `💰 ${discount}\n\n`;
    } else {
      message += `\n`;
    }

    // Deal description
    if (description) {
      message += `📌 ${description}\n`;
    }

    // Expiry info
    if (expiryDate) {
      message += `⏰ Expires: ${expiryDate}\n`;
    }

    message += `\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // CTA Section with rich preview
    message += `📸 See the full deal with photo:\n`;
    message += `${webLink}\n\n`;

    // App download CTA
    message += `📱 Open in Fribee App:\n`;
    message += `${appLink}\n\n`;

    // Fribee branding footer - professional
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🐝 NoLimit Sera Deals\n`;
    message += `Share deals. Unlock savings.\n`;
    message += `Join millions discovering local deals!`;

    return message;
  }

  /**
   * Extract the best available image URL from deal data
   */
  private getDealImageUrl(dealInfo: any): string | null {
    // Try deal_images array first (preferred)
    if (
      dealInfo.deal_images &&
      Array.isArray(dealInfo.deal_images) &&
      dealInfo.deal_images.length > 0
    ) {
      const firstImage = dealInfo.deal_images[0];
      if (
        firstImage &&
        typeof firstImage === 'object' &&
        firstImage.image_url
      ) {
        return firstImage.image_url;
      }
    }

    // Try direct deal image URL properties
    if (
      dealInfo.deal_image_url &&
      typeof dealInfo.deal_image_url === 'string'
    ) {
      return dealInfo.deal_image_url;
    }

    if (dealInfo.image_url && typeof dealInfo.image_url === 'string') {
      return dealInfo.image_url;
    }

    // Try generic images array
    if (
      dealInfo.images &&
      Array.isArray(dealInfo.images) &&
      dealInfo.images.length > 0
    ) {
      const firstImage = dealInfo.images[0];
      if (typeof firstImage === 'string') {
        return firstImage;
      }
      if (typeof firstImage === 'object' && firstImage.image_url) {
        return firstImage.image_url;
      }
    }

    // Fall back to business images if no deal images available
    if (
      dealInfo.business_images &&
      Array.isArray(dealInfo.business_images) &&
      dealInfo.business_images.length > 0
    ) {
      const firstImage = dealInfo.business_images[0];
      if (
        firstImage &&
        typeof firstImage === 'object' &&
        firstImage.image_url
      ) {
        return firstImage.image_url;
      }
    }

    return null;
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
