import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  StatusBar,
} from 'react-native';
import { useAuth, getColors } from '../../libs/hooks/useAuth';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';
import IconLogo from '../../../assets/imgs/icon_logo.svg';
const signInBackground = require('../../../assets/imgs/signInBackground.png');
const FribeeLogoPNG = require('../../../assets/imgs/fribee-logo.png');

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { isDarkMode } = useAuth();
  const colors = getColors(isDarkMode);

  return (
    <ImageBackground
      source={signInBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={FribeeLogoPNG}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
        <IconLogo width={80} height={80} fill="#FFFFFF" style={{ marginBottom: 40 }} />
        <View style={{ flexDirection: 'row',}}>
            <Text style={styles.brandName2}>Fri</Text>
            <Text style={styles.brandName}>Bee</Text>
        </View>
        
        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.tagline}>
            Easily browse, collect, and use discounts from your favorite stores
            — all in one place.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate('SignIn', { showSignUp: true })}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Join Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <VersionFooter />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 'auto',
  },
  logoWrapper: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandName2:{
    fontSize: 40,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contentContainer: {
    marginTop: 10,
    paddingBottom: 60,
  },
  tagline: {
    fontSize: 18,
    lineHeight: 26,
    color: '#FFFFFF',
    marginBottom: 40,
    fontWeight: '400',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default WelcomeScreen;
