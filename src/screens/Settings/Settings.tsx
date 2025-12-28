import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import Toolbar from '../../components/Toolbar';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';

const SettingsScreen = ({ navigation }: any) => {
  const { isDarkMode, setDarkMode, categories, setCategories, logout, refreshCategories, availableCategories } = useAuth();
  const colors = getColors(isDarkMode);
  
  // Debug categories
  
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
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
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
              // Navigation will be handled automatically by AppNavigator when user becomes null
            } catch (error) {
              console.error('❌ Settings: Logout failed:', error);
              Alert.alert('Logout Failed', 'There was an error signing out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Toolbar title="Preferences" onBack={() => navigation.goBack()} isModal={true} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
          <View style={styles.row}>
            <Text style={[iOSUIKit.body, { color: colors.text }]}>Dark Mode</Text>
            <Switch value={isDarkMode} onValueChange={setDarkMode} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location Settings</Text>
          <View style={styles.row}>
            <Text style={[iOSUIKit.body, { color: colors.text }]}>Use my location</Text>
            <Switch value={locationEnabled} onValueChange={setLocationEnabled} />
          </View>
          <Text style={[iOSUIKit.footnote, { color: colors.textSecondary, marginTop: 8 }]}>Search radius: {radius}</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Deal Categories</Text>
            <TouchableOpacity 
              onPress={refreshCategories}
              style={{ padding: 4 }}
            >
              <Text style={[iOSUIKit.subhead, { color: colors.primary }]}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
          
          {Object.keys(categories).length === 0 && availableCategories.length === 0 ? (
            <Text style={[iOSUIKit.footnote, { color: colors.textSecondary, fontStyle: 'italic' }]}>
              Loading categories... Tap refresh if this persists.
            </Text>
          ) : availableCategories.length > 0 ? (
            // Use availableCategories for display names
            availableCategories.map(category => (
              <View style={styles.row} key={category.slug}>
                <Text style={[iOSUIKit.body, { color: colors.text }]}>{category.name}</Text>
                <Switch 
                  value={categories[category.slug] ?? true} 
                  onValueChange={value => setCategories({ ...categories, [category.slug]: value })} 
                />
              </View>
            ))
          ) : (
            // Fallback to categories object keys
            Object.keys(categories).map(key => (
              <View style={styles.row} key={key}>
                <Text style={[iOSUIKit.body, { color: colors.text }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <Switch value={categories[key as keyof typeof categories]} onValueChange={value => setCategories({ ...categories, [key]: value })} />
              </View>
            ))
          )}
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          <View style={styles.row}>
            <Text style={[iOSUIKit.body, { color: colors.text }]}>New deals nearby</Text>
            <Switch value={notifications.deals} onValueChange={value => setNotifications({ ...notifications, deals: value })} />
          </View>
          <View style={styles.row}>
            <Text style={[iOSUIKit.body, { color: colors.text }]}>Deal expiry reminders</Text>
            <Switch value={notifications.expiry} onValueChange={value => setNotifications({ ...notifications, expiry: value })} />
          </View>
          <View style={styles.row}>
            <Text style={[iOSUIKit.body, { color: colors.text }]}>Friend referrals</Text>
            <Switch value={notifications.referrals} onValueChange={value => setNotifications({ ...notifications, referrals: value })} />
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.error }]} 
          onPress={handleLogout}
        >
          <Text style={[iOSUIKit.callout, { color: '#fff', fontWeight: 'bold' }]}>Sign Out</Text>
        </TouchableOpacity>        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Developer Options</Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.error, marginBottom: 16 }]} 
            onPress={() => navigation.navigate('Debug')}
          >
            <Text style={[iOSUIKit.callout, { color: colors.background, fontWeight: 'bold' }]}>🔧 Debug Console</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.error, marginBottom: 16 }]} 
            onPress={() => navigation.navigate('NetworkDebug')}
          >
            <Text style={[iOSUIKit.callout, { color: '#fff', fontWeight: 'bold' }]}>🔧 Network Debug</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary, marginBottom: 8 }]} 
            onPress={() => navigation.navigate('FontDebug')}
          >
            <Text style={[iOSUIKit.callout, { color: '#fff', fontWeight: 'bold' }]}>🔤 Font Debug</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary, marginBottom: 8 }]} 
            onPress={() => navigation.navigate('PermissionTest')}
          >
            <Text style={[iOSUIKit.callout, { color: '#fff', fontWeight: 'bold' }]}>Test Permissions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary, marginBottom: 16 }]} 
            onPress={() => navigation.navigate('DemoShare')}
          >
            <Text style={[iOSUIKit.callout, { color: '#fff', fontWeight: 'bold' }]}>Test Deal Sharing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 24,
    paddingBottom: 40, // Extra space at bottom
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      marginBottom: 8,
    }
  ]),
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: 180,
    alignSelf: 'center',
  },
});

export default SettingsScreen;
