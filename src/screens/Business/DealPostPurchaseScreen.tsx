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
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { iOSUIKit } from 'react-native-typography';
import apiService from '../../services/api.service';
import * as RNIap from 'react-native-iap';
import VersionFooter from '../../components/VersionFooter';

// =====================================================
// 🔧 IAP ENVIRONMENT CONFIGURATION
// =====================================================
// Set this to 'staging' or 'production' to control which SKUs are used
// Note: For staging release builds, we need to explicitly use 'staging'
const IAP_ENVIRONMENT: 'staging' | 'production' = 'staging'; // Force staging for staging builds

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
            
            // Finish transaction and consume for Android
            await RNIap.finishTransaction({ purchase, isConsumable: true });
            
            if (Platform.OS === 'android') {
              console.log('🤖 Consuming Android purchase...');
              await RNIap.consumePurchaseAndroid(purchase.purchaseToken);
              console.log('✅ Android purchase consumed');
            }
            
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
              
              // Finish transaction and consume for Android
              await RNIap.finishTransaction({ purchase, isConsumable: true });
              
              if (Platform.OS === 'android') {
                console.log('🤖 Consuming Android purchase (duplicate)...');
                await RNIap.consumePurchaseAndroid(purchase.purchaseToken);
                console.log('✅ Android purchase consumed');
              }
              
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
                  // Finish transaction and consume for Android
                  await RNIap.finishTransaction({ purchase, isConsumable: true });
                  
                  if (Platform.OS === 'android') {
                    console.log('🤖 Consuming Android purchase (error case)...');
                    await RNIap.consumePurchaseAndroid(purchase.purchaseToken);
                    console.log('✅ Android purchase consumed');
                  }
                  
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

  // Custom header component
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[iOSUIKit.title3Emphasized, { color: colors.text }]}>Deal Creation</Text>
      <View style={styles.headerPlaceholder} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
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
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Create Deal Post
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Reach thousands of local customers with{"\n"}your special offer
          </Text>
        </View>

        {/* Product Card */}
        <View style={[styles.productCard, { 
          backgroundColor: colors.background,
          shadowColor: '#000',
          borderWidth: 1,
          borderColor: colors.subscriptionBorderGrey,
        }]}>
          {/* Price Section */}
          <Text style={[styles.priceLabel, { color: colors.text }]}>
            One-time purchase
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>$0.99</Text>
            <Text style={[styles.priceUnit, { color: colors.textSecondary }]}> / deal post</Text>
          </View>

          {/* Purchase Button */}
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
              <Text style={styles.purchaseButtonText}>Purchase Now</Text>
            )}
          </TouchableOpacity>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={[styles.checkCircle, { borderColor: colors.primary }]}>
                <Icon name="check" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Reach local customers in your area
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <View style={[styles.checkCircle, { borderColor: colors.primary }]}>
                <Icon name="check" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Boost your business visibility
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <View style={[styles.checkCircle, { borderColor: colors.primary }]}>
                <Icon name="check" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Set custom expiration dates
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <View style={[styles.checkCircle, { borderColor: colors.primary }]}>
                <Icon name="check" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Add photos to showcase your deal
              </Text>
            </View>
            
            <View style={styles.featureRow}>
              <View style={[styles.checkCircle, { borderColor: colors.primary }]}>
                <Icon name="check" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Track deal performance
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Link */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleSkip}
          disabled={isPurchasing}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer Info */}
      <View style={[styles.footerInfo, { backgroundColor: colors.border + '30' }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          • One-time purchase per deal post
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          • Payment will be charged to your iTunes Account or Google Play
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          • No recurring charges or subscriptions
        </Text>
      </View>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  productCard: {
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 15,
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  featuresContainer: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 11,
    marginBottom: 4,
  },
});

export default DealPostPurchaseScreen;
