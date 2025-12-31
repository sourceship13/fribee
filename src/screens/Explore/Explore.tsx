import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import AnalyticsService from '../../services/analytics.service';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 48) / 2;

const ExploreScreen = ({ navigation }: any) => {
  const {
    isDarkMode,
    categories,
    availableCategories,
    deals,
    dealsLoading,
    refreshDeals,
    heartedDeals,
    isDealHearted,
    toggleHeartDeal,
  } = useAuth();
  const colors = getColors(isDarkMode);
  const tabScrollRef = useRef<ScrollView>(null);

  // Filter available categories to show only the ones the user has enabled
  // If no categories are set (empty object), show all available categories
  const activeCategories =
    Object.keys(categories).length === 0
      ? availableCategories
      : availableCategories.filter(cat => categories[cat.slug]);

  // Add "All" tab at the beginning
  const tabCategories = [{ id: 'all', name: 'All', slug: null }, ...activeCategories];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter out hearted deals
  const heartedDealIds = new Set(
    (heartedDeals || []).map((d: any) => d.deal_id || d.id),
  );

  // Calculate deal counts for each category
  const getCategoryDealCount = (categoryName: string) => {
    return deals.filter(deal => {
      // Skip hearted deals
      if (heartedDealIds.has(deal.id || deal.deal_id)) {
        return false;
      }
      
      // Match category name (case insensitive)
      const dealCategory = (deal.category_name || '').toLowerCase();
      return dealCategory === categoryName.toLowerCase();
    }).length;
  };

  // Filter deals by category settings (enabled/disabled switches from Settings)
  const categoryFilteredDeals =
    Object.keys(categories).length === 0
      ? deals // If no category preferences set, show all deals
      : deals.filter(deal => {
          // If deal has no category, show it by default (uncategorized deals)
          if (!deal.category_name) {
            return true;
          }
          
          // Find which category this deal belongs to
          const dealCategory = (deal.category_name || '').toLowerCase();
          const matchingCategory = availableCategories.find(
            cat => cat.name.toLowerCase() === dealCategory,
          );

          // Only show deals from enabled categories
          return (
            matchingCategory && categories[matchingCategory.slug] !== false
          );
        });

  // Remove hearted deals from filtered list
  const unheartedDeals = categoryFilteredDeals.filter(
    deal => !heartedDealIds.has(deal.id || deal.deal_id),
  );

  // Then filter by selectedCategory if manually selected
  const filteredDeals = selectedCategory
    ? unheartedDeals.filter(deal => {
        // Match against category_name since that's what's in your API response
        const dealCategory = (deal.category_name || '').toLowerCase();
        const selectedCat = availableCategories.find(
          cat => cat.slug === selectedCategory,
        );
        
        // If deal has no category, don't show it when filtering by specific category
        if (!deal.category_name) {
          return false;
        }
        
        return selectedCat && dealCategory === selectedCat.name.toLowerCase();
      })
    : unheartedDeals;

  // Sort deals: Premium first, then featured deals (priority_score > 0), then regular deals
  const sortedDeals = [...filteredDeals].sort((a, b) => {
    // Premium deals first (is_premium = true)
    if (a.is_premium_business !== b.is_premium_business) {
      return b.is_premium_business ? 1 : -1;
    }
    // Then featured deals (higher priority score = higher position)
    if (a.priority_score !== b.priority_score) {
      return (b.priority_score || 0) - (a.priority_score || 0);
    }
    return 0;
  });

  const renderDealCard = ({ item, index }: { item: any; index: number }) => {
    const isFeatured = item.priority_score && item.priority_score > 0;
    const isPremium =
      item.is_premium === true || item.is_premium_business === true;

    const handleDealPress = () => {
      AnalyticsService.trackDealTap(
        item.id || item.deal_id,
        item.business_name || item.business,
        item.category_name,
        'explore',
      );
      navigation.navigate('DealDetail', { deal: item });
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handleDealPress}
        activeOpacity={0.9}
      >
        {/* Deal Image Container */}
        <View style={styles.imageContainer}>
          {getDealImageUrl(item) ? (
            <Image
              source={{ uri: getDealImageUrl(item)! }}
              style={styles.dealImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.emojiContainer}>
              <Text style={styles.itemImage}>
                {getCategoryEmoji(item.category_name)}
              </Text>
            </View>
          )}
          
          {/* Heart Button */}
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={() => toggleHeartDeal(item.id || item.deal_id)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={isDealHearted(item.id || item.deal_id) ? "favorite" : "favorite-border"} 
              size={20} 
              color={isDealHearted(item.id || item.deal_id) ? "#FF3B30" : "#666"} 
            />
          </TouchableOpacity>
          
          {/* Badge */}
          {isPremium ? (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          ) : isFeatured ? (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          ) : null}
        </View>
        
        {/* Deal Info */}
        <View style={styles.cardContent}>
          <Text
            style={[styles.itemBusiness, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.business_name || item.business || 'Unknown Business'}
          </Text>
          <Text
            style={[styles.itemDescription, { color: colors.subText }]}
            numberOfLines={2}
          >
            {item.description || item.descrption || 'No description available'}
          </Text>
          <Text style={styles.sharesText}>
            FREE for {item.min_shares_required || 3} shares
          </Text>
        </View>
      </TouchableOpacity>
    );
  };



  // Get the best available deal image URL (DEAL-SPECIFIC images only, matching DealDetail logic)
  const getDealImageUrl = (deal: any): string | null => {
    // Extract image URLs using same logic as DealDetail screen
    const deal_images = deal.deal_images; // Deal-specific images array
    const deal_image_url = deal.deal_image_url; // Single deal image URL
    const image_url = deal.image_url; // Generic image URL
    const images = deal.images; // Generic images array
    // Note: Excluding business_images to ensure we only show deal images

    let finalImages = null;

    // 1. Extract image URLs from deal_images array (objects with image_url property)
    if (deal_images && Array.isArray(deal_images) && deal_images.length > 0) {
      finalImages = deal_images
        .filter(img => img && typeof img === 'object' && img.image_url)
        .map(img => img.image_url)
        .filter(url => url && typeof url === 'string' && url.trim().length > 0);

      if (finalImages.length > 0) {
        return finalImages[0];
      }
    }

    // 2. Single deal image URL
    if (
      deal_image_url &&
      typeof deal_image_url === 'string' &&
      deal_image_url.trim().length > 0
    ) {
  return deal_image_url;
    }

    // 3. Generic image URL (might be deal-specific)
    if (
      image_url &&
      typeof image_url === 'string' &&
      image_url.trim().length > 0
    ) {
  return image_url;
    }

    // 4. Generic images array (could be strings or objects)
    if (images && Array.isArray(images) && images.length > 0) {
      finalImages = images
        .map(img => {
          // Handle both string URLs and objects with image_url property
          if (typeof img === 'string') return img;
          if (typeof img === 'object' && img.image_url) return img.image_url;
          return null;
        })
        .filter(url => url && typeof url === 'string' && url.trim().length > 0);

      if (finalImages.length > 0) {
        return finalImages[0];
      }
    }

    return null;
  };

  const getCategoryEmoji = (categoryName: string) => {
    const emojiMap: Record<string, string> = {
      'Food & Dining': '🍽️',
      'Coffee & Beverages': '☕',
      Automotive: '🚗',
      'Beauty & Wellness': '💅',
      Electronics: '📱',
      'Retail & Shopping': '🛍️',
      'Bakery & Desserts': '🧁',
      'Health & Fitness': '💪',
      'Home Services': '🏠',
    };
    return emojiMap[categoryName] || '🎁';
  };

  const formatDealType = (type: string) => {
    const typeMap: Record<string, string> = {
      free_item: 'Free Item',
      bogo: 'BOGO',
      percentage: 'Discount',
      fixed_amount: 'Save $',
    };
    return typeMap[type] || type;
  };

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="gift-outline" size={28} color="#FF9500" />
        <Text style={styles.headerTitle}>Explore Deals</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Tab View Categories */}
      <View style={styles.tabContainer}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabCategories.map((cat, index) => {
            const isSelected =
              cat.slug === null
                ? selectedCategory === null
                : selectedCategory === cat.slug;

            const handleTabPress = () => {
              AnalyticsService.trackEvent('category_filter', {
                category_slug: cat.slug || 'all',
                category_name: cat.name,
                screen: 'explore',
              });
              setSelectedCategory(cat.slug);
            };

            return (
              <TouchableOpacity
                key={cat.id || 'all'}
                onPress={handleTabPress}
                style={styles.tab}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    isSelected && styles.tabTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
                {isSelected && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.tabBottomLine} />
      </View>

      {/* Deals Grid */}
      <View style={styles.container}>
        {dealsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading deals...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={{ color: colors.error, textAlign: 'center' }}>
              {error}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                refreshDeals();
              }}
            >
              <Text style={{ color: '#FFF' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sortedDeals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {selectedCategory
                ? 'No deals in this category'
                : 'No deals available'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
              {selectedCategory
                ? 'Try selecting a different category'
                : 'Check back later for new deals!'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedDeals}
            keyExtractor={(item, index) => {
              const baseKey = item.id?.toString() || `${item.business_name}-${index}`;
              return `deal-${baseKey}-${index}`;
            }}
            numColumns={2}
            renderItem={renderDealCard}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginLeft: 12,
  },
  settingsButton: {
    padding: 8,
  },
  // Tab styles
  tabContainer: {
    position: 'relative',
    backgroundColor: '#FFF',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  tabTextSelected: {
    color: '#FF9500',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: '#FF9500',
    borderRadius: 1.5,
  },
  tabBottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  // Content styles
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#FF9500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  // Grid styles
  grid: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  // Card styles
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 190,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: '100%',
  },
  emojiContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  itemImage: {
    fontSize: 48,
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9500',
    letterSpacing: 0.5,
  },
  featuredBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FF9500',
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  cardContent: {
    padding: 12,
  },
  itemBusiness: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  sharesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
});

export default ExploreScreen;
