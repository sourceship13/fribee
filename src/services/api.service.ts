// ...existing imports and code...
import { Platform } from 'react-native';
import AuthService from './auth.service';
import ApiConfig, { apiConfig } from '../libs/utils/api.utils';

interface ApiResponse<T = any> {
  data?: T;
  success?: boolean;
  message?: string;
  error?: string;
}

class ApiService {
  
  private get baseURL() {
    return ApiConfig.apiURL;
  }

  private publicEndpoints = [
    '/auth/login',
    '/auth/register', 
    '/auth/verify-email',
    '/auth/verify-phone',
    '/auth/resend-code',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];

  private requiresAuth(endpoint: string): boolean {
    return !this.publicEndpoints.some(publicEndpoint => 
      endpoint.includes(publicEndpoint)
    );
  }

  async makeRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      let response: Response;
      
      if (this.requiresAuth(endpoint)) {
        
        const authOptions = {
          method: 'GET',
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        };
        
        response = await AuthService.makeAuthenticatedRequest(url, authOptions);
      } else {
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        };
        
        response = await fetch(url, {
          method: 'GET',
          ...options,
          headers,
          mode: 'cors',
        });
      }

      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} - ${data.message || data.error}`);
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`💥 API Error (${endpoint}):`, error);
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(`🚨 Network Error Details:`);
        console.error(`📡 Trying to connect to: ${url}`);
        console.error(`🌐 Current API Config:`, {
          environment: apiConfig.environment,
          baseURL: this.baseURL,
          isLocal: apiConfig.isLocal
        });
        console.error(`💡 Suggestion: Check if device can reach the server`);
        
        throw new Error(`Unable to connect to server. Please check your internet connection and try again.`);
      }
      
      throw error;
    }
  }

  async getDeals(): Promise<ApiResponse<any[]>> {
    const response = await this.makeRequest('/deals/all-v2');
    console.log('📦 Fetched deals:', response);
    return response;
  }

  // async getCategories(): Promise<ApiResponse<any[]>> {
  //   return this.makeRequest('/deals/categories');
  // }

  async getDealById(id: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/deals/${id}`);
  }

  async heartDeal(dealId: string): Promise<ApiResponse> {
    return this.makeRequest(`/deals/${dealId}/heart`, {
      method: 'POST',
    });
  }

  async unheartDeal(dealId: string): Promise<ApiResponse> {
    return this.makeRequest(`/deals/${dealId}/heart`, {
      method: 'DELETE',
    });
  }

  // async getHeartedDeals(): Promise<ApiResponse<any[]>> {
  //   return  await this.makeRequest('/deals/hearted', {
  //     method: 'GET',
  //   });
  // }

  // async checkHeartStatus(dealId: string): Promise<ApiResponse<{dealId: string, isHearted: boolean, heartCount: number}>> {
  //   return this.makeRequest(`/deals/${dealId}/heart`, {
  //     method: 'GET',
  //   });
  // }

  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.makeRequest('/user/profile');
  }

  async updateUserProfile(updates: any): Promise<ApiResponse> {
    return this.makeRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async verifyCode(phoneNumber: string, code: string): Promise<ApiResponse> {
    return this.makeRequest('/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    });
  }

  async resendVerificationCode(phoneNumber: string): Promise<ApiResponse> {
    return this.makeRequest('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async trackDealView(dealId: string): Promise<ApiResponse> {
    return this.makeRequest('/analytics/deal-view', {
      method: 'POST',
      body: JSON.stringify({ dealId, timestamp: new Date().toISOString() }),
    });
  }

  async trackDealShare(dealId: string, platform: string): Promise<ApiResponse> {
    return this.makeRequest('/analytics/deal-share', {
      method: 'POST',
      body: JSON.stringify({ dealId, platform, timestamp: new Date().toISOString() }),
    });
  }

  async trackDealUnlocked(dealId: string, shareCount: number): Promise<ApiResponse> {
    const endpoint = `/deals/${dealId}/share`;
    const payload = { shareCount };
    console.log('📣 ApiService.trackDealUnlocked ->', { url: `${this.baseURL}${endpoint}`, payload });
    return this.makeRequest(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async postContacts(payload: { userId: string; contacts: Array<{ contact_number: string; display_name: string }> }): Promise<ApiResponse> {
    return this.makeRequest('/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async postDealRedemption(payload: {
    userId: string;
    dealId: string;
  }): Promise<ApiResponse> {
    console.log('Posting deal redemption with payload:', payload);
    return this.makeRequest(`/deal-redemption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async registerBusiness(formData: FormData): Promise<ApiResponse> {
    console.log('📤 Registering business with FormData');
    const url = `${this.baseURL}/business/register`;
    
    try {
      // Use AuthService's makeAuthenticatedRequest for proper token handling
      const response = await AuthService.makeAuthenticatedRequest(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ Business Registration Error: ${response.status} - ${data.message || data.error}`);
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Business registered successfully:', data);
      return data;
    } catch (error) {
      console.error(`💥 Business Registration Error:`, error);
      throw error;
    }
  }

  async getBusinessProfile(businessId?: string): Promise<ApiResponse> {
    console.log('📥 Fetching business profile', businessId ? `for ID: ${businessId}` : '(user\'s business)');
    const url = `/business/${businessId}`
    try {
      return await this.makeRequest(url, {
        method: 'GET',
      });
    } catch (error) {
      console.error(`💥 Get Business Profile Error:`, error);
      throw error;
    }
  }

  async deleteDeal(dealId: string): Promise<ApiResponse> {
    console.log('🗑️ Deleting deal:', dealId);
    try {
      return await this.makeRequest(`/deals/${dealId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`💥 Delete Deal Error:`, error);
      throw error;
    }
  }

  async verifySubscription(data: {
    platform: string;
    purchaseToken: string;
    productId: string;
    transactionReceipt?: string;
  }): Promise<ApiResponse> {
    console.log('🔐 Verifying subscription purchase:', {
      platform: data.platform,
      productId: data.productId,
    });
    
    try {
      return await this.makeRequest('/subscriptions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error(`💥 Subscription Verification Error:`, error);
      throw error;
    }
  }

  async verifyConsumablePurchase(data: {
    platform: string;
    purchaseToken: string;
    productId: string;
    transactionReceipt?: string;
  }): Promise<ApiResponse> {
    console.log('🔐 Verifying consumable purchase:', {
      platform: data.platform,
      productId: data.productId,
    });
    
    try {
      // TEMPORARY: Using subscription endpoint until backend implements /subscriptions/consumables/verify
      return await this.makeRequest('/subscriptions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error(`💥 Consumable Verification Error:`, error);
      throw error;
    }
  }
}

export default new ApiService();