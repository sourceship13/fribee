import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import IconLogo from '../../../assets/imgs/icon_logo.svg';
import Toolbar from '../../components/Toolbar';

const ProfileScreen = ({ navigation }: any) => {
  const { isDarkMode, user, heartedDeals } = useAuth();
  const colors = getColors(isDarkMode);

  // Get actual stats
  const savedDealsCount = heartedDeals?.length || 0;
  const redeemedCount =
    heartedDeals?.filter(
      (d: any) => d.redemption_status?.toLowerCase() === 'redeemed',
    ).length || 0;
  const referralsCount = 24; // TODO: Get from API

  // Format member since date
  const getMemberSince = () => {
    if (user?.created_at) {
      const date = new Date(user.created_at);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
    return 'December 2025';
  };

  const menuItems = [
    {
      label: 'Saved Deals',
      onPress: () => navigation.navigate('SavedTab'),
    },
    {
      label: 'Preferences',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      label: 'Invite Friends',
      onPress: () => {},
    },
    {
      label: 'Business Access',
      onPress: () => navigation.navigate('BusinessCreationScreen1'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Toolbar
        title="Profile"
        onSettings={() => navigation.navigate('Settings')}
        showSettings
        showLogo
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-outline" size={40} color="#FF9500" />
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.username || user?.email || 'John Doe'}
          </Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>
              {savedDealsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>
              Deals Saved
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>
              {redeemedCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>
              Redeemed
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>
              {referralsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>
              Referrals
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {item.label}
              </Text>
              <MaterialIcons name="arrow-forward" size={22} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Member Since {getMemberSince()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  editProfileButton: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
  },
  // Menu Section
  menuSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Footer
  footer: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
  },
});

export default ProfileScreen;
