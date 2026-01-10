import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Dimensions,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth, getColors } from '../../libs/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { iOSUIKit } from 'react-native-typography';
import { useDealSharing } from '../../libs/hooks/useDealSharing';
import AnalyticsService from '../../services/analytics.service';
import ContactSelectionModal from './ContactSelectionModal';
import ApiService from '../../services/api.service';
import { storePendingDeepLink } from '../../services/navigation.service';

// Type definitions for better type safety
interface DealDetailProps {
  navigation?: any;
  route?: {
    params?: {
      deal?: any;
      dealId?: string; // Support deep link parameter
    };
  };
  deal?: any; // Optional - can be passed directly or fetched via dealId from route params
  requiredShares?: number;
  style?: any;
}

// Error boundary component for catching render errors
class DealDetailErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(
      'DealDetail Error Boundary caught an error:',
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Text style={[iOSUIKit.body, { marginBottom: 10 }]}>
            Something went wrong
          </Text>
          <Text
            style={[iOSUIKit.subhead, { color: '#666', textAlign: 'center' }]}
          >
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const DealDetailScreen: React.FC<DealDetailProps> = props => {
  // Bulletproof parameter extraction
  const safeProps = props || {};
  const navigation = safeProps.navigation || null;
  const route = safeProps.route || null;

  // Extract params reactively - these will update when route changes
  const routeParams = route?.params || {};
  const initialDeal = routeParams.deal || null;
  const deepLinkDealId = routeParams.dealId ? String(routeParams.dealId) : null;

  console.log('🔗 DealDetailScreen render - params:', { 
    hasInitialDeal: !!initialDeal, 
    deepLinkDealId,
    allParams: routeParams 
  });

  const {
    isDarkMode,
    user,
    isAuthenticated,
    heartedDeals,
    isDealHearted,
    toggleHeartDeal,
    deals,
  } = useAuth();
  const colors = getColors(isDarkMode);
  const insets = useSafeAreaInsets();

  const [deal, setDeal] = useState(initialDeal || null);
  const [loading, setLoading] = useState(!initialDeal && !!deepLinkDealId);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a guest view (deep link without auth)
  const isGuestView = !isAuthenticated && !!deepLinkDealId;

  // Fetch deal from API when opened via deep link
  useEffect(() => {
    console.log(`🔗 DealDetailScreen: useEffect triggered`, { 
      deepLinkDealId, 
      hasInitialDeal: !!initialDeal,
      hasDeal: !!deal,
      isAuthenticated,
      isGuestView
    });
    
    const fetchDealFromDeepLink = async () => {
      // Only fetch if we have a dealId but no deal object
      if (deepLinkDealId && !initialDeal) {
        console.log(`🔗 Deep link: Fetching deal with ID: ${deepLinkDealId}`);
        setLoading(true);
        setError(null);
        
        try {
          // First try to find deal in existing deals list (only if authenticated)
          if (isAuthenticated && deals.length > 0) {
            const existingDeal = deals.find(
              d => String(d.id) === deepLinkDealId || String(d.deal_id) === deepLinkDealId
            );
            
            if (existingDeal) {
              console.log('✅ Found deal in local cache');
              setDeal(existingDeal);
              setLoading(false);
              return;
            }
          }
          
          // Fetch from API - use public endpoint for guest users
          console.log(`📡 Fetching deal from API (${isGuestView ? 'public' : 'authenticated'})...`);
          
          let response;
          if (isGuestView) {
            // Try public endpoint first for guest users
            try {
              response = await ApiService.getDealByIdPublic(deepLinkDealId);
            } catch (publicErr) {
              console.log('📡 Public endpoint failed, trying authenticated endpoint...');
              response = await ApiService.getDealById(deepLinkDealId);
            }
          } else {
            response = await ApiService.getDealById(deepLinkDealId);
          }
          
          if (response.data) {
            console.log('✅ Deal fetched successfully:', response.data);
            setDeal(response.data);
          } else {
            console.error('❌ Deal not found in API response');
            setError('Deal not found');
          }
        } catch (err) {
          console.error('❌ Error fetching deal:', err);
          setError('Failed to load deal');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchDealFromDeepLink();
  }, [deepLinkDealId, initialDeal, deals, isAuthenticated, isGuestView]);

  // Simple heart state - just use global state directly
  const dealId = deal?.deal_id || deal?.id;
  const isSaved = dealId ? isDealHearted(dealId) : false;

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [waitingForPermission, setWaitingForPermission] = useState(false);

  const {
    contacts,
    selectedContacts,
    shareProgress,
    hasContactsPermission,
    requestContactsAccess,
    toggleContactSelection,
    shareDeal,
    searchContacts,
    clearSelection,
    canShare,
    selectedCount,
    loading: sharingLoading,
  } = useDealSharing(dealId, deal?.min_shares_required || 3);

  // Track deal view when component mounts
  useEffect(() => {
    if (dealId && deal?.id !== 0) {
      AnalyticsService.trackDealTap(dealId.toString(), {
        title: deal?.offer || deal?.title,
        business: deal?.business_name || deal?.business,
      });
    }
  }, [dealId]);

  useEffect(() => {
    if (
      waitingForPermission &&
      hasContactsPermission === 'granted' &&
      contacts &&
      contacts.length > 0
    ) {
      setWaitingForPermission(false);
      setShowModal(true);
    }
  }, [waitingForPermission, hasContactsPermission, contacts]);

  // When a deal becomes redeemable (enough shares), auto-heart it and ensure UI updates
  useEffect(() => {
    const isNowRedeemable = shareProgress?.canRedeem;
    if (isNowRedeemable && dealId && !isSaved) {
      (async () => {
        try {
          await toggleHeartDeal(dealId, deal);
        } catch (err) {
          console.warn('Auto-heart failed for deal', dealId, err);
        }
      })();
    }
  }, [shareProgress?.canRedeem, dealId, isSaved, toggleHeartDeal, deal]);

  const handleRedeem = () => {
    const heartedDealIds = new Set(
      (heartedDeals || []).map(d => d.deal_id || d.id),
    );
    const allSavedDeals = deals.filter(deal =>
      heartedDealIds.has(deal.id || deal.deal_id),
    );
    const readyToRedeemDeals = allSavedDeals.filter(deal => {
      deal.redemption_status &&
        deal.redemption_status.toLowerCase() === 'ready to redeem';
      navigation.navigate('Redemption', { deal });
    });
  };

  // Handle missing navigation or deal
  if (!navigation) {
    console.error('DealDetailScreen: navigation is undefined');
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Navigation error - props missing
          </Text>
          <Text
            style={[
              styles.errorText,
              { color: colors.textSecondary, fontSize: 12, marginTop: 8 },
            ]}
          >
            Check console for details
          </Text>
        </View>
      </View>
    );
  }

  // Show loading state when fetching deal from deep link
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.overlayButtons, { top: insets.top + 10, position: 'absolute', left: 16, right: 16, zIndex: 10 }]}>
          <TouchableOpacity
            style={[
              styles.circleButton,
              { backgroundColor: colors.overlayButton },
            ]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.errorText, { color: colors.text, marginTop: 16 }]}>
            Loading deal...
          </Text>
        </View>
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.overlayButtons, { top: insets.top + 10, position: 'absolute', left: 16, right: 16, zIndex: 10 }]}>
          <TouchableOpacity
            style={[
              styles.circleButton,
              { backgroundColor: colors.overlayButton },
            ]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || 'Deal not found'}
          </Text>
          <Text
            style={[
              styles.errorText,
              { color: colors.textSecondary, fontSize: 12, marginTop: 8 },
            ]}
          >
            Unable to load deal details
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 20,
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: colors.primary,
              borderRadius: 8,
            }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Handle display issues
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* <Toolbar title="Deal Details" onBack={() => navigation.goBack()} /> */}
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Error: {error}
          </Text>
        </View>
      </View>
    );
  }

  const renderImage = ({ item, index }: { item: string; index: number }) => {
    // Try both ImageBackground and fallback to regular Image for debugging
    return (
      <View style={styles.dealImage}>
        {/* Primary: ImageBackground */}
        <ImageBackground
          source={{ uri: item }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={error => {
            console.error(
              `❌ ImageBackground ${index} failed to load:`,
              error.nativeEvent.error,
            );
            console.error(`❌ Failed URL:`, item);
          }}
        >
          <View style={styles.imageOverlay} />
        </ImageBackground>
      </View>
    );
  };

  const handlePress = async () => {
    // Check contacts permission first
    if (hasContactsPermission !== 'granted') {
      Alert.alert(
        'Contacts Permission Required',
        'We need access to your contacts to share deals with friends. Would you like to grant permission?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Grant Permission',
            onPress: async () => {
              try {
                setWaitingForPermission(true);
                await requestContactsAccess();
                // useEffect will handle opening modal when permission is granted
              } catch (error) {
                setWaitingForPermission(false);
                Alert.alert(
                  'Permission Error',
                  'Failed to request contacts permission. Please try enabling it in Settings.',
                  [{ text: 'OK' }],
                );
              }
            },
          },
        ],
      );
      return;
    }
    setShowModal(true);
  };

  const handleShare = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert(
        'No Contacts Selected',
        'Please select at least one contact to share with.',
      );
      return;
    }

    try {
      const contactCount = selectedContacts.length;
      setShowModal(false); // Close modal immediately

      await shareDeal(deal);

      // Track share analytics
      if (dealId) {
        AnalyticsService.trackDealShare(dealId.toString(), 'contacts');
      }

      // The shareDeal function automatically updates shareProgress via loadShareProgress()
      // Button text will now show updated count (e.g., "2/3" after sharing with 2 people)
    } catch (error) {
      Alert.alert('Error', 'Failed to share deal. Please try again.');
    }
  };

  const filteredContacts = searchContacts(searchQuery);
  const currentShares = shareProgress?.currentShares || 0;
  const canRedeem = shareProgress?.canRedeem || false;

  console.log('Rendering DealDetailScreen for deal:', deal);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Deal Images */}
        <View style={styles.imageContainer}>
          {/* Overlay Buttons */}
          <View style={[styles.overlayButtons, { top: insets.top + 10 }]}>
            <TouchableOpacity
              style={[
                styles.circleButton,
                { backgroundColor: colors.overlayButton },
              ]}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.circleButton,
                { backgroundColor: colors.overlayButton },
              ]}
              onPress={() => dealId && toggleHeartDeal(dealId, deal)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={isSaved ? 'favorite' : 'favorite-border'}
                size={24}
                color={isSaved ? '#ff4458' : colors.text}
              />
            </TouchableOpacity>
          </View>
          {(() => {
            // Look for DEAL images (not business images) from the deals API response
            const deal_images = deal.deal_images; // Deal-specific images array
            const deal_image_url = deal.deal_image_url; // Single deal image URL
            const image_url = deal.image_url; // Generic image URL
            const images = deal.images; // Generic images array
            const business_images = deal.business_images; // Business images (fallback)

            // Prioritize deal-specific images over business images
            let finalImages = null;

            // Extract image URLs from deal_images array (objects with image_url property)
            if (
              deal_images &&
              Array.isArray(deal_images) &&
              deal_images.length > 0
            ) {
              finalImages = deal_images
                .filter(img => img && typeof img === 'object' && img.image_url)
                .map(img => img.image_url)
                .filter(
                  url =>
                    url && typeof url === 'string' && url.trim().length > 0,
                );
            }
            // Single deal image URL
            else if (
              deal_image_url &&
              typeof deal_image_url === 'string' &&
              deal_image_url.trim().length > 0
            ) {
              finalImages = [deal_image_url];
            }
            // Generic image URL
            else if (
              image_url &&
              typeof image_url === 'string' &&
              image_url.trim().length > 0
            ) {
              finalImages = [image_url];
            }
            // Generic images array (could be strings or objects)
            else if (images && Array.isArray(images) && images.length > 0) {
              finalImages = images
                .map(img => {
                  // Handle both string URLs and objects with image_url property
                  if (typeof img === 'string') return img;
                  if (typeof img === 'object' && img.image_url)
                    return img.image_url;
                  return null;
                })
                .filter(
                  url =>
                    url && typeof url === 'string' && url.trim().length > 0,
                );
            }
            // Business images as fallback (objects with image_url property)
            else if (
              business_images &&
              Array.isArray(business_images) &&
              business_images.length > 0
            ) {
              finalImages = business_images
                .filter(img => img && typeof img === 'object' && img.image_url)
                .map(img => img.image_url)
                .filter(
                  url =>
                    url && typeof url === 'string' && url.trim().length > 0,
                );
            }

            return finalImages && finalImages.length > 0 ? (
              <View>
                <FlatList
                  data={finalImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) =>
                    `image-${index}-${item?.slice?.(-10) || 'unknown'}`
                  }
                  renderItem={renderImage}
                />
              </View>
            ) : (
              <View
                style={[styles.dealImage, { backgroundColor: colors.primary }]}
              >
                <View style={styles.imageOverlay} />
                <Text style={styles.placeholderEmoji}>🛍️</Text>
              </View>
            );
          })()}
        </View>

        {/* Deal Content */}
        <View
          style={[
            styles.contentContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Business Info */}
          <View style={styles.businessHeader}>
            <View
              style={[styles.categoryContainer, { backgroundColor: colors.categoryBackground }]}
            >
              <Text
                style={[styles.categoryText, { color: colors.textSecondary }]}
              >
                {deal.category_name || deal.category || ''}
              </Text>
            </View>
            <View style={styles.businessTitleRow}>
              <Text style={[styles.businessName, { color: colors.text }]}>
                {deal.business_name || deal.business || 'Unknown Business'}
              </Text>
              {deal.is_premium_business && (
                <MaterialIcons
                  name="verified"
                  size={20}
                  color="#0095f6"
                  style={styles.verifiedIcon}
                />
              )}
            </View>
          </View>

          {/* Deal Description */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.dealDescription, { color: colors.text }]}>
              {deal.description ||
                deal.descrption ||
                'No description available'}
            </Text>
          </View>

          {/* About Business Button */}
          <TouchableOpacity
            style={[
              styles.aboutBusinessButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => navigation.navigate('AboutBusiness', { deal })}
          >
            <View style={styles.aboutBusinessContent}>
              <MaterialIcons name="business" size={24} color={colors.primary} />
              <View style={styles.aboutBusinessTextContainer}>
                <Text
                  style={[styles.aboutBusinessTitle, { color: colors.text }]}
                >
                  About {deal.business_name || deal.business || 'Business'}
                </Text>
                {/* <Text
                  style={[
                    styles.aboutBusinessSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  View business details and contact information
                </Text> */}
              </View>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Deal Info */}
          <View style={styles.infoContainer}>
            {deal.expires && (
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="schedule"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  Expires: {deal.expires || deal.expiry}
                </Text>
              </View>
            )}

            {deal.location && (
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="location-on"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  {deal.location}
                </Text>
              </View>
            )}
          </View>

          {/* Rectangular blocks above share button */}
          <View style={styles.blocksContainer}>
            <View style={styles.blockWithLabel}>
              <Text style={[styles.blockLabel, { color: colors.text }]}>
                Share to Unlock
              </Text>
              <View
                style={[
                  styles.rectangularBlock,
                  {
                    backgroundColor:
                      currentShares === 0 ? colors.primary : colors.inactive,
                  },
                ]}
              />
            </View>
            <View style={styles.blockWithLabel}>
              <Text style={[styles.blockLabel, { color: colors.text }]}>
                Share More!
              </Text>
              <View
                style={[
                  styles.rectangularBlock,
                  {
                    backgroundColor:
                      currentShares > 0 && !canRedeem
                        ? colors.primary
                        : colors.inactive,
                  },
                ]}
              />
            </View>
            <View style={styles.blockWithLabel}>
              <Text style={[styles.blockLabel, { color: colors.text }]}>
                Redeem
              </Text>
              <View
                style={[
                  styles.rectangularBlock,
                  {
                    backgroundColor: canRedeem
                      ? colors.primary
                      : colors.inactive,
                  },
                ]}
              />
            </View>
          </View>

          {/* Guest User CTA - Show sign in button instead of share/redeem */}
          {isGuestView ? (
            <View style={styles.guestCtaContainer}>
              <Text style={[styles.guestCtaTitle, { color: colors.text }]}>
                Want to claim this deal?
              </Text>
              <Text style={[styles.guestCtaSubtitle, { color: colors.textSecondary }]}>
                Sign in or create an account to unlock and redeem amazing deals!
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  // Store the pending deep link so user is redirected back after login
                  if (deepLinkDealId) {
                    await storePendingDeepLink(`nolimitseradeals://deal/${deepLinkDealId}`);
                  }
                  navigation.navigate('SignIn');
                }}
              >
                <MaterialIcons name="login" size={20} color={colors.background} />
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Sign In to Claim
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={async () => {
                  // Store the pending deep link so user is redirected back after signup
                  if (deepLinkDealId) {
                    await storePendingDeepLink(`nolimitseradeals://deal/${deepLinkDealId}`);
                  }
                  navigation.navigate('SignUp');
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handlePress}
              disabled={sharingLoading}
            >
              <MaterialIcons name="share" size={20} color={colors.background} />
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {canRedeem
                  ? 'Unlocked! Tap to Redeem'
                  : `Share to Unlock (${currentShares}/${
                      deal.min_shares_required || 3
                    })`}
              </Text>
              {sharingLoading && (
                <MaterialIcons
                  name="hourglass-empty"
                  size={16}
                  color={colors.background}
                />
              )}
            </TouchableOpacity>

            {/* Contact Selection Modal */}
            <ContactSelectionModal
              visible={showModal}
              onClose={() => setShowModal(false)}
              deal={deal}
              colors={colors}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filteredContacts={filteredContacts}
              selectedContacts={selectedContacts}
              selectedCount={selectedCount}
              toggleContactSelection={toggleContactSelection}
              clearSelection={clearSelection}
              onShare={handleShare}
              canShare={canShare}
              sharingLoading={sharingLoading}
              requestContactsAccess={requestContactsAccess}
            />
          </>
          )}

          {/* Action Buttons - Only for authenticated users */}
          {!isGuestView && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.redeemButton,
                {
                  backgroundColor:
                    loading || !shareProgress?.canRedeem
                      ? colors.disabled
                      : colors.primary,
                },
              ]}
              onPress={handleRedeem}
              // disabled={loading || !shareProgress?.canRedeem}
            >
              <MaterialIcons name="redeem" size={20} color="#fff" />
              <Text style={styles.redeemButtonText}>Redeem Deal</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
        <Text
          style={[
            iOSUIKit.subhead,
            { color: colors.subText, textAlign: 'center' },
          ]}
        >
          Share {currentShares} times to unlock this deal
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  errorText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      textAlign: 'center',
      fontWeight: '500',
    },
  ]),
  imageContainer: {
    height: screenHeight * 0.4,
    position: 'relative',
  },
  overlayButtons: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealImage: {
    width: screenWidth,
    height: screenHeight * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  placeholderEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  businessHeader: {
    marginBottom: 16,
  },
  businessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  businessName: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      flex: 1,
    },
  ]),
  verifiedIcon: {
    marginLeft: 8,
  },
  categoryText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: '500',
    },
  ]),
  descriptionContainer: {
    marginBottom: 20,
  },
  dealDescription: StyleSheet.flatten([
    iOSUIKit.body,
    {
      lineHeight: 24,
    },
  ]),
  infoContainer: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      marginLeft: 8,
    },
  ]),
  shareButton: {
    marginBottom: 20,
  },
  shareToUnlockText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  blocksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  blockWithLabel: {
    flex: 1,
    alignItems: 'center',
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  rectangularBlock: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: '600',
    },
  ]),
  redeemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  redeemButtonText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      color: '#fff',
      fontWeight: '600',
    },
  ]),
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: iOSUIKit.calloutObject,
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 12,
  },
  secondaryButtonText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: '600',
    },
  ]),
  guestCtaContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  guestCtaTitle: StyleSheet.flatten([
    iOSUIKit.title3,
    {
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
  ]),
  guestCtaSubtitle: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 20,
    },
  ]),
  aboutBusinessButton: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutBusinessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aboutBusinessTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  aboutBusinessTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  aboutBusinessSubtitle: {
    fontSize: 13,
  },
});

// Export with Error Boundary wrapper
export default function DealDetailWithErrorBoundary(props: DealDetailProps) {
  return (
    <DealDetailErrorBoundary>
      <DealDetailScreen {...props} />
    </DealDetailErrorBoundary>
  );
}
