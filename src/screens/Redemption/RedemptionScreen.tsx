type RedemptionRouteParams = {
  code?: string;
  deal?: any;
  userId?: string;
  userSavedDealId?: string;
  sharesRequired?: number;
};
import React, { useMemo, useRef, useState } from 'react';

import { useRoute, useNavigation } from '@react-navigation/native';
import { getColors } from '../../libs/colors';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../libs/hooks/useAuth';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
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
} from 'react-native';
import SlideToUnlock from '../../components/SlideToUnlock';
import ApiService from '../../services/api.service';

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

  const CARD_W = 260; // visible card width
  const SPACING = 16; // space between cards
  const INTERVAL = CARD_W + SPACING;

  const sidePad = Math.max(0, (containerW - CARD_W) / 2);
  const endPad = Math.max(0, (containerW - CARD_W) / 2);

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
          <TouchableOpacity style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Share Deal
          </Text>
        </View>
        <View style={styles.container}>
          <Text
            style={[
              iOSUIKit.title3Emphasized,
              { color: colors.text, marginBottom: 16 },
            ]}
          >
            Show this code to the business
          </Text>
          <View style={styles.codeBox}>
            <Text
              style={[iOSUIKit.largeTitleEmphasized, { color: colors.primary }]}
            >
              {redemptionCode}
            </Text>
          </View>
          <Text
            style={[iOSUIKit.body, { color: colors.text, marginVertical: 16 }]}
          >
            Or scan this QR code:
          </Text>
          <View style={styles.qrBox}>
            <FlatList
              ref={listRef}
              horizontal
              data={barcodeData}
              keyExtractor={i => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: sidePad }}
              ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
              renderItem={({ item }) => (
                <View
                  style={{
                    width: CARD_W,
                    height: 180,
                    borderRadius: 14,
                    backgroundColor: '#FFF',
                    borderWidth: 1,
                    borderColor: '#E6E6E6',
                    padding: 12,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontWeight: '600' }}>{item.label}</Text>

                  {/* The barcode scales to the view size you give it */}
                  <BarcodeCreatorView
                    value={item.payload}
                    format={item.format}
                    background={'#FFFFFF'}
                    foregroundColor={'#000000'}
                    style={{ width: CARD_W - 24, height: 120 }}
                  />

                  <Text style={{ color: '#666' }}>{item.payload}</Text>
                </View>
              )}
              // 🔑 center-snapping
              snapToAlignment="center"
              // snapToInterval={INTERVAL}
              decelerationRate="normal"
              disableIntervalMomentum
              // perf: exact measurements for RN
              getItemLayout={(_, index) => ({
                length: INTERVAL,
                offset: INTERVAL * index,
                index,
              })}
            />
          </View>
          <SlideToUnlock
            label="Slide to Mark Redeemed by Business"
            onUnlock={async () => {
              if (!userId || !(deal?.id || deal?.deal_id)) {
                console.error('Missing required redemption parameters', {
                  userId,
                  dealId: deal?.id || deal?.deal_id,
                });
                // Optionally show feedback to user
                return;
              }
              const dealId = deal?.id || deal?.deal_id;
              const payload = {
                userId: String(userId),
                dealId: String(dealId),
              };
              try {
                await ApiService.postDealRedemption(payload);
                // Refresh deals to get updated redemption status
                await refreshDeals();
                navigation.goBack();
              } catch (err) {
                // Optionally show error feedback
                console.error('Deal redemption failed', err);
              }
            }}
          />
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
  box: {
    width: 180,
    height: 180,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  codeBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  qrBox: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    height: 200,
    width: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 24,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});

export default RedemptionScreen;
