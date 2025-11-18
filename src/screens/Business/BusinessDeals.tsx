import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../../services/api.service';

interface Deal {
  deal_id: string;
  deal_title: string;
  description: string;
  deal_type: string;
  deal_price: string;
  percentage_discount: number;
  min_shares_required: number;
  end_time: string;
  created_at: string;
  priority_score: number;
  deal_images?: Array<{
    id: string;
    image_url?: string;
    url?: string;
    image_type: string;
  }>;
  dealImages?: Array<{
    id: string;
    url: string;
  }>;
  dealImage?: string;
  deal_image?: string;
  is_hearted?: boolean;
  redemption_status?: string | null;
}

const BusinessDeals = ({ navigation }: any) => {
  const { isDarkMode, userBusiness, deals, refreshDeals } = useAuth();
  const colors = getColors(isDarkMode);
  const [businessDeals, setBusinessDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadBusinessDeals();
  }, [userBusiness, deals]);

  const loadBusinessDeals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (userBusiness && Array.isArray(userBusiness) && userBusiness.length > 0) {
        const primaryBusiness = userBusiness[0];
        const businessId = primaryBusiness.businessId;

        // Filter deals that belong to this business
        const filteredDeals = deals.filter(
          (deal: any) => deal.business_id === businessId
        );

        setBusinessDeals(filteredDeals);
      } else {
        setError('No business profile found');
      }
    } catch (err: any) {
      console.error('Error loading business deals:', err);
      setError(err.message || 'Failed to load business deals');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinessDeals();
    setRefreshing(false);
  };

  const handleDealPress = (deal: Deal) => {
    navigation.navigate('DealDetail', { deal });
  };

  const handleDeletePress = (deal: Deal) => {
    setDealToDelete(deal);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!dealToDelete) return;

    setIsDeleting(true);
    try {
      const response = await ApiService.deleteDeal(dealToDelete.deal_id);
      
      if (response.success) {
        // Remove the deal from local state
        setBusinessDeals(prev => prev.filter(d => d.deal_id !== dealToDelete.deal_id));
        setDeleteModalVisible(false);
        setDealToDelete(null);
        
        // Show success message
        Alert.alert('Success', 'Deal deleted successfully');
      } else {
        throw new Error(response.message || 'Failed to delete deal');
      }
    } catch (error: any) {
      console.error('Error deleting deal:', error);
      Alert.alert('Error', error.message || 'Failed to delete deal. Please try again.');
    } finally {
      setIsDeleting(false);
      await refreshDeals();
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setDealToDelete(null);
  };

  const getDealTypeLabel = (dealType: string) => {
    switch (dealType) {
      case 'free_item':
        return 'FREE ITEM';
      case 'bogo':
        return 'BOGO';
      case 'percentage':
        return 'DISCOUNT';
      default:
        return dealType.toUpperCase();
    }
  };

  const getDealTypeColor = (dealType: string) => {
    switch (dealType) {
      case 'free_item':
        return '#10B981'; // Green
      case 'bogo':
        return '#F59E0B'; // Orange
      case 'percentage':
        return '#3B82F6'; // Blue
      default:
        return colors.primary;
    }
  };

  const renderDealCard = ({ item }: { item: Deal }) => {
    // Log the entire deal object to see the structure
    console.log('📦 Full Deal Object:', JSON.stringify(item, null, 2));
    
    // Try multiple possible image sources from the API response
    const dealImage = 
      item.deal_images?.[0]?.image_url || 
      item.deal_images?.[0]?.url ||
      (item as any).dealImages?.[0]?.url ||
      (item as any).dealImage ||
      (item as any).deal_image;

    console.log('🖼️ Deal Image URL:', dealImage, 'Deal:', item.deal_title);
    console.log('🖼️ deal_images array:', item.deal_images);

    return (
      <TouchableOpacity
        style={[styles.dealCard, { backgroundColor: colors.surface }]}
        onPress={() => handleDealPress(item)}
      >
        {/* Delete Button - Top Right */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}
          onPress={() => handleDeletePress(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="delete" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Deal Image */}
        {dealImage ? (
          <Image source={{ uri: dealImage }} style={styles.dealImage} resizeMode="cover" />
        ) : (
          <View style={[styles.dealImagePlaceholder, { backgroundColor: colors.border }]}>
            <Icon name="local-offer" size={48} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.dealInfo}>
          {/* Deal Type Badge */}
          <View
            style={[
              styles.dealTypeBadge,
              { backgroundColor: getDealTypeColor(item.deal_type) },
            ]}
          >
            <Text style={styles.dealTypeText}>{getDealTypeLabel(item.deal_type)}</Text>
          </View>

          {/* Deal Title */}
          <Text style={[iOSUIKit.title3, { color: colors.text }]} numberOfLines={2}>
            {item.deal_title}
          </Text>

          {/* Deal Description */}
          <Text
            style={[iOSUIKit.body, { color: colors.textSecondary, marginTop: 4 }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>

          {/* Deal Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="share" size={16} color={colors.textSecondary} />
              <Text style={[iOSUIKit.footnote, { color: colors.textSecondary, marginLeft: 4 }]}>
                {item.min_shares_required} shares
              </Text>
            </View>

            {item.percentage_discount > 0 && (
              <View style={styles.statItem}>
                <Icon name="local-offer" size={16} color={colors.textSecondary} />
                <Text style={[iOSUIKit.footnote, { color: colors.textSecondary, marginLeft: 4 }]}>
                  {item.percentage_discount}% off
                </Text>
              </View>
            )}

            <View style={styles.statItem}>
              <Icon name="access-time" size={16} color={colors.textSecondary} />
              <Text style={[iOSUIKit.footnote, { color: colors.textSecondary, marginLeft: 4 }]}>
                {item.end_time}
              </Text>
            </View>
          </View>

          {/* Priority Badge */}
          {item.priority_score > 0 && (
            <View style={styles.priorityBadge}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={[iOSUIKit.footnote, { color: '#FFD700', marginLeft: 4 }]}>
                Featured
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="local-offer" size={64} color={colors.textSecondary} />
      <Text style={[iOSUIKit.title3, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
        No Deals Yet
      </Text>
      <Text
        style={[
          iOSUIKit.body,
          { color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
        ]}
      >
        Create your first deal to start attracting customers
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('DealPostPurchase')}
      >
        <Icon name="add" size={20} color={colors.background} style={{ marginRight: 8 }} />
        <Text style={[iOSUIKit.body, { color: colors.background, fontWeight: '600' }]}>
          Create Deal
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Toolbar title="My Deals" onBack={() => navigation.goBack()} showSettings={false} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[iOSUIKit.body, { color: colors.textSecondary, marginTop: 16 }]}>
            Loading deals...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Toolbar title="My Deals" onBack={() => navigation.goBack()} showSettings={false} />
        <View style={styles.centerContainer}>
          <Icon name="error-outline" size={64} color={colors.error} />
          <Text style={[iOSUIKit.title3, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadBusinessDeals}
          >
            <Text style={[iOSUIKit.body, { color: colors.background, fontWeight: '600' }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Toolbar title="My Deals" onBack={() => navigation.goBack()} showSettings={false} />

      {/* Header Stats */}
      <View style={[styles.headerStats, { backgroundColor: colors.surface }]}>
        <View style={styles.statBox}>
          <Text style={[iOSUIKit.title3Emphasized, { color: colors.text }]}>{businessDeals.length}</Text>
          <Text style={[iOSUIKit.footnote, { color: colors.textSecondary }]}>Total Deals</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[iOSUIKit.title3Emphasized, { color: colors.text }]}>
            {businessDeals.filter((d) => d.priority_score > 0).length}
          </Text>
          <Text style={[iOSUIKit.footnote, { color: colors.textSecondary }]}>Featured</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[iOSUIKit.title3Emphasized, { color: colors.text }]}>
            {businessDeals.filter((d) => d.is_hearted).length}
          </Text>
          <Text style={[iOSUIKit.footnote, { color: colors.textSecondary }]}>Hearted</Text>
        </View>
      </View>

      <FlatList
        data={businessDeals}
        renderItem={renderDealCard}
        keyExtractor={(item) => item.deal_id}
        contentContainerStyle={[
          styles.listContent,
          businessDeals.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button - only show when there are deals */}
      {businessDeals.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('DealPostPurchase')}
        >
          <Icon name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Icon name="warning" size={48} color="#EF4444" />
              <Text style={[iOSUIKit.title3Emphasized, { color: colors.text, marginTop: 16 }]}>
                Delete Deal?
              </Text>
            </View>

            <Text style={[iOSUIKit.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              Are you sure you want to delete "{dealToDelete?.deal_title}"? This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={cancelDelete}
                disabled={isDeleting}
              >
                <Text style={[iOSUIKit.bodyEmphasized, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton, { backgroundColor: '#EF4444' }]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[iOSUIKit.bodyEmphasized, { color: '#FFFFFF' }]}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerStats: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Extra padding for bottom tab bar
  },
  emptyListContent: {
    flex: 1,
  },
  dealCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealImage: {
    width: '100%',
    height: 200,
  },
  dealImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealInfo: {
    padding: 16,
  },
  dealTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  dealTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  createButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100, // Above bottom tab bar
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteConfirmButton: {
    // backgroundColor set inline
  },
});

export default BusinessDeals;
