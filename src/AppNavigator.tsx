import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
          const iconColor = colors.navButton;
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
        tabBarActiveTintColor: '#FFFFFF', // White for both dark and light mode
        tabBarInactiveTintColor: '#FFFFFF', // White for both dark and light mode
        tabBarStyle: {
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
        tabBarLabelStyle: [
          iOSUIKit.largeTitleEmphasized,
          {
            fontSize: 12, // Override the large title size for tab bar
            color: colors.subText, // White for both dark and light mode
            marginTop: -12, // Reduce space between icon and label
          }
        ],
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

  return (
    <NavigationContainer>
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
