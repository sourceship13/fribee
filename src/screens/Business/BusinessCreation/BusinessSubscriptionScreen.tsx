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

// 🧪 TEST MODE - Bypass IAP and test backend verification directly
// Set to true to skip Google Play billing and test with mock purchase data
// This allows testing backend verification without uploading to Play Store
const TEST_MODE_BACKEND_ONLY = true; // Set to false for real IAP testing
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
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Get all business data from previous screens
  const businessData = route.params;

  // Hardcoded plans for fallback (will be replaced with actual IAP products)
  // Hardcoded plans for fallback
  const plans: SubscriptionPlan[] = [
    {
      id: ACTIVE_SKUS.regular,
      title: 'Regular Business',
      price: '$0.99/month',
      description: 'Essential features for small businesses',
      features: [
        'Up to 4 deals per month',
        'Basic analytics',
        'Email support',
        'Business profile',
      ],
      recommended: false,
    },
    {
      id: ACTIVE_SKUS.premium,
      title: 'Premium Business',
      price: '$1.99/month',
      description: 'Full-featured for growing businesses',
      features: [
        'Up to 8 deals per month',
        'Advanced analytics dashboard',
        'Push notifications',
        'Priority email support',
        'Business profile customization',
        'Featured placement',
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

          // For iOS, we need the transactionReceipt (base64 receipt data)
          // For Android, we use the purchaseToken
          const verificationData: any = {
            platform: Platform.OS,
            purchaseToken: purchase.transactionId || '',
            productId: purchase.productId,
            GOOGLE_PACKAGE_NAME: Platform.OS === 'android' ? 'com.nolimitseradeals.staging' : undefined,
          };

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
          });

          console.log('🔵 Calling apiService.verifySubscription...');
          const response = await apiService.verifySubscription(
            verificationData,
          );
          
          console.log('📥 Verification response received:', JSON.stringify(response, null, 2));
          console.log('📥 Response success:', response.success);

          if (response.success) {
            console.log('✅ Purchase verified successfully');
            // Finish the transaction
            await RNIap.finishTransaction({ purchase });

            console.log('✅ Transaction finished, now submitting business data');
            console.log('📦 Business data:', businessData);
            
            // Store the plan ID before it gets cleared
            const planId = selectedPlan || purchase.productId;
            
            // Now submit the business with the subscription
            try {
              // Create FormData for multipart/form-data upload
              const formData = new FormData();
              
              // Add text fields
              if (businessData?.businessName) formData.append('businessName', businessData.businessName);
              if (businessData?.description) formData.append('description', businessData.description);
              if (businessData?.address) formData.append('address', businessData.address);
              if (businessData?.city) formData.append('city', businessData.city);
              if (businessData?.state) formData.append('state', businessData.state);
              if (businessData?.postalCode) formData.append('postalCode', businessData.postalCode);
              if (businessData?.country) formData.append('country', businessData.country);
              if (businessData?.phoneNumber) formData.append('phoneNumber', businessData.phoneNumber);
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
              
              if (businessData?.businessImage1) {
                formData.append('businessImage1', {
                  uri: Platform.OS === 'ios' ? businessData.businessImage1.uri.replace('file://', '') : businessData.businessImage1.uri,
                  type: businessData.businessImage1.type || 'image/jpeg',
                  name: businessData.businessImage1.fileName || 'business_image_1.jpg',
                } as any);
              }
              
              if (businessData?.businessImage2) {
                formData.append('businessImage2', {
                  uri: Platform.OS === 'ios' ? businessData.businessImage2.uri.replace('file://', '') : businessData.businessImage2.uri,
                  type: businessData.businessImage2.type || 'image/jpeg',
                  name: businessData.businessImage2.fileName || 'business_image_2.jpg',
                } as any);
              }

              console.log('🚀 Submitting business data to API...');
              const businessResponse = await apiService.registerBusiness(formData);
              console.log('📥 Business registration response:', businessResponse);

              if (businessResponse.success) {
                console.log('✅ Business created successfully, navigating to BusinessProfile');
                // Clear state
                setIsPurchasing(false);
                setSelectedPlan(null);
                
                // Navigate to business profile
                navigation.navigate('BusinessProfile');
                
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
                'Your subscription is active but there was an error creating your business account. Please contact support.',
                [{ text: 'OK' }]
              );
            }
          } else {
            console.error('❌ Verification response success was false');
            console.error('❌ Response:', response);
            throw new Error('Verification failed');
          }
        } catch (error) {
          console.error('❌ Purchase verification failed:', error);
          
          // Store plan ID before state gets cleared
          const planId = selectedPlan || purchase.productId;
          
          Alert.alert(
            'Verification Error',
            'Failed to verify purchase with backend. The purchase may still be valid.\n\nWould you like to continue anyway?',
            [
              {
                text: 'Continue',
                onPress: async () => {
                  // Finish the transaction anyway
                  await RNIap.finishTransaction({ purchase });
                  
                  // Navigate with stored plan ID - spread businessData only if it exists
                  navigation.navigate('BusinessCreationScreen1', {
                    ...(businessData || {}),
                    hasSubscription: true,
                    subscriptionPlan: planId,
                  });
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
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

  const proceedToFinalStep = () => {
    // Navigate to BusinessProfile after successful subscription
    navigation.navigate('BusinessProfile', {
      ...businessData,
      hasSubscription: true,
      subscriptionPlan: selectedPlan,
    });
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading subscription plans...
          </Text>
        </View>
      </View>
    );
  }

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
      >
        {/* IAP Environment Indicator */}
        <View
          style={{
            backgroundColor: IS_PRODUCTION ? '#D4EDDA' : '#FFF3CD',
            padding: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Icon
            name={IS_PRODUCTION ? 'store' : 'science'}
            size={16}
            color={IS_PRODUCTION ? '#155724' : '#856404'}
          />
          <Text
            style={{
              color: IS_PRODUCTION ? '#155724' : '#856404',
              fontSize: 12,
              fontWeight: '600',
              marginLeft: 6,
            }}
          >
            {IS_PRODUCTION ? '🏪 PRODUCTION' : '🧪 STAGING'} SKUs | {USE_SANDBOX ? 'Sandbox' : 'Live'} Mode
          </Text>
        </View>

        {/* Sandbox/Dev Mode Indicator */}
        {(USE_SANDBOX || shouldBypassIAP) && (
          <View
            style={[
              styles.sandboxBanner,
              {
                backgroundColor: shouldBypassIAP ? '#FFF3CD' : '#D1ECF1',
              },
            ]}
          >
            <Icon
              name={shouldBypassIAP ? 'developer-mode' : 'science'}
              size={20}
              color={shouldBypassIAP ? '#856404' : '#0C5460'}
            />
            <Text
              style={[
                styles.sandboxText,
                {
                  color: shouldBypassIAP ? '#856404' : '#0C5460',
                },
              ]}
            >
              {shouldBypassIAP
                ? Platform.OS === 'android' 
                  ? 'Android Dev Mode: IAP requires Play Store publish'
                  : 'Development Mode: IAP Disabled'
                : 'Sandbox Mode: Testing with App Store Connect'}
            </Text>
          </View>
        )}

        {/* Debug Info - Show if no products loaded */}
        {!isLoading && subscriptions.length === 0 && (
          <View
            style={[
              styles.debugBanner,
              { backgroundColor: '#FFF3CD', borderColor: '#856404' },
            ]}
          >
            <Icon name="warning" size={24} color="#856404" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.debugTitle, { color: '#856404' }]}>
                No Products Found
              </Text>
              <Text style={[styles.debugText, { color: '#856404' }]}>
                SKU: {SUBSCRIPTION_SKUS[0]}
              </Text>
              <Text
                style={[
                  styles.debugText,
                  { color: '#856404', fontSize: 12, marginTop: 4 },
                ]}
              >
                Check App Store Connect:
              </Text>
              <Text
                style={[styles.debugText, { color: '#856404', fontSize: 11 }]}
              >
                • Product created with exact SKU
              </Text>
              <Text
                style={[styles.debugText, { color: '#856404', fontSize: 11 }]}
              >
                • Status: "Ready to Submit"
              </Text>
              <Text
                style={[styles.debugText, { color: '#856404', fontSize: 11 }]}
              >
                • Signed in with sandbox account
              </Text>
              <Text
                style={[styles.debugText, { color: '#856404', fontSize: 11 }]}
              >
                • Waited 30+ min after creating product
              </Text>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <Icon name="stars" size={48} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Choose Your Plan
          </Text>
          <Text style={[styles.subtitle, { color: colors.disabled }]}>
            Subscribe to unlock all features for your business
          </Text>
        </View>

        {/* Show actual IAP products if available, otherwise show hardcoded plans */}
        {subscriptions.length > 0
          ? // Display actual IAP products
            subscriptions.map((product, index) => {
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.primary,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    // Extract productId directly in the handler
                    const pid =
                      product.id ||
                      product.productId ||
                      product.productID ||
                      SUBSCRIPTION_SKUS[0];
                    console.log('🔘 Tapping with extracted ID:', pid);
                    handlePurchase(pid);
                  }}
                  disabled={isPurchasing}
                >
                  <View
                    style={[
                      styles.recommendedBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.recommendedText}>FROM APP STORE</Text>
                  </View>

                  <Text style={[styles.planTitle, { color: colors.text }]}>
                    {product.title ||
                      product.displayName ||
                      'Premium Subscription'}
                  </Text>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>
                    {product.displayPrice || `$${product.price}`}
                  </Text>
                  <Text
                    style={[styles.planDescription, { color: colors.disabled }]}
                  >
                    {product.description ||
                      'Unlock all premium features for your business'}
                  </Text>

                  <View style={styles.featuresContainer}>
                    {[
                      'Unlimited deals creation',
                      'Analytics dashboard',
                      'Push notifications',
                      'Email support',
                      'Business profile customization',
                    ].map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <Icon name="check-circle" size={20} color="#4CAF50" />
                        <Text
                          style={[styles.featureText, { color: colors.text }]}
                        >
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {isPurchasing &&
                  selectedPlan === (product.id || SUBSCRIPTION_SKUS[0]) ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={styles.purchaseLoader}
                    />
                  ) : (
                    <View
                      style={[
                        styles.subscribeButton,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.subscribeButtonText}>
                        Subscribe Now
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          : // Fallback to hardcoded plans if IAP products not loaded
            plans.map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: plan.recommended
                      ? colors.primary
                      : colors.border,
                    borderWidth: plan.recommended ? 2 : 1,
                  },
                ]}
                onPress={() => handlePurchase(plan.id)}
                disabled={isPurchasing}
              >
                {plan.recommended && (
                  <View
                    style={[
                      styles.recommendedBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.recommendedText}>RECOMMENDED</Text>
                  </View>
                )}

                <Text style={[styles.planTitle, { color: colors.text }]}>
                  {plan.title}
                </Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {plan.price}
                </Text>
                <Text
                  style={[styles.planDescription, { color: colors.disabled }]}
                >
                  {plan.description}
                </Text>

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Icon name="check-circle" size={20} color="#4CAF50" />
                      <Text
                        style={[styles.featureText, { color: colors.text }]}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {isPurchasing && selectedPlan === plan.id ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={styles.purchaseLoader}
                  />
                ) : (
                  <View
                    style={[
                      styles.subscribeButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.subscribeButtonText}>
                      Subscribe Now
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipForNow}
          disabled={isPurchasing}
        >
          <Text style={[styles.skipButtonText, { color: colors.disabled }]}>
            I'll set this up later
          </Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.disabled }]}>
            • Cancel anytime from your device settings
          </Text>
          <Text style={[styles.infoText, { color: colors.disabled }]}>
            • Payment will be charged to your iTunes Account or Google Play
          </Text>
          <Text style={[styles.infoText, { color: colors.disabled }]}>
            • Subscription automatically renews unless cancelled
          </Text>
        </View>
      </ScrollView>
      <VersionFooter />
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
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  sandboxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  sandboxText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  debugBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 13,
    lineHeight: 18,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    marginTop: 8,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 15,
    marginBottom: 20,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 17,
    marginLeft: 12,
    flex: 1,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  purchaseLoader: {
    marginVertical: 16,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 17,
    textDecorationLine: 'underline',
  },
  infoSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  infoText: {
    fontSize: 13,
    marginBottom: 8,
  },
});

export default BusinessSubscriptionScreen;
