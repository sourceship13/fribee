import Openreplay from '@openreplay/react-native';

class OpenReplayService {
  private static instance: OpenReplayService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): OpenReplayService {
    if (!OpenReplayService.instance) {
      OpenReplayService.instance = new OpenReplayService();
    }
    return OpenReplayService.instance;
  }

  /**
   * Initialize OpenReplay tracker for React Native
   * @param projectKey - Your OpenReplay project key
   * @param ingestPoint - Ingest URL (use 'https://api.openreplay.com/ingest' for SaaS)
   * @param options - Optional configuration
   */
  initialize(
    projectKey: string,
    ingestPoint: string,
    options?: {
      crashes?: boolean;
      analytics?: boolean;
      performances?: boolean;
      logs?: boolean;
      screen?: boolean;
    }
  ): void {
    if (this.isInitialized) {
      console.log('[OpenReplay] Already initialized');
      return;
    }

    try {
      console.log('[OpenReplay] Starting React Native session...');
      
      const defaultOptions = {
        crashes: true,
        analytics: true,
        performances: true,
        logs: true,
        screen: true,
        ...options,
      };

      Openreplay.tracker.startSession(
        projectKey,
        defaultOptions,
        ingestPoint
      );
      
      this.isInitialized = true;
      console.log('[OpenReplay] ✅ Session started successfully');
    } catch (error) {
      console.error('[OpenReplay] ❌ Failed to start session:', error);
      if (error instanceof Error) {
        console.error('[OpenReplay] Error message:', error.message);
      }
      this.isInitialized = false;
    }
  }

  /**
   * Set user information
   */
  setUserInfo(userId: string, userInfo?: { email?: string; name?: string }): void {
    if (!this.isInitialized) {
      console.warn('[OpenReplay] Tracker not initialized');
      return;
    }

    try {
      Openreplay.tracker.setUserID(userId);
      
      if (userInfo?.email) {
        Openreplay.tracker.setMetadata('email', userInfo.email);
      }
      if (userInfo?.name) {
        Openreplay.tracker.setMetadata('name', userInfo.name);
      }
    } catch (error) {
      console.error('[OpenReplay] Failed to set user info:', error);
    }
  }

  /**
   * Track custom event
   */
  trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('[OpenReplay] Tracker not initialized');
      return;
    }

    try {
      Openreplay.tracker.event(eventName, payload || {});
    } catch (error) {
      console.error('[OpenReplay] Failed to track event:', error);
    }
  }

  /**
   * Set metadata
   */
  setMetadata(key: string, value: string): void {
    if (!this.isInitialized) {
      console.warn('[OpenReplay] Tracker not initialized');
      return;
    }

    try {
      Openreplay.tracker.setMetadata(key, value);
    } catch (error) {
      console.error('[OpenReplay] Failed to set metadata:', error);
    }
  }

  /**
   * Handle and log errors
   */
  handleError(error: Error, errorInfo?: any): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Openreplay.tracker.handleError(error, errorInfo);
    } catch (e) {
      console.error('[OpenReplay] Failed to handle error:', e);
    }
  }
}

export default OpenReplayService.getInstance();
