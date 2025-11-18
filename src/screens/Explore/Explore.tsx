import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import ApiConfig from '../../libs/utils/api.utils';
import { iOSUIKit } from 'react-native-typography';

const ExploreScreen = ({ navigation }: any) => {
  const {
    isDarkMode,
    categories,
    availableCategories,
    deals,
    dealsLoading,
    refreshDeals,
    heartedDeals,
  } = useAuth();
  const colors = getColors(isDarkMode);

  // Filter available categories to show only the ones the user has enabled
  // If no categories are set (empty object), show all available categories
  const activeCategories =
    Object.keys(categories).length === 0
      ? availableCategories
      : availableCategories.filter(cat => categories[cat.slug]);

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
    // Debug card rendering for problematic positions

    const isFeatured = item.priority_score && item.priority_score > 0;
    const isPremium =
      item.is_premium === true || item.is_premium_business === true;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isDarkMode ? styles.glassCardDark : styles.glassCard,
          {
            // backgroundColor: isDarkMode
            //   ? 'rgba(255, 255, 255, 0.06)'
            //   : 'rgba(255, 255, 255, 0.15)',
            borderWidth: 0,
          },
        ]}
        onPress={() => navigation.navigate('DealDetail', { deal: item })}
        activeOpacity={0.7}
      >
        {/* Gradient overlays temporarily removed */}

        {/* Subtle glow effect for dark mode - much more transparent */}
        {isDarkMode && (
          <>
            <View style={[styles.innerGlow]} />
            <View
              style={[
                styles.shimmerEffect,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.015)',
                },
              ]}
            />
          </>
        )}

        {isPremium ? (
          <View
            style={[
              styles.premiumBadge,
              {
                backgroundColor: '#FF8C00',
                borderWidth: 1,
                borderColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.3)'
                  : '#FF7700',
              },
            ]}
          >
            <Text
              style={[styles.premiumText, { color: '#FFFFFF', fontSize: 12 }]}
            >
              PREMIUM
            </Text>
          </View>
        ) : isFeatured ? (
          <View
            style={[
              styles.featuredBadge,
              {
                backgroundColor: isDarkMode
                  ? colors.primary + 'E6' // More opaque in dark mode
                  : colors.primary + '95',
                borderWidth: 1,
                borderColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.3)'
                  : colors.primary + '40',
              },
            ]}
          >
            <Text style={[styles.featuredText, { color: colors.background }]}>
              Featured
            </Text>
          </View>
        ) : null}
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
        </View>
        <Text
          style={[styles.itemBusiness, { color: colors.text, marginTop: 120 }]}
          numberOfLines={1}
        >
          {item.business_name || item.business || 'Unknown Business'}
        </Text>
        <Text
          style={[styles.itemDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description || item.descrption || 'No description available'}
        </Text>
        <View style={styles.dealDetails}>
          {item.deal_type ? (
            <Text style={[styles.dealType, { color: colors.primary }]}>
              {formatDealType(item.deal_type)}
            </Text>
          ) : null}
          {item.min_shares_required ? (
            <Text
              style={[styles.sharesRequired, { color: colors.textPlaceholder }]}
            >
              {item.min_shares_required} shares
            </Text>
          ) : null}
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingBottom: 100,
      }}
    >
      {/* Header with Settings Button */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontFamily: 'Roboto-Thin' },
          ]}
        >
          Explore
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Text style={[iOSUIKit.title3, { color: colors.primary }]}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Bar */}
      <View
      >
        {activeCategories.length === 0 ? (
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: colors.text,
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              No categories available.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{ marginTop: 4 }}
            >
              <Text
                style={{
                  color: colors.primary,
                  textDecorationLine: 'underline',
                }}
              >
                Go to Settings to manage categories
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'all', name: 'All', slug: null }, ...activeCategories]}
            keyExtractor={cat => cat.id || 'all'}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item: cat }) => {
              const isSelected =
                cat.slug === null
                  ? selectedCategory === null
                  : selectedCategory === cat.slug;

              return (
                <TouchableOpacity
                  onPress={() => setSelectedCategory(cat.slug)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? (cat as any).color_hex || colors.primary
                        : colors.chip,
                      borderColor: isSelected
                        ? (cat as any).color_hex || colors.primary
                        : colors.borderStrong,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      iOSUIKit.caption2,
                      {
                        color: isSelected ? colors.background : colors.text,
                        fontWeight: 'bold',
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {(() => {
                    const count = getCategoryDealCount(cat.name);
                    return count > 0 ? (
                      <Text
                        style={[
                          iOSUIKit.caption2,
                          {
                            color: isSelected
                              ? colors.background
                              : colors.textPlaceholder,
                            fontSize: 10,
                            marginLeft: 4,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    ) : null;
                  })()}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingVertical: 2 }}
          />
        )}
      </View>

      {/* Deals List */}
      <View style={styles.container}>
        {dealsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[iOSUIKit.body, { color: colors.text, marginTop: 12 }]}
            >
              Loading deals...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={{ color: colors.error, textAlign: 'center' }}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setError(null);
                refreshDeals();
              }}
            >
              <Text style={{ color: colors.background }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sortedDeals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
            <Text style={[iOSUIKit.body, { color: colors.text }]}>
              {selectedCategory
                ? `No deals in this category`
                : 'No deals available'}
            </Text>
            <Text
              style={[
                iOSUIKit.subhead,
                {
                  color: colors.textPlaceholder,
                  marginTop: 8,
                  textAlign: 'center',
                },
              ]}
            >
              {selectedCategory
                ? 'Try selecting a different category'
                : 'Check back later for new deals!'}
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={[styles.resultsCount, { color: colors.textSecondary }]}
            >
              {sortedDeals.length} {sortedDeals.length === 1 ? 'deal' : 'deals'}{' '}
              available
              {selectedCategory &&
                ' in ' +
                  activeCategories.find(c => c.slug === selectedCategory)?.name}
            </Text>
            <FlatList
              data={sortedDeals}
              keyExtractor={(item, index) => {
                // Create unique key combining multiple identifiers
                const baseKey =
                  item.id?.toString() || `${item.business_name}-${index}`;
                return `deal-${baseKey}-${index}`;
              }}
              numColumns={2}
              renderItem={renderDealCard}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={styles.row}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
            />
          </>
        )}
      </View>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  categoryChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resultsCount: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      marginBottom: 8,
      paddingHorizontal: 4,
    },
  ]),
  grid: {
    paddingBottom: 20,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  card: {
    width: '47%', // Fixed width instead of flex
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 6, // Reduced from 12 to 6 to bring deal details closer to bottom
    minHeight: 140,
    position: 'relative',
  },
  glassCard: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  glassCardDark: {
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    opacity: 0.8,
    zIndex: 0,
  },
  gradientMiddle: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    height: '60%',
    borderRadius: 6,
    opacity: 0.6,
    zIndex: 0,
  },

  innerGlow: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 11,
    borderWidth: 0,
    zIndex: 0,
  },
  shimmerEffect: {
    position: 'absolute',
    top: -10,
    left: '20%',
    width: '60%',
    height: '120%',
    borderRadius: 12,
    transform: [{ rotate: '25deg' }],
    opacity: 0.5,
    zIndex: 0,
  },
  featuredBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    margin: 2,
  },
  featuredText: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      fontWeight: 'bold',
    },
  ]),
  premiumBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    margin: 2,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumText: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      fontWeight: 'bold',
      letterSpacing: 0.5,
      fontSize: 9, // Keep smaller for premium badge
    },
  ]),
  itemImage: {
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
    zIndex: 1,
  },
  itemBusiness: StyleSheet.flatten([
    iOSUIKit.footnoteEmphasized,
    {
      marginBottom: 4,
      textAlign: 'left',
      zIndex: 1,
    },
  ]),
  itemDescription: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      marginBottom: 8,
      textAlign: 'left',
      lineHeight: 14,
      zIndex: 1,
    },
  ]),
  dealDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    zIndex: 1,
  },
  dealType: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      fontWeight: '600',
      fontSize: 10, // Keep smaller for deal type
    },
  ]),
  sharesRequired: StyleSheet.flatten([
    iOSUIKit.caption2,
    {
      fontSize: 9, // Keep smaller for shares info
    },
  ]),
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120, // Increased to take up the area of the removed spacer (96 + 24)
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: 1,
  },
  headerTitle: StyleSheet.flatten([
    iOSUIKit.largeTitleEmphasized,
    {
      fontSize: 24, // Override default size for header
    },
  ]),
  settingsButton: {
    padding: 8,
  },
});

export default ExploreScreen;
