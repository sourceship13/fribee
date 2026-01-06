import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Linking, Alert } from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import { iOSUIKit } from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconLogo from '../../../assets/imgs/icon_logo.svg';
import SettingsIcon from '../../../assets/imgs/settings-icon.svg';
import ApiService from '../../services/api.service';
import VersionFooter from '../../components/VersionFooter';
import * as RNIap from 'react-native-iap';

interface BusinessData {
  id: string;
  businessName: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phoneNumber: string;
  websiteUrl?: string;
  logoUrl: string;
  coverImageUrl?: string;
  businessImage1Url?: string;
  businessImage2Url?: string;
  businessImages?: Array<{
    id: string;
    url: string;
    s3Key: string;
    originalName: string;
  }>;
}

const BusinessProfile = ({ navigation, route }: any) => {
  const { isDarkMode, userBusiness } = useAuth();
  const colors = getColors(isDarkMode);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get business ID from route params if available
  const businessId = route?.params?.businessId;

  useEffect(() => {
    loadBusinessData();
  }, [userBusiness, businessId]);

  const loadBusinessData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // If viewing a specific business (businessId provided), fetch from API
      if (businessId) {
        const response = await ApiService.getBusinessProfile(businessId);
        if (response.success && response.data) {
          setBusiness(response.data);
        } else {
          setError(response.message || 'Failed to load business profile');
        }
      } 
      // Otherwise, use the userBusiness from context (already fetched with deals)
      else if (userBusiness && Array.isArray(userBusiness) && userBusiness.length > 0) {
        // userBusiness is an array, get the first business (primary business)
        const primaryBusiness = userBusiness[0];
        
        // Map the API response structure to BusinessData interface
        const mappedBusiness: BusinessData = {
          id: primaryBusiness.businessId,
          businessName: primaryBusiness.businessName,
          description: primaryBusiness.description || '',
          address: primaryBusiness.address || '',
          city: primaryBusiness.city || '',
          state: primaryBusiness.state || '',
          country: primaryBusiness.country || '',
          phoneNumber: primaryBusiness.phoneNumber || '',
          websiteUrl: primaryBusiness.websiteUrl,
          logoUrl: primaryBusiness.images?.logo || primaryBusiness.logoUrl || '',
          coverImageUrl: primaryBusiness.images?.coverImage,
          businessImages: primaryBusiness.images?.businessImages || primaryBusiness.businessImages || [],
        };
        
        console.log('📸 Business Images:', mappedBusiness.businessImages);
        
        setBusiness(mappedBusiness);
      } else {
        setError('No business profile available');
      }
    } catch (err: any) {
      console.error('Error loading business profile:', err);
      setError(err.message || 'An error occurred while loading the business profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhonePress = () => {
    if (business?.phoneNumber) {
      Linking.openURL(`tel:${business.phoneNumber}`);
    }
  };

  const handleWebsitePress = () => {
    if (business?.websiteUrl) {
      Linking.openURL(business.websiteUrl);
    }
  };

  const clearStuckPurchases = async () => {
    try {
      Alert.alert(
        'Clear Stuck Purchases',
        'This will clear all pending IAP purchases. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            onPress: async () => {
              try {
                console.log('🧹 Starting to clear stuck purchases...');
                await RNIap.initConnection();
                
                const purchases = await RNIap.getAvailablePurchases();
                console.log('📦 Found purchases:', purchases.length);
                
                if (purchases.length === 0) {
                  Alert.alert('No Purchases', 'No stuck purchases found.');
                  return;
                }
                
                for (const purchase of purchases) {
                  console.log('🔄 Consuming:', purchase.productId, purchase.purchaseToken);
                  
                  await RNIap.finishTransaction({ 
                    purchase, 
                    isConsumable: true 
                  });
                  
                  if (Platform.OS === 'android') {
                    await RNIap.consumePurchaseAndroid(purchase.purchaseToken);
                  }
                  
                  console.log('✅ Done consuming:', purchase.productId);
                }
                
                console.log('✅ All stuck purchases cleared!');
                Alert.alert('Success', `Cleared ${purchases.length} stuck purchase(s)`);
                
              } catch (error: any) {
                console.error('❌ Error clearing purchases:', error);
                Alert.alert('Error', `Failed to clear purchases: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Error:', error);
      Alert.alert('Error', error.message);
    }
  };

  const InfoRow = ({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) => (
    <TouchableOpacity 
      style={styles.infoRow} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.infoIconContainer, { backgroundColor: colors.primary + '15' }]}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[iOSUIKit.caption2, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[iOSUIKit.body, { color: colors.text, marginTop: 2 }]}>
          {value}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <IconLogo width={21} height={24} fill="#FF9500" />
          <Text style={[iOSUIKit.title3Emphasized, { color: colors.title }]}>Business Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <SettingsIcon width={24} height={24} color={colors.inactive} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[iOSUIKit.body, { color: colors.textSecondary, marginTop: 16 }]}>
            Loading business profile...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !business) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <IconLogo width={21} height={24} fill="#FF9500" />
          <Text style={[iOSUIKit.title3Emphasized, { color: colors.title }]}>Business Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <SettingsIcon width={24} height={24} color={colors.inactive} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Icon name="error-outline" size={64} color={colors.error} />
          <Text style={[iOSUIKit.title3, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
            {error || 'Business not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadBusinessData}
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
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <IconLogo width={21} height={24} fill="#FF9500" />
        <Text style={[iOSUIKit.title3Emphasized, { color: colors.title }]}>Business Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
          <SettingsIcon width={24} height={24} color={colors.inactive} />
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Logo Circle */}
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            {business.logoUrl ? (
              <Image
                source={{ uri: business.logoUrl }}
                style={styles.logoImage}
                resizeMode="cover"
              />
            ) : (
              <Icon name="person" size={48} color={colors.primary} />
            )}
          </View>
          
          {/* Business Name with Verified Badge */}
          <View style={styles.businessNameContainer}>
            <Text style={[iOSUIKit.title3Emphasized, { color: colors.text }]}>
              {business.businessName}
            </Text>
            <Icon name="verified" size={18} color="#0095f6" style={{ marginLeft: 6 }} />
          </View>

          {/* Description */}
          {business.description && (
            <Text style={[iOSUIKit.subhead, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {business.description}
            </Text>
          )}

          {/* Business Deals Button */}
          <TouchableOpacity
            style={styles.businessDealsButton}
            onPress={() => navigation.navigate('BusinessDeals', { businessId: business.id })}
          >
            <Icon name="edit" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[iOSUIKit.bodyEmphasized, { color: '#FFFFFF' }]}>
              Business Deals
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug: Clear Stuck Purchases Button */}
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: '#FFA500', marginTop: 12 }]}
            onPress={clearStuckPurchases}
          >
            <Icon name="clean-hands" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[iOSUIKit.body, { color: '#FFFFFF', fontWeight: '600' }]}>
              Clear Stuck Purchases (Debug)
            </Text>
          </TouchableOpacity>
        )}

        {/* Contact Information Card */}
        <View style={[styles.contactCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <InfoRow 
            icon="phone" 
            label="Phone Number" 
            value={business.phoneNumber || 'Not provided'}
            onPress={business.phoneNumber ? handlePhonePress : undefined}
          />
          
          <InfoRow 
            icon="language" 
            label="Website" 
            value={business.websiteUrl || 'Not provided'}
            onPress={business.websiteUrl ? handleWebsitePress : undefined}
          />
          
          <InfoRow 
            icon="location-on" 
            label="Address" 
            value={`${business.address}${business.city ? ', ' + business.city : ''}${business.state ? ', ' + business.state : ''}${business.country ? ', ' + business.country : ''}`}
          />
        </View>

        {/* Business Photos Section */}
        {business.businessImages && business.businessImages.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={[iOSUIKit.title3Emphasized, { color: colors.text, marginBottom: 16, paddingHorizontal: 16 }]}>
              Business Photos
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScrollContent}
            >
              {business.businessImages.map((image) => (
                <View key={image.id} style={styles.photoContainer}>
                  <Image
                    source={{ uri: image.url }}
                    style={styles.businessPhoto}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigation.navigate('BusinessDeals')}
          >
            <Icon name="local-offer" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[iOSUIKit.bodyEmphasized, { color: '#FFFFFF' }]}>
              View My Deals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.outlineButton, { borderColor: colors.text }]}
            onPress={() => navigation.navigate('EditBusiness', { businessId: business.id })}
          >
            <Icon name="edit" size={18} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[iOSUIKit.bodyEmphasized, { color: colors.text }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 0,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  businessNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  businessDealsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
  },
  contactCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  photosSection: {
    marginTop: 24,
  },
  photosScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  photoContainer: {
    width: 150,
    height: 150,
    overflow: 'hidden',
  },
  businessPhoto: {
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  debugButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});

export default BusinessProfile;
