import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';

const ProfileScreen = ({ navigation }: any) => {
  const { isDarkMode, user } = useAuth();
  const colors = getColors(isDarkMode);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Text style={[iOSUIKit.title3, { color: colors.primary }]}>⚙️</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.background }]}>
            {user?.first_name ? user.first_name.charAt(0) : 'U'}
            {user?.last_name ? user.last_name.charAt(0) : ''}
          </Text>
        </View>
        {/* Show user's name under badge */}
        <Text style={[styles.userName, { color: colors.text }]}>
          {' '}
          {user?.first_name + ' ' + user?.last_name ||
            user?.username ||
            user?.email ||
            'User'}{' '}
        </Text>
        <Text style={[styles.accountType, { color: colors.textSecondary }]}>
          Regular Account
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              12
            </Text>
            <Text style={[styles.statLabel, { color: colors.disabled }]}>
              Deals Saved
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              8
            </Text>
            <Text style={[styles.statLabel, { color: colors.disabled }]}>
              Redeemed
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              24
            </Text>
            <Text style={[styles.statLabel, { color: colors.disabled }]}>
              Referrals
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('SavedTab')}
        >
          <Text style={[styles.menuBtnText, { color: colors.text }]}>
            Saved Deals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={[styles.menuBtnText, { color: colors.text }]}>
            Preferences
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.menuBtnText, { color: colors.text }]}>
            Invite Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('BusinessCreationScreen1')}
        >
          <Text style={[styles.menuBtnText, { color: colors.text }]}>
            Business Access
          </Text>
        </TouchableOpacity>

      </View>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  title: StyleSheet.flatten([
    iOSUIKit.largeTitleEmphasized,
    {
      marginBottom: 16,
    },
  ]),
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      fontSize: 26,
    },
  ]),
  userName: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      marginBottom: 4,
    },
  ]),
  accountType: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      marginBottom: 16,
    },
  ]),
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: iOSUIKit.title3EmphasizedObject,
  statLabel: iOSUIKit.caption2Object,
  menuBtn: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  menuBtnText: iOSUIKit.calloutObject,
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

export default ProfileScreen;
