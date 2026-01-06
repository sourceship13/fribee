import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../../../libs/hooks/useAuth';
import { getColors } from '../../../libs/colors';
import Toolbar from '../../../components/Toolbar';

const BusinessCreationScreen4 = ({ navigation, route }: any) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  // Get all props from previous screens
  const {
    businessName,
    description,
    address,
    city,
    country,
    state,
    postalCode,
    phoneNumber,
    businessUrl,
    logo,
    cover,
    businessPhotos = [],
  } = route.params || {};

  const handleNext = () => {
    // Navigate to subscription screen with all business data
    navigation.navigate('BusinessSubscriptionScreen', {
      businessName,
      description,
      address,
      city,
      country,
      state,
      postalCode,
      phoneNumber,
      businessUrl,
      logo,
      cover,
      businessPhotos,
    });
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value || '-'}</Text>
      <View style={styles.rowDivider} />
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <Toolbar
        title="Business Creation"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            Step 3. <Text style={styles.stepTitleBold}>Review & Submit</Text>
          </Text>
          <Text style={[styles.stepSubtitle, { color: '#666' }]}>
            Please review all information before submitting your business registration
          </Text>
        </View>

        {/* Business Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Business Information
          </Text>
          <InfoRow label="Business name" value={businessName} />
          <InfoRow label="Description" value={description} />
          <InfoRow label="Phone number" value={phoneNumber} />
          <InfoRow label="Website" value={businessUrl} />
        </View>

        {/* Location Section */}
        <View style={[styles.section, styles.locationSection]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Location
          </Text>
          <InfoRow label="Address" value={address} />
          <InfoRow label="City" value={city} />
          <InfoRow label="State" value={state} />
          <InfoRow label="Country" value={country} />
        </View>

        {/* Images Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Images
          </Text>

          <View style={styles.logosCoverRow}>
            {/* Logo */}
            <View style={styles.imageColumn}>
              <Text style={styles.imageLabel}>Logo</Text>
              {logo?.uri ? (
                <View style={styles.logoContainer}>
                  <Image
                    source={{ uri: logo.uri }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={[styles.logoContainer, styles.emptyImageBox]}>
                  <Text style={styles.emptyText}>No logo</Text>
                </View>
              )}
            </View>

            {/* Cover */}
            <View style={styles.imageColumn}>
              <Text style={styles.imageLabel}>Cover</Text>
              {cover?.uri ? (
                <View style={styles.coverContainer}>
                  <Image
                    source={{ uri: cover.uri }}
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={[styles.coverContainer, styles.emptyImageBox]}>
                  <Text style={styles.emptyText}>No cover</Text>
                </View>
              )}
            </View>
          </View>

          {/* Business Photos */}
          {businessPhotos.length > 0 && (
            <View style={styles.businessPhotosSection}>
              <Text style={styles.imageLabel}>Business Photos</Text>
              <View style={styles.photosColumn}>
                {businessPhotos.map((photo: any, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: photo.uri }}
                    style={styles.businessPhoto}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Continue to Subscription</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.text }]}>
            Back to Previous Step
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 8,
  },
  stepTitleBold: {
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  section: {
    marginBottom: 8,
  },
  locationSection: {
    backgroundColor: '#F9F9F9',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  logosCoverRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  imageColumn: {
    flex: 1,
  },
  imageLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  logoContainer: {
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  coverContainer: {
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  emptyImageBox: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  businessPhotosSection: {
    marginTop: 8,
  },
  photosColumn: {
    gap: 12,
  },
  businessPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  nextButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default BusinessCreationScreen4;
