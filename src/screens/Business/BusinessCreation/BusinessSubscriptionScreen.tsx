/**
 * Business Subscription Screen
 *
 * Handles In-App Purchase subscription before business creation.
 * Supports both sandbox testing and production IAP.
 *
 * CONFIGURATION:
 * - FORCE_DEV_MODE: Set to true to bypass IAP (simulated purchases)
 * - USE_SANDBOX: Set to true for App Store Connect sandbox testing
 *
 * TESTING MODES:
 * 1. Local Development: FORCE_DEV_MODE=true, USE_SANDBOX=true
 *    - Simulated purchases, no App Store required
 *
 * 2. Sandbox Testing: FORCE_DEV_MODE=false, USE_SANDBOX=true
 *    - Real IAP flow with sandbox accounts
 *    - Requires App Store Connect product setup
 *    - See SANDBOX_SETUP.md for complete setup guide
 *
 * 3. Production: FORCE_DEV_MODE=false, USE_SANDBOX=false
 *    - Real IAP with production accounts
 *    - Only for production builds
 *
 * PRODUCT IDs:
 * - iOS: com.nolimitsera.monthly.subscription.premium.staging
 * - Android: com.nolimitsera.monthly.subscription.premium.staging
 *
 * For detailed sandbox setup instructions, see: /SANDBOX_SETUP.md
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../../libs/hooks/useAuth';
import { getColors } from '../../../libs/colors';
import Toolbar from '../../../components/Toolbar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VersionFooter from '../../../components/VersionFooter';
import apiService from '../../../services/api.service';
import * as RNIap from 'react-native-iap';

// =====================================================
// 🔧 IAP ENVIRONMENT CONFIGURATION
// =====================================================
// Set this to 'staging' or 'production' to control which SKUs are used
// 'staging' = uses .staging SKUs (for development/testing)
// 'production' = uses .prod SKUs (for App Store release)
// TEMPORARILY FORCED TO STAGING - Change to 'production' when prod SKUs are ready
const IAP_ENVIRONMENT: 'staging' | 'production' = 'staging';

// 🧪 TEST MODE - Bypass IAP and test backend verification directly (ANDROID ONLY)
// Set to true to skip Google Play billing and test with mock purchase data
// This allows testing backend verification without uploading to Play Store
// iOS will always use real Apple IAP (sandbox or production)
const TEST_MODE_BACKEND_ONLY = false; // Disabled - use real IAP for both platforms
// =====================================================

const IS_PRODUCTION = IAP_ENVIRONMENT === 'production';

// Subscription product IDs - different for staging vs production and iOS vs Android
const STAGING_SKUS = {
  premium: Platform.OS === 'android' ? 'nolimitsera.subscription.premium.staging' : 'com.nolimitsera.monthly.subscription.premium.staging',
  regular: Platform.OS === 'android' ? 'nolimitsera.subscription.regular.staging' : 'com.nolimitsera.monthly.subscription.regular.staging',
};

const PRODUCTION_SKUS = {
  premium: Platform.OS === 'android' ? 'nolimitsera.subscription.premium.prod' : 'com.nolimitsera.monthly.subscription.premium.prod',
  regular: Platform.OS === 'android' ? 'nolimitsera.subscription.regular.prod' : 'com.nolimitsera.monthly.subscription.regular.prod',
};

const ACTIVE_SKUS = IS_PRODUCTION ? PRODUCTION_SKUS : STAGING_SKUS;

const SUBSCRIPTION_SKUS = Platform.select({
  ios: [ACTIVE_SKUS.premium, ACTIVE_SKUS.regular],
  android: [ACTIVE_SKUS.premium, ACTIVE_SKUS.regular],
}) as string[];

// Sandbox mode configuration
// Set FORCE_DEV_MODE to true to simulate purchases without real IAP
// Set to false to test with App Store Connect sandbox accounts
// NOTE: Android requires app to be published on Play Store for IAP to work
// For Android development, we auto-enable dev mode unless it's a release build
const FORCE_DEV_MODE = false; // TRUE = Bypass IAP, FALSE = Real IAP with sandbox
const USE_SANDBOX = true; // Use sandbox in dev, real store in production

// Android IAP requires the app to be published on Google Play Store (at least internal testing)
// We allow testing in debug mode, but it may fail if the app signature doesn't match Play Store
const shouldBypassIAP = FORCE_DEV_MODE;

interface SubscriptionPlan {
  id: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

const BusinessSubscriptionScreen = ({ navigation, route }: any) => {
  const { isDarkMode, refreshUser, refreshDeals } = useAuth();
  const colors = getColors(isDarkMode);

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Get all business data from previous screens
  const businessData = route.params;
  
  // Debug logging for route params
  console.log('🚀 BusinessSubscriptionScreen MOUNTED');
  console.log('📦 route.params:', JSON.stringify(route.params, null, 2));
  console.log('📦 businessData keys:', Object.keys(businessData || {}));

  // Hardcoded plans for fallback
  const plans: SubscriptionPlan[] = [
    {
      id: ACTIVE_SKUS.regular,
      title: 'Regular',
      price: '$0.99/month',
      description: 'Essential features for small businesses',
      features: [
        'Unlimited deals creation',
        'Analytics dashboard',
        'Push notifications',
        'Email support',
        'Business profile customization',
      ],
      recommended: false,
    },
    {
      id: ACTIVE_SKUS.premium,
      title: 'Premium',
      price: '$1.99/month',
      description: 'Full-featured for growing businesses',
      features: [
        'Unlimited deals creation',
        'Analytics dashboard',
        'Push notifications',
        'Email support',
        'Business profile customization',
      ],
      recommended: true,
    },
  ];

  useEffect(() => {
    initializeIAP();

    // Set up purchase listeners
    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async purchase => {
        console.log('✅ Purchase updated (sandbox):', purchase);
        console.log(
          '📱 Full purchase object:',
          JSON.stringify(purchase, null, 2),
        );
        console.log('📱 Transaction ID:', purchase.transactionId);
        console.log('📱 Product ID:', purchase.productId);

        // iOS purchases include transactionReceipt (base64 receipt data)
        const iosPurchase = purchase as any;
        console.log('📱 Checking receipt properties...');
        console.log(
          '📱 transactionReceipt:',
          iosPurchase.transactionReceipt ? 'Present' : 'Missing',
        );
        console.log('📱 receipt:', iosPurchase.receipt ? 'Present' : 'Missing');
        console.log(
          '📱 purchaseToken:',
          purchase.purchaseToken ? 'Present' : 'Missing',
        );
        console.log(
          '📱 signedTransactionReceipt:',
          iosPurchase.signedTransactionReceipt ? 'Present' : 'Missing',
        );

        try {
          // Verify the purchase with backend
          console.log('🔵 Verifying purchase with backend...');
          console.log('🔵 Full purchase object:', JSON.stringify(purchase, null, 2));

          // For iOS, we need the transactionReceipt (base64 receipt data)
          // For Android, we use the purchaseToken (not transactionId)
          const verificationData: any = {
            platform: Platform.OS,
            // Android: use purchaseToken, iOS: use transactionId
            purchaseToken: Platform.OS === 'android' ? purchase.purchaseToken : purchase.transactionId,
            productId: purchase.productId,
          };

          console.log('🔵 Android purchaseToken:', purchase.purchaseToken);
          console.log('🔵 iOS transactionId:', purchase.transactionId);

          // Add Android-specific fields
          if (Platform.OS === 'android') {
            // Add package name for Google Play verification
            verificationData.GOOGLE_PACKAGE_NAME = 'com.nolimitseradeals.staging';
            // Android backend needs the full transaction receipt for verification with Google Play
            verificationData.transactionReceipt = JSON.stringify(purchase);
            console.log('🤖 Android package name:', verificationData.GOOGLE_PACKAGE_NAME);
            console.log('🤖 Android transaction receipt added to verification data');
          }

          // Add iOS-specific receipt data - try multiple possible properties
          if (Platform.OS === 'ios') {
            // In StoreKit 2 (Xcode/Sandbox), the JWT signed transaction is in purchaseToken
            // In production, transactionReceipt may contain the base64 receipt
            const receiptData =
              iosPurchase.transactionReceipt ||
              iosPurchase.receipt ||
              purchase.purchaseToken || // StoreKit 2 JWT signed transaction
              iosPurchase.signedTransactionReceipt;

            if (receiptData) {
              // Backend expects 'transactionReceipt' field for iOS verification
              verificationData.transactionReceipt = receiptData;
              console.log('📱 iOS Receipt found! Length:', receiptData.length);
              console.log(
                '📱 Receipt type:',
                receiptData.startsWith('eyJ')
                  ? 'JWT (StoreKit 2)'
                  : 'Base64 Receipt',
              );
              console.log(
                '📱 Receipt preview:',
                receiptData.substring(0, 50) + '...',
              );
            } else {
              console.error(
                '❌ No receipt data found in purchase object for iOS!',
              );
              console.error('❌ Available keys:', Object.keys(iosPurchase));
            }
          }

          console.log('🔵 Verification data prepared:', {
            platform: verificationData.platform,
            productId: verificationData.productId,
            hasReceipt: !!verificationData.transactionReceipt,
            receiptLength: verificationData.transactionReceipt?.length,
            hasPurchaseToken: !!verificationData.purchaseToken,
            purchaseTokenLength: verificationData.purchaseToken?.length,
            hasGooglePackageName: !!verificationData.GOOGLE_PACKAGE_NAME,
          });

          console.log('========== BACKEND VERIFICATION DEBUG ==========');
          console.log('📤 Sending to backend:', JSON.stringify(verificationData, null, 2));
          console.log('📤 Request URL: /subscriptions/verify');
          console.log('📤 Platform:', Platform.OS);
          console.log('📤 Product ID:', verificationData.productId);
          console.log('📤 Purchase Token (first 50 chars):', verificationData.purchaseToken?.substring(0, 50));
          if (Platform.OS === 'android') {
            console.log('📤 Package Name:', verificationData.GOOGLE_PACKAGE_NAME);
            console.log('📤 Transaction Receipt Length:', verificationData.transactionReceipt?.length);
          }
          console.log('===============================================');

          console.log('🔵 Calling apiService.verifySubscription...');
          const response = await apiService.verifySubscription(
            verificationData,
          );
          
          console.log('========== BACKEND RESPONSE DEBUG ==========');
          console.log('📥 Verification response received:', JSON.stringify(response, null, 2));
          console.log('📥 Response success:', response.success);
          console.log('📥 Response message:', response.message);
          console.log('📥 Response error:', response.error);
          console.log('📥 Response data:', response.data ? JSON.stringify(response.data, null, 2) : 'none');
          console.log('===========================================');

          if (response.success) {
            console.log('✅ Purchase verified successfully');
            // Finish the transaction
            await RNIap.finishTransaction({ purchase });

            console.log('✅ Transaction finished, now submitting business data');
            console.log('📦 Business data:', JSON.stringify(businessData, null, 2));
            console.log('📦 Business data keys:', Object.keys(businessData || {}));
            
            // Store the plan ID before it gets cleared
            const planId = selectedPlan || purchase.productId;
            
            // Now submit the business with the subscription
            try {
              // Create FormData for multipart/form-data upload
              const formData = new FormData();
              
              // Add text fields - always append if they have values
              console.log('📋 Adding text fields to FormData:');
              console.log('  - businessName:', businessData?.businessName);
              console.log('  - description:', businessData?.description);
              console.log('  - address:', businessData?.address);
              console.log('  - city:', businessData?.city);
              console.log('  - state:', businessData?.state);
              console.log('  - postalCode:', businessData?.postalCode);
              console.log('  - country:', businessData?.country);
              console.log('  - phoneNumber:', businessData?.phoneNumber);
              console.log('  - businessUrl:', businessData?.businessUrl);
              
              // Always include required fields with defaults
              formData.append('businessName', businessData?.businessName || 'My Business');
              formData.append('description', businessData?.description || '');
              formData.append('address', businessData?.address || '');
              formData.append('city', businessData?.city || '');
              formData.append('state', businessData?.state || '');
              formData.append('postalCode', businessData?.postalCode || '');
              formData.append('country', businessData?.country || 'United States');
              formData.append('phoneNumber', businessData?.phoneNumber || '');
              if (businessData?.businessUrl) formData.append('websiteUrl', businessData.businessUrl);
              
              // Add images
              if (businessData?.logo) {
                formData.append('logo', {
                  uri: Platform.OS === 'ios' ? businessData.logo.uri.replace('file://', '') : businessData.logo.uri,
                  type: businessData.logo.type || 'image/jpeg',
                  name: businessData.logo.fileName || 'logo.jpg',
                } as any);
              }
              
              if (businessData?.cover) {
                formData.append('coverImage', {
                  uri: Platform.OS === 'ios' ? businessData.cover.uri.replace('file://', '') : businessData.cover.uri,
                  type: businessData.cover.type || 'image/jpeg',
                  name: businessData.cover.fileName || 'cover.jpg',
                } as any);
              }
              
              // Add business photos from array
              if (businessData?.businessPhotos && Array.isArray(businessData.businessPhotos)) {
                businessData.businessPhotos.forEach((photo: any, index: number) => {
                  if (photo && index < 2) { // API supports up to 2 business images
                    formData.append(`businessImage${index + 1}`, {
                      uri: Platform.OS === 'ios' ? photo.uri.replace('file://', '') : photo.uri,
                      type: photo.type || 'image/jpeg',
                      name: photo.fileName || `business_image_${index + 1}.jpg`,
                    } as any);
                  }
                });
              }

              console.log('🚀 Submitting business data to API...');
              console.log('📋 FormData country:', businessData?.country || 'United States (default)');
              const businessResponse = await apiService.registerBusiness(formData);
              console.log('📥 Business registration response:', businessResponse);

              if (businessResponse.success) {
                console.log('✅ Business created successfully, refreshing user data...');
                
                // Refresh user data and deals to load the new business profile
                await Promise.all([refreshUser(), refreshDeals()]);
                
                console.log('✅ User data and deals refreshed, clearing state and navigating...');
                
                // Clear state
                setIsPurchasing(false);
                setSelectedPlan(null);
                
                // Navigate to profile tab (will show BusinessProfile for business accounts)
                navigation.navigate('MainTabs', { screen: 'ProfileTab' });
                
                // Show success message after navigation
                setTimeout(() => {
                  Alert.alert(
                    'Success!',
                    'Your subscription is active and business account has been created!',
                    [{ text: 'OK' }]
                  );
                }, 500);
              } else {
                throw new Error(businessResponse.message || 'Failed to create business');
              }
            } catch (businessError) {
              console.error('❌ Error creating business:', businessError);
              // Clear state
              setIsPurchasing(false);
              setSelectedPlan(null);
              
              Alert.alert(
                'Business Creation Failed',
                'Your subscription is active but there was an error creating your business account. You will be redirected to complete your business profile.',
                [{ 
                  text: 'OK',
                  onPress: async () => {
                    // Refresh deals before navigation in case business was partially created
                    await refreshDeals();
                    // Navigate to profile tab even if creation failed
                    // The user already has a subscription, they can try creating the business again later
                    navigation.navigate('MainTabs', { screen: 'ProfileTab' });
                  }
                }]
              );
            }
          } else {
            console.error('========== VERIFICATION FAILED ==========');
            console.error('❌ Backend returned success: false');
            console.error('❌ Response:', JSON.stringify(response, null, 2));
            console.error('❌ Error message:', response.message || response.error || 'No error message provided');
            console.error('========================================');
            throw new Error(response.message || response.error || 'Verification failed');
          }
        } catch (error: any) {
          console.error('========== VERIFICATION EXCEPTION ==========');
          console.error('❌ Purchase verification failed with exception');
          console.error('❌ Error name:', error?.name);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error stack:', error?.stack);
          console.error('❌ Full error object:', JSON.stringify(error, null, 2));
          console.error('===========================================');
          
          // Store plan ID before state gets cleared
          const planId = selectedPlan || purchase.productId;
          
          // Create detailed error message for the alert
          const errorDetails = `
Error: ${error?.message || 'Unknown error'}
Platform: ${Platform.OS}
Product ID: ${purchase.productId}
Purchase Token: ${purchase.purchaseToken ? 'Present' : 'Missing'}
${Platform.OS === 'android' ? `Package Name: com.nolimitseradeals.staging` : ''}

Please share this information with support.
          `.trim();
          
          Alert.alert(
            'Verification Error',
            errorDetails,
            [
              {
                text: 'Continue to Profile',
                onPress: async () => {
                  // Finish the transaction anyway
                  await RNIap.finishTransaction({ purchase });
                  
                  // Refresh user data and deals to get latest subscription status
                  await Promise.all([refreshUser(), refreshDeals()]);
                  
                  // Navigate to profile tab instead of creation flow
                  navigation.navigate('MainTabs', { screen: 'ProfileTab' });
                },
              },
            ],
          );
        } finally {
          setIsPurchasing(false);
          setSelectedPlan(null);
        }
      },
    );

    const purchaseErrorSubscription = RNIap.purchaseErrorListener(error => {
      console.error('❌ Purchase error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // Check error code (cast to string for comparison)
      if (String(error.code) === 'E_USER_CANCELLED') {
        Alert.alert('Purchase Cancelled', 'You cancelled the purchase.');
      } else {
        Alert.alert(
          'Purchase Failed',
          `Error: ${error.message || 'Unknown error'}\nCode: ${
            error.code
          }\n\nMake sure:\n• Signed in with sandbox test account\n• Product exists in App Store Connect\n• Network connection is stable`,
          [
            {
              text: 'OK',
            },
          ],
        );
      }

      setIsPurchasing(false);
      setSelectedPlan(null);
    });

    return () => {
      // Cleanup IAP connections and listeners
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
      RNIap.endConnection();
    };
  }, []);

  const initializeIAP = async () => {
    try {
      setIsLoading(true);

      console.log('🔵 Initializing IAP...');
      console.log('🔵 Platform:', Platform.OS);
      console.log('🔵 __DEV__:', __DEV__);
      console.log('🔵 IAP_ENVIRONMENT:', IAP_ENVIRONMENT);
      console.log('🔵 IS_PRODUCTION:', IS_PRODUCTION);
      console.log('🔵 Active SKUs:', ACTIVE_SKUS);
      console.log('🔵 Looking for SKUs:', SUBSCRIPTION_SKUS);
      console.log('🔵 FORCE_DEV_MODE:', FORCE_DEV_MODE);
      console.log('🔵 shouldBypassIAP:', shouldBypassIAP);
      console.log('🔵 USE_SANDBOX:', USE_SANDBOX);

      // Skip IAP initialization for Android debug builds (Play Billing requires published app)
      if (shouldBypassIAP) {
        console.log('🛠️ Bypassing IAP initialization (dev mode or Android debug)');
        console.log('🛠️ Android IAP requires app to be published on Play Store');
        setIsLoading(false);
        return;
      }

      // Initialize IAP connection
      const result = await RNIap.initConnection();
      console.log('✅ IAP connection result:', result);

      // Add delay for App Store to be ready
      await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

      // Fetch available subscriptions - v14 uses fetchProducts
      console.log('🔵 Fetching products for SKUs:', SUBSCRIPTION_SKUS);
      const products = await RNIap.fetchProducts({
        skus: SUBSCRIPTION_SKUS,
        type: 'subs',
      });

      console.log('📦 Products returned:', products?.length || 0);
      if (products && products.length > 0) {
        console.log(
          '✅ Available subscriptions:',
          JSON.stringify(products, null, 2),
        );
        products.forEach(p => {
          const productData = p as any;
          const productId =
            productData.productId || p.id || productData.productID;
          const price = productData.displayPrice || `$${productData.price}`;
          console.log(`  - ${productId}: ${productData.title} - ${price}`);
        });
        setSubscriptions(products);
      } else {
        console.warn('⚠️ No products found!');
        console.warn(
          '⚠️ Make sure products are created in App Store Connect with exact SKU:',
          SUBSCRIPTION_SKUS[0],
        );
        console.warn(
          '⚠️ Products must be "Ready to Submit" or "Approved" status',
        );
        console.warn(
          '⚠️ Sign in with sandbox test account in Settings > App Store',
        );

        Alert.alert(
          'No Products Available',
          `Could not load subscription products from App Store.\n\nLooking for: ${SUBSCRIPTION_SKUS[0]}\n\nPossible issues:\n• Product not created in App Store Connect\n• Product ID mismatch\n• Not in "Ready to Submit" status\n• Not signed in with sandbox account\n\nSet FORCE_DEV_MODE = true to test without IAP.`,
          [
            {
              text: 'OK',
              onPress: () => setIsLoading(false),
            },
          ],
        );
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Failed to initialize IAP:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);

      const troubleshooting = `\n\nTroubleshooting:\n• Check App Store Connect has product: ${SUBSCRIPTION_SKUS[0]}\n• Product must be "Ready to Submit" or "Approved"\n• Sign in with sandbox test account\n• Check Agreements, Tax, and Banking are complete\n• Wait 30+ minutes after creating product`;

      Alert.alert(
        'IAP Initialization Failed',
        `${error.message || 'Unknown error'}${troubleshooting}`,
        [
          {
            text: 'Skip for Testing',
            onPress: () => {
              setIsLoading(false);
            },
          },
          {
            text: 'Retry',
            onPress: () => initializeIAP(),
          },
        ],
      );
      setIsLoading(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    console.log('=== HANDLE PURCHASE DEBUG ===');
    console.log('Plan ID received:', planId);
    console.log('Plan ID type:', typeof planId);

    setIsPurchasing(true);
    setSelectedPlan(planId);

    // TEST MODE: Bypass IAP and test backend verification directly
    if (TEST_MODE_BACKEND_ONLY) {
      console.log('🧪 TEST MODE: Bypassing IAP, testing backend verification');
      console.log('🧪 Product ID:', planId);
      
      try {
        // Generate mock purchase data that mimics real IAP response
        const mockPurchaseToken = `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const mockTransactionReceipt = JSON.stringify({
          productId: planId,
          transactionId: `mock_txn_${Date.now()}`,
          purchaseTime: Date.now(),
          purchaseState: 'purchased',
          developerPayload: '',
          packageName: 'com.nolimitseradeals.staging',
          orderId: `GPA.${Math.random().toString(36).substring(2, 15)}`,
          acknowledged: false,
        });

        console.log('🧪 Mock Purchase Token:', mockPurchaseToken);
        console.log('🧪 Mock Receipt:', mockTransactionReceipt);

        // Call backend verification endpoint directly
        console.log('🧪 Calling backend verification...');
        const requestData = {
          platform: Platform.OS,
          purchaseToken: mockPurchaseToken,
          productId: planId,
          GOOGLE_PACKAGE_NAME: 'com.nolimitseradeals.staging',
          transactionReceipt: mockTransactionReceipt,
        };
        console.log('🧪 REQUEST DATA OBJECT:', JSON.stringify(requestData, null, 2));
        console.log('🧪 Has GOOGLE_PACKAGE_NAME?', 'GOOGLE_PACKAGE_NAME' in requestData);
        console.log('🧪 GOOGLE_PACKAGE_NAME value:', requestData.GOOGLE_PACKAGE_NAME);
        
        const verificationResult = await apiService.verifySubscription(requestData);

        console.log('🧪 Backend verification result:', JSON.stringify(verificationResult, null, 2));

        if (verificationResult.success) {
          Alert.alert(
            '✅ Test Mode Success',
            `Backend verification successful!\n\nProduct: ${planId}\n\nCheck logs for details.`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  setIsPurchasing(false);
                  proceedToFinalStep();
                },
              },
            ],
          );
        } else {
          Alert.alert(
            '❌ Test Mode - Verification Failed',
            `Backend returned error:\n\n${verificationResult.message || verificationResult.error || 'Unknown error'}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setIsPurchasing(false);
                  setSelectedPlan(null);
                },
              },
            ],
          );
        }
      } catch (error: any) {
        console.error('🧪 Test mode error:', error);
        Alert.alert(
          '❌ Test Mode Error',
          `Failed to test backend verification:\n\n${error.message}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setIsPurchasing(false);
                setSelectedPlan(null);
              },
            },
          ],
        );
      }
      return;
    }

    // Check if we should bypass IAP entirely (for local development or Android debug)
    if (shouldBypassIAP) {
      console.log('🛠️ BYPASS IAP MODE: Simulating purchase for testing');
      console.log('🛠️ Reason:', FORCE_DEV_MODE ? 'FORCE_DEV_MODE enabled' : 'Android debug build');
      setTimeout(() => {
        Alert.alert(
          'Development Mode',
          Platform.OS === 'android' 
            ? 'Subscription simulated! (Android IAP requires published app on Play Store)'
            : 'Subscription simulated successfully! (IAP disabled)',
          [
            {
              text: 'Continue',
              onPress: () => {
                setIsPurchasing(false);
                proceedToFinalStep();
              },
            },
          ],
        );
      }, 1500);
      return;
    }

    // Validate planId
    if (!planId || planId === 'undefined') {
      console.error('❌ Invalid planId:', planId);
      Alert.alert('Error', `Invalid product ID: ${planId}`);
      setIsPurchasing(false);
      setSelectedPlan(null);
      return;
    }

    try {
      console.log('🔵 Initiating purchase for:', planId);
      console.log('🔵 Platform:', Platform.OS);

      // react-native-iap v14 API - platform-specific request structure
      let purchaseRequest: any;
      
      if (Platform.OS === 'ios') {
        purchaseRequest = {
          type: 'subs' as const,
          request: {
            ios: {
              sku: planId,
            },
          },
        };
      } else {
        purchaseRequest = {
          type: 'subs' as const,
          request: {
            android: {
              skus: [planId],
            },
          },
        };
      }
      
      console.log('🔵 Purchase request:', JSON.stringify(purchaseRequest, null, 2));
      
      await RNIap.requestPurchase(purchaseRequest);

      console.log('✅ Purchase request sent - waiting for App Store response');
      // Don't set isPurchasing to false here - the purchaseUpdatedListener will handle it
    } catch (error: any) {
      console.error('❌ Purchase request failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      Alert.alert(
        'Purchase Error',
        `Failed to request purchase.\n\nError: ${error.message}\n\nProduct ID: ${planId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsPurchasing(false);
              setSelectedPlan(null);
            },
          },
        ],
      );

      setIsPurchasing(false);
      setSelectedPlan(null);
    }
  };

  const proceedToFinalStep = async () => {
    // Create the business profile before navigating
    try {
      console.log('✅ Subscription verified, now creating business profile...');
      console.log('📦 Business data:', JSON.stringify(businessData, null, 2));
      console.log('📦 Business data keys:', Object.keys(businessData || {}));
      
      // Create FormData for multipart/form-data upload
      const formData = new FormData();
      
      // Add text fields - always append with defaults
      console.log('📋 Adding text fields to FormData:');
      console.log('  - businessName:', businessData?.businessName);
      console.log('  - description:', businessData?.description);
      console.log('  - address:', businessData?.address);
      console.log('  - city:', businessData?.city);
      console.log('  - state:', businessData?.state);
      console.log('  - postalCode:', businessData?.postalCode);
      console.log('  - country:', businessData?.country);
      console.log('  - phoneNumber:', businessData?.phoneNumber);
      console.log('  - businessUrl:', businessData?.businessUrl);
      
      // Always include required fields with defaults
      formData.append('businessName', businessData?.businessName || 'My Business');
      formData.append('description', businessData?.description || '');
      formData.append('address', businessData?.address || '');
      formData.append('city', businessData?.city || '');
      formData.append('state', businessData?.state || '');
      formData.append('postalCode', businessData?.postalCode || '');
      formData.append('country', businessData?.country || 'United States');
      formData.append('phoneNumber', businessData?.phoneNumber || '');
      if (businessData?.businessUrl) formData.append('websiteUrl', businessData.businessUrl);
      
      // Add images
      if (businessData?.logo) {
        formData.append('logo', {
          uri: Platform.OS === 'ios' ? businessData.logo.uri.replace('file://', '') : businessData.logo.uri,
          type: businessData.logo.type || 'image/jpeg',
          name: businessData.logo.fileName || 'logo.jpg',
        } as any);
      }
      
      if (businessData?.cover) {
        formData.append('coverImage', {
          uri: Platform.OS === 'ios' ? businessData.cover.uri.replace('file://', '') : businessData.cover.uri,
          type: businessData.cover.type || 'image/jpeg',
          name: businessData.cover.fileName || 'cover.jpg',
        } as any);
      }
      
      // Add business photos from array
      if (businessData?.businessPhotos && Array.isArray(businessData.businessPhotos)) {
        businessData.businessPhotos.forEach((photo: any, index: number) => {
          if (photo && index < 2) { // API supports up to 2 business images
            formData.append(`businessImage${index + 1}`, {
              uri: Platform.OS === 'ios' ? photo.uri.replace('file://', '') : photo.uri,
              type: photo.type || 'image/jpeg',
              name: photo.fileName || `business_image_${index + 1}.jpg`,
            } as any);
          }
        });
      }

      console.log('🚀 Submitting business data to API...');
      console.log('📋 FormData country:', businessData?.country || 'United States (default)');
      const businessResponse = await apiService.registerBusiness(formData);
      console.log('📥 Business registration response:', businessResponse);

      if (businessResponse.success) {
        console.log('✅ Business created successfully, refreshing user data...');
        
        // Refresh user data and deals to load the new business profile
        await Promise.all([refreshUser(), refreshDeals()]);
        
        console.log('✅ User data and deals refreshed, navigating to profile tab');
        
        // Navigate to profile tab (will show BusinessProfile for business accounts)
        navigation.navigate('MainTabs', { screen: 'ProfileTab' });
        
        // Show success message after navigation
        setTimeout(() => {
          Alert.alert(
            'Success!',
            'Your subscription is active and business account has been created!',
          );
        }, 500);
      } else {
        Alert.alert(
          'Error',
          `Failed to create business profile: ${businessResponse.message || 'Unknown error'}`,
        );
      }
    } catch (error: any) {
      console.error('❌ Error creating business profile:', error);
      Alert.alert(
        'Error',
        `Failed to create business profile: ${error.message}`,
      );
    }
  };

  const skipForNow = () => {
    Alert.alert(
      'Skip Subscription?',
      'You can set up your subscription later in Settings. Continue without subscribing?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => {
            navigation.navigate('BusinessCreationScreen1', {
              ...businessData,
              hasSubscription: false,
            });
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Toolbar
          title="Subscribe"
          onBack={() => navigation.goBack()}
          showSettings={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E4760F" />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading subscription plans...
          </Text>
        </View>
      </View>
    );
  }

  // Redesigned plan card component matching the screenshot
  const PlanCard = ({
    plan,
    isPremium,
    product,
  }: {
    plan: SubscriptionPlan;
    isPremium: boolean;
    product?: any;
  }) => {
    const planId = product?.id || product?.productId || plan.id;
    const displayPrice = product?.displayPrice || plan.price.replace('/month', '');
    const isSelected = isPurchasing && selectedPlan === planId;

    return (
      <View
        style={[
          styles.planCard,
          {
            backgroundColor: colors.background,
            borderColor: isPremium ? colors.subscriptionBorder : colors.subscriptionBorderGrey,
          },
        ]}
      >
        {/* Most Popular Badge - only for Premium */}
        {isPremium && (
          <View style={[styles.mostPopularBadge, { backgroundColor: colors.text }]}>
            <Text style={styles.mostPopularText}>MOST POPULAR</Text>
          </View>
        )}

        {/* Plan Name */}
        <Text style={[styles.planName, { color: colors.text, marginTop: isPremium ? 32 : 0 }]}>
          {isPremium ? 'Premium' : 'Regular'}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.priceAmount, { color: colors.text }]}>
            {displayPrice.replace('$', '$')}
          </Text>
          <Text style={[styles.pricePerMonth, { color: '#666' }]}>/ month</Text>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={() => handlePurchase(planId)}
          disabled={isPurchasing}
        >
          {isSelected ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Icon name="check" size={14} color="#E4760F" />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toolbar
        title="Subscribe"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Choose Your Plan
          </Text>
          <Text style={[styles.subtitle, { color: '#666' }]}>
            Subscribe to unlock all features for your business
          </Text>
        </View>

        {/* Premium Plan Card */}
        <PlanCard
          plan={plans.find(p => p.recommended) || plans[1]}
          isPremium={true}
          product={subscriptions.find(
            s =>
              (s.id || s.productId || '').toLowerCase().includes('premium'),
          )}
        />

        {/* Regular Plan Card */}
        <PlanCard
          plan={plans.find(p => !p.recommended) || plans[0]}
          isPremium={false}
          product={subscriptions.find(
            s =>
              (s.id || s.productId || '').toLowerCase().includes('regular'),
          )}
        />

        {/* Skip Button */}
        {/* <TouchableOpacity
          style={styles.skipButton}
          onPress={skipForNow}
          disabled={isPurchasing}
        >
          <Text style={[styles.skipButtonText, { color: colors.text }]}>
            I'll set this up later
          </Text>
        </TouchableOpacity> */}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: '#999' }]}>
            • Cancel anytime from your device settings
          </Text>
          <Text style={[styles.infoText, { color: '#999' }]}>
            • Payment will be charged to your iTunes Account or Google Play
          </Text>
          <Text style={[styles.infoText, { color: '#999' }]}>
            • Subscription automatically renews unless cancelled
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  mostPopularBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
  },
  mostPopularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  planName: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  pricePerMonth: {
    fontSize: 16,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subscribeButton: {
    backgroundColor: '#E4760F',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  featuresContainer: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4760F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  infoSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  infoText: {
    fontSize: 12,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default BusinessSubscriptionScreen;
