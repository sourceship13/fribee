import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
  Platform,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Ionicons from '@react-native-vector-icons/ionicons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: screenWidth } = Dimensions.get('window');
const HERO_HEIGHT = 280;

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
    const lat = parseFloat(
      deal?.latitude ||
        deal?.business_latitude ||
        deal?.lat ||
        deal?.business_lat ||
        '',
    );

    const lng = parseFloat(
      deal?.longitude ||
        deal?.business_longitude ||
        deal?.lng ||
        deal?.lon ||
        deal?.business_lng ||
        deal?.business_lon ||
        '',
    );

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

    const businessImages =
      deal?.images?.businessImages ||
      deal?.businessImages ||
      deal?.business_images ||
      [];

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

  // Get hero image (first business image or deal image)
  const getHeroImage = (): string | null => {
    const businessImages = getBusinessImages();
    if (businessImages.length > 0) {
      return businessImages[0].url;
    }
    if (deal?.deal_images?.[0]?.image_url) {
      return deal.deal_images[0].image_url;
    }
    if (deal?.deal_image_url) {
      return deal.deal_image_url;
    }
    if (deal?.image_url) {
      return deal.image_url;
    }
    return null;
  };

  const businessImages = getBusinessImages();
  const heroImage = getHeroImage();

  if (!deal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <Text style={{ color: colors.text }}>
            No business information available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Back Button - Floating */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <MaterialIcons name="store" size={64} color="#CCC" />
            </View>
          )}
        </View>

        {/* Content Card - Overlaps Hero */}
        <View
          style={[styles.contentCard, { backgroundColor: colors.background }]}
        >
          {/* Category Chip */}
          {deal.category_name && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>
                {deal.category_name || deal.category}
              </Text>
            </View>
          )}

          {/* Business Name with Verified Badge */}
          <View style={styles.businessTitleRow}>
            <Text style={[styles.businessName, { color: colors.text }]}>
              {deal.business_name || deal.business || 'Unknown Business'}
            </Text>
            {deal.is_premium_business && (
              <MaterialIcons
                name="verified"
                size={22}
                color="#0095f6"
                style={styles.verifiedIcon}
              />
            )}
          </View>

          {/* Description / Tagline */}
          {(deal.business_description || deal.businessDescription) && (
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              {deal.business_description || deal.businessDescription}
            </Text>
          )}

          {/* Location Info */}
          <View style={styles.locationSection}>
            {/* State */}
            {deal.business_state && (
              <View style={styles.locationRow}>
                <View
                  style={[styles.locationIcon, { backgroundColor: '#FFF5E6' }]}
                >
                  <MaterialIcons name="location-on" size={20} color="#FF9500" />
                </View>
                <View style={styles.locationContent}>
                  <Text
                    style={[styles.locationLabel, { color: colors.subText }]}
                  >
                    State
                  </Text>
                  <Text style={[styles.locationValue, { color: colors.text }]}>
                    {deal.business_state}
                  </Text>
                </View>
              </View>
            )}

            {/* City */}
            {deal.business_city && (
              <View style={styles.locationRow}>
                <View
                  style={[styles.locationIcon, { backgroundColor: '#FFF5E6' }]}
                >
                  <MaterialIcons
                    name="location-city"
                    size={20}
                    color="#FF9500"
                  />
                </View>
                <View style={styles.locationContent}>
                  <Text
                    style={[styles.locationLabel, { color: colors.subText }]}
                  >
                    City
                  </Text>
                  <Text style={[styles.locationValue, { color: colors.text }]}>
                    {deal.business_city}
                  </Text>
                </View>
              </View>
            )}

            {/* Postal Code */}
            {(deal.business_postal_code ||
              deal.postalCode ||
              deal.zip_code ||
              deal.zipCode) && (
              <View style={styles.locationRow}>
                <View
                  style={[styles.locationIcon, { backgroundColor: '#FFF5E6' }]}
                >
                  <MaterialIcons
                    name="local-post-office"
                    size={20}
                    color="#FF9500"
                  />
                </View>
                <View style={styles.locationContent}>
                  <Text
                    style={[styles.locationLabel, { color: colors.subText }]}
                  >
                    Postal Code
                  </Text>
                  <Text style={[styles.locationValue, { color: colors.text }]}>
                    {deal.business_postal_code ||
                      deal.postalCode ||
                      deal.zip_code ||
                      deal.zipCode}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Map Section */}
          {hasValidCoordinates && coordinates && (
            <View style={styles.mapSection}>
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
                    title={
                      deal.business_name || deal.business || 'Business Location'
                    }
                    description={deal.business_address}
                  />
                </MapView>
              </View>

              <TouchableOpacity
                style={styles.directionsButton}
                onPress={handleGetDirections}
              >
                <Ionicons name="navigate" size={20} color="#FFF" />
                <Text style={styles.directionsButtonText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Business Photos Gallery */}
          {businessImages.length > 0 && (
            <View style={styles.gallerySection}>
              <FlatList
                data={businessImages}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.galleryList}
                renderItem={({ item }) => (
                  <View style={styles.galleryImageContainer}>
                    <Image
                      source={{ uri: item.url }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Hero Section
  heroContainer: {
    height: HERO_HEIGHT,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Content Card
  contentCard: {
    marginTop: -40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 20,
    minHeight: 500,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  businessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  businessName: {
    fontSize: 26,
    fontWeight: '700',
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  // Location Section
  locationSection: {
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContent: {
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Map Section
  mapSection: {
    marginBottom: 24,
    marginHorizontal: -20,
  },
  mapContainer: {
    height: 180,
  },
  map: {
    flex: 1,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 12,
    marginHorizontal: 20,
    gap: 8,
  },
  directionsButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Gallery Section
  gallerySection: {
    marginTop: 8,
  },
  galleryList: {
    paddingRight: 20,
  },
  galleryImageContainer: {
    marginRight: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: 150,
    height: 150,
  },
});

export default AboutBusiness;
