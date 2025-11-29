/**
 * Instagram OAuth Authentication Service
 * 
 * SETUP REQUIRED:
 * 1. Go to https://developers.facebook.com/apps
 * 2. Create a new app or use existing
 * 3. Add "Instagram Basic Display" product
 * 4. Configure OAuth Redirect URIs:
 *    - iOS: com.nolimitseradeals://oauth
 *    - Android: com.nolimitseradeals://oauth
 * 5. Get your Instagram App ID and App Secret
 * 6. Add to your .env file:
 *    INSTAGRAM_APP_ID=your_app_id
 *    INSTAGRAM_APP_SECRET=your_app_secret
 */

import { authorize, AuthConfiguration } from 'react-native-app-auth';
import { Platform } from 'react-native';
import Config from 'react-native-config';

interface InstagramUser {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}

interface InstagramAuthResponse {
  accessToken: string;
  user: InstagramUser;
}

class InstagramAuthService {
  private static instance: InstagramAuthService;

  private config: AuthConfiguration = {
    // Instagram uses Facebook's OAuth endpoints
    issuer: 'https://api.instagram.com',
    clientId: Config.INSTAGRAM_APP_ID || 'YOUR_INSTAGRAM_APP_ID',
    clientSecret: Config.INSTAGRAM_APP_SECRET || 'YOUR_INSTAGRAM_APP_SECRET',
    redirectUrl: Platform.select({
      ios: 'com.nolimitseradeals://oauth',
      android: 'com.nolimitseradeals://oauth',
    }) as string,
    scopes: ['user_profile', 'user_media'],
    serviceConfiguration: {
      authorizationEndpoint: 'https://api.instagram.com/oauth/authorize',
      tokenEndpoint: 'https://api.instagram.com/oauth/access_token',
    },
  };

  static getInstance(): InstagramAuthService {
    if (!InstagramAuthService.instance) {
      InstagramAuthService.instance = new InstagramAuthService();
    }
    return InstagramAuthService.instance;
  }

  /**
   * Initiate Instagram OAuth login flow
   */
  async login(): Promise<InstagramAuthResponse> {
    try {
      console.log('🔵 Starting Instagram OAuth flow...');
      console.log('🔵 Client ID:', this.config.clientId);
      console.log('🔵 Redirect URL:', this.config.redirectUrl);

      // Start OAuth flow
      const authState = await authorize(this.config);
      
      console.log('✅ Instagram OAuth successful');
      console.log('✅ Access token received:', authState.accessToken.substring(0, 20) + '...');

      // Get user profile with the access token
      const user = await this.getUserProfile(authState.accessToken);

      return {
        accessToken: authState.accessToken,
        user,
      };
    } catch (error) {
      console.error('❌ Instagram OAuth failed:', error);
      throw new Error(this.parseError(error));
    }
  }

  /**
   * Get Instagram user profile
   */
  private async getUserProfile(accessToken: string): Promise<InstagramUser> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram profile');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Failed to get Instagram profile:', error);
      throw error;
    }
  }

  /**
   * Parse OAuth error messages
   */
  private parseError(error: any): string {
    if (error.message) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Instagram authentication failed. Please try again.';
  }

  /**
   * Check if Instagram OAuth is configured
   */
  isConfigured(): boolean {
    return (
      this.config.clientId !== 'YOUR_INSTAGRAM_APP_ID' &&
      this.config.clientId !== '' &&
      this.config.clientSecret !== 'YOUR_INSTAGRAM_APP_SECRET' &&
      this.config.clientSecret !== ''
    );
  }
}

export default InstagramAuthService.getInstance();
