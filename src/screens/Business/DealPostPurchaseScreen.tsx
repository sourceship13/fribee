/**
 * Deal Post Purchase Screen
 * 
 * Handles In-App Purchase for creating a single deal post.
 * Price: $0.99 per deal post
 * 
 * CONFIGURATION:
 * - FORCE_DEV_MODE: Set to true to bypass IAP (simulated purchases)
 * - USE_SANDBOX: Set to true for App Store Connect sandbox testing
 * 
 * PRODUCT IDs:
 * - iOS: com.nolimitsera.deal.post
 * - Android: com.nolimitsera.deal.post
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
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Toolbar from '../../components/Toolbar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api.service';
import * as RNIap from 'react-native-iap';
import VersionFooter from '../../components/VersionFooter';

// =====================================================
// 🔧 IAP ENVIRONMENT CONFIGURATION
// =====================================================
// Set this to 'staging' or 'production' to control which SKUs are used
const IAP_ENVIRONMENT: 'staging' | 'production' = __DEV__ ? 'staging' : 'production';

// 🧪 TEST MODE - Bypass IAP and test backend verification directly (ANDROID ONLY)
// Set to true to skip Google Play billing and test with mock purchase data
// iOS will always use real Apple IAP (sandbox or production)
const TEST_MODE_BACKEND_ONLY = false; // Disabled - use real IAP for both platforms
// =====================================================

const IS_PRODUCTION = IAP_ENVIRONMENT === 'production';

// Staging vs Production Product IDs
const STAGING_SKUS = {
  ios: 'com.nolimitsera.staging.deal.post',
  android: 'com.nolimitsera.staging.deal.post',
};

const PRODUCTION_SKUS = {
  ios: 'com.nolimitsera.prod.deal.post',
  android: 'com.nolimitsera.prod.deal.post',
};

const ACTIVE_SKUS = IS_PRODUCTION ? PRODUCTION_SKUS : STAGING_SKUS;

// Product IDs for deal post purchase
const DEAL_POST_SKUS = Platform.select({
  ios: [ACTIVE_SKUS.ios],
  android: [ACTIVE_SKUS.android],
}) as string[];

// Configuration flags
const FORCE_DEV_MODE = false; // Set to true to bypass IAP
const USE_SANDBOX = true; // Always true for testing

const DealPostPurchaseScreen = ({ navigation }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    initializeIAP();
    
    // Set up purchase listeners
    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase) => {
        console.log('✅ Deal post purchase updated:', purchase);
        console.log('📱 Transaction ID:', purchase.transactionId);
        console.log('📱 Full purchase object:', JSON.stringify(purchase, null, 2));
        
        try {
          console.log('🔵 Verifying purchase with backend...');
          
          // For iOS, extract the receipt data
          const iosPurchase = purchase as any;
          let receiptData = undefined;
          
          if (Platform.OS === 'ios') {
            receiptData = iosPurchase.transactionReceipt || 
                         iosPurchase.receipt || 
                         purchase.purchaseToken || 
                         iosPurchase.signedTransactionReceipt;
            
            console.log('📱 iOS Receipt check:', {
              hasTransactionReceipt: !!iosPurchase.transactionReceipt,
              hasReceipt: !!iosPurchase.receipt,
              hasPurchaseToken: !!purchase.purchaseToken,
              hasSignedReceipt: !!iosPurchase.signedTransactionReceipt,
            });
            
            if (receiptData) {
              console.log('📱 Receipt found! Length:', receiptData.length);
              console.log('📱 Receipt type:', receiptData.startsWith('eyJ') ? 'JWT (StoreKit 2)' : 'Base64 Receipt');
            } else {
              console.warn('⚠️ No receipt data found in iOS purchase object!');
            }
          }
          
          const response = await apiService.verifyConsumablePurchase({
            platform: Platform.OS,
            purchaseToken: purchase.transactionId || purchase.purchaseToken || '',
            productId: purchase.productId,
            GOOGLE_PACKAGE_NAME: Platform.OS === 'android' ? 'com.nolimitseradeals.staging' : undefined,
            transactionReceipt: receiptData,
          });

          if (response.success) {
            console.log('✅ Purchase verified successfully');
            await RNIap.finishTransaction({ purchase });
            
            Alert.alert(
              USE_SANDBOX ? 'Sandbox Purchase Successful!' : 'Purchase Complete!',
              'You can now create your deal post.',
              [
                {
                  text: 'Create Deal',
                  onPress: () => proceedToCreateDeal(),
                },
              ]
            );
          } else {
            console.error('❌ Verification failed:', response.message);
            console.error('❌ Full response:', JSON.stringify(response, null, 2));
            
            // Check if it's a duplicate transaction error (check both message and error fields)
            const errorText = (response.message || response.error || '').toLowerCase();
            if (errorText.includes('duplicate') || errorText.includes('unique_transaction') || errorText.includes('violates')) {
              console.log('⚠️ Duplicate transaction detected - finishing anyway');
              await RNIap.finishTransaction({ purchase });
              
              Alert.alert(
                'Transaction Already Verified',
                'This purchase was already verified. You can proceed to create your deal.',
                [
                  {
                    text: 'Create Deal',
                    onPress: () => proceedToCreateDeal(),
                  },
                ]
              );
            } else {
              throw new Error('Verification failed');
            }
          }
        } catch (error) {
          console.error('❌ Purchase verification failed:', error);
          Alert.alert(
            'Verification Error',
            'Failed to verify purchase with backend. Would you like to continue anyway?',
            [
              {
                text: 'Continue',
                onPress: async () => {
                  await RNIap.finishTransaction({ purchase });
                  proceedToCreateDeal();
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
        } finally {
          setIsPurchasing(false);
        }
      }
    );

    const purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error) => {
        console.error('❌ Purchase error:', error);
        
        if (String(error.code) === 'E_USER_CANCELLED') {
          Alert.alert('Purchase Cancelled', 'You cancelled the purchase.');
        } else {
          Alert.alert(
            'Purchase Failed',
            `Error: ${error.message || 'Unknown error'}\n\nMake sure:\n• Signed in with sandbox test account (if testing)\n• Network connection is stable`,
            [{ text: 'OK' }]
          );
        }
        
        setIsPurchasing(false);
      }
    );
    
    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
      RNIap.endConnection();
    };
  }, []);

  const initializeIAP = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔵 Initializing IAP...');
      console.log('🔵 Environment:', IAP_ENVIRONMENT);
      console.log('🔵 Product SKUs to fetch:', DEAL_POST_SKUS);
      
      await RNIap.initConnection();
      console.log('✅ IAP connection initialized');
      
      // Fetch the deal post product
      const products = await RNIap.fetchProducts({
        skus: DEAL_POST_SKUS,
        type: 'in-app', // One-time purchase, not subscription
      });
      
      console.log('📦 Products returned:', products?.length || 0);
      console.log('📦 Product details:', JSON.stringify(products, null, 2));
      
      if (products && products.length > 0) {
        setProduct(products[0]);
        console.log('✅ Product loaded:', products[0].productId);
      } else {
        console.warn('⚠️ No products found! SKU may not exist or not be activated in Play Console');
        Alert.alert(
          'Product Not Available',
          `Could not find product: ${DEAL_POST_SKUS[0]}\n\nPlease ensure:\n• Product is created in Play Console\n• Product is set to "Active"\n• App is installed from Play Store (Internal Testing)\n• Wait 24 hours after creating product`,
          [{ text: 'OK' }]
        );
      }
      
      setIsLoading(false);
      
    } catch (error: any) {
      console.error('❌ Failed to initialize IAP:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      Alert.alert(
        'IAP Initialization Failed',
        `Error: ${error.message || 'Unknown error'}\n\nMake sure app is installed from Play Store Internal Testing.`,
        [{ text: 'OK' }]
      );
      
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);

    // TEST MODE: Bypass IAP and test backend verification directly (Android only)
    if (TEST_MODE_BACKEND_ONLY) {
      console.log('🧪 TEST MODE: Bypassing IAP, testing backend verification');
      console.log('🧪 Product ID:', DEAL_POST_SKUS[0]);
      
      try {
        // Generate mock purchase data
        const mockPurchaseToken = `mock_deal_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const mockTransactionReceipt = JSON.stringify({
          productId: DEAL_POST_SKUS[0],
          transactionId: `mock_deal_txn_${Date.now()}`,
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
        const verificationResult = await apiService.verifyConsumablePurchase({
          platform: Platform.OS,
          purchaseToken: mockPurchaseToken,
          productId: DEAL_POST_SKUS[0],
          GOOGLE_PACKAGE_NAME: 'com.nolimitseradeals.staging',
          transactionReceipt: mockTransactionReceipt,
        });

        console.log('🧪 Backend verification result:', JSON.stringify(verificationResult, null, 2));

        if (verificationResult.success) {
          Alert.alert(
            '✅ Test Mode Success',
            `Backend verification successful!\n\nProduct: ${DEAL_POST_SKUS[0]}\n\nYou can now create your deal.`,
            [
              {
                text: 'Create Deal',
                onPress: () => {
                  setIsPurchasing(false);
                  proceedToCreateDeal();
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
              },
            },
          ],
        );
      }
      return;
    }

    // Development mode bypass
    if (FORCE_DEV_MODE) {
      console.log('🛠️ FORCE DEV MODE: Simulating deal post purchase');
      setTimeout(() => {
        Alert.alert(
          'Development Mode',
          'Deal post purchase simulated successfully! (IAP disabled)\n\nYou can now create your deal.',
          [
            {
              text: 'Create Deal',
              onPress: () => {
                setIsPurchasing(false);
                proceedToCreateDeal();
              },
            },
          ]
        );
      }, 1500);
      return;
    }

    try {
      console.log('🔵 Initiating purchase for:', DEAL_POST_SKUS[0]);
      console.log('🔵 Sandbox mode enabled:', USE_SANDBOX);
      
      const purchaseRequest = Platform.OS === 'ios'
        ? {
            type: 'in-app' as const,
            request: {
              ios: {
                sku: DEAL_POST_SKUS[0],
              },
            },
          }
        : {
            type: 'in-app' as const,
            request: {
              android: {
                skus: [DEAL_POST_SKUS[0]],
              },
            },
          };

      await RNIap.requestPurchase(purchaseRequest as any);
      
      console.log('✅ Purchase request sent');
      
    } catch (error: any) {
      console.error('❌ Purchase request failed:', error);
      
      if (error.message?.includes('sku not found') || error.code === 'unknown') {
        Alert.alert(
          'Product Not Found',
          `The deal post product hasn't been configured in App Store Connect.\n\nProduct ID: ${DEAL_POST_SKUS[0]}\n\nOr set FORCE_DEV_MODE = true to bypass IAP.`,
          [
            {
              text: 'Skip for Testing',
              onPress: () => {
                setIsPurchasing(false);
                proceedToCreateDeal();
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setIsPurchasing(false);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Purchase Error',
          `Failed to start purchase.\n\nError: ${error.message || 'Unknown error'}`,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setIsPurchasing(false);
              },
            },
          ]
        );
      }
      
      setIsPurchasing(false);
    }
  };

  const proceedToCreateDeal = () => {
    navigation.navigate('CreateDeal');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Purchase?',
      'You need to purchase to create a deal post. Are you sure you want to go back?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Go Back',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Toolbar
          title="Create Deal Post"
          onBack={() => navigation.goBack()}
          showSettings={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toolbar
        title="Create Deal Post"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Sandbox Mode Indicator */}
        {(USE_SANDBOX || FORCE_DEV_MODE) && (
          <View style={[styles.sandboxBanner, { 
            backgroundColor: FORCE_DEV_MODE ? '#FFF3CD' : '#D1ECF1' 
          }]}>
            <Icon 
              name={FORCE_DEV_MODE ? "developer-mode" : "science"} 
              size={20} 
              color={FORCE_DEV_MODE ? "#856404" : "#0C5460"} 
            />
            <Text style={[styles.sandboxText, { 
              color: FORCE_DEV_MODE ? "#856404" : "#0C5460" 
            }]}>
              {FORCE_DEV_MODE 
                ? "Development Mode: IAP Disabled" 
                : "Sandbox Mode: Testing with App Store Connect"}
            </Text>
          </View>
        )}
        
        <View style={styles.header}>
          <Icon name="campaign" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Create a Deal Post
          </Text>
          <Text style={[styles.subtitle, { color: colors.disabled }]}>
            Reach thousands of local customers with your special offer
          </Text>
        </View>

        <View style={[styles.productCard, { 
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          borderWidth: 2,
        }]}>
          <View style={styles.priceSection}>
            <Text style={[styles.priceLabel, { color: colors.disabled }]}>
              One-Time Purchase
            </Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              $0.99
            </Text>
            <Text style={[styles.priceDescription, { color: colors.disabled }]}>
              per deal post
            </Text>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={[styles.featuresTitle, { color: colors.text }]}>
              What's Included:
            </Text>
            
            <View style={styles.featureRow}>
              <Icon name="visibility" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Reach local customers in your area
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <Icon name="trending-up" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Boost your business visibility
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <Icon name="schedule" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Set custom expiration dates
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <Icon name="photo-library" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Add photos to showcase your deal
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <Icon name="analytics" size={24} color="#4CAF50" />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Track deal performance
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.purchaseButton, { 
              backgroundColor: isPurchasing ? colors.disabled : colors.primary 
            }]}
            onPress={handlePurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                Purchase for $0.99
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isPurchasing}
        >
          <Text style={[styles.skipButtonText, { color: colors.disabled }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.disabled }]}>
            • One-time purchase per deal post
          </Text>
          <Text style={[styles.infoText, { color: colors.disabled }]}>
            • Payment charged to your iTunes Account or Google Play
          </Text>
          <Text style={[styles.infoText, { color: colors.disabled }]}>
            • No recurring charges or subscriptions
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  productCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  priceSection: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    marginVertical: 8,
  },
  priceDescription: {
    fontSize: 16,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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

export default DealPostPurchaseScreen;
