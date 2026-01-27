import { Platform, NativeModules } from 'react-native';

/**
 * API CONFIGURATION
 *
 * Automatic Environment Detection:
 * - Checks bundle identifier to determine staging vs production
 * - Staging bundle: org.sera.dev.nolimitsera.staging → staging.fribee.io
 * - Production bundle: org.sera.dev.nolimitsera → fribee.io
 * - Development builds (__DEV__ = true) → staging.fribee.io
 *
 * Override Flags (for local development only):
 * - FORCE_LOCAL: Set to true to use local development server
 */

// ========== CONFIGURATION FLAGS ==========
const FORCE_LOCAL = true; // Set to true to use local server

// ========== API URLS ==========
const LOCAL_URL = 'http://192.168.26.5:8080';
const STAGING_URL = 'https://staging.fribee.io';
const PRODUCTION_URL = 'https://fribee.io';

// ========== ENVIRONMENT DETECTION ==========
type Environment = 'local' | 'staging' | 'production';

// Get bundle identifier to detect staging vs production builds
function getBundleId(): string {
  if (Platform.OS === 'ios') {
    return (
      NativeModules.RNDeviceInfo?.bundleId ||
      NativeModules.PlatformConstants?.bundleIdentifier ||
      'org.sera.dev.nolimitsera'
    ); // fallback
  }
  // Android
  return NativeModules.RNDeviceInfo?.bundleId || 'org.sera.dev.nolimitsera'; // fallback
}

function getEnvironment(): Environment {
  // Priority 1: Force local (for local development only)
  if (FORCE_LOCAL && __DEV__) {
    return 'local';
  }

  // Priority 2: Development builds always use staging
  if (__DEV__) {
    return 'staging';
  }

  // Priority 3: Check bundle identifier for release builds
  const bundleId = getBundleId();
  console.log('🔍 Bundle ID detected:', bundleId);

  // If bundle ID contains 'staging', use staging environment
  if (bundleId.includes('staging')) {
    return 'staging';
  }

  // Default: production for release builds
  return 'production';
}

function getBaseURL(env: Environment): string {
  switch (env) {
    case 'local':
      return LOCAL_URL;
    case 'production':
      return PRODUCTION_URL;
    case 'staging':
    default:
      return STAGING_URL;
  }
}

// ========== API CONFIG CLASS ==========
class ApiConfig {
  private static instance: ApiConfig;
  private env: Environment;

  private constructor() {
    this.env = getEnvironment();
    console.log('🌐 API Config:', {
      environment: this.env,
      baseURL: this.baseURL,
      isDev: __DEV__,
    });
  }

  static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }

  get environment(): Environment {
    return this.env;
  }

  get baseURL(): string {
    return getBaseURL(this.env);
  }

  get apiURL(): string {
    return `${this.baseURL}/api`;
  }

  get isLocal(): boolean {
    return this.env === 'local';
  }

  get isStaging(): boolean {
    return this.env === 'staging';
  }

  get isProduction(): boolean {
    return this.env === 'production';
  }
}

// ========== EXPORTS ==========
export const apiConfig = ApiConfig.getInstance();
export default apiConfig;

// Helper to get current config (for debugging)
export const getCurrentConfig = () => ({
  environment: apiConfig.environment,
  baseURL: apiConfig.baseURL,
  apiURL: apiConfig.apiURL,
  isStaging: apiConfig.isStaging,
  isProduction: apiConfig.isProduction,
});
