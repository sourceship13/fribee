import Tracker from '@openreplay/tracker';
import trackerRN from '@openreplay/react-native';

class OpenReplayService {
  private static instance: OpenReplayService;
  private tracker: Tracker | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): OpenReplayService {
    if (!OpenReplayService.instance) {
      OpenReplayService.instance = new OpenReplayService();
    }
    return OpenReplayService.instance;
  }

  /**
   * Initialize OpenReplay tracker
   * @param projectKey - Your OpenReplay project key
   * @param options - Optional configuration
   */
  initialize(
    projectKey: string,
    options?: {
      ingestPoint?: string;
      capturePerformance?: boolean;
      __DISABLE_SECURE_MODE?: boolean;
    }
  ): void {
    if (this.isInitialized) {
      console.log('[OpenReplay] Already initialized');
      return;
    }

    try {
      console.log('[OpenReplay] Starting initialization...');
      
      // Create tracker with minimal required config
      this.tracker = new Tracker({
        projectKey: projectKey,
      });
      
      console.log('[OpenReplay] Tracker created, adding React Native plugin...');
      
      // Use React Native plugin - this handles all the RN-specific tracking
      this.tracker.use(trackerRN({
        captures: {
          // Customize what to capture
          screenshot: true,
          touches: true,
        }
      }));
      
      console.log('[OpenReplay] Plugin added, starting tracker...');
      
      // Start tracking session
      this.tracker.start();
      
      this.isInitialized = true;
      console.log('[OpenReplay] ✅ Initialized successfully');
    } catch (error) {
      console.error('[OpenReplay] ❌ Initialization failed:', error);
      // Log the full error stack
      if (error instanceof Error) {
        console.error('[OpenReplay] Error message:', error.message);
        console.error('[OpenReplay] Error stack:', error.stack);
      }
      // Don't throw - fail gracefully
      this.isInitialized = false;
      this.tracker = null;
    }
  }

  /**
   * Set user information
   */
  setUserInfo(userId: string, userInfo?: { email?: string; name?: string }): void {
    if (!this.tracker) {
      console.warn('[OpenReplay] Tracker not initialized');
      return;
    }

    try {
      this.tracker.setUserID(userId);
      if (userInfo) {
        this.tracker.setMetadata('email', userInfo.email || '');
        this.tracker.setMetadata('name', userInfo.name || '');
      }
    } catch (error) {
      console.error('[OpenReplay] Failed to set user info:', error);
    }
  }

  /**
   * Track custom event
   */
  trackEvent(eventName: string, payload?: Record<string, any>): void {
    if (!this.tracker) {
      console.warn('[OpenReplay] Tracker not initialized');
      return;
    }

    try {
      this.tracker.event(eventName, payload);
    } catch (error) {
      console.error('[OpenReplay] Failed to track event:', error);
    }
  }

  /**
   * Set custom metadata
   */
  setMetadata(key: string, value: string): void {
    if (!this.tracker) {
      console.warn('[OpenReplay] Tracker not initialized');
      return;
    }

    try {
      this.tracker.setMetadata(key, value);
    } catch (error) {
      console.error('[OpenReplay] Failed to set metadata:', error);
    }
  }

  /**
   * Handle errors
   */
  handleError(error: Error, metadata?: Record<string, any>): void {
    if (!this.tracker) {
      console.warn('[OpenReplay] Tracker not initialized');
      return;
    }

    try {
      this.tracker.handleError(error, metadata);
    } catch (err) {
      console.error('[OpenReplay] Failed to handle error:', err);
    }
  }

  /**
   * Stop tracking
   */
  stop(): void {
    if (this.tracker) {
      try {
        this.tracker.stop();
        this.isInitialized = false;
        console.log('[OpenReplay] Stopped tracking');
      } catch (error) {
        console.error('[OpenReplay] Failed to stop:', error);
      }
    }
  }

  /**
   * Get tracker instance
   */
  getTracker(): Tracker | null {
    return this.tracker;
  }
}

export default OpenReplayService.getInstance();
