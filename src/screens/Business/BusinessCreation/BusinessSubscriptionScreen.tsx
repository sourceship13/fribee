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


// We'll use react-native-iap for in-app purchases
// import * as RNIap from 'react-native-iap';

// Subscription product IDs (configure these in App Store Connect / Google Play Console)
const SUBSCRIPTION_SKUS = Platform.select({
  ios: ['com.nolimitsera.monthly.subscription.premium'],
  android: ['com.nolimitsera.monthly.subscription'],
}) as string[];

// Development mode flag - set to true to bypass IAP during testing
const DEV_MODE = __DEV__; // Automatically true in development builds

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
        console.log('Purchase updated:', purchase);
        
        try {
          // Verify the purchase with backend
          const response = await apiService.verifySubscription({
            platform: Platform.OS,
            purchaseToken: purchase.transactionId || purchase.purchaseToken || '',
            productId: purchase.productId,
            transactionReceipt: Platform.OS === 'ios' && 'transactionReceipt' in purchase 
              ? (purchase as any).transactionReceipt 
              : undefined,
          });

          if (response.success) {
            // Finish the transaction
            await RNIap.finishTransaction({ purchase });
            
            Alert.alert(
              'Subscription Activated!',
              'Your subscription is now active. Let\'s complete your business setup.',
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
          console.error('Purchase verification failed:', error);
          Alert.alert('Error', 'Failed to verify purchase. Please contact support.');
        } finally {
          setIsPurchasing(false);
          setSelectedPlan(null);
        }
      }
    );

    const purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error) => {
        console.error('Purchase error:', error);
        
        // Check error code (cast to string for comparison)
        if (String(error.code) === 'E_USER_CANCELLED') {
          Alert.alert('Purchase Cancelled', 'You cancelled the purchase.');
        } else {
          Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
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
      
      // Initialize IAP connection
      const result = await RNIap.initConnection();
      console.log('IAP connection result:', result);
      
      // Fetch available subscriptions using the correct API
      const products = await RNIap.fetchProducts({
        skus: SUBSCRIPTION_SKUS,
        type: 'subs',
      });
      console.log('Available subscriptions:', products);
      setSubscriptions(products || []);
      
      setIsLoading(false);
      
    } catch (error: any) {
      console.error('Failed to initialize IAP:', error);
      Alert.alert('Error', 'Failed to load subscription plans. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    setIsPurchasing(true);
    setSelectedPlan(planId);

    // Development mode bypass
    if (DEV_MODE) {
      console.log('🛠️ DEV MODE: Simulating purchase for testing');
      setTimeout(() => {
        Alert.alert(
          'Development Mode',
          'Subscription simulated successfully! (IAP disabled in dev mode)\n\nTo test real purchases:\n1. Create product in App Store Connect\n2. Use sandbox test account\n3. Build in Release mode',
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
      // Request subscription purchase with correct react-native-iap v12+ API
      // The purchase result will be handled by the purchaseUpdatedListener
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
      
      console.log('Purchase request sent successfully');
      // Purchase will be handled by listeners set up in useEffect
      
    } catch (error: any) {
      console.error('Purchase request failed:', error);
      
      // Check if it's a "product not found" error
      if (error.message?.includes('sku not found') || error.code === 'unknown') {
        Alert.alert(
          'Product Not Configured',
          'The subscription product hasn\'t been set up in App Store Connect yet.\n\nProduct ID: ' + SUBSCRIPTION_SKUS[0] + '\n\nFor testing, the app is running in development mode with simulated purchases.',
          [
            {
              text: 'Skip for Now',
              onPress: () => {
                setIsPurchasing(false);
                setSelectedPlan(null);
                skipForNow();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to start purchase. Please try again.');
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
        <View style={styles.header}>
          <Icon name="stars" size={48} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Choose Your Plan
          </Text>
          <Text style={[styles.subtitle, { color: colors.disabled }]}>
            Subscribe to unlock all features for your business
          </Text>
        </View>

        {plans.map((plan) => (
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
