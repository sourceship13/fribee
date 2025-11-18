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
 * - iOS: com.nolimitsera.monthly.subscription.premium
 * - Android: com.nolimitsera.monthly.subscription
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
import { iOSUIKit } from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../../services/api.service';
import * as RNIap from 'react-native-iap';

// Subscription product IDs (configure these in App Store Connect / Google Play Console)
const SUBSCRIPTION_SKUS = Platform.select({
  ios: ['com.nolimitsera.monthly.subscription.premium.staging'],
  android: ['com.nolimitsera.monthly.subscription.premium.staging'],
}) as string[];

// Sandbox mode configuration
// Set FORCE_DEV_MODE to true to simulate purchases without real IAP
// Set to false to test with App Store Connect sandbox accounts
const FORCE_DEV_MODE = false; // TRUE = Bypass IAP, FALSE = Real IAP with sandbox
const USE_SANDBOX = true; // Always true for testing with sandbox accounts


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

  // Hardcoded plans for now (will be replaced with actual IAP products)
  const plans: SubscriptionPlan[] = [
    {
      id: 'monthly',
      title: 'Monthly Subscription',
      price: '$1.99/month',
      description: 'Perfect for getting started',
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
      async (purchase) => {
        console.log('✅ Purchase updated (sandbox):', purchase);
        console.log('📱 Transaction ID:', purchase.transactionId);
        console.log('📱 Product ID:', purchase.productId);
        
        try {
          // Verify the purchase with backend
          console.log('🔵 Verifying purchase with backend...');
          const response = await apiService.verifySubscription({
            platform: Platform.OS,
            purchaseToken: purchase.transactionId || purchase.purchaseToken || '',
            productId: purchase.productId,
            transactionReceipt: Platform.OS === 'ios' && 'transactionReceipt' in purchase 
              ? (purchase as any).transactionReceipt 
              : undefined,
          });

          if (response.success) {
            console.log('✅ Purchase verified successfully');
            // Finish the transaction
            await RNIap.finishTransaction({ purchase });
            
            Alert.alert(
              USE_SANDBOX ? 'Sandbox Purchase Successful!' : 'Subscription Activated!',
              USE_SANDBOX 
                ? 'Test purchase completed successfully! Your subscription is now active. Let\'s complete your business setup.'
                : 'Your subscription is now active. Let\'s complete your business setup.',
              [
                {
                  text: 'Continue',
                  onPress: () => proceedToFinalStep(),
                },
              ]
            );
          } else {
            throw new Error('Verification failed');
          }
        } catch (error) {
          console.error('❌ Purchase verification failed:', error);
          Alert.alert(
            'Verification Error',
            'Failed to verify purchase with backend. The purchase may still be valid.\n\nWould you like to continue anyway?',
            [
              {
                text: 'Continue',
                onPress: async () => {
                  // Finish the transaction anyway
                  await RNIap.finishTransaction({ purchase });
                  proceedToFinalStep();
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
          setSelectedPlan(null);
        }
      }
    );

    const purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error) => {
        console.error('❌ Purchase error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Check error code (cast to string for comparison)
        if (String(error.code) === 'E_USER_CANCELLED') {
          Alert.alert('Purchase Cancelled', 'You cancelled the purchase.');
        } else {
          Alert.alert(
            'Purchase Failed',
            `Error: ${error.message || 'Unknown error'}\nCode: ${error.code}\n\nMake sure:\n• Signed in with sandbox test account\n• Product exists in App Store Connect\n• Network connection is stable`,
            [
              {
                text: 'OK',
              },
            ]
          );
        }
        
        setIsPurchasing(false);
        setSelectedPlan(null);
      }
    );
    
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
      console.log('🔵 Looking for SKUs:', SUBSCRIPTION_SKUS);
      console.log('🔵 FORCE_DEV_MODE:', FORCE_DEV_MODE);
      console.log('🔵 USE_SANDBOX:', USE_SANDBOX);
      
      // Initialize IAP connection
      const result = await RNIap.initConnection();
      console.log('✅ IAP connection result:', result);
      
      // Fetch available subscriptions using the correct API
      console.log('🔵 Fetching products for SKUs:', SUBSCRIPTION_SKUS);
      const products = await RNIap.fetchProducts({
        skus: SUBSCRIPTION_SKUS,
        type: 'subs',
      });
      
      console.log('📦 Products returned:', products?.length || 0);
      if (products && products.length > 0) {
        console.log('✅ Available subscriptions:', JSON.stringify(products, null, 2));
        products.forEach(p => {
          const productId = 'productId' in p ? p.productId : ('productID' in p ? (p as any).productID : 'unknown');
          const price = 'localizedPrice' in p ? p.localizedPrice : ('price' in p ? (p as any).price : 'N/A');
          console.log(`  - ${productId}: ${p.title} - ${price}`);
        });
      } else {
        console.warn('⚠️ No products found!');
        console.warn('⚠️ Make sure products are created in App Store Connect with exact SKU:', SUBSCRIPTION_SKUS[0]);
        console.warn('⚠️ Products must be "Ready to Submit" or "Approved" status');
        console.warn('⚠️ Sign out and sign in with sandbox test account in Settings > App Store');
      }
      
      setSubscriptions(products || []);
      setIsLoading(false);
      
    } catch (error: any) {
      console.error('❌ Failed to initialize IAP:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      const troubleshooting = `\n\nTroubleshooting:\n• Check App Store Connect has product: ${SUBSCRIPTION_SKUS[0]}\n• Product must be "Ready to Submit" or "Approved"\n• Sign in with sandbox test account\n• Check Agreements, Tax, and Banking are complete`;
      
      Alert.alert(
        'IAP Initialization Failed', 
        `${error.message || 'Unknown error'}${troubleshooting}`,
        [
          {
            text: 'Skip for Testing',
            onPress: () => {
              setIsLoading(false);
              // Show hardcoded plans as fallback
            }
          },
          {
            text: 'Retry',
            onPress: () => initializeIAP()
          }
        ]
      );
      setIsLoading(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    setIsPurchasing(true);
    setSelectedPlan(planId);

    // Check if we should bypass IAP entirely (for local development)
    if (FORCE_DEV_MODE) {
      console.log('🛠️ FORCE DEV MODE: Simulating purchase for testing');
      setTimeout(() => {
        Alert.alert(
          'Development Mode',
          'Subscription simulated successfully! (IAP disabled)\n\nTo test with sandbox:\n1. Set FORCE_DEV_MODE = false\n2. Create product in App Store Connect\n3. Use sandbox test account',
          [
            {
              text: 'Continue',
              onPress: () => {
                setIsPurchasing(false);
                proceedToFinalStep();
              },
            },
          ]
        );
      }, 1500);
      return;
    }

    try {
      console.log('🔵 Initiating sandbox purchase for:', SUBSCRIPTION_SKUS[0]);
      console.log('🔵 Sandbox mode enabled:', USE_SANDBOX);
      
      // Request subscription purchase with correct react-native-iap v12+ API
      // This will work with App Store Connect sandbox accounts
      const purchaseRequest = Platform.OS === 'ios'
        ? {
            type: 'subs' as const,
            request: {
              ios: {
                sku: SUBSCRIPTION_SKUS[0],
              },
            },
          }
        : {
            type: 'subs' as const,
            request: {
              android: {
                skus: [SUBSCRIPTION_SKUS[0]],
              },
            },
          };

      await RNIap.requestPurchase(purchaseRequest as any);
      
      console.log('✅ Purchase request sent - waiting for App Store response');
      console.log('📱 Make sure you\'re signed in with a sandbox test account in Settings > App Store');
      // Purchase will be handled by listeners set up in useEffect
      
    } catch (error: any) {
      console.error('❌ Purchase request failed:', error);
      
      // Check if it's a "product not found" error
      if (error.message?.includes('sku not found') || error.code === 'unknown') {
        Alert.alert(
          'Product Not Found in Sandbox',
          `The subscription product hasn't been configured in App Store Connect.\n\nProduct ID: ${SUBSCRIPTION_SKUS[0]}\n\nSetup Steps:\n1. Go to App Store Connect\n2. Create subscription product with this ID\n3. Submit for review (or use in sandbox)\n4. Sign in with sandbox test account\n\nOr set FORCE_DEV_MODE = true to bypass IAP.`,
          [
            {
              text: 'Skip for Testing',
              onPress: () => {
                setIsPurchasing(false);
                setSelectedPlan(null);
                proceedToFinalStep();
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setIsPurchasing(false);
                setSelectedPlan(null);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Purchase Error',
          `Failed to start purchase.\n\nError: ${error.message || 'Unknown error'}\n\nMake sure:\n• You're signed in with a sandbox test account\n• Product is created in App Store Connect\n• App is properly configured for IAP`,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setIsPurchasing(false);
                setSelectedPlan(null);
              },
            },
          ]
        );
      }
      
      setIsPurchasing(false);
      setSelectedPlan(null);
    }
  };

  const proceedToFinalStep = () => {
    // Navigate to the final screen with all data including subscription info
    navigation.navigate('BusinessCreationScreen4', {
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
            navigation.navigate('BusinessCreationScreen4', {
              ...businessData,
              hasSubscription: false,
            });
          },
        },
      ]
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
        
        {/* Debug Info - Show if no products loaded */}
        {!isLoading && subscriptions.length === 0 && (
          <View style={[styles.debugBanner, { backgroundColor: '#FFF3CD', borderColor: '#856404' }]}>
            <Icon name="warning" size={24} color="#856404" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.debugTitle, { color: '#856404' }]}>No Products Found</Text>
              <Text style={[styles.debugText, { color: '#856404' }]}>SKU: {SUBSCRIPTION_SKUS[0]}</Text>
              <Text style={[styles.debugText, { color: '#856404', fontSize: 12, marginTop: 4 }]}>Check App Store Connect:</Text>
              <Text style={[styles.debugText, { color: '#856404', fontSize: 11 }]}>• Product created with exact SKU</Text>
              <Text style={[styles.debugText, { color: '#856404', fontSize: 11 }]}>• Status: "Ready to Submit"</Text>
              <Text style={[styles.debugText, { color: '#856404', fontSize: 11 }]}>• Signed in with sandbox account</Text>
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
        {subscriptions.length > 0 ? (
          // Display actual IAP products
          subscriptions.map((product) => (
            <TouchableOpacity
              key={product.productId}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
              onPress={() => handlePurchase(product.productId)}
              disabled={isPurchasing}
            >
              <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.recommendedText}>FROM APP STORE</Text>
              </View>
              
              <Text style={[styles.planTitle, { color: colors.text }]}>
                {product.title || 'Premium Subscription'}
              </Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>
                {product.localizedPrice || product.price || '$1.99/month'}
              </Text>
              <Text style={[styles.planDescription, { color: colors.disabled }]}>
                {product.description || 'Unlock all premium features for your business'}
              </Text>

              <View style={styles.featuresContainer}>
                {[
                  'Unlimited deals creation',
                  'Analytics dashboard',
                  'Push notifications',
                  'Email support',
                  'Business profile customization',
                ].map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Icon name="check-circle" size={20} color="#4CAF50" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {isPurchasing && selectedPlan === product.productId ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.purchaseLoader} />
              ) : (
                <View style={[styles.subscribeButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          // Fallback to hardcoded plans if IAP products not loaded
          plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: plan.recommended ? colors.primary : colors.border,
                borderWidth: plan.recommended ? 2 : 1,
              },
            ]}
            onPress={() => handlePurchase(plan.id)}
            disabled={isPurchasing}
          >
            {plan.recommended && (
              <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
            )}
            
            <Text style={[styles.planTitle, { color: colors.text }]}>
              {plan.title}
            </Text>
            <Text style={[styles.planPrice, { color: colors.primary }]}>
              {plan.price}
            </Text>
            <Text style={[styles.planDescription, { color: colors.disabled }]}>
              {plan.description}
            </Text>

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Icon name="check-circle" size={20} color="#4CAF50" />
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {isPurchasing && selectedPlan === plan.id ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.purchaseLoader} />
            ) : (
              <View style={[styles.subscribeButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
              </View>
            )}
          </TouchableOpacity>
        ))
        )}

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
