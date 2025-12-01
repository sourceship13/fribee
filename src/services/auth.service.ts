// src/services/auth.service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import ApiConfig from '../libs/utils/api.utils';
import { getDeviceId, getDeviceInfo, DeviceInfoData } from '../libs/utils/deviceInfo';

const API_BASE_URL = ApiConfig.apiURL;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  username?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  account_type: 'regular' | 'premium' | 'business';
  is_verified: boolean;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  errors?: any[];
}

class AuthService {
  private refreshPromise: Promise<string> | null = null;
  // Add in-memory token cache
  private accessTokenCache: string | null = null;
  private refreshTokenCache: string | null = null;

  // Helper method for fetch requests
  private async fetchWithConfig(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const accessToken = await this.getAccessToken();
    
    // Don't set Content-Type if body is FormData - let fetch set it with boundary
    const isFormData = options.body instanceof FormData;
    
    const headers: Record<string, string> = {
      ...(!isFormData && { 'Content-Type': 'application/json' }), // Only set for non-FormData
      ...options.headers as Record<string, string>,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };

    console.log('🌐 Making request to:', url);
    console.log('🔑 Using access token:', accessToken ? 'YES (length: ' + accessToken.length + ')' : 'NO');
    console.log('📦 Request body type:', isFormData ? 'FormData' : 'JSON');
    
    const response = await fetch(url, { ...options, headers });
    
    return response;
  }

  // Helper to handle API responses
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let error: any;
      
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        error = { error: await response.text() };
      }
      
      throw new Error(error.error || error.message || 'Request failed');
    }

    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as any;
  }

  // Store tokens securely
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      console.log('🔐 Storing tokens...');
      
      // CRITICAL: Update cache immediately
      this.accessTokenCache = tokens.accessToken;
      this.refreshTokenCache = tokens.refreshToken;
      console.log('✅ Tokens cached in memory');
      
      // Store access token in AsyncStorage (for quick access)
      await AsyncStorage.setItem('accessToken', tokens.accessToken);
      console.log('✅ Access token stored in AsyncStorage');

      // Store refresh token in AsyncStorage as primary storage
      await AsyncStorage.setItem('refreshToken_backup', tokens.refreshToken);
      console.log('✅ Refresh token stored in AsyncStorage');
      
      // Try to store refresh token in Keychain (more secure, but can fail)
      try {
        await Keychain.setInternetCredentials(
          'org.sera.dev.nolimitsera',
          'refreshToken',
          tokens.refreshToken
        );
        console.log('✅ Refresh token also stored in Keychain');
      } catch (keychainError) {
        console.warn('⚠️ Could not store refresh token in Keychain (will use AsyncStorage):', keychainError);
      }

      // Verify the tokens were stored successfully
      const verifyRefresh = await AsyncStorage.getItem('refreshToken_backup');
      const verifyAccess = await AsyncStorage.getItem('accessToken');
      
      if (!verifyRefresh || !verifyAccess) {
        console.error('❌ Token verification failed after storage!');
        throw new Error('Failed to verify token storage');
      }
      
      console.log('✅ Token storage verified successfully');
    } catch (error) {
      console.error('❌ Error storing tokens:', error);
      // Clear cache on error
      this.accessTokenCache = null;
      this.refreshTokenCache = null;
      throw error;
    }
  }

  // Get access token - check cache first, then storage
  private async getAccessToken(): Promise<string | null> {
    try {
      // Check cache first
      if (this.accessTokenCache) {
        console.log('✅ Access token retrieved from cache');
        return this.accessTokenCache;
      }
      
      // Fall back to storage
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        // Update cache
        this.accessTokenCache = token;
        console.log('✅ Access token retrieved from storage and cached');
      }
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Retrieve refresh token with retry and fallback logic
  async getRefreshToken(): Promise<string | null> {
    // Check cache first
    if (this.refreshTokenCache) {
      console.log('✅ Refresh token retrieved from cache');
      return this.refreshTokenCache;
    }
    
    // Small delay to ensure AsyncStorage is ready (especially after app resume)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 50));
    
    // Try AsyncStorage first (primary storage, more reliable)
    try {
      console.log('🔑 Attempting to get refresh token from AsyncStorage...');
      const token = await AsyncStorage.getItem('refreshToken_backup');
      
      if (token) {
        console.log('✅ Refresh token retrieved from AsyncStorage');
        // Update cache
        this.refreshTokenCache = token;
        return token;
      }
      
      console.warn('⚠️ No refresh token found in AsyncStorage');
    } catch (error) {
      console.error('❌ Error retrieving refresh token from AsyncStorage:', error);
    }

    // Fallback to Keychain with retries
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 300;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔑 Attempting to get refresh token from Keychain (attempt ${attempt}/${MAX_RETRIES})...`);
        const credentials = await Keychain.getInternetCredentials('org.sera.dev.nolimitsera');
        
        if (credentials && credentials.password) {
          console.log('✅ Refresh token retrieved from Keychain');
          
          // Update cache
          this.refreshTokenCache = credentials.password;
          
          // Restore to AsyncStorage for reliability
          try {
            await AsyncStorage.setItem('refreshToken_backup', credentials.password);
            console.log('✅ Refresh token restored to AsyncStorage from Keychain');
          } catch (restoreError) {
            console.warn('⚠️ Could not restore token to AsyncStorage:', restoreError);
          }
          
          return credentials.password;
        }
        
        console.warn(`⚠️ No credentials found in Keychain (attempt ${attempt}/${MAX_RETRIES})`);
        
        // Wait before retry
        if (attempt < MAX_RETRIES) {
          await new Promise<void>(resolve => setTimeout(() => resolve(), RETRY_DELAY_MS * attempt));
        }
      } catch (error) {
        console.error(`❌ Error retrieving refresh token from Keychain (attempt ${attempt}/${MAX_RETRIES}):`, error);
        
        // Wait before retry
        if (attempt < MAX_RETRIES) {
          await new Promise<void>(resolve => setTimeout(() => resolve(), RETRY_DELAY_MS * attempt));
        }
      }
    }

    console.error('❌ No refresh token found in any storage location');
    return null;
  }

  // Clear stored tokens
  async clearTokens(): Promise<void> {
    try {
      console.log('🧹 Clearing all tokens...');
      
      // Clear cache immediately
      this.accessTokenCache = null;
      this.refreshTokenCache = null;
      console.log('✅ Token cache cleared');
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken_backup');
      console.log('✅ AsyncStorage tokens cleared');
      
      // Clear Keychain
      try {
        await Keychain.resetInternetCredentials('org.sera.dev.nolimitsera');
        console.log('✅ Keychain tokens cleared');
      } catch (keychainError) {
        console.warn('⚠️ Could not clear Keychain (may not exist):', keychainError);
      }
      
      // Verify tokens were cleared
      const verifyRefresh = await AsyncStorage.getItem('refreshToken_backup');
      const verifyAccess = await AsyncStorage.getItem('accessToken');
      
      if (verifyRefresh || verifyAccess) {
        console.error('❌ Token clearing verification failed!');
      } else {
        console.log('✅ Token clearing verified successfully');
      }
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
      throw error;
    }
  }

  // Debug method to check token status
  async checkTokenStatus(): Promise<void> {
    console.log('🔍 Checking token status...');
    console.log('Cache status:');
    console.log('  - Access token in cache:', !!this.accessTokenCache);
    console.log('  - Refresh token in cache:', !!this.refreshTokenCache);
    
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken_backup');
    
    console.log('Storage status:');
    console.log('  - Access token in AsyncStorage:', !!accessToken);
    console.log('  - Refresh token in AsyncStorage:', !!refreshToken);
    
    try {
      const keychainCreds = await Keychain.getInternetCredentials('org.sera.dev.nolimitsera');
      console.log('  - Refresh token in Keychain:', !!(keychainCreds && keychainCreds.password));
    } catch (error) {
      console.log('  - Keychain check failed:', error);
    }
  }

  // Public method for making authenticated requests with automatic token refresh
  public async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    
    try {
      // First attempt with current token
      const response = await this.fetchWithConfig(url, options);
      
      // If not 401, return the response
      if (response.status !== 401) {
        return response;
      }

      console.log('⚠️ Got 401, attempting token refresh...');
      
      // If 401, try to refresh token
      const newAccessToken = await this.refreshAccessToken();
      
      console.log('✅ Token refreshed, retrying request...');
      
      // Don't set Content-Type if body is FormData - let fetch set it with boundary
      const isFormData = options.body instanceof FormData;
      
      // Retry with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...(!isFormData && { 'Content-Type': 'application/json' }), // Only set for non-FormData
          'Authorization': `Bearer ${newAccessToken}`,
        },
      });

      return retryResponse;
    } catch (error) {
      console.error(`❌ AuthService.makeAuthenticatedRequest: Error:`, error);
      
      // If refresh failed, clear tokens and throw
      if (error instanceof Error && (error.message.includes('refresh') || error.message.includes('No refresh token'))) {
        await this.clearTokens();
      }
      throw error;
    }
  }

  // Make authenticated request with automatic token refresh
  private async authenticatedRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // First attempt
      const response = await this.fetchWithConfig(url, options);
      
      // If not 401, return the response
      if (response.status !== 401) {
        return this.handleResponse<T>(response);
      }

      console.log('⚠️ Got 401, attempting token refresh...');
      
      // If 401, try to refresh token
      const newAccessToken = await this.refreshAccessToken();
      
      console.log('✅ Token refreshed, retrying request...');
      
      // Retry with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAccessToken}`,
        },
      });

      return this.handleResponse<T>(retryResponse);
    } catch (error) {
      // If refresh failed, clear tokens and throw
      if (error instanceof Error && error.message.includes('refresh')) {
        await this.clearTokens();
      }
      throw error;
    }
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<string> {
    console.log('🔄 refreshAccessToken called');
    
    // Prevent multiple simultaneous refresh calls
    if (this.refreshPromise) {
      console.log('⏳ Refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();
        if (!refreshToken) {
          console.error(`❌ AuthService.refreshAccessToken: No refresh token found in storage`);
          await this.clearTokens();
          throw new Error('No refresh token available');
        }
        
        console.log('📤 Sending refresh request with token length:', refreshToken.length);
        
        // Get device information for refresh request
        const deviceInfo = await getDeviceInfo();
        
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            refreshToken,
            deviceInfo: {
              platform: deviceInfo.platform,
              appVersion: deviceInfo.appVersion,
            },
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`❌ AuthService.refreshAccessToken: Refresh failed with status ${response.status}: ${errorData}`);
          await this.clearTokens();
          throw new Error(`Token refresh failed: ${response.status} - ${errorData}`);
        }
        
        const data = await response.json();
        const { accessToken, refreshToken: newRefreshToken } = data;
        
        if (!accessToken) {
          console.error(`❌ AuthService.refreshAccessToken: No access token in refresh response`);
          await this.clearTokens();
          throw new Error('Invalid refresh response: missing access token');
        }
        
        console.log('✅ Received new tokens from server');
        console.log('📥 New access token length:', accessToken.length);
        
        // Store tokens (this will update the cache immediately)
        await this.storeTokens({
          accessToken,
          refreshToken: newRefreshToken || refreshToken,
        });
        
        console.log('✅ Token refresh completed successfully');
        console.log('🔑 Cache now contains access token:', !!this.accessTokenCache);
        
        return accessToken;
      } catch (error) {
        console.error(`💥 AuthService.refreshAccessToken: Token refresh failed:`, error);
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Public method to proactively refresh tokens (for app state changes, etc.)
  public async proactiveTokenRefresh(): Promise<void> {
    try {
      console.log('🔄 Proactive token refresh initiated (app foreground)...');
      
      // Add delay to ensure AsyncStorage is ready after app resume from background
      await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
      
      // Check if we have tokens (check cache first, then storage)
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      if (!accessToken || !refreshToken) {
        console.log('⚠️ No tokens found for proactive refresh - user may not be logged in');
        return;
      }
      
      console.log('✅ Tokens found, proceeding with proactive refresh...');
      console.log('🔑 Current access token cached:', !!this.accessTokenCache);
      
      // Attempt to refresh
      const newAccessToken = await this.refreshAccessToken();
      
      console.log('✅ Proactive token refresh completed successfully');
      console.log('🔑 New access token received and cached:', !!newAccessToken);
    } catch (error) {
      console.error(`❌ AuthService.proactiveTokenRefresh: Proactive refresh failed:`, error);
      // Don't throw - this is a background operation
    }
  }

  async verifyCode(identifier: string, code: string) {
    try {
      const url = `${API_BASE_URL}/auth/verify-code`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          code
        }),
      });

      const text = await response.text();
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      return result;
    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    }
  }

  async resendVerificationCode(identifier: string) {
    try {
      const url = `${API_BASE_URL}/auth/resend-code`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend code');
      }

      return result;
    } catch (error) {
      console.error('Resend error:', error);
      throw error;
    }
  }

  async register(data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  }) {
    try {
      const url = `${API_BASE_URL}/auth/register`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const responseText = await response.text();
      
      // Check if it's HTML
      if (responseText.startsWith('<')) {
        console.error('Received HTML instead of JSON:', responseText.substring(0, 200));
        throw new Error('Server error - received HTML instead of JSON. Check if backend is running.');
      }
      
      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }
      
      // Check if the request was successful
      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(
    credentials: {
      email?: string;
      phone_number?: string;
      username?: string;
      password: string;
    },
    pushToken?: string
  ): Promise<User> {
    try {
      // Get device information
      const deviceInfo = await getDeviceInfo(pushToken);
      const deviceId = await getDeviceId();

      // Prepare the request payload
      const payload = {
        ...credentials,
        deviceInfo,
      };

      console.log('📤 Sending login request with device info:', {
        hasEmail: !!credentials.email,
        hasPhone: !!credentials.phone_number,
        hasUsername: !!credentials.username,
        platform: deviceInfo.platform,
        deviceName: deviceInfo.deviceName,
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion,
        hasPushToken: !!deviceInfo.pushToken,
        deviceId,
      });

      // Log the full payload being sent
      console.log('📦 Full login payload:', JSON.stringify(payload, null, 2));
      console.log('🌐 API endpoint:', `${API_BASE_URL}/auth/login`);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Login response status:', response.status);
      console.log('📥 Login response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ AuthService.login: Error response:`, errorText);
        
        let errorObj;
        try {
          errorObj = JSON.parse(errorText);
        } catch {
          errorObj = { error: errorText };
        }
        
        throw new Error(errorObj.error || errorObj.message || `Login failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Full login response body:', JSON.stringify(result, null, 2));
      
      const { user, accessToken, refreshToken, sessionToken } = result;

      console.log('📥 Login response received:', {
        hasUser: !!user,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasSessionToken: !!sessionToken,
        accessTokenLength: accessToken?.length,
        refreshTokenLength: refreshToken?.length
      });

      if (!accessToken || !refreshToken) {
        console.error('❌ Login response missing tokens!', result);
        throw new Error('Login response missing required tokens');
      }

      // Store tokens (this updates cache immediately)
      await this.storeTokens({ accessToken, refreshToken });
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      if (sessionToken) {
        await AsyncStorage.setItem('sessionToken', sessionToken);
      }

      console.log('✅ Login completed successfully, tokens stored and cached');
      console.log('🔑 Access token now in cache:', !!this.accessTokenCache);
      
      return user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  // Logout user
  async logout(logoutAll: boolean = false): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      if (accessToken) {
        // Call logout endpoint if we have a token
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken, logoutAll }),
        }).catch(error => {
          console.error('Error calling logout endpoint:', error);
        });
      }
    } finally {
      // Always clear local tokens
      await this.clearTokens();
      await AsyncStorage.removeItem('sessionToken');
      await AsyncStorage.removeItem('user');
    }
  }

  // Get current user from storage
  async getCurrentUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get user profile from API
  async getProfile(): Promise<User> {
    const data = await this.authenticatedRequest<{ user: User }>(
      `${API_BASE_URL}/auth/profile`
    );
    
    const user = data.user;
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    console.log('🔍 Checking authentication status...');
    
    const token = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();
    
    console.log('Access token exists:', !!token, '(cached:', !!this.accessTokenCache, ')');
    console.log('Refresh token exists:', !!refreshToken, '(cached:', !!this.refreshTokenCache, ')');
    
    // If we have a refresh token but no access token, try to refresh
    if (!token && refreshToken) {
      console.log('⚠️ No access token but refresh token exists - attempting refresh...');
      try {
        await this.refreshAccessToken();
        console.log('✅ Successfully refreshed access token on authentication check');
        return true;
      } catch (error) {
        console.error('❌ Failed to refresh token during authentication check:', error);
        // Clear invalid tokens
        await this.clearTokens();
        return false;
      }
    }
    
    const isAuth = !!token;
    console.log('Authentication status:', isAuth);
    return isAuth;
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Email verification failed');
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Password reset request failed');
    }

    return response.json();
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Password reset failed');
    }

    return response.json();
  }

  // Get active sessions
  async getActiveSessions(): Promise<any[]> {
    const data = await this.authenticatedRequest<{ sessions: any[] }>(
      `${API_BASE_URL}/auth/sessions`
    );
    return data.sessions;
  }

  // Update profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    const data = await this.authenticatedRequest<{ user: User }>(
      `${API_BASE_URL}/auth/profile`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    
    const user = data.user;
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.authenticatedRequest(
      `${API_BASE_URL}/auth/change-password`,
      {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );
  }

  // Enable two-factor authentication
  async enableTwoFactor(): Promise<{ secret: string; qrCode: string }> {
    return this.authenticatedRequest(
      `${API_BASE_URL}/auth/2fa/enable`,
      { method: 'POST' }
    );
  }

  // Verify two-factor code-
  async verifyTwoFactor(code: string): Promise<void> {
    await this.authenticatedRequest(
      `${API_BASE_URL}/auth/2fa/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      }
    );
  }
}

export default new AuthService();