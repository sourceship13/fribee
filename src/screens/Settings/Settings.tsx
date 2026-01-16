import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';
import Ionicons from '@react-native-vector-icons/ionicons';
import MaterialIcons from '@react-native-vector-icons/material-icons';

const SettingsScreen = ({ navigation }: any) => {
  const {
    isDarkMode,
    setDarkMode,
    categories,
    setCategories,
    logout,
    refreshCategories,
    availableCategories,
  } = useAuth();
  const colors = getColors(isDarkMode);

  const [locationEnabled, setLocationEnabled] = useState(true);
  const [radius, setRadius] = useState('5 miles');
  const [notifications, setNotifications] = useState({
    deals: true,
    expiry: true,
    referrals: true,
  });

  // Refresh categories when Settings screen loads
  useEffect(() => {
    const initializeCategories = async () => {
      if (Object.keys(categories).length === 0) {
        await refreshCategories();
      }
    };

    initializeCategories();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('❌ Settings: Logout failed:', error);
            Alert.alert(
              'Logout Failed',
              'There was an error signing out. Please try again.',
            );
          }
        },
      },
    ]);
  };

  const renderSettingRow = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    subtitle?: string,
    isLast?: boolean,
  ) => (
    <View>
      <View style={styles.settingRow}>
        <View style={styles.settingLabelContainer}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            {label}
          </Text>
          {subtitle && (
            <Text
              style={[styles.settingSubtitle, { color: colors.textSecondary }]}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5E5EA"
        />
      </View>
      {!isLast && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
    </View>
  );

  const renderNavigationRow = (
    label: string,
    onPress: () => void,
    isLast?: boolean,
  ) => (
    <View>
      <TouchableOpacity style={styles.navigationRow} onPress={onPress}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>
          {label}
        </Text>
        <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      {!isLast && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
    </View>
  );

  return (
    <View
      style={[styles.screenContainer, { backgroundColor: colors.background }]}
    >
      <Toolbar title="Preferences" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Theme
          </Text>
          {renderSettingRow(
            'Saved Deals',
            isDarkMode,
            setDarkMode,
            undefined,
            true,
          )}
        </View>

        {/* Location Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Location Settings
          </Text>
          {renderSettingRow(
            'Use my location',
            locationEnabled,
            setLocationEnabled,
            `Search radius: ${radius}`,
            true,
          )}
        </View>

        {/* Deal Categories Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Deal Categories
          </Text>

          {Object.keys(categories).length === 0 &&
          availableCategories.length === 0 ? (
            <Text
              style={[
                styles.settingSubtitle,
                { color: colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              Loading categories...
            </Text>
          ) : availableCategories.length > 0 ? (
            availableCategories.map((category, index) => (
              <React.Fragment key={category.slug}>
                {renderSettingRow(
                  category.name,
                  categories[category.slug] ?? true,
                  value =>
                    setCategories({ ...categories, [category.slug]: value }),
                  undefined,
                  index === availableCategories.length - 1,
                )}
              </React.Fragment>
            ))
          ) : (
            Object.keys(categories).map((key, index) => (
              <React.Fragment key={key}>
                {renderSettingRow(
                  key.charAt(0).toUpperCase() + key.slice(1),
                  categories[key as keyof typeof categories],
                  value => setCategories({ ...categories, [key]: value }),
                  undefined,
                  index === Object.keys(categories).length - 1,
                )}
              </React.Fragment>
            ))
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notifications
          </Text>
          {renderSettingRow('New deals nearby', notifications.deals, value =>
            setNotifications({ ...notifications, deals: value }),
          )}
          {renderSettingRow(
            'Deal expiry reminders',
            notifications.expiry,
            value => setNotifications({ ...notifications, expiry: value }),
          )}
          {renderSettingRow(
            'Friend referrals',
            notifications.referrals,
            value => setNotifications({ ...notifications, referrals: value }),
            undefined,
            true,
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <MaterialIcons
            name="logout"
            size={20}
            color="#FFFFFF"
            style={styles.signOutIcon}
          />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Developer Options Section */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Developer Options
            </Text>
            {renderNavigationRow('Debug Console', () =>
              navigation.navigate('Debug'),
            )}
            {renderNavigationRow('Network Debug', () =>
              navigation.navigate('NetworkDebug'),
            )}
            {renderNavigationRow('Font Debug', () =>
              navigation.navigate('FontDebug'),
            )}
            {renderNavigationRow('Test Permissions', () =>
              navigation.navigate('PermissionTest'),
            )}
            {renderNavigationRow(
              'Test Deal Sharing',
              () => navigation.navigate('DemoShare'),
              true,
            )}
          </View>
        )}
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 0,
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    marginHorizontal: 20,
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
