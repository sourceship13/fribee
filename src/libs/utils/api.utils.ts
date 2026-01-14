import { Platform } from 'react-native';

/**
 * API CONFIGURATION
 * 
 * Simple environment detection:
 * - __DEV__ = true (development builds) → Use STAGING by default
 * - __DEV__ = false (production builds) → Use PRODUCTION
 * 
 * Override Flags:
 * - FORCE_STAGING: Set to true to always use staging (ignores production builds)
 * - FORCE_LOCAL: Set to true to use local development server
 */

// ========== CONFIGURATION FLAGS ==========
const FORCE_STAGING = false;  // Set to true only for local testing
const FORCE_LOCAL = false;    // Set to true to use local server

// ========== API URLS ==========
const LOCAL_URL = 'http://192.168.26.21:8080';
const STAGING_URL = 'https://staging.fribee.io';
const PRODUCTION_URL = 'https://fribee.io';

// ========== ENVIRONMENT DETECTION ==========
type Environment = 'local' | 'staging' | 'production';

function getEnvironment(): Environment {
  // Priority 1: Force local (for development)
  if (FORCE_LOCAL) {
    return 'local';
  }
  
  // Priority 2: Force staging (for testing)
  if (FORCE_STAGING) {
    return 'staging';
  }
  
  // Priority 3: Use production for production builds
  if (!__DEV__) {
    return 'production';
  }
  
  // Default: staging for development builds
  return 'staging';
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