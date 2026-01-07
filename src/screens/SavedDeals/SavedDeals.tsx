import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

type TabType = 'ready' | 'share' | 'redeemed';

const SavedDealsScreen = ({ navigation }: any) => {
  const { isDarkMode, deals, heartedDeals, isDealHearted, toggleHeartDeal } = useAuth();
  const colors = getColors(isDarkMode);
  const [activeTab, setActiveTab] = useState<TabType>('ready');

  // Build a list of full deal objects for hearted deals
  const heartedDealIds = new Set((heartedDeals || []).map(d => d.deal_id || d.id));
  const allSavedDeals = deals.filter(deal => heartedDealIds.has(deal.id || deal.deal_id));

  // Filter deals by status
  const readyToRedeemDeals = allSavedDeals.filter(
    deal => deal.redemption_status && deal.redemption_status.toLowerCase() === 'ready to redeem'
  );

  const redeemedDeals = allSavedDeals.filter(
    deal => deal.redemption_status && deal.redemption_status.toLowerCase() === 'redeemed'
  );

  const shareMoreDeals = allSavedDeals.filter(deal => {
    if (!deal.redemption_status) return true; // Newly hearted
    const status = deal.redemption_status.toLowerCase();
    return status === 'almost there, a few more shares!' || 
           status === 'not enough shares' ||
           status === '';
  });

  // Get current tab's deals
  const getCurrentDeals = () => {
    switch (activeTab) {
      case 'ready':
        return readyToRedeemDeals;
      case 'share':
        return shareMoreDeals;
      case 'redeemed':
        return redeemedDeals;
      default:
        return [];
    }
  };

  // Get deal image URL
  const getDealImageUrl = (deal: any): string | null => {
    if (deal.deal_images?.length > 0 && deal.deal_images[0]?.image_url) {
      return deal.deal_images[0].image_url;
    }
    if (deal.deal_image_url) return deal.deal_image_url;
    if (deal.image_url) return deal.image_url;
    if (deal.business_images?.length > 0 && deal.business_images[0]?.image_url) {
      return deal.business_images[0].image_url;
    }
    return null;
  };

  const renderDealCard = ({ item }: { item: any }) => {
    const imageUrl = getDealImageUrl(item);
    const isPremium = item.is_premium === true || item.is_premium_business === true;
    const isFeatured = item.priority_score && item.priority_score > 0;
    const currentShares = item.current_shares || item.shares_count || 0;
    const requiredShares = item.min_shares_required || 3;
    const isReady = activeTab === 'ready';
    const isRedeemed = activeTab === 'redeemed';

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Image Section */}
        <View style={styles.cardImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.emojiContainer]}>
              <Text style={styles.emojiText}>🎁</Text>
            </View>
          )}
          
          {/* Heart Button */}
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={() => toggleHeartDeal(item.id || item.deal_id)}
          >
            <MaterialIcons 
              name={isDealHearted(item.id || item.deal_id) ? "favorite" : "favorite-border"} 
              size={18} 
              color={isDealHearted(item.id || item.deal_id) ? "#FF9500" : "#666"} 
            />
          </TouchableOpacity>

          {/* Badge */}
          {isPremium ? (
            <View style={styles.premiumBadge}>
              <Text style={styles.badgeText}>Premium</Text>
            </View>
          ) : isFeatured ? (
            <View style={styles.featuredBadge}>
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          ) : null}
        </View>

        {/* Content Section */}
        <View style={styles.cardContent}>
          <Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
            {item.business_name || item.business || 'Unknown Business'}
          </Text>
          <Text style={[styles.dealDescription, { color: colors.subText }]} numberOfLines={2}>
            {item.description || item.descrption || 'No description available'}
          </Text>
          
          <Text style={styles.sharesText}>
            Shares: <Text style={styles.sharesCount}>{currentShares}/{requiredShares}</Text>
          </Text>

          {!isRedeemed && (
            <TouchableOpacity
              style={[styles.redeemButton, { borderColor: colors.text }]}
              onPress={() => {
                if (isReady) {
                  navigation.navigate('Redemption', { deal: item });
                } else {
                  navigation.navigate('DealDetail', { deal: item });
                }
              }}
            >
              <Text style={[styles.redeemButtonText, { color: colors.text }]}>
                {isReady ? 'Redeem Now' : 'Share More'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'ready', label: 'Ready to Redeem' },
    { key: 'share', label: 'Needs More Love' },
    { key: 'redeemed', label: 'Redeemed' },
  ];

  const currentDeals = getCurrentDeals();

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Ionicons name="flame-outline" size={28} color="#FF9500" />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Saved</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextSelected, { color: activeTab === tab.key ? colors.text : '#999' }]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.tabBottomLine} />
      </View>

      {/* Deal List */}
      <View style={styles.container}>
        {currentDeals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'ready' ? '🎉' : activeTab === 'share' ? '📤' : '✅'}
            </Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'ready' 
                ? 'No deals ready to redeem' 
                : activeTab === 'share' 
                  ? 'No deals need more shares' 
                  : 'No redeemed deals yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
              {activeTab === 'ready' 
                ? 'Share deals to unlock redemptions!' 
                : activeTab === 'share' 
                  ? 'Heart deals and share them with friends' 
                  : 'Redeem your deals to see them here'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={currentDeals}
            keyExtractor={(item, index) => (item.id || item.deal_id || index).toString()}
            renderItem={renderDealCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: 8,
  },
  // Tab styles
  tabContainer: {
    position: 'relative',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  tabTextSelected: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#1a1a1a',
  },
  tabBottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  // Content
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  // Card styles
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  cardImageContainer: {
    width: 140,
    height: 160,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  emojiContainer: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 40,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FF8C00',
  },
  featuredBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dealDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  sharesText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  sharesCount: {
    color: '#FF9500',
    fontWeight: '600',
  },
  redeemButton: {
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  redeemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SavedDealsScreen;
