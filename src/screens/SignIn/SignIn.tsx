import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ImageBackground,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../libs/hooks/useAuth';
import { getColors } from '../../libs/colors';
import { iOSUIKit } from 'react-native-typography';
import VersionFooter from '../../components/VersionFooter';
import instagramAuthService from '../../services/instagram-auth.service';
import apiService from '../../services/api.service';
import AuthService from '../../services/auth.service';


const signInBackground = require('../../../assets/imgs/signInBackground.png');

const SignInScreen = ({ navigation }: any) => {
  const { isDarkMode, login } = useAuth();
  const colors = getColors(isDarkMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [phone, setPhone] = useState('');

  const [fields, setFields] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  // Format phone number for display as (XXX) XXX-XXXX
  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format based on length
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

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
      if (
        errorMessage.includes('Unable to connect to server') ||
        errorMessage.includes('Network request failed')
      ) {
        Alert.alert(
          'Connection Problem',
          'Unable to connect to the server. Please check your internet connection and try again.\n\nYou can also check Settings → Network Debug to verify the connection.',
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Check Network',
              onPress: () => navigation.navigate('NetworkDebug'),
            },
          ],
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
        [{ text: 'OK' }],
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
          token: response.data.token,
        });

        Alert.alert('Success', `Welcome ${instagramAuth.user.username}!`);
      } else {
        throw new Error(response.message || 'Instagram login failed');
      }
    } catch (error) {
      console.error('❌ Instagram sign in failed:', error);

      const errorMessage = (error as Error)?.message || String(error);

      // User cancelled the OAuth flow
      if (
        errorMessage.includes('User cancelled') ||
        errorMessage.includes('AUTHENTICATION_CANCELED')
      ) {
        // Don't show error for user cancellation
        return;
      }

      Alert.alert(
        'Instagram Sign In Failed',
        errorMessage +
          '\n\nMake sure Instagram OAuth is properly configured in Facebook Developer Console.',
        [{ text: 'OK' }],
      );
    } finally {
      setInstagramLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: any = {};

    // First name validation
    if (!fields.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (fields.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!fields.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (fields.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!fields.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(fields.email.trim())) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation (required)
    if (!fields.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]{10,}$/.test(fields.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number (at least 10 digits)';
    }

    // Password validation
    if (!fields.password) {
      newErrors.password = 'Password is required';
    } else if (fields.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(fields.password)
    ) {
      newErrors.password =
        'Must include uppercase, lowercase, number & special char';
    }

    // Confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (fields.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clear error when user starts typing
  const clearFieldError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors({ ...errors, [fieldName]: undefined });
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Call the auth service register method
      const result = await AuthService.register({
        email: fields.email.toLowerCase().trim(),
        password: fields.password,
        first_name: fields.firstName.trim(),
        last_name: fields.lastName.trim(),
        phone_number: fields.phone.trim(),
      });
      // Registration successful - user will be handled by auth context
      // Show success and navigate
      Alert.alert(
        'Welcome to DEALZ! 🎉',
        'Your account has been created successfully. Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('Verification', {
                phoneNumber: fields.phone.trim(),
                email: fields.email.toLowerCase().trim(),
                password: fields.password,
              }),
          },
        ],
      );
      // Clear form
      setFields({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
      });
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={signInBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View
          style={{
            flexDirection: 'column',
            backgroundColor: colors.background,
            width: '100%',
            padding: 20,
            borderRadius: 36,
            opacity: 0.95,
            height: createUserModal ? '85%' : '60%',
          }}
        >
          {createUserModal ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter your details to create a new account.
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    First Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                      errors.firstName && styles.inputError,
                    ]}
                    placeholder="First Name"
                    placeholderTextColor={colors.textPlaceholder}
                    value={fields.firstName}
                    onChangeText={(text) => {
                      setFields({ ...fields, firstName: text });
                      clearFieldError('firstName');
                    }}
                    autoCapitalize="words"
                    textContentType="givenName"
                    autoComplete="off"
                  />
                  {errors.firstName && (
                    <Text style={styles.errorText}>{errors.firstName}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Last Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                      errors.lastName && styles.inputError,
                    ]}
                    placeholder="Last Name"
                    placeholderTextColor={colors.textPlaceholder}
                    value={fields.lastName}
                    onChangeText={(text) => {
                      setFields({ ...fields, lastName: text });
                      clearFieldError('lastName');
                    }}
                    autoCapitalize="words"
                    textContentType="familyName"
                    autoComplete="off"
                  />
                  {errors.lastName && (
                    <Text style={styles.errorText}>{errors.lastName}</Text>
                  )}
                </View>
              </View>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                  errors.email && styles.inputError,
                ]}
                placeholder="Email"
                placeholderTextColor={colors.textPlaceholder}
                value={fields.email}
                onChangeText={(text) => {
                  setFields({ ...fields, email: text });
                  clearFieldError('email');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="none"
                autoComplete="off"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Phone Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                  errors.phone && styles.inputError,
                ]}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textPlaceholder}
                value={formatPhoneNumber(fields.phone)}
                onChangeText={(text) => {
                  // Store only digits for API
                  const digits = text.replace(/\D/g, '');
                  setFields({ ...fields, phone: digits });
                  clearFieldError('phone');
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
                maxLength={14}
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                  errors.password && styles.inputError,
                ]}
                placeholder="Password"
                placeholderTextColor={colors.textPlaceholder}
                value={fields.password}
                onChangeText={(text) => {
                  setFields({ ...fields, password: text });
                  clearFieldError('password');
                }}
                secureTextEntry
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Confirm Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textPlaceholder}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  clearFieldError('confirmPassword');
                }}
                secureTextEntry
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.text },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text
                    style={{ color: colors.background, fontWeight: 'bold' }}
                  >
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <TouchableOpacity onPress={() => setCreateUserModal(false)}>
                  <Text
                    style={[styles.subtitle, { color: colors.textSecondary }]}
                  >
                    Already have an account?{' '}
                    <Text
                      style={{
                        color: colors.text,
                        textDecorationLine: 'underline',
                      }}
                    >
                      Sign In
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                Sign In
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter your credentials to access your account.
              </Text>

              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Email
              </Text>

              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                ]}
                placeholder="Email"
                placeholderTextColor={colors.textPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.loginInputBorder },
                ]}
                placeholder="Password"
                placeholderTextColor={colors.textPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: loading ? colors.disabled : colors.text },
                ]}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text
                    style={[
                      iOSUIKit.callout,
                      { color: colors.background, fontWeight: 'bold' },
                    ]}
                  >
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <TouchableOpacity onPress={() => setCreateUserModal(true)}>
                  <Text
                    style={[styles.subtitle, { color: colors.textSecondary }]}
                  >
                    Don't have an account?{' '}
                    <Text
                      onPress={() => setCreateUserModal(true)}
                      style={{
                        color: colors.text,
                        textDecorationLine: 'underline',
                      }}
                    >
                      Sign Up
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Social Sign In Buttons */}
        {/* <View style={styles.socialContainer}>
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
      </View> */}
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
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: StyleSheet.flatten([
    iOSUIKit.title3Emphasized,
    {
      marginBottom: 8,
    },
  ]),
  subtitle: StyleSheet.flatten([
    iOSUIKit.subhead,
    {
      marginBottom: 16,
      color: 'gray',
    },
  ]),
  buttonDisabled: {
    opacity: 0.6,
  },
  input: StyleSheet.flatten([
    iOSUIKit.callout,
    {
      width: '100%',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
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
    },
  ]),
  debugButton: {
    marginTop: 20,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
});

export default SignInScreen;
