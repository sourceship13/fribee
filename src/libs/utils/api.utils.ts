import { Platform } from 'react-native';
import DeviceDetector from './deviceDetector';

// Environment type
type Environment = 'local' | 'staging' | 'production';

// Detect if running on physical device (not simulator)
const isPhysicalDevice = (): boolean => {
  // Enhanced detection using multiple signals
  if (__DEV__) {
    // In development, use heuristics to detect physical devices
    
    // Android emulators often have these characteristics
    if (Platform.OS === 'android') {
      const { constants } = Platform;
      const isEmulator = (
        constants?.Brand === 'google' ||
        constants?.Model?.toLowerCase().includes('sdk') ||
        constants?.Model?.toLowerCase().includes('emulator') ||
        constants?.Fingerprint?.includes('generic')
      );
      
    }
    
    // iOS: Since metro bundler loaded from network IP (192.168.26.8:8081)
    // this indicates we're on a physical device, not simulator
    // For now, let's default to physical device for iOS in dev mode
    const isLikelyPhysical = true; // Physical devices need network IP for metro
    
    
    return isLikelyPhysical;
  }
  
  return true;
};

// Detect if running in CI environment (CircleCI, GitHub Actions, etc.)
const isCI = (): boolean => {
  // In React Native, we can't access process.env directly in production builds
  // But we can use __DEV__ as an indicator - production builds have __DEV__ = false
  // For CI builds, we'll inject a specific flag during the build process
  return !__DEV__; // CI builds are always production builds (not dev mode)
};

const FORCE_PRODUCTION_BUILD = isCI(); // Automatically true in CI/production builds

// Override for testing - can be set via NetworkDebug screen
let FORCE_PHYSICAL_DEVICE: boolean | null = null;

// Override for development - set to true to use local development server
// const FORCE_LOCAL_DEVELOPMENT = false; // Set to false to ALWAYS use staging server (recommended)

  // FORCE STAGING: Override everything to use staging (set to true to force staging regardless of device)
// const FORCE_STAGING_ALWAYS = FORCE_PRODUCTION_BUILD; // Set to true to FORCE staging server for all requests


// Override for development - set to true to use local development server
const FORCE_LOCAL_DEVELOPMENT = false; // Set to false to use cloud server

  // FORCE STAGING: Override everything to use staging (set to true to force staging regardless of device)
const FORCE_STAGING_ALWAYS = true; // Set to true to use cloud server

// IMPORTANT: Verify all URLs point to staging
const STAGING_URL = 'https://fribee.io';
const getEnvironment = (): Environment => {
  const actuallyPhysical = FORCE_PHYSICAL_DEVICE !== null ? FORCE_PHYSICAL_DEVICE : isPhysicalDevice();
  // HIGHEST PRIORITY: Force staging override (bypasses all other logic)
  if (FORCE_STAGING_ALWAYS) {
    return 'staging';
  }
  // In dev mode, always use local for physical devices
  if (__DEV__ && actuallyPhysical) {
    return 'local';
  }
  // In dev mode, use local for simulators if FORCE_LOCAL_DEVELOPMENT is true
  if (__DEV__ && FORCE_LOCAL_DEVELOPMENT) {
    return 'local';
  }
  // Use staging for everything else
  return 'staging';
};

class ApiConfig {
  private static instance: ApiConfig;
  
  private readonly urls = {
    local: {
      ios: 'http://192.168.26.21:8080', // Mac's local IP and port for iOS simulator
      android: 'http://10.0.2.2:8080', // Android emulator localhost
      physical: 'http://192.168.26.21:8080', // Mac's local IP for physical device
    },
    staging: STAGING_URL,
    production: STAGING_URL,
  };
  
  // Store the environment
  private currentEnv: Environment = getEnvironment();
  
  private constructor() {
    this.currentEnv = getEnvironment();
  }
  
  static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }
  
  // Method to manually override environment (useful for testing)
  setEnvironment(env: Environment): void {
  }
  
  get baseURL(): string {
    const physicalDevice = isPhysicalDevice();
    switch (this.currentEnv) {
      case 'local':
        // Smart local URL selection based on device type
        if (physicalDevice) {
          return this.urls.local.physical;
        } else {
          // Simulators use standard localhost
          if (Platform.OS === 'ios') {
            return this.urls.local.ios;
          } else {
            return this.urls.local.android;
          }
        }
      case 'production':
        return this.urls.production;
      case 'staging':
      default:
        return this.urls.staging;
    }
  }
  
  get apiURL(): string {
    return `${this.baseURL}/api`;
  }
  
  get environment(): Environment {
    return this.currentEnv;
  }
  
  // Helper to check if we're using local server
  get isLocal(): boolean {
    return this.currentEnv === 'local';
  }
  
  // Helper to get all configured URLs (for debugging)
  get allUrls() {
    return {
      local_ios: this.urls.local.ios,
      local_android: this.urls.local.android,
      local_physical: this.urls.local.physical,
      staging: this.urls.staging,
      production: this.urls.production,
    };
  }
}

// Create and export singleton instance
export const apiConfig = ApiConfig.getInstance();
export default apiConfig;


// Export helper function to switch environments during runtime (useful for testing)
export const switchEnvironment = (env: Environment) => {
  apiConfig.setEnvironment(env);
};

// Export helper to force physical device detection (for testing)
export const forcePhysicalDevice = (isPhysical: boolean | null) => {
  // Only allow this if FORCE_STAGING_ALWAYS is false
  // (implementation placeholder)
  // Refresh the configuration
  const newEnv = getEnvironment();
  apiConfig.setEnvironment(newEnv);
};

// Export helper to verify current configuration
export const getCurrentConfig = () => {
  return {
    environment: apiConfig.environment,
    baseURL: apiConfig.baseURL,
    apiURL: apiConfig.apiURL,
    isStaging: apiConfig.environment === 'staging'
  };
};

// Export helper to force complete configuration refresh
export const forceCompleteConfigRefresh = () => {
  // Reset all overrides
  FORCE_PHYSICAL_DEVICE = null;
  // Force re-evaluation of environment
  const newEnv = getEnvironment();
  // Update the singleton instance
  apiConfig.setEnvironment(newEnv);
  // Double check no local IPs are being used
  if (apiConfig.baseURL.includes('192.168') || apiConfig.baseURL.includes('localhost')) {
    console.error('🚨 ERROR: Still using local IP! Base URL:', apiConfig.baseURL);
  }
  // Log the results
  getCurrentConfig();
  return apiConfig;
};

// Export helper to get current detection status
export const getDeviceDetectionStatus = () => {
  return {
    forced: FORCE_PHYSICAL_DEVICE,
    detected: isPhysicalDevice(),
    final: FORCE_PHYSICAL_DEVICE !== null ? FORCE_PHYSICAL_DEVICE : isPhysicalDevice(),
    environment: apiConfig.environment,
    baseURL: apiConfig.baseURL
  };
};