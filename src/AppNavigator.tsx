import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { fromBase62 } from './libs/utils/deeplink.utils';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DiscoverIcon from '../assets/imgs/nav/discover.svg';
import ExploreIcon from '../assets/imgs/nav/explore.svg';
import SavedIcon from '../assets/imgs/nav/saved.svg';
import ProfileIcon from '../assets/imgs/nav/profile.svg';
import SignInScreen from './screens/SignIn/SignIn';
import SignUpScreen from './screens/SignUp/SignUp';
import SwipeScreen from './screens/Swipe/Swipe';
import ExploreScreen from './screens/Explore/Explore';
import DealDetailScreen from './screens/DealDetail/DealDetail';
import ProfileScreen from './screens/Profile/Profile';
import SavedDealsScreen from './screens/SavedDeals/SavedDeals';
import SettingsScreen from './screens/Settings/Settings';
import VerificationScreen from './VerificationScreen/VerificationScreen';
import DebugScreen from './screens/Debug/Debug';
import PermissionTestScreen from './screens/PermissionTestScreen';
import NetworkDebugScreen from './screens/NetworkDebugScreen';
import { useAuth, getColors } from './libs/hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';
import { iOSUIKit } from 'react-native-typography';
import RedemptionScreen from './screens/Redemption/RedemptionScreen';
import BusinessCreationScreen1 from './screens/Business/BusinessCreation/BusinessCreationScreen1';
import BusinessCreationScreen2 from './screens/Business/BusinessCreation/BusinessCreationScreen2';
import BusinessCreationScreen3 from './screens/Business/BusinessCreation/BusinessCreationScreen3';
import BusinessSubscriptionScreen from './screens/Business/BusinessCreation/BusinessSubscriptionScreen';
import BusinessCreationScreen4 from './screens/Business/BusinessCreation/BusinessCreationScreen4';
import { Colors } from './libs/colors';
import BusinessProfile from './screens/Profile/BusinessProfile';
import BusinessDeals from './screens/Business/BusinessDeals';
import CreateDeal from './screens/Business/CreateDeal'; 
import AboutBusiness from './screens/Business/AboutBusiness';
import DealPostPurchaseScreen from './screens/Business/DealPostPurchaseScreen';
import FontDebug from './screens/FontDebug/FontDebug';
import VersionFooter from './components/VersionFooter';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Dynamic Profile Screen wrapper that reacts to account_type changes
const DynamicProfileScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  
  console.log('🔄 DynamicProfileScreen rendering - account_type:', user?.account_type);
  
  // This will re-render whenever user changes
  // Pass navigation and route props to the child components
  if (user?.account_type === 'business') {
    console.log('✅ Loading BusinessProfile');
    return <BusinessProfile navigation={navigation} route={route} />;
  }
  
  console.log('✅ Loading ProfileScreen');
  return <ProfileScreen navigation={navigation} route={route} />;
};

// Bottom Tab Navigator for main app screens
const MainTabNavigator = () => {
  const { isDarkMode, user, refreshDeals } = useAuth();
  const colors = getColors(isDarkMode);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconColor = focused 
            ? (isDarkMode ? '#FFFFFF' : colors.selectedNavButton) 
            : (isDarkMode ? '#8E8E93' : colors.subText);
          const iconSize = 24;

          if (route.name === 'SwipeTab') {
            return <DiscoverIcon width={iconSize} height={iconSize} color={iconColor} />;
          } else if (route.name === 'ExploreTab') {
            return <ExploreIcon width={iconSize} height={iconSize} color={iconColor} />;
          } else if (route.name === 'SavedTab') {
            return <SavedIcon width={iconSize} height={iconSize} color={iconColor} />;
          } else if (route.name === 'ProfileTab') {
            return <ProfileIcon width={iconSize} height={iconSize} color={iconColor} />;
          }

          return null;
        },
        tabBarActiveTintColor: isDarkMode ? '#FFFFFF' : colors.selectedNavButton,
        tabBarInactiveTintColor: isDarkMode ? '#8E8E93' : colors.subText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 0,
          marginHorizontal: 0,
          marginBottom: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 87,
          position: 'absolute',
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
          fontWeight: '700',
          fontSize: 12,
          marginTop: 5, // Reduce space between icon and label
        },
        tabBarIconStyle: {
          marginBottom: 2, // Reduce bottom margin of icons
        },
      })}
    >
      <Tab.Screen 
        name="SwipeTab" 
        component={SwipeScreen}
        options={{ tabBarLabel: 'DISCOVER' }}
        listeners={{
          tabPress: () => {
            console.log('🔄 Refreshing deals from Swipe tab');
            refreshDeals().catch(err => console.warn('Tab refresh failed:', err));
          },
        }}
      />
      <Tab.Screen 
        name="ExploreTab" 
        component={ExploreScreen}
        options={{ tabBarLabel: 'EXPLORE' }}
        listeners={{
          tabPress: () => {
            console.log('🔄 Refreshing deals from Explore tab');
            refreshDeals().catch(err => console.warn('Tab refresh failed:', err));
          },
        }}
      />
      <Tab.Screen 
        name="SavedTab" 
        component={SavedDealsScreen}
        options={{ tabBarLabel: 'SAVED' }}
        listeners={{
          tabPress: () => {
            console.log('🔄 Refreshing deals from Saved tab');
            refreshDeals().catch(err => console.warn('Tab refresh failed:', err));
          },
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={DynamicProfileScreen}
        options={{ tabBarLabel: 'PROFILE' }}
        listeners={{
          tabPress: () => {
            console.log('🔄 Refreshing deals from Profile tab');
            refreshDeals().catch(err => console.warn('Tab refresh failed:', err));
          },
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading, isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  if (loading) {
    // Show loading screen while checking authentication
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Deep linking configuration
  const linkingConfig = {
    screens: {
      // Auth screens
      SignIn: 'signin',
      SignUp: 'signup',
      Verification: 'verification',
      
      // Main authenticated screens
      MainTabs: {
        screens: {
          SwipeTab: 'discover',
          ExploreTab: 'explore',
          SavedTab: 'saved',
          ProfileTab: 'profile',
        },
      },
      
      // Modal/Detail screens - supports both full and shortened URLs
      DealDetail: {
        path: 'deal/:dealId',
      },
      Settings: 'settings',
      Redemption: 'redemption/:dealId',
      
      // Business screens
      BusinessProfile: 'business/profile',
      BusinessCreationScreen1: 'business/create/step1',
      BusinessCreationScreen2: 'business/create/step2',
      BusinessCreationScreen3: 'business/create/step3',
      BusinessSubscriptionScreen: 'business/subscribe',
      BusinessCreationScreen4: 'business/create/step4',
      BusinessDeals: 'business/deals',
      DealPostPurchase: 'business/deal/post-purchase',
      CreateDeal: 'business/deal/create',
      AboutBusiness: 'business/about',
      
      // Debug screens
      Debug: 'debug',
      FontDebug: 'font-debug',
      PermissionTest: 'permission-test',
      NetworkDebug: 'network-debug',
    },
  };

  // Custom getStateFromPath to handle shortened URLs with base62 decoding
  const linking = {
    prefixes: ['nolimitseradeals://', 'https://fribee.io'],
    config: linkingConfig,
    getStateFromPath: (path: string, options: any) => {
      // Handle shortened deal URLs: /d/:shortId -> /deal/:dealId
      const shortDealMatch = path.match(/^\/?(d)\/([a-zA-Z0-9]+)$/);
      if (shortDealMatch) {
        const shortId = shortDealMatch[2];
        const dealId = fromBase62(shortId);
        console.log(`🔗 Deep link: Converting short ID "${shortId}" to deal ID "${dealId}"`);
        // Rewrite path to standard format
        path = `/deal/${dealId}`;
      }
      
      // Use default state parser with potentially rewritten path
      return defaultGetStateFromPath(path, options);
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "MainTabs" : "SignIn"}
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        {!isAuthenticated ? (
          // Authentication flow screens
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="Debug" component={DebugScreen} />
            <Stack.Screen name="NetworkDebug" component={NetworkDebugScreen} />
          </>
        ) : (
          // Authenticated user screens with bottom tabs
          <>
            {/* Main Tab Navigator */}
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Modal/Detail screens that should overlay the tabs */}
            <Stack.Screen 
              name="DealDetail" 
              component={DealDetailScreen}
              options={{ 
                presentation: 'fullScreenModal',
                gestureEnabled: true,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ 
                presentation: 'fullScreenModal',
                gestureEnabled: true,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
            
            {/* Debug screens */}
            <Stack.Screen name="Debug" component={DebugScreen} />
            <Stack.Screen name="FontDebug" component={FontDebug} />
            <Stack.Screen name="PermissionTest" component={PermissionTestScreen} />
            <Stack.Screen name="NetworkDebug" component={NetworkDebugScreen} />
            <Stack.Screen 
              name="Redemption" 
              component={RedemptionScreen}
              options={{
                presentation: 'transparentModal',
                gestureEnabled: true,
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
                cardOverlayEnabled: true,
              }}
            />
            
            {/* Business screens */}
            <Stack.Screen name="BusinessProfile" component={BusinessProfile} />
            <Stack.Screen name="BusinessCreationScreen1" component={BusinessCreationScreen1} />
            <Stack.Screen name="BusinessCreationScreen2" component={BusinessCreationScreen2} />
            <Stack.Screen name="BusinessCreationScreen3" component={BusinessCreationScreen3} />
            <Stack.Screen name="BusinessSubscriptionScreen" component={BusinessSubscriptionScreen} />
            <Stack.Screen name="BusinessCreationScreen4" component={BusinessCreationScreen4} />
            <Stack.Screen name="BusinessDeals" component={BusinessDeals} />
            <Stack.Screen name="DealPostPurchase" component={DealPostPurchaseScreen} />
            <Stack.Screen name="CreateDeal" component={CreateDeal} />
            <Stack.Screen name="AboutBusiness" component={AboutBusiness} />
          </>
        )}
      </Stack.Navigator>
      
      {/* Global Version Footer - appears on all screens */}
      <VersionFooter />
    </NavigationContainer>
  );
};

export default AppNavigator;
