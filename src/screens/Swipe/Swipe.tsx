import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  FlatList,
  ImageBackground,
  Dimensions,
  Platform,
  Button,
  Image,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth, getColors } from '../../libs/hooks/useAuth';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';
import * as Sentry from "@sentry/react-native";
import AnalyticsService from '../../services/analytics.service';
import ApproveButton from '../../../assets/imgs/approve-butt.svg';
import DeclineButton from '../../../assets/imgs/decline-butt.svg';
import IconLogo from '../../../assets/imgs/icon_logo.svg';
import LinearGradient from 'react-native-linear-gradient';

const PLACEHOLDER_DEAL = {
  id: 0,
  business: 'No Deals',
  offer: 'No deals available',
  image: '🛍️',
  location: '',
  category: '',
  expires: '',
  backgroundColor: '#888',
};

const SwipeScreen = ({ navigation }: any) => {
  const { isDarkMode, deals, dealsLoading, heartedDeals } = useAuth();
  const colors = getColors(isDarkMode);
  const [currentDealIndex, setCurrentDealIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filter out hearted deals
  const heartedDealIds = new Set(
    (heartedDeals || []).map((d: any) => d.deal_id || d.id),
  );
  const unheartedDeals = deals.filter(
    (deal: any) => !heartedDealIds.has(deal.id || deal.deal_id),
  );

  // Animated values for swipe gestures
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  // Create opacity animated values that start at 0 (transparent)
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const dislikeOpacity = useRef(new Animated.Value(0)).current;

  // Debug: Ensure opacity starts at 0 and log it
  useEffect(() => {
    likeOpacity.setValue(0);
    dislikeOpacity.setValue(0);
  }, []);

  // Deals are now fetched globally via useAuth hook

  const currentDeal =
    unheartedDeals.length > 0
      ? unheartedDeals[currentDealIndex]
      : PLACEHOLDER_DEAL;

  const resetAnimations = () => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.spring(rotate, { toValue: 0, useNativeDriver: true }),
      Animated.timing(likeOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dislikeOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    {
      useNativeDriver: false, // Don't use native driver for opacity changes
      listener: (event: any) => {
        // translationX is already declared in the Animated.event mapping above
        const { translationX } = event.nativeEvent;
        // Calculate rotation based on horizontal movement
        const rotateValue = translationX / 10;
        // Show like/dislike indicators based on swipe direction
        if (translationX > 20) {
          // Swiping right - show heart (starts at 20px for easier testing)
          const opacity = Math.min(1, Math.max(0, translationX / 100));
          likeOpacity.setValue(opacity);
          dislikeOpacity.setValue(0);
        } else if (translationX < -20) {
          // Swiping left - show X (starts at -20px for easier testing)
          const opacity = Math.min(
            1,
            Math.max(0, Math.abs(translationX) / 100),
          );
          dislikeOpacity.setValue(opacity);
          likeOpacity.setValue(0);
        } else {
          // Reset indicators when not swiping far enough
          likeOpacity.setValue(0);
          dislikeOpacity.setValue(0);
        }
      },
    },
  );

  const onHandlerStateChange = (event: any) => {
    // nativeEvent is already declared above
    const { nativeEvent } = event;

    if (nativeEvent.state === State.END) {
      const { translationX } = nativeEvent;

      if (translationX > 150) {
        // Swipe right - like
        handleSwipe('right');
        resetAnimations();
      } else if (translationX < -150) {
        // Swipe left - dislike
        handleSwipe('left');
        resetAnimations();
      } else {
        // Snap back to center
        resetAnimations();
      }
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    // Track analytics for the swipe
    const dealId = currentDeal?.id?.toString() || currentDeal?.deal_id?.toString();
    if (dealId && currentDeal.id !== 0) {
      AnalyticsService.trackDealSwipe(dealId, direction, {
        title: currentDeal.offer || currentDeal.title,
        business: currentDeal.business_name || currentDeal.business,
        category: currentDeal.category,
      });
    }

    if (direction === 'right') {
      navigation.navigate('DealDetail', { deal: currentDeal });
    } else {
      setCurrentDealIndex(prev =>
        unheartedDeals.length > 0 ? (prev + 1) % unheartedDeals.length : 0,
      );
    }
  };

  const handlePreviousDeal = () => {
    setCurrentDealIndex(prev => {
      if (unheartedDeals.length === 0) return 0;
      return prev === 0 ? unheartedDeals.length - 1 : prev - 1;
    });
  };

  const handleNextDeal = () => {
    setCurrentDealIndex(prev =>
      unheartedDeals.length > 0 ? (prev + 1) % unheartedDeals.length : 0,
    );
  };

  return (
    <View
      style={[styles.screenContainer, { backgroundColor: colors.background }]}
    >
      {/* 1. Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <IconLogo width={21} height={24} fill="#FF9500" />

        <Text style={[iOSUIKit.title3Emphasized, { color: colors.title }]}>Discover Deals</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
         <Image 
          source={require('../../../assets/imgs/settings-icon.png')} 
          style={{ width: 32, height: 36, tintColor: colors.inactive }} 
          resizeMode="contain"
        />
        </TouchableOpacity>
        
      </View>

      {/* 3. Full-screen content area */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.contentContainer,
            {
              transform: [
                { translateX: translateX },
                { translateY: translateY },
                {
                  rotate: rotate.interpolate({
                    inputRange: [-200, 200],
                    outputRange: ['-30deg', '30deg'],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          {dealsLoading ? (
            <View style={styles.centerContent}>
              <Text
                style={[
                  iOSUIKit.body,
                  { color: colors.text, textAlign: 'center' },
                ]}
              >
                Loading deals...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Text
                style={[
                  iOSUIKit.body,
                  { color: colors.error, textAlign: 'center' },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : (
            <>
              {/* Full-screen image background */}
              <View style={styles.imageContainer} pointerEvents="box-none">
                {(() => {
                  // Prioritize deal images over business images
                  const deal_images = currentDeal.deal_images;
                  const deal_image_url = currentDeal.deal_image_url;
                  const image_url = currentDeal.image_url;
                  const images = currentDeal.images;
                  // Extract image URLs from deal_images array (objects with image_url property)
                  let finalImages = null;
                  if (
                    deal_images &&
                    Array.isArray(deal_images) &&
                    deal_images.length > 0
                  ) {
                    finalImages = deal_images
                      .filter(
                        img => img && typeof img === 'object' && img.image_url,
                      )
                      .map(img => img.image_url)
                      .filter(
                        url =>
                          url &&
                          typeof url === 'string' &&
                          url.trim().length > 0,
                      );
                  } else if (
                    images &&
                    Array.isArray(images) &&
                    images.length > 0
                  ) {
                    finalImages = images.filter(
                      url =>
                        url && typeof url === 'string' && url.trim().length > 0,
                    );
                  } else if (
                    deal_image_url &&
                    typeof deal_image_url === 'string'
                  ) {
                    finalImages = [deal_image_url];
                  } else if (image_url && typeof image_url === 'string') {
                    finalImages = [image_url];
                  }
                  if (finalImages && finalImages.length > 0) {
                    return (
                      <FlatList
                        data={finalImages}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => `image-${index}`}
                        style={styles.imageCarousel}
                        scrollEnabled={false}
                        pointerEvents="none"
                        renderItem={({ item }) => (
                          <ImageBackground
                            source={{ uri: item }}
                            style={styles.fullScreenImage}
                            resizeMode="cover"
                          >
                            <LinearGradient
                              colors={['transparent', 'transparent', 'rgba(0, 0, 0, 0.7)']}
                              locations={[0, 0.5, 1]}
                              style={styles.imageOverlay}
                            />
                            {/* Swipe feedback icons on top of image */}
                            <View
                              style={styles.imageIconsOverlay}
                              pointerEvents="none"
                            >
                              <Animated.View
                                style={[
                                  styles.imageLikeIcon,
                                  { opacity: likeOpacity },
                                ]}
                              >
                                <Text style={styles.likeIconText}>♥</Text>
                              </Animated.View>
                              <Animated.View
                                style={[
                                  styles.imageDislikeIcon,
                                  { opacity: dislikeOpacity },
                                ]}
                              >
                                <Text style={styles.dislikeIconText}>✕</Text>
                              </Animated.View>
                            </View>
                          </ImageBackground>
                        )}
                      />
                    );
                  } else {
                    return (
                      <View
                        style={[
                          styles.fullScreenImage,
                          {
                            backgroundColor:
                              currentDeal.backgroundColor || colors.primary,

                          },
                        ]}
                      >
                        <LinearGradient
                          colors={['transparent', 'transparent', 'rgba(0, 0, 0, 0.7)']}
                          locations={[0, 0.5, 1]}
                          style={styles.imageOverlay}
                        />
                        {/* Swipe feedback icons on top of image */}
                        <View
                          style={styles.imageIconsOverlay}
                          pointerEvents="none"
                        >
                          <Animated.View
                            style={[
                              styles.imageLikeIcon,
                              { opacity: likeOpacity },
                            ]}
                          >
                            <Text style={styles.likeIconText}>♥</Text>
                          </Animated.View>
                          <Animated.View
                            style={[
                              styles.imageDislikeIcon,
                              { opacity: dislikeOpacity },
                            ]}
                          >
                            <Text style={styles.dislikeIconText}>✕</Text>
                          </Animated.View>
                        </View>
                      </View>
                    );
                  }
                })()}

                 

                {/* Card content overlay on image */}
                <View style={styles.cardOverlay} pointerEvents="none">
                  <View
                    style={{ ...styles.cardContent, justifyContent: 'center' }}
                    pointerEvents="none"
                  >
                    <View style={styles.businessRow}>
                      <Text style={styles.dealBusiness}>
                        {currentDeal.business ||
                          currentDeal.business_name ||
                          ''}
                      </Text>
                      {currentDeal.is_premium_business ? (
                        <MaterialIcons
                          name={'verified'}
                          size={18}
                          color="#0095f6"
                          style={styles.businessIcon}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.dealOffer}>
                      {currentDeal.description || currentDeal.descrption || ''}
                    </Text>
                    <Text style={styles.dealLocation}>
                      {currentDeal.category_name || ''}
                    </Text>
                    <Text style={styles.dealExpires}>
                      {currentDeal.expires || currentDeal.expiry || ''}
                    </Text>
                  </View>
                </View>

                {/* Action buttons at bottom of image */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleSwipe('left')}
                  >
                    <DeclineButton width={147} height={50} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleSwipe('right')}
                  >
                    <ApproveButton width={147} height={50} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </PanGestureHandler>
      <VersionFooter />
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingBottom: 60,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  topBarTitle: StyleSheet.flatten([
    iOSUIKit.body,
    {
      fontWeight: 'bold',
    },
  ]),
  exploreBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exploreBtnText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: 'bold',
    },
  ]),
  contentContainer: {
    flex: 1,
    zIndex: 2, // Above background icons
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    width: '100%',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    margin: 10,
    marginBottom: 40,
  },
  imageCarousel: {
    flex: 1,
    borderRadius: 20,
  },
  fullScreenImage: {
    width: screenWidth - 20,
    flex: 1,
    borderRadius: 20,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    height: screenHeight * 0.11, // 1/8 of screen height
  },
  cardContent: {
    padding: 10,
    alignItems: 'flex-start',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    textAlign: 'center',
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  businessIcon: {
    marginTop: 8,
  },
  dealImage: {
    fontSize: 64,
    marginBottom: 12,
  },
  dealBusiness: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      color: '#fff',
      marginTop: 8,
      marginRight: 8,
      fontSize: 20, // Maintain size for overlay readability
    },
  ]),
  dealOffer: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      color: '#fff',
      textAlign: 'center',
      marginVertical: 4,
    },
  ]),
  dealLocation: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      color: '#fff',
      marginBottom: 2,
      textAlign: 'center',
      marginVertical: 2,
    },
  ]),
  dealExpires: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      color: '#fff',
      marginBottom: 8,
      textAlign: 'center',
    },
  ]),
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    zIndex: 10,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dislikeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#888',
  },
  likeButton: {
    backgroundColor: '#FF4458',
  },
  approveButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dislikeButtonText: {
    fontSize: 32,
    color: '#888',
    fontWeight: 'bold',
  },
  likeButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  actionContainer: {
    height: screenHeight * 0.1, // 1/10 of screen height
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
  },
  actionBtn: {
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 10,
    minWidth: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  navBtn: {
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 10,
    minWidth: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: 1,
  },
  headerTitle: StyleSheet.flatten([
    iOSUIKit.largeTitleEmphasized,
    {
      fontSize: 24, // Override the default large title size to fit header
    },
  ]),
  settingsButton: {
    padding: 8,
  },
  swipeIndicator: {
    position: 'absolute',
    zIndex: 9999, // Maximum z-index to ensure it's on top
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    width: 120,
    height: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
    borderWidth: 4,
  },
  likeIndicator: {
    top: 120, // Position from top of screen
    right: 30, // Position from right edge
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(76, 175, 80, 0.95)', // Bright green background
  },
  dislikeIndicator: {
    top: 120, // Position from top of screen
    left: 30, // Position from left edge
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(244, 67, 54, 0.95)', // Bright red background
  },
  backgroundIconsContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 100,
    zIndex: 1000, // Very high z-index
    pointerEvents: 'none', // Allow touches to pass through
  },
  backgroundIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: '40%',
    marginTop: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    elevation: 10, // Android elevation for better visibility
  },
  backgroundLikeIcon: {
    right: 50,
    backgroundColor: 'rgba(76, 175, 80, 0.8)', // More visible green background
  },
  backgroundDislikeIcon: {
    left: 50,
    backgroundColor: 'rgba(244, 67, 54, 0.8)', // More visible red background
  },
  // New overlay approach
  iconsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // Highest possible z-index
    elevation: 20, // High Android elevation
    pointerEvents: 'none', // Allow touches to pass through
  },
  overlayLikeIcon: {
    position: 'absolute',
    right: 80,
    top: '50%',
    marginTop: -60,
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 68, 88, 0.2)', // Semi-transparent background for visibility
    elevation: 15,
  },
  overlayDislikeIcon: {
    position: 'absolute',
    left: 80,
    top: '50%',
    marginTop: -60,
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(136, 136, 136, 0.2)', // Semi-transparent background for visibility
    elevation: 15,
  },
  // Image-based icons (on top of deal image)
  imageIconsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  imageLikeIcon: {
    position: 'absolute',
    right: 40,
    top: '50%',
    marginTop: -50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Clean white background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  imageDislikeIcon: {
    position: 'absolute',
    left: 40,
    top: '50%',
    marginTop: -50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Clean white background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  likeIconText: {
    fontSize: 60,
    color: '#FF4458',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  dislikeIconText: {
    fontSize: 60,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default SwipeScreen;
