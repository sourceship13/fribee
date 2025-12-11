// src/services/analytics.service.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './auth.service';
import ApiConfig from '../libs/utils/api.utils';
import { version as appVersion } from '../../package.json';

// Session ID storage key
const SESSION_ID_KEY = '@analytics_session_id';

// Analytics event types
export type DealInteractionAction = 
  | 'view' 
  | 'tap' 
  | 'swipe_left' 
  | 'swipe_right' 
  | 'save' 
  | 'share' 
  | 'redeem';

export type EventType = 
  | 'click' 
  | 'view' 
  | 'swipe' 
  | 'scroll' 
  | 'navigation' 
  | 'interaction';

interface AnalyticsEvent {
  eventType: EventType;
  eventName: string;
  screenName: string;
  targetType?: string;
  targetId?: string;
  properties?: Record<string, any>;
}

interface DeviceInfo {
  platform: 'ios' | 'android';
  appVersion: string;
}

interface TrackEventPayload {
  sessionId: string;
  event: AnalyticsEvent;
  device: DeviceInfo;
}

interface DealInteractionPayload {
  dealId: string;
  action: DealInteractionAction;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string | null = null;
  private deviceInfo: DeviceInfo;

  private constructor() {
    this.deviceInfo = {
      platform: Platform.OS as 'ios' | 'android',
      appVersion: appVersion || '1.0.0',
    };
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize or retrieve session ID
   */
  async getOrCreateSessionId(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId;
    }

    try {
      // Try to get existing session from storage
      const storedSession = await AsyncStorage.getItem(SESSION_ID_KEY);
      
      if (storedSession) {
        const { id, createdAt } = JSON.parse(storedSession);
        // Check if session is less than 30 minutes old
        const thirtyMinutes = 30 * 60 * 1000;
        if (Date.now() - createdAt < thirtyMinutes) {
          this.sessionId = id;
          return id;
        }
      }

      // Create new session
      this.sessionId = this.generateSessionId();
      await AsyncStorage.setItem(SESSION_ID_KEY, JSON.stringify({
        id: this.sessionId,
        createdAt: Date.now(),
      }));

      return this.sessionId;
    } catch (error) {
      console.error('📊 Analytics: Error managing session ID:', error);
      // Fallback to generating a new ID without persistence
      this.sessionId = this.generateSessionId();
      return this.sessionId;
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Track a general analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const sessionId = await this.getOrCreateSessionId();
      const payload: TrackEventPayload = {
        sessionId,
        event,
        device: this.deviceInfo,
      };

      console.log('📊 Analytics: Tracking event', {
        eventName: event.eventName,
        eventType: event.eventType,
        screenName: event.screenName,
      });

      const url = `${ApiConfig.apiURL}/analytics/track`;
      const response = await AuthService.makeAuthenticatedRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('📊 Analytics: Track event failed', response.status, errorData);
      } else {
        console.log('📊 Analytics: Event tracked successfully');
      }
    } catch (error) {
      // Don't throw - analytics failures shouldn't break the app
      console.warn('📊 Analytics: Failed to track event', error);
    }
  }

  /**
   * Track deal interactions (convenience method)
   */
  async trackDealInteraction(dealId: string, action: DealInteractionAction): Promise<void> {
    try {
      const payload: DealInteractionPayload = {
        dealId,
        action,
      };

      console.log('📊 Analytics: Tracking deal interaction', { dealId, action });

      const url = `${ApiConfig.apiURL}/analytics/deal-interaction`;
      const response = await AuthService.makeAuthenticatedRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('📊 Analytics: Deal interaction tracking failed', response.status, errorData);
      } else {
        console.log('📊 Analytics: Deal interaction tracked successfully');
      }
    } catch (error) {
      // Don't throw - analytics failures shouldn't break the app
      console.warn('📊 Analytics: Failed to track deal interaction', error);
    }
  }

  /**
   * Track deal swipe (like/dislike)
   */
  async trackDealSwipe(
    dealId: string, 
    direction: 'left' | 'right',
    dealInfo?: { title?: string; business?: string; category?: string }
  ): Promise<void> {
    const action: DealInteractionAction = direction === 'right' ? 'swipe_right' : 'swipe_left';
    
    // Track via convenience endpoint
    await this.trackDealInteraction(dealId, action);

    // Also track detailed event
    await this.trackEvent({
      eventType: 'swipe',
      eventName: direction === 'right' ? 'deal_liked' : 'deal_disliked',
      screenName: 'SwipeScreen',
      targetType: 'deal',
      targetId: dealId,
      properties: {
        direction,
        ...dealInfo,
      },
    });
  }

  /**
   * Track deal view
   */
  async trackDealView(dealId: string, dealInfo?: { title?: string; business?: string }): Promise<void> {
    await this.trackDealInteraction(dealId, 'view');
  }

  /**
   * Track deal tap (opening detail view)
   */
  async trackDealTap(dealId: string, dealInfo?: { title?: string; business?: string }): Promise<void> {
    await this.trackDealInteraction(dealId, 'tap');
    
    await this.trackEvent({
      eventType: 'click',
      eventName: 'deal_card_tap',
      screenName: 'SwipeScreen',
      targetType: 'deal',
      targetId: dealId,
      properties: dealInfo,
    });
  }

  /**
   * Track deal save (heart)
   */
  async trackDealSave(dealId: string): Promise<void> {
    await this.trackDealInteraction(dealId, 'save');
  }

  /**
   * Track deal share
   */
  async trackDealShare(dealId: string, platform?: string): Promise<void> {
    await this.trackDealInteraction(dealId, 'share');
    
    await this.trackEvent({
      eventType: 'interaction',
      eventName: 'deal_shared',
      screenName: 'DealDetailScreen',
      targetType: 'deal',
      targetId: dealId,
      properties: { platform },
    });
  }

  /**
   * Track deal redemption
   */
  async trackDealRedeem(dealId: string): Promise<void> {
    await this.trackDealInteraction(dealId, 'redeem');
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName: string): Promise<void> {
    await this.trackEvent({
      eventType: 'navigation',
      eventName: 'screen_view',
      screenName,
    });
  }

  /**
   * Start a new session (call on app foreground)
   */
  async startNewSession(): Promise<void> {
    this.sessionId = this.generateSessionId();
    await AsyncStorage.setItem(SESSION_ID_KEY, JSON.stringify({
      id: this.sessionId,
      createdAt: Date.now(),
    }));
    console.log('📊 Analytics: New session started', this.sessionId);
  }
}

export default AnalyticsService.getInstance();
