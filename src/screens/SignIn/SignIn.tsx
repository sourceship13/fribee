import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';
import instagramAuthService from '../../services/instagram-auth.service';
import apiService from '../../services/api.service';

const SignInScreen = ({ navigation }: any) => {
  const { isDarkMode, login } = useAuth();
  const colors = getColors(isDarkMode);
  const [email, setEmail] = useState('aj@sera.dev');
  const [password, setPassword] = useState('Purple99!');
  const [loading, setLoading] = useState(false);
  const [instagramLoading, setInstagramLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      
      await login({ email, password });
      
    } catch (error) {
      console.error('❌ SignIn: Login failed:', error);
      
      const errorMessage = (error as Error)?.message || String(error);
      
      // Show different messages based on error type
      if (errorMessage.includes('Unable to connect to server') || errorMessage.includes('Network request failed')) {
        Alert.alert(
          'Connection Problem', 
          'Unable to connect to the server. Please check your internet connection and try again.\n\nYou can also check Settings → Network Debug to verify the connection.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Check Network', onPress: () => navigation.navigate('NetworkDebug') }
          ]
        );
      } else {
        Alert.alert('Sign In Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramSignIn = async () => {
    // Check if Instagram OAuth is configured
    if (!instagramAuthService.isConfigured()) {
      Alert.alert(
        'Instagram Login Not Configured',
        'Instagram OAuth is not configured yet. Please add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to your .env file.\n\nFor setup instructions, see: src/services/instagram-auth.service.ts',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setInstagramLoading(true);
      console.log('🔵 Starting Instagram login...');

      // Start Instagram OAuth flow
      const instagramAuth = await instagramAuthService.login();
      
      console.log('✅ Instagram OAuth successful');
      console.log('✅ Instagram user:', instagramAuth.user);

      // Send Instagram access token to your backend for verification and login
      // Your backend should:
      // 1. Verify the Instagram access token with Instagram API
      // 2. Get user profile from Instagram
      // 3. Create or login user in your database
      // 4. Return your app's auth token
      
      console.log('🔵 Sending Instagram auth to backend...');
      const response = await apiService.post('/auth/instagram', {
        accessToken: instagramAuth.accessToken,
        instagramUserId: instagramAuth.user.id,
        username: instagramAuth.user.username,
      });

      if (response.success && response.data?.token) {
        console.log('✅ Backend authentication successful');
        
        // Login with your app's token
        await login({ 
          email: response.data.user.email, 
          password: '', // Social login doesn't need password
          token: response.data.token 
        });

        Alert.alert('Success', `Welcome ${instagramAuth.user.username}!`);
      } else {
        throw new Error(response.message || 'Instagram login failed');
      }
    } catch (error) {
      console.error('❌ Instagram sign in failed:', error);
      
      const errorMessage = (error as Error)?.message || String(error);
      
      // User cancelled the OAuth flow
      if (errorMessage.includes('User cancelled') || errorMessage.includes('AUTHENTICATION_CANCELED')) {
        // Don't show error for user cancellation
        return;
      }

      Alert.alert(
        'Instagram Sign In Failed',
        errorMessage + '\n\nMake sure Instagram OAuth is properly configured in Facebook Developer Console.',
        [{ text: 'OK' }]
      );
    } finally {
      setInstagramLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      <Text style={[styles.title, { color: colors.text }]}>DEALZ</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Swipe. Save. Share. Repeat.</Text>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
        placeholder="Email"
        placeholderTextColor={colors.textPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
        placeholder="Password"
        placeholderTextColor={colors.textPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: loading ? colors.disabled : colors.text }]} 
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Text style={[iOSUIKit.callout, { color: colors.background, fontWeight: 'bold' }]}>Sign In</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.buttonOutline, { borderColor: colors.text }]} onPress={() => navigation.navigate('SignUp')}>
        <Text style={[iOSUIKit.callout, { color: colors.text, fontWeight: 'bold' }]}>Create Account</Text>
      </TouchableOpacity>
      
      {/* Network Debug Button for Development */}
      {__DEV__ && (
        <TouchableOpacity 
          style={[styles.debugButton, { backgroundColor: colors.error }]} 
          onPress={() => navigation.navigate('NetworkDebug')}
        >
          <Text style={[iOSUIKit.caption2, { color: '#fff', fontWeight: 'bold' }]}>🔧 Network Debug</Text>
        </TouchableOpacity>
      )}

      {/* Social Sign In Buttons */}
      <View style={styles.socialContainer}>
        <TouchableOpacity
          style={[styles.socialBtn, { backgroundColor: colors.google, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('Swipe')}
        >
          <FontAwesome name="google" size={22} color={colors.background} style={styles.socialIcon} />
          <Text style={[styles.socialText, { color: colors.background }]}>Sign in with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialBtn, { backgroundColor: colors.facebook }]}
          onPress={() => navigation.navigate('Swipe')}
        >
          <FontAwesome name="facebook" size={22} color={colors.background} style={styles.socialIcon} />
          <Text style={[styles.socialText, { color: colors.background }]}>Sign in with Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialBtn, { backgroundColor: colors.instagram }]}
          onPress={handleInstagramSignIn}
          disabled={instagramLoading}
        >
          {instagramLoading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <FontAwesome name="instagram" size={22} color={colors.background} style={styles.socialIcon} />
              <Text style={[styles.socialText, { color: colors.background }]}>Sign in with Instagram</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialBtn, { backgroundColor: colors.apple }]}
          onPress={() => navigation.navigate('Swipe')}
        >
          <FontAwesome5 name="apple" size={22} color={colors.background} style={styles.socialIcon} />
          <Text style={[styles.socialText, { color: colors.background }]}>Sign in with Apple</Text>
        </TouchableOpacity>
      </View>
      <VersionFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: StyleSheet.flatten([
    iOSUIKit.largeTitleEmphasized,
    {
      marginBottom: 8,
    }
  ]),
  subtitle: StyleSheet.flatten([
    iOSUIKit.body,
    {
      marginBottom: 32,
    }
  ]),
  input: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      width: '100%',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }
  ]),
  button: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonOutline: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  socialContainer: {
    width: '100%',
    marginTop: 16,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    justifyContent: 'center',
  },
  socialIcon: {
    marginRight: 12,
  },
  socialText: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      fontWeight: 'bold',
    }
  ]),
  debugButton: {
    marginTop: 20,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
});

export default SignInScreen;
