import ApiService from './api.service';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendSMSWithShareMenu } from 'react-native-sms-share';
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

      console.log('📱 Platform:', Platform.OS);
      console.log('📞 Cleaned phone numbers:', cleanedNumbers);
      console.log('💬 Message:', message.substring(0, 100) + '...');
      console.log('🖼️ Deal image URL:', dealImageUrl);

      // Send MMS with image attachment
      if (Platform.OS === 'ios') {
        return await this.sendMMS_iOS(cleanedNumbers, message, dealImageUrl);
      } else {
        return await this.sendMMS_Android(
          cleanedNumbers,
          message,
          dealImageUrl,
        );
      }
    } catch (error) {
      console.error('❌ SMS Method Error:', error);
      return false;
    }
  }

  private async sendSMSiOS(
    phoneNumbers: string[],
    message: string,
    imageUrl: string | null,
  ): Promise<boolean> {
    try {
      console.log('📱 iOS: Using native URL scheme for SMS');

      // Try react-native-sms first
      return await this.sendMMS_iOS(phoneNumbers, message, imageUrl);
    } catch (error) {
      console.error('❌ iOS SMS Error:', error);
      return false;
    }
  }

  private async sendSMSAndroid(
    phoneNumbers: string[],
    message: string,
    imageUrl: string | null,
  ): Promise<boolean> {
    try {
      console.log('🤖 Android: Using SendSMS for MMS');

      return await this.sendMMS_Android(phoneNumbers, message, imageUrl);
    } catch (error) {
      console.error('❌ Android SMS Error:', error);
      return false;
    }
  }

  /**
   * iOS: Send SMS via native share menu using Turbo Module
   * Allows users to choose between Messages, Mail, iMessage, and other apps
   */
  private async sendMMS_iOS(
    phoneNumbers: string[],
    message: string,
    imageUrl: string | null,
  ): Promise<boolean> {
    try {
      const imageUris: string[] = [];

      // Download image if available
      if (imageUrl) {
        try {
          console.log('⬇️ [iOS] Downloading image for share...');
          const filename = `deal_image_${Date.now()}.jpg`;
          const downloadPath = `${RNFS.CachesDirectoryPath}/${filename}`;

          const downloadResult = await RNFS.downloadFile({
            fromUrl: imageUrl,
            toFile: downloadPath,
          }).promise;

          if (downloadResult.statusCode === 200) {
            imageUris.push(`file://${downloadPath}`);
            console.log('✅ [iOS] Image downloaded:', downloadPath);
          }
        } catch (downloadError) {
          console.error('❌ [iOS] Failed to download image:', downloadError);
          // Continue without image
        }
      }

      console.log('📤 [iOS] Calling sendSMSWithShareMenu with Turbo Module');
      console.log('📞 Phone numbers:', phoneNumbers);
      console.log('📎 Image URIs:', imageUris);

      // Use the Turbo Module share menu to allow users to choose Messages, Mail, iMessage, etc.
      const result = await sendSMSWithShareMenu({
        phoneNumbers: phoneNumbers.join(','),
        message: message,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
      });

      console.log('✅ [iOS] sendSMSWithShareMenu result:', result);

      // Clean up downloaded images
      if (imageUris.length > 0) {
        imageUris.forEach(uri => {
          try {
            const cleanPath = uri.replace('file://', '');
            RNFS.unlink(cleanPath).catch(() => {});
          } catch (e) {
            // ignore cleanup errors
          }
        });
      }

      return result?.sent === true;
    } catch (error) {
      console.error('❌ [iOS] sendSMSWithShareMenu error:', error);
      console.error(
        '❌ [iOS] Error details:',
        error instanceof Error ? error.message : String(error),
      );
      Alert.alert(
        'Sharing Error',
        'Could not open share menu. Please try again.',
        [{ text: 'OK' }],
      );
      return false;
    }
  }

  /**
   * Android: Send MMS using react-native-sms-share Turbo Module
   */
  private async sendMMS_Android(
    phoneNumbers: string[],
    message: string,
    imageUrl: string | null,
  ): Promise<boolean> {
    try {
      const imageUris: string[] = [];

      // Download image if available
      if (imageUrl) {
        try {
          console.log('⬇️ [Android] Downloading image for MMS...');
          const filename = `deal_image_${Date.now()}.jpg`;
          const downloadPath = `${RNFS.CachesDirectoryPath}/${filename}`;

          const downloadResult = await RNFS.downloadFile({
            fromUrl: imageUrl,
            toFile: downloadPath,
          }).promise;

          if (downloadResult.statusCode === 200) {
            imageUris.push(`file://${downloadPath}`);
            console.log('✅ [Android] Image downloaded:', downloadPath);
          }
        } catch (downloadError) {
          console.error(
            '❌ [Android] Failed to download image:',
            downloadError,
          );
          // Continue without image
        }
      }

      console.log('📤 [Android] Calling sendSMSWithShareMenu with Turbo Module');
      console.log('📞 Phone numbers:', phoneNumbers);
      console.log('📎 Image URIs:', imageUris);

      // Use the Turbo Module share menu to allow users to choose SMS, email, iMessage, etc.
      const result = await sendSMSWithShareMenu({
        phoneNumbers: phoneNumbers.join(','),
        message: message,
        imageUris: imageUris.length > 0 ? imageUris : undefined,
      });

      console.log('✅ [Android] sendSMSWithShareMenu result:', result);

      // Clean up downloaded images
      if (imageUris.length > 0) {
        imageUris.forEach(uri => {
          try {
            const cleanPath = uri.replace('file://', '');
            RNFS.unlink(cleanPath).catch(() => {});
          } catch (e) {
            // ignore cleanup errors
          }
        });
      }

      return result?.sent === true;
    } catch (error) {
      console.error('❌ [Android] sendSMS error:', error);
      Alert.alert('SMS Error', 'Could not send SMS. Please try again.', [
        { text: 'OK' },
      ]);
      return false;
    }
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
