import { createNavigationContainerRef } from '@react-navigation/native';
import { Linking, AppState, AppStateStatus } from 'react-native';

// Create a navigation ref that can be used anywhere
export const navigationRef = createNavigationContainerRef<any>();

// Track last handled URL to avoid duplicate handling
let lastHandledUrl: string | null = null;

/**
 * Navigate to a screen from anywhere in the app
 */
export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    console.log(`🧭 NavigationService: Navigating to ${name}`, params);
    navigationRef.navigate(name, params);
  } else {
    console.warn('🧭 NavigationService: Navigation not ready yet, retrying in 500ms...');
    // Retry after a short delay
    setTimeout(() => {
      if (navigationRef.isReady()) {
        console.log(`🧭 NavigationService: Retry successful - Navigating to ${name}`, params);
        navigationRef.navigate(name, params);
      } else {
        console.error('🧭 NavigationService: Navigation still not ready after retry');
      }
    }, 500);
  }
}

/**
 * Parse a deep link URL and extract the route info
 */
export function parseDeepLink(url: string): { screen: string; params: any } | null {
  console.log('🔗 Parsing deep link URL:', url);
  
  try {
    // Handle both custom scheme and https URLs
    // nolimitseradeals://deal/uuid
    // https://fribee.io/deal/uuid
    
    // Extract the path from the URL
    let path = url;
    
    // Remove scheme prefix
    if (url.startsWith('nolimitseradeals://')) {
      path = url.replace('nolimitseradeals://', '');
    } else if (url.startsWith('https://fribee.io/')) {
      path = url.replace('https://fribee.io/', '');
    } else if (url.startsWith('https://fribee.io')) {
      path = url.replace('https://fribee.io', '');
    }
    
    // Remove leading slash
    path = path.replace(/^\//, '');
    
    console.log('🔗 Extracted path:', path);
    
    // Match deal/:dealId pattern
    const dealMatch = path.match(/^deal\/(.+)$/);
    if (dealMatch) {
      const dealId = dealMatch[1];
      console.log('🔗 Matched deal route with ID:', dealId);
      return {
        screen: 'DealDetail',
        params: { dealId },
      };
    }
    
    // Match redemption/:dealId pattern
    const redemptionMatch = path.match(/^redemption\/(.+)$/);
    if (redemptionMatch) {
      const dealId = redemptionMatch[1];
      console.log('🔗 Matched redemption route with ID:', dealId);
      return {
        screen: 'Redemption',
        params: { dealId },
      };
    }
    
    console.log('🔗 No matching route found for path:', path);
    return null;
  } catch (error) {
    console.error('🔗 Error parsing deep link:', error);
    return null;
  }
}

/**
 * Handle an incoming deep link URL
 */
export function handleDeepLink(url: string) {
  console.log('🔗 handleDeepLink called with:', url);
  
  // Avoid handling the same URL twice
  if (url === lastHandledUrl) {
    console.log('🔗 URL already handled, skipping:', url);
    return;
  }
  lastHandledUrl = url;
  
  // Clear after 5 seconds to allow re-handling if user clicks same link again
  setTimeout(() => {
    if (lastHandledUrl === url) {
      lastHandledUrl = null;
    }
  }, 5000);
  
  const route = parseDeepLink(url);
  if (route) {
    console.log('🔗 Navigating to:', route.screen, route.params);
    navigate(route.screen, route.params);
  }
}

/**
 * Check for initial URL - call this on app start and when app returns to foreground
 */
export async function checkForDeepLink() {
  console.log('🔗 Checking for deep link URL...');
  try {
    const url = await Linking.getInitialURL();
    console.log('🔗 getInitialURL result:', url);
    if (url) {
      handleDeepLink(url);
    }
  } catch (error) {
    console.error('🔗 Error checking for deep link:', error);
  }
}

/**
 * Set up deep link listeners
 * Call this once when the app starts
 */
export function setupDeepLinkListener() {
  console.log('🔗 Setting up deep link listener...');
  
  // Check for initial URL immediately
  checkForDeepLink();
  
  // Handle URL when app is already open (warm start)
  const linkingSubscription = Linking.addEventListener('url', (event) => {
    console.log('🔗 Linking URL event received:', event.url);
    handleDeepLink(event.url);
  });
  
  // Also check for URLs when app returns from background
  // This is important because Linking.addEventListener doesn't always fire on iOS
  let appState = AppState.currentState;
  const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    console.log(`🔗 App state changed: ${appState} → ${nextAppState}`);
    
    // When app comes to foreground from background, check for deep links
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('🔗 App returned to foreground, checking for deep link...');
      // Small delay to ensure everything is ready
      setTimeout(() => {
        checkForDeepLink();
      }, 100);
    }
    
    appState = nextAppState;
  });
  
  // Return cleanup function
  return {
    remove: () => {
      linkingSubscription?.remove();
      appStateSubscription?.remove();
    },
  };
}

export default {
  navigationRef,
  navigate,
  parseDeepLink,
  handleDeepLink,
  checkForDeepLink,
  setupDeepLinkListener,
};
