import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import VersionFooter from '../../components/VersionFooter';

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
                  <Text
                    style={[styles.businessInfoText, { color: colors.text }]}
                  >
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
                <MaterialIcons
                  name="language"
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
