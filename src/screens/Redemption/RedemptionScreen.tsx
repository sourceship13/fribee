type RedemptionRouteParams = {
  code?: string;
  deal?: any;
  userId?: string;
  userSavedDealId?: string;
  sharesRequired?: number;
  dealImageUrl?: string;
};
import React, { useMemo, useRef, useState } from 'react';

import { useRoute, useNavigation } from '@react-navigation/native';
import { getColors } from '../../libs/colors';

import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useAuth } from '../../libs/hooks/useAuth';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import RedeemBg from '../../../assets/imgs/redeem-bg.svg';
import VersionFooter from '../../components/VersionFooter';
import {
  BarcodeCreatorView,
  BarcodeFormat,
} from 'react-native-barcode-creator';
import Barcode from 'react-native-barcode-builder';

import {
  FlatList,
  View,
  Text,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Alert,
  Platform,
} from 'react-native';
import SlideToUnlock from '../../components/SlideToUnlock';
import ApiService from '../../services/api.service';
import WalletPassService from '../../services/wallet-pass.service';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MODAL_HEIGHT = screenHeight * 0.8; // 65% of screen height

type Item = {
  id: string;
  label: string;
  payload: string;
  format: keyof typeof BarcodeFormat;
};

const RedemptionScreen = () => {
  const route = useRoute();
  const params = (route.params || {}) as RedemptionRouteParams;
  const navigation = useNavigation();
  const { isDarkMode, user, refreshDeals, redeemedDeals } = useAuth();
  const colors = getColors(isDarkMode);
  const code = params.code;
  const deal = params.deal;
  const userId = user?.id;

  // Find the redeemed deal from the redeemedDeals array
  const dealId = deal?.deal_id || deal?.id;
  const redeemedDeal = redeemedDeals.find(
    rd => rd.deal_id === dealId || rd.id === dealId,
  );

  const listRef = useRef<FlatList<Item>>(null);
  const [containerW, setContainerW] = useState(0);

  // Use redemption code from redeemed deal, fallback to params or deal object
  const redemptionCode =
    redeemedDeal?.redemption_code || code || deal?.redemption_code || 'ABC123';

  // Generate barcode data dynamically based on redemption code
  const barcodeData: Item[] = useMemo(
    () => [
      {
        id: '1',
        label: 'Redemption Code',
        payload: redemptionCode,
        format: BarcodeFormat.CODE128,
      },
    ],
    [redemptionCode],
  );

  const CARD_W = 300; // visible card width
  const SPACING = 16; // space between cards
  const INTERVAL = CARD_W + SPACING;

  const sidePad = Math.max(0, (containerW - CARD_W) / 2);
  const endPad = Math.max(0, (containerW - CARD_W) / 2);

  const renderImage = () => {
    const deal_images = deal.deal_images; // Deal-specific images array
    const deal_image_url = deal.deal_image_url; // Single deal image URL
    const image_url = deal.image_url; // Generic image URL
    const images = deal.images; // Generic images array
    const business_images = deal.business_images; // Business images (fallback)

    let finalImages = null;

    // Extract image URLs from deal_images array (objects with image_url property)
    if (deal_images && Array.isArray(deal_images) && deal_images.length > 0) {
      finalImages = deal_images
        .filter(img => img && typeof img === 'object' && img.image_url)
        .map(img => img.image_url)
        .filter(url => url && typeof url === 'string' && url.trim().length > 0);
    }
    // Single deal image URL
    else if (
      deal_image_url &&
      typeof deal_image_url === 'string' &&
      deal_image_url.trim().length > 0
    ) {
      finalImages = [deal_image_url];
    }
    // Generic image_url
    else if (
      image_url &&
      typeof image_url === 'string' &&
      image_url.trim().length > 0
    ) {
      finalImages = [image_url];
    }
    // Generic images array
    else if (images && Array.isArray(images) && images.length > 0) {
      finalImages = images
        .filter(img => img && typeof img === 'string' && img.trim().length > 0)
        .map(img => img);
    }
    // Business images (fallback)
    else if (
      business_images &&
      Array.isArray(business_images) &&
      business_images.length > 0
    ) {
      finalImages = business_images
        .filter(img => img && typeof img === 'string' && img.trim().length > 0)
        .map(img => img);
    }

    // Return an empty array if no images found
    if (!finalImages || finalImages.length === 0) {
      finalImages = ['https://via.placeholder.com/150'];
    }

    return (
      <ImageBackground
        source={{ uri: finalImages[0] || '' }}
        style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden' }}
        resizeMode="cover"
      />
    );
  };

  const handleSaveToWallet = async () => {
    try {
      console.log('🎫 Starting wallet pass save...');
      
      const canAddPasses = await WalletPassService.canAddPasses();
      if (!canAddPasses) {
        Alert.alert(
          'Not Supported',
          'Wallet passes are not supported on this device.',
        );
        return;
      }

      console.log('🎫 Device supports passes, calling service...');
      
      await WalletPassService.addPassToWallet({
        redemptionCode,
        businessName: deal.business_name || 'NoLimit Sera',
        description: deal.description || deal.descrption || 'Exclusive Deal',
        expiryDate: deal.expires || deal.expiry,
        dealImage: deal.deal_image_url || deal.image_url,
      });

      console.log('✅ Pass added successfully!');
      
      Alert.alert(
        'Success',
        'Deal has been added to your wallet! Open the Wallet app to see it.',
      );
    } catch (error: any) {
      console.error('❌ Failed to save to wallet:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      Alert.alert(
        'Unable to Add Pass',
        error.message || 'Please try again later. Check console logs for details.',
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Tap outside to dismiss */}
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />
      {/* Modal content */}
      <View
        style={[
          styles.modalContainer,
          { height: MODAL_HEIGHT, backgroundColor: colors.background },
        ]}
      >
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.border }]}
        >
          <TouchableOpacity
            style={[styles.closeButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[
              iOSUIKit.title3Emphasized,
              { textAlign: 'center', color: colors.text },
            ]}
          >
            Redeem Deal
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            marginHorizontal: 20,
            marginTop: 16,
            backgroundColor: colors.surface,
          }}
        >
          <View>{renderImage()}</View>
          <View
            style={{
              flex: 1,
              marginLeft: 12,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontWeight: '600',
                fontSize: 16,
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {deal.business_name}
            </Text>
            <Text
              style={{
                color: colors.subText,
                fontSize: 14,
                marginBottom: 6,
              }}
              numberOfLines={2}
            >
              {deal.description}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{ color: '#FF9500', fontSize: 14, fontWeight: '500' }}
              >
                Goal achieved!
              </Text>
              <Text
                style={{ color: '#FF9500', fontSize: 14, fontWeight: '500' }}
              >
                0/3
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.couponWrapper}>
          {/* Coupon Card with SVG background */}
          <View style={styles.couponTopBackground}>
            <RedeemBg
              width={screenWidth - 40}
              height={150}
              preserveAspectRatio="xMidYMin slice"
            />
          </View>
          <View style={styles.couponCardContainer}>
            {/* SVG Background for top section */}

            {/* Coupon Content Card */}
            <View
              style={[styles.couponCard, { backgroundColor: colors.surface }]}
            >
              {/* Top Section - Promo Code */}
              <View style={styles.couponTopSection}>
                <Text
                  style={[styles.couponLabel, { color: colors.textTertiary }]}
                >
                  Your promocode:
                </Text>
                <View style={styles.codeRow}>
                  <Text style={styles.couponCode}>{redemptionCode}</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <MaterialIcons
                      name="content-copy"
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Section - Barcode */}
              <View
                style={[
                  styles.couponBottomSection,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.scanLabel, { color: colors.text }]}>
                  Or scan QR code below:
                </Text>
                <View style={styles.barcodeContainer}>
                  <BarcodeCreatorView
                    value={redemptionCode}
                    format={BarcodeFormat.CODE128}
                    background={'#FFFFFF'}
                    foregroundColor={'#000000'}
                    style={{ width: 200, height: 60 }}
                  />
                </View>
                
                {/* Save to Wallet Button */}
                <TouchableOpacity
                  style={[styles.walletButton, { borderColor: colors.border }]}
                  onPress={handleSaveToWallet}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={20}
                    color="#FF9500"
                  />
                  <Text style={[styles.walletButtonText, { color: colors.text }]}>
                    Save to {Platform.OS === 'ios' ? 'Apple Wallet' : 'Google Pay'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Divider and Button */}
              <View
                style={[
                  styles.redeemSection,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View
                  style={[
                    styles.redeemDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <TouchableOpacity
                  style={styles.redeemButton}
                  activeOpacity={0.7}
                  onPress={async () => {
                    if (!userId || !(deal?.id || deal?.deal_id)) {
                      console.error('Missing required redemption parameters', {
                        userId,
                        dealId: deal?.id || deal?.deal_id,
                      });
                      return;
                    }
                    const dealId = deal?.id || deal?.deal_id;
                    const payload = {
                      userId: String(userId),
                      dealId: String(dealId),
                    };
                    try {
                      await ApiService.postDealRedemption(payload);
                      await refreshDeals();
                      navigation.goBack();
                    } catch (err) {
                      console.error('Deal redemption failed', err);
                    }
                  }}
                >
                  <Text
                    style={[styles.redeemButtonText, { color: colors.text }]}
                  >
                    Set Deal as Redeemed
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  couponWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: 20,
  },
  couponCardContainer: {
    position: 'relative',
  },
  couponTopBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 20,
  },
  couponTopSection: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  couponLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  couponCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF9500',
    letterSpacing: 1,
  },
  copyButton: {
    padding: 4,
  },
  couponBottomSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  scanLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  barcodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  redeemSection: {},
  redeemDivider: {
    height: 1,
  },
  redeemButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RedemptionScreen;
