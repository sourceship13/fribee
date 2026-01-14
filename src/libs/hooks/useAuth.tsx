import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { Appearance, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors } from '../colors';
import AuthService from '../../services/auth.service';
import ApiService from '../../services/api.service';
import AnalyticsService from '../../services/analytics.service';
import { getPendingDeepLink, handleDeepLink } from '../../services/navigation.service';
import * as Sentry from '@sentry/react-native';

export { getColors };
import { Category, User, LoginCredentials, RegisterData } from '../../types/global.types';

// Complete Auth Context Type
interface AuthContextType {
  // User authentication state
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  hasSeenOnboarding: boolean;
  markOnboardingAsComplete: () => Promise<void>;
  
  // Authentication methods
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<string>;
  logout: (logoutAll?: boolean) => Promise<void>;
  
  // User management methods
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  
  // Password management
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Email verification
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  
  // Session management
  getActiveSessions: () => Promise<any[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  
  // Hearted deals management
  heartedDeals: any[];
  heartedDealsLoading: boolean;
  refreshHeartedDeals: () => Promise<void>;
  isDealHearted: (dealId: string) => boolean;
  heartDeal: (dealId: string, dealObject?: any) => Promise<boolean>;
  unheartDeal: (dealId: string) => Promise<boolean>;
  toggleHeartDeal: (dealId: string, dealObject?: any) => Promise<boolean>;
  
  // All deals management
  deals: any[];
  dealsLoading: boolean;
  refreshDeals: () => Promise<void>;
  
  // Redeemed deals (unlocked and eligible for redemption)
  redeemedDeals: any[];
  
  // Business profile (from deals API)
  userBusiness: any | null;
  
  // Your existing features
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
  categories: Record<string, boolean>;
  setCategories: (value: Record<string, boolean>) => void;
  availableCategories: Category[];
  refreshCategories: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  
  // Hearted deals state
  const [heartedDeals, setHeartedDeals] = useState<any[]>([]);
  const [heartedDealsLoading, setHeartedDealsLoading] = useState(false);
  
  // All deals state
  const [deals, setDeals] = useState<any[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  
  // Redeemed deals state (unlocked and eligible for redemption)
  const [redeemedDeals, setRedeemedDeals] = useState<any[]>([]);
  
  // User business state (from deals API)
  const [userBusiness, setUserBusiness] = useState<any | null>(null);
  
  // Your existing state
  const colorScheme = Appearance.getColorScheme();
  const [isDarkMode, setDarkModeState] = useState(colorScheme === 'dark');
  const [categories, setCategoriesState] = useState<Record<string, boolean>>({});
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  
  // App state reference for background/foreground handling
  const appState = useRef(AppState.currentState);
  
  // Track if we're currently handling app state change to prevent duplicate calls
  const isHandlingAppStateChange = useRef(false);

  // Initialize on mount
  useEffect(() => {
    initializeApp();
    
    // Listen for appearance changes and update theme if user hasn't set a manual preference
    const appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only auto-update theme if no manual preference was saved
      AsyncStorage.getItem('theme').then((savedTheme) => {
        if (savedTheme === null) {
          // No manual preference, so follow system theme
          setDarkModeState(colorScheme === 'dark');
          console.log('📱 System theme changed - auto-updating app theme to:', colorScheme);
        }
      }).catch((error) => {
        console.error('Error checking saved theme preference:', error);
      });
    });
    
    // Listen for app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      appearanceSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  // Sync user state to Sentry for session replay identification
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username || user.email,
      });
      console.log('🔍 Sentry user identified:', user.id);
    } else {
      Sentry.setUser(null);
      console.log('🔍 Sentry user cleared');
    }
  }, [user]);

  // Helper to wait for storage to be ready
  const waitForStorageReady = async (): Promise<void> => {
    const MAX_WAIT_TIME = 2000; // 2 seconds max
    const CHECK_INTERVAL = 100;
    const startTime = Date.now();
    
    while (Date.now() - startTime < MAX_WAIT_TIME) {
      try {
        await AsyncStorage.getItem('_storage_ready_test');
        console.log('✅ Storage is ready');
        return;
      } catch (error) {
        console.log('⏳ Waiting for storage to be ready...');
        await new Promise<void>(resolve => setTimeout(() => resolve(), CHECK_INTERVAL));
      }
    }
    
    console.warn('⚠️ Storage readiness timeout - proceeding anyway');
  };

  // Fetch all deals from API
  const fetchDeals = async () => {
    try {
      setDealsLoading(true);
      const result = await ApiService.getDeals();
      console.log('📦 fetchDeals result:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        // Handle both legacy array and new shape { data: { deals, profile, business }, count, query }
        let finalDeals: any[] = [];
        const dealsData: any = result.data;
        
        console.log('📦 dealsData type:', Array.isArray(dealsData) ? 'array' : typeof dealsData);
        console.log('📦 dealsData keys:', dealsData ? Object.keys(dealsData) : 'null');
        
        // Extract userBusiness if present (it's an array of business relationships)
        if (dealsData && Array.isArray(dealsData.userBusiness)) {
          setUserBusiness(dealsData.userBusiness);
          console.log('📦 Set userBusiness:', dealsData.userBusiness.length);
        } else if (dealsData && dealsData.business) {
          // Fallback if it comes as a single business object
          setUserBusiness([dealsData.business]);
          console.log('📦 Set userBusiness (single):', dealsData.business);
        }
        
        // Extract redeemedDeals if present
        if (dealsData && Array.isArray(dealsData.redeemedDeals)) {
          setRedeemedDeals(dealsData.redeemedDeals);
          console.log('📦 Set redeemedDeals:', dealsData.redeemedDeals.length);
        } else {
          setRedeemedDeals([]);
          console.log('📦 No redeemedDeals found');
        }
        
        if (Array.isArray(dealsData)) {
          finalDeals = dealsData;
          console.log('📦 finalDeals from array:', finalDeals.length);
        } else if (dealsData && Array.isArray(dealsData.deals)) {
          // Check if deals array has full deal data or just search results
          const hasFullDealData = dealsData.deals.length > 0 && 
            (dealsData.deals[0].deal_id || dealsData.deals[0].dealId || dealsData.deals[0].business_name);
          
          if (hasFullDealData) {
            finalDeals = dealsData.deals;
            console.log('📦 finalDeals from dealsData.deals (full data):', finalDeals.length);
          } else if (dealsData.userBusinessDeals && Array.isArray(dealsData.userBusinessDeals)) {
            // Use userBusinessDeals if deals array only has search results
            finalDeals = dealsData.userBusinessDeals;
            console.log('📦 finalDeals from userBusinessDeals:', finalDeals.length);
          } else {
            finalDeals = dealsData.deals;
            console.log('📦 finalDeals from dealsData.deals (fallback):', finalDeals.length);
          }
        } else if (Array.isArray((result as any))) {
          finalDeals = result as any;
          console.log('📦 finalDeals from result array:', finalDeals.length);
        } else {
          finalDeals = [];
          console.log('📦 finalDeals empty - no data structure matched');
        }
        
        // Normalize property names from userBusinessDeals format to expected format
        finalDeals = finalDeals.map((deal: any) => {
          // If deal already has expected properties, return as-is
          if (deal.deal_id || deal.title || deal.business_name) {
            return deal;
          }
          
          // Otherwise, map from userBusinessDeals format
          return {
            ...deal,
            deal_id: deal.dealId || deal.deal_id,
            id: deal.dealId || deal.id,
            title: deal.dealTitle || deal.title,
            description: deal.description,
            descrption: deal.description, // Keep typo for backward compatibility
            business_name: deal.businessName || deal.business_name,
            business: deal.businessName || deal.business,
            business_id: deal.businessId || deal.business_id,
            business_slug: deal.businessSlug || deal.business_slug,
            image_url: deal.dealImageUrl || deal.image_url,
            deal_image_url: deal.dealImageUrl || deal.deal_image_url,
            price: deal.dealPrice || deal.price,
            deal_type: deal.dealType || deal.deal_type,
            percentage_discount: deal.percentageDiscount || deal.percentage_discount,
            expires: deal.endTime || deal.expires,
            expiry: deal.endTime || deal.expiry,
            max_redemptions: deal.maxRedemptions || deal.max_redemptions,
            min_shares_required: deal.minSharesRequired || deal.min_shares_required,
            status: deal.dealStatus || deal.status,
            created_at: deal.dealCreatedAt || deal.created_at,
            is_premium: deal.isPremium || deal.is_premium,
          };
        });
        
        console.log('📦 Normalized deals:', finalDeals.length);
        
        // Extract categories from deals
        const extractedCategories: Category[] = [];
        const categoryMap: Record<string, Category> = {};
        finalDeals.forEach((deal: any) => {
          const catSlug = deal.category_slug || deal.category || deal.category_name;
          const catName = deal.category_name || deal.category || deal.category_slug;
          if (catSlug && !categoryMap[catSlug]) {
            categoryMap[catSlug] = {
              id: catSlug,
              slug: catSlug,
              name: catName || catSlug,
              description: '',
              sort_order: 0,
              active_deal_count: '0',
              business_count: '0',
            };
          }
        });
  Object.values(categoryMap).forEach((cat: Category) => extractedCategories.push(cat));
  setAvailableCategories(extractedCategories);
        
        // Build categories state object
        const savedCategories = await AsyncStorage.getItem('categories');
        let mergedCategories: Record<string, boolean> = {};
        if (savedCategories) {
          const parsedCategories = JSON.parse(savedCategories);
          extractedCategories.forEach((cat: Category) => {
            mergedCategories[cat.slug] = parsedCategories[cat.slug] !== undefined ? parsedCategories[cat.slug] : true;
          });
        } else {
          extractedCategories.forEach((cat: Category) => {
            mergedCategories[cat.slug] = true;
          });
        }
        setCategoriesState(mergedCategories);
        await AsyncStorage.setItem('categories', JSON.stringify(mergedCategories));

        // Mark deals with hearted status using server-provided flag
        const annotatedDeals = finalDeals.map((deal: any) => {
          const serverIsHearted =
            deal.isHearted !== undefined ? !!deal.isHearted :
            deal.is_hearted !== undefined ? !!deal.is_hearted :
            false;
          return { ...deal, isHearted: serverIsHearted };
        });

        // Derive heartedDeals state directly from annotated deals
        const derivedHeartedIds = annotatedDeals
          .filter((d: any) => !!d.isHearted)
          .map((d: any) => d.deal_id || d.id)
          .filter(Boolean);
        setHeartedDeals(derivedHeartedIds.map((id: string) => ({ deal_id: id, id, isHearted: true })));

        console.log('📦 Final setDeals:', annotatedDeals.length, 'deals');
        setDeals(annotatedDeals);
        return annotatedDeals;
      } else {
        console.log('📦 No success or no data in result');
        setDeals([]);
        setAvailableCategories([]);
        setCategoriesState({});
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching deals:', error);
      setDeals([]);
      setAvailableCategories([]);
      setCategoriesState({});
      return [];
    } finally {
      setDealsLoading(false);
    }
  };

  // Fetch hearted deals from API
  const fetchHeartedDeals = async () => {
    try {
      setHeartedDealsLoading(true);
      // Prefer current deals; if empty, fetch them first
      const currentDeals = deals.length > 0 ? deals : await fetchDeals();
      const ids = (currentDeals || [])
        .filter((d: any) => !!(d.isHearted ?? d.is_hearted))
        .map((d: any) => d.deal_id || d.id)
        .filter(Boolean);
      const heartedDealsArray = ids.map((dealId: string) => ({ deal_id: dealId, id: dealId, isHearted: true }));
      setHeartedDeals(heartedDealsArray);
      return heartedDealsArray;
    } catch (error) {
      console.error('❌ Error deriving hearted deals from current deals:', error);
      setHeartedDeals([]);
      return [];
    } finally {
      setHeartedDealsLoading(false);
    }
  };

  // Initialize app (auth + preferences)
  const initializeApp = async () => {
    try {
      setLoading(true);
      console.log('🚀 Initializing app...');
      
      // CRITICAL: Wait for storage to be ready before proceeding
      await waitForStorageReady();
      
      // Load saved preferences
      await loadPreferences();
      
      // Check authentication status
      const isAuth = await AuthService.isAuthenticated();
      console.log('Authentication check result:', isAuth);
      
      if (isAuth) {
        // Get stored user data
        const currentUser = await AuthService.getCurrentUser();
        console.log('Current user loaded:', !!currentUser);
        setUser(currentUser as User | null);
        
        // Fetch all deals
        try {
          await fetchDeals();
        } catch (dealsError) {
          console.error('⚠️ InitializeApp: Failed to fetch deals, but continuing...', dealsError);
        }
        
        // Fetch hearted deals
        try {
          await fetchHeartedDeals();
        } catch (heartedDealsError) {
          console.error('⚠️ InitializeApp: Failed to fetch hearted deals, but continuing...', heartedDealsError);
        }
        
        // Try to refresh user data from server
        if (currentUser) {
          try {
            const freshUser = await AuthService.getProfile();
            setUser(freshUser as User);
          } catch (error) {
            console.error('⚠️ InitializeApp: Using cached user data, server refresh failed:', error);
          }
        }
      } else {
        console.log('User not authenticated');
        setUser(null);
        
        // Fetch deals for guest users
        try {
          await fetchDeals();
        } catch (dealsError) {
          console.error('⚠️ InitializeApp: Failed to fetch deals for guest, but continuing...', dealsError);
        }
      }
      console.log('✅ App initialization completed');
    } catch (error) {
      console.error('💥 InitializeApp: Error initializing app:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Load saved preferences (dark mode, categories)
  const loadPreferences = async () => {
    try {
      // Load dark mode preference
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setDarkModeState(savedTheme === 'dark');
      } else {
        // If no saved preference, use system theme
        const systemTheme = Appearance.getColorScheme();
        setDarkModeState(systemTheme === 'dark');
      }
      
      // Load onboarding status
      const hasSeenOnboarding = await AsyncStorage.getItem('@has_seen_onboarding');
      const showOnboardingAgain = await AsyncStorage.getItem('showOnboardingAgain');
      
      // Show onboarding if: never seen it OR user wants to see it again
      const shouldShowOnboarding = hasSeenOnboarding !== 'true' || showOnboardingAgain === 'true';
      setHasSeenOnboarding(!shouldShowOnboarding);
      
      // Reset the flag after checking (so it shows once per app launch if user chose "Yes")
      if (showOnboardingAgain === 'true') {
        await AsyncStorage.setItem('showOnboardingAgain', 'false');
      }
      
      // Load category preferences
      const savedCategories = await AsyncStorage.getItem('categories');
      if (savedCategories !== null) {
        const parsedCategories = JSON.parse(savedCategories);
        
        if (availableCategories.length > 0) {
          const validCategories: Record<string, boolean> = {};
          availableCategories.forEach(cat => {
            validCategories[cat.slug] = parsedCategories[cat.slug] !== undefined 
              ? parsedCategories[cat.slug] 
              : true;
          });
          setCategoriesState(validCategories);
        } else {
          setCategoriesState(parsedCategories);
        }
      } else if (availableCategories.length > 0) {
        const defaultCategories: Record<string, boolean> = {};
        availableCategories.forEach(cat => {
          defaultCategories[cat.slug] = true;
        });
        setCategoriesState(defaultCategories);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Handle app state changes (background/foreground)
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('📱 App state change detected:', appState.current, '→', nextAppState);
    
    // Prevent duplicate handling
    if (isHandlingAppStateChange.current) {
      console.log('⏭️ Already handling app state change, skipping...');
      return;
    }
    
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      isHandlingAppStateChange.current = true;
      
      try {
        console.log('🔄 App returned to foreground - refreshing...');
        
        // CRITICAL: Wait for storage to be ready after app resume
        await waitForStorageReady();
        
        // Add extra delay to ensure storage is fully accessible
        await new Promise<void>(resolve => setTimeout(() => resolve(), 250));
        
        // Always restore categories from storage first
        await restoreCategoriesFromStorage();
        
        // Proactively refresh tokens (prevents 401 errors)
        try {
          console.log('🔐 Attempting proactive token refresh...');
          await AuthService.proactiveTokenRefresh();
          console.log('✅ Proactive token refresh completed');
        } catch (error) {
          console.error('❌ Failed to proactively refresh tokens:', error);
        }
        
        // Always refresh deals
        fetchDeals().catch(err => console.error('❌ Failed to refresh deals:', err));
        
        if (user) {
          // Refresh user data
          refreshUser().catch(err => console.error('❌ Failed to refresh user:', err));
          
          // Refresh hearted deals
          fetchHeartedDeals().catch((err: any) => console.error('❌ Failed to refresh hearted deals:', err));
        }
      } finally {
        // Reset the flag after a short delay
        setTimeout(() => {
          isHandlingAppStateChange.current = false;
        }, 1000);
      }
    }
    
    appState.current = nextAppState;
  };

  // Restore categories from storage without validation
  const restoreCategoriesFromStorage = async () => {
    try {
      const savedCategories = await AsyncStorage.getItem('categories');
      if (savedCategories !== null) {
        const parsedCategories = JSON.parse(savedCategories);
        setCategoriesState(parsedCategories);
        console.log('✅ Categories restored from storage');
        return parsedCategories;
      }
    } catch (error) {
      console.error('❌ Error restoring categories from storage:', error);
    }
    return null;
  };

  // Enhanced setDarkMode that persists preference
  const setDarkMode = async (value: boolean) => {
    setDarkModeState(value);
    try {
      await AsyncStorage.setItem('theme', value ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Enhanced setCategories that persists preference
  const setCategories = async (value: Record<string, boolean>) => {
    setCategoriesState(value);
    try {
      await AsyncStorage.setItem('categories', JSON.stringify(value));
    } catch (error) {
      console.error('❌ Error saving categories:', error);
    }
  };

  // Refresh categories manually
  const refreshCategories = async () => {
    // Implementation if needed
  };

  // Refresh deals manually
  const refreshDeals = async () => {
    await fetchDeals();
  };

  // Refresh hearted deals manually
  const refreshHeartedDeals = async () => {
    if (user) {
      await fetchHeartedDeals();
    }
  };

  // Check if a deal is hearted
  const isDealHearted = (dealId: string): boolean => {
    return heartedDeals.some(deal => deal.deal_id === dealId || deal.id === dealId);
  };

  // Heart a deal
  const heartDeal = async (dealId: string, dealObject?: any): Promise<boolean> => {
    if (!user?.id) {
      console.error('❌ Cannot heart deal: user not authenticated');
      return false;
    }

    try {
      // Optimistic update - add to hearted deals immediately
      const alreadyHearted = heartedDeals.some(d => d.deal_id === dealId || d.id === dealId);
      if (!alreadyHearted) {
        const dealToAdd = {
          deal_id: dealId,
          id: dealId,
          isHearted: true,
          ...(dealObject && typeof dealObject === 'object' ? dealObject : {})
        };
        setHeartedDeals(prev => [...prev, dealToAdd]);
      }
      
      // Make API call - optimistic update already applied
      await ApiService.heartDeal(dealId);

      // Track analytics for deal save
      AnalyticsService.trackDealSave(dealId);

      return true;
    } catch (error: any) {
      console.error('❌ Heart deal failed:', error);
      // Revert optimistic update on error
      setHeartedDeals(prev => prev.filter(d => d.deal_id !== dealId && d.id !== dealId));
      return false;
    }
  };

  // Unheart a deal
  const unheartDeal = async (dealId: string): Promise<boolean> => {
    if (!user?.id) {
      console.error('❌ Cannot unheart deal: user not authenticated');
      return false;
    }

    // Store original state for potential revert
    const originalDeals = [...heartedDeals];

    try {
      // Optimistic update - remove from hearted deals immediately
      setHeartedDeals(prev => prev.filter(d => d.deal_id !== dealId && d.id !== dealId));
      
      // Make API call - optimistic update already applied
      await ApiService.unheartDeal(dealId);

      return true;
    } catch (error: any) {
      console.error('❌ Unheart deal failed:', error);
      // Revert optimistic update on error
      setHeartedDeals(originalDeals);
      return false;
    }
  };

  // Toggle heart status
  const toggleHeartDeal = async (dealId: string, dealObject?: any): Promise<boolean> => {
    const isCurrentlyHearted = isDealHearted(dealId);
    
    if (isCurrentlyHearted) {
      return await unheartDeal(dealId);
    } else {
      return await heartDeal(dealId, dealObject);
    }
  };

  // Authentication Methods

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      
      const loggedInUser = await AuthService.login(credentials, deviceId);
      setUser(loggedInUser as User);
      
      try {
        await fetchHeartedDeals();
      } catch (heartedDealsError) {
        console.error('⚠️ Login: Failed to fetch hearted deals, but continuing login...', heartedDealsError);
      }
      
      await loadUserPreferences(loggedInUser.id);
      
      // Check for pending deep link from guest view and navigate
      setTimeout(async () => {
        try {
          const pendingUrl = await getPendingDeepLink();
          if (pendingUrl) {
            console.log('🔗 Found pending deep link after login:', pendingUrl);
            handleDeepLink(pendingUrl);
          }
        } catch (deepLinkError) {
          console.error('⚠️ Error handling pending deep link:', deepLinkError);
        }
      }, 500);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<string> => {
    try {
      setLoading(true);
      
      const { user: newUser, message } = await AuthService.register(data);
      setUser(newUser);
      
      return message;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (logoutAll: boolean = false) => {
    try {
      await AuthService.logout(logoutAll);
      setUser(null);
      
      if (availableCategories.length > 0) {
        const defaultCategories: Record<string, boolean> = {};
        availableCategories.forEach(cat => {
          defaultCategories[cat.slug] = true;
        });
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await AuthService.getProfile();
      setUser(freshUser as User);
    } catch (error) {
      console.error('Error refreshing user:', error);
      
      const isAuth = await AuthService.isAuthenticated();
      if (!isAuth) {
        setUser(null);
      }
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const updatedUser = await AuthService.updateProfile(updates);
      setUser(updatedUser as User);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    await AuthService.requestPasswordReset(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await AuthService.resetPassword(token, newPassword);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await AuthService.changePassword(currentPassword, newPassword);
  };

  const verifyEmail = async (token: string) => {
    await AuthService.verifyEmail(token);
    await refreshUser();
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) {
      throw new Error('No user email found');
    }
  };

  const getActiveSessions = async () => {
    return AuthService.getActiveSessions();
  };

  const revokeSession = async (sessionId: string) => {
    // Implementation needed
  };

  const loadUserPreferences = async (userId: string) => {
    try {
      const userCategories = await AsyncStorage.getItem(`categories_${userId}`);
      if (userCategories) {
        const parsedCategories = JSON.parse(userCategories);
        
        const validCategories: Record<string, boolean> = {};
        availableCategories.forEach(cat => {
          validCategories[cat.slug] = parsedCategories[cat.slug] !== undefined 
            ? parsedCategories[cat.slug] 
            : true;
        });
        
        setCategoriesState(validCategories);
      }
      
      const userTheme = await AsyncStorage.getItem(`theme_${userId}`);
      if (userTheme) {
        setDarkModeState(userTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const markOnboardingAsComplete = async () => {
    try {
      await AsyncStorage.setItem('@has_seen_onboarding', 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Error marking onboarding as complete:', error);
      throw error;
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    isEmailVerified: user?.is_verified ?? false,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    requestPasswordReset,
    resetPassword,
    changePassword,
    verifyEmail,
    resendVerificationEmail,
    getActiveSessions,
    revokeSession,
    heartedDeals,
    heartedDealsLoading,
    refreshHeartedDeals,
    isDealHearted,
    heartDeal,
    unheartDeal,
    toggleHeartDeal,
    deals,
    dealsLoading,
    refreshDeals,
    redeemedDeals,
    userBusiness,
    isDarkMode,
    setDarkMode,
    categories,
    setCategories,
    availableCategories,
    refreshCategories,
    hasSeenOnboarding,
    markOnboardingAsComplete,
  }), [user, loading, isDarkMode, categories, availableCategories, heartedDeals, heartedDealsLoading, deals, dealsLoading, redeemedDeals, userBusiness, hasSeenOnboarding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

