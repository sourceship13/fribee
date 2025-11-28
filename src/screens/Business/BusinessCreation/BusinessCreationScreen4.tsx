import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useAuth } from '../../../libs/hooks/useAuth';
import { getColors } from '../../../libs/colors';
import Toolbar from '../../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VersionFooter from '../../../components/VersionFooter';

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
    businessImage1,
    businessImage2,
  } = route.params;

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
      businessImage1,
      businessImage2,
    });
  };

  const SummaryRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.summaryRow}>
      <Text style={[iOSUIKit.subhead, { color: colors.textSecondary, flex: 1 }]}>
        {label}
      </Text>
      <Text style={[iOSUIKit.body, { color: colors.text, flex: 2, textAlign: 'right' }]}>
        {value}
      </Text>
    </View>
  );

  const ImagePreview = ({ uri, label }: { uri: string; label: string }) => (
    <View style={styles.imagePreviewContainer}>
      <Text style={[iOSUIKit.subhead, { color: colors.text, marginBottom: 8, fontWeight: '600' }]}>
        {label}
      </Text>
      <Image
        source={{ uri }}
        style={styles.summaryImage}
        resizeMode="cover"
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Toolbar
        title="Business Access"
        onBack={() => navigation.goBack()}
        showSettings={false}
      />
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.container}>
          <Text style={[iOSUIKit.largeTitleEmphasized, { color: colors.text, marginBottom: 16 }]}>
            Review & Submit
          </Text>
          <Text style={[iOSUIKit.body, { color: colors.text, marginBottom: 24 }]}>
            Please review all information before submitting your business registration.
          </Text>

          {/* Business Information Section */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[iOSUIKit.title3, { color: colors.text, marginBottom: 16 }]}>
              Business Information
            </Text>
            <SummaryRow label="Business Name" value={businessName} />
            <SummaryRow label="Description" value={description} />
            <SummaryRow label="Phone Number" value={phoneNumber} />
            <SummaryRow label="Website" value={businessUrl} />
          </View>

          {/* Location Section */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[iOSUIKit.title3, { color: colors.text, marginBottom: 16 }]}>
              Location
            </Text>
            <SummaryRow label="Address" value={address} />
            <SummaryRow label="City" value={city} />
            <SummaryRow label="State" value={state} />
            <SummaryRow label="Country" value={country} />
          </View>

          {/* Images Section */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[iOSUIKit.title3, { color: colors.text, marginBottom: 16 }]}>
              Images
            </Text>
            
            <View style={styles.imagesGrid}>
              {logo && <ImagePreview uri={logo.uri} label="Logo" />}
              {cover && <ImagePreview uri={cover.uri} label="Cover Photo" />}
              {businessImage1 && <ImagePreview uri={businessImage1.uri} label="Business Image 1" />}
              {businessImage2 && <ImagePreview uri={businessImage2.uri} label="Business Image 2" />}
            </View>
          </View>

          {/* Continue to Subscription Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              padding: 15,
              borderRadius: 10,
              marginTop: 24,
              marginBottom: 40,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
            onPress={handleNext}
          >
            <Icon name="credit-card" size={20} color={colors.background} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: 16 }}>
              Continue to Subscription
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  container: {
    padding: 24,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  imagesGrid: {
    gap: 16,
  },
  imagePreviewContainer: {
    marginBottom: 16,
  },
  summaryImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
});

export default BusinessCreationScreen4;
