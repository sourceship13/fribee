import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, Platform, FlatList, Image } from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import VersionFooter from '../../components/VersionFooter';

// Dark mode map style for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

interface AboutBusinessProps {
  navigation: any;
  route: {
    params: {
      deal: any;
    };
  };
}

const AboutBusiness: React.FC<AboutBusinessProps> = ({ navigation, route }) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);
  const deal = route.params?.deal;

  const handlePhonePress = () => {
    if (deal?.business_phone) {
      Linking.openURL(`tel:${deal.business_phone}`);
    }
  };

  const handleWebsitePress = () => {
    if (deal?.business_website) {
      Linking.openURL(deal.business_website);
    }
  };

  const handleGetDirections = () => {
    const coordinates = getBusinessCoordinates();
    if (coordinates) {
      const { latitude, longitude } = coordinates;
      const label = deal.business_name || deal.business || 'Business Location';
      
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      });
      
      if (url) {
        Linking.openURL(url);
      }
    }
  };

  // Helper function to get business coordinates
  const getBusinessCoordinates = () => {
    // Try multiple possible property names for latitude
    const lat = parseFloat(
      deal?.latitude || 
      deal?.business_latitude || 
      deal?.lat || 
      deal?.business_lat || 
      ''
    );
    
    // Try multiple possible property names for longitude
    const lng = parseFloat(
      deal?.longitude || 
      deal?.business_longitude || 
      deal?.lng || 
      deal?.lon ||
      deal?.business_lng || 
      deal?.business_lon || 
      ''
    );

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      return null;
    }

    return { latitude: lat, longitude: lng };
  };

  const coordinates = getBusinessCoordinates();
  const hasValidCoordinates = coordinates !== null;

  // Helper function to get business images
  const getBusinessImages = (): Array<{ id: string; url: string }> => {
    const images: Array<{ id: string; url: string }> = [];
    
    // Try multiple possible property names for business images
    const businessImages = 
      deal?.images?.businessImages || 
      deal?.businessImages || 
      deal?.business_images || 
      [];
    
    // Add business images to array
    if (Array.isArray(businessImages) && businessImages.length > 0) {
      businessImages.forEach((img: any) => {
        if (img.url || img.image_url) {
          images.push({
            id: img.id || Math.random().toString(),
            url: img.url || img.image_url,
          });
        }
      });
    }
    
    return images;
  };

  const businessImages = getBusinessImages();

  // Debug logging
  console.log('Deal object:', deal);
  console.log('Coordinates:', coordinates);
  console.log('Has valid coordinates:', hasValidCoordinates);
  console.log('Business Images:', businessImages);

  if (!deal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Toolbar
          title="About Business"
          onBack={() => navigation.goBack()}
          showSettings={false}
        />
        <View style={styles.errorContainer}>
          <Text style={[iOSUIKit.body, { color: colors.text }]}>
            No business information available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toolbar
        title="About Business"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Business Header */}
        <View style={styles.businessHeader}>
          <View style={styles.businessTitleRow}>
            <Text style={[styles.businessName, { color: colors.text }]}>
              {deal.business_name || deal.business || 'Unknown Business'}
            </Text>
            {deal.is_premium_business && (
              <MaterialIcons
                name="verified"
                size={24}
                color="#0095f6"
                style={styles.verifiedIcon}
              />
            )}
          </View>
          {deal.category_name && (
            <Text
              style={[styles.categoryText, { color: colors.textSecondary }]}
            >
              {deal.category_name || deal.category}
            </Text>
          )}
        </View>

        {/* Map and Images Section */}
        {(hasValidCoordinates && coordinates) || businessImages.length > 0 ? (
          <View
            style={[
              styles.mapSection,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Business Images Horizontal FlatList */}
            {businessImages.length > 0 && (
              <View style={styles.businessImagesSection}>
                <Text style={[iOSUIKit.subhead, { color: colors.text, marginBottom: 12, paddingHorizontal: 16 }]}>
                  Business Photos
                </Text>
                <FlatList
                  data={businessImages}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.imagesList}
                  renderItem={({ item }) => (
                    <View style={styles.businessImageContainer}>
                      <Image
                        source={{ uri: item.url }}
                        style={styles.businessImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                />
              </View>
            )}

            {/* Map */}
            {hasValidCoordinates && coordinates && (
              <>
                <View style={styles.mapContainer}>
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    customMapStyle={isDarkMode ? darkMapStyle : []}
                  >
                    <Marker
                      coordinate={{
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                      }}
                      title={deal.business_name || deal.business || 'Business Location'}
                      description={deal.business_address}
                    />
                  </MapView>
                </View>
                
                <TouchableOpacity
                  style={[styles.directionsButton, { backgroundColor: colors.primary }]}
                  onPress={handleGetDirections}
                >
                  <MaterialIcons name="directions" size={20} color="#FFFFFF" />
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {/* Business Information Section */}
        <View
          style={[
            styles.businessInfoSection,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Business Information
          </Text>

          {/* Description */}
          {(deal.business_description || deal.businessDescription) && (
            <View style={styles.businessInfoRow}>
              <MaterialIcons name="info" size={20} color={colors.primary} />
              <View style={styles.businessInfoContent}>
                <Text
                  style={[
                    styles.businessInfoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  About
                </Text>
                <Text style={[styles.businessInfoText, { color: colors.text }]}>
                  {deal.business_description || deal.businessDescription}
                </Text>
              </View>
            </View>
          )}

          {/* Address */}
          {deal.business_address && (
            <View style={styles.businessInfoRow}>
              <MaterialIcons
                name="location-on"
                size={20}
                color={colors.primary}
              />
              <View style={styles.businessInfoContent}>
                <Text
                  style={[
                    styles.businessInfoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Address
                </Text>
                <Text style={[styles.businessInfoText, { color: colors.text }]}>
                  {deal.business_address}
                </Text>
              </View>
            </View>
          )}

          {/* City */}
          {deal.business_city && (
            <View style={styles.businessInfoRow}>
              <MaterialIcons
                name="location-city"
                size={20}
                color={colors.primary}
              />
              <View style={styles.businessInfoContent}>
                <Text
                  style={[
                    styles.businessInfoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  City
                </Text>
                <Text style={[styles.businessInfoText, { color: colors.text }]}>
                  {deal.business_city}
                </Text>
              </View>
            </View>
          )}

          {/* State */}
          {deal.business_state && (
            <View style={styles.businessInfoRow}>
              <MaterialIcons name="map" size={20} color={colors.primary} />
              <View style={styles.businessInfoContent}>
                <Text
                  style={[
                    styles.businessInfoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  State
                </Text>
                <Text style={[styles.businessInfoText, { color: colors.text }]}>
                  {deal.business_state}
                </Text>
              </View>
            </View>
          )}

          {/* Postal Code */}
          {(deal.business_postal_code ||
            deal.postalCode ||
            deal.zip_code ||
            deal.zipCode) && (
            <View style={styles.businessInfoRow}>
              <MaterialIcons
                name="markunread-mailbox"
                size={20}
                color={colors.primary}
              />
              <View style={styles.businessInfoContent}>
                <Text
                  style={[
                    styles.businessInfoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Postal Code
                </Text>
                <Text style={[styles.businessInfoText, { color: colors.text }]}>
                  {deal.business_postal_code ||
                    deal.postalCode ||
                    deal.zip_code ||
                    deal.zipCode}
                </Text>
              </View>
            </View>
          )}

          {/* Phone Number */}
          {deal.business_phone && (
            <TouchableOpacity onPress={handlePhonePress}>
            <View style={styles.businessInfoRow}>
              <MaterialIcons name="phone" size={20} color={colors.primary} />
              <View style={styles.businessInfoContent}>
                <Text
                  style={[
                    styles.businessInfoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Phone
                </Text>
                <Text style={[styles.businessInfoText, { color: colors.text }]}>
                  {deal.business_phone}
                </Text>
              </View>
            </View>
            </TouchableOpacity>
          )}

          {/* Website */}
          {deal.business_website && (
            <TouchableOpacity onPress={handleWebsitePress}>
              <View style={styles.businessInfoRow}>
                <MaterialIcons name="language" size={20} color={colors.primary} />
                <View style={styles.businessInfoContent}>
                  <Text
                    style={[
                    styles.businessInfoLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Website
                </Text>
                <Text
                  style={[styles.businessInfoText, { color: colors.primary }]}
                >
                  {deal.business_website}
                </Text>
              </View>
            </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  businessHeader: {
    marginBottom: 24,
  },
  mapSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  businessImagesSection: {
    paddingVertical: 16,
  },
  imagesList: {
    paddingHorizontal: 16,
  },
  businessImageContainer: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  businessImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  businessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  businessName: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  businessInfoSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  businessInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  businessInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  businessInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  businessInfoText: {
    fontSize: 15,
    lineHeight: 20,
  },
});

export default AboutBusiness;
